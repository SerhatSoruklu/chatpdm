'use strict';

const {
  LOW_BOUNDED_SUPPORT,
  MEDIUM_BOUNDED_SUPPORT,
  HIGH_BOUNDED_SUPPORT,
} = require('../constants/rmgConfidenceClasses');
const {
  validateCompactOutputFormats,
  SUPPORTED_PATH_PATTERN,
  FALSIFIER_PATTERN,
  COMPACT_IDENTIFIER_PATTERN,
} = require('../utils/validateCompactOutputFormats');
const { assertSortedUniqueStringArray } = require('../utils/assertSortedUniqueStringArray');

const ALLOWED_OUTPUT_KEYS = Object.freeze([
  'status',
  'reasonCode',
  'reason',
  'domain',
  'scenarioType',
  'entity',
  'supportedNodes',
  'supportedThreatVectors',
  'supportedCausalPaths',
  'unsupportedBridges',
  'assumptions',
  'unknowns',
  'falsifiers',
  'boundedConfidenceClass',
  'diagnostics',
]);

const ALLOWED_DIAGNOSTIC_KEYS = Object.freeze([
  'hasBroadCollapseLanguage',
  'hasUnsupportedFraming',
  'admittedScopes',
  'narrowedFromScopes',
  'refusedScopes',
  'supportedNodeIds',
  'unsupportedNodeIds',
  'supportedThreatIds',
  'unsupportedThreatIds',
]);

const ALLOWED_UNSUPPORTED_BRIDGE_PATTERNS = Object.freeze([
  /^missing_compatibility_rule:[a-z0-9_]+->[a-z0-9_]+$/,
  /^broad_collapse_overreach:[a-z0-9_]+$/,
  /^unsupported_threat_evidence:[a-z0-9_]+->[a-z0-9_]+$/,
  /^unsupported_node_evidence:[a-z0-9_]+->[a-z0-9_]+$/,
  /^scope_not_admitted:[a-z0-9_]+$/,
]);

function validateAllowedKeys(output, errors) {
  const keys = Object.keys(output);

  if (keys.length !== ALLOWED_OUTPUT_KEYS.length) {
    errors.push('Resolve output must contain only the frozen contract fields.');
    return;
  }

  for (const key of ALLOWED_OUTPUT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(output, key)) {
      errors.push(`Resolve output is missing required key: ${key}`);
    }
  }

  for (const key of keys) {
    if (!ALLOWED_OUTPUT_KEYS.includes(key)) {
      errors.push(`Resolve output contains unexpected key: ${key}`);
    }
  }
}

function validateDiagnostics(diagnostics, errors) {
  if (!diagnostics || typeof diagnostics !== 'object' || Array.isArray(diagnostics)) {
    errors.push('diagnostics must be a plain object.');
    return;
  }

  const keys = Object.keys(diagnostics);

  if (keys.length !== ALLOWED_DIAGNOSTIC_KEYS.length) {
    errors.push('diagnostics must contain only frozen contract fields.');
  }

  for (const key of ALLOWED_DIAGNOSTIC_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(diagnostics, key)) {
      errors.push(`diagnostics is missing required key: ${key}`);
    }
  }

  for (const key of keys) {
    if (!ALLOWED_DIAGNOSTIC_KEYS.includes(key)) {
      errors.push(`diagnostics contains unexpected key: ${key}`);
    }
  }

  if (typeof diagnostics.hasBroadCollapseLanguage !== 'boolean') {
    errors.push('diagnostics.hasBroadCollapseLanguage must be a boolean.');
  }

  if (typeof diagnostics.hasUnsupportedFraming !== 'boolean') {
    errors.push('diagnostics.hasUnsupportedFraming must be a boolean.');
  }

  const arrayFields = [
    'admittedScopes',
    'narrowedFromScopes',
    'refusedScopes',
    'supportedNodeIds',
    'unsupportedNodeIds',
    'supportedThreatIds',
    'unsupportedThreatIds',
  ];

  for (const fieldName of arrayFields) {
    const fieldValue = diagnostics[fieldName];

    if (!Array.isArray(fieldValue)) {
      errors.push(`diagnostics.${fieldName} must be an array of strings.`);
      continue;
    }

    assertSortedUniqueStringArray(fieldValue, `diagnostics.${fieldName}`);
  }
}

