'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  MILITARY_CONSTRAINT_REASON_CODES,
} = require('./military-constraint-reason-codes');
const { isPlainObject } = require('./fact-schema-utils');
const { assembleBundle } = require('./assemble-bundle');
const { compileClauseToRule } = require('./compile-clause-to-rule');
const { validateReviewedClauseCorpus } = require('./validate-reviewed-clause-corpus');
const { validateReferencePack } = require('./validate-reference-pack');
const { COMPILER_VERSION } = require('./compile-clause-to-rule');
const {
  getReviewedClauseSetPath,
  getAuthorityGraphPath,
  readJsonFile,
  loadPackRegistry,
  resolveModuleRoot,
  sortStrings,
  isNonEmptyString,
  BUNDLE_CONTRACT_VERSION,
  computeJsonDigest,
} = require('./reference-pack-utils');

function makeResult() {
  return {
    valid: true,
    reasonCode: null,
    errors: [],
    metadata: null,
    bundle: null,
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
    metadata: result.metadata ? Object.freeze(result.metadata) : null,
    bundle: result.bundle ? Object.freeze(result.bundle) : null,
  });
}

function loadReviewedClauses(rootDir, reviewedClauseSetIds) {
  const clauses = [];

  reviewedClauseSetIds.forEach((clauseSetId) => {
    const clausePath = getReviewedClauseSetPath(rootDir, clauseSetId);
    const setClauses = readJsonFile(clausePath);
    clauses.push(...setClauses);
  });

  return clauses;
}

function buildBundleDraft(manifest) {
  const authorityOwner = manifest.jurisdiction === 'INTL'
    ? 'INTERNATIONAL_COMMAND'
    : manifest.jurisdiction === 'UK'
      ? 'UK_NATIONAL_COMMAND'
      : manifest.jurisdiction === 'CA'
        ? 'CA_NATIONAL_COMMAND'
        : manifest.jurisdiction === 'AU'
          ? 'AU_NATIONAL_COMMAND'
          : manifest.jurisdiction === 'NL'
            ? 'NL_NATIONAL_COMMAND'
          : manifest.jurisdiction === 'TR'
            ? 'TR_NATIONAL_COMMAND'
          : manifest.jurisdiction === 'NATO'
        ? 'NATO_COMMAND'
      : 'NATIONAL_COMMAND';

  return {
    bundleId: manifest.bundleId,
    bundleVersion: manifest.bundleVersion,
    // Explicit compatibility gate; not part of the pack's semantic release version.
    contractVersion: BUNDLE_CONTRACT_VERSION,
    status: 'ACTIVE',
    jurisdiction: manifest.jurisdiction,
    authorityOwner,
    precedencePolicy: {
      stageOrder: [
        'ADMISSIBILITY',
        'LEGAL_FLOOR',
        'POLICY_OVERLAY',
      ],
      defaultDecision: 'REFUSED',
      missingFactDecision: 'REFUSED_INCOMPLETE',
      sameStageConflictPolicy: 'REFUSE',
    },
    factSchemaVersion: '1.0.0',
    authorityGraphId: manifest.authorityGraphId,
    compiledAt: '2026-04-13T18:00:00Z',
  };
}

function compileCompilableClauses(clauses, sourceRegistry, clauseIds) {
  const allowedClauseIds = Array.isArray(clauseIds) && clauseIds.length > 0
    ? new Set(clauseIds.filter((value) => typeof value === 'string' && value.length > 0))
    : null;

  const compilable = clauses
    .filter((clause) => isPlainObject(clause) && clause.machineCandidate === true && (clause.reviewStatus === 'COMPILATION_READY' || clause.reviewStatus === 'APPROVED'))
    .filter((clause) => !allowedClauseIds || allowedClauseIds.has(clause.clauseId))
    .sort((left, right) => String(left.clauseId).localeCompare(String(right.clauseId)));

  const compiledRules = [];
  const compiledClauseIds = [];
  const errors = [];

  compilable.forEach((clause) => {
    const outcome = compileClauseToRule({
      clause,
      sourceRegistry,
    });

    if (!outcome.valid || !outcome.compiledRule) {
      errors.push(...outcome.errors);
      return;
    }

    compiledRules.push(outcome.compiledRule);
    compiledClauseIds.push(clause.clauseId);
  });

  return {
    compiledRules,
    compiledClauseIds,
    errors,
  };
}

