'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Ajv2020 = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats');

const {
  MILITARY_CONSTRAINT_REASON_CODE_LIST,
  MILITARY_CONSTRAINT_REASON_CODES,
  isMilitaryConstraintReasonCode,
} = require('../military-constraint-reason-codes');
const {
  computeBundleHash,
  validateAuthorityReferences,
  validateContractPack,
  validateMissingFactSemantics,
  validatePredicateOperandTypes,
  validateSameStageConflicts,
} = require('../military-constraint-validator');

const BASE_DIR = path.resolve(__dirname);
const MODULE_DIR = path.resolve(BASE_DIR, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'fixtures', relativePath), 'utf8'));
}

function readSchema(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(MODULE_DIR, relativePath), 'utf8'));
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildAjv() {
  const ajv = new Ajv2020({ allErrors: true, allowUnionTypes: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(readSchema('military-constraint-predicate.schema.json'));
  ajv.addSchema(readSchema('military-constraint-rule.schema.json'));
  ajv.addSchema(readSchema('military-constraint-authority-graph.schema.json'));
  ajv.addSchema(readSchema('military-constraint-bundle.schema.json'));
  ajv.addSchema(readSchema('military-constraint-fact.schema.json'));
  return ajv;
}

function assertValid(ajv, schemaId, value) {
  const validate = ajv.getSchema(schemaId);
  assert.ok(validate, `Missing schema: ${schemaId}`);
  const valid = validate(value);
  assert.equal(valid, true, JSON.stringify(validate.errors, null, 2));
}

function getRule(bundle, ruleId) {
  const rule = bundle.rules.find((entry) => entry.ruleId === ruleId);
  assert.ok(rule, `Missing rule: ${ruleId}`);
  return rule;
}

function assertValidationFailure(result, reasonCode, pattern) {
  assert.equal(result.valid, false, 'expected validation to fail');
  assert.equal(result.reasonCode, reasonCode);
  assert.match(result.errors.join('\n'), pattern);
}

test('reason code enum is closed and stable', () => {
  const keys = Object.keys(MILITARY_CONSTRAINT_REASON_CODES);
  assert.deepEqual([...keys].sort(), MILITARY_CONSTRAINT_REASON_CODE_LIST);
  assert.equal(isMilitaryConstraintReasonCode('PROHIBITED_TARGET'), true);
  assert.equal(isMilitaryConstraintReasonCode('UNKNOWN_REASON_CODE'), false);
});

test('valid contract pack example passes schema and semantic validation', () => {
  const ajv = buildAjv();
  const bundle = readJson('valid-contract-pack.json');
  const factSchema = readSchema('military-constraint-fact.schema.json');

  assertValid(ajv, 'https://chatpdm.local/schemas/military-constraint-bundle.schema.json', bundle);
  assertValid(ajv, 'https://chatpdm.local/schemas/military-constraint-authority-graph.schema.json', bundle.authorityGraph);
  assertValid(ajv, 'https://chatpdm.local/schemas/military-constraint-rule.schema.json', bundle.rules[0]);
  assertValid(ajv, 'https://chatpdm.local/schemas/military-constraint-rule.schema.json', bundle.rules[1]);
  assertValid(ajv, 'https://chatpdm.local/schemas/military-constraint-rule.schema.json', bundle.rules[2]);
  assertValid(ajv, 'https://chatpdm.local/schemas/military-constraint-fact.schema.json', readJson('valid-fact-packet.json'));

  const contractPack = validateContractPack({
    bundle,
    rules: bundle.rules,
    authorityGraph: bundle.authorityGraph,
    factSchema,
  });

  assert.equal(contractPack.valid, true, contractPack.errors.join('\n'));
  assert.equal(validateAuthorityReferences({ bundle, rules: bundle.rules, authorityGraph: bundle.authorityGraph }).valid, true);
  assert.equal(validatePredicateOperandTypes({ rules: bundle.rules, factSchema }).valid, true);
  assert.equal(validateSameStageConflicts({ bundle, rules: bundle.rules }).valid, true);
  assert.equal(validateMissingFactSemantics({ rules: bundle.rules }).valid, true);
});

test('legal-floor prohibition rule passes schema validation', () => {
  const ajv = buildAjv();
  const rule = readJson('legal-floor-prohibition.rule.json');
  assertValid(ajv, 'https://chatpdm.local/schemas/military-constraint-rule.schema.json', rule);
});

test('authority graph contract passes schema validation', () => {
  const ajv = buildAjv();
  const authorityGraph = readJson('authority-graph.json');
  assertValid(ajv, 'https://chatpdm.local/schemas/military-constraint-authority-graph.schema.json', authorityGraph);
});

test('invalid missing-fact overlap is rejected by contract validation', () => {
  const ajv = buildAjv();
  const invalidRule = readJson('invalid-missing-fact-rule.json');
  assertValid(ajv, 'https://chatpdm.local/schemas/military-constraint-rule.schema.json', invalidRule);

  const validation = validateMissingFactSemantics({ rules: [invalidRule] });
  assertValidationFailure(
    validation,
    MILITARY_CONSTRAINT_REASON_CODES.MISSING_REQUIRED_FACT,
    /impossible requiredFacts overlap/,
  );
});

test('bundle conflict policy is explicit and refusal-first', () => {
  const bundle = readJson('bundle-conflict-policy.json');

  assert.equal(bundle.precedencePolicy.defaultDecision, 'REFUSED');
  assert.equal(bundle.precedencePolicy.missingFactDecision, 'REFUSED_INCOMPLETE');
  assert.equal(bundle.precedencePolicy.sameStageConflictPolicy, 'REFUSE');
  assert.deepEqual(bundle.precedencePolicy.stageOrder, [
    'ADMISSIBILITY',
    'LEGAL_FLOOR',
    'POLICY_OVERLAY',
  ]);
});

test('canonical hash remains stable for the valid bundle payload', () => {
  const bundle = readJson('valid-contract-pack.json');
  const hash = computeBundleHash(bundle);

  assert.equal(hash, bundle.bundleHash);
  assert.equal(
    computeBundleHash(bundle),
    computeBundleHash(cloneJson(bundle)),
  );
});

test('nonexistent delegation edge is rejected by authority validation', () => {
  const bundle = cloneJson(readJson('valid-contract-pack.json'));
  getRule(bundle, 'MIL-PO-AUTH-0001').authority.delegationEdgeIds = ['NONEXISTENT-EDGE-999'];

  const validation = validateAuthorityReferences({
    bundle,
    rules: bundle.rules,
    authorityGraph: bundle.authorityGraph,
  });

  assertValidationFailure(
    validation,
    MILITARY_CONSTRAINT_REASON_CODES.AUTHORITY_UNRESOLVED,
    /unknown authority\.delegationEdgeId/,
  );
});

test('nonexistent authority level is rejected by authority validation', () => {
  const bundle = cloneJson(readJson('valid-contract-pack.json'));
  getRule(bundle, 'MIL-PO-AUTH-0001').authority.minimumLevelId = 'NONEXISTENT-LEVEL';

  const validation = validateAuthorityReferences({
    bundle,
    rules: bundle.rules,
    authorityGraph: bundle.authorityGraph,
  });

  assertValidationFailure(
    validation,
    MILITARY_CONSTRAINT_REASON_CODES.AUTHORITY_UNRESOLVED,
    /unknown authority\.minimumLevelId/,
  );
});

test('numeric comparison against enum/string fact is rejected by predicate validation', () => {
  const factSchema = readSchema('military-constraint-fact.schema.json');
  const rule = readJson('legal-floor-prohibition.rule.json');
  rule.ruleId = 'MIL-LF-TGT-0001-NUMERIC-MISMATCH';
  rule.predicate = {
    gt: [
      { fact: 'action.forceLevel' },
      { value: 50 },
    ],
  };

  const validation = validatePredicateOperandTypes({
    rules: [rule],
    factSchema,
  });

  assertValidationFailure(
    validation,
    MILITARY_CONSTRAINT_REASON_CODES.PREDICATE_OPERAND_TYPE_INVALID,
    /numeric or timestamp-compatible operands/,
  );
});

test('same-stage conflicting active rules are rejected by bundle validation', () => {
  const bundle = cloneJson(readJson('valid-contract-pack.json'));
  const conflictingRule = cloneJson(getRule(bundle, 'MIL-LF-TGT-0001'));
  conflictingRule.ruleId = 'MIL-LF-TGT-0001-CONFLICT';
  conflictingRule.effect.reasonCode = 'NOT_A_MILITARY_OBJECTIVE';
  bundle.rules.push(conflictingRule);

  const validation = validateSameStageConflicts({
    bundle,
    rules: bundle.rules,
  });

  assertValidationFailure(
    validation,
    MILITARY_CONSTRAINT_REASON_CODES.RULE_CONFLICT,
    /same-stage conflict detected|duplicate semantic rule detected/,
  );
});
