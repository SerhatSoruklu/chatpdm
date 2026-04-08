'use strict';

/**
 * @param {Record<string, unknown>} value
 * @returns {Readonly<Record<string, unknown>>}
 */
function freezePlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('freezePlainObject requires a plain object.');
  }

  return Object.freeze({ ...value });
}

module.exports = Object.freeze({
  freezePlainObject,
});
