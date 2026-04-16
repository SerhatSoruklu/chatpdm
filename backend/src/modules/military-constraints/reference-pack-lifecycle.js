'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  MILITARY_CONSTRAINT_REASON_CODES,
} = require('./military-constraint-reason-codes');
const { isPlainObject } = require('./fact-schema-utils');
const { buildReferenceBundle, buildReferencePack } = require('./build-reference-pack');
const { evaluateBundle } = require('./evaluate-bundle');
const { listReferencePacks } = require('./list-reference-packs');
const { validateReferencePack } = require('./validate-reference-pack');
const {
  buildPackRegistryIndex,
  readJsonFile,
  loadPackRegistry,
  resolveModuleRoot,
  validatePackRegistry,
} = require('./reference-pack-utils');

const RELEASE_ARTIFACT_ROOT_SEGMENTS = ['artifacts', 'military-constraints', 'releases'];

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeResult() {
  return {
    valid: true,
    reasonCode: null,
    errors: [],
    summary: null,
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
    summary: result.summary ? Object.freeze(result.summary) : null,
  });
}

function summarizeRegistryContext(registryContext) {
  return {
    present: registryContext.present,
    valid: registryContext.valid,
    reasonCode: registryContext.reasonCode,
    errors: [...registryContext.errors],
    packCount: Array.isArray(registryContext.packRegistry) ? registryContext.packRegistry.length : 0,
  };
}

function summarizeValidationResult(validationResult) {
  return {
    valid: validationResult.valid,
    reasonCode: validationResult.reasonCode,
    errors: [...validationResult.errors],
  };
}

function loadValidatedPackRegistry(rootDir) {
  const packRegistry = loadPackRegistry(rootDir);

  if (packRegistry === null) {
    return {
      present: false,
      valid: true,
      reasonCode: null,
      errors: [],
      packRegistry: null,
      packRegistryIndex: new Map(),
    };
  }

  const validation = validatePackRegistry(packRegistry);
  if (!validation.valid) {
    return {
      present: true,
      valid: false,
      reasonCode: validation.reasonCode,
      errors: [...validation.errors],
      packRegistry,
      packRegistryIndex: new Map(),
    };
  }

  return {
    present: true,
    valid: true,
    reasonCode: null,
    errors: [],
    packRegistry,
    packRegistryIndex: buildPackRegistryIndex(packRegistry),
  };
}

function getRegistryEntryOrNull(packRegistryIndex, packId) {
  if (!(packRegistryIndex instanceof Map)) {
    return null;
  }

  return packRegistryIndex.has(packId)
    ? packRegistryIndex.get(packId)
    : null;
}

function assertManifestPackRegistryEntry(result, registryContext, pack, manifestPath) {
  if (!registryContext.present) {
    return true;
  }

  const registryEntry = getRegistryEntryOrNull(registryContext.packRegistryIndex, pack.packId);
  if (!registryEntry) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `reference pack "${pack.packId}" at "${manifestPath}" is not declared in pack-registry.json.`);
    return false;
  }

  if (registryEntry.entry.kind === 'umbrella-label') {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `registry entry "${pack.packId}" is an umbrella-label and cannot be released as an executable pack.`);
    return false;
  }

  if (registryEntry.entry.status === 'planned') {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `reference pack "${pack.packId}" is registered as planned and cannot be admitted yet.`);
    return false;
  }

  return true;
}

function resolveRepoRoot(input) {
  return isPlainObject(input) && typeof input.rootDir === 'string' && input.rootDir.length > 0
    ? resolveModuleRoot(input.rootDir)
    : null;
}

function getReleaseArtifactRoot(repoRoot, artifactRoot) {
  if (typeof artifactRoot === 'string' && artifactRoot.length > 0) {
    return path.isAbsolute(artifactRoot)
      ? artifactRoot
      : path.join(repoRoot, artifactRoot);
  }

  return path.join(repoRoot, ...RELEASE_ARTIFACT_ROOT_SEGMENTS);
}

