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

const BASE_DIR = path.resolve(__dirname);
const MODULE_DIR = path.resolve(BASE_DIR, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'fixtures', relativePath), 'utf8'));
}

function readModuleFixture(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(MODULE_DIR, 'fixtures', relativePath), 'utf8'));
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
  };
}

function buildReviewedLegalClause() {
  const clause = cloneJson(readModuleFixture('source-clause.example.json'));
  clause.reviewStatus = 'COMPILATION_READY';
  return clause;
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
  assert.match(legalResult.compiledRule.notes, /compiledFromClauseId=CLAUSE-LEGAL-FLOOR-0001/);

  const authorityResult = compileClauseToRule({
    clause: authorityClause,
    sourceRegistry,
  });
  assert.equal(authorityResult.valid, true, authorityResult.errors.join('\n'));
  assert.ok(authorityResult.compiledRule, 'Expected authority compiled rule');
  assertRuleValid(authorityResult.compiledRule);
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
  assertValid(ajv, 'https://chatpdm.local/schemas/military-constraint-bundle.schema.json', assembly.bundle);
  assert.equal(assembly.bundle.bundleHash, computeBundleHash(assembly.bundle));
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
