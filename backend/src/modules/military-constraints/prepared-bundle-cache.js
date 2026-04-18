'use strict';

const { isPlainObject } = require('./fact-schema-utils');
const { buildReferenceBundle } = require('./build-reference-pack');
const { createPreparedBundle } = require('./prepared-bundle-contract');

function makePreparedBundleCacheEntry({ packId, manifestPath, build }) {
  const preparedBundle = build && build.bundle ? createPreparedBundle(build.bundle) : null;

  if (!build || !build.valid || !build.bundle || !preparedBundle || !build.metadata) {
    return Object.freeze({
      packId,
      manifestPath,
      valid: false,
      reasonCode: build && typeof build.reasonCode === 'string' ? build.reasonCode : 'POLICY_BUNDLE_INVALID',
      errors: build && Array.isArray(build.errors) ? Object.freeze([...build.errors]) : Object.freeze(['bundle preparation failed.']),
      bundle: null,
      preparedBundle: null,
      metadata: null,
    });
  }

  return Object.freeze({
    packId,
    manifestPath,
    valid: true,
    reasonCode: null,
    errors: Object.freeze([]),
    bundle: build.bundle,
    preparedBundle,
    metadata: build.metadata,
  });
}

function createPreparedBundleCache(input) {
  const rootDir = isPlainObject(input) && typeof input.rootDir === 'string' && input.rootDir.length > 0
    ? input.rootDir
    : null;
  const packIndex = isPlainObject(input) && Array.isArray(input.packIndex)
    ? input.packIndex
    : [];

  const cache = new Map();

  if (rootDir === null) {
    return Object.freeze({
      get: (packId) => (cache.has(packId) ? cache.get(packId) : null),
      has: (packId) => cache.has(packId),
      size: cache.size,
    });
  }

  packIndex.forEach((packRecord) => {
    if (!isPlainObject(packRecord) || typeof packRecord.packId !== 'string' || packRecord.packId.length === 0) {
      return;
    }

    if (typeof packRecord.manifestPath !== 'string' || packRecord.manifestPath.length === 0) {
      cache.set(packRecord.packId, makePreparedBundleCacheEntry({
        packId: packRecord.packId,
        manifestPath: null,
        build: null,
      }));
      return;
    }

    const build = buildReferenceBundle({
      rootDir,
      manifestPath: packRecord.manifestPath,
    });

    cache.set(packRecord.packId, makePreparedBundleCacheEntry({
      packId: packRecord.packId,
      manifestPath: packRecord.manifestPath,
      build,
    }));
  });

  return Object.freeze({
    get(packId) {
      return cache.has(packId) ? cache.get(packId) : null;
    },
    has(packId) {
      return cache.has(packId);
    },
    size: cache.size,
  });
}

module.exports = {
  createPreparedBundleCache,
};
