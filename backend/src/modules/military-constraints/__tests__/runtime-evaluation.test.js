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
const { evaluateRule } = require('../evaluate-rule');

const BASE_DIR = path.resolve(__dirname);
const MODULE_DIR = path.resolve(BASE_DIR, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'fixtures', relativePath), 'utf8'));
}

function readSchema(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(MODULE_DIR, relativePath), 'utf8'));
}

function buildAjv() {
  const ajv = new Ajv2020({ allErrors: true, allowUnionTypes: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(readSchema('runtime-decision.schema.json'));
  return ajv;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function alignFacts(bundle, facts) {
  facts.bundleId = bundle.bundleId;
  facts.bundleVersion = bundle.bundleVersion;
  facts.bundleHash = bundle.bundleHash;
}

function alignSourceRegistrySnapshot(bundle, sourceIds) {
  const allowed = new Set(sourceIds);
  bundle.sourceRegistrySnapshot = Array.isArray(bundle.sourceRegistrySnapshot)
    ? bundle.sourceRegistrySnapshot.filter((entry) => allowed.has(entry.sourceId))
    : [];
}

function getRule(bundle, ruleId) {
  const rule = bundle.rules.find((entry) => entry.ruleId === ruleId);
  assert.ok(rule, `Missing rule: ${ruleId}`);
  return rule;
}

function stripBundleHash(result) {
  const clone = cloneJson(result);
  delete clone.bundleHash;
  return clone;
}

function assertRuntimeDecisionValid(result) {
  const ajv = buildAjv();
  const validate = ajv.getSchema('https://chatpdm.local/schemas/runtime-decision.schema.json');
  assert.ok(validate, 'Missing runtime decision schema');
  const valid = validate(result);
  assert.equal(valid, true, JSON.stringify(validate.errors, null, 2));
}

test('missing required fact returns REFUSED_INCOMPLETE', () => {
  const bundle = cloneJson(readJson('valid-contract-pack.json'));
  const syntheticRule = cloneJson(getRule(bundle, 'MIL-ADM-0001'));
  syntheticRule.ruleId = 'MIL-ADM-MISSING-0001';
  syntheticRule.requiredFacts = ['context.nonexistentRequiredFact'];
  syntheticRule.predicate = {
    eq: [
      { fact: 'action.kind' },
      { value: 'STRIKE' },
    ],
  };
  bundle.rules = [syntheticRule];
  alignSourceRegistrySnapshot(bundle, [syntheticRule.sourceRefs[0].sourceId]);
  bundle.bundleHash = computeBundleHash(bundle);
  const facts = readJson('valid-fact-packet.json');
  alignFacts(bundle, facts);

  const result = evaluateBundle({
    bundle,
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.equal(result.decision, 'REFUSED_INCOMPLETE');
  assert.equal(result.reasonCode, 'MISSING_REQUIRED_FACT');
  assert.equal(result.failedStage, 'ADMISSIBILITY');
  assert.deepEqual(result.failingRuleIds, ['MIL-ADM-MISSING-0001']);
  assert.ok(result.missingFactIds.includes('context.nonexistentRequiredFact'));
  assert.equal(result.bundleId, bundle.bundleId);
  assert.deepEqual(result.ruleTrace[0].sourceRefs, [
    {
      sourceId: syntheticRule.sourceRefs[0].sourceId,
      locator: syntheticRule.sourceRefs[0].locator,
    },
  ]);
  assertRuntimeDecisionValid(result);
});

test('legal-floor prohibition returns REFUSED', () => {
  const bundle = readJson('valid-contract-pack.json');
  const facts = readJson('valid-fact-packet.json');
  alignFacts(bundle, facts);

  const result = evaluateBundle({
    bundle,
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.equal(result.decision, 'REFUSED');
  assert.equal(result.reasonCode, 'PROHIBITED_TARGET');
  assert.equal(result.failedStage, 'LEGAL_FLOOR');
  assert.deepEqual(result.failingRuleIds, ['MIL-LF-TGT-0001']);
  assertRuntimeDecisionValid(result);
});

test('authority invalid returns REFUSED during bundle admission', () => {
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
  assert.equal(result.reasonCode, 'AUTHORITY_UNRESOLVED');
  assert.equal(result.failedStage, 'BUNDLE_INTEGRITY');
  assertRuntimeDecisionValid(result);
});

test('missing explicit delegation path returns REFUSED during bundle admission', () => {
  const bundle = cloneJson(readJson('valid-contract-pack.json'));
  bundle.rules.find((rule) => rule.ruleId === 'MIL-PO-AUTH-0001').authority.delegationEdgeIds = [];
  bundle.bundleHash = computeBundleHash(bundle);
  const facts = readJson('valid-fact-packet.json');
  alignFacts(bundle, facts);

  const result = evaluateBundle({
    bundle,
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.equal(result.decision, 'REFUSED');
  assert.equal(result.reasonCode, 'AUTHORITY_UNRESOLVED');
  assert.equal(result.failedStage, 'BUNDLE_INTEGRITY');
  assertRuntimeDecisionValid(result);
});

test('fully allowed facts return ALLOWED', () => {
  const bundle = readJson('valid-contract-pack.json');
  const facts = readJson('valid-fact-packet.json');
  facts.target.protectedClass = 'MILITARY';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_TRUE';
  facts.actor.authorityLevelId = 'BRIGADE';
  alignFacts(bundle, facts);

  const result = evaluateBundle({
    bundle,
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.equal(result.decision, 'ALLOWED');
  assert.equal(result.reasonCode, null);
  assert.equal(result.failedStage, null);
  assert.equal(result.bundleId, bundle.bundleId);
  assert.ok(result.ruleTrace.every((entry) => Array.isArray(entry.sourceRefs) && entry.sourceRefs.length > 0));
  assertRuntimeDecisionValid(result);
});

test('identical input run twice yields identical output', () => {
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
  const second = evaluateBundle(cloneJson(input));

  assert.deepEqual(first, second);
  assertRuntimeDecisionValid(first);
});

test('rule order shuffled in storage still yields the same final result', () => {
  const bundle = readJson('valid-contract-pack.json');
  const shuffled = cloneJson(bundle);
  shuffled.rules = [
    getRule(shuffled, 'MIL-PO-AUTH-0001'),
    getRule(shuffled, 'MIL-ADM-0001'),
    getRule(shuffled, 'MIL-LF-TGT-0001'),
  ].map(cloneJson);
  shuffled.bundleHash = computeBundleHash(shuffled);

  const facts = readJson('valid-fact-packet.json');
  alignFacts(bundle, facts);
  const shuffledFacts = cloneJson(facts);
  alignFacts(shuffled, shuffledFacts);
  const original = evaluateBundle({
    bundle,
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });
  const reordered = evaluateBundle({
    bundle: shuffled,
    facts: shuffledFacts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.deepEqual(stripBundleHash(original), stripBundleHash(reordered));
  assertRuntimeDecisionValid(original);
  assertRuntimeDecisionValid(reordered);
});

test('rule evaluator preserves NOT_APPLICABLE and NO_MATCH', () => {
  const bundle = readJson('valid-contract-pack.json');
  const factSchema = readSchema('military-constraint-fact.schema.json');

  const notApplicableFacts = readJson('valid-fact-packet.json');
  notApplicableFacts.action.domain = 'CYBER';
  alignFacts(bundle, notApplicableFacts);

  const notApplicable = evaluateRule({
    rule: getRule(bundle, 'MIL-LF-TGT-0001'),
    facts: notApplicableFacts,
    bundle,
    factSchema,
  });

  assert.equal(notApplicable.outcome, 'NOT_APPLICABLE');

  const noMatchFacts = readJson('valid-fact-packet.json');
  noMatchFacts.target.protectedClass = 'MILITARY';
  noMatchFacts.target.militaryObjectiveStatus = 'CONFIRMED_TRUE';
  alignFacts(bundle, noMatchFacts);

  const noMatch = evaluateRule({
    rule: getRule(bundle, 'MIL-LF-TGT-0001'),
    facts: noMatchFacts,
    bundle,
    factSchema,
  });

  assert.equal(noMatch.outcome, 'NO_MATCH');
});

test('rule evaluator returns source refs in canonical order', () => {
  const bundle = readJson('valid-contract-pack.json');
  const factSchema = readSchema('military-constraint-fact.schema.json');
  const rule = cloneJson(getRule(bundle, 'MIL-ADM-0001'));
  rule.sourceRefs = [
    {
      sourceId: 'ROE-DOCTRINE-2020',
      locator: 'doctrine-revision/zeta',
    },
    {
      sourceId: 'NEWPORT-ROE-2022',
      locator: 'authoring-flow/alpha',
    },
  ];

  const facts = readJson('valid-fact-packet.json');
  alignFacts(bundle, facts);

  const outcome = evaluateRule({
    rule,
    facts,
    bundle,
    factSchema,
  });

  assert.deepEqual(outcome.sourceRefs, [
    {
      sourceId: 'NEWPORT-ROE-2022',
      locator: 'authoring-flow/alpha',
    },
    {
      sourceId: 'ROE-DOCTRINE-2020',
      locator: 'doctrine-revision/zeta',
    },
  ]);
});

test('unknown enum values are refused before they can produce ALLOWED', () => {
  const bundle = readJson('valid-contract-pack.json');
  const facts = readJson('valid-fact-packet.json');
  facts.target.protectedClass = 'NOT_A_REAL_ENUM';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_TRUE';
  facts.actor.authorityLevelId = 'BRIGADE';
  alignFacts(bundle, facts);

  const result = evaluateBundle({
    bundle,
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.notEqual(result.decision, 'ALLOWED');
  assert.equal(result.decision, 'REFUSED_INCOMPLETE');
  assert.equal(result.reasonCode, 'FACT_PACKET_INVALID');
  assertRuntimeDecisionValid(result);
});

test('null and undefined are handled differently at runtime', () => {
  const bundle = readJson('valid-contract-pack.json');
  const factSchema = readSchema('military-constraint-fact.schema.json');

  const nullFacts = readJson('valid-fact-packet.json');
  nullFacts.target.horsDeCombatStatus = null;
  alignFacts(bundle, nullFacts);

  const nullResult = evaluateBundle({
    bundle,
    facts: nullFacts,
    factSchema,
  });

  assert.equal(nullResult.decision, 'REFUSED_INCOMPLETE');
  assert.equal(nullResult.reasonCode, 'FACT_PACKET_INVALID');

  const missingBundle = cloneJson(bundle);
  const missingRule = cloneJson(getRule(missingBundle, 'MIL-ADM-0001'));
  missingRule.ruleId = 'MIL-ADM-MISSING-0002';
  missingRule.requiredFacts = ['context.nonexistentRequiredFact'];
  missingRule.predicate = {
    eq: [
      { fact: 'action.kind' },
      { value: 'STRIKE' },
    ],
  };
  missingBundle.rules = [missingRule];
  alignSourceRegistrySnapshot(missingBundle, [missingRule.sourceRefs[0].sourceId]);
  missingBundle.bundleHash = computeBundleHash(missingBundle);

  const undefinedFacts = readJson('valid-fact-packet.json');
  alignFacts(missingBundle, undefinedFacts);

  const undefinedResult = evaluateBundle({
    bundle: missingBundle,
    facts: undefinedFacts,
    factSchema,
  });

  assert.equal(undefinedResult.decision, 'REFUSED_INCOMPLETE');
  assert.equal(undefinedResult.reasonCode, 'MISSING_REQUIRED_FACT');
  assert.ok(undefinedResult.missingFactIds.includes('context.nonexistentRequiredFact'));
});

test('malformed timestamps are refused', () => {
  const bundle = readJson('valid-contract-pack.json');
  const facts = readJson('valid-fact-packet.json');
  facts.context.timeWindowStart = 'not-a-timestamp';
  alignFacts(bundle, facts);

  const result = evaluateBundle({
    bundle,
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.equal(result.decision, 'REFUSED_INCOMPLETE');
  assert.equal(result.reasonCode, 'FACT_PACKET_INVALID');
  assertRuntimeDecisionValid(result);
});

test('array and scalar mismatches are refused', () => {
  const bundle = readJson('valid-contract-pack.json');
  const facts = readJson('valid-fact-packet.json');
  facts.action.forceLevel = ['DEADLY'];
  alignFacts(bundle, facts);

  const result = evaluateBundle({
    bundle,
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.equal(result.decision, 'REFUSED_INCOMPLETE');
  assert.equal(result.reasonCode, 'FACT_PACKET_INVALID');
  assertRuntimeDecisionValid(result);
});

test('deeply nested predicates evaluate deterministically', () => {
  const bundle = readJson('valid-contract-pack.json');
  const syntheticRule = cloneJson(getRule(bundle, 'MIL-PO-AUTH-0001'));
  syntheticRule.ruleId = 'MIL-NESTED-0001';
  syntheticRule.version = 1;
  syntheticRule.stage = 'POLICY_OVERLAY';
  syntheticRule.priority = 50;
  syntheticRule.status = 'ACTIVE';
  syntheticRule.effect = {
    decision: 'REFUSED',
    reasonCode: 'AUTHORITY_INVALID',
  };
  syntheticRule.scope = {
    jurisdiction: 'US',
    domains: ['AIR'],
    missionTypes: ['ARMED_CONFLICT'],
    actionKinds: ['STRIKE'],
  };
  syntheticRule.authority = {
    minimumLevelId: 'BRIGADE',
    requiresExplicitDelegation: false,
    delegationEdgeIds: [],
  };
  syntheticRule.requiredFacts = ['action.kind', 'target.protectedClass'];
  syntheticRule.predicate = {
    all: [
      {
        any: [
          {
            eq: [
              { fact: 'action.kind' },
              { value: 'STRIKE' },
            ],
          },
          {
            not: {
              neq: [
                { fact: 'action.kind' },
                { value: 'STRIKE' },
              ],
            },
          },
        ],
      },
      {
        not: {
          any: [
            {
              neq: [
                { fact: 'target.protectedClass' },
                { value: 'CIVILIAN' },
              ],
            },
            {
              not: {
                eq: [
                  { fact: 'context.missionType' },
                  { value: 'ARMED_CONFLICT' },
                ],
              },
            },
          ],
        },
      },
    ],
  };
  const nestedBundle = cloneJson(bundle);
  nestedBundle.rules = [syntheticRule];
  alignSourceRegistrySnapshot(nestedBundle, [syntheticRule.sourceRefs[0].sourceId]);
  nestedBundle.bundleHash = computeBundleHash(nestedBundle);

  const facts = readJson('valid-fact-packet.json');
  facts.target.protectedClass = 'CIVILIAN';
  facts.action.kind = 'STRIKE';
  alignFacts(nestedBundle, facts);

  const first = evaluateBundle({
    bundle: nestedBundle,
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });
  const second = evaluateBundle({
    bundle: cloneJson(nestedBundle),
    facts: cloneJson(facts),
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.deepEqual(first, second);
  assert.equal(first.decision, 'REFUSED');
  assert.equal(first.reasonCode, 'AUTHORITY_INVALID');
  assertRuntimeDecisionValid(first);
});