function getPackArtifactDirectory(artifactRoot, packId, bundleVersion) {
  return path.join(artifactRoot, packId, bundleVersion);
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJsonFile(filePath, value) {
  ensureDirectory(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function getManifestSuffix(manifestPath) {
  const fileName = path.basename(manifestPath);
  if (fileName === 'reference-pack-manifest.json') {
    return '';
  }

  const prefix = 'reference-pack-manifest';
  if (!fileName.startsWith(prefix) || !fileName.endsWith('.json')) {
    return '';
  }

  return fileName.slice(prefix.length, -'.json'.length);
}

function buildPackRegressionBundle(rootDir, manifestPath) {
  const suffix = getManifestSuffix(manifestPath);

  if (suffix === '') {
    return buildReferenceBundle({
      rootDir,
      manifestPath,
      clauseIds: ['CLAUSE-AUTH-0001', 'CLAUSE-LF-0001'],
    });
  }

  return buildReferenceBundle({
    rootDir,
    manifestPath,
  });
}

function buildPackAdmissibilityBundle(rootDir, manifestPath) {
  const suffix = getManifestSuffix(manifestPath);

  if (suffix === '') {
    return buildReferenceBundle({
      rootDir,
      manifestPath,
      clauseIds: ['CLAUSE-AUTH-0001', 'CLAUSE-LF-0001', 'CLAUSE-LF-0004'],
    });
  }

  return buildReferenceBundle({
    rootDir,
    manifestPath,
  });
}

function selectRegressionFixtures(rootDir, manifestPath) {
  const suffix = getManifestSuffix(manifestPath);
  const factPacketsFile = `reference-fact-packets${suffix}.json`;
  const expectedDecisionsFile = `reference-expected-decisions${suffix}.json`;

  return {
    factPackets: readJsonFile(path.join(rootDir, '__tests__', 'fixtures', 'regression', factPacketsFile)),
    expectedDecisions: readJsonFile(path.join(rootDir, '__tests__', 'fixtures', 'regression', expectedDecisionsFile)),
    factPacketsFile,
    expectedDecisionsFile,
  };
}

function runPackRegressionSuite(rootDir, manifestPath) {
  const resolvedRootDir = resolveModuleRoot(rootDir);
  const result = makeResult();
  const referenceBundleResult = buildPackRegressionBundle(resolvedRootDir, manifestPath);
  if (!referenceBundleResult.valid || !referenceBundleResult.bundle) {
    return referenceBundleResult;
  }

  const admissibilityBundleResult = buildPackAdmissibilityBundle(resolvedRootDir, manifestPath);
  if (!admissibilityBundleResult.valid || !admissibilityBundleResult.bundle) {
    return admissibilityBundleResult;
  }

  const factSchema = readJsonFile(path.join(__dirname, 'military-constraint-fact.schema.json'));
  let fixtures;
  try {
    fixtures = selectRegressionFixtures(resolvedRootDir, manifestPath);
  } catch (error) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, error instanceof Error ? error.message : 'failed to load regression fixtures.');
    return finish(result);
  }
  const expectedIndex = new Map(fixtures.expectedDecisions.map((entry) => [entry.caseId, entry]));
  const caseResults = [];
  let passedCases = 0;
  let failedCases = 0;

  for (let index = 0; index < fixtures.factPackets.length; index += 1) {
    const packet = fixtures.factPackets[index];
    const expected = expectedIndex.get(packet.caseId);

    if (!expected) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `missing expected regression snapshot for case "${packet.caseId}".`);
      break;
    }

    const bundle = packet.bundleVariant === 'admissibility'
      ? admissibilityBundleResult.bundle
      : referenceBundleResult.bundle;
    const facts = cloneJson(packet.facts);
    facts.bundleId = bundle.bundleId;
    facts.bundleVersion = bundle.bundleVersion;
    facts.bundleHash = bundle.bundleHash;

    const actual = evaluateBundle({
      bundle,
      facts,
      factSchema,
    });

    const actualRules = Array.isArray(actual.failingRuleIds) ? actual.failingRuleIds : [];
    const expectedRules = Array.isArray(expected.failingRuleIds) ? expected.failingRuleIds : [];
    const mismatch = actual.decision !== expected.decision
      ? `case ${packet.caseId} decision mismatch: expected ${expected.decision}, got ${actual.decision}.`
      : actual.reasonCode !== expected.reasonCode
        ? `case ${packet.caseId} reasonCode mismatch: expected ${expected.reasonCode}, got ${actual.reasonCode}.`
        : actual.failedStage !== expected.failedStage
          ? `case ${packet.caseId} failedStage mismatch: expected ${expected.failedStage}, got ${actual.failedStage}.`
          : actualRules.length !== expectedRules.length || actualRules.some((ruleId, ruleIndex) => ruleId !== expectedRules[ruleIndex])
            ? `case ${packet.caseId} failingRuleIds mismatch.`
            : null;

    if (mismatch) {
      failedCases += 1;
      caseResults.push({
        caseId: packet.caseId,
        ok: false,
        message: mismatch,
      });
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_CONFLICT, mismatch);
      continue;
    }

    passedCases += 1;
    caseResults.push({
      caseId: packet.caseId,
      ok: true,
    });
  }

  result.summary = {
    packId: referenceBundleResult.metadata.packId,
    bundleId: referenceBundleResult.metadata.bundleId,
    bundleVersion: referenceBundleResult.metadata.bundleVersion,
    bundleHash: referenceBundleResult.metadata.bundleHash,
    totalCases: fixtures.factPackets.length,
    passedCases,
    failedCases,
    caseResults,
  };

  return finish(result);
}

