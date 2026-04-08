'use strict';

const { INVALID_INPUT_CONTRACT } = require('../constants/rmgReasonCodes');

/**
 * @typedef {Object} RiskMapQuery
 * @property {string} entity
 * @property {string} timeHorizon
 * @property {string} scenarioType
 * @property {string} domain
 * @property {string[]} scope
 * @property {string} evidenceSetVersion
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string[]} errors
 */

function createValidationResult(errors) {
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze([...errors]),
    reasonCode: errors.length === 0 ? null : INVALID_INPUT_CONTRACT,
  });
}

function isNonEmptyTrimmedString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * @param {unknown} value
 * @returns {ValidationResult}
 */
function validateRiskMapQueryContract(value) {
  const errors = [];

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push('RiskMapQuery must be a plain object.');
    return createValidationResult(errors);
  }

  const query = /** @type {Record<string, unknown>} */ (value);
  const requiredStringFields = ['entity', 'timeHorizon', 'scenarioType', 'domain', 'evidenceSetVersion'];

  for (const field of requiredStringFields) {
    if (!isNonEmptyTrimmedString(query[field])) {
      errors.push(`${field} must be a non-empty string.`);
    }
  }

  if (!Array.isArray(query.scope)) {
    errors.push('scope must be an array of strings.');
  } else if (query.scope.length === 0) {
    errors.push('scope must not be empty.');
  } else {
    query.scope.forEach((entry, index) => {
      if (!isNonEmptyTrimmedString(entry)) {
        errors.push(`scope[${index}] must be a non-empty string.`);
      }
    });
  }

  return createValidationResult(errors);
}

module.exports = Object.freeze({
  validateRiskMapQueryContract,
});

