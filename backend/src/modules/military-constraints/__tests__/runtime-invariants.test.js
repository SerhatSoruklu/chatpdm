'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Ajv2020 = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats');

const {
  computeBundleHash,
} = require('../military-constraint-validator');
const { evaluateBundle } = require('../evaluate-bundle');

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
  ajv.addSchema(readSchema('runtime-decision.schema.json'));
  return ajv;
}

function alignFacts(bundle, facts) {
  facts.bundleId = bundle.bundleId;
  facts.bundleVersion = bundle.bundleVersion;
  facts.bundleHash = bundle.bundleHash;
}

function assertRuntimeDecisionValid(result) {
  const ajv = buildAjv();
  const validate = ajv.getSchema('https://chatpdm.local/schemas/runtime-decision.schema.json');
  assert.ok(validate, 'Missing runtime decision schema');
  const valid = validate(result);
  assert.equal(valid, true, JSON.stringify(validate.errors, null, 2));
}

function normalizeOutput(result) {
  const clone = cloneJson(result);
  delete clone.bundleHash;
  return clone;
}

test('missing required fact can never produce ALLOWED', () => {
  const bundle = cloneJson(readJson('valid-contract-pack.json'));
  const syntheticRule = cloneJson(bundle.rules.find((rule) => rule.ruleId === 'MIL-ADM-0001'));
  syntheticRule.ruleId = 'MIL-ADM-MISSING-0001';
  syntheticRule.requiredFacts = ['context.nonexistentRequiredFact'];
  syntheticRule.predicate = {
    eq: [
      { fact: 'action.kind' },
      { value: 'STRIKE' },
    ],
  };
  bundle.rules = [syntheticRule];
  bundle.bundleHash = computeBundleHash(bundle);
  const facts = readJson('valid-fact-packet.json');
  alignFacts(bundle, facts);

  const result = evaluateBundle({
    bundle,
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.notEqual(result.decision, 'ALLOWED');
  assert.equal(result.decision, 'REFUSED_INCOMPLETE');
  assert.equal(result.reasonCode, 'MISSING_REQUIRED_FACT');
  assertRuntimeDecisionValid(result);
});

test('legal floor refusal cannot be overridden by policy overlay', () => {
  const bundle = readJson('valid-contract-pack.json');
  const overlay = bundle.rules.find((rule) => rule.ruleId === 'MIL-PO-AUTH-0001');
  assert.ok(overlay, 'Missing overlay rule');
  overlay.effect.decision = 'ALLOWED';
  overlay.effect.reasonCode = 'RULE_CONFLICT';
  bundle.bundleHash = computeBundleHash(bundle);

  const facts = readJson('valid-fact-packet.json');
  alignFacts(bundle, facts);

  const result = evaluateBundle({
    bundle,
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.equal(result.decision, 'REFUSED');
  assert.equal(result.failedStage, 'LEGAL_FLOOR');
  assert.equal(result.reasonCode, 'PROHIBITED_TARGET');
  assertRuntimeDecisionValid(result);
});

test('unknown authority can never produce ALLOWED', () => {
  const bundle = cloneJson(readJson('valid-contract-pack.json'));
  bundle.rules.find((rule) => rule.ruleId === 'MIL-PO-AUTH-0001').authority.delegationEdgeIds = ['NONEXISTENT-EDGE-999'];
  bundle.bundleHash = computeBundleHash(bundle);

  const facts = readJson('valid-fact-packet.json');
  alignFacts(bundle, facts);

  const result = evaluateBundle({
    bundle,
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.equal(result.decision, 'REFUSED');
  assert.equal(result.failedStage, 'BUNDLE_INTEGRITY');
  assert.equal(result.reasonCode, 'AUTHORITY_UNRESOLVED');
  assertRuntimeDecisionValid(result);
});

test('same bundle plus same facts always yields identical output', () => {
  const bundle = readJson('valid-contract-pack.json');
  const facts = readJson('valid-fact-packet.json');
  facts.target.protectedClass = 'MILITARY';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_TRUE';
  facts.actor.authorityLevelId = 'BRIGADE';
  alignFacts(bundle, facts);

  const input = {
    bundle,
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  };

  const first = evaluateBundle(input);
  const firstString = JSON.stringify(first);

  for (let index = 0; index < 100; index += 1) {
    const current = evaluateBundle(cloneJson(input));
    assert.deepEqual(current, first);
    assert.equal(JSON.stringify(current), firstString);
  }

  assertRuntimeDecisionValid(first);
});

test('reordered rules do not change the semantic final result', () => {
  const original = readJson('valid-contract-pack.json');
  const reordered = cloneJson(original);
  reordered.rules = [
    reordered.rules[2],
    reordered.rules[0],
    reordered.rules[1],
  ].map(cloneJson);
  reordered.bundleHash = computeBundleHash(reordered);

  const facts = readJson('valid-fact-packet.json');
  facts.target.protectedClass = 'MILITARY';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_TRUE';
  facts.actor.authorityLevelId = 'BRIGADE';
  alignFacts(original, facts);
  const reorderedFacts = cloneJson(facts);
  alignFacts(reordered, reorderedFacts);

  const first = evaluateBundle({
    bundle: original,
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });
  const second = evaluateBundle({
    bundle: reordered,
    facts: reorderedFacts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.deepEqual(normalizeOutput(first), normalizeOutput(second));
  assertRuntimeDecisionValid(first);
  assertRuntimeDecisionValid(second);
});

test('runtime never evaluates predicates when required facts are missing', () => {
  const bundle = cloneJson(readJson('valid-contract-pack.json'));
  const syntheticRule = {
    ruleId: 'MIL-ADM-STOP-0001',
    version: 1,
    stage: 'ADMISSIBILITY',
    priority: 1200,
    status: 'ACTIVE',
    effect: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
    },
    scope: {
      jurisdiction: 'US',
      domains: ['AIR'],
      missionTypes: ['ARMED_CONFLICT'],
      actionKinds: ['STRIKE'],
    },
    authority: {
      minimumLevelId: 'PLATOON',
      requiresExplicitDelegation: false,
      delegationEdgeIds: [],
    },
    requiredFacts: ['context.nonexistentRequiredFact'],
    predicate: {
      eq: [
        { fact: 'action.kind' },
        { value: 'STRIKE' },
      ],
    },
    sourceRefs: [
      {
        sourceId: 'DOD-LOW-2023',
        locator: 'invariant-test',
      },
    ],
  };
  bundle.rules = [syntheticRule];
  bundle.bundleHash = computeBundleHash(bundle);

  const facts = readJson('valid-fact-packet.json');
  alignFacts(bundle, facts);

  const result = evaluateBundle({
    bundle,
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.equal(result.decision, 'REFUSED_INCOMPLETE');
  assert.equal(result.failedStage, 'ADMISSIBILITY');
  assert.equal(result.reasonCode, 'MISSING_REQUIRED_FACT');
  assert.deepEqual(result.failingRuleIds, ['MIL-ADM-STOP-0001']);
  assert.deepEqual(result.ruleTrace[0].usedFacts, []);
  assertRuntimeDecisionValid(result);
});
