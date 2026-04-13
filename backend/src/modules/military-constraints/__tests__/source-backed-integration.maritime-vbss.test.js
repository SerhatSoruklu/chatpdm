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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(MODULE_DIR, relativePath), 'utf8'));
}

function readReviewedClause(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(MODULE_DIR, 'reviewed-clauses', relativePath), 'utf8'));
}

function buildAjv() {
  const ajv = new Ajv2020({ allErrors: true, allowUnionTypes: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(readJson('military-source-registry.schema.json'));
  ajv.addSchema(readJson('source-clause.schema.json'));
  ajv.addSchema(readJson('military-constraint-predicate.schema.json'));
  ajv.addSchema(readJson('military-constraint-rule.schema.json'));
  ajv.addSchema(readJson('military-constraint-authority-graph.schema.json'));
  ajv.addSchema(readJson('military-constraint-bundle.schema.json'));
  ajv.addSchema(readJson('military-constraint-fact.schema.json'));
  ajv.addSchema(readJson('runtime-decision.schema.json'));
  return ajv;
}

function assertValid(ajv, schemaId, value) {
  const validate = ajv.getSchema(schemaId);
  assert.ok(validate, `Missing schema: ${schemaId}`);
  const valid = validate(value);
  assert.equal(valid, true, JSON.stringify(validate.errors, null, 2));
}

function flattenPack2Corpus() {
  return [
    ...readReviewedClause('legal-floor-maritime-vbss-core.json'),
    ...readReviewedClause('authority-maritime-vbss-core.json'),
  ];
}

function buildAllowedFacts(bundle) {
  return {
    bundleId: bundle.bundleId,
    bundleVersion: bundle.bundleVersion,
    bundleHash: bundle.bundleHash,
    actor: {
      id: 'VBSS-TEAM-01',
      role: 'BOARDING_TEAM_LEAD',
      authorityLevelId: 'PLATOON',
    },
    action: {
      kind: 'SEARCH_VESSEL',
      forceLevel: 'NON_LETHAL',
      method: 'BOARDING',
      domain: 'MARITIME',
    },
    target: {
      id: 'TARGET-VESSEL-01',
      protectedClass: 'MILITARY',
      militaryObjectiveStatus: 'CONFIRMED_TRUE',
      horsDeCombatStatus: false,
    },
    context: {
      zone: 'COASTAL_WATERS',
      missionType: 'VBSS',
      operationPhase: 'ACCESS_CONTROL',
      coalitionMode: 'NATIONAL',
      timeWindowStart: '2026-04-13T18:00:00Z',
      timeWindowEnd: '2026-04-13T19:00:00Z',
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
      estimatedIncidentalHarmScore: 0,
      expectedMilitaryAdvantageScore: 50,
    },
    authority: {
      reservedToHigherCommand: false,
      nationalCaveat: false,
      delegatedToUnit: true,
    },
  };
}

function buildAuthorityRefusalFacts(bundle) {
  return {
    bundleId: bundle.bundleId,
    bundleVersion: bundle.bundleVersion,
    bundleHash: bundle.bundleHash,
    actor: {
      id: 'STRIKE-CELL-01',
      role: 'AIRCREW',
      authorityLevelId: 'COMPANY',
    },
    action: {
      kind: 'STRIKE',
      forceLevel: 'LETHAL',
      method: 'AIR_DELIVERY',
      domain: 'AIR',
    },
    target: {
      id: 'TARGET-AIR-01',
      protectedClass: 'MILITARY',
      militaryObjectiveStatus: 'CONFIRMED_TRUE',
      horsDeCombatStatus: false,
    },
    context: {
      zone: 'OPEN_SEA',
      missionType: 'ARMED_CONFLICT',
      operationPhase: 'ENGAGEMENT',
      coalitionMode: 'NATIONAL',
      timeWindowStart: '2026-04-13T18:00:00Z',
      timeWindowEnd: '2026-04-13T19:00:00Z',
    },
    threat: {
      hostileAct: true,
      hostileIntent: true,
      imminence: 'IMMINENT',
      necessity: 'IMMEDIATE',
    },
    civilianRisk: {
      civilianPresence: false,
      civilianObjectPresence: false,
      estimatedIncidentalHarm: 'LOW',
      feasiblePrecautionsTaken: true,
      expectedMilitaryAdvantage: 'HIGH',
      estimatedIncidentalHarmScore: 0,
      expectedMilitaryAdvantageScore: 90,
    },
    authority: {
      reservedToHigherCommand: false,
      nationalCaveat: false,
      delegatedToUnit: false,
    },
  };
}

test('Pack 2 reviewed clauses compile into a reference bundle and evaluate deterministically', () => {
  const ajv = buildAjv();
  const sourceRegistry = readJson('fixtures/military-source-registry.json');
  const authorityGraph = readJson('__tests__/fixtures/authority-graph.json');
  const manifestPath = path.join(MODULE_DIR, 'reference-pack-manifest.maritime-vbss.json');
  const clauses = flattenPack2Corpus();

  assert.equal(readReviewedClause('policy-overlay-maritime-vbss-core.json').length, 0);

  assert.equal(clauses.length, 5);
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
  assert.ok(bundleResult.bundle, 'Expected Pack 2 bundle.');
  assert.equal(bundleResult.metadata.packId, 'mil-us-maritime-vbss-core-v0.1.0');
  assert.equal(bundleResult.metadata.bundleId, 'mil-us-maritime-vbss-core-bundle');
  assert.equal(bundleResult.metadata.reviewedClauseSetIds.length, 2);
  assert.equal(bundleResult.metadata.compiledClauseIds.length, 5);

  const bundle = bundleResult.bundle;
  assertValid(ajv, 'https://chatpdm.local/schemas/military-constraint-bundle.schema.json', bundle);
  assert.equal(bundle.bundleHash, computeBundleHash(bundle));
  assert.equal(bundle.authorityGraph.authorityGraphId, authorityGraph.authorityGraphId);

  const allowedFacts = buildAllowedFacts(bundle);
  const allowedDecision = evaluateBundle({
    bundle,
    facts: allowedFacts,
    factSchema: readJson('military-constraint-fact.schema.json'),
  });

  assert.equal(allowedDecision.decision, 'ALLOWED');
  assert.equal(allowedDecision.reasonCode, null);
  assert.equal(allowedDecision.failedStage, null);
  assert.equal(allowedDecision.failingRuleIds.length, 0);
  assertValid(ajv, 'https://chatpdm.local/schemas/runtime-decision.schema.json', allowedDecision);

  const refusalFacts = buildAuthorityRefusalFacts(bundle);
  const refusalDecision = evaluateBundle({
    bundle,
    facts: refusalFacts,
    factSchema: readJson('military-constraint-fact.schema.json'),
  });

  assert.equal(refusalDecision.decision, 'REFUSED');
  assert.equal(refusalDecision.reasonCode, 'AUTHORITY_INVALID');
  assert.equal(refusalDecision.failedStage, 'POLICY_OVERLAY');
  assert.ok(refusalDecision.failingRuleIds.includes('CR-CL-VBSS-AUTH-001'));
  assertValid(ajv, 'https://chatpdm.local/schemas/runtime-decision.schema.json', refusalDecision);
});
