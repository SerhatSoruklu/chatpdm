'use strict';

const { INVALID_INPUT_CONTRACT } = require('../constants/rmgReasonCodes');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * @param {unknown} value
 * @returns {{ valid: boolean, errors: string[], reasonCode: string | null }}
 */
function validateCausalCompatibilityRegistry(value) {
  const errors = [];

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push('Causal compatibility registry must be a plain object.');
    return { valid: false, errors, reasonCode: INVALID_INPUT_CONTRACT };
  }

  const registry = /** @type {Record<string, unknown>} */ (value);

  ['domainId', 'version'].forEach((fieldName) => {
    if (!isNonEmptyString(registry[fieldName])) {
      errors.push(`${fieldName} must be a non-empty string.`);
    }
  });

  if (!Array.isArray(registry.entries) || registry.entries.length === 0) {
    errors.push('entries must be a non-empty array.');
  } else {
    registry.entries.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        errors.push(`entries[${index}] must be a plain object.`);
        return;
      }

      const compatibility = /** @type {Record<string, unknown>} */ (entry);

      ['id', 'domainId', 'threatId', 'targetNodeId', 'compatibilityType', 'notes'].forEach((fieldName) => {
        if (!isNonEmptyString(compatibility[fieldName])) {
          errors.push(`entries[${index}].${fieldName} must be a non-empty string.`);
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
  validateCausalCompatibilityRegistry,
});

