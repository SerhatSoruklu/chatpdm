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
const { buildSupportedRiskPaths } = require('../paths/buildSupportedRiskPaths');
const { buildUnsupportedBridgeLedger } = require('../ledgers/buildUnsupportedBridgeLedger');
const { buildAssumptionsLedger } = require('../ledgers/buildAssumptionsLedger');
const { buildUnknownsLedger } = require('../ledgers/buildUnknownsLedger');
const { buildFalsifierLedger } = require('../ledgers/buildFalsifierLedger');
const { classifyBoundedConfidence } = require('../confidence/classifyBoundedConfidence');
const { buildRiskMapResponse } = require('../resolve/buildRiskMapResponse');
const { validateRiskMapResponse } = require('../resolve/validateRiskMapResponse');
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

function buildBundle(entity = ENTITY) {
  const registryIndex = buildRegistryBundle();
  const domainManifest = loadDomainManifest(DOMAIN_ID);
  const evidencePack = loadEvidencePack({
    domainId: DOMAIN_ID,
    entity,
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });
  const normalizedQuery = normalizeRiskMapQuery({
    entity,
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
    domainManifest,
    registryIndex,
    evidenceCoverageReport,
  });
  const supportedPaths = admissibilityDecision.status === 'refused'
    ? []
    : buildSupportedRiskPaths({
        normalizedQuery,
        admissibilityDecision,
        registryIndex,
        evidenceCoverageReport,
      });
  const unsupportedBridgeLedger = admissibilityDecision.status === 'refused'
    ? []
    : buildUnsupportedBridgeLedger({
        normalizedQuery,
        classification,
        admissibilityDecision,
        registryIndex,
        evidenceCoverageReport,
      });
  const assumptionsLedger = admissibilityDecision.status === 'refused'
    ? []
    : buildAssumptionsLedger({ supportedPaths });
  const unknownsLedger = admissibilityDecision.status === 'refused'
    ? []
    : buildUnknownsLedger({ supportedPaths });
  const falsifierLedger = admissibilityDecision.status === 'refused'
    ? []
    : buildFalsifierLedger({
        supportedPaths,
        registryIndex,
      });
  const confidenceAssessment = classifyBoundedConfidence({
    admissibilityDecision,
    evidenceCoverageReport,
    supportedPaths,
    unsupportedBridgeLedger,
    assumptionsLedger,
    unknownsLedger,
    falsifierLedger,
  });

  return {
    registryIndex,
    evidencePack,
    normalizedQuery,
    classification,
    evidenceCoverageReport,
    admissibilityDecision,
    supportedPaths,
    unsupportedBridgeLedger,
    assumptionsLedger,
    unknownsLedger,
    falsifierLedger,
    confidenceAssessment,
  };
}

test('buildRiskMapResponse emits deterministic sorted arrays', () => {
  const bundle = buildBundle();
  const response = buildRiskMapResponse(bundle);

  assert.deepEqual(response.supportedNodes, [
    'app_store_regulatory_exposure',
    'china_supply_chain_exposure',
  ]);
  assert.deepEqual(response.supportedThreatVectors, [
    'platform_control_weakening',
    'regulatory_pressure',
    'supply_chain_disruption',
  ]);
  assert.deepEqual(response.supportedCausalPaths, [
    'regulatory_pressure->app_store_regulatory_exposure',
    'supply_chain_disruption->china_supply_chain_exposure',
  ]);
});

test('duplicate intermediate values are deduplicated in final output', () => {
  const bundle = buildBundle();
  const duplicated = {
    ...bundle,
    supportedPaths: [...bundle.supportedPaths, ...bundle.supportedPaths],
    unsupportedBridgeLedger: [...bundle.unsupportedBridgeLedger, ...bundle.unsupportedBridgeLedger],
    assumptionsLedger: [...bundle.assumptionsLedger, ...bundle.assumptionsLedger],
    unknownsLedger: [...bundle.unknownsLedger, ...bundle.unknownsLedger],
    falsifierLedger: [...bundle.falsifierLedger, ...bundle.falsifierLedger],
  };
  const response = buildRiskMapResponse(duplicated);

  assert.deepEqual(response.supportedCausalPaths, [
    'regulatory_pressure->app_store_regulatory_exposure',
    'supply_chain_disruption->china_supply_chain_exposure',
  ]);
  assert.deepEqual(response.unsupportedBridges, [
    'missing_compatibility_rule:platform_control_weakening->app_store_regulatory_exposure',
  ]);
  assert.equal(response.assumptions.length, 2);
  assert.equal(response.unknowns.length, 3);
  assert.equal(response.falsifiers.length, 2);
});

