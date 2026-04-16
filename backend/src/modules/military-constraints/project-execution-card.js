'use strict';

const crypto = require('node:crypto');

const {
  MILITARY_CONSTRAINT_REASON_CODES,
} = require('./military-constraint-reason-codes');
const { isPlainObject } = require('./fact-schema-utils');

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeResult() {
  return {
    valid: true,
    reasonCode: null,
    errors: [],
    card: null,
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
    card: result.card ? Object.freeze(result.card) : null,
  });
}

function sortObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const ordered = {};
  Object.keys(value).sort().forEach((key) => {
    ordered[key] = sortObjectKeys(value[key]);
  });
  return ordered;
}

function canonicalJSONStringify(value) {
  return JSON.stringify(sortObjectKeys(value));
}

function computeCardId(payload) {
  return `sha256:${crypto.createHash('sha256').update(canonicalJSONStringify(payload), 'utf8').digest('hex')}`;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function isValidTraceArray(value) {
  return Array.isArray(value);
}

function projectExecutionCard(input) {
  const result = makeResult();
  const packMetadata = isPlainObject(input) ? input.packMetadata : null;
  const bundle = isPlainObject(input) ? input.bundle : null;
  const runtimeDecision = isPlainObject(input) ? input.runtimeDecision : null;

  if (!isPlainObject(packMetadata) || !isPlainObject(bundle) || !isPlainObject(runtimeDecision)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'packMetadata, bundle, and runtimeDecision are required.');
    return finish(result);
  }

  const packId = packMetadata.packId;
  const bundleId = bundle.bundleId;
  const runtimeBundleId = runtimeDecision.bundleId;
  const bundleVersion = bundle.bundleVersion;
  const bundleHash = bundle.bundleHash;
  const jurisdiction = bundle.jurisdiction;

  if (!isNonEmptyString(packId) || !isNonEmptyString(bundleId) || !isNonEmptyString(bundleVersion) || !isNonEmptyString(bundleHash) || !isNonEmptyString(jurisdiction)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'packId, bundleId, bundleVersion, bundleHash, and jurisdiction are required.');
    return finish(result);
  }

  if (!isNonEmptyString(runtimeBundleId)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, 'runtimeDecision.bundleId is required.');
    return finish(result);
  }

  if (runtimeBundleId !== bundleId) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'runtimeDecision.bundleId must match bundle.bundleId.');
    return finish(result);
  }

  if (packMetadata.bundleId !== bundleId) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'packMetadata.bundleId must match bundle.bundleId.');
    return finish(result);
  }

  if (packMetadata.bundleVersion !== bundleVersion) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'packMetadata.bundleVersion must match bundle.bundleVersion.');
    return finish(result);
  }

  if (packMetadata.bundleHash !== bundleHash) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'packMetadata.bundleHash must match bundle.bundleHash.');
    return finish(result);
  }

  if (packMetadata.jurisdiction !== jurisdiction) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'packMetadata.jurisdiction must match bundle.jurisdiction.');
    return finish(result);
  }

  if (!['ALLOWED', 'REFUSED', 'REFUSED_INCOMPLETE'].includes(runtimeDecision.decision)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, 'runtimeDecision.decision is required.');
    return finish(result);
  }

  if (!(runtimeDecision.reasonCode === null || isNonEmptyString(runtimeDecision.reasonCode))) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, 'runtimeDecision.reasonCode must be null or a non-empty string.');
    return finish(result);
  }

  if (!(runtimeDecision.failedStage === null || isNonEmptyString(runtimeDecision.failedStage))) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, 'runtimeDecision.failedStage must be null or a non-empty string.');
    return finish(result);
  }

  if (!Array.isArray(runtimeDecision.failingRuleIds) || !Array.isArray(runtimeDecision.missingFactIds) || !isPlainObject(runtimeDecision.authorityTrace) || !isValidTraceArray(runtimeDecision.ruleTrace)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, 'runtimeDecision trace fields are malformed.');
    return finish(result);
  }

  if (runtimeDecision.bundleVersion !== bundleVersion) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.BUNDLE_VERSION_IMMUTABLE_VIOLATION, 'runtimeDecision.bundleVersion must match bundle.bundleVersion.');
    return finish(result);
  }

  if (runtimeDecision.bundleHash !== bundleHash) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.BUNDLE_HASH_MISMATCH, 'runtimeDecision.bundleHash must match bundle.bundleHash.');
    return finish(result);
  }

  const cardSeed = {
    packId,
    bundleId: runtimeBundleId,
    bundleVersion,
    bundleHash,
    jurisdiction,
    decision: runtimeDecision.decision,
    reasonCode: runtimeDecision.reasonCode,
    failedStage: runtimeDecision.failedStage,
    failingRuleIds: cloneJson(runtimeDecision.failingRuleIds),
    missingFactIds: cloneJson(runtimeDecision.missingFactIds),
    authorityTrace: cloneJson(runtimeDecision.authorityTrace),
    ruleTrace: cloneJson(runtimeDecision.ruleTrace),
  };

  result.card = {
    cardId: computeCardId(cardSeed),
    ...cardSeed,
  };

  return finish(result);
}

module.exports = {
  computeCardId,
  projectExecutionCard,
};