function buildReferenceBundle(input) {
  const result = makeResult();
  const rootDir = isPlainObject(input) && typeof input.rootDir === 'string' && input.rootDir.length > 0
    ? resolveModuleRoot(input.rootDir)
    : null;
  const manifestPath = isPlainObject(input) && typeof input.manifestPath === 'string' && input.manifestPath.length > 0
    ? input.manifestPath
    : null;

  if (rootDir === null || manifestPath === null) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'rootDir and manifestPath are required.');
    return finish(result);
  }

  const validation = validateReferencePack({ rootDir, manifestPath });
  if (!validation.valid) {
    fail(result, validation.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, validation.errors[0] || 'reference pack validation failed.');
    validation.errors.slice(1).forEach((message) => {
      result.errors.push(message);
    });
    return finish(result);
  }

  const manifest = validation.manifest;
  const sourceRegistryPath = path.join(rootDir, 'fixtures', 'military-source-registry.json');
  const authorityGraphPath = getAuthorityGraphPath(rootDir, manifest);
  if (!isNonEmptyString(authorityGraphPath) || !fs.existsSync(authorityGraphPath)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `authority graph could not be resolved for manifest authorityGraphId "${manifest.authorityGraphId}".`);
    return finish(result);
  }
  const factSchemaPath = path.join(__dirname, 'military-constraint-fact.schema.json');
  const sourceRegistry = readJsonFile(sourceRegistryPath);
  const authorityGraph = readJsonFile(authorityGraphPath);
  const factSchema = readJsonFile(factSchemaPath);
  const packRegistry = loadPackRegistry(rootDir);
  const reviewedClauses = loadReviewedClauses(rootDir, manifest.reviewedClauseSetIds);

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

  const compiled = compileCompilableClauses(reviewedClauses, sourceRegistry, isPlainObject(input) && Array.isArray(input.clauseIds) ? input.clauseIds : null);
  if (compiled.errors.length > 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, compiled.errors[0]);
    compiled.errors.slice(1).forEach((message) => {
      result.errors.push(message);
    });
    return finish(result);
  }

  const sourceIds = sortStrings([
    ...new Set(compiled.compiledRules.flatMap((rule) => rule.sourceRefs.map((entry) => entry.sourceId))),
  ]);

  const bundleResult = assembleBundle({
    bundleDraft: buildBundleDraft(manifest),
    compiledRules: compiled.compiledRules,
    authorityGraph,
    sourceRegistry: sourceRegistry.filter((entry) => sourceIds.includes(entry.sourceId)),
    factSchema,
  });

  if (!bundleResult.valid || !bundleResult.bundle) {
    fail(result, bundleResult.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, bundleResult.errors[0] || 'bundle assembly failed.');
    bundleResult.errors.slice(1).forEach((message) => {
      result.errors.push(message);
    });
    return finish(result);
  }

  result.bundle = bundleResult.bundle;
  result.metadata = {
    packId: manifest.packId,
    jurisdiction: manifest.jurisdiction,
    bundleId: bundleResult.bundle.bundleId,
    bundleVersion: bundleResult.bundle.bundleVersion,
    compilerVersion: COMPILER_VERSION,
    contractVersion: bundleResult.bundle.contractVersion,
    bundleHash: bundleResult.bundle.bundleHash,
    reviewedClauseSetIds: [...manifest.reviewedClauseSetIds],
    authorityGraphId: manifest.authorityGraphId,
    sourceRegistryVersion: manifest.sourceRegistryVersion,
    regressionSuiteVersion: manifest.regressionSuiteVersion,
    ruleCount: Array.isArray(bundleResult.bundle.rules) ? bundleResult.bundle.rules.length : 0,
    compiledClauseIds: compiled.compiledClauseIds,
    provenance: {
      manifestDigest: computeJsonDigest(manifest),
      sourceRegistryDigest: computeJsonDigest(sourceRegistry),
      authorityGraphDigest: computeJsonDigest(authorityGraph),
      factSchemaDigest: computeJsonDigest(factSchema),
      packRegistryDigest: packRegistry === null ? null : computeJsonDigest(packRegistry),
    },
  };

  return finish(result);
}

function buildReferencePack(input) {
  const built = buildReferenceBundle(input);
  return {
    valid: built.valid,
    reasonCode: built.reasonCode,
    errors: built.errors,
    metadata: built.metadata,
  };
}

module.exports = {
  buildReferenceBundle,
  buildReferencePack,
};