test('final diagnostics are bounded and do not include leaked internal objects', () => {
  const bundle = buildBundle();
  const response = buildRiskMapResponse(bundle);

  assert.deepEqual(Object.keys(response.diagnostics), [
    'hasBroadCollapseLanguage',
    'hasUnsupportedFraming',
    'admittedScopes',
    'narrowedFromScopes',
    'refusedScopes',
    'supportedNodeIds',
    'unsupportedNodeIds',
    'supportedThreatIds',
    'unsupportedThreatIds',
  ]);
  assert.equal(Object.prototype.hasOwnProperty.call(response.diagnostics, 'registryIndex'), false);
});

test('supported path format is consistent across all emitted paths', () => {
  const bundle = buildBundle();
  const response = buildRiskMapResponse(bundle);

  for (const path of response.supportedCausalPaths) {
    assert.match(path, /^[a-z0-9_]+->[a-z0-9_]+$/);
  }
});

test('unsupported bridge format is consistent across all emitted bridges', () => {
  const narrowQuery = normalizeRiskMapQuery({
    entity: ENTITY,
    timeHorizon: 'collapse horizon',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });
  const narrowClassification = classifyRiskMapQueryShape(narrowQuery);
  const narrowRegistryIndex = buildRegistryBundle();
  const narrowCoverage = buildEvidenceCoverageReport({
    normalizedQuery: narrowQuery,
    registryIndex: narrowRegistryIndex,
    evidencePack: loadEvidencePack({
      domainId: DOMAIN_ID,
      entity: ENTITY,
      evidenceSetVersion: EVIDENCE_SET_VERSION,
    }),
  });
  const narrowDecision = assessRiskMapAdmissibility({
    normalizedQuery: narrowQuery,
    classification: narrowClassification,
    domainManifest: loadDomainManifest(DOMAIN_ID),
    registryIndex: narrowRegistryIndex,
    evidenceCoverageReport: narrowCoverage,
  });
  const ledgers = buildUnsupportedBridgeLedger({
    normalizedQuery: narrowQuery,
    classification: narrowClassification,
    admissibilityDecision: narrowDecision,
    registryIndex: narrowRegistryIndex,
    evidenceCoverageReport: narrowCoverage,
  });
  const confidenceAssessment = classifyBoundedConfidence({
    admissibilityDecision: narrowDecision,
    evidenceCoverageReport: narrowCoverage,
    supportedPaths: buildSupportedRiskPaths({
      normalizedQuery: narrowQuery,
      admissibilityDecision: narrowDecision,
      registryIndex: narrowRegistryIndex,
      evidenceCoverageReport: narrowCoverage,
    }),
    unsupportedBridgeLedger: ledgers,
    assumptionsLedger: buildAssumptionsLedger({ supportedPaths: [] }),
    unknownsLedger: buildUnknownsLedger({ supportedPaths: [] }),
    falsifierLedger: [],
  });
  const response = buildRiskMapResponse({
    normalizedQuery: narrowQuery,
    classification: narrowClassification,
    evidenceCoverageReport: narrowCoverage,
    admissibilityDecision: narrowDecision,
    supportedPaths: buildSupportedRiskPaths({
      normalizedQuery: narrowQuery,
      admissibilityDecision: narrowDecision,
      registryIndex: narrowRegistryIndex,
      evidenceCoverageReport: narrowCoverage,
    }),
    unsupportedBridgeLedger: ledgers,
    assumptionsLedger: buildAssumptionsLedger({ supportedPaths: [] }),
    unknownsLedger: buildUnknownsLedger({ supportedPaths: [] }),
    falsifierLedger: [],
    confidenceAssessment,
  });

  assert.deepEqual(response.unsupportedBridges, [
    'broad_collapse_overreach:apple',
    'missing_compatibility_rule:platform_control_weakening->app_store_regulatory_exposure',
  ]);
});

test('falsifier format is consistent across all emitted falsifiers', () => {
  const bundle = buildBundle();
  const response = buildRiskMapResponse(bundle);

  for (const falsifier of response.falsifiers) {
    assert.match(falsifier, /^[a-z0-9_]+@[a-z0-9_]+$/);
  }
});

test('admitted query returns deterministic compact output across repeated runs', () => {
  const first = buildRiskMapResponse(buildBundle());
  const second = buildRiskMapResponse(buildBundle());

  assert.deepEqual(first, second);
});