function runAllMilitaryConstraintChecks(input) {
  const result = makeResult();
  const rootDir = resolveRepoRoot(input);

  if (rootDir === null) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'rootDir is required.');
    return finish(result);
  }

  const registryContext = loadValidatedPackRegistry(rootDir);
  if (!registryContext.valid) {
    fail(result, registryContext.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, registryContext.errors[0] || 'pack registry validation failed.');
    result.summary = {
      packCount: 0,
      packSummaries: [],
      registry: summarizeRegistryContext(registryContext),
    };
    return finish(result);
  }

  const packs = listReferencePacks({ rootDir });
  const packSummaries = [];

  if (packs.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'no reference packs were found.');
    return finish(result);
  }

  for (let index = 0; index < packs.length; index += 1) {
    const pack = packs[index];
    if (!assertManifestPackRegistryEntry(result, registryContext, pack, pack.manifestPath)) {
      result.summary = {
        packCount: packs.length,
        packSummaries,
      };
      return finish(result);
    }

    const validation = validateReferencePack({
      rootDir,
      manifestPath: pack.manifestPath,
    });

    packSummaries.push({
      packId: pack.packId,
      bundleId: pack.bundleId,
      bundleVersion: pack.bundleVersion,
      manifestPath: pack.manifestPath,
      kind: pack.kind,
      status: pack.status,
      dependsOn: Array.isArray(pack.dependsOn) ? [...pack.dependsOn] : [],
      registryOrder: Number.isInteger(pack.registryOrder) ? pack.registryOrder : null,
      validation: {
        valid: validation.valid,
        reasonCode: validation.reasonCode,
      },
      build: null,
      regression: null,
    });

    if (!validation.valid) {
      fail(result, validation.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, validation.errors[0] || `reference pack "${pack.packId}" failed validation.`);
      result.summary = {
        packCount: packs.length,
        packSummaries,
      };
      return finish(result);
    }
  }

  for (let index = 0; index < packs.length; index += 1) {
    const pack = packs[index];
    const build = buildReferencePack({
      rootDir,
      manifestPath: pack.manifestPath,
    });

    packSummaries[index].build = {
      valid: build.valid,
      reasonCode: build.reasonCode,
      bundleHash: build.metadata ? build.metadata.bundleHash : null,
      ruleCount: build.metadata && Number.isInteger(build.metadata.ruleCount) ? build.metadata.ruleCount : null,
      compiledClauseIds: build.metadata && Array.isArray(build.metadata.compiledClauseIds)
        ? [...build.metadata.compiledClauseIds]
        : [],
    };

    if (!build.valid || !build.metadata) {
      fail(result, build.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, build.errors[0] || `reference pack "${pack.packId}" failed bundle build.`);
      result.summary = {
        packCount: packs.length,
        packSummaries,
      };
      return finish(result);
    }
  }

  for (let index = 0; index < packs.length; index += 1) {
    const pack = packs[index];
    const regression = runPackRegressionSuite(rootDir, pack.manifestPath);

    packSummaries[index].regression = {
      valid: regression.valid,
      reasonCode: regression.reasonCode,
      totalCases: regression.summary ? regression.summary.totalCases : null,
      passedCases: regression.summary ? regression.summary.passedCases : null,
      failedCases: regression.summary ? regression.summary.failedCases : null,
    };

    if (!regression.valid) {
      fail(result, regression.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.RULE_CONFLICT, regression.errors[0] || `reference pack "${pack.packId}" failed regression.`);
      result.summary = {
        packCount: packs.length,
        packSummaries,
      };
      return finish(result);
    }
  }

  result.summary = {
    packCount: packs.length,
    packSummaries,
  };
  return finish(result);
}

