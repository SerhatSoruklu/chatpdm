'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { loadDomainManifest } = require('../registries/loadDomainManifest');
const { loadNodeRegistry } = require('../registries/loadNodeRegistry');
const { loadThreatRegistry } = require('../registries/loadThreatRegistry');
const { loadCausalCompatibilityRegistry } = require('../registries/loadCausalCompatibilityRegistry');
const { loadFalsifierRegistry } = require('../registries/loadFalsifierRegistry');
const { buildRegistryIndex } = require('../registries/buildRegistryIndex');
const { loadEvidencePack } = require('../evidence/loadEvidencePack');
const { buildEvidenceCoverageReport } = require('../evidence/buildEvidenceCoverageReport');
const { normalizeRiskMapQuery } = require('../normalizers/normalizeRiskMapQuery');
const { classifyRiskMapQueryShape } = require('../classification/classifyRiskMapQueryShape');
const { assessRiskMapAdmissibility } = require('../admission/assessRiskMapAdmissibility');
const { validatePathCompatibility } = require('../paths/validatePathCompatibility');
const { buildSupportedRiskPaths } = require('../paths/buildSupportedRiskPaths');
const { buildUnsupportedBridgeLedger } = require('../ledgers/buildUnsupportedBridgeLedger');
const { buildAssumptionsLedger } = require('../ledgers/buildAssumptionsLedger');
const { buildUnknownsLedger } = require('../ledgers/buildUnknownsLedger');
const { buildFalsifierLedger } = require('../ledgers/buildFalsifierLedger');
const { resolveRiskMapQuery } = require('../resolve/resolveRiskMapQuery');

const DOMAIN_ID = 'organization_risk';
const ENTITY = 'apple';
const EVIDENCE_SET_VERSION = 'v1';

function buildRegistryBundle() {
  const domainManifest = loadDomainManifest(DOMAIN_ID);
  const nodeRegistry = loadNodeRegistry(DOMAIN_ID);
  const threatRegistry = loadThreatRegistry(DOMAIN_ID);
  const causalCompatibilityRegistry = loadCausalCompatibilityRegistry(DOMAIN_ID);
  const falsifierRegistry = loadFalsifierRegistry(DOMAIN_ID);

  return buildRegistryIndex({
    domainManifest,
    nodeRegistry,
    threatRegistry,
    causalCompatibilityRegistry,
    falsifierRegistry,
  });
}

function buildEvidenceBundle() {
  const registryIndex = buildRegistryBundle();
  const evidencePack = loadEvidencePack({
    domainId: DOMAIN_ID,
    entity: ENTITY,
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });
  const normalizedQuery = normalizeRiskMapQuery({
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });
  const classification = classifyRiskMapQueryShape(normalizedQuery);
  const evidenceCoverageReport = buildEvidenceCoverageReport({
    normalizedQuery,
    registryIndex,
    evidencePack,
  });
  const admissibilityDecision = assessRiskMapAdmissibility({
    normalizedQuery,
    classification,
    domainManifest: loadDomainManifest(DOMAIN_ID),
    registryIndex,
    evidenceCoverageReport,
  });

  return {
    registryIndex,
    evidencePack,
    normalizedQuery,
    classification,
    evidenceCoverageReport,
    admissibilityDecision,
  };
}

test('validatePathCompatibility accepts valid direct threat -> node relationships', () => {
  const bundle = buildEvidenceBundle();
  const result = validatePathCompatibility({
    threatId: 'regulatory_pressure',
    targetNodeId: 'app_store_regulatory_exposure',
    admittedScopes: ['regulatory', 'supply_chain'],
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport: bundle.evidenceCoverageReport,
  });

  assert.deepEqual(result, {
    compatible: true,
    reasonCode: null,
    reason: null,
    compatibilityRuleId: 'regulatory_pressure__app_store_regulatory_exposure',
  });
});

test('validatePathCompatibility rejects missing compatibility rules', () => {
  const bundle = buildEvidenceBundle();
  const registryIndex = buildRegistryBundle();
  const result = validatePathCompatibility({
    threatId: 'platform_control_weakening',
    targetNodeId: 'app_store_regulatory_exposure',
    admittedScopes: ['regulatory'],
    registryIndex,
    evidenceCoverageReport: bundle.evidenceCoverageReport,
  });

  assert.equal(result.compatible, false);
  assert.equal(result.reasonCode, 'MISSING_COMPATIBILITY_RULE');
});

test('buildSupportedRiskPaths returns only supported direct paths for admitted scopes', () => {
  const bundle = buildEvidenceBundle();
  const paths = buildSupportedRiskPaths({
    normalizedQuery: bundle.normalizedQuery,
    admissibilityDecision: bundle.admissibilityDecision,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport: bundle.evidenceCoverageReport,
  });

  assert.deepEqual(paths.map((path) => path.id), [
    'regulatory_pressure->app_store_regulatory_exposure',
    'supply_chain_disruption->china_supply_chain_exposure',
  ]);
  assert.equal(Object.isFrozen(paths), true);
  assert.equal(Object.isFrozen(paths[0]), true);
});

