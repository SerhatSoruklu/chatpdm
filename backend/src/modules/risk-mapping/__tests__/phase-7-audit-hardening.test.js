'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveRiskMapQuery } = require('../resolve/resolveRiskMapQuery');
const { buildRiskMapAuditReport } = require('../inspect/buildRiskMapAuditReport');
const { inspectRiskMapAuditReport } = require('../inspect/inspectRiskMapAuditReport');
const { buildRiskMapExplanation } = require('../explain/buildRiskMapExplanation');
const { buildRegistryHash, buildRegistryHashFromArtifacts } = require('../utils/buildRegistryHash');
const { loadDomainManifest } = require('../registries/loadDomainManifest');
const { loadNodeRegistry } = require('../registries/loadNodeRegistry');
const { loadThreatRegistry } = require('../registries/loadThreatRegistry');
const { loadCausalCompatibilityRegistry } = require('../registries/loadCausalCompatibilityRegistry');
const { loadFalsifierRegistry } = require('../registries/loadFalsifierRegistry');
const { loadEvidencePack } = require('../evidence/loadEvidencePack');
const { buildRegistryIndex } = require('../registries/buildRegistryIndex');
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
const { validateCompactOutputFormats } = require('../utils/validateCompactOutputFormats');
const { assertSortedUniqueStringArray } = require('../utils/assertSortedUniqueStringArray');

const DOMAIN_ID = 'organization_risk';
const ENTITY = 'apple';
const EVIDENCE_SET_VERSION = 'v1';

function loadSnapshot(snapshotName) {
  const snapshotPath = path.join(__dirname, 'fixtures', `${snapshotName}.snapshot.json`);
  return JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
}

function buildBundle() {
  const domainManifest = loadDomainManifest(DOMAIN_ID);
  const nodeRegistry = loadNodeRegistry(DOMAIN_ID);
  const threatRegistry = loadThreatRegistry(DOMAIN_ID);
  const causalCompatibilityRegistry = loadCausalCompatibilityRegistry(DOMAIN_ID);
  const falsifierRegistry = loadFalsifierRegistry(DOMAIN_ID);
  const registryIndex = buildRegistryIndex({
    domainManifest,
    nodeRegistry,
    threatRegistry,
    causalCompatibilityRegistry,
    falsifierRegistry,
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
  const evidencePack = loadEvidencePack({
    domainId: DOMAIN_ID,
    entity: ENTITY,
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });
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
  const output = resolveRiskMapQuery({
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });
  const explanation = buildRiskMapExplanation({
    normalizedQuery,
    admissibilityDecision,
    evidenceCoverageReport,
    supportedPaths,
    unsupportedBridgeLedger,
    assumptionsLedger,
    unknownsLedger,
    falsifierLedger,
    confidenceAssessment,
  });

  return {
    normalizedQuery,
    registryIndex,
    evidencePack,
    evidenceCoverageReport,
    admissibilityDecision,
    supportedPaths,
    unsupportedBridgeLedger,
    assumptionsLedger,
    unknownsLedger,
    falsifierLedger,
    confidenceAssessment,
    output,
    explanation,
  };
}

test('audit report is deterministic and matches the seeded snapshot surface', () => {
  const snapshot = loadSnapshot('apple_decline_risk');
  const bundle = buildBundle();
  const registryHash = buildRegistryHash({
    domainId: DOMAIN_ID,
    entity: ENTITY,
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });
  const first = buildRiskMapAuditReport({
    normalizedQuery: bundle.normalizedQuery,
    output: bundle.output,
    explanation: bundle.explanation,
    confidenceAssessment: bundle.confidenceAssessment,
    registryHash,
  });
  const second = buildRiskMapAuditReport({
    normalizedQuery: bundle.normalizedQuery,
    output: bundle.output,
    explanation: bundle.explanation,
    confidenceAssessment: bundle.confidenceAssessment,
    registryHash,
  });

  assert.deepEqual(first, second);
  assert.deepEqual(first.input, snapshot.input);
  assert.deepEqual(first.output, snapshot.expectedOutput);
  assert.equal(first.provenance.registryHash, registryHash.hash);
  assert.deepEqual(first.confidence, bundle.explanation.confidence);
});

test('registry hash changes when authored artifacts change', () => {
  const baseline = buildRegistryHash({
    domainId: DOMAIN_ID,
    entity: ENTITY,
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });
  const mutated = buildRegistryHashFromArtifacts({
    domainId: DOMAIN_ID,
    entity: ENTITY,
    evidenceSetVersion: EVIDENCE_SET_VERSION,
    domainManifest: loadDomainManifest(DOMAIN_ID),
    nodeRegistry: loadNodeRegistry(DOMAIN_ID),
    threatRegistry: loadThreatRegistry(DOMAIN_ID),
    causalCompatibilityRegistry: loadCausalCompatibilityRegistry(DOMAIN_ID),
    falsifierRegistry: loadFalsifierRegistry(DOMAIN_ID),
    evidencePack: {
      ...loadEvidencePack({
        domainId: DOMAIN_ID,
        entity: ENTITY,
        evidenceSetVersion: EVIDENCE_SET_VERSION,
      }),
      records: [
        ...loadEvidencePack({
          domainId: DOMAIN_ID,
          entity: ENTITY,
          evidenceSetVersion: EVIDENCE_SET_VERSION,
        }).records,
        {
          id: 'audit-drift-probe',
          domainId: DOMAIN_ID,
          entity: ENTITY,
          evidenceClass: 'company_statement',
          targetType: 'node',
          targetId: 'platform_dependency_exposure',
          summary: 'audit drift probe',
          sourceLabel: 'test',
          supportLevel: 'contextual',
        },
      ],
    },
  });

  assert.notEqual(mutated.hash, baseline.hash);
});

test('audit report invariants remain bounded and structurally valid', () => {
  const snapshot = loadSnapshot('apple_decline_risk');
  const bundle = buildBundle();
  const auditReport = inspectRiskMapAuditReport(snapshot.input);

  assert.deepEqual(auditReport.output, snapshot.expectedOutput);
  assert.deepEqual(auditReport.input, snapshot.input);
  assert.equal(auditReport.invariants.outputArraysSorted, true);
  assert.equal(auditReport.invariants.outputArraysUnique, true);
  assert.equal(auditReport.invariants.diagnosticsBounded, true);
  assert.equal(auditReport.invariants.compactFormatsValid, true);
  assert.deepEqual(Object.keys(auditReport.confidence), ['boundedConfidenceClass', 'reasonIds', 'explanation']);
  assert.equal(Object.prototype.hasOwnProperty.call(auditReport, 'evidencePack'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(auditReport, 'registryIndex'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(auditReport, 'supportedPaths'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(auditReport.explanation, 'records'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(auditReport.explanation, 'entries'), false);
  assertSortedUniqueStringArray(auditReport.explanation.support.supportedPathIds, 'audit.explanation.supportedPathIds');
  assertSortedUniqueStringArray(auditReport.explanation.bridges.unsupportedBridgeIds, 'audit.explanation.unsupportedBridgeIds');
  assert.ok(validateCompactOutputFormats(auditReport.output).valid);
  assert.ok(bundle.output.supportedCausalPaths.every((value) => typeof value === 'string'));
});
