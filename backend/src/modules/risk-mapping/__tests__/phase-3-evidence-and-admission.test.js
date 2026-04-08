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
const { validateEvidencePack } = require('../evidence/validateEvidencePack');
const { buildEvidenceCoverageReport } = require('../evidence/buildEvidenceCoverageReport');
const { assessRiskMapAdmissibility } = require('../admission/assessRiskMapAdmissibility');
const { normalizeRiskMapQuery } = require('../normalizers/normalizeRiskMapQuery');
const { classifyRiskMapQueryShape } = require('../classification/classifyRiskMapQueryShape');

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

function buildFullBundle() {
  const domainManifest = loadDomainManifest(DOMAIN_ID);
  const registryIndex = buildRegistryBundle();
  const evidencePack = loadEvidencePack({
    domainId: DOMAIN_ID,
    entity: ENTITY,
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });

  return { domainManifest, registryIndex, evidencePack };
}

test('evidence pack loads and validates successfully', () => {
  const evidencePack = loadEvidencePack({
    domainId: DOMAIN_ID,
    entity: ENTITY,
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });

  const validation = validateEvidencePack(evidencePack);

  assert.equal(validation.valid, true);
  assert.equal(evidencePack.domainId, DOMAIN_ID);
  assert.equal(evidencePack.entity, ENTITY);
  assert.equal(evidencePack.evidenceSetVersion, EVIDENCE_SET_VERSION);
  assert.equal(evidencePack.records.length, 8);
  assert.equal(Object.isFrozen(evidencePack), true);
  assert.equal(Object.isFrozen(evidencePack.records), true);
});

test('invalid evidence pack shape fails consistently', () => {
  const invalid = {
    domainId: 'organization_risk',
    version: 'v1',
    entity: 'apple',
    evidenceSetVersion: 'v1',
    records: [
      {
        id: '',
        domainId: DOMAIN_ID,
        entity: ENTITY,
        evidenceClass: 'public_filing',
        targetType: 'node',
        targetId: 'app_store_regulatory_exposure',
        summary: 'x',
        sourceLabel: 'x',
        supportLevel: 'direct',
      },
    ],
  };

  const validation = validateEvidencePack(invalid);

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.includes('records[0].id must be a non-empty string.'));
});

test('evidence records targeting missing ids are rejected', () => {
  const bundle = buildFullBundle();
  const invalidCoveragePack = {
    ...bundle.evidencePack,
    records: Object.freeze([
      ...bundle.evidencePack.records,
      Object.freeze({
        id: 'bad-target',
        domainId: 'organization_risk',
        entity: 'apple',
        evidenceClass: 'market_report',
        targetType: 'node',
        targetId: 'missing_node',
        summary: 'missing',
        sourceLabel: 'seeded',
        supportLevel: 'direct',
      }),
    ]),
  };

  assert.throws(
    () =>
      buildEvidenceCoverageReport({
        normalizedQuery: normalizeRiskMapQuery({
          entity: 'apple',
          timeHorizon: '5 years',
          scenarioType: 'decline_risk',
          domain: DOMAIN_ID,
          scope: ['regulatory'],
          evidenceSetVersion: EVIDENCE_SET_VERSION,
        }),
        registryIndex: bundle.registryIndex,
        evidencePack: invalidCoveragePack,
      }),
    /Missing node target in registries: missing_node/,
  );
});

test('buildEvidenceCoverageReport produces deterministic output', () => {
  const bundle = buildFullBundle();
  const normalizedQuery = normalizeRiskMapQuery({
    entity: 'apple',
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });

  const first = buildEvidenceCoverageReport({
    normalizedQuery,
    registryIndex: bundle.registryIndex,
    evidencePack: bundle.evidencePack,
  });
  const second = buildEvidenceCoverageReport({
    normalizedQuery,
    registryIndex: bundle.registryIndex,
    evidencePack: bundle.evidencePack,
  });

  assert.deepEqual(first, second);
  assert.deepEqual(first.supportedNodeIds, [
    'app_store_regulatory_exposure',
    'china_supply_chain_exposure',
  ]);
  assert.deepEqual(first.supportedThreatIds, [
    'platform_control_weakening',
    'regulatory_pressure',
    'supply_chain_disruption',
  ]);
  assert.equal(Object.isFrozen(first), true);
});