test('narrowed query emits only admitted-scope supported paths', () => {
  const bundle = buildBundle();
  const narrowedQuery = normalizeRiskMapQuery({
    entity: ENTITY,
    timeHorizon: 'collapse horizon',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });
  const classification = classifyRiskMapQueryShape(narrowedQuery);
  const evidenceCoverageReport = buildEvidenceCoverageReport({
    normalizedQuery: narrowedQuery,
    registryIndex: bundle.registryIndex,
    evidencePack: bundle.evidencePack,
  });
  const admissibilityDecision = assessRiskMapAdmissibility({
    normalizedQuery: narrowedQuery,
    classification,
    domainManifest: loadDomainManifest(DOMAIN_ID),
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport,
  });
  const supportedPaths = buildSupportedRiskPaths({
    normalizedQuery: narrowedQuery,
    admissibilityDecision,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport,
  });
  const confidenceAssessment = classifyBoundedConfidence({
    admissibilityDecision,
    evidenceCoverageReport,
    supportedPaths,
    unsupportedBridgeLedger: buildUnsupportedBridgeLedger({
      normalizedQuery: narrowedQuery,
      classification,
      admissibilityDecision,
      registryIndex: bundle.registryIndex,
      evidenceCoverageReport,
    }),
    assumptionsLedger: buildAssumptionsLedger({ supportedPaths }),
    unknownsLedger: buildUnknownsLedger({ supportedPaths }),
    falsifierLedger: buildFalsifierLedger({
      supportedPaths,
      registryIndex: bundle.registryIndex,
    }),
  });
  const response = buildRiskMapResponse({
    normalizedQuery: narrowedQuery,
    classification,
    evidenceCoverageReport,
    admissibilityDecision,
    supportedPaths,
    unsupportedBridgeLedger: buildUnsupportedBridgeLedger({
      normalizedQuery: narrowedQuery,
      classification,
      admissibilityDecision,
      registryIndex: bundle.registryIndex,
      evidenceCoverageReport,
    }),
    assumptionsLedger: buildAssumptionsLedger({ supportedPaths }),
    unknownsLedger: buildUnknownsLedger({ supportedPaths }),
    falsifierLedger: buildFalsifierLedger({
      supportedPaths,
      registryIndex: bundle.registryIndex,
    }),
    confidenceAssessment,
  });

  assert.deepEqual(response.supportedCausalPaths, [
    'regulatory_pressure->app_store_regulatory_exposure',
    'supply_chain_disruption->china_supply_chain_exposure',
  ]);
  assert.deepEqual(response.unsupportedBridges, [
    'broad_collapse_overreach:apple',
    'missing_compatibility_rule:platform_control_weakening->app_store_regulatory_exposure',
  ]);
});

test('refused query emits empty path and ledger arrays', () => {
  const result = resolveRiskMapQuery({
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['unknown_scope'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });

  assert.equal(result.status, 'refused');
  assert.deepEqual(result.supportedNodes, []);
  assert.deepEqual(result.supportedThreatVectors, []);
  assert.deepEqual(result.supportedCausalPaths, []);
  assert.deepEqual(result.unsupportedBridges, []);
  assert.deepEqual(result.assumptions, []);
  assert.deepEqual(result.unknowns, []);
  assert.deepEqual(result.falsifiers, []);
});

test('validateRiskMapResponse rejects malformed final response shapes', () => {
  const validation = validateRiskMapResponse({
    status: 'admitted',
    reasonCode: 'ADMISSIBLE_QUERY',
    reason: 'ok',
    domain: 'organization_risk',
    scenarioType: 'decline_risk',
    entity: 'apple',
    supportedNodes: ['node'],
    supportedThreatVectors: ['threat'],
    supportedCausalPaths: ['threat->node'],
    unsupportedBridges: ['bridge'],
    assumptions: ['assumption'],
    unknowns: ['unknown'],
    falsifiers: ['falsifier@node'],
    boundedConfidenceClass: null,
    diagnostics: {
      hasBroadCollapseLanguage: false,
      hasUnsupportedFraming: false,
      admittedScopes: ['regulatory'],
      narrowedFromScopes: [],
      refusedScopes: [],
      supportedNodeIds: ['node'],
      unsupportedNodeIds: [],
      supportedThreatIds: ['threat'],
      unsupportedThreatIds: [],
      leaked: true,
    },
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes('boundedConfidenceClass must be one of')));
});

test('same input plus same artifacts yields the same final response', () => {
  const first = buildRiskMapResponse(buildBundle());
  const second = buildRiskMapResponse(buildBundle());

  assert.deepEqual(first, second);
});

test('final response arrays contain only strings', () => {
  const response = buildRiskMapResponse(buildBundle());

  for (const fieldName of [
    'supportedNodes',
    'supportedThreatVectors',
    'supportedCausalPaths',
    'unsupportedBridges',
    'assumptions',
    'unknowns',
    'falsifiers',
  ]) {
    assert.ok(Array.isArray(response[fieldName]));
    for (const entry of response[fieldName]) {
      assert.equal(typeof entry, 'string');
    }
  }
});

test('boundedConfidenceClass remains a bounded class in this phase', () => {
  const response = buildRiskMapResponse(buildBundle());

  assert.equal(response.boundedConfidenceClass, 'MEDIUM_BOUNDED_SUPPORT');
});

test('no internal mutation occurs across repeated resolve calls', () => {
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

  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(second), true);
});
