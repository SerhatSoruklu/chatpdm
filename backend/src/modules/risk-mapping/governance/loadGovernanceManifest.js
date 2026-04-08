'use strict';

const path = require('node:path');
const { safeJsonRead } = require('../utils/safeJsonRead');
const { freezePlainObject } = require('../utils/freezePlainObject');
const { stableSort } = require('../utils/stableSort');
const { validateGovernanceManifest } = require('./validateGovernanceManifest');

const BACKEND_ROOT = path.resolve(__dirname, '../../../../');
const GOVERNANCE_MANIFEST_PATH = path.resolve(BACKEND_ROOT, 'data/risk-mapping/governance/governance-manifest.json');

function freezeArtifactPaths(artifactPaths) {
  return Object.freeze({
    domainManifest: artifactPaths.domainManifest,
    nodeRegistry: artifactPaths.nodeRegistry,
    threatRegistry: artifactPaths.threatRegistry,
    causalCompatibilityRegistry: artifactPaths.causalCompatibilityRegistry,
    falsifierRegistry: artifactPaths.falsifierRegistry,
    evidencePack: artifactPaths.evidencePack,
  });
}

function normalizeReleaseRecord(release) {
  return freezePlainObject({
    releaseId: release.releaseId,
    domainId: release.domainId,
    entity: release.entity,
    evidenceSetVersion: release.evidenceSetVersion,
    registryVersion: release.registryVersion,
    status: release.status,
    frozenAt: release.frozenAt,
    registryHash: release.registryHash,
    notes: release.notes,
    artifactPaths: freezeArtifactPaths(release.artifactPaths),
  });
}

/**
 * @returns {{
 *   currentReleaseId: string,
 *   releases: readonly object[],
 *   releaseById: Readonly<Record<string, object>>,
 *   activeRelease: Readonly<Record<string, unknown>>,
 * }}
 */
function loadGovernanceManifest() {
  const manifest = safeJsonRead(GOVERNANCE_MANIFEST_PATH);
  const validation = validateGovernanceManifest(manifest);

  if (!validation.valid) {
    throw new Error(`Invalid governance manifest: ${validation.errors.join(' | ')}`);
  }

  const normalizedReleases = stableSort(manifest.releases, (left, right) => left.releaseId.localeCompare(right.releaseId)).map(
    normalizeReleaseRecord,
  );
  const releaseById = Object.create(null);

  for (const release of normalizedReleases) {
    releaseById[release.releaseId] = release;
  }

  return freezePlainObject({
    currentReleaseId: manifest.currentReleaseId,
    releases: Object.freeze(normalizedReleases),
    releaseById: Object.freeze(releaseById),
    activeRelease: releaseById[manifest.currentReleaseId],
  });
}

module.exports = Object.freeze({
  GOVERNANCE_MANIFEST_PATH,
  loadGovernanceManifest,
});
