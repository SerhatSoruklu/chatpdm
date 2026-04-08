'use strict';

const path = require('node:path');
const { safeJsonRead } = require('../utils/safeJsonRead');
const { stableSort } = require('../utils/stableSort');
const { buildLookupMap } = require('../utils/buildLookupMap');
const { validateNodeRegistry } = require('./validateNodeRegistry');
const { validateRiskMappingManifest } = require('./validateRiskMappingManifest');
const { loadDomainManifest } = require('./loadDomainManifest');

const BACKEND_ROOT = path.resolve(__dirname, '../../../../');
const RISK_MAPPING_MANIFEST_PATH = path.resolve(BACKEND_ROOT, 'data/risk-mapping/manifests/risk-mapping-manifest.json');

function readRiskMappingManifest() {
  return safeJsonRead(RISK_MAPPING_MANIFEST_PATH);
}

function getRegistryPath(manifest, domainId) {
  const domainPaths = manifest.registryPaths && manifest.registryPaths[domainId];

  if (!domainPaths || typeof domainPaths.nodeRegistry !== 'string') {
    throw new Error(`Missing node registry path for domain: ${domainId}`);
  }

  return path.resolve(BACKEND_ROOT, domainPaths.nodeRegistry);
}

function normalizeNodeEntry(entry) {
  return Object.freeze({
    id: entry.id,
    domainId: entry.domainId,
    entityType: entry.entityType,
    scope: entry.scope,
    label: entry.label,
    description: entry.description,
    supportedThreatIds: Object.freeze(stableSort([...new Set(entry.supportedThreatIds)])),
  });
}

function loadNodeRegistry(domainId) {
  const domainManifest = loadDomainManifest(domainId);
  const manifest = readRiskMappingManifest();
  const manifestValidation = validateRiskMappingManifest(manifest);

  if (!manifestValidation.valid) {
    throw new Error(`Invalid risk mapping manifest: ${manifestValidation.errors.join(' | ')}`);
  }

  const registryPath = getRegistryPath(manifest, domainManifest.domainId);
  const registry = safeJsonRead(registryPath);
  const validation = validateNodeRegistry(registry);

  if (!validation.valid) {
    throw new Error(`Invalid node registry for ${domainManifest.domainId}: ${validation.errors.join(' | ')}`);
  }

  if (registry.domainId !== domainManifest.domainId) {
    throw new Error(`Node registry domain mismatch: expected ${domainManifest.domainId}, received ${registry.domainId}.`);
  }

  if (registry.version !== domainManifest.version) {
    throw new Error(`Node registry version mismatch: expected ${domainManifest.version}, received ${registry.version}.`);
  }

  const entries = freezeEntries(stableSort(registry.entries, (left, right) => left.id.localeCompare(right.id)));
  const byId = buildLookupMap(entries, (entry) => entry.id);

  return Object.freeze({
    domainId: registry.domainId,
    version: registry.version,
    entries,
    byId,
  });
}

function freezeEntries(entries) {
  return Object.freeze(entries.map(normalizeNodeEntry));
}

module.exports = Object.freeze({
  loadNodeRegistry,
});