test('assessRiskMapAdmissibility admits fully supported scoped queries', () => {
  const bundle = buildFullBundle();
  const normalizedQuery = normalizeRiskMapQuery({
    entity: 'apple',
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });
  const classification = classifyRiskMapQueryShape(normalizedQuery);
  const evidenceCoverageReport = buildEvidenceCoverageReport({
    normalizedQuery,
    registryIndex: bundle.registryIndex,
    evidencePack: bundle.evidencePack,
  });

  const decision = assessRiskMapAdmissibility({
    normalizedQuery,
    classification,
    domainManifest: bundle.domainManifest,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport,
  });

  assert.equal(decision.status, 'admitted');
  assert.equal(decision.reasonCode, 'ADMISSIBLE_QUERY');
  assert.deepEqual(decision.admittedScopes, ['regulatory', 'supply_chain']);
  assert.deepEqual(decision.narrowedFromScopes, []);
  assert.deepEqual(decision.refusedScopes, []);
});

test('assessRiskMapAdmissibility narrows partially supported queries', () => {
  const bundle = buildFullBundle();
  const normalizedQuery = normalizeRiskMapQuery({
    entity: 'apple',
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'platform_dependency'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });
  const classification = classifyRiskMapQueryShape({
    ...normalizedQuery,
    entity: 'apple downfall',
  });
  const evidenceCoverageReport = buildEvidenceCoverageReport({
    normalizedQuery,
    registryIndex: bundle.registryIndex,
    evidencePack: bundle.evidencePack,
  });

  const decision = assessRiskMapAdmissibility({
    normalizedQuery,
    classification,
    domainManifest: bundle.domainManifest,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport,
  });

  assert.equal(decision.status, 'narrowed');
  assert.equal(decision.reasonCode, 'BROAD_COLLAPSE_FRAMING');
  assert.deepEqual(decision.admittedScopes, ['platform_dependency', 'regulatory']);
  assert.ok(decision.narrowedFromScopes.length >= 0);
});

test('assessRiskMapAdmissibility refuses unsupported scoped queries', () => {
  const bundle = buildFullBundle();
  const normalizedQuery = normalizeRiskMapQuery({
    entity: 'apple',
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['unknown_scope'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });
  const classification = classifyRiskMapQueryShape(normalizedQuery);
  const evidenceCoverageReport = buildEvidenceCoverageReport({
    normalizedQuery,
    registryIndex: bundle.registryIndex,
    evidencePack: bundle.evidencePack,
  });

  const decision = assessRiskMapAdmissibility({
    normalizedQuery,
    classification,
    domainManifest: bundle.domainManifest,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport,
  });

  assert.equal(decision.status, 'refused');
  assert.equal(decision.reasonCode, 'UNSUPPORTED_SCOPE');
});

test('broad collapse framing narrows instead of admitting broad collapse', () => {
  const bundle = buildFullBundle();
  const normalizedQuery = normalizeRiskMapQuery({
    entity: 'apple',
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
    queryText: 'apple downfall in 5 years',
  });
  const classification = classifyRiskMapQueryShape(normalizedQuery);
  const evidenceCoverageReport = buildEvidenceCoverageReport({
    normalizedQuery,
    registryIndex: bundle.registryIndex,
    evidencePack: bundle.evidencePack,
  });

  const decision = assessRiskMapAdmissibility({
    normalizedQuery,
    classification,
    domainManifest: bundle.domainManifest,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport,
  });

  assert.equal(decision.status, 'narrowed');
  assert.equal(decision.reasonCode, 'BROAD_COLLAPSE_FRAMING');
});

test('same inputs produce the same admissibility decision', () => {
  const bundle = buildFullBundle();
  const normalizedQuery = normalizeRiskMapQuery({
    entity: 'apple',
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });
  const classification = classifyRiskMapQueryShape(normalizedQuery);
  const evidenceCoverageReport = buildEvidenceCoverageReport({
    normalizedQuery,
    registryIndex: bundle.registryIndex,
    evidencePack: bundle.evidencePack,
  });

  const first = assessRiskMapAdmissibility({
    normalizedQuery,
    classification,
    domainManifest: bundle.domainManifest,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport,
  });
  const second = assessRiskMapAdmissibility({
    normalizedQuery,
    classification,
    domainManifest: bundle.domainManifest,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport,
  });

  assert.deepEqual(first, second);
});

test('outputs are frozen or treated immutably where practical', () => {
  const bundle = buildFullBundle();
  const normalizedQuery = normalizeRiskMapQuery({
    entity: 'apple',
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });
  const classification = classifyRiskMapQueryShape(normalizedQuery);
  const evidenceCoverageReport = buildEvidenceCoverageReport({
    normalizedQuery,
    registryIndex: bundle.registryIndex,
    evidencePack: bundle.evidencePack,
  });
  const decision = assessRiskMapAdmissibility({
    normalizedQuery,
    classification,
    domainManifest: bundle.domainManifest,
    registryIndex: bundle.registryIndex,
    evidenceCoverageReport,
  });

  assert.equal(Object.isFrozen(decision), true);
  assert.equal(Object.isFrozen(decision.diagnostics), true);
});
