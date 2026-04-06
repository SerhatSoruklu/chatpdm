'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { mock } = require('node:test');

const {
  DIRECT_RELATION_READ_EXPOSED_TYPES,
  DIRECT_RELATION_READ_SUPPORTED_TYPES,
  isDirectRelationReadExposedType,
} = require('../src/modules/concepts/direct-relation-read-types');
const relationLoaderModule = require('../src/modules/concepts/concept-relation-loader');
const RESOLVER_MODULE = '../src/modules/concepts/resolver';

function loadResolveConceptQueryFresh() {
  delete require.cache[require.resolve(RESOLVER_MODULE)];
  return require(RESOLVER_MODULE).resolveConceptQuery;
}

const contractPath = path.resolve(__dirname, '../../docs/product/response-contract.md');
const schemaPath = path.resolve(__dirname, '../../docs/product/response-schema.json');
const successExamplePath = path.resolve(__dirname, '../../docs/product/examples/relation_read.json');
const refusalExamplePath = path.resolve(__dirname, '../../docs/product/examples/relation_read_refusal.json');
const successGoldenPath = path.resolve(__dirname, '../../tests/golden/fixtures/relation_read_authority_power.json');
const refusalGoldenPath = path.resolve(__dirname, '../../tests/golden/fixtures/relation_read_duty_power_refusal.json');
const RELATION_READ_SUCCESS_KEYS = [
  'query',
  'normalizedQuery',
  'contractVersion',
  'normalizerVersion',
  'matcherVersion',
  'conceptSetVersion',
  'queryType',
  'interpretation',
  'type',
  'resolution',
  'relation',
];
const RELATION_READ_SCHEMA_REQUIRED_KEYS = [
  'type',
  'query',
  'normalizedQuery',
  'contractVersion',
  'normalizerVersion',
  'matcherVersion',
  'conceptSetVersion',
  'queryType',
  'interpretation',
  'resolution',
  'relation',
];
const RELATION_READ_REFUSAL_KEYS = [
  'query',
  'normalizedQuery',
  'contractVersion',
  'normalizerVersion',
  'matcherVersion',
  'conceptSetVersion',
  'queryType',
  'interpretation',
  'type',
  'resolution',
  'message',
  'suggestions',
];
const RELATION_READ_ENTRY_KEYS = [
  'schemaVersion',
  'subject',
  'type',
  'target',
  'basis',
  'conditions',
  'effect',
  'status',
];
const RELATION_READ_ENDPOINT_KEYS = ['conceptId', 'path', 'label'];
const RELATION_READ_BASIS_KEYS = ['kind', 'description'];
const RELATION_READ_CONDITIONS_KEYS = ['when', 'unless'];
const RELATION_READ_EFFECT_KEYS = ['kind', 'description'];
const RELATION_READ_STATUS_KEYS = ['active', 'blocking', 'note'];
const RELATION_READ_REFUSAL_INTERPRETATION_KEYS = [
  'interpretationType',
  'relationTerm',
  'message',
  'concepts',
];
const APPROVED_EQUIVALENT_DIRECT_RELATION_QUERY = 'the relation between authority and power';

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function stringifySnapshot(value) {
  return JSON.stringify(value);
}

