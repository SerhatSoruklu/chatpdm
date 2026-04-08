'use strict';

/**
 * @template T
 * @param {readonly T[]} entries
 * @param {(entry: T) => string} getId
 * @returns {Readonly<Record<string, T>>}
 */
function buildLookupMap(entries, getId) {
  if (!Array.isArray(entries)) {
    throw new TypeError('buildLookupMap requires an array of entries.');
  }

  if (typeof getId !== 'function') {
    throw new TypeError('buildLookupMap requires an id selector function.');
  }

  const lookup = Object.create(null);

  for (const entry of entries) {
    const id = getId(entry);

    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new TypeError('buildLookupMap requires each entry id to be a non-empty string.');
    }

    if (Object.prototype.hasOwnProperty.call(lookup, id)) {
      throw new Error(`Duplicate id detected: ${id}`);
    }

    lookup[id] = entry;
  }

  return Object.freeze(lookup);
}

module.exports = Object.freeze({
  buildLookupMap,
});

