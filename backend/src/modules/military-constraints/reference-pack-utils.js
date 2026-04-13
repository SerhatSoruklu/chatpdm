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
  getManifestPaths,
  getRegressionFixturePath,
  getReviewedClausePaths,
  getReviewedClauseSetPath,
  listFiles,
  loadManifest,
  readJsonFile,
  resolveModuleRoot,
  sortStrings,
};
