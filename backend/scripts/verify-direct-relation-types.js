'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  DIRECT_RELATION_READ_SUPPORTED_TYPES,
  isDirectRelationReadSupportedType,
} = require('../src/modules/concepts/direct-relation-read-types');
const {
  resolveConceptQuery,
} = require('../src/modules/concepts/resolver');

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
    `${label} drifted from the direct relation read allowlist source.`,
  );
}

function verifyRuntimeAllowlistSource() {
  assertExactOrderedList(
    DIRECT_RELATION_READ_SUPPORTED_TYPES,
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
    new Set(DIRECT_RELATION_READ_SUPPORTED_TYPES).size,
    DIRECT_RELATION_READ_SUPPORTED_TYPES.length,
    'backend/src/modules/concepts/direct-relation-read-types.js must not contain duplicate supported relation types.',
  );

  DIRECT_RELATION_READ_SUPPORTED_TYPES.forEach((type) => {
    assert.equal(
      isDirectRelationReadSupportedType(type),
      true,
      `Runtime allowlist source does not recognize "${type}" as a supported direct relation type.`,
    );
  });

  process.stdout.write('PASS direct_relation_type_allowlist_source\n');
}

function verifyRuntimeBehavior() {
  const response = resolveConceptQuery('relation between authority and power');

  assert.equal(
    response.type,
    'relation_read',
    'Direct relation runtime must continue to return relation_read for the admitted success case.',
  );
  assert.equal(Array.isArray(response.relation?.entries), true, 'relation_read response must expose relation entries.');
  response.relation.entries.forEach((entry) => {
    assert.equal(
      isDirectRelationReadSupportedType(entry.type),
      true,
      `Runtime direct relation output contains unsupported type "${entry.type}".`,
    );
  });

  process.stdout.write('PASS direct_relation_type_runtime_alignment\n');
}

function verifyContractDoc() {
  const contractText = fs.readFileSync(contractPath, 'utf8');
  const contractTypes = extractContractAllowedTypes(contractText);

  assertExactOrderedList(
    contractTypes,
    DIRECT_RELATION_READ_SUPPORTED_TYPES,
    'docs/product/response-contract.md allowed relation types',
  );

  process.stdout.write('PASS direct_relation_type_contract_alignment\n');
}

function verifySchema() {
  const schema = loadJson(schemaPath);
  const schemaTypes = schema?.$defs?.directRelationEntryObject?.properties?.type?.enum;

  assertExactOrderedList(
    schemaTypes,
    DIRECT_RELATION_READ_SUPPORTED_TYPES,
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
      isDirectRelationReadSupportedType(entry.type),
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
  verifyRuntimeAllowlistSource();
  verifyRuntimeBehavior();
  verifyContractDoc();
  verifySchema();
  verifyExamples();
  process.stdout.write('Direct relation type allowlist verification passed.\n');
}

main();
