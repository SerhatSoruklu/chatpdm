'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Ajv2020 = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats');

const BASE_DIR = path.resolve(__dirname);
const MODULE_DIR = path.resolve(BASE_DIR, '..');

function readModuleJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(MODULE_DIR, relativePath), 'utf8'));
}

function readFixture(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(MODULE_DIR, 'fixtures', relativePath), 'utf8'));
}

function buildAjv() {
  const ajv = new Ajv2020({ allErrors: true, allowUnionTypes: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(readModuleJson('military-source-registry.schema.json'));
  ajv.addSchema(readModuleJson('military-constraint-predicate.schema.json'));
  ajv.addSchema(readModuleJson('source-clause.schema.json'));
  return ajv;
}

function assertValid(ajv, schemaId, value) {
  const validate = ajv.getSchema(schemaId);
  assert.ok(validate, `Missing schema: ${schemaId}`);
  const valid = validate(value);
  assert.equal(valid, true, JSON.stringify(validate.errors, null, 2));
}

test('military source registry fixture validates', () => {
  const ajv = buildAjv();
  const registry = readFixture('military-source-registry.json');
  assertValid(ajv, 'https://chatpdm.local/schemas/military-source-registry.schema.json', registry[0]);
  assertValid(ajv, 'https://chatpdm.local/schemas/military-source-registry.schema.json', registry[1]);
  assertValid(ajv, 'https://chatpdm.local/schemas/military-source-registry.schema.json', registry[2]);
  assertValid(ajv, 'https://chatpdm.local/schemas/military-source-registry.schema.json', registry[3]);
  assertValid(ajv, 'https://chatpdm.local/schemas/military-source-registry.schema.json', registry[4]);
  assertValid(ajv, 'https://chatpdm.local/schemas/military-source-registry.schema.json', registry[5]);
});

test('valid clause artifact example validates', () => {
  const ajv = buildAjv();
  const clause = readFixture('source-clause.example.json');
  assertValid(ajv, 'https://chatpdm.local/schemas/source-clause.schema.json', clause);
});

test('clause artifact with missing sourceId is rejected', () => {
  const ajv = buildAjv();
  const clause = readFixture('source-clause.example.json');
  delete clause.sourceId;

  const validate = ajv.getSchema('https://chatpdm.local/schemas/source-clause.schema.json');
  assert.ok(validate, 'Missing clause schema');
  const valid = validate(clause);
  assert.equal(valid, false);
});

test('ambiguous clause cannot be compilation ready', () => {
  const ajv = buildAjv();
  const clause = readFixture('source-clause.example.json');
  clause.ambiguityStatus = 'OPEN';
  clause.reviewStatus = 'COMPILATION_READY';

  const validate = ajv.getSchema('https://chatpdm.local/schemas/source-clause.schema.json');
  assert.ok(validate, 'Missing clause schema');
  const valid = validate(clause);
  assert.equal(valid, false);
});

test('example-only source cannot be marked normative without override', () => {
  const ajv = buildAjv();
  const registry = readFixture('military-source-registry.json');
  const example = registry.find((entry) => entry.sourceId === 'UNODC-GMCP-ROE');
  assert.ok(example, 'Missing example-only source entry');
  example.authorityTier = 'NORMATIVE';
  example.admissibility = 'ADMISSIBLE';

  const validate = ajv.getSchema('https://chatpdm.local/schemas/military-source-registry.schema.json');
  assert.ok(validate, 'Missing registry schema');
  const valid = validate(example);
  assert.equal(valid, false);
});
