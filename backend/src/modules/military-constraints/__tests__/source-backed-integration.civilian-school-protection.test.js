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

function flattenPack4Corpus() {
  return [
    ...readReviewedClause('legal-floor-civilian-school-core.json'),
    ...readReviewedClause('authority-civilian-school-core.json'),
    ...readReviewedClause('policy-overlay-civilian-school-core.json'),
  ];
}

function buildFactPacket(bundle, overrides) {
  return {
    bundleId: bundle.bundleId,
    bundleVersion: bundle.bundleVersion,
    bundleHash: bundle.bundleHash,
    actor: {
      id: 'SCHOOL-TEAM-01',
      role: 'PROTECTION_LEAD',
      authorityLevelId: 'BATTALION',
    },
    action: {
      kind: 'ENGAGE',
      forceLevel: 'NON_LETHAL',
      method: 'ACCESS_CONTROL',
      domain: 'LAND',
    },
    target: {
      id: 'SCHOOL-01',
      objectType: 'SCHOOL',
      protectedClass: 'CIVILIAN_OBJECT',
      militaryObjectiveStatus: 'CONFIRMED_FALSE',
      horsDeCombatStatus: false,
    },
    context: {
      zone: 'CIVILIAN-SCHOOL-ZONE',
      missionType: 'ARMED_CONFLICT',
      operationPhase: 'PROTECTION',
      operationalSlice: 'CIVILIAN_SCHOOL_PROTECTION',
      coalitionMode: 'NATIONAL',
      timeWindowStart: '2026-04-13T18:00:00.000Z',
      timeWindowEnd: '2026-04-13T19:00:00.000Z',
    },
    threat: {
      hostileAct: false,
      hostileIntent: false,
      imminence: 'NONE',
      necessity: 'UNRESOLVED',
    },
    civilianRisk: {
      civilianPresence: true,
      civilianObjectPresence: true,
      estimatedIncidentalHarm: 'HIGH',
      feasiblePrecautionsTaken: false,
      expectedMilitaryAdvantage: 'LOW',
      estimatedIncidentalHarmScore: 80,
      expectedMilitaryAdvantageScore: 20,
    },
    authority: {
      reservedToHigherCommand: false,
      nationalCaveat: false,
      delegatedToUnit: true,
      designatedRoeActive: true,
      designatedActionAuthorized: false,
    },
    ...overrides,
  };
}

test('Pack 4 reviewed clauses compile into a reference bundle and evaluate deterministically', () => {
  const ajv = buildAjv();
  const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
  const clauses = flattenPack4Corpus();
  const manifestPath = path.join(MODULE_DIR, 'reference-pack-manifest.civilian-school-protection.json');

  assert.equal(readReviewedClause('legal-floor-civilian-school-core.json').length, 4);
  assert.equal(readReviewedClause('authority-civilian-school-core.json').length, 2);
  assert.equal(readReviewedClause('policy-overlay-civilian-school-core.json').length, 2);
  assert.equal(clauses.length, 8);

  clauses.forEach((clause) => {
    assertValid(ajv, 'https://chatpdm.local/schemas/source-clause.schema.json', clause);
  });

  const corpusValidation = validateReviewedClauseCorpus({
    clauses,
    sourceRegistry,
  });
  assert.equal(corpusValidation.valid, true, corpusValidation.errors.join('\n'));

  const bundleResult = buildReferenceBundle({
    rootDir: MODULE_DIR,
    manifestPath,
  });

  assert.equal(bundleResult.valid, true, bundleResult.errors.join('\n'));
  assert.ok(bundleResult.bundle, 'Expected Pack 4 bundle.');
  assert.equal(bundleResult.metadata.packId, 'mil-us-civilian-school-protection-core-v0.1.0');
  assert.equal(bundleResult.metadata.bundleId, 'mil-us-civilian-school-protection-core-bundle');
  assert.equal(bundleResult.metadata.reviewedClauseSetIds.length, 3);
  assert.equal(bundleResult.metadata.compiledClauseIds.length, 7);

  const bundle = bundleResult.bundle;
  assertValid(ajv, 'https://chatpdm.local/schemas/military-constraint-bundle.schema.json', bundle);
  assert.equal(bundle.bundleHash, computeBundleHash(bundle));

  const refusalFacts = buildFactPacket(bundle, {
    target: {
      id: 'SCHOOL-01',
      objectType: 'SCHOOL',
      protectedClass: 'CIVILIAN_OBJECT',
      militaryObjectiveStatus: 'CONFIRMED_FALSE',
      horsDeCombatStatus: false,
    },
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
  assert.equal(refusalDecision.reasonCode, 'PROHIBITED_TARGET');
  assert.equal(refusalDecision.failedStage, 'LEGAL_FLOOR');
  assert.ok(refusalDecision.failingRuleIds.includes('CR-CL-CIV-LF-001'));
  assertValid(ajv, 'https://chatpdm.local/schemas/runtime-decision.schema.json', refusalDecision);

  const allowedFacts = buildFactPacket(bundle, {
    target: {
      id: 'SCHOOL-01',
      objectType: 'SCHOOL',
      protectedClass: 'CIVILIAN_OBJECT',
      militaryObjectiveStatus: 'CONFIRMED_TRUE',
      horsDeCombatStatus: false,
    },
    authority: {
      reservedToHigherCommand: false,
      nationalCaveat: false,
      delegatedToUnit: true,
      designatedRoeActive: true,
      designatedActionAuthorized: true,
    },
  });

  const allowedDecision = evaluateBundle({
    bundle,
    facts: allowedFacts,
    factSchema: readModuleJson('military-constraint-fact.schema.json'),
  });

  assert.equal(allowedDecision.decision, 'ALLOWED');
  assert.equal(allowedDecision.reasonCode, null);
  assert.equal(allowedDecision.failedStage, null);
  assert.equal(allowedDecision.failingRuleIds.length, 0);
  assertValid(ajv, 'https://chatpdm.local/schemas/runtime-decision.schema.json', allowedDecision);
});
