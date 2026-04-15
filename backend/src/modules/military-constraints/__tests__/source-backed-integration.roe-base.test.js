'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Ajv2020 = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats');

const { buildReferenceBundle } = require('../build-reference-pack');
const { evaluateBundle } = require('../evaluate-bundle');
const { validateReviewedClauseCorpus } = require('../validate-reviewed-clause-corpus');
const { computeBundleHash } = require('../military-constraint-validator');

const BASE_DIR = path.resolve(__dirname);
const MODULE_DIR = path.resolve(BASE_DIR, '..');

function readModuleJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(MODULE_DIR, relativePath), 'utf8'));
}

function readReviewedClause(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(MODULE_DIR, 'reviewed-clauses', relativePath), 'utf8'));
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

function flattenCorpus() {
  return [
    ...readReviewedClause('roe-base-core.json'),
  ];
}

function buildFactPacket(bundle, overrides) {
  return {
    bundleId: bundle.bundleId,
    bundleVersion: bundle.bundleVersion,
    bundleHash: bundle.bundleHash,
    actor: {
      id: 'ROE-TEAM-01',
      role: 'BRIGADE_COMMANDER',
      authorityLevelId: 'BRIGADE',
    },
    action: {
      kind: 'STRIKE',
      forceLevel: 'DEADLY',
      method: 'AIRSTRIKE',
      domain: 'AIR',
    },
    target: {
      id: 'ROE-TARGET-01',
      horsDeCombatStatus: false,
    },
    context: {
      zone: 'GENERAL-OPS-ZONE',
      missionType: 'ARMED_CONFLICT',
      operationPhase: 'PLANNING',
      coalitionMode: 'NATIONAL',
      timeWindowStart: '2026-04-13T18:00:00.000Z',
      timeWindowEnd: '2026-04-13T19:00:00.000Z',
    },
    threat: {
      hostileAct: false,
      hostileIntent: false,
      imminence: 'NONE',
      necessity: 'LOW',
    },
    civilianRisk: {
      civilianPresence: false,
      civilianObjectPresence: false,
      estimatedIncidentalHarm: 'LOW',
      feasiblePrecautionsTaken: true,
      expectedMilitaryAdvantage: 'MEDIUM',
      estimatedIncidentalHarmScore: 10,
      expectedMilitaryAdvantageScore: 50,
    },
    authority: {
      reservedToHigherCommand: false,
      nationalCaveat: false,
      delegatedToUnit: true,
      designatedRoeActive: true,
      designatedActionAuthorized: true,
    },
    ...overrides,
  };
}

test('US_RULES_OF_ENGAGEMENT_BASE_V1 reviewed clauses compile into a reference bundle and evaluate deterministically', () => {
  const ajv = buildAjv();
  const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
  const corpus = flattenCorpus();
  const manifestPath = path.join(MODULE_DIR, 'reference-pack-manifest.roe-base.json');

  assert.equal(corpus.length, 1);
  corpus.forEach((clause) => {
    assertValid(ajv, 'https://chatpdm.local/schemas/source-clause.schema.json', clause);
  });

  const corpusValidation = validateReviewedClauseCorpus({
    clauses: corpus,
    sourceRegistry,
  });
  assert.equal(corpusValidation.valid, true, corpusValidation.errors.join('\n'));

  const bundleResult = buildReferenceBundle({
    rootDir: MODULE_DIR,
    manifestPath,
  });

  assert.equal(bundleResult.valid, true, bundleResult.errors.join('\n'));
  assert.ok(bundleResult.bundle, 'Expected ROE bundle.');
  assert.equal(bundleResult.metadata.packId, 'US_RULES_OF_ENGAGEMENT_BASE_V1');
  assert.equal(bundleResult.metadata.bundleId, 'us-roe-base-bundle');
  assert.equal(bundleResult.metadata.reviewedClauseSetIds.length, 1);
  assert.equal(bundleResult.metadata.compiledClauseIds.length, 1);

  const bundle = bundleResult.bundle;
  assertValid(ajv, 'https://chatpdm.local/schemas/military-constraint-bundle.schema.json', bundle);
  assert.equal(bundle.bundleHash, computeBundleHash(bundle));

  const allowedFacts = buildFactPacket(bundle, {});
  const allowedDecision = evaluateBundle({
    bundle,
    facts: allowedFacts,
    factSchema: readModuleJson('military-constraint-fact.schema.json'),
  });

  assert.equal(allowedDecision.decision, 'ALLOWED');
  assert.equal(allowedDecision.reasonCode, null);
  assert.equal(allowedDecision.failedStage, null);
  assertValid(ajv, 'https://chatpdm.local/schemas/runtime-decision.schema.json', allowedDecision);

  const refusalFacts = buildFactPacket(bundle, {
    authority: {
      reservedToHigherCommand: false,
      nationalCaveat: false,
      delegatedToUnit: true,
      designatedRoeActive: true,
      designatedActionAuthorized: false,
    },
  });

  const refusalDecision = evaluateBundle({
    bundle,
    facts: refusalFacts,
    factSchema: readModuleJson('military-constraint-fact.schema.json'),
  });

  assert.equal(refusalDecision.decision, 'REFUSED');
  assert.equal(refusalDecision.reasonCode, 'AUTHORITY_INVALID');
  assert.equal(refusalDecision.failedStage, 'ADMISSIBILITY');
  assert.ok(refusalDecision.failingRuleIds.includes('CR-CLAUSE-ROE-0001'));
  assertValid(ajv, 'https://chatpdm.local/schemas/runtime-decision.schema.json', refusalDecision);

  const incompleteFacts = buildFactPacket(bundle, {
    authority: {
      reservedToHigherCommand: false,
      nationalCaveat: false,
      delegatedToUnit: true,
      designatedRoeActive: true,
    },
  });

  const incompleteDecision = evaluateBundle({
    bundle,
    facts: incompleteFacts,
    factSchema: readModuleJson('military-constraint-fact.schema.json'),
  });

  assert.equal(incompleteDecision.decision, 'REFUSED_INCOMPLETE');
  assert.equal(incompleteDecision.reasonCode, 'MISSING_REQUIRED_FACT');
  assert.equal(incompleteDecision.failedStage, 'ADMISSIBILITY');
  assert.ok(incompleteDecision.failingRuleIds.includes('CR-CLAUSE-ROE-0001'));
  assertValid(ajv, 'https://chatpdm.local/schemas/runtime-decision.schema.json', incompleteDecision);
});
