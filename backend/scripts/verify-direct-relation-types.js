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

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
  const response = loadResolveConceptQueryFresh()('relation between authority and power');

  assert.equal(
    response.type,
    'relation_read',
    'Direct relation runtime must continue to return relation_read for the admitted success case.',
  );
  assert.equal(Array.isArray(response.relation?.entries), true, 'relation_read response must expose relation entries.');
  response.relation.entries.forEach((entry) => {
    assert.equal(
      isDirectRelationReadExposedType(entry.type),
      true,
      `Runtime direct relation output contains unexposed type "${entry.type}".`,
    );
  });

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

    assert.equal(
      response.type,
      'no_exact_match',
      'Direct relation runtime must refuse when an authored relation type is not exposed by policy.',
    );
    assert.equal(
      response.interpretation.interpretationType,
      'relation_not_supported',
      'Direct relation runtime must surface relation_not_supported when exposure policy blocks the relation type.',
    );
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

  process.stdout.write('PASS direct_relation_type_contract_alignment\n');
}

function verifySchema() {
  const schema = loadJson(schemaPath);
  const schemaTypes = schema?.$defs?.directRelationEntryObject?.properties?.type?.enum;

  assertExactOrderedList(
    schemaTypes,
    DIRECT_RELATION_READ_EXPOSED_TYPES,
    'docs/product/response-schema.json directRelationEntryObject.type enum',
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
  assert.equal(Array.isArray(successExample.relation?.entries), true, 'relation_read example must include relation entries.');
  successExample.relation.entries.forEach((entry) => {
    assert.equal(
      isDirectRelationReadExposedType(entry.type),
      true,
      `docs/product/examples/relation_read.json contains unsupported relation type "${entry.type}".`,
    );
  });

  assert.equal(refusalExample.type, 'no_exact_match', 'relation_read_refusal example must stay a refusal payload.');
  assert.equal(
    refusalExample.queryType,
    'relation_query',
    'relation_read_refusal example must stay in the admitted relation query shape.',
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(refusalExample, 'relation'),
    false,
    'relation_read_refusal example must not expose a relation payload.',
  );

  process.stdout.write('PASS direct_relation_type_example_alignment\n');
}

function main() {
  verifyExposureAllowlistSource();
  verifyRuntimeBehavior();
  verifyRuntimeExposureRefusal();
  verifyExposureAndSupportAlias();
  verifyContractDoc();
  verifySchema();
  verifyExamples();
  process.stdout.write('Direct relation exposure drift verification passed.\n');
}

main();
