'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const { safeJsonRead } = require('./safeJsonRead');
const { stableDeterministicStringify } = require('./stableDeterministicStringify');
const { loadEvidencePack } = require('../evidence/loadEvidencePack');

const BACKEND_ROOT = path.resolve(__dirname, '../../../../');
const RISK_MAPPING_MANIFEST_PATH = path.resolve(BACKEND_ROOT, 'data/risk-mapping/manifests/risk-mapping-manifest.json');

function readRegistryArtifact(filePath) {
  return safeJsonRead(path.resolve(BACKEND_ROOT, filePath));
}

function hashArtifactBundle(artifactBundle) {
  return crypto.createHash('sha256').update(stableDeterministicStringify(artifactBundle)).digest('hex');
}

function normalizeEvidencePackForHash(evidencePack) {
  return {
    domainId: evidencePack.domainId,
    version: evidencePack.version,
    entity: evidencePack.entity,
    evidenceSetVersion: evidencePack.evidenceSetVersion,
    records: [...evidencePack.records].sort((left, right) => left.id.localeCompare(right.id)),
  };
}

/**
 * @param {{
 *   domainId: string,
 *   entity: string,
 *   evidenceSetVersion: string,
 *   domainManifest: object,
 *   nodeRegistry: object,
 *   threatRegistry: object,
 *   causalCompatibilityRegistry: object,
 *   falsifierRegistry: object,
 *   evidencePack: object,
 * }} artifacts
 * @returns {{ domainId: string, entity: string, evidenceSetVersion: string, hash: string }}
 */
function buildRegistryHashFromArtifacts(artifacts) {
  return Object.freeze({
    domainId: artifacts.domainId,
    entity: artifacts.entity,
    evidenceSetVersion: artifacts.evidenceSetVersion,
    hash: hashArtifactBundle({
      domainManifest: artifacts.domainManifest,
      nodeRegistry: artifacts.nodeRegistry,
      threatRegistry: artifacts.threatRegistry,
      causalCompatibilityRegistry: artifacts.causalCompatibilityRegistry,
      falsifierRegistry: artifacts.falsifierRegistry,
      evidencePack: normalizeEvidencePackForHash(artifacts.evidencePack),
    }),
  });
}

/**
 * @param {{ domainId: string, entity: string, evidenceSetVersion: string }} input
 * @returns {{ domainId: string, entity: string, evidenceSetVersion: string, hash: string }}
 */
function buildRegistryHash(input) {
  const riskMappingManifest = safeJsonRead(RISK_MAPPING_MANIFEST_PATH);

  if (!riskMappingManifest.registryPaths || typeof riskMappingManifest.registryPaths !== 'object') {
    throw new Error('Risk mapping manifest is missing registry paths.');
  }

  const registryPaths = riskMappingManifest.registryPaths[input.domainId];

  if (!registryPaths || typeof registryPaths !== 'object') {
    throw new Error(`No authored registry paths are available for domain: ${input.domainId}`);
  }

  return buildRegistryHashFromArtifacts({
    domainId: input.domainId,
    entity: input.entity,
    evidenceSetVersion: input.evidenceSetVersion,
    domainManifest: readRegistryArtifact(registryPaths.domainManifest),
    nodeRegistry: readRegistryArtifact(registryPaths.nodeRegistry),
    threatRegistry: readRegistryArtifact(registryPaths.threatRegistry),
    causalCompatibilityRegistry: readRegistryArtifact(registryPaths.causalCompatibilityRegistry),
    falsifierRegistry: readRegistryArtifact(registryPaths.falsifierRegistry),
    evidencePack: loadEvidencePack({
      domainId: input.domainId,
      entity: input.entity,
      evidenceSetVersion: input.evidenceSetVersion,
    }),
  });
}

module.exports = Object.freeze({
  buildRegistryHash,
  buildRegistryHashFromArtifacts,
});
