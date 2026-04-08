'use strict';

const { INVALID_OUTPUT_CONTRACT } = require('../constants/rmgReasonCodes');
const { LOW_BOUNDED_SUPPORT, MEDIUM_BOUNDED_SUPPORT, HIGH_BOUNDED_SUPPORT } = require('../constants/rmgConfidenceClasses');
const { ADMITTED, NARROWED, REFUSED } = require('../constants/rmgStatus');

/**
 * @typedef {Object} RiskMapOutput
 * @property {string} status
 * @property {string} reasonCode
 * @property {string} reason
 * @property {string} domain
 * @property {string} scenarioType
 * @property {string} entity
 * @property {string[]} supportedNodes
 * @property {string[]} supportedThreatVectors
 * @property {string[]} supportedCausalPaths
 * @property {string[]} unsupportedBridges
 * @property {string[]} assumptions
 * @property {string[]} unknowns
 * @property {string[]} falsifiers
 * @property {string|null} boundedConfidenceClass
 * @property {Record<string, unknown>} diagnostics
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string[]} errors
 */

const ALLOWED_STATUSES = Object.freeze([ADMITTED, NARROWED, REFUSED]);
const ALLOWED_CONFIDENCE_CLASSES = Object.freeze([
  LOW_BOUNDED_SUPPORT,
  MEDIUM_BOUNDED_SUPPORT,
  HIGH_BOUNDED_SUPPORT,
]);

function createValidationResult(errors) {
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze([...errors]),
    reasonCode: errors.length === 0 ? null : INVALID_OUTPUT_CONTRACT,
  });
}

function isNonEmptyTrimmedString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateStringArrayField(errors, output, fieldName) {
  const value = output[fieldName];

  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array of strings.`);
    return;
  }

  value.forEach((entry, index) => {
    if (!isNonEmptyTrimmedString(entry)) {
      errors.push(`${fieldName}[${index}] must be a non-empty string.`);
    }
  });
}

/**
 * @param {unknown} value
 * @returns {ValidationResult}
 */
function validateRiskMapOutputContract(value) {
  const errors = [];

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push('RiskMapOutput must be a plain object.');
    return createValidationResult(errors);
  }

  const output = /** @type {Record<string, unknown>} */ (value);

  if (!ALLOWED_STATUSES.includes(/** @type {string} */ (output.status))) {
    errors.push('status must be one of the supported RMG statuses.');
  }

  if (!isNonEmptyTrimmedString(output.reasonCode)) {
    errors.push('reasonCode must be a non-empty string.');
  }

  if (!isNonEmptyTrimmedString(output.reason)) {
    errors.push('reason must be a non-empty string.');
  }

  ['domain', 'scenarioType', 'entity'].forEach((fieldName) => {
    if (!isNonEmptyTrimmedString(output[fieldName])) {
      errors.push(`${fieldName} must be a non-empty string.`);
    }
  });

  [
    'supportedNodes',
    'supportedThreatVectors',
    'supportedCausalPaths',
    'unsupportedBridges',
    'assumptions',
    'unknowns',
    'falsifiers',
  ].forEach((fieldName) => {
    validateStringArrayField(errors, output, fieldName);
  });

  if (
    output.boundedConfidenceClass !== null &&
    !ALLOWED_CONFIDENCE_CLASSES.includes(/** @type {string} */ (output.boundedConfidenceClass))
  ) {
    errors.push('boundedConfidenceClass must be null or one of the supported bounded confidence classes.');
  }

  if (!output.diagnostics || typeof output.diagnostics !== 'object' || Array.isArray(output.diagnostics)) {
    errors.push('diagnostics must be a plain object.');
  }

  return createValidationResult(errors);
}

module.exports = Object.freeze({
  validateRiskMapOutputContract,
});

