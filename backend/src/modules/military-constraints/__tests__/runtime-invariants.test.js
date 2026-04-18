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
const {
  createPreparedBundle,
  isPreparedBundleContract,
  resolvePreparedBundleContract,
} = require('../prepared-bundle-contract');
const { evaluatePredicate } = require('../evaluate-predicate');
const {
  PREDICATE_BUDGETS,
} = require('../predicate-budgets');

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

function alignSourceRegistrySnapshot(bundle, sourceIds) {
  const allowed = new Set(sourceIds);
  bundle.sourceRegistrySnapshot = Array.isArray(bundle.sourceRegistrySnapshot)
    ? bundle.sourceRegistrySnapshot.filter((entry) => allowed.has(entry.sourceId))
    : [];
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

function buildLeafPredicate() {
  return {
    eq: [
      { fact: 'action.kind' },
      { value: 'STRIKE' },
    ],
  };
}

function buildDeepNotPredicate(depth) {
  let predicate = buildLeafPredicate();
  for (let index = 0; index < depth; index += 1) {
    predicate = {
      not: predicate,
    };
  }
  return predicate;
}

function buildBalancedAllPredicate(levels) {
  if (levels === 0) {
    return buildLeafPredicate();
  }

  return {
    all: [
      buildBalancedAllPredicate(levels - 1),
      buildBalancedAllPredicate(levels - 1),
    ],
  };
}

function buildWideAnyPredicate(width) {
  return {
    any: Array.from({ length: width }, () => buildLeafPredicate()),
  };
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
  alignSourceRegistrySnapshot(bundle, [syntheticRule.sourceRefs[0].sourceId]);
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
  assert.equal(first.bundleId, bundle.bundleId);

  for (let index = 0; index < 100; index += 1) {
    const current = evaluateBundle(cloneJson(input));
    assert.deepEqual(current, first);
    assert.equal(JSON.stringify(current), firstString);
  }

  assertRuntimeDecisionValid(first);
});