function extractContractAllowedTypes(contractText) {
  const lines = contractText.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === 'Allowed `relation.entries.type` values in this phase:');

  assert.notEqual(
    headingIndex,
    -1,
    'docs/product/response-contract.md is missing the direct relation allowed-types section.',
  );

  const values = [];
  let listStarted = false;

  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (line === '' && !listStarted) {
      continue;
    }

    if (!line.startsWith('- ')) {
      break;
    }

    const match = line.match(/- `([^`]+)`$/);
    assert.ok(
      match,
      `docs/product/response-contract.md contains an unexpected allowed-types line: ${lines[index]}`,
    );
    values.push(match[1]);
    listStarted = true;
  }

  assert.ok(
    values.length > 0,
    'docs/product/response-contract.md does not list any direct relation allowlist types.',
  );

  return values;
}

function assertExactOrderedList(actual, expected, label) {
  assert.ok(Array.isArray(actual), `${label} must be an array.`);
  assert.deepEqual(
    actual,
    expected,
    `${label} drifted from the direct relation exposure source.`,
  );
}

function assertExactKeys(actual, expected, label) {
  assert.deepEqual(
    Object.keys(actual),
    expected,
    `${label} must keep the canonical field order and exact field set.`,
  );
}

function assertStableSnapshot(actual, expected, label) {
  assert.equal(
    stringifySnapshot(actual),
    stringifySnapshot(expected),
    `${label} drifted from the canonical golden snapshot.`,
  );
}

function stripDirectRelationQueryFields(response) {
  const { query, normalizedQuery, ...rest } = response;
  return rest;
}

function assertRelationReadSuccessShape(response) {
  assertExactKeys(response, RELATION_READ_SUCCESS_KEYS, 'relation_read success response');
  assert.equal(Object.prototype.hasOwnProperty.call(response, 'message'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(response, 'suggestions'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(response, 'candidates'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(response, 'rejection'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(response, 'comparison'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(response, 'answer'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(response, 'mode'), false);

  assertExactKeys(response.relation, ['queryConcepts', 'entries'], 'relation_read relation object');
  assert.deepEqual(response.relation.queryConcepts, ['authority', 'power']);
  assert.equal(
    response.relation.entries.length,
    2,
    'relation_read must keep two emitted entries for the canonical success case.',
  );

  for (const entry of response.relation.entries) {
    assertExactKeys(entry, RELATION_READ_ENTRY_KEYS, 'relation_read entry');
    assertExactKeys(entry.subject, RELATION_READ_ENDPOINT_KEYS, 'relation_read entry.subject');
    assertExactKeys(entry.target, RELATION_READ_ENDPOINT_KEYS, 'relation_read entry.target');
    assertExactKeys(entry.basis, RELATION_READ_BASIS_KEYS, 'relation_read entry.basis');
    assertExactKeys(entry.conditions, RELATION_READ_CONDITIONS_KEYS, 'relation_read entry.conditions');
    assertExactKeys(entry.effect, RELATION_READ_EFFECT_KEYS, 'relation_read entry.effect');
    assertExactKeys(entry.status, RELATION_READ_STATUS_KEYS, 'relation_read entry.status');
  }
}

function assertRelationReadRefusalShape(response, expectedConcepts) {
  assertExactKeys(response, RELATION_READ_REFUSAL_KEYS, 'relation_read refusal response');
  assert.equal(Object.prototype.hasOwnProperty.call(response, 'relation'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(response, 'answer'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(response, 'comparison'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(response, 'candidates'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(response, 'rejection'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(response, 'mode'), false);
  assertExactKeys(
    response.interpretation,
    RELATION_READ_REFUSAL_INTERPRETATION_KEYS,
    'relation_read refusal interpretation',
  );
  assertExactKeys(response.resolution, ['method'], 'relation_read refusal resolution');
  assert.equal(response.type, 'no_exact_match');
  assert.equal(response.queryType, 'relation_query');
  assert.equal(response.resolution.method, 'no_exact_match');
  assert.equal(response.interpretation.interpretationType, 'relation_not_supported');
  assert.equal(response.interpretation.relationTerm, 'between');
  assert.deepEqual(response.interpretation.concepts, expectedConcepts);
  assert.equal(typeof response.interpretation.message, 'string');
  assert.equal(Array.isArray(response.suggestions), true);
  assert.deepEqual(response.suggestions, []);
}

function verifyExposureAllowlistSource() {
  assertExactOrderedList(
    DIRECT_RELATION_READ_EXPOSED_TYPES,
    [
      'GROUNDS_DUTY',
      'TRIGGERS_RESPONSIBILITY',
      'VALIDATES_AUTHORITY',
      'REQUIRES_AUTHORITY',
      'DOES_NOT_IMPLY',
    ],
    'backend/src/modules/concepts/direct-relation-read-types.js',
  );

  assert.equal(
    new Set(DIRECT_RELATION_READ_EXPOSED_TYPES).size,
    DIRECT_RELATION_READ_EXPOSED_TYPES.length,
    'backend/src/modules/concepts/direct-relation-read-types.js must not contain duplicate exposed relation types.',
  );

  DIRECT_RELATION_READ_EXPOSED_TYPES.forEach((type) => {
    assert.equal(
      isDirectRelationReadExposedType(type),
      true,
      `Runtime exposure source does not recognize "${type}" as an exposed direct relation type.`,
    );
  });

  process.stdout.write('PASS direct_relation_type_exposure_allowlist_source\n');
}

function verifyRuntimeBehavior() {
  const canonicalResponse = loadResolveConceptQueryFresh()('relation between authority and power');
  const equivalentResponse = loadResolveConceptQueryFresh()(APPROVED_EQUIVALENT_DIRECT_RELATION_QUERY);

  assertRelationReadSuccessShape(canonicalResponse);
  assertRelationReadSuccessShape(equivalentResponse);
  assert.equal(
    canonicalResponse.type,
    'relation_read',
    'Direct relation runtime must continue to return relation_read for the admitted success case.',
  );
  canonicalResponse.relation.entries.forEach((entry) => {
    assert.equal(
      isDirectRelationReadExposedType(entry.type),
      true,
      `Runtime direct relation output contains unexposed type "${entry.type}".`,
    );
  });
  assert.equal(
    equivalentResponse.query,
    APPROVED_EQUIVALENT_DIRECT_RELATION_QUERY,
    'Approved equivalent phrasing must preserve its exact query text.',
  );
  assert.equal(
    equivalentResponse.normalizedQuery,
    APPROVED_EQUIVALENT_DIRECT_RELATION_QUERY,
    'Approved equivalent phrasing must keep the normalized query text stable.',
  );
  assert.deepEqual(
    stripDirectRelationQueryFields(equivalentResponse),
    stripDirectRelationQueryFields(canonicalResponse),
    'Approved equivalent phrasing must reuse the same relation_read payload apart from query text.',
  );

  process.stdout.write('PASS direct_relation_type_runtime_alignment\n');
}

function verifyRuntimeExposureRefusal() {
  const authoredReport = relationLoaderModule.loadAuthoredRelationPackets({
    requireAuthoredRelations: true,
    allowFallback: false,
  });
  const nonExposedRelationReport = {
    ...authoredReport,
    source: 'authored',
    relationDataPresent: true,
    relations: authoredReport.relations.map((relation) => (
      relation.subject?.conceptId === 'power' && relation.target?.conceptId === 'authority'
        ? { ...relation, type: 'WEAKENS' }
        : relation
    )),
  };

  const mockedLoader = mock.method(
    relationLoaderModule,
    'loadAuthoredRelationPackets',
    () => nonExposedRelationReport,
  );

  try {
    const resolveConceptQuery = loadResolveConceptQueryFresh();
    const response = resolveConceptQuery('relation between authority and power');

    assertRelationReadRefusalShape(response, ['authority', 'power']);
    assert.match(
      response.interpretation.message,
      /not exposed/i,
      'Direct relation runtime refusal must clearly identify exposure policy drift.',
    );
  } finally {
    mockedLoader.mock.restore();
    delete require.cache[require.resolve(RESOLVER_MODULE)];
  }

  process.stdout.write('PASS direct_relation_type_runtime_exposure_refusal\n');
}

function verifyExposureAndSupportAlias() {
  assertExactOrderedList(
    DIRECT_RELATION_READ_EXPOSED_TYPES,
    DIRECT_RELATION_READ_SUPPORTED_TYPES,
    'direct relation exposure allowlist must remain aligned with the supported direct relation types.',
  );

  process.stdout.write('PASS direct_relation_type_exposure_support_alias\n');
}

function verifyContractDoc() {
  const contractText = fs.readFileSync(contractPath, 'utf8');
  const contractTypes = extractContractAllowedTypes(contractText);

  assertExactOrderedList(
    contractTypes,
    DIRECT_RELATION_READ_EXPOSED_TYPES,
    'docs/product/response-contract.md allowed relation types',
  );

  [
    'every successful `relation_read` response includes the shared top-level product fields plus `resolution` and `relation`',
    '`relation.queryConcepts` always contains exactly two admitted concept IDs in query order',
    'every emitted direct relation entry includes `schemaVersion`, `subject`, `type`, `target`, `basis`, `conditions`, `effect`, and `status`',
    'every emitted `conditions` object includes `when` and `unless`',
    'every emitted `status` object includes `active`, `blocking`, and `note`',
    'direct relation failures reuse the standard `no_exact_match` refusal shape and do not emit a partial `relation_read` payload',
    'Approved equivalent phrasing in this phase: `the relation between <live concept id> and <live concept id>`',
  ].forEach((line) => {
    assert.ok(
      contractText.includes(line),
      `docs/product/response-contract.md is missing the field guarantee line: ${line}`,
    );
  });

  process.stdout.write('PASS direct_relation_type_contract_alignment\n');
}

function verifySchema() {
  const schema = loadJson(schemaPath);
  const schemaTypes = schema?.$defs?.directRelationEntryObject?.properties?.type?.enum;
  const responseRequired = schema?.$defs?.relationReadResponse?.required;
  const relationRequired = schema?.$defs?.relationReadObject?.required;
  const entryRequired = schema?.$defs?.directRelationEntryObject?.required;
  const conditionsRequired = schema?.$defs?.directRelationEntryObject?.properties?.conditions?.required;
  const statusRequired = schema?.$defs?.directRelationEntryObject?.properties?.status?.required;

  assertExactOrderedList(
    schemaTypes,
    DIRECT_RELATION_READ_EXPOSED_TYPES,
    'docs/product/response-schema.json directRelationEntryObject.type enum',
  );
  assertExactOrderedList(
    responseRequired,
    RELATION_READ_SCHEMA_REQUIRED_KEYS,
    'docs/product/response-schema.json relationReadResponse.required',
  );
  assertExactOrderedList(
    relationRequired,
    ['queryConcepts', 'entries'],
    'docs/product/response-schema.json relationReadObject.required',
  );
  assertExactOrderedList(
    entryRequired,
    RELATION_READ_ENTRY_KEYS,
    'docs/product/response-schema.json directRelationEntryObject.required',
  );
  assertExactOrderedList(
    conditionsRequired,
    RELATION_READ_CONDITIONS_KEYS,
    'docs/product/response-schema.json directRelationEntryObject.conditions.required',
  );
  assertExactOrderedList(
    statusRequired,
    RELATION_READ_STATUS_KEYS,
    'docs/product/response-schema.json directRelationEntryObject.status.required',
  );

  process.stdout.write('PASS direct_relation_type_schema_alignment\n');
}

function verifyExamples() {
  const successExample = loadJson(successExamplePath);
  const refusalExample = loadJson(refusalExamplePath);

  assert.equal(successExample.type, 'relation_read', 'relation_read example must stay a relation_read payload.');
  assert.equal(
    successExample.queryType,
    'relation_query',
    'relation_read example must stay a relation_query payload.',
  );
  assertExactKeys(successExample, RELATION_READ_SUCCESS_KEYS, 'docs/product/examples/relation_read.json');
  assert.equal(Array.isArray(successExample.relation?.entries), true, 'relation_read example must include relation entries.');
  assertExactKeys(successExample.relation, ['queryConcepts', 'entries'], 'docs/product/examples/relation_read.json relation object');
  successExample.relation.entries.forEach((entry) => {
    assert.equal(
      isDirectRelationReadExposedType(entry.type),
      true,
      `docs/product/examples/relation_read.json contains unsupported relation type "${entry.type}".`,
    );
    assertExactKeys(entry, RELATION_READ_ENTRY_KEYS, 'docs/product/examples/relation_read.json relation entry');
    assertExactKeys(entry.subject, RELATION_READ_ENDPOINT_KEYS, 'docs/product/examples/relation_read.json relation entry.subject');
    assertExactKeys(entry.target, RELATION_READ_ENDPOINT_KEYS, 'docs/product/examples/relation_read.json relation entry.target');
    assertExactKeys(entry.basis, RELATION_READ_BASIS_KEYS, 'docs/product/examples/relation_read.json relation entry.basis');
    assertExactKeys(entry.conditions, RELATION_READ_CONDITIONS_KEYS, 'docs/product/examples/relation_read.json relation entry.conditions');
    assertExactKeys(entry.effect, RELATION_READ_EFFECT_KEYS, 'docs/product/examples/relation_read.json relation entry.effect');
    assertExactKeys(entry.status, RELATION_READ_STATUS_KEYS, 'docs/product/examples/relation_read.json relation entry.status');
  });

  assert.equal(refusalExample.type, 'no_exact_match', 'relation_read_refusal example must stay a refusal payload.');
  assert.equal(
    refusalExample.queryType,
    'relation_query',
    'relation_read_refusal example must stay in the admitted relation query shape.',
  );
  assertExactKeys(refusalExample, RELATION_READ_REFUSAL_KEYS, 'docs/product/examples/relation_read_refusal.json');
  assertExactKeys(
    refusalExample.interpretation,
    RELATION_READ_REFUSAL_INTERPRETATION_KEYS,
    'docs/product/examples/relation_read_refusal.json interpretation',
  );
  assertExactKeys(refusalExample.resolution, ['method'], 'docs/product/examples/relation_read_refusal.json resolution');
  assert.equal(
    Object.prototype.hasOwnProperty.call(refusalExample, 'relation'),
    false,
    'relation_read_refusal example must not expose a relation payload.',
  );

  process.stdout.write('PASS direct_relation_type_example_alignment\n');
}

function buildRelationReportWithRelations(baseReport, relations) {
  return {
    ...baseReport,
    source: 'authored',
    relationDataPresent: true,
    fallbackUsed: false,
    relations,
  };
}

function resolveRelationQueryWithReport(relationReport, query = 'relation between authority and power') {
  const mockedLoader = mock.method(
    relationLoaderModule,
    'loadAuthoredRelationPackets',
    () => relationReport,
  );

  try {
    const resolveConceptQuery = loadResolveConceptQueryFresh();
    return resolveConceptQuery(query);
  } finally {
    mockedLoader.mock.restore();
    delete require.cache[require.resolve(RESOLVER_MODULE)];
  }
}

function verifyGoldenSnapshots() {
  const successGolden = loadJson(successGoldenPath);
  const refusalGolden = loadJson(refusalGoldenPath);
  const authoredReport = relationLoaderModule.loadAuthoredRelationPackets({
    requireAuthoredRelations: true,
    allowFallback: false,
  });
  const reversedReport = buildRelationReportWithRelations(
    authoredReport,
    [...authoredReport.relations].reverse(),
  );

  assertRelationReadSuccessShape(successGolden);
  assertRelationReadRefusalShape(refusalGolden, ['duty', 'power']);

  const runtimeSuccess = loadResolveConceptQueryFresh()('relation between authority and power');
  const equivalentRuntimeSuccess = loadResolveConceptQueryFresh()(APPROVED_EQUIVALENT_DIRECT_RELATION_QUERY);
  const runtimeRefusal = loadResolveConceptQueryFresh()('relation between duty and power');
  const reversedRuntimeSuccess = resolveRelationQueryWithReport(reversedReport);

  assertStableSnapshot(runtimeSuccess, successGolden, 'relation_read canonical success runtime');
  assertRelationReadSuccessShape(equivalentRuntimeSuccess);
  assert.deepEqual(
    stripDirectRelationQueryFields(equivalentRuntimeSuccess),
    stripDirectRelationQueryFields(runtimeSuccess),
    'relation_read approved equivalent runtime',
  );
  assertStableSnapshot(reversedRuntimeSuccess, successGolden, 'relation_read canonical success reversed-order runtime');
  assertStableSnapshot(runtimeRefusal, refusalGolden, 'relation_read canonical refusal runtime');
  assertStableSnapshot(loadJson(successExamplePath), successGolden, 'docs/product/examples/relation_read.json');
  assertStableSnapshot(loadJson(refusalExamplePath), refusalGolden, 'docs/product/examples/relation_read_refusal.json');

  process.stdout.write('PASS direct_relation_type_golden_snapshot_alignment\n');
}

function main() {
  verifyExposureAllowlistSource();
  verifyRuntimeBehavior();
  verifyRuntimeExposureRefusal();
  verifyExposureAndSupportAlias();
  verifyContractDoc();
  verifySchema();
  verifyExamples();
  verifyGoldenSnapshots();
  process.stdout.write('Direct relation exposure drift verification passed.\n');
}

main();