function releaseReferencePack(input) {
  const result = makeResult();
  const rootDir = resolveRepoRoot(input);
  const manifestPath = isPlainObject(input) && typeof input.manifestPath === 'string' && input.manifestPath.length > 0
    ? input.manifestPath
    : null;

  if (rootDir === null || manifestPath === null) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'rootDir and manifestPath are required.');
    return finish(result);
  }

  const registryContext = loadValidatedPackRegistry(rootDir);
  if (!registryContext.valid) {
    fail(result, registryContext.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, registryContext.errors[0] || 'pack registry validation failed.');
    result.summary = {
      registry: summarizeRegistryContext(registryContext),
    };
    return finish(result);
  }

  const manifestValidation = validateReferencePack({
    rootDir,
    manifestPath,
  });

  if (!manifestValidation.valid || !manifestValidation.manifest) {
    fail(result, manifestValidation.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, manifestValidation.errors[0] || 'reference pack validation failed.');
    result.summary = {
      manifestValidation: summarizeValidationResult(manifestValidation),
      registry: summarizeRegistryContext(registryContext),
    };
    return finish(result);
  }

  if (!assertManifestPackRegistryEntry(result, registryContext, manifestValidation.manifest, manifestPath)) {
    result.summary = {
      manifestValidation: summarizeValidationResult(manifestValidation),
      registry: summarizeRegistryContext(registryContext),
    };
    return finish(result);
  }

  const build = buildReferenceBundle({
    rootDir,
    manifestPath,
  });

  if (!build.valid || !build.bundle || !build.metadata) {
    fail(result, build.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, build.errors[0] || 'reference bundle build failed.');
    result.summary = { build };
    return finish(result);
  }

  const regression = runPackRegressionSuite(rootDir, manifestPath);
  if (!regression.valid) {
    fail(result, regression.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.RULE_CONFLICT, regression.errors[0] || 'reference pack regression failed.');
    result.summary = { build, regression };
    return finish(result);
  }

  const artifactRoot = getReleaseArtifactRoot(rootDir, isPlainObject(input) ? input.artifactRoot : null);
  const artifactDirectory = getPackArtifactDirectory(artifactRoot, build.metadata.packId, build.metadata.bundleVersion);
  const manifestSnapshot = readJsonFile(manifestPath);
  const bundlePath = path.join(artifactDirectory, 'bundle.json');
  const manifestSnapshotPath = path.join(artifactDirectory, 'manifest.json');
  const regressionPath = path.join(artifactDirectory, 'regression-summary.json');
  const releasePath = path.join(artifactDirectory, 'release.json');

  try {
    fs.mkdirSync(artifactDirectory, { recursive: true });
    writeJsonFile(bundlePath, build.bundle);
    writeJsonFile(manifestSnapshotPath, manifestSnapshot);
    writeJsonFile(regressionPath, regression.summary);
  } catch (error) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, error instanceof Error ? error.message : 'failed to write release artifacts.');
    result.summary = {
      build,
      regression,
      artifactDirectory,
    };
    return finish(result);
  }

  const releaseMetadata = {
    packId: build.metadata.packId,
    bundleId: build.metadata.bundleId,
    bundleVersion: build.metadata.bundleVersion,
    bundleHash: build.metadata.bundleHash,
    jurisdiction: build.metadata.jurisdiction,
    authorityGraphId: build.metadata.authorityGraphId,
    reviewedClauseSetIds: [...build.metadata.reviewedClauseSetIds],
    sourceRegistryVersion: build.metadata.sourceRegistryVersion,
    regressionSuiteVersion: build.metadata.regressionSuiteVersion,
    artifactDirectory,
    artifactFiles: {
      bundle: bundlePath,
      manifest: manifestSnapshotPath,
      regressionSummary: regressionPath,
      release: releasePath,
    },
    regressionSummary: cloneJson(regression.summary),
  };

  writeJsonFile(releasePath, releaseMetadata);

  result.summary = {
    release: releaseMetadata,
    build: build.metadata,
  };

  return finish(result);
}

