'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { isPlainObject } = require('./fact-schema-utils');

const AUTHORITY_GRAPH_FIXTURE_BY_ID = {
  'AUTH-GRAPH-US-001': 'authority-graph.json',
  'AUTH-GRAPH-INTL-001': 'authority-graph-intl.json',
  'AUTH-GRAPH-UK-001': 'authority-graph-uk.json',
  'AUTH-GRAPH-CA-001': 'authority-graph-ca.json',
  'AUTH-GRAPH-AU-001': 'authority-graph-au.json',
  'AUTH-GRAPH-NL-001': 'authority-graph-nl.json',
  'AUTH-GRAPH-TR-001': 'authority-graph-tr.json',
  'AUTH-GRAPH-NATO-001': 'authority-graph-nato.json',
};

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sortStrings(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function sortSourceRefs(sourceRefs) {
  if (!Array.isArray(sourceRefs)) {
    return [];
  }

  return sourceRefs
    .filter((entry) => isPlainObject(entry))
    .map((entry) => ({
      sourceId: isNonEmptyString(entry.sourceId) ? entry.sourceId : '',
      locator: isNonEmptyString(entry.locator) ? entry.locator : '',
    }))
    .filter((entry) => isNonEmptyString(entry.sourceId) && isNonEmptyString(entry.locator))
    .sort((left, right) => {
      if (left.sourceId !== right.sourceId) {
        return left.sourceId.localeCompare(right.sourceId);
      }

      return left.locator.localeCompare(right.locator);
    });
}

const REVIEWED_CLAUSE_DERIVATION_TYPES = new Set([
  'DIRECT',
  'INTERPRETED',
  'COMPOSED',
  'ILLUSTRATIVE',
]);

function isLocatorBoundToSource(sourceLocator, locator) {
  if (!isNonEmptyString(sourceLocator) || !isNonEmptyString(locator)) {
    return false;
  }

  return locator === sourceLocator || locator.startsWith(`${sourceLocator}/`);
}

function isReviewedClauseProvenance(provenance) {
  return isPlainObject(provenance)
    && isNonEmptyString(provenance.derivationType)
    && REVIEWED_CLAUSE_DERIVATION_TYPES.has(provenance.derivationType)
    && isNonEmptyString(provenance.transformationNotes)
    && Array.isArray(provenance.parentClauseIds)
    && provenance.parentClauseIds.every(isNonEmptyString)
    && new Set(provenance.parentClauseIds).size === provenance.parentClauseIds.length;
}

function normalizeReviewedClauseProvenance(provenance) {
  if (!isReviewedClauseProvenance(provenance)) {
    return null;
  }

  return {
    derivationType: provenance.derivationType,
    transformationNotes: provenance.transformationNotes,
    parentClauseIds: sortStrings(provenance.parentClauseIds),
  };
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

function getAuthorityGraphPath(moduleRoot, manifest) {
  const authorityGraphId = isPlainObject(manifest) && typeof manifest.authorityGraphId === 'string'
    ? manifest.authorityGraphId
    : null;

  if (typeof authorityGraphId === 'string' && authorityGraphId.length > 0) {
    const fixtureName = AUTHORITY_GRAPH_FIXTURE_BY_ID[authorityGraphId];
    if (typeof fixtureName === 'string' && fixtureName.length > 0) {
      return path.join(moduleRoot, '__tests__', 'fixtures', fixtureName);
    }

    return null;
  }

  return null;
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

function makeSourceRegistryIndexResult() {
  return {
    valid: true,
    reasonCode: null,
    errors: [],
    sourceIndex: new Map(),
  };
}

function failSourceRegistryIndex(result, reasonCode, message) {
  result.valid = false;
  if (result.reasonCode === null) {
    result.reasonCode = reasonCode;
  }
  result.errors.push(message);
}

function finishSourceRegistryIndex(result) {
  return Object.freeze({
    valid: result.valid,
    reasonCode: result.reasonCode,
    errors: Object.freeze([...result.errors]),
    sourceIndex: result.valid ? result.sourceIndex : new Map(),
  });
}

function buildSourceRegistryIndex(sourceRegistry) {
  const result = makeSourceRegistryIndexResult();

  if (!Array.isArray(sourceRegistry)) {
    return finishSourceRegistryIndex(result);
  }

  const seenSourceIds = new Set();

  sourceRegistry.forEach((entry) => {
    if (!isPlainObject(entry) || typeof entry.sourceId !== 'string' || entry.sourceId.length === 0) {
      return;
    }

    if (seenSourceIds.has(entry.sourceId)) {
      failSourceRegistryIndex(
        result,
        'POLICY_BUNDLE_INVALID',
        `duplicate sourceId "${entry.sourceId}" in source registry.`,
      );
      return;
    }

    seenSourceIds.add(entry.sourceId);
    result.sourceIndex.set(entry.sourceId, entry);
  });

  return finishSourceRegistryIndex(result);
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
  getAuthorityGraphPath,
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
  sortSourceRefs,
  isLocatorBoundToSource,
  isNonEmptyString,
  isReviewedClauseProvenance,
  normalizeReviewedClauseProvenance,
};