function validateCompactArray(values, label, pattern, errors) {
  if (!Array.isArray(values)) {
    errors.push(`${label} must be an array of strings.`);
    return;
  }

  try {
    assertSortedUniqueStringArray(values, label);
  } catch {
    errors.push('diagnostics field validation failed.');
    return;
  }

  for (const value of values) {
    if (!pattern.test(value)) {
      errors.push(`${label} contains a value that does not match the frozen compact format.`);
    }
  }
}

function validateUnsupportedBridgeValues(values, errors) {
  if (!Array.isArray(values)) {
    errors.push('unsupportedBridges must be an array of strings.');
    return;
  }

  try {
    assertSortedUniqueStringArray(values, 'unsupportedBridges');
  } catch {
    errors.push('unsupportedBridges field validation failed.');
    return;
  }

  for (const value of values) {
    if (!ALLOWED_UNSUPPORTED_BRIDGE_PATTERNS.some((pattern) => pattern.test(value))) {
      errors.push(`unsupportedBridges contains an unsupported frozen bridge format: ${value}`);
    }
  }
}

/**
 * @param {unknown} value
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateRmgFreezeInvariants(value) {
  const errors = [];

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('validateRmgFreezeInvariants requires a plain resolve output object.');
  }

  const output = /** @type {Record<string, unknown>} */ (value);

  validateAllowedKeys(output, errors);

  ['status', 'reasonCode', 'reason', 'domain', 'scenarioType', 'entity'].forEach((fieldName) => {
    if (typeof output[fieldName] !== 'string' || output[fieldName].trim().length === 0) {
      errors.push(`${fieldName} must be a non-empty string.`);
    }
  });

  if (typeof output.boundedConfidenceClass !== 'string' || ![LOW_BOUNDED_SUPPORT, MEDIUM_BOUNDED_SUPPORT, HIGH_BOUNDED_SUPPORT].includes(output.boundedConfidenceClass)) {
    errors.push('boundedConfidenceClass must be one of the frozen bounded confidence classes.');
  }

  validateDiagnostics(output.diagnostics, errors);

  const stringArrayFields = [
    ['supportedNodes', COMPACT_IDENTIFIER_PATTERN],
    ['supportedThreatVectors', COMPACT_IDENTIFIER_PATTERN],
    ['supportedCausalPaths', SUPPORTED_PATH_PATTERN],
    ['assumptions', COMPACT_IDENTIFIER_PATTERN],
    ['unknowns', COMPACT_IDENTIFIER_PATTERN],
    ['falsifiers', FALSIFIER_PATTERN],
  ];

  for (const [fieldName, pattern] of stringArrayFields) {
    validateCompactArray(/** @type {string[]} */ (output[fieldName]), fieldName, pattern, errors);
  }

  validateUnsupportedBridgeValues(/** @type {string[]} */ (output.unsupportedBridges), errors);

  const compactValidation = validateCompactOutputFormats(output);
  if (!compactValidation.valid) {
    errors.push(...compactValidation.errors);
  }

  if (output.supportedCausalPaths && Array.isArray(output.supportedCausalPaths)) {
    for (const path of output.supportedCausalPaths) {
      if (path.includes('->->') || path.split('->').length !== 2) {
        errors.push(`supportedCausalPaths contains a non-direct path: ${path}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`RMG freeze invariant violation: ${errors.join(' | ')}`);
  }

  return Object.freeze({
    valid: true,
    errors: Object.freeze([]),
  });
}

module.exports = Object.freeze({
  ALLOWED_OUTPUT_KEYS,
  ALLOWED_DIAGNOSTIC_KEYS,
  validateRmgFreezeInvariants,
});
