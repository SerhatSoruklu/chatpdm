'use strict';

const { createHash } = require('node:crypto');
const { loadPolicyClaims } = require('../../../../scripts/policy-surface-data');

const FEEDBACK_EVENT_STORAGE_SECTION_PREFIX = 'Data Storage — Feedback event fields';
const SHA256_VALUE_PREFIX = 'sha256:';
const HASHED_FEEDBACK_EVENT_FIELDS = ['rawQuery', 'normalizedQuery'];

let cachedFeedbackEventLifecycleContract = null;

function getFeedbackEventLifecycleContract() {
  if (cachedFeedbackEventLifecycleContract) {
    return cachedFeedbackEventLifecycleContract;
  }

  const feedbackEventClaims = loadPolicyClaims().filter((claim) =>
    claim.policyFile === 'privacy.md'
    && claim.claimClass === 'stores'
    && claim.section.startsWith(FEEDBACK_EVENT_STORAGE_SECTION_PREFIX));

  if (feedbackEventClaims.length === 0) {
    throw new Error('Feedback event lifecycle contract could not be derived from the generated policy dataset.');
  }

  const ttlDaysSet = new Set();
  const fieldStorageForms = {};

  feedbackEventClaims.forEach((claim) => {
    const lifecycle = claim.lifecycle;

    if (!lifecycle) {
      throw new Error(`Feedback event stores claim ${claim.id} is missing lifecycle metadata.`);
    }

    if (lifecycle.lifecycleClass !== 'short_lived') {
      throw new Error(
        `Feedback event stores claim ${claim.id} must remain short_lived in the lifecycle contract.`,
      );
    }

    if (lifecycle.enforcementStatus !== 'declared_only') {
      throw new Error(
        `Feedback event stores claim ${claim.id} must remain declared_only in the lifecycle contract until evidence phases land.`,
      );
    }

    if (lifecycle.deletionTrigger !== 'ttl_expiry') {
      throw new Error(
        `Feedback event stores claim ${claim.id} must use ttl_expiry in the lifecycle contract.`,
      );
    }

    if (!Number.isInteger(lifecycle.ttlDays) || lifecycle.ttlDays <= 0) {
      throw new Error(
        `Feedback event stores claim ${claim.id} is missing a positive ttlDays lifecycle contract value.`,
      );
    }

    ttlDaysSet.add(lifecycle.ttlDays);

    const fieldName = getFeedbackEventFieldName(claim.policySentence);

    if (fieldName) {
      fieldStorageForms[fieldName] = lifecycle.storageForm;
    }
  });

  if (ttlDaysSet.size !== 1) {
    throw new Error('Feedback event stores claims do not agree on a single ttlDays contract value.');
  }

  HASHED_FEEDBACK_EVENT_FIELDS.forEach((fieldName) => {
    if (fieldStorageForms[fieldName] !== 'sha256') {
      throw new Error(
        `Feedback event stores claim for ${fieldName} must declare sha256 storageForm in the lifecycle contract.`,
      );
    }
  });

  cachedFeedbackEventLifecycleContract = {
    ttlDays: Array.from(ttlDaysSet)[0],
    fieldStorageForms,
  };

  return cachedFeedbackEventLifecycleContract;
}

function minimizeRawQuery(rawQuery) {
  return minimizeFeedbackEventFieldValue('rawQuery', rawQuery);
}

function minimizeNormalizedQuery(normalizedQuery) {
  return minimizeFeedbackEventFieldValue('normalizedQuery', normalizedQuery);
}

function isMinimizedRawQuery(value) {
  return isMinimizedFeedbackEventFieldValue(value);
}

function isMinimizedNormalizedQuery(value) {
  return isMinimizedFeedbackEventFieldValue(value);
}

function buildFeedbackEventExpiresAt(createdAt) {
  const createdAtDate = new Date(createdAt);

  if (Number.isNaN(createdAtDate.getTime())) {
    throw new TypeError('createdAt must be a valid ISO-8601 timestamp before retention can be derived.');
  }

  const { ttlDays } = getFeedbackEventLifecycleContract();
  const expiresAt = new Date(createdAtDate.getTime());
  expiresAt.setUTCDate(expiresAt.getUTCDate() + ttlDays);

  return expiresAt;
}

function minimizeFeedbackEventFieldValue(fieldName, value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string before minimization.`);
  }

  assertFeedbackEventFieldUsesSha256(fieldName);

  const digest = createHash('sha256')
    .update(value, 'utf8')
    .digest('hex');

  return `${SHA256_VALUE_PREFIX}${digest}`;
}

function isMinimizedFeedbackEventFieldValue(value) {
  return typeof value === 'string'
    && new RegExp(`^${SHA256_VALUE_PREFIX}[a-f0-9]{64}$`).test(value);
}

function assertFeedbackEventFieldUsesSha256(fieldName) {
  const { fieldStorageForms } = getFeedbackEventLifecycleContract();

  if (fieldStorageForms[fieldName] !== 'sha256') {
    throw new Error(
      `Feedback event field ${fieldName} must remain sha256 in the lifecycle contract before minimization can proceed.`,
    );
  }
}

function getFeedbackEventFieldName(policySentence) {
  const match = policySentence.match(/stores `([^`]+)` in feedback event documents/);
  return match ? match[1] : null;
}

function hashFeedbackSessionIdForAudit(sessionId) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    throw new TypeError('sessionId must be a non-empty string before audit hashing.');
  }

  const digest = createHash('sha256')
    .update(sessionId, 'utf8')
    .digest('hex');

  return `${SHA256_VALUE_PREFIX}${digest}`;
}

function isHashedFeedbackSessionIdForAudit(value) {
  return isMinimizedFeedbackEventFieldValue(value);
}

module.exports = {
  buildFeedbackEventExpiresAt,
  getFeedbackEventLifecycleContract,
  hashFeedbackSessionIdForAudit,
  isHashedFeedbackSessionIdForAudit,
  isMinimizedNormalizedQuery,
  isMinimizedRawQuery,
  minimizeNormalizedQuery,
  minimizeRawQuery,
};
