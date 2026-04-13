'use strict';

const {
  getManifestPaths,
  readJsonFile,
  resolveModuleRoot,
} = require('./reference-pack-utils');
const { isPlainObject } = require('./fact-schema-utils');

function listReferencePacks(input) {
  const rootDir = isPlainObject(input) && typeof input.rootDir === 'string' && input.rootDir.length > 0
    ? resolveModuleRoot(input.rootDir)
    : null;

  if (rootDir === null) {
    return [];
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
          manifestPath,
        };
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
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
