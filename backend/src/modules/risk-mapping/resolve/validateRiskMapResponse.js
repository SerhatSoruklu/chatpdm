'use strict';

const { validateRiskMapOutputContract } = require('../contracts/riskMapOutputContract');
const { freezePlainObject } = require('../utils/freezePlainObject');
const { stableUniqueStrings } = require('../utils/stableUniqueStrings');
const { validateCompactOutputFormats } = require('../utils/validateCompactOutputFormats');
const {
  LOW_BOUNDED_SUPPORT,
  MEDIUM_BOUNDED_SUPPORT,
  HIGH_BOUNDED_SUPPORT,
} = require('../constants/rmgConfidenceClasses');

function hasExpectedDiagnosticsShape(diagnostics) {
  const allowedKeys = [
    'hasBroadCollapseLanguage',
    'hasUnsupportedFraming',
    'admittedScopes',
    'narrowedFromScopes',
    'refusedScopes',
    'supportedNodeIds',
    'unsupportedNodeIds',
    'supportedThreatIds',
    'unsupportedThreatIds',
  ];

  return (
    Object.keys(diagnostics).length === allowedKeys.length &&
    allowedKeys.every((key) => Object.prototype.hasOwnProperty.call(diagnostics, key))
  );
}

function arraysEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

/**
 * @param {unknown} value
 * @returns {{ valid: boolean, errors: string[], reasonCode: string | null }}
 */
function validateRiskMapResponse(value) {
  const contractValidation = validateRiskMapOutputContract(value);
  const errors = [...contractValidation.errors];

  if (!contractValidation.valid) {
    return contractValidation;
  }

  const response = /** @type {Record<string, unknown>} */ (value);

  const allowedConfidenceClasses = [LOW_BOUNDED_SUPPORT, MEDIUM_BOUNDED_SUPPORT, HIGH_BOUNDED_SUPPORT];

  if (!allowedConfidenceClasses.includes(/** @type {string} */ (response.boundedConfidenceClass))) {
    errors.push('boundedConfidenceClass must be one of the supported bounded confidence classes.');
  }

  if (!response.diagnostics || typeof response.diagnostics !== 'object' || Array.isArray(response.diagnostics)) {
    errors.push('diagnostics must be a plain object.');
  } else {
    const diagnostics = /** @type {Record<string, unknown>} */ (response.diagnostics);

    if (!hasExpectedDiagnosticsShape(diagnostics)) {
      errors.push('diagnostics is missing required bounded fields.');
    }

    const stringArrayFields = [
      'admittedScopes',
      'narrowedFromScopes',
      'refusedScopes',
      'supportedNodeIds',
      'unsupportedNodeIds',
      'supportedThreatIds',
      'unsupportedThreatIds',
    ];

    for (const fieldName of stringArrayFields) {
      try {
        if (!Array.isArray(diagnostics[fieldName])) {
          errors.push(`diagnostics.${fieldName} must be an array of strings.`);
          continue;
        }

        const uniqueSorted = stableUniqueStrings(/** @type {string[]} */ (diagnostics[fieldName]));
        if (!arraysEqual(uniqueSorted, /** @type {string[]} */ (diagnostics[fieldName]))) {
          errors.push(`diagnostics.${fieldName} must be sorted and deduplicated.`);
        }
      } catch {
        errors.push(`diagnostics.${fieldName} must contain only strings.`);
      }
    }
  }

  const compactValidation = validateCompactOutputFormats(response);
  if (!compactValidation.valid) {
    errors.push(...compactValidation.errors);
  }

  if (response.status === 'refused' && response.boundedConfidenceClass !== LOW_BOUNDED_SUPPORT) {
    errors.push('refused responses must use LOW_BOUNDED_SUPPORT.');
  }

  if (typeof response.status === 'string' && typeof response.reasonCode === 'string') {
    if (response.status === 'refused' && response.reasonCode === 'ADMISSIBLE_QUERY') {
      errors.push('refused responses must not use the admissible query reason code.');
    }
  }

  if (response.status === 'refused') {
    const emptyArrayFields = [
      'supportedNodes',
      'supportedThreatVectors',
      'supportedCausalPaths',
      'unsupportedBridges',
      'assumptions',
      'unknowns',
      'falsifiers',
    ];

    for (const fieldName of emptyArrayFields) {
      if (Array.isArray(response[fieldName]) && response[fieldName].length > 0) {
        errors.push(`refused responses must keep ${fieldName} empty.`);
      }
    }
  }

  return freezePlainObject({
    valid: errors.length === 0,
    errors,
    reasonCode: errors.length === 0 ? null : 'INVALID_OUTPUT_CONTRACT',
  });
}

module.exports = Object.freeze({
  validateRiskMapResponse,
});
