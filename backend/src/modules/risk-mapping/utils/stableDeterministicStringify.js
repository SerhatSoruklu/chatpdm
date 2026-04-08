'use strict';

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeJsonValue(value) {
  if (value === null) {
    return null;
  }

  const valueType = typeof value;

  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJsonValue(entry));
  }

  if (isPlainObject(value)) {
    const normalized = Object.create(null);

    for (const key of Object.keys(value).sort()) {
      normalized[key] = normalizeJsonValue(value[key]);
    }

    return normalized;
  }

  throw new TypeError('stableDeterministicStringify only supports JSON-safe plain data.');
}

/**
 * @param {unknown} value
 * @param {{ space?: string | number }} [options]
 * @returns {string}
 */
function stableDeterministicStringify(value, options = {}) {
  return JSON.stringify(normalizeJsonValue(value), null, options.space);
}

module.exports = Object.freeze({
  stableDeterministicStringify,
});
