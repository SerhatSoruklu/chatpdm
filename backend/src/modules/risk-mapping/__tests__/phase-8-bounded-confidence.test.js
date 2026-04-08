'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { buildRiskMapPipeline } = require('../resolve/buildRiskMapPipeline');
const { resolveRiskMapQuery } = require('../resolve/resolveRiskMapQuery');
const { inspectRiskMapExplanation } = require('../inspect/inspectRiskMapExplanation');
const { inspectRiskMapAuditReport } = require('../inspect/inspectRiskMapAuditReport');
const { buildConfidenceExplanation } = require('../confidence/buildConfidenceExplanation');
const { classifyBoundedConfidence } = require('../confidence/classifyBoundedConfidence');
const { validateRiskMapResponse } = require('../resolve/validateRiskMapResponse');
const { LOW_BOUNDED_SUPPORT, MEDIUM_BOUNDED_SUPPORT, HIGH_BOUNDED_SUPPORT } = require('../constants/rmgConfidenceClasses');
const { buildSupportedRiskPaths } = require('../paths/buildSupportedRiskPaths');
const { buildUnsupportedBridgeLedger } = require('../ledgers/buildUnsupportedBridgeLedger');
const { buildAssumptionsLedger } = require('../ledgers/buildAssumptionsLedger');
const { buildUnknownsLedger } = require('../ledgers/buildUnknownsLedger');
const { buildFalsifierLedger } = require('../ledgers/buildFalsifierLedger');

const DOMAIN_ID = 'organization_risk';
const ENTITY = 'apple';
const EVIDENCE_SET_VERSION = 'v1';

function loadSnapshot(snapshotName) {
  const snapshotPath = path.join(__dirname, 'fixtures', `${snapshotName}.snapshot.json`);
  return JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
}

function buildSeededPipeline() {
  return buildRiskMapPipeline({
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });
}

test('admitted query with strong direct support yields deterministic bounded confidence class', () => {
  const pipeline = buildSeededPipeline();
  const highConfidence = classifyBoundedConfidence({
    admissibilityDecision: pipeline.admissibilityDecision,
    evidenceCoverageReport: pipeline.evidenceCoverageReport,
    supportedPaths: pipeline.supportedPaths,
    unsupportedBridgeLedger: [],
    assumptionsLedger: pipeline.assumptionsLedger,
    unknownsLedger: [],
    falsifierLedger: pipeline.falsifierLedger,
  });

  assert.equal(highConfidence.boundedConfidenceClass, HIGH_BOUNDED_SUPPORT);
  assert.deepEqual(highConfidence.reasons, [
    'admitted_full_direct_support',
    'falsifier_pressure_visible',
    'supported_paths_present',
  ]);
});

test('narrowed broad-collapse queries do not yield HIGH_BOUNDED_SUPPORT', () => {
  const explanation = inspectRiskMapExplanation({
    entity: ENTITY,
    timeHorizon: '5 years collapse',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });

  assert.equal(explanation.explanation.confidence.boundedConfidenceClass, MEDIUM_BOUNDED_SUPPORT);
  assert.equal(explanation.explanation.admission.status, 'narrowed');
  assert.ok(explanation.explanation.confidence.reasonIds.includes('narrowed_due_to_broad_collapse'));
  assert.notEqual(explanation.explanation.confidence.boundedConfidenceClass, HIGH_BOUNDED_SUPPORT);
});