function releaseAllReferencePacks(input) {
  const result = makeResult();
  const rootDir = resolveRepoRoot(input);
  const artifactRoot = isPlainObject(input) && typeof input.artifactRoot === 'string' && input.artifactRoot.length > 0
    ? input.artifactRoot
    : null;

  if (rootDir === null) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'rootDir is required.');
    return finish(result);
  }

  const registryContext = loadValidatedPackRegistry(rootDir);
  if (!registryContext.valid) {
    fail(result, registryContext.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, registryContext.errors[0] || 'pack registry validation failed.');
    result.summary = {
      packCount: 0,
      packSummaries: [],
      registry: summarizeRegistryContext(registryContext),
    };
    return finish(result);
  }

  const packs = listReferencePacks({ rootDir });
  const packSummaries = [];

  if (packs.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'no reference packs were found.');
    return finish(result);
  }

  for (let index = 0; index < packs.length; index += 1) {
    const pack = packs[index];
    if (!assertManifestPackRegistryEntry(result, registryContext, pack, pack.manifestPath)) {
      result.summary = {
        packCount: packs.length,
        packSummaries,
      };
      return finish(result);
    }

    const release = releaseReferencePack({
      rootDir,
      manifestPath: pack.manifestPath,
      artifactRoot,
    });

    packSummaries.push({
      packId: pack.packId,
      bundleId: pack.bundleId,
      bundleVersion: pack.bundleVersion,
      manifestPath: pack.manifestPath,
      kind: pack.kind,
      status: pack.status,
      dependsOn: Array.isArray(pack.dependsOn) ? [...pack.dependsOn] : [],
      registryOrder: Number.isInteger(pack.registryOrder) ? pack.registryOrder : null,
      release,
    });

    if (!release.valid) {
      fail(result, release.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, release.errors[0] || `reference pack "${pack.packId}" failed release.`);
      result.summary = {
        packCount: packs.length,
        packSummaries,
      };
      return finish(result);
    }
  }

  result.summary = {
    packCount: packs.length,
    packSummaries,
  };
  return finish(result);
}

module.exports = {
  getManifestSuffix,
  getPackArtifactDirectory,
  getReleaseArtifactRoot,
  releaseAllReferencePacks,
  releaseReferencePack,
  runAllMilitaryConstraintChecks,
  runPackRegressionSuite,
};
