'use strict';

const SUPPORTED_PATH_PATTERN = /^[a-z0-9_]+->[a-z0-9_]+$/;
const UNSUPPORTED_BRIDGE_PATTERN = /^[a-z0-9_]+:[a-z0-9_]+(?:->[a-z0-9_]+)?$/;
const FALSIFIER_PATTERN = /^[a-z0-9_]+@[a-z0-9_]+$/;
const COMPACT_IDENTIFIER_PATTERN = /^[a-z0-9_]+$/;
const COMPACT_ALLOWED_CHAR_PATTERN = /^[a-z0-9_:@>-]+$/;

function isString(value) {
  return typeof value === 'string';
}

function isSortedUnique(values) {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1] >= values[index]) {
      return false;
    }
  }

  return true;
}

function validateCompactStringArray(values, label, pattern, errors) {
  if (!Array.isArray(values)) {
    errors.push(`${label} must be an array of strings.`);
    return;
  }

  let previousValue = null;
  const seen = new Set();

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (!isString(value)) {
      errors.push(`${label}[${index}] must be a string.`);
      continue;
    }

    if (!pattern.test(value)) {
      errors.push(`${label}[${index}] does not match the compact output format.`);
    }

    if (/\s/.test(value)) {
      errors.push(`${label}[${index}] must not contain whitespace.`);
    }

    if (!COMPACT_ALLOWED_CHAR_PATTERN.test(value)) {
      errors.push(`${label}[${index}] contains unsupported characters.`);
    }

    if (previousValue !== null && previousValue > value) {
      errors.push(`${label} must be sorted in ascending order.`);
    }

    if (seen.has(value)) {
      errors.push(`${label} must not contain duplicate values.`);
    }

    seen.add(value);
    previousValue = value;
  }
}

/**
 * @param {unknown} output
 * @returns {{ valid: boolean, errors: string[], reasonCode: string | null }}
 */
function validateCompactOutputFormats(output) {
  const errors = [];

  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    errors.push('Compact output must be a plain object.');
    return {
      valid: false,
      errors,
      reasonCode: 'INVALID_OUTPUT_CONTRACT',
    };
  }

  const value = /** @type {Record<string, unknown>} */ (output);

  validateCompactStringArray(value.supportedNodes, 'supportedNodes', COMPACT_IDENTIFIER_PATTERN, errors);
  validateCompactStringArray(value.supportedThreatVectors, 'supportedThreatVectors', COMPACT_IDENTIFIER_PATTERN, errors);
  validateCompactStringArray(value.supportedCausalPaths, 'supportedCausalPaths', SUPPORTED_PATH_PATTERN, errors);
  validateCompactStringArray(value.unsupportedBridges, 'unsupportedBridges', UNSUPPORTED_BRIDGE_PATTERN, errors);
  validateCompactStringArray(value.assumptions, 'assumptions', COMPACT_IDENTIFIER_PATTERN, errors);
  validateCompactStringArray(value.unknowns, 'unknowns', COMPACT_IDENTIFIER_PATTERN, errors);
  validateCompactStringArray(value.falsifiers, 'falsifiers', FALSIFIER_PATTERN, errors);

  return {
    valid: errors.length === 0,
    errors,
    reasonCode: errors.length === 0 ? null : 'INVALID_OUTPUT_CONTRACT',
  };
}

module.exports = Object.freeze({
  COMPACT_IDENTIFIER_PATTERN,
  FALSIFIER_PATTERN,
  SUPPORTED_PATH_PATTERN,
  UNSUPPORTED_BRIDGE_PATTERN,
  COMPACT_ALLOWED_CHAR_PATTERN,
  isSortedUnique,
  validateCompactOutputFormats,
});