test('buildSupportedRiskPaths excludes non-admitted scopes', () => {
  const bundle = buildEvidenceBundle();
  const paths = buildSupportedRiskPaths({
    normalizedQuery: bundle.normalizedQuery,
    admissibilityDecision: {
      ...bundle.admissibilityDecision,
      admittedScopes: ['regulatory'],
    },
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport: bundle.evidenceCoverageReport,
  });

  assert.deepEqual(paths.map((path) => path.id), [
    'regulatory_pressure->app_store_regulatory_exposure',
  ]);
});

test('buildUnsupportedBridgeLedger records missing compatibility cases', () => {
  const bundle = buildEvidenceBundle();
  const platformDependencyQuery = normalizeRiskMapQuery({
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['platform_dependency'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });
  const platformDependencyClassification = classifyRiskMapQueryShape(platformDependencyQuery);
  const platformDependencyCoverage = buildEvidenceCoverageReport({
    normalizedQuery: platformDependencyQuery,
    registryIndex: bundle.registryIndex,
    evidencePack: bundle.evidencePack,
  });
  const platformDependencyDecision = assessRiskMapAdmissibility({
    normalizedQuery: platformDependencyQuery,
    classification: platformDependencyClassification,
    domainManifest: loadDomainManifest(DOMAIN_ID),
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport: platformDependencyCoverage,
  });
  const ledger = buildUnsupportedBridgeLedger({
    normalizedQuery: platformDependencyQuery,
    classification: platformDependencyClassification,
    admissibilityDecision: platformDependencyDecision,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport: platformDependencyCoverage,
  });

  assert.ok(
    ledger.some(
      (entry) =>
        entry.id === 'missing_compatibility_rule:regulatory_pressure->platform_dependency_exposure' &&
        entry.reasonCode === 'MISSING_COMPATIBILITY_RULE',
    ),
  );
});

test('buildUnsupportedBridgeLedger records missing evidence support cases', () => {
  const bundle = buildEvidenceBundle();
  const missingThreatCoverage = {
    ...bundle.evidenceCoverageReport,
    supportedThreatIds: bundle.evidenceCoverageReport.supportedThreatIds.filter(
      (threatId) => threatId !== 'supply_chain_disruption',
    ),
  };
  const ledger = buildUnsupportedBridgeLedger({
    normalizedQuery: bundle.normalizedQuery,
    classification: bundle.classification,
    admissibilityDecision: bundle.admissibilityDecision,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport: missingThreatCoverage,
  });

  assert.ok(
    ledger.some(
      (entry) =>
        entry.id === 'unsupported_threat_evidence:supply_chain_disruption->china_supply_chain_exposure' &&
        entry.reasonCode === 'UNSUPPORTED_THREAT_EVIDENCE',
    ),
  );
});

test('broad collapse framing produces a broad_collapse_overreach bridge entry', () => {
  const bundle = buildEvidenceBundle();
  const narrowedQuery = normalizeRiskMapQuery({
    entity: ENTITY,
    timeHorizon: 'collapse horizon',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });
  const narrowedClassification = classifyRiskMapQueryShape(narrowedQuery);
  const narrowedCoverage = buildEvidenceCoverageReport({
    normalizedQuery: narrowedQuery,
    registryIndex: bundle.registryIndex,
    evidencePack: bundle.evidencePack,
  });
  const narrowedDecision = assessRiskMapAdmissibility({
    normalizedQuery: narrowedQuery,
    classification: narrowedClassification,
    domainManifest: loadDomainManifest(DOMAIN_ID),
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport: narrowedCoverage,
  });
  const ledger = buildUnsupportedBridgeLedger({
    normalizedQuery: narrowedQuery,
    classification: narrowedClassification,
    admissibilityDecision: narrowedDecision,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport: narrowedCoverage,
  });

  assert.ok(
    ledger.some((entry) => entry.id === 'broad_collapse_overreach:apple_downfall'),
  );
});

test('buildFalsifierLedger attaches authored falsifiers to supported paths', () => {
  const bundle = buildEvidenceBundle();
  const supportedPaths = buildSupportedRiskPaths({
    normalizedQuery: bundle.normalizedQuery,
    admissibilityDecision: bundle.admissibilityDecision,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport: bundle.evidenceCoverageReport,
  });
  const ledger = buildFalsifierLedger({
    supportedPaths,
    registryIndex: bundle.registryIndex,
  });

  assert.deepEqual(ledger.map((entry) => entry.id), [
    'regulatory_risk_resolution@app_store_regulatory_exposure',
    'successful_geographic_supply_diversification@china_supply_chain_exposure',
  ]);
});

test('buildAssumptionsLedger returns only bounded phase-appropriate assumptions', () => {
  const bundle = buildEvidenceBundle();
  const supportedPaths = buildSupportedRiskPaths({
    normalizedQuery: bundle.normalizedQuery,
    admissibilityDecision: bundle.admissibilityDecision,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport: bundle.evidenceCoverageReport,
  });
  const ledger = buildAssumptionsLedger({ supportedPaths });

  assert.deepEqual(ledger.map((entry) => entry.id), [
    'local_structural_support_only',
    'scope_isolated_without_cross_scope_propagation',
  ]);
  assert.equal(Object.isFrozen(ledger), true);
});

test('buildUnknownsLedger returns only current structural unknowns', () => {
  const bundle = buildEvidenceBundle();
  const supportedPaths = buildSupportedRiskPaths({
    normalizedQuery: bundle.normalizedQuery,
    admissibilityDecision: bundle.admissibilityDecision,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport: bundle.evidenceCoverageReport,
  });
  const ledger = buildUnknownsLedger({ supportedPaths });

  assert.deepEqual(ledger.map((entry) => entry.id), [
    'no_multi_hop_chain_support',
    'no_timeline_progression_support',
    'no_cross_scope_propagation_support',
  ]);
});

test('same inputs produce the same path and ledger outputs', () => {
  const bundle = buildEvidenceBundle();
  const firstPaths = buildSupportedRiskPaths({
    normalizedQuery: bundle.normalizedQuery,
    admissibilityDecision: bundle.admissibilityDecision,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport: bundle.evidenceCoverageReport,
  });
  const secondPaths = buildSupportedRiskPaths({
    normalizedQuery: bundle.normalizedQuery,
    admissibilityDecision: bundle.admissibilityDecision,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport: bundle.evidenceCoverageReport,
  });
  const firstLedger = buildUnsupportedBridgeLedger({
    normalizedQuery: bundle.normalizedQuery,
    classification: bundle.classification,
    admissibilityDecision: bundle.admissibilityDecision,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport: bundle.evidenceCoverageReport,
  });
  const secondLedger = buildUnsupportedBridgeLedger({
    normalizedQuery: bundle.normalizedQuery,
    classification: bundle.classification,
    admissibilityDecision: bundle.admissibilityDecision,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport: bundle.evidenceCoverageReport,
  });

  assert.deepEqual(firstPaths, secondPaths);
  assert.deepEqual(firstLedger, secondLedger);
});

test('outputs are frozen or treated immutably where practical', () => {
  const bundle = buildEvidenceBundle();
  const supportedPaths = buildSupportedRiskPaths({
    normalizedQuery: bundle.normalizedQuery,
    admissibilityDecision: bundle.admissibilityDecision,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport: bundle.evidenceCoverageReport,
  });
  const bridgeLedger = buildUnsupportedBridgeLedger({
    normalizedQuery: bundle.normalizedQuery,
    classification: bundle.classification,
    admissibilityDecision: bundle.admissibilityDecision,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport: bundle.evidenceCoverageReport,
  });

  assert.equal(Object.isFrozen(supportedPaths), true);
  assert.equal(Object.isFrozen(bridgeLedger), true);
  assert.equal(Object.isFrozen(supportedPaths[0].support), true);
});

test('resolveRiskMapQuery returns ledgers consistently for admitted and narrowed queries', () => {
  const admitted = resolveRiskMapQuery({
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });

  const narrowed = resolveRiskMapQuery({
    entity: ENTITY,
    timeHorizon: 'collapse horizon',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });

  assert.deepEqual(admitted.supportedCausalPaths, [
    'regulatory_pressure->app_store_regulatory_exposure',
    'supply_chain_disruption->china_supply_chain_exposure',
  ]);
  assert.deepEqual(admitted.unsupportedBridges, [
    'missing_compatibility_rule:platform_control_weakening->app_store_regulatory_exposure',
  ]);
  assert.equal(narrowed.status, 'narrowed');
  assert.equal(narrowed.reasonCode, 'BROAD_COLLAPSE_FRAMING');
  assert.deepEqual(narrowed.supportedCausalPaths, admitted.supportedCausalPaths);
  assert.deepEqual(narrowed.unsupportedBridges, [
    'broad_collapse_overreach:apple',
    'missing_compatibility_rule:platform_control_weakening->app_store_regulatory_exposure',
  ]);
});

test('refused queries still return empty path and ledger arrays', () => {
  const result = resolveRiskMapQuery({
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['unknown_scope'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });

  assert.equal(result.status, 'refused');
  assert.deepEqual(result.supportedCausalPaths, []);
  assert.deepEqual(result.unsupportedBridges, []);
  assert.deepEqual(result.assumptions, []);
  assert.deepEqual(result.unknowns, []);
  assert.deepEqual(result.falsifiers, []);
});