test('prepared bundle contract is explicit and preserves evaluation output', () => {
  const rawBundle = cloneJson(readJson('valid-contract-pack.json'));
  const preparedBundleSource = cloneJson(rawBundle);
  const rawFacts = readJson('valid-fact-packet.json');
  const preparedFacts = cloneJson(rawFacts);

  alignFacts(rawBundle, rawFacts);
  alignFacts(preparedBundleSource, preparedFacts);

  const preparedBundle = createPreparedBundle(preparedBundleSource);
  assert.ok(preparedBundle, 'Expected a prepared-bundle wrapper.');
  assert.equal(isPreparedBundleContract(preparedBundle), true);
  assert.equal(preparedBundle.kind, 'prepared-bundle');
  assert.equal(preparedBundle.bundle, preparedBundleSource);
  assert.equal(preparedBundle.bundleId, preparedBundleSource.bundleId);
  assert.equal(preparedBundle.bundleVersion, preparedBundleSource.bundleVersion);
  assert.equal(preparedBundle.bundleHash, preparedBundleSource.bundleHash);
  assert.equal(resolvePreparedBundleContract({ preparedBundle, bundle: rawBundle }), preparedBundle);
  assert.equal(resolvePreparedBundleContract({ bundle: cloneJson(rawBundle) }), null);

  const rawResult = evaluateBundle({
    bundle: rawBundle,
    facts: rawFacts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });
  const preparedResult = evaluateBundle({
    preparedBundle,
    facts: preparedFacts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.deepEqual(preparedResult, rawResult);
  assertRuntimeDecisionValid(preparedResult);
});

test('predicate operator families remain deterministic on valid facts', () => {
  const facts = readJson('valid-fact-packet.json');
  const factSchema = readSchema('military-constraint-fact.schema.json');

  const cases = [
    {
      label: 'eq',
      predicate: {
        eq: [
          { fact: 'action.kind' },
          { value: 'STRIKE' },
        ],
      },
      ok: true,
      usedFacts: ['action.kind'],
    },
    {
      label: 'neq',
      predicate: {
        neq: [
          { fact: 'action.kind' },
          { value: 'ESCORT' },
        ],
      },
      ok: true,
      usedFacts: ['action.kind'],
    },
    {
      label: 'gt',
      predicate: {
        gt: [
          { fact: 'civilianRisk.estimatedIncidentalHarmScore' },
          { fact: 'civilianRisk.expectedMilitaryAdvantageScore' },
        ],
      },
      ok: true,
      usedFacts: [
        'civilianRisk.estimatedIncidentalHarmScore',
        'civilianRisk.expectedMilitaryAdvantageScore',
      ],
    },
    {
      label: 'lt',
      predicate: {
        lt: [
          { fact: 'context.timeWindowStart' },
          { fact: 'context.timeWindowEnd' },
        ],
      },
      ok: true,
      usedFacts: ['context.timeWindowEnd', 'context.timeWindowStart'],
    },
    {
      label: 'exists',
      predicate: {
        exists: [
          { fact: 'context.zone' },
        ],
      },
      ok: true,
      usedFacts: ['context.zone'],
    },
    {
      label: 'not_exists',
      predicate: {
        not_exists: [
          { fact: 'person.status' },
        ],
      },
      ok: true,
      usedFacts: ['person.status'],
    },
    {
      label: 'in',
      predicate: {
        in: [
          { fact: 'action.kind' },
          { value: ['ESCORT', 'STRIKE'] },
        ],
      },
      ok: true,
      usedFacts: ['action.kind'],
    },
    {
      label: 'not_in',
      predicate: {
        not_in: [
          { fact: 'action.kind' },
          { value: ['ESCORT', 'RECON'] },
        ],
      },
      ok: true,
      usedFacts: ['action.kind'],
    },
    {
      label: 'all',
      predicate: {
        all: [
          {
            exists: [
              { fact: 'context.zone' },
            ],
          },
          {
            eq: [
              { fact: 'action.kind' },
              { value: 'STRIKE' },
            ],
          },
        ],
      },
      ok: true,
      usedFacts: ['action.kind', 'context.zone'],
    },
    {
      label: 'any',
      predicate: {
        any: [
          {
            eq: [
              { fact: 'action.kind' },
              { value: 'ESCORT' },
            ],
          },
          {
            eq: [
              { fact: 'action.kind' },
              { value: 'STRIKE' },
            ],
          },
        ],
      },
      ok: true,
      usedFacts: ['action.kind'],
    },
    {
      label: 'not',
      predicate: {
        not: {
          eq: [
            { fact: 'action.kind' },
            { value: 'STRIKE' },
          ],
        },
      },
      ok: false,
      usedFacts: ['action.kind'],
    },
  ];

  cases.forEach((testCase) => {
    const result = evaluatePredicate({
      predicate: testCase.predicate,
      facts,
      factSchema,
    });

    assert.equal(result.ok, testCase.ok, `${testCase.label} ok`);
    assert.deepEqual(result.usedFacts, testCase.usedFacts, `${testCase.label} usedFacts`);
    assert.deepEqual(result.errors, [], `${testCase.label} errors`);
  });
});

test('bundle contract version mismatch fails deterministically on raw and prepared paths', () => {
  const bundle = cloneJson(readJson('valid-contract-pack.json'));
  bundle.contractVersion = '9.9.9';
  bundle.bundleHash = computeBundleHash(bundle);
  const facts = readJson('valid-fact-packet.json');
  alignFacts(bundle, facts);

  const rawResult = evaluateBundle({
    bundle,
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });
  const preparedResult = evaluateBundle({
    preparedBundle: createPreparedBundle(cloneJson(bundle)),
    facts: cloneJson(facts),
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.equal(rawResult.decision, 'REFUSED');
  assert.equal(rawResult.reasonCode, 'BUNDLE_CONTRACT_VERSION_MISMATCH');
  assert.equal(rawResult.failedStage, 'BUNDLE_INTEGRITY');
  assert.deepEqual(preparedResult, rawResult);
  assertRuntimeDecisionValid(rawResult);
});

test('predicate recursion depth is budgeted on the prepared runtime path', () => {
  const bundle = cloneJson(readJson('valid-contract-pack.json'));
  const rule = cloneJson(bundle.rules.find((entry) => entry.ruleId === 'MIL-ADM-0001'));
  assert.ok(rule, 'Missing baseline admissibility rule.');
  rule.requiredFacts = [];
  rule.predicate = buildDeepNotPredicate(PREDICATE_BUDGETS.maxDepth + 1);
  bundle.rules = [rule];
  alignSourceRegistrySnapshot(bundle, [rule.sourceRefs[0].sourceId]);
  bundle.bundleHash = computeBundleHash(bundle);
  const facts = readJson('valid-fact-packet.json');
  facts.action.kind = 'STRIKE';
  alignFacts(bundle, facts);

  const result = evaluateBundle({
    preparedBundle: createPreparedBundle(bundle),
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.equal(result.decision, 'REFUSED_INCOMPLETE');
  assert.equal(result.reasonCode, 'PREDICATE_BUDGET_EXCEEDED');
  assert.equal(result.failedStage, rule.stage);
  assert.deepEqual(result.missingFactIds, []);
  assertRuntimeDecisionValid(result);
});

test('predicate branch width is budgeted on the prepared runtime path', () => {
  const bundle = cloneJson(readJson('valid-contract-pack.json'));
  const rule = cloneJson(bundle.rules.find((entry) => entry.ruleId === 'MIL-ADM-0001'));
  assert.ok(rule, 'Missing baseline admissibility rule.');
  rule.requiredFacts = [];
  rule.predicate = buildWideAnyPredicate(PREDICATE_BUDGETS.maxBranchWidth + 1);
  bundle.rules = [rule];
  alignSourceRegistrySnapshot(bundle, [rule.sourceRefs[0].sourceId]);
  bundle.bundleHash = computeBundleHash(bundle);
  const facts = readJson('valid-fact-packet.json');
  facts.action.kind = 'STRIKE';
  alignFacts(bundle, facts);

  const result = evaluateBundle({
    preparedBundle: createPreparedBundle(bundle),
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.equal(result.decision, 'REFUSED_INCOMPLETE');
  assert.equal(result.reasonCode, 'PREDICATE_BUDGET_EXCEEDED');
  assert.equal(result.failedStage, rule.stage);
  assert.deepEqual(result.missingFactIds, []);
  assertRuntimeDecisionValid(result);
});

test('predicate node count is budgeted on the prepared runtime path', () => {
  const bundle = cloneJson(readJson('valid-contract-pack.json'));
  const rule = cloneJson(bundle.rules.find((entry) => entry.ruleId === 'MIL-ADM-0001'));
  assert.ok(rule, 'Missing baseline admissibility rule.');
  rule.requiredFacts = [];
  rule.predicate = buildBalancedAllPredicate(8);
  bundle.rules = [rule];
  alignSourceRegistrySnapshot(bundle, [rule.sourceRefs[0].sourceId]);
  bundle.bundleHash = computeBundleHash(bundle);
  const facts = readJson('valid-fact-packet.json');
  facts.action.kind = 'STRIKE';
  alignFacts(bundle, facts);

  const result = evaluateBundle({
    preparedBundle: createPreparedBundle(bundle),
    facts,
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.equal(result.decision, 'REFUSED_INCOMPLETE');
  assert.equal(result.reasonCode, 'PREDICATE_BUDGET_EXCEEDED');
  assert.equal(result.failedStage, rule.stage);
  assert.deepEqual(result.missingFactIds, []);
  assertRuntimeDecisionValid(result);
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
    provenance: {
      derivationType: 'INTERPRETED',
      transformationNotes: 'Synthetic invariant rule preserves the source-bound short-circuit path.',
      parentClauseIds: [],
    },
    sourceRefs: [
      {
        sourceId: 'DOD-LOW-2023',
        locator: 'chapter-5/invariant-test',
      },
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
  assert.equal(result.failedStage, 'ADMISSIBILITY');
  assert.equal(result.reasonCode, 'MISSING_REQUIRED_FACT');
  assert.deepEqual(result.failingRuleIds, ['MIL-ADM-STOP-0001']);
  assert.deepEqual(result.ruleTrace[0].usedFacts, []);
  assert.equal(result.bundleId, bundle.bundleId);
  assert.deepEqual(result.ruleTrace[0].sourceRefs, [
    {
      sourceId: 'DOD-LOW-2023',
      locator: 'chapter-5/invariant-test',
    },
  ]);
  assertRuntimeDecisionValid(result);
});
