'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Ajv2020 = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats');

const { compileClauseToRule, getCanonicalTemplateBranch } = require('../compile-clause-to-rule');
const { assembleBundle } = require('../assemble-bundle');
const { evaluateBundle } = require('../evaluate-bundle');
const { computeBundleHash } = require('../military-constraint-validator');

const BASE_DIR = path.resolve(__dirname);
const MODULE_DIR = path.resolve(BASE_DIR, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'fixtures', relativePath), 'utf8'));
}

function readModuleFixture(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(MODULE_DIR, 'fixtures', relativePath), 'utf8'));
}

function readReviewedClause(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(MODULE_DIR, 'reviewed-clauses', relativePath), 'utf8'));
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
  ajv.addSchema(readSchema('source-clause.schema.json'));
  ajv.addSchema(readSchema('military-source-registry.schema.json'));
  ajv.addSchema(readSchema('military-constraint-rule.schema.json'));
  ajv.addSchema(readSchema('military-constraint-authority-graph.schema.json'));
  ajv.addSchema(readSchema('military-constraint-bundle.schema.json'));
  ajv.addSchema(readSchema('runtime-decision.schema.json'));
  ajv.addSchema(readSchema('military-constraint-fact.schema.json'));
  return ajv;
}

function assertValid(ajv, schemaId, value) {
  const validate = ajv.getSchema(schemaId);
  assert.ok(validate, `Missing schema: ${schemaId}`);
  const valid = validate(value);
  assert.equal(valid, true, JSON.stringify(validate.errors, null, 2));
}

function getSourceRegistryEntry(sourceRegistry, sourceId) {
  const entry = sourceRegistry.find((candidate) => candidate.sourceId === sourceId);
  assert.ok(entry, `Missing registry entry: ${sourceId}`);
  return entry;
}

function buildReviewedAuthorityClause() {
  return {
    clauseId: 'CLAUSE-POLICY-0001',
    sourceId: 'NEWPORT-ROE-2022',
    locator: 'authoring-flow/authority-structure',
    jurisdiction: 'US',
    layer: 'POLICY_OVERLAY',
    clauseType: 'AUTHORITY_GATE',
    rawText: 'Air strikes require brigade-level authority.',
    normalizedText: 'Brigade authority is required for air strikes.',
    machineCandidate: true,
    ambiguityStatus: 'CLEAR',
    reviewStatus: 'COMPILATION_READY',
    reviewNotes: 'Reviewed policy overlay authority gate with bounded provenance.',
    provenance: {
      derivationType: 'INTERPRETED',
      transformationNotes: 'Reviewed normalization expresses the source passage in executable clause form.',
      parentClauseIds: [],
    },
  };
}

function buildCanonicalTemplateVariant(baseClause, rawText, normalizedText) {
  const clause = cloneJson(baseClause);
  clause.provenance.derivationType = 'INTERPRETED';
  clause.rawText = rawText;
  clause.normalizedText = normalizedText;
  return clause;
}

function buildReviewedLegalClause() {
  const clause = cloneJson(readModuleFixture('source-clause.example.json'));
  clause.reviewStatus = 'COMPILATION_READY';
  return clause;
}

function buildReviewedLegalRequirementClause() {
  const clauses = readReviewedClause('legal-floor-core.json');
  const clause = clauses.find((entry) => entry.clauseId === 'CLAUSE-LF-0004');
  assert.ok(clause, 'Missing reviewed legal-floor requirement clause.');
  return cloneJson(clause);
}

function buildRegistrySubset(sourceRegistry, sourceIds) {
  return sourceIds.map((sourceId) => {
    const entry = getSourceRegistryEntry(sourceRegistry, sourceId);
    return cloneJson(entry);
  });
}

