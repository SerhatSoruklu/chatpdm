'use strict';

const { INVALID_INPUT_CONTRACT } = require('../constants/rmgReasonCodes');

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string[]} errors
 * @property {string|null} reasonCode
 */

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
 * @returns {ValidationResult}
 */
function validateDomainManifest(value) {
  const errors = [];

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push('Domain manifest must be a plain object.');
    return {
      valid: false,
      errors,
      reasonCode: INVALID_INPUT_CONTRACT,
    };
  }

  const manifest = /** @type {Record<string, unknown>} */ (value);

  ['domainId', 'version', 'description', 'notes', 'narrowingPolicy', 'refusalPolicy'].forEach((fieldName) => {
    if (!isNonEmptyString(manifest[fieldName])) {
      errors.push(`${fieldName} must be a non-empty string.`);
    }
  });

  validateStringArray(manifest.supportedScenarioTypes, 'supportedScenarioTypes', errors);
  validateStringArray(manifest.supportedScopes, 'supportedScopes', errors);
  validateStringArray(manifest.allowedEntityTypes, 'allowedEntityTypes', errors);

  return {
    valid: errors.length === 0,
    errors,
    reasonCode: errors.length === 0 ? null : INVALID_INPUT_CONTRACT,
  };
}

module.exports = Object.freeze({
  validateDomainManifest,
});