test('refused query yields LOW_BOUNDED_SUPPORT', () => {
  const output = resolveRiskMapQuery({
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['unknown_scope'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });

  assert.equal(output.status, 'refused');
  assert.equal(output.boundedConfidenceClass, LOW_BOUNDED_SUPPORT);
});

test('unsupported bridges cap confidence appropriately', () => {
  const pipeline = buildSeededPipeline();
  const output = resolveRiskMapQuery({
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });

  assert.equal(output.boundedConfidenceClass, MEDIUM_BOUNDED_SUPPORT);
  assert.ok(pipeline.output.unsupportedBridges.includes('missing_compatibility_rule:platform_control_weakening->app_store_regulatory_exposure'));
});

test('current structural unknowns cap confidence appropriately', () => {
  const auditReport = inspectRiskMapAuditReport({
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });

  assert.equal(auditReport.confidence.boundedConfidenceClass, MEDIUM_BOUNDED_SUPPORT);
  assert.ok(auditReport.confidence.reasonIds.includes('unknowns_cap_confidence'));
});

test('falsifier presence remains visible but does not automatically force LOW', () => {
  const pipeline = buildSeededPipeline();
  const highConfidence = classifyBoundedConfidence({
    admissibilityDecision: pipeline.admissibilityDecision,
    evidenceCoverageReport: pipeline.evidenceCoverageReport,
    supportedPaths: pipeline.supportedPaths,
    unsupportedBridgeLedger: [],
    assumptionsLedger: pipeline.assumptionsLedger,
    unknownsLedger: [],
    falsifierLedger: pipeline.falsifierLedger,
  });

  assert.equal(highConfidence.boundedConfidenceClass, HIGH_BOUNDED_SUPPORT);
  assert.ok(highConfidence.reasons.includes('falsifier_pressure_visible'));
});

test('confidence explanation is deterministic', () => {
  const pipeline = buildSeededPipeline();
  const assessment = pipeline.confidenceAssessment;
  const first = buildConfidenceExplanation(assessment);
  const second = buildConfidenceExplanation(assessment);

  assert.deepEqual(first, second);
});

test('confidence explanation contains no probabilistic language', () => {
  const explanation = buildConfidenceExplanation(buildSeededPipeline().confidenceAssessment);

  assert.match(explanation.explanation, /^Bounded support confidence exists, but current structural limits keep the class capped\.$/);
  assert.equal(/probab|likely|chance|odds/i.test(explanation.explanation), false);
});

test('audit report includes bounded confidence block consistently', () => {
  const auditReport = inspectRiskMapAuditReport({
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });

  assert.deepEqual(Object.keys(auditReport.confidence), ['boundedConfidenceClass', 'reasonIds', 'explanation']);
  assert.equal(auditReport.confidence.boundedConfidenceClass, MEDIUM_BOUNDED_SUPPORT);
  assert.deepEqual(auditReport.confidence, auditReport.explanation.confidence);
});

test('explanation surface includes bounded confidence block consistently', () => {
  const explanation = inspectRiskMapExplanation({
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });

  assert.deepEqual(Object.keys(explanation.explanation.confidence), ['boundedConfidenceClass', 'reasonIds', 'explanation']);
  assert.equal(explanation.explanation.confidence.boundedConfidenceClass, MEDIUM_BOUNDED_SUPPORT);
});

test('final resolve output now includes non-null boundedConfidenceClass', () => {
  const output = resolveRiskMapQuery({
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });

  assert.equal(output.boundedConfidenceClass, MEDIUM_BOUNDED_SUPPORT);
  assert.notEqual(output.boundedConfidenceClass, null);
});

test('same input plus same artifacts yields the same boundedConfidenceClass', () => {
  const first = resolveRiskMapQuery({
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });
  const second = resolveRiskMapQuery({
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });

  assert.equal(first.boundedConfidenceClass, second.boundedConfidenceClass);
});

test('output contract still validates', () => {
  const output = resolveRiskMapQuery({
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });

  const validation = validateRiskMapResponse(output);

  assert.deepEqual(validation, {
    valid: true,
    errors: [],
    reasonCode: null,
  });
});

test('compact resolve output shape remains otherwise unchanged', () => {
  const output = resolveRiskMapQuery({
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });

  assert.deepEqual(Object.keys(output), [
    'status',
    'reasonCode',
    'reason',
    'domain',
    'scenarioType',
    'entity',
    'supportedNodes',
    'supportedThreatVectors',
    'supportedCausalPaths',
    'unsupportedBridges',
    'assumptions',
    'unknowns',
    'falsifiers',
    'boundedConfidenceClass',
    'diagnostics',
  ]);
  assert.equal(Object.prototype.hasOwnProperty.call(output, 'confidence'), false);
  assert.deepEqual(output.supportedCausalPaths, [
    'regulatory_pressure->app_store_regulatory_exposure',
    'supply_chain_disruption->china_supply_chain_exposure',
  ]);
});
