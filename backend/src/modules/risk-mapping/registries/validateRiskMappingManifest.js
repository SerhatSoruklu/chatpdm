'use strict';

const { INVALID_INPUT_CONTRACT } = require('../constants/rmgReasonCodes');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateStringArray(value, fieldName, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array of strings.`);
    return;
  }

  if (value.length === 0) {
    errors.push(`${fieldName} must not be empty.`);
    return;
  }

  value.forEach((entry, index) => {
    if (!isNonEmptyString(entry)) {
      errors.push(`${fieldName}[${index}] must be a non-empty string.`);
    }
  });
}

/**
 * @param {unknown} value
 * @returns {{ valid: boolean, errors: string[], reasonCode: string | null }}
 */
function validateRiskMappingManifest(value) {
  const errors = [];

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push('Risk mapping manifest must be a plain object.');
    return { valid: false, errors, reasonCode: INVALID_INPUT_CONTRACT };
  }

  const manifest = /** @type {Record<string, unknown>} */ (value);

  validateStringArray(manifest.availableDomains, 'availableDomains', errors);

  if (!manifest.currentDomainVersions || typeof manifest.currentDomainVersions !== 'object' || Array.isArray(manifest.currentDomainVersions)) {
    errors.push('currentDomainVersions must be a plain object.');
  } else if (Array.isArray(manifest.availableDomains)) {
    manifest.availableDomains.forEach((domainId, index) => {
      if (!isNonEmptyString(domainId)) {
        errors.push(`availableDomains[${index}] must be a non-empty string.`);
        return;
      }

      if (!isNonEmptyString(manifest.currentDomainVersions[domainId])) {
        errors.push(`currentDomainVersions must define a non-empty version for ${domainId}.`);
      }
    });
  }

  if (!manifest.registryPaths || typeof manifest.registryPaths !== 'object' || Array.isArray(manifest.registryPaths)) {
    errors.push('registryPaths must be a plain object.');
  } else if (Array.isArray(manifest.availableDomains)) {
    manifest.availableDomains.forEach((domainId, index) => {
      if (!isNonEmptyString(domainId)) {
        errors.push(`availableDomains[${index}] must be a non-empty string.`);
        return;
      }

      const registryPaths = manifest.registryPaths[domainId];
      if (!registryPaths || typeof registryPaths !== 'object' || Array.isArray(registryPaths)) {
        errors.push(`registryPaths must define a plain object for ${domainId}.`);
        return;
      }

      ['domainManifest', 'nodeRegistry', 'threatRegistry', 'causalCompatibilityRegistry', 'falsifierRegistry'].forEach((fieldName) => {
        if (!isNonEmptyString(registryPaths[fieldName])) {
          errors.push(`registryPaths.${domainId}.${fieldName} must be a non-empty string.`);
        }
      });
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    reasonCode: errors.length === 0 ? null : INVALID_INPUT_CONTRACT,
  };
}

module.exports = Object.freeze({
  validateRiskMappingManifest,
});

