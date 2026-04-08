'use strict';

const path = require('node:path');
const { safeJsonRead } = require('../utils/safeJsonRead');
const { freezePlainObject } = require('../utils/freezePlainObject');

const BACKEND_ROOT = path.resolve(__dirname, '../../../../');

function readArtifact(artifactPath) {
  if (typeof artifactPath !== 'string' || artifactPath.trim().length === 0) {
    throw new TypeError('loadGovernanceReleaseBundle requires non-empty artifact paths.');
  }

  return safeJsonRead(path.resolve(BACKEND_ROOT, artifactPath));
}

function normalizeArtifactPaths(artifactPaths) {
  return freezePlainObject({
    domainManifest: artifactPaths.domainManifest,
    nodeRegistry: artifactPaths.nodeRegistry,
    threatRegistry: artifactPaths.threatRegistry,
    causalCompatibilityRegistry: artifactPaths.causalCompatibilityRegistry,
    falsifierRegistry: artifactPaths.falsifierRegistry,
    evidencePack: artifactPaths.evidencePack,
  });
}

/**
 * @param {{
 *   releaseId: string,
 *   domainId: string,
 *   entity: string,
 *   evidenceSetVersion: string,
 *   registryVersion: string,
 *   artifactPaths?: {
 *     domainManifest: string,
 *     nodeRegistry: string,
 *     threatRegistry: string,
 *     causalCompatibilityRegistry: string,
 *     falsifierRegistry: string,
 *     evidencePack: string,
 *   },
 *   domainManifest?: object,
 *   nodeRegistry?: object,
 *   threatRegistry?: object,
 *   causalCompatibilityRegistry?: object,
 *   falsifierRegistry?: object,
 *   evidencePack?: object,
 *   status?: string,
 *   frozenAt?: string,
 *   notes?: string,
 *   registryHash?: string,
 * }} release
 * @returns {{
 *   releaseId: string,
 *   domainId: string,
 *   entity: string,
 *   evidenceSetVersion: string,
 *   registryVersion: string,
 *   artifactPaths: Readonly<Record<string, string>>,
 *   domainManifest: object,
 *   nodeRegistry: object,
 *   threatRegistry: object,
 *   causalCompatibilityRegistry: object,
 *   falsifierRegistry: object,
 *   evidencePack: object,
 *   status?: string,
 *   frozenAt?: string,
 *   notes?: string,
 *   registryHash?: string,
 * }}
 */
function loadGovernanceReleaseBundle(release) {
  const artifactPaths = release.artifactPaths ? normalizeArtifactPaths(release.artifactPaths) : null;

  return freezePlainObject({
    releaseId: release.releaseId,
    domainId: release.domainId,
    entity: release.entity,
    evidenceSetVersion: release.evidenceSetVersion,
    registryVersion: release.registryVersion,
    artifactPaths: artifactPaths || null,
    domainManifest: release.domainManifest || readArtifact(release.artifactPaths.domainManifest),
    nodeRegistry: release.nodeRegistry || readArtifact(release.artifactPaths.nodeRegistry),
    threatRegistry: release.threatRegistry || readArtifact(release.artifactPaths.threatRegistry),
    causalCompatibilityRegistry:
      release.causalCompatibilityRegistry || readArtifact(release.artifactPaths.causalCompatibilityRegistry),
    falsifierRegistry: release.falsifierRegistry || readArtifact(release.artifactPaths.falsifierRegistry),
    evidencePack: release.evidencePack || readArtifact(release.artifactPaths.evidencePack),
    status: release.status,
    frozenAt: release.frozenAt,
    notes: release.notes,
    registryHash: release.registryHash,
  });
}

module.exports = Object.freeze({
  loadGovernanceReleaseBundle,
});
