'use strict';

// Internal marker only. The explicit prepared-bundle wrapper is the contract boundary.
const PREPARED_BUNDLE_MARK = Symbol('chatpdm.militaryConstraints.preparedBundle');

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function markPreparedBundle(bundle) {
  if (!isPlainObject(bundle)) {
    return false;
  }

  if (Object.prototype.hasOwnProperty.call(bundle, PREPARED_BUNDLE_MARK)) {
    return true;
  }

  if (!Object.isExtensible(bundle)) {
    return false;
  }

  Object.defineProperty(bundle, PREPARED_BUNDLE_MARK, {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false,
  });

  return true;
}

function hasPreparedBundleMark(bundle) {
  return isPlainObject(bundle)
    && Object.prototype.hasOwnProperty.call(bundle, PREPARED_BUNDLE_MARK);
}

module.exports = {
  hasPreparedBundleMark,
  markPreparedBundle,
};