function buildBundleDraft() {
  return {
    bundleId: 'mil-compiler-golden-1',
    bundleVersion: '1.0.0',
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

function assertRuntimeDecisionValid(result) {
  const ajv = buildAjv();
  assertValid(ajv, 'https://chatpdm.local/schemas/runtime-decision.schema.json', result);
}

function assertRuleValid(rule) {
  const ajv = buildAjv();
  assertValid(ajv, 'https://chatpdm.local/schemas/military-constraint-rule.schema.json', rule);
}

test('reviewed legal-floor and authority clauses compile into an admitted bundle', () => {
  const ajv = buildAjv();
  const sourceRegistry = readModuleFixture('military-source-registry.json');
  const authorityGraph = readJson('authority-graph.json');
  const legalClause = buildReviewedLegalClause();
  const authorityClause = buildReviewedAuthorityClause();

  assertValid(ajv, 'https://chatpdm.local/schemas/military-source-registry.schema.json', sourceRegistry[0]);
  assertValid(ajv, 'https://chatpdm.local/schemas/source-clause.schema.json', legalClause);
  assertValid(ajv, 'https://chatpdm.local/schemas/source-clause.schema.json', authorityClause);

  const legalResult = compileClauseToRule({
    clause: legalClause,
    sourceRegistry,
  });
  assert.equal(legalResult.valid, true, legalResult.errors.join('\n'));
  assert.ok(legalResult.compiledRule, 'Expected legal-floor compiled rule');
  assertRuleValid(legalResult.compiledRule);
  assert.deepEqual(legalResult.compiledRule.provenance, legalClause.provenance);
  assert.match(legalResult.compiledRule.notes, /compiledFromClauseId=CLAUSE-LEGAL-FLOOR-0001/);

  const authorityResult = compileClauseToRule({
    clause: authorityClause,
    sourceRegistry,
  });
  assert.equal(authorityResult.valid, true, authorityResult.errors.join('\n'));
  assert.ok(authorityResult.compiledRule, 'Expected authority compiled rule');
  assertRuleValid(authorityResult.compiledRule);
  assert.deepEqual(authorityResult.compiledRule.provenance, authorityClause.provenance);
  assert.match(authorityResult.compiledRule.notes, /compiledFromClauseId=CLAUSE-POLICY-0001/);

  const assembly = assembleBundle({
    bundleDraft: buildBundleDraft(),
    compiledRules: [
      legalResult.compiledRule,
      authorityResult.compiledRule,
    ],
    authorityGraph,
    sourceRegistry: buildRegistrySubset(sourceRegistry, ['DOD-LOW-2023', 'NEWPORT-ROE-2022']),
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.equal(assembly.valid, true, assembly.errors.join('\n'));
  assert.ok(assembly.bundle, 'Expected admitted bundle');
  assert.ok(assembly.preparedBundle, 'Expected explicit prepared-bundle wrapper.');
  assert.equal(assembly.preparedBundle.kind, 'prepared-bundle');
  assert.equal(assembly.preparedBundle.bundle, assembly.bundle);
  assert.equal(assembly.preparedBundle.bundleId, assembly.bundle.bundleId);
  assert.equal(assembly.preparedBundle.bundleVersion, assembly.bundle.bundleVersion);
  assert.equal(assembly.preparedBundle.bundleHash, assembly.bundle.bundleHash);
  assertValid(ajv, 'https://chatpdm.local/schemas/military-constraint-bundle.schema.json', assembly.bundle);
  assert.equal(assembly.bundle.bundleHash, computeBundleHash(assembly.bundle));
});

test('canonical template branches ignore clause text and expose an explicit branch marker', () => {
  const sourceRegistry = readModuleFixture('military-source-registry.json');
  const legalClauseA = buildCanonicalTemplateVariant(
    buildReviewedLegalClause(),
    'Direct attacks against civilians are prohibited under alternate wording.',
    'Civilian attacks remain prohibited under alternate wording.',
  );
  const legalClauseB = buildCanonicalTemplateVariant(
    buildReviewedLegalClause(),
    'Civilian targeting remains prohibited in another wording.',
    'Civilian targeting remains prohibited in another wording.',
  );
  legalClauseB.normalizedText = 'Civilian targeting remains prohibited in another wording, clarified.';
  const authorityClauseA = buildCanonicalTemplateVariant(
    buildReviewedAuthorityClause(),
    'Air strikes require brigade-level authority under alternate wording.',
    'Air strikes require brigade-level authority under alternate wording.',
  );
  authorityClauseA.normalizedText = 'Air strikes require brigade-level authority under alternate wording, clarified.';
  const authorityClauseB = buildCanonicalTemplateVariant(
    buildReviewedAuthorityClause(),
    'Air strikes require brigade-level authority under different wording.',
    'Air strikes require brigade-level authority under different wording.',
  );
  authorityClauseB.normalizedText = 'Air strikes require brigade-level authority under different wording, clarified.';

  const legalResultA = compileClauseToRule({
    clause: legalClauseA,
    sourceRegistry,
  });
  const legalResultB = compileClauseToRule({
    clause: legalClauseB,
    sourceRegistry,
  });
  const authorityResultA = compileClauseToRule({
    clause: authorityClauseA,
    sourceRegistry,
  });
  const authorityResultB = compileClauseToRule({
    clause: authorityClauseB,
    sourceRegistry,
  });

  assert.equal(legalResultA.valid, true, legalResultA.errors.join('\n'));
  assert.equal(legalResultB.valid, true, legalResultB.errors.join('\n'));
  assert.equal(authorityResultA.valid, true, authorityResultA.errors.join('\n'));
  assert.equal(authorityResultB.valid, true, authorityResultB.errors.join('\n'));

  assert.equal(getCanonicalTemplateBranch(legalResultA.compiledRule), 'LEGAL_FLOOR_PROHIBITION');
  assert.equal(getCanonicalTemplateBranch(legalResultB.compiledRule), 'LEGAL_FLOOR_PROHIBITION');
  assert.equal(getCanonicalTemplateBranch(authorityResultA.compiledRule), 'POLICY_OVERLAY_AUTHORITY_GATE');
  assert.equal(getCanonicalTemplateBranch(authorityResultB.compiledRule), 'POLICY_OVERLAY_AUTHORITY_GATE');

  assert.deepEqual(legalResultA.compiledRule, legalResultB.compiledRule);
  assert.deepEqual(authorityResultA.compiledRule, authorityResultB.compiledRule);
});

test('requirement compilation remains data-driven and does not inherit canonical markers', () => {
  const sourceRegistry = readModuleFixture('military-source-registry.json');
  const requirementClause = buildReviewedLegalRequirementClause();

  const result = compileClauseToRule({
    clause: requirementClause,
    sourceRegistry,
  });

  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.ok(result.compiledRule, 'Expected a compiled requirement rule.');
  assert.equal(result.compiledRule.stage, 'ADMISSIBILITY');
  assert.equal(getCanonicalTemplateBranch(result.compiledRule), null);
  assert.match(result.compiledRule.notes, /compiledFromClauseId=CLAUSE-LF-0004/);
});

test('missing provenance metadata is refused during compilation', () => {
  const sourceRegistry = readModuleFixture('military-source-registry.json');
  const clause = buildReviewedLegalClause();
  delete clause.provenance;

  const result = compileClauseToRule({
    clause,
    sourceRegistry,
  });

  assert.equal(result.valid, false);
  assert.equal(result.reasonCode, 'RULE_SHAPE_INVALID');
  assert.match(result.errors.join('\n'), /must include explicit provenance metadata/i);
});

test('direct provenance cannot contradict normalized clause text', () => {
  const sourceRegistry = readModuleFixture('military-source-registry.json');
  const clause = buildReviewedAuthorityClause();
  clause.provenance.derivationType = 'DIRECT';

  const result = compileClauseToRule({
    clause,
    sourceRegistry,
  });

  assert.equal(result.valid, false);
  assert.equal(result.reasonCode, 'RULE_SHAPE_INVALID');
  assert.match(result.errors.join('\n'), /direct provenance .* preserve source text exactly/i);
});

test('composed provenance requires parent linkage', () => {
  const sourceRegistry = readModuleFixture('military-source-registry.json');
  const clause = buildReviewedAuthorityClause();
  clause.provenance.derivationType = 'COMPOSED';
  clause.provenance.parentClauseIds = [];

  const result = compileClauseToRule({
    clause,
    sourceRegistry,
  });

  assert.equal(result.valid, false);
  assert.equal(result.reasonCode, 'RULE_SHAPE_INVALID');
  assert.match(result.errors.join('\n'), /composed clause .* requires parentClauseIds/i);
});

test('ambiguous clause compilation is refused', () => {
  const sourceRegistry = readModuleFixture('military-source-registry.json');
  const clause = buildReviewedLegalClause();
  clause.ambiguityStatus = 'OPEN';
  clause.reviewStatus = 'REVIEWED';
  clause.machineCandidate = false;

  const result = compileClauseToRule({
    clause,
    sourceRegistry,
  });

  assert.equal(result.valid, false);
  assert.equal(result.reasonCode, 'RULE_SHAPE_INVALID');
  assert.match(result.errors.join('\n'), /CLEAR ambiguity status|machineCandidate|COMPILATION_READY/);
});

test('example-only source without override compilation is refused', () => {
  const sourceRegistry = readModuleFixture('military-source-registry.json');
  const clause = buildReviewedAuthorityClause();
  clause.clauseId = 'CLAUSE-EXAMPLE-0001';
  clause.sourceId = 'UNODC-GMCP-ROE';
  clause.locator = 'vbss-and-gangway-access-control';
  clause.jurisdiction = 'INTL';

  const result = compileClauseToRule({
    clause,
    sourceRegistry,
  });

  assert.equal(result.valid, false);
  assert.equal(result.reasonCode, 'RULE_SHAPE_INVALID');
  assert.match(result.errors.join('\n'), /example-only|jurisdiction|normative override/i);
});

test('explicit delegation requires delegation edges during compilation', () => {
  const sourceRegistry = readModuleFixture('military-source-registry.json');
  const clause = cloneJson(readReviewedClause('uk-delegation-chain-core.json')[0]);
  clause.compilationHint.authority.delegationEdgeIds = [];

  const result = compileClauseToRule({
    clause,
    sourceRegistry,
  });

  assert.equal(result.valid, false);
  assert.equal(result.reasonCode, 'AUTHORITY_UNRESOLVED');
  assert.match(result.errors.join('\n'), /explicit delegation/i);
});

test('stale source locator bindings are refused during compilation', () => {
  const sourceRegistry = readModuleFixture('military-source-registry.json');
  const clause = buildReviewedLegalClause();
  const mutatedSourceRegistry = cloneJson(sourceRegistry);
  const sourceEntry = mutatedSourceRegistry.find((candidate) => candidate.sourceId === 'DOD-LOW-2023');
  assert.ok(sourceEntry, 'Missing DOD-LOW-2023 source entry');
  sourceEntry.locator = 'chapter-6';

  const result = compileClauseToRule({
    clause,
    sourceRegistry: mutatedSourceRegistry,
  });

  assert.equal(result.valid, false);
  assert.equal(result.reasonCode, 'POLICY_BUNDLE_INVALID');
  assert.match(result.errors.join('\n'), /locator .* not bound to source locator anchor/i);
});

test('conflicting compiled rules are refused at bundle assembly', () => {
  const sourceRegistry = readModuleFixture('military-source-registry.json');
  const authorityGraph = readJson('authority-graph.json');
  const legalClause = buildReviewedLegalClause();

  const legalResult = compileClauseToRule({
    clause: legalClause,
    sourceRegistry,
  });
  assert.equal(legalResult.valid, true, legalResult.errors.join('\n'));

  const conflictingRule = cloneJson(legalResult.compiledRule);
  conflictingRule.ruleId = 'CR-CLAUSE-LEGAL-FLOOR-0001-CONFLICT';
  conflictingRule.effect = {
    decision: 'REFUSED',
    reasonCode: 'NOT_A_MILITARY_OBJECTIVE',
  };

  const assembly = assembleBundle({
    bundleDraft: buildBundleDraft(),
    compiledRules: [
      legalResult.compiledRule,
      conflictingRule,
    ],
    authorityGraph,
    sourceRegistry: buildRegistrySubset(sourceRegistry, ['DOD-LOW-2023', 'NEWPORT-ROE-2022']),
    factSchema: readSchema('military-constraint-fact.schema.json'),
  });

  assert.equal(assembly.valid, false);
  assert.equal(assembly.reasonCode, 'RULE_CONFLICT');
  assert.match(assembly.errors.join('\n'), /same-stage conflict|duplicate semantic rule/);
});

test('admitted compiled bundle can be executed by the runtime evaluator', () => {
  const sourceRegistry = readModuleFixture('military-source-registry.json');
  const authorityGraph = readJson('authority-graph.json');
  const legalClause = buildReviewedLegalClause();
  const authorityClause = buildReviewedAuthorityClause();
  const factSchema = readSchema('military-constraint-fact.schema.json');

  const legalResult = compileClauseToRule({
    clause: legalClause,
    sourceRegistry,
  });
  const authorityResult = compileClauseToRule({
    clause: authorityClause,
    sourceRegistry,
  });

  const assembly = assembleBundle({
    bundleDraft: buildBundleDraft(),
    compiledRules: [
      legalResult.compiledRule,
      authorityResult.compiledRule,
    ],
    authorityGraph,
    sourceRegistry: buildRegistrySubset(sourceRegistry, ['DOD-LOW-2023', 'NEWPORT-ROE-2022']),
    factSchema,
  });

  assert.equal(assembly.valid, true, assembly.errors.join('\n'));

  const facts = readJson('valid-fact-packet.json');
  facts.target.protectedClass = 'MILITARY';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_TRUE';
  facts.actor.authorityLevelId = 'BRIGADE';
  alignFacts(assembly.bundle, facts);

  const decision = evaluateBundle({
    bundle: assembly.bundle,
    facts,
    factSchema,
  });

  assert.equal(decision.decision, 'ALLOWED');
  assert.equal(decision.reasonCode, null);
  assert.equal(decision.failedStage, null);
  assertRuntimeDecisionValid(decision);
});
