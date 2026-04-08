'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { loadGovernanceManifest } = require('../governance/loadGovernanceManifest');
const { loadGovernanceReleaseBundle } = require('../governance/loadGovernanceReleaseBundle');
const { buildArtifactDiffReport } = require('../governance/buildArtifactDiffReport');
const { validateArtifactCompatibility } = require('../governance/validateArtifactCompatibility');
const { safeJsonRead } = require('../utils/safeJsonRead');
const { stableDeterministicStringify } = require('../utils/stableDeterministicStringify');

const GOVERNANCE_REPLAY_FIXTURE_PATH = require('../inspect/inspectRiskMapGovernanceReport').GOVERNANCE_REPLAY_FIXTURE_PATH;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildBaselineBundle() {
  const manifest = loadGovernanceManifest();
  return loadGovernanceReleaseBundle(manifest.activeRelease);
}

test('buildArtifactDiffReport is deterministic', () => {
  const baseline = buildBaselineBundle();
  const candidate = clone(baseline);
  candidate.nodeRegistry.entries = [
    ...candidate.nodeRegistry.entries.slice(1),
    {
      id: 'governance_probe_node',
      domainId: candidate.domainId,
      entityType: 'company',
      scope: 'regulatory',
      label: 'Governance probe node',
      description: 'Governance probe node.',
      supportedThreatIds: ['regulatory_pressure'],
    },
  ];
  candidate.threatRegistry.entries = [
    ...candidate.threatRegistry.entries.slice(1),
    {
      id: 'governance_probe_threat',
      domainId: candidate.domainId,
      label: 'Governance probe threat',
      description: 'Governance probe threat.',
      targetScopes: ['regulatory'],
    },
  ];
  candidate.causalCompatibilityRegistry.entries = [
    ...candidate.causalCompatibilityRegistry.entries.slice(1),
    {
      id: 'governance_probe_rule',
      domainId: candidate.domainId,
      threatId: 'regulatory_pressure',
      targetNodeId: 'app_store_regulatory_exposure',
      compatibilityType: 'direct',
      notes: 'Governance probe rule.',
    },
  ];
  candidate.falsifierRegistry.entries = [
    ...candidate.falsifierRegistry.entries.slice(1),
    {
      id: 'governance_probe_falsifier',
      domainId: candidate.domainId,
      label: 'Governance probe falsifier',
      description: 'Governance probe falsifier.',
      applicableNodeIds: ['app_store_regulatory_exposure'],
    },
  ];
  candidate.evidencePack.records = [
    ...candidate.evidencePack.records.slice(1),
    {
      id: 'governance-probe-evidence-record',
      domainId: candidate.domainId,
      entity: candidate.entity,
      evidenceClass: 'market_report',
      targetType: 'node',
      targetId: 'app_store_regulatory_exposure',
      summary: 'Governance probe evidence record.',
      sourceLabel: 'Governance probe',
      supportLevel: 'contextual',
    },
  ];

  const first = buildArtifactDiffReport({
    releaseFrom: baseline,
    releaseTo: candidate,
  });
  const second = buildArtifactDiffReport({
    releaseFrom: baseline,
    releaseTo: candidate,
  });

  assert.deepEqual(first, second);
  assert.ok(first.changedIds.nodesAdded.includes('governance_probe_node'));
  assert.ok(first.changedIds.nodesRemoved.includes('app_store_regulatory_exposure'));
  assert.ok(first.changedIds.threatsAdded.includes('governance_probe_threat'));
  assert.ok(first.changedIds.compatibilityAdded.includes('governance_probe_rule'));
  assert.ok(first.changedIds.falsifiersAdded.includes('governance_probe_falsifier'));
  assert.ok(first.changedIds.evidenceRecordsAdded.includes('governance-probe-evidence-record'));
});

test('artifact diff reports added and removed ids correctly', () => {
  const baseline = buildBaselineBundle();
  const candidate = clone(baseline);
  const removedNodeId = candidate.nodeRegistry.entries[0].id;
  const removedThreatId = candidate.threatRegistry.entries[0].id;
  const removedCompatibilityId = candidate.causalCompatibilityRegistry.entries[0].id;
  const removedFalsifierId = candidate.falsifierRegistry.entries[0].id;
  const removedRecordId = candidate.evidencePack.records[0].id;

  candidate.nodeRegistry.entries = candidate.nodeRegistry.entries.slice(1);
  candidate.threatRegistry.entries = candidate.threatRegistry.entries.slice(1);
  candidate.causalCompatibilityRegistry.entries = candidate.causalCompatibilityRegistry.entries.slice(1);
  candidate.falsifierRegistry.entries = candidate.falsifierRegistry.entries.slice(1);
  candidate.evidencePack.records = candidate.evidencePack.records.slice(1);

  const diff = buildArtifactDiffReport({
    releaseFrom: baseline,
    releaseTo: candidate,
  });

  assert.ok(diff.changedIds.nodesRemoved.includes(removedNodeId));
  assert.ok(diff.changedIds.threatsRemoved.includes(removedThreatId));
  assert.ok(diff.changedIds.compatibilityRemoved.includes(removedCompatibilityId));
  assert.ok(diff.changedIds.falsifiersRemoved.includes(removedFalsifierId));
  assert.ok(diff.changedIds.evidenceRecordsRemoved.includes(removedRecordId));
});

test('validateArtifactCompatibility rejects structurally invalid candidate artifacts', () => {
  const baseline = buildBaselineBundle();
  const candidate = clone(baseline);
  candidate.domainManifest.version = 'v2';
  const replayFixture = safeJsonRead(GOVERNANCE_REPLAY_FIXTURE_PATH);
  const compatibility = validateArtifactCompatibility({
    baselineRelease: baseline,
    candidateRelease: candidate,
    replayFixture,
  });

  assert.equal(compatibility.compatible, false);
  assert.ok(compatibility.errors.some((entry) => entry.includes('domainManifest.version must match the release registryVersion')));
});

test('validateArtifactCompatibility fails if seeded replay output changes unexpectedly', () => {
  const baseline = buildBaselineBundle();
  const candidate = clone(baseline);
  const rule = candidate.causalCompatibilityRegistry.entries.find(
    (entry) => entry.id === 'platform_control_weakening__platform_dependency_exposure',
  );
  rule.targetNodeId = 'app_store_regulatory_exposure';
  const replayFixture = safeJsonRead(GOVERNANCE_REPLAY_FIXTURE_PATH);
  const compatibility = validateArtifactCompatibility({
    baselineRelease: baseline,
    candidateRelease: candidate,
    replayFixture,
  });

  assert.equal(compatibility.compatible, false);
  assert.ok(compatibility.errors.some((entry) => entry.includes('replay output diverges')));
});

test('same input plus same artifacts yields the same diff report shape', () => {
  const baseline = buildBaselineBundle();
  const candidate = clone(baseline);
  candidate.nodeRegistry.entries = candidate.nodeRegistry.entries.slice(1);

  const first = buildArtifactDiffReport({
    releaseFrom: baseline,
    releaseTo: candidate,
  });
  const second = buildArtifactDiffReport({
    releaseFrom: baseline,
    releaseTo: candidate,
  });

  assert.equal(stableDeterministicStringify(first), stableDeterministicStringify(second));
});
