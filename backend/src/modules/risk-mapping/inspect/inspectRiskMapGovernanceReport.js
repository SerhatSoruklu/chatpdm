'use strict';

const path = require('node:path');
const { safeJsonRead } = require('../utils/safeJsonRead');
const { buildGovernanceReport } = require('../governance/buildGovernanceReport');
const { loadGovernanceManifest } = require('../governance/loadGovernanceManifest');
const { loadGovernanceReleaseBundle } = require('../governance/loadGovernanceReleaseBundle');
const { validateArtifactCompatibility } = require('../governance/validateArtifactCompatibility');
const { buildRegistryHashFromArtifacts } = require('../utils/buildRegistryHash');

const BACKEND_ROOT = path.resolve(__dirname, '../../../../');
const GOVERNANCE_REPLAY_FIXTURE_PATH = path.resolve(
  BACKEND_ROOT,
  'data/risk-mapping/governance/seeded-replay-fixture.json',
);

/**
 * @returns {Readonly<Record<string, unknown>>}
 */
function inspectRiskMapGovernanceReport() {
  const manifest = loadGovernanceManifest();
  const activeRelease = manifest.activeRelease;
  const bundle = loadGovernanceReleaseBundle(activeRelease);
  const replayFixture = safeJsonRead(GOVERNANCE_REPLAY_FIXTURE_PATH);
  const compatibility = validateArtifactCompatibility({
    baselineRelease: bundle,
    candidateRelease: bundle,
    replayFixture,
  });

  if (!compatibility.compatible) {
    throw new Error(`Governance inspection failed: ${compatibility.errors.join(' | ')}`);
  }

  const registryHash = buildRegistryHashFromArtifacts(bundle);

  return buildGovernanceReport({
    releaseId: activeRelease.releaseId,
    domainId: activeRelease.domainId,
    entity: activeRelease.entity,
    registryVersion: activeRelease.registryVersion,
    evidenceSetVersion: activeRelease.evidenceSetVersion,
    registryHash: registryHash.hash,
    validationPassed: true,
    replayPassed: true,
    compatibilityPassed: true,
    notes: activeRelease.notes,
  });
}

module.exports = Object.freeze({
  inspectRiskMapGovernanceReport,
  GOVERNANCE_REPLAY_FIXTURE_PATH,
});
