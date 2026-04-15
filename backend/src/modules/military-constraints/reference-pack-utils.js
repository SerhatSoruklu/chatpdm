'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { isPlainObject } = require('./fact-schema-utils');

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sortStrings(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
}

function listFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  return fs.readdirSync(directoryPath).filter((name) => name.endsWith('.json'));
}

function resolveModuleRoot(rootDir) {
  return typeof rootDir === 'string' && rootDir.length > 0
    ? rootDir
    : path.resolve(__dirname);
}

function getManifestPaths(moduleRoot) {
  return listFiles(moduleRoot)
    .filter((name) => name.startsWith('reference-pack-manifest') && name.endsWith('.json'))
    .map((name) => path.join(moduleRoot, name))
    .sort((left, right) => path.basename(left).localeCompare(path.basename(right)));
}

function getPackRegistryPath(moduleRoot) {
  return path.join(moduleRoot, 'pack-registry.json');
}

function getReviewedClausePaths(moduleRoot) {
  const reviewedDir = path.join(moduleRoot, 'reviewed-clauses');
  return listFiles(reviewedDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => path.join(reviewedDir, name))
    .sort((left, right) => path.basename(left).localeCompare(path.basename(right)));
}

function getReviewedClauseSetPath(moduleRoot, clauseSetId) {
  return path.join(moduleRoot, 'reviewed-clauses', `${clauseSetId}.json`);
}

function getRegressionFixturePath(moduleRoot, fileName) {
  return path.join(moduleRoot, '__tests__', 'fixtures', 'regression', fileName);
}

function loadPackRegistry(moduleRoot) {
  const registryPath = getPackRegistryPath(moduleRoot);

  if (!fs.existsSync(registryPath)) {
    return null;
  }

  try {
    return readJsonFile(registryPath);
  } catch {
    return null;
  }
}

function buildPackRegistryIndex(packRegistry) {
  const index = new Map();

  if (!Array.isArray(packRegistry)) {
    return index;
  }

  packRegistry.forEach((entry, registryOrder) => {
    if (isPlainObject(entry) && typeof entry.packId === 'string' && entry.packId.length > 0) {
      index.set(entry.packId, {
        entry,
        registryOrder,
      });
    }

    if (isPlainObject(entry) && typeof entry.manifestPackId === 'string' && entry.manifestPackId.length > 0) {
      index.set(entry.manifestPackId, {
        entry,
        registryOrder,
      });
    }
  });

  return index;
}

function validatePackRegistry(packRegistry) {
  const result = {
    valid: true,
    reasonCode: null,
    errors: [],
  };

  function fail(reasonCode, message) {
    result.valid = false;
    if (result.reasonCode === null) {
      result.reasonCode = reasonCode;
    }
    result.errors.push(message);
  }

  if (packRegistry === null) {
    return Object.freeze({
      valid: true,
      reasonCode: null,
      errors: Object.freeze([]),
    });
  }

  if (!Array.isArray(packRegistry) || packRegistry.length === 0) {
    fail('POLICY_BUNDLE_INVALID', 'pack registry must be a non-empty array.');
    return Object.freeze({
      valid: result.valid,
      reasonCode: result.reasonCode,
      errors: Object.freeze([...result.errors]),
    });
  }

  const packIndex = new Map();
  const seenPackIds = new Set();
  const seenManifestPackIds = new Set();

  packRegistry.forEach((entry, registryOrder) => {
    if (!isPlainObject(entry)) {
      fail('POLICY_BUNDLE_INVALID', `registry entry ${registryOrder} must be a plain object.`);
      return;
    }

    if (typeof entry.packId !== 'string' || entry.packId.length === 0) {
      fail('POLICY_BUNDLE_INVALID', `registry entry ${registryOrder} is missing packId.`);
      return;
    }

    if (seenPackIds.has(entry.packId)) {
      fail('POLICY_BUNDLE_INVALID', `duplicate registry packId "${entry.packId}".`);
      return;
    }
    seenPackIds.add(entry.packId);
    packIndex.set(entry.packId, registryOrder);

    if (typeof entry.manifestPackId === 'string' && entry.manifestPackId.length > 0) {
      if (seenManifestPackIds.has(entry.manifestPackId)) {
        fail('POLICY_BUNDLE_INVALID', `duplicate registry manifestPackId "${entry.manifestPackId}".`);
      }
      seenManifestPackIds.add(entry.manifestPackId);
    } else if (Object.prototype.hasOwnProperty.call(entry, 'manifestPackId')) {
      fail('POLICY_BUNDLE_INVALID', `registry packId "${entry.packId}" has invalid manifestPackId.`);
    }

    if (!['foundation', 'domain', 'overlay', 'umbrella-label'].includes(entry.kind)) {
      fail('POLICY_BUNDLE_INVALID', `registry packId "${entry.packId}" has invalid kind.`);
    }

    if (!['baseline', 'admitted', 'planned'].includes(entry.status)) {
      fail('POLICY_BUNDLE_INVALID', `registry packId "${entry.packId}" has invalid status.`);
    }

    if (!Array.isArray(entry.dependsOn)) {
      fail('POLICY_BUNDLE_INVALID', `registry packId "${entry.packId}" must define dependsOn as an array.`);
      return;
    }

    const seenDependencies = new Set();
    entry.dependsOn.forEach((dependencyId) => {
      if (typeof dependencyId !== 'string' || dependencyId.length === 0) {
        fail('POLICY_BUNDLE_INVALID', `registry packId "${entry.packId}" contains an invalid dependsOn entry.`);
        return;
      }

      if (seenDependencies.has(dependencyId)) {
        fail('POLICY_BUNDLE_INVALID', `registry packId "${entry.packId}" contains duplicate dependency "${dependencyId}".`);
        return;
      }
      seenDependencies.add(dependencyId);

      if (!packIndex.has(dependencyId)) {
        fail('POLICY_BUNDLE_INVALID', `registry packId "${entry.packId}" depends on unknown packId "${dependencyId}".`);
        return;
      }

      const dependencyOrder = packIndex.get(dependencyId);
      if (dependencyOrder >= registryOrder) {
        fail('POLICY_BUNDLE_INVALID', `registry packId "${entry.packId}" must appear after dependency "${dependencyId}".`);
      }
    });
  });

  return Object.freeze({
    valid: result.valid,
    reasonCode: result.reasonCode,
    errors: Object.freeze([...result.errors]),
  });
}

function buildSourceRegistryIndex(sourceRegistry) {
  const index = new Map();

  if (!Array.isArray(sourceRegistry)) {
    return index;
  }

  sourceRegistry.forEach((entry) => {
    if (isPlainObject(entry) && typeof entry.sourceId === 'string' && entry.sourceId.length > 0) {
      index.set(entry.sourceId, entry);
    }
  });

  return index;
}

function loadManifest(moduleRoot, manifestFile) {
  const manifestPath = typeof manifestFile === 'string' && manifestFile.length > 0
    ? path.isAbsolute(manifestFile)
      ? manifestFile
      : path.join(moduleRoot, manifestFile)
    : path.join(moduleRoot, 'reference-pack-manifest.json');

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  return readJsonFile(manifestPath);
}

module.exports = {
  buildSourceRegistryIndex,
  buildPackRegistryIndex,
  getPackRegistryPath,
  getManifestPaths,
  getRegressionFixturePath,
  getReviewedClausePaths,
  getReviewedClauseSetPath,
  listFiles,
  loadPackRegistry,
  loadManifest,
  readJsonFile,
  resolveModuleRoot,
  validatePackRegistry,
  sortStrings,
};
