'use strict';

const { stableSort } = require('./stableSort');

/**
 * @param {readonly string[]} values
 * @returns {readonly string[]}
 */
function stableUniqueStrings(values) {
  if (!Array.isArray(values)) {
    throw new TypeError('stableUniqueStrings requires an array.');
  }

  const seen = new Set();
  const unique = [];

  for (const value of values) {
    if (typeof value !== 'string') {
      throw new TypeError('stableUniqueStrings requires an array of strings.');
    }

    if (!seen.has(value)) {
      seen.add(value);
      unique.push(value);
    }
  }

  return Object.freeze(stableSort(unique));
}

module.exports = Object.freeze({
  stableUniqueStrings,
});
