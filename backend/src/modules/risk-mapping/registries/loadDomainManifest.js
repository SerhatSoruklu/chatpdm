'use strict';

const path = require('node:path');
const { safeJsonRead } = require('../utils/safeJsonRead');
const { stableSort } = require('../utils/stableSort');
const { validateDomainManifest } = require('./validateDomainManifest');
const { validateRiskMappingManifest } = require('./validateRiskMappingManifest');
const { INVALID_INPUT_CONTRACT } = require('../constants/rmgReasonCodes');

const BACKEND_ROOT = path.resolve(__dirname, '../../../../');
const RISK_MAPPING_MANIFEST_PATH = path.resolve(BACKEND_ROOT, 'data/risk-mapping/manifests/risk-mapping-manifest.json');

function readRiskMappingManifest() {
  return safeJsonRead(RISK_MAPPING_MANIFEST_PATH);
}

function getDomainManifestPath(manifest, domainId) {
  const domainPaths = manifest.registryPaths && manifest.registryPaths[domainId];

  if (!domainPaths || typeof domainPaths.domainManifest !== 'string') {
    throw new Error(`Missing domain manifest path for domain: ${domainId}`);
  }

  return path.resolve(BACKEND_ROOT, domainPaths.domainManifest);
}

function freezeArray(values) {
  return Object.freeze([...values]);
}

/**
 * @returns {{ valid: boolean, errors: string[], reasonCode: string | null }}
 */
function validatePinnedDomainManifest(manifest, pinnedVersion) {
  const validation = validateDomainManifest(manifest);

  if (!validation.valid) {
    return validation;
  }

  const errors = [];

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    errors.push('Domain manifest must be a plain object.');
  } else {
    if (manifest.version !== pinnedVersion) {
      errors.push(`Domain manifest version mismatch: expected ${pinnedVersion}, received ${manifest.version}.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: validation.errors.concat(errors),
    reasonCode: validation.errors.length === 0 && errors.length === 0 ? null : INVALID_INPUT_CONTRACT,
  };
}

function loadDomainManifest(domainId) {
  if (typeof domainId !== 'string' || domainId.trim().length === 0) {
    throw new TypeError('loadDomainManifest requires a non-empty domainId string.');
  }

  const manifest = readRiskMappingManifest();
  const manifestValidation = validateRiskMappingManifest(manifest);

  if (!manifestValidation.valid) {
    throw new Error(`Invalid risk mapping manifest: ${manifestValidation.errors.join(' | ')}`);
  }

  if (!manifest.availableDomains.includes(domainId)) {
    throw new Error(`Unsupported domain in risk mapping manifest: ${domainId}`);
  }

  const currentVersion = manifest.currentDomainVersions[domainId];
  const domainManifestPath = getDomainManifestPath(manifest, domainId);
  const domainManifest = safeJsonRead(domainManifestPath);
  const validation = validatePinnedDomainManifest(domainManifest, currentVersion);

  if (!validation.valid) {
    throw new Error(`Invalid domain manifest for ${domainId}: ${validation.errors.join(' | ')}`);
  }

  return Object.freeze({
    domainId: domainManifest.domainId,
    version: domainManifest.version,
    supportedScenarioTypes: freezeArray(stableSort(domainManifest.supportedScenarioTypes)),
    supportedScopes: freezeArray(stableSort(domainManifest.supportedScopes)),
    allowedEntityTypes: freezeArray(stableSort(domainManifest.allowedEntityTypes)),
    description: domainManifest.description,
    notes: domainManifest.notes,
    narrowingPolicy: domainManifest.narrowingPolicy,
    refusalPolicy: domainManifest.refusalPolicy,
  });
}

module.exports = Object.freeze({
  loadDomainManifest,
});
