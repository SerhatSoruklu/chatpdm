'use strict';

const {
  MILITARY_CONSTRAINT_REASON_CODES,
} = require('./military-constraint-reason-codes');
const { isPlainObject } = require('./fact-schema-utils');
const { buildReferenceBundle } = require('./build-reference-pack');
const {
  getRegressionFixturePath,
  readJsonFile,
  resolveModuleRoot,
} = require('./reference-pack-utils');
const { evaluateBundle } = require('./evaluate-bundle');

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

function assertDecisionMatches(actual, expected, caseId) {
  if (actual.decision !== expected.decision) {
    return `case ${caseId} decision mismatch: expected ${expected.decision}, got ${actual.decision}.`;
  }

  if (actual.reasonCode !== expected.reasonCode) {
    return `case ${caseId} reasonCode mismatch: expected ${expected.reasonCode}, got ${actual.reasonCode}.`;
  }

  if (actual.failedStage !== expected.failedStage) {
    return `case ${caseId} failedStage mismatch: expected ${expected.failedStage}, got ${actual.failedStage}.`;
  }

  const actualRules = Array.isArray(actual.failingRuleIds) ? actual.failingRuleIds : [];
  const expectedRules = Array.isArray(expected.failingRuleIds) ? expected.failingRuleIds : [];
  if (actualRules.length !== expectedRules.length || actualRules.some((ruleId, index) => ruleId !== expectedRules[index])) {
    return `case ${caseId} failingRuleIds mismatch.`;
  }

  return null;
}

function runReferencePackRegression(input) {
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

  const referenceBundleResult = buildReferenceBundle({
    rootDir,
    manifestPath,
    clauseIds: ['CLAUSE-AUTH-0001', 'CLAUSE-LF-0001'],
  });
  if (!referenceBundleResult.valid || !referenceBundleResult.bundle) {
    fail(result, referenceBundleResult.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, referenceBundleResult.errors[0] || 'reference bundle build failed.');
    referenceBundleResult.errors.slice(1).forEach((message) => {
      result.errors.push(message);
    });
    return finish(result);
  }

  const admissibilityBundleResult = buildReferenceBundle({
    rootDir,
    manifestPath,
    clauseIds: ['CLAUSE-AUTH-0001', 'CLAUSE-LF-0001', 'CLAUSE-LF-0004'],
  });
  if (!admissibilityBundleResult.valid || !admissibilityBundleResult.bundle) {
    fail(result, admissibilityBundleResult.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, admissibilityBundleResult.errors[0] || 'admissibility bundle build failed.');
    admissibilityBundleResult.errors.slice(1).forEach((message) => {
      result.errors.push(message);
    });
    return finish(result);
  }

  const factSchema = readJsonFile(require('node:path').join(__dirname, 'military-constraint-fact.schema.json'));
  const packets = readJsonFile(getRegressionFixturePath(rootDir, 'reference-fact-packets.json'));
  const expectedDecisions = readJsonFile(getRegressionFixturePath(rootDir, 'reference-expected-decisions.json'));
  const expectedIndex = new Map(expectedDecisions.map((entry) => [entry.caseId, entry]));

  const caseResults = [];
  let passedCases = 0;
  let failedCases = 0;

  for (let index = 0; index < packets.length; index += 1) {
    const packet = packets[index];
    const expected = expectedIndex.get(packet.caseId);
    if (!expected) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `missing expected regression snapshot for case "${packet.caseId}".`);
      return finish(result);
    }

    const facts = JSON.parse(JSON.stringify(packet.facts));
    const bundle = packet.bundleVariant === 'admissibility'
      ? admissibilityBundleResult.bundle
      : referenceBundleResult.bundle;
    facts.bundleId = bundle.bundleId;
    facts.bundleVersion = bundle.bundleVersion;
    facts.bundleHash = bundle.bundleHash;

    const actual = evaluateBundle({
      bundle,
      facts,
      factSchema,
    });

    const mismatch = assertDecisionMatches(actual, expected, packet.caseId);
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

  if (!result.valid) {
    result.summary = {
      packId: referenceBundleResult.metadata.packId,
      bundleId: referenceBundleResult.metadata.bundleId,
      bundleVersion: referenceBundleResult.metadata.bundleVersion,
      bundleHash: referenceBundleResult.metadata.bundleHash,
      totalCases: packets.length,
      passedCases,
      failedCases,
      caseResults,
    };
    return finish(result);
  }

  result.summary = {
    packId: referenceBundleResult.metadata.packId,
    bundleId: referenceBundleResult.metadata.bundleId,
    bundleVersion: referenceBundleResult.metadata.bundleVersion,
    bundleHash: referenceBundleResult.metadata.bundleHash,
    totalCases: packets.length,
    passedCases,
    failedCases,
    caseResults,
  };

  return finish(result);
}

module.exports = {
  runReferencePackRegression,
};
