'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Ajv2020 = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats');

const { compileClauseToRule } = require('../compile-clause-to-rule');
const { assembleBundle } = require('../assemble-bundle');
const { evaluateBundle } = require('../evaluate-bundle');
const { computeBundleHash } = require('../military-constraint-validator');
const { validateReviewedClauseCorpus } = require('../validate-reviewed-clause-corpus');

const BASE_DIR = path.resolve(__dirname);
const MODULE_DIR = path.resolve(BASE_DIR, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'fixtures', relativePath), 'utf8'));
}

function readModuleJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(MODULE_DIR, relativePath), 'utf8'));
}

function readReviewedClause(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(MODULE_DIR, 'reviewed-clauses', relativePath), 'utf8'));
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildAjv() {
  const ajv = new Ajv2020({ allErrors: true, allowUnionTypes: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(readModuleJson('military-source-registry.schema.json'));
  ajv.addSchema(readModuleJson('source-clause.schema.json'));
  ajv.addSchema(readModuleJson('military-constraint-predicate.schema.json'));
  ajv.addSchema(readModuleJson('military-constraint-rule.schema.json'));
  ajv.addSchema(readModuleJson('military-constraint-authority-graph.schema.json'));
  ajv.addSchema(readModuleJson('military-constraint-bundle.schema.json'));
  ajv.addSchema(readModuleJson('military-constraint-fact.schema.json'));
  ajv.addSchema(readModuleJson('runtime-decision.schema.json'));
  return ajv;
}

function assertValid(ajv, schemaId, value) {
  const validate = ajv.getSchema(schemaId);
  assert.ok(validate, `Missing schema: ${schemaId}`);
  const valid = validate(value);
  assert.equal(valid, true, JSON.stringify(validate.errors, null, 2));
}

function flattenReviewedCorpus() {
  return [
    ...readReviewedClause('legal-floor-core.json'),
    ...readReviewedClause('authority-core.json'),
    ...readReviewedClause('policy-overlay-core.json'),
  ];
}

function getClause(clauses, clauseId) {
  const clause = clauses.find((entry) => entry.clauseId === clauseId);
  assert.ok(clause, `Missing reviewed clause: ${clauseId}`);
  return clause;
}

function getSourceRegistrySubset(sourceRegistry, sourceIds) {
  return sourceIds.map((sourceId) => {
    const entry = sourceRegistry.find((candidate) => candidate.sourceId === sourceId);
    assert.ok(entry, `Missing source registry entry: ${sourceId}`);
    return cloneJson(entry);
  });
}

function buildBundleDraft(bundleId, bundleVersion) {
  return {
    bundleId,
    bundleVersion,
    status: 'ACTIVE',
    jurisdiction: 'US',
    authorityOwner: 'NATIONAL_COMMAND',
    precedencePolicy: {
      stageOrder: [
        'ADMISSIBILITY',
        'LEGAL_FLOOR',
        'POLICY_OVERLAY',
      ],
      defaultDecision: 'REFUSED',
      missingFactDecision: 'REFUSED_INCOMPLETE',
      sameStageConflictPolicy: 'REFUSE',
    },
    factSchemaVersion: '1.0.0',
    authorityGraphId: 'AUTH-GRAPH-US-001',
    compiledAt: '2026-04-13T18:00:00Z',
  };
}

function alignFacts(bundle, facts) {
  facts.bundleId = bundle.bundleId;
  facts.bundleVersion = bundle.bundleVersion;
  facts.bundleHash = bundle.bundleHash;
}

function compileReviewedClause(clauseId, sourceRegistry) {
  const clauses = flattenReviewedCorpus();
  const result = compileClauseToRule({
    clause: getClause(clauses, clauseId),
    sourceRegistry,
  });

  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.ok(result.compiledRule, `Expected compiled rule for ${clauseId}`);
  return result.compiledRule;
}

function buildBundle(bundleId, bundleVersion, clauseIds, sourceRegistry, authorityGraph, factSchema) {
  const compiledRules = clauseIds.map((clauseId) => compileReviewedClause(clauseId, sourceRegistry));
  const sourceIds = [...new Set(compiledRules.flatMap((rule) => rule.sourceRefs.map((entry) => entry.sourceId)))];

  const assembly = assembleBundle({
    bundleDraft: buildBundleDraft(bundleId, bundleVersion),
    compiledRules,
    authorityGraph,
    sourceRegistry: getSourceRegistrySubset(sourceRegistry, sourceIds),
    factSchema,
  });

  assert.equal(assembly.valid, true, assembly.errors.join('\n'));
  assert.ok(assembly.bundle, 'Expected admitted bundle.');
  assert.equal(assembly.bundle.bundleHash, computeBundleHash(assembly.bundle));
  return assembly.bundle;
}

function getExpectedDecision(expectedSnapshots, caseId) {
  const expected = expectedSnapshots.find((entry) => entry.caseId === caseId);
  assert.ok(expected, `Missing expected snapshot for ${caseId}`);
  return expected;
}

function assertDecisionMatchesSnapshot(actual, expected) {
  assert.equal(actual.decision, expected.decision, `decision mismatch for ${expected.caseId}`);
  assert.equal(actual.reasonCode, expected.reasonCode, `reasonCode mismatch for ${expected.caseId}`);
  assert.equal(actual.failedStage, expected.failedStage, `failedStage mismatch for ${expected.caseId}`);
  assert.deepEqual(actual.failingRuleIds, expected.failingRuleIds, `failingRuleIds mismatch for ${expected.caseId}`);
}

function assertRuntimeDecisionValid(result) {
  const ajv = buildAjv();
  assertValid(ajv, 'https://chatpdm.local/schemas/runtime-decision.schema.json', result);
}

test('reference pack manifest is frozen and the reviewed corpus validates', () => {
  const ajv = buildAjv();
  const manifest = readModuleJson('reference-pack-manifest.json');
  const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
  const corpus = flattenReviewedCorpus();

  assertValid(ajv, 'https://chatpdm.local/schemas/military-source-registry.schema.json', sourceRegistry[0]);
  corpus.forEach((clause) => {
    assertValid(ajv, 'https://chatpdm.local/schemas/source-clause.schema.json', clause);
  });

  const validation = validateReviewedClauseCorpus({
    clauses: corpus,
    sourceRegistry,
  });

  assert.equal(validation.valid, true, validation.errors.join('\n'));
  assert.deepEqual(manifest, {
    packId: 'mil-us-core-reference',
    jurisdiction: 'US',
    bundleId: 'mil-us-core-reference-bundle',
    bundleVersion: '0.1.0',
    reviewedClauseSetIds: [
      'legal-floor-core',
      'authority-core',
      'policy-overlay-core',
    ],
    authorityGraphId: 'AUTH-GRAPH-US-001',
    sourceRegistryVersion: '1.0.0',
    regressionSuiteVersion: '1.0.0',
  });
});

test('reference bundle regression snapshots stay stable', () => {
  const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
  const authorityGraph = readJson('authority-graph.json');
  const factSchema = readModuleJson('military-constraint-fact.schema.json');
  const snapshots = readJson('regression/reference-expected-decisions.json');
  const packets = readJson('regression/reference-fact-packets.json');

  const referenceBundle = buildBundle(
    'mil-us-core-reference-bundle',
    '0.1.0',
    [
      'CLAUSE-LF-0001',
      'CLAUSE-AUTH-0001',
    ],
    sourceRegistry,
    authorityGraph,
    factSchema,
  );

  const admissibilityBundle = buildBundle(
    'mil-us-core-reference-admissibility',
    '0.1.0',
    [
      'CLAUSE-LF-0004',
      'CLAUSE-LF-0001',
      'CLAUSE-AUTH-0001',
    ],
    sourceRegistry,
    authorityGraph,
    factSchema,
  );

  packets.forEach((packet) => {
    const expected = getExpectedDecision(snapshots, packet.caseId);
    const bundle = packet.bundleVariant === 'admissibility' ? admissibilityBundle : referenceBundle;
    const facts = cloneJson(packet.facts);

    alignFacts(bundle, facts);

    const result = evaluateBundle({
      bundle,
      facts,
      factSchema,
    });

    assertDecisionMatchesSnapshot(result, expected);
    assertRuntimeDecisionValid(result);
  });
});
