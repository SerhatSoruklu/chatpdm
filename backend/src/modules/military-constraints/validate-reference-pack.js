'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  MILITARY_CONSTRAINT_REASON_CODES,
} = require('./military-constraint-reason-codes');
const { isPlainObject } = require('./fact-schema-utils');
const { validateReviewedClauseCorpus } = require('./validate-reviewed-clause-corpus');
const {
  getRegressionFixturePath,
  getReviewedClauseSetPath,
  readJsonFile,
  resolveModuleRoot,
} = require('./reference-pack-utils');

function makeResult() {
  return {
    valid: true,
    reasonCode: null,
    errors: [],
    manifest: null,
  };
}

function fail(result, reasonCode, message) {
  result.valid = false;
  if (result.reasonCode === null) {
    result.reasonCode = reasonCode;
  }
  result.errors.push(message);
}

function finish(result) {
  return Object.freeze({
    valid: result.valid,
    reasonCode: result.reasonCode,
    errors: Object.freeze([...result.errors]),
    manifest: result.manifest ? Object.freeze(result.manifest) : null,
  });
}

function readManifest(manifestPath) {
  if (typeof manifestPath !== 'string' || manifestPath.length === 0 || !fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    const manifest = readJsonFile(manifestPath);
    return isPlainObject(manifest) ? manifest : null;
  } catch (error) {
    return null;
  }
}

function validateReferencePack(input) {
  const result = makeResult();
  const rootDir = isPlainObject(input) && typeof input.rootDir === 'string' && input.rootDir.length > 0
    ? resolveModuleRoot(input.rootDir)
    : null;
  const manifestPath = isPlainObject(input) && typeof input.manifestPath === 'string' && input.manifestPath.length > 0
    ? input.manifestPath
    : null;

  if (rootDir === null) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'rootDir is required.');
    return finish(result);
  }

  if (manifestPath === null) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'manifestPath is required.');
    return finish(result);
  }

  const manifest = readManifest(manifestPath);
  if (!isPlainObject(manifest)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `reference pack manifest is missing at "${manifestPath}".`);
    return finish(result);
  }

  result.manifest = manifest;

  if (typeof manifest.packId !== 'string' || manifest.packId.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'manifest.packId is required.');
  }

  if (typeof manifest.bundleId !== 'string' || manifest.bundleId.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'manifest.bundleId is required.');
  }

  if (typeof manifest.bundleVersion !== 'string' || manifest.bundleVersion.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'manifest.bundleVersion is required.');
  }

  if (typeof manifest.jurisdiction !== 'string' || manifest.jurisdiction.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'manifest.jurisdiction is required.');
  }

  if (typeof manifest.authorityGraphId !== 'string' || manifest.authorityGraphId.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'manifest.authorityGraphId is required.');
  }

  if (!Array.isArray(manifest.reviewedClauseSetIds) || manifest.reviewedClauseSetIds.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'manifest.reviewedClauseSetIds must be a non-empty array.');
  }

  if (typeof manifest.sourceRegistryVersion !== 'string' || manifest.sourceRegistryVersion.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'manifest.sourceRegistryVersion is required.');
  }

  if (typeof manifest.regressionSuiteVersion !== 'string' || manifest.regressionSuiteVersion.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'manifest.regressionSuiteVersion is required.');
  }

  if (!result.valid) {
    return finish(result);
  }

  const sourceRegistryPath = path.join(rootDir, 'fixtures', 'military-source-registry.json');
  if (!fs.existsSync(sourceRegistryPath)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `source registry is missing at "${sourceRegistryPath}".`);
    return finish(result);
  }

  const authorityGraphPath = path.join(rootDir, '__tests__', 'fixtures', 'authority-graph.json');
  if (!fs.existsSync(authorityGraphPath)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `authority graph is missing at "${authorityGraphPath}".`);
    return finish(result);
  }

  const clausePaths = [];
  const reviewedClauses = [];

  for (let index = 0; index < manifest.reviewedClauseSetIds.length; index += 1) {
    const clauseSetId = manifest.reviewedClauseSetIds[index];
    if (typeof clauseSetId !== 'string' || clauseSetId.length === 0) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, 'reviewedClauseSetIds must contain non-empty strings.');
      continue;
    }

    const clausePath = getReviewedClauseSetPath(rootDir, clauseSetId);
    if (!fs.existsSync(clausePath)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `reviewed clause set "${clauseSetId}" is missing at "${clausePath}".`);
      continue;
    }

    clausePaths.push(clausePath);
    const clauses = readJsonFile(clausePath);
    if (!Array.isArray(clauses)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `reviewed clause set "${clauseSetId}" must be an array.`);
      continue;
    }

    reviewedClauses.push(...clauses);
  }

  if (!result.valid) {
    return finish(result);
  }

  const sourceRegistry = readJsonFile(sourceRegistryPath);
  const corpusValidation = validateReviewedClauseCorpus({
    clauses: reviewedClauses,
    sourceRegistry,
  });

  if (!corpusValidation.valid) {
    fail(result, corpusValidation.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, corpusValidation.errors[0] || 'reviewed clause corpus validation failed.');
    corpusValidation.errors.slice(1).forEach((message) => {
      result.errors.push(message);
    });
    return finish(result);
  }

  const authorityGraph = readJsonFile(authorityGraphPath);
  if (!isPlainObject(authorityGraph) || authorityGraph.authorityGraphId !== manifest.authorityGraphId) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `authority graph "${authorityGraphPath}" does not match manifest authorityGraphId "${manifest.authorityGraphId}".`);
    return finish(result);
  }

  return finish(result);
}

module.exports = {
  validateReferencePack,
};
