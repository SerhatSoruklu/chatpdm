'use strict';

const {
  buildPackRegistryIndex,
  getManifestPaths,
  loadPackRegistry,
  readJsonFile,
  resolveModuleRoot,
  validatePackRegistry,
} = require('./reference-pack-utils');
const { isPlainObject } = require('./fact-schema-utils');

function listReferencePacks(input) {
  const rootDir = isPlainObject(input) && typeof input.rootDir === 'string' && input.rootDir.length > 0
    ? resolveModuleRoot(input.rootDir)
    : null;

  if (rootDir === null) {
    return [];
  }

  const packRegistry = loadPackRegistry(rootDir);
  const registryPresent = Array.isArray(packRegistry);
  const packRegistryIndex = registryPresent ? buildPackRegistryIndex(packRegistry) : new Map();

  if (registryPresent) {
    const registryValidation = validatePackRegistry(packRegistry);
    if (!registryValidation.valid) {
      return [];
    }
  }

  return getManifestPaths(rootDir)
    .map((manifestPath) => {
      try {
        const manifest = readJsonFile(manifestPath);
        if (!isPlainObject(manifest)) {
          return null;
        }

        if (typeof manifest.packId !== 'string' || typeof manifest.bundleId !== 'string' || typeof manifest.bundleVersion !== 'string') {
          return null;
        }

        return {
          packId: manifest.packId,
          bundleId: manifest.bundleId,
          bundleVersion: manifest.bundleVersion,
          jurisdiction: typeof manifest.jurisdiction === 'string' ? manifest.jurisdiction : null,
          authorityGraphId: typeof manifest.authorityGraphId === 'string' ? manifest.authorityGraphId : null,
          reviewedClauseSetIds: Array.isArray(manifest.reviewedClauseSetIds) ? [...manifest.reviewedClauseSetIds] : [],
          kind: packRegistryIndex.has(manifest.packId) ? packRegistryIndex.get(manifest.packId).entry.kind : null,
          status: packRegistryIndex.has(manifest.packId) ? packRegistryIndex.get(manifest.packId).entry.status : null,
          dependsOn: packRegistryIndex.has(manifest.packId) ? [...packRegistryIndex.get(manifest.packId).entry.dependsOn] : [],
          overlayFamily: packRegistryIndex.has(manifest.packId) && typeof packRegistryIndex.get(manifest.packId).entry.overlayFamily === 'string'
            ? packRegistryIndex.get(manifest.packId).entry.overlayFamily
            : null,
          overlayBoundary: packRegistryIndex.has(manifest.packId) && typeof packRegistryIndex.get(manifest.packId).entry.overlayBoundary === 'string'
            ? packRegistryIndex.get(manifest.packId).entry.overlayBoundary
            : null,
          overlayScope: packRegistryIndex.has(manifest.packId) && typeof packRegistryIndex.get(manifest.packId).entry.overlayScope === 'string'
            ? packRegistryIndex.get(manifest.packId).entry.overlayScope
            : null,
          registryOrder: packRegistryIndex.has(manifest.packId) ? packRegistryIndex.get(manifest.packId).registryOrder : null,
          registryPresent,
          manifestPath,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftRegistryOrder = Number.isInteger(left.registryOrder) ? left.registryOrder : null;
      const rightRegistryOrder = Number.isInteger(right.registryOrder) ? right.registryOrder : null;

      if (leftRegistryOrder !== null || rightRegistryOrder !== null) {
        if (leftRegistryOrder === null) {
          return 1;
        }

        if (rightRegistryOrder === null) {
          return -1;
        }

        if (leftRegistryOrder !== rightRegistryOrder) {
          return leftRegistryOrder - rightRegistryOrder;
        }
      }

      const leftPack = String(left.packId);
      const rightPack = String(right.packId);
      if (leftPack !== rightPack) {
        return leftPack.localeCompare(rightPack);
      }

      const leftBundle = String(left.bundleId);
      const rightBundle = String(right.bundleId);
      if (leftBundle !== rightBundle) {
        return leftBundle.localeCompare(rightBundle);
      }

      return String(left.manifestPath).localeCompare(String(right.manifestPath));
    });
}

module.exports = {
  listReferencePacks,
};
