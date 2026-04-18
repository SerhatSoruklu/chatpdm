'use strict';

const {
  hasPreparedBundleMark,
  markPreparedBundle,
} = require('./bundle-preparation');
const {
  isPlainObject,
} = require('./fact-schema-utils');

function isPreparedBundleContract(value) {
  return isPlainObject(value)
    && value.kind === 'prepared-bundle'
    && isPlainObject(value.bundle)
    && typeof value.bundleId === 'string'
    && value.bundleId.length > 0
    && typeof value.bundleVersion === 'string'
    && value.bundleVersion.length > 0
    && typeof value.bundleHash === 'string'
    && value.bundleHash.length > 0;
}

function createPreparedBundle(bundle) {
  if (!isPlainObject(bundle)) {
    return null;
  }

  markPreparedBundle(bundle);

  return Object.freeze({
    kind: 'prepared-bundle',
    bundleId: typeof bundle.bundleId === 'string' ? bundle.bundleId : null,
    bundleVersion: typeof bundle.bundleVersion === 'string' ? bundle.bundleVersion : null,
    bundleHash: typeof bundle.bundleHash === 'string' ? bundle.bundleHash : null,
    bundle,
  });
}

function resolvePreparedBundleContract(input) {
  if (!isPlainObject(input)) {
    return null;
  }

  if (isPreparedBundleContract(input.preparedBundle)) {
    return input.preparedBundle;
  }

  if (isPreparedBundleContract(input.bundle)) {
    return input.bundle;
  }

  if (hasPreparedBundleMark(input.bundle)) {
    return createPreparedBundle(input.bundle);
  }

  return null;
}

module.exports = {
  createPreparedBundle,
  isPreparedBundleContract,
  resolvePreparedBundleContract,
};
