'use strict';

const path = require('node:path');
const { safeJsonRead } = require('../utils/safeJsonRead');
const { stableSort } = require('../utils/stableSort');
const { buildLookupMap } = require('../utils/buildLookupMap');
const { validateCausalCompatibilityRegistry } = require('./validateCausalCompatibilityRegistry');
const { validateRiskMappingManifest } = require('./validateRiskMappingManifest');
const { loadDomainManifest } = require('./loadDomainManifest');

const BACKEND_ROOT = path.resolve(__dirname, '../../../../');
const RISK_MAPPING_MANIFEST_PATH = path.resolve(BACKEND_ROOT, 'data/risk-mapping/manifests/risk-mapping-manifest.json');

function readRiskMappingManifest() {
  return safeJsonRead(RISK_MAPPING_MANIFEST_PATH);
}

function getRegistryPath(manifest, domainId) {
  const domainPaths = manifest.registryPaths && manifest.registryPaths[domainId];

  if (!domainPaths || typeof domainPaths.causalCompatibilityRegistry !== 'string') {
    throw new Error(`Missing causal compatibility registry path for domain: ${domainId}`);
  }

  return path.resolve(BACKEND_ROOT, domainPaths.causalCompatibilityRegistry);
}

function normalizeCompatibilityEntry(entry) {
  return Object.freeze({
    id: entry.id,
    domainId: entry.domainId,
    threatId: entry.threatId,
    targetNodeId: entry.targetNodeId,
    compatibilityType: entry.compatibilityType,
    notes: entry.notes,
  });
}

function loadCausalCompatibilityRegistry(domainId) {
  const domainManifest = loadDomainManifest(domainId);
  const manifest = readRiskMappingManifest();
  const manifestValidation = validateRiskMappingManifest(manifest);

  if (!manifestValidation.valid) {
    throw new Error(`Invalid risk mapping manifest: ${manifestValidation.errors.join(' | ')}`);
  }

  const registryPath = getRegistryPath(manifest, domainManifest.domainId);
  const registry = safeJsonRead(registryPath);
  const validation = validateCausalCompatibilityRegistry(registry);

  if (!validation.valid) {
    throw new Error(`Invalid causal compatibility registry for ${domainManifest.domainId}: ${validation.errors.join(' | ')}`);
  }

  if (registry.domainId !== domainManifest.domainId) {
    throw new Error(`Causal compatibility registry domain mismatch: expected ${domainManifest.domainId}, received ${registry.domainId}.`);
  }

  if (registry.version !== domainManifest.version) {
    throw new Error(`Causal compatibility registry version mismatch: expected ${domainManifest.version}, received ${registry.version}.`);
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
  return Object.freeze(entries.map(normalizeCompatibilityEntry));
}

module.exports = Object.freeze({
  loadCausalCompatibilityRegistry,
});
