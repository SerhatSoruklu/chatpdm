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

function buildDuplicateSourceRegistry(sourceRegistry) {
  const duplicateRegistry = cloneJson(sourceRegistry);
  duplicateRegistry.push(cloneJson(duplicateRegistry[0]));
  return duplicateRegistry;
}

function buildBundleDraft(bundleId) {
  return {
    bundleId,
    bundleVersion: '0.1.0',
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

function compileReviewReadyClause(clauses, sourceRegistry, clauseId) {
  const result = compileClauseToRule({
    clause: getClause(clauses, clauseId),
    sourceRegistry,
  });

  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.ok(result.compiledRule, `Expected compiled rule for ${clauseId}`);
  return result.compiledRule;
}

function buildBundle({ bundleId, rules }) {
  const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
  const authorityGraph = readJson('authority-graph.json');
  const factSchema = readModuleJson('military-constraint-fact.schema.json');

  const assembly = assembleBundle({
    bundleDraft: buildBundleDraft(bundleId),
    compiledRules: rules,
    authorityGraph,
    sourceRegistry: getSourceRegistrySubset(sourceRegistry, [...new Set(rules.flatMap((rule) => rule.sourceRefs.map((ref) => ref.sourceId)))]),
    factSchema,
  });

  assert.equal(assembly.valid, true, assembly.errors.join('\n'));
  assert.ok(assembly.bundle, 'Expected admitted bundle.');
  assert.equal(assembly.bundle.bundleHash, computeBundleHash(assembly.bundle));

  return assembly.bundle;
}

function assertRuntimeDecisionValid(result) {
  const ajv = buildAjv();
  assertValid(ajv, 'https://chatpdm.local/schemas/runtime-decision.schema.json', result);
}

function assertRuntimeDecisionTrace(result, bundle, caseLabel) {
  assert.equal(result.bundleId, bundle.bundleId, `${caseLabel} bundleId`);
  assert.ok(
    result.ruleTrace.every((entry) => Array.isArray(entry.sourceRefs) && entry.sourceRefs.every((ref) => typeof ref.sourceId === 'string' && typeof ref.locator === 'string')),
    `${caseLabel} source refs`,
  );
}

test('reviewed clause corpus passes schema and corpus validation', () => {
  const ajv = buildAjv();
  const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
  const clauses = flattenReviewedCorpus();

  assert.ok(clauses.length >= 20 && clauses.length <= 40, `Expected 20-40 reviewed clauses, found ${clauses.length}.`);

  assertValid(ajv, 'https://chatpdm.local/schemas/military-source-registry.schema.json', sourceRegistry[0]);
  clauses.forEach((clause) => {
    assertValid(ajv, 'https://chatpdm.local/schemas/source-clause.schema.json', clause);
  });

  const validation = validateReviewedClauseCorpus({
    clauses,
    sourceRegistry,
  });

  assert.equal(validation.valid, true, validation.errors.join('\n'));
});

test('corpus validator rejects duplicate clause ids', () => {
  const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
  const clauses = flattenReviewedCorpus();
  const duplicate = cloneJson(clauses[0]);
  duplicate.rawText = `${duplicate.rawText} duplicate`;

  const validation = validateReviewedClauseCorpus({
    clauses: [...clauses, duplicate],
    sourceRegistry,
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.reasonCode, 'RULE_CONFLICT');
  assert.match(validation.errors.join('\n'), /duplicate clauseId/i);
});

test('corpus validator rejects unknown source ids', () => {
  const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
  const clauses = flattenReviewedCorpus();
  const mutated = cloneJson(clauses[0]);
  mutated.sourceId = 'UNKNOWN-SOURCE-999';

  const validation = validateReviewedClauseCorpus({
    clauses: [...clauses.slice(1), mutated],
    sourceRegistry,
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.reasonCode, 'POLICY_BUNDLE_INVALID');
  assert.match(validation.errors.join('\n'), /unknown sourceId/i);
});

test('corpus validator rejects missing locators', () => {
  const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
  const clauses = flattenReviewedCorpus();
  const mutated = cloneJson(clauses[0]);
  delete mutated.locator;

  const validation = validateReviewedClauseCorpus({
    clauses: [...clauses.slice(1), mutated],
    sourceRegistry,
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.reasonCode, 'RULE_SHAPE_INVALID');
  assert.match(validation.errors.join('\n'), /missing a locator/i);
});

test('corpus validator rejects missing provenance metadata', () => {
  const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
  const clauses = flattenReviewedCorpus();
  const mutated = cloneJson(getClause(clauses, 'CLAUSE-LF-0001'));
  delete mutated.provenance;

  const validation = validateReviewedClauseCorpus({
    clauses: [...clauses.filter((clause) => clause.clauseId !== 'CLAUSE-LF-0001'), mutated],
    sourceRegistry,
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.reasonCode, 'RULE_SHAPE_INVALID');
  assert.match(validation.errors.join('\n'), /must include explicit provenance metadata/i);
});

test('corpus validator rejects stale locator references', () => {
  const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
  const clauses = flattenReviewedCorpus();
  const mutated = cloneJson(getClause(clauses, 'CLAUSE-LF-0001'));
  mutated.locator = 'chapter-6/5.3.2';

  const validation = validateReviewedClauseCorpus({
    clauses: [...clauses.filter((clause) => clause.clauseId !== 'CLAUSE-LF-0001'), mutated],
    sourceRegistry,
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.reasonCode, 'POLICY_BUNDLE_INVALID');
  assert.match(validation.errors.join('\n'), /not bound to source locator anchor/i);
});

test('corpus validator rejects example-only promotion without override', () => {
  const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
  const clauses = flattenReviewedCorpus();
  const promotedExample = cloneJson(getClause(clauses, 'CLAUSE-PO-0007'));
  promotedExample.clauseId = 'CLAUSE-PO-0007-PROMOTED';
  promotedExample.layer = 'POLICY_OVERLAY';
  promotedExample.clauseType = 'AUTHORITY_GATE';
  promotedExample.machineCandidate = true;
  promotedExample.reviewStatus = 'COMPILATION_READY';
  promotedExample.provenance.derivationType = 'ILLUSTRATIVE';

  const validation = validateReviewedClauseCorpus({
    clauses: [...clauses, promotedExample],
    sourceRegistry,
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.reasonCode, 'RULE_SHAPE_INVALID');
  assert.match(validation.errors.join('\n'), /illustrative clause|example-only source/i);
});

test('duplicate source ids fail closed across corpus validation, compilation, and assembly', () => {
  const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
  const duplicateSourceRegistry = buildDuplicateSourceRegistry(sourceRegistry);
  const clauses = flattenReviewedCorpus();
  const authorityGraph = readJson('authority-graph.json');
  const factSchema = readModuleJson('military-constraint-fact.schema.json');

  const corpusValidation = validateReviewedClauseCorpus({
    clauses,
    sourceRegistry: duplicateSourceRegistry,
  });

  assert.equal(corpusValidation.valid, false);
  assert.equal(corpusValidation.reasonCode, 'POLICY_BUNDLE_INVALID');
  assert.match(corpusValidation.errors.join('\n'), /duplicate sourceId/i);

  const compiled = compileClauseToRule({
    clause: getClause(clauses, 'CLAUSE-LF-0001'),
    sourceRegistry: duplicateSourceRegistry,
  });

  assert.equal(compiled.valid, false);
  assert.equal(compiled.reasonCode, 'POLICY_BUNDLE_INVALID');
  assert.match(compiled.errors.join('\n'), /duplicate sourceId/i);

  const legalFloorRule = compileClauseToRule({
    clause: getClause(clauses, 'CLAUSE-LF-0001'),
    sourceRegistry,
  });
  assert.equal(legalFloorRule.valid, true, legalFloorRule.errors.join('\n'));

  const authorityRule = compileClauseToRule({
    clause: getClause(clauses, 'CLAUSE-AUTH-0001'),
    sourceRegistry,
  });
  assert.equal(authorityRule.valid, true, authorityRule.errors.join('\n'));

  const assembly = assembleBundle({
    bundleDraft: buildBundleDraft('mil-us-core-reference-duplicate-source-id'),
    compiledRules: [
      legalFloorRule.compiledRule,
      authorityRule.compiledRule,
    ],
    authorityGraph,
    sourceRegistry: duplicateSourceRegistry,
    factSchema,
  });

  assert.equal(assembly.valid, false);
  assert.equal(assembly.reasonCode, 'POLICY_BUNDLE_INVALID');
  assert.match(assembly.errors.join('\n'), /duplicate sourceId/i);
});

test('composed provenance rejects dangling parent clause ids', () => {
  const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
  const clauses = flattenReviewedCorpus();
  const danglingClause = cloneJson(getClause(clauses, 'CLAUSE-LF-0001'));

  danglingClause.clauseId = 'CLAUSE-DANGLING-0001';
  danglingClause.machineCandidate = false;
  danglingClause.reviewStatus = 'REVIEWED';
  danglingClause.provenance.derivationType = 'COMPOSED';
  danglingClause.provenance.parentClauseIds = ['CLAUSE-MISSING-PARENT'];

  const validation = validateReviewedClauseCorpus({
    clauses: [danglingClause],
    sourceRegistry,
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.reasonCode, 'RULE_SHAPE_INVALID');
  assert.match(validation.errors.join('\n'), /unknown parentClauseId/i);
});

test('composed provenance rejects cyclic parent clause chains', () => {
  const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
  const clauseA = cloneJson(getClause(flattenReviewedCorpus(), 'CLAUSE-LF-0001'));
  const clauseB = cloneJson(getClause(flattenReviewedCorpus(), 'CLAUSE-LF-0004'));

  clauseA.clauseId = 'CLAUSE-CYCLE-0001';
  clauseA.machineCandidate = false;
  clauseA.reviewStatus = 'REVIEWED';
  clauseA.provenance.derivationType = 'COMPOSED';
  clauseA.provenance.parentClauseIds = ['CLAUSE-CYCLE-0002'];

  clauseB.clauseId = 'CLAUSE-CYCLE-0002';
  clauseB.machineCandidate = false;
  clauseB.reviewStatus = 'REVIEWED';
  clauseB.provenance.derivationType = 'COMPOSED';
  clauseB.provenance.parentClauseIds = ['CLAUSE-CYCLE-0001'];

  const validation = validateReviewedClauseCorpus({
    clauses: [clauseA, clauseB],
    sourceRegistry,
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.reasonCode, 'RULE_SHAPE_INVALID');
  assert.match(validation.errors.join('\n'), /cycle/i);
});

test('source-backed reviewed clauses compile into an admitted bundle and evaluate deterministically', () => {
  const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
  const clauses = flattenReviewedCorpus();
  const legalFloorRefusalRule = compileReviewReadyClause(clauses, sourceRegistry, 'CLAUSE-LF-0001');
  const admissibilityGateRule = compileReviewReadyClause(clauses, sourceRegistry, 'CLAUSE-LF-0004');
  const authorityGateRule = compileReviewReadyClause(clauses, sourceRegistry, 'CLAUSE-AUTH-0001');
  const factSchema = readModuleJson('military-constraint-fact.schema.json');

  const legalFloorBundle = buildBundle({
    bundleId: 'mil-us-core-reference-legal-floor',
    rules: [
      legalFloorRefusalRule,
      authorityGateRule,
    ],
  });

  const refusalFacts = readJson('valid-fact-packet.json');
  alignFacts(legalFloorBundle, refusalFacts);

  const legalFloorDecision = evaluateBundle({
    bundle: legalFloorBundle,
    facts: refusalFacts,
    factSchema,
  });

  assert.equal(legalFloorDecision.decision, 'REFUSED');
  assert.equal(legalFloorDecision.failedStage, 'LEGAL_FLOOR');
  assert.equal(legalFloorDecision.reasonCode, 'PROHIBITED_TARGET');
  assertRuntimeDecisionTrace(legalFloorDecision, legalFloorBundle, 'legal-floor decision');
  assertRuntimeDecisionValid(legalFloorDecision);

  const authorityFacts = readJson('valid-fact-packet.json');
  authorityFacts.target.protectedClass = 'MILITARY';
  authorityFacts.target.militaryObjectiveStatus = 'CONFIRMED_TRUE';
  authorityFacts.actor.authorityLevelId = 'COMPANY';
  alignFacts(legalFloorBundle, authorityFacts);

  const authorityDecision = evaluateBundle({
    bundle: legalFloorBundle,
    facts: authorityFacts,
    factSchema,
  });

  assert.equal(authorityDecision.decision, 'REFUSED');
  assert.equal(authorityDecision.failedStage, 'POLICY_OVERLAY');
  assert.equal(authorityDecision.reasonCode, 'AUTHORITY_INVALID');
  assertRuntimeDecisionTrace(authorityDecision, legalFloorBundle, 'authority decision');
  assertRuntimeDecisionValid(authorityDecision);

  const allowedFacts = readJson('valid-fact-packet.json');
  allowedFacts.target.protectedClass = 'MILITARY';
  allowedFacts.target.militaryObjectiveStatus = 'CONFIRMED_TRUE';
  allowedFacts.actor.authorityLevelId = 'BRIGADE';
  alignFacts(legalFloorBundle, allowedFacts);

  const allowedDecision = evaluateBundle({
    bundle: legalFloorBundle,
    facts: allowedFacts,
    factSchema,
  });

  assert.equal(allowedDecision.decision, 'ALLOWED');
  assert.equal(allowedDecision.reasonCode, null);
  assert.equal(allowedDecision.failedStage, null);
  assertRuntimeDecisionTrace(allowedDecision, legalFloorBundle, 'allowed decision');
  assertRuntimeDecisionValid(allowedDecision);

  const missingFactBundle = buildBundle({
    bundleId: 'mil-us-core-reference-missing-fact',
    rules: [
      admissibilityGateRule,
      legalFloorRefusalRule,
      authorityGateRule,
    ],
  });

  const incompleteFacts = readJson('valid-fact-packet.json');
  incompleteFacts.target.protectedClass = 'MILITARY';
  incompleteFacts.target.militaryObjectiveStatus = 'CONFIRMED_TRUE';
  incompleteFacts.actor.authorityLevelId = 'BRIGADE';
  alignFacts(missingFactBundle, incompleteFacts);

  const incompleteDecision = evaluateBundle({
    bundle: missingFactBundle,
    facts: incompleteFacts,
    factSchema,
  });

  assert.equal(incompleteDecision.decision, 'REFUSED_INCOMPLETE');
  assert.equal(incompleteDecision.failedStage, 'ADMISSIBILITY');
  assert.equal(incompleteDecision.reasonCode, 'MISSING_REQUIRED_FACT');
  assert.match(incompleteDecision.missingFactIds.join(','), /target\.positiveIdentificationStatus/);
  assertRuntimeDecisionTrace(incompleteDecision, missingFactBundle, 'incomplete decision');
  assertRuntimeDecisionValid(incompleteDecision);
});

test('bundle assembly rejects source registry locator mismatches', () => {
  const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
  const clauses = flattenReviewedCorpus();
  const legalFloorRefusalRule = compileReviewReadyClause(clauses, sourceRegistry, 'CLAUSE-LF-0001');
  const authorityGateRule = compileReviewReadyClause(clauses, sourceRegistry, 'CLAUSE-AUTH-0001');
  const factSchema = readModuleJson('military-constraint-fact.schema.json');
  const authorityGraph = readJson('authority-graph.json');
  const mutatedSourceRegistry = getSourceRegistrySubset(sourceRegistry, ['DOD-LOW-2023', 'NEWPORT-ROE-2022']);
  const sourceEntry = mutatedSourceRegistry.find((entry) => entry.sourceId === 'DOD-LOW-2023');
  assert.ok(sourceEntry, 'Missing DOD-LOW-2023 source registry entry');
  sourceEntry.locator = 'chapter-6';

  const assembly = assembleBundle({
    bundleDraft: buildBundleDraft('mil-us-core-reference-locator-mismatch'),
    compiledRules: [
      legalFloorRefusalRule,
      authorityGateRule,
    ],
    authorityGraph,
    sourceRegistry: mutatedSourceRegistry,
    factSchema,
  });

  assert.equal(assembly.valid, false);
  assert.equal(assembly.reasonCode, 'POLICY_BUNDLE_INVALID');
  assert.match(assembly.errors.join('\n'), /not bound to source locator anchor/i);
});
