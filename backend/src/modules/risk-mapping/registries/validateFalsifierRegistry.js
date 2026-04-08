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
function validateFalsifierRegistry(value) {
  const errors = [];

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push('Falsifier registry must be a plain object.');
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

      const falsifier = /** @type {Record<string, unknown>} */ (entry);

      ['id', 'domainId', 'label', 'description'].forEach((fieldName) => {
        if (!isNonEmptyString(falsifier[fieldName])) {
          errors.push(`entries[${index}].${fieldName} must be a non-empty string.`);
        }
      });

      validateStringArray(falsifier.applicableNodeIds, `entries[${index}].applicableNodeIds`, errors);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    reasonCode: errors.length === 0 ? null : INVALID_INPUT_CONTRACT,
  };
}

module.exports = Object.freeze({
  validateFalsifierRegistry,
});

