'use strict';

const { FEEDBACK_OPTIONS_BY_RESPONSE_TYPE, RESPONSE_TYPES } = require('./constants');
const { insertFeedbackEvent } = require('./store');

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  }
}

function normalizeStringArray(value, fieldName) {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an array.`);
  }

  value.forEach((item) => {
    assertNonEmptyString(item, `${fieldName}[]`);
  });

  return value.slice();
}

function normalizeFeedbackPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('Feedback payload must be an object.');
  }

  const allowedKeys = new Set([
    'sessionId',
    'rawQuery',
    'normalizedQuery',
    'responseType',
    'feedbackType',
    'resolvedConceptId',
    'candidateConceptIds',
    'suggestionConceptIds',
    'contractVersion',
    'normalizerVersion',
    'matcherVersion',
    'conceptSetVersion',
  ]);

  Object.keys(payload).forEach((key) => {
    if (!allowedKeys.has(key)) {
      throw new TypeError(`Unsupported feedback field "${key}".`);
    }
  });

  if (payload.sessionId != null && typeof payload.sessionId !== 'string') {
    throw new TypeError('sessionId must be a string when provided.');
  }

  assertNonEmptyString(payload.rawQuery, 'rawQuery');
  assertNonEmptyString(payload.normalizedQuery, 'normalizedQuery');
  assertNonEmptyString(payload.responseType, 'responseType');
  assertNonEmptyString(payload.feedbackType, 'feedbackType');
  assertNonEmptyString(payload.contractVersion, 'contractVersion');
  assertNonEmptyString(payload.normalizerVersion, 'normalizerVersion');
  assertNonEmptyString(payload.matcherVersion, 'matcherVersion');
  assertNonEmptyString(payload.conceptSetVersion, 'conceptSetVersion');

  if (!RESPONSE_TYPES.includes(payload.responseType)) {
    throw new TypeError(`Unsupported responseType "${payload.responseType}".`);
  }

  const allowedFeedbackOptions = FEEDBACK_OPTIONS_BY_RESPONSE_TYPE[payload.responseType];

  if (!allowedFeedbackOptions.includes(payload.feedbackType)) {
    throw new TypeError(
      `feedbackType "${payload.feedbackType}" is invalid for responseType "${payload.responseType}".`,
    );
  }

  const candidateConceptIds = normalizeStringArray(payload.candidateConceptIds, 'candidateConceptIds');
  const suggestionConceptIds = normalizeStringArray(
    payload.suggestionConceptIds,
    'suggestionConceptIds',
  );

  let resolvedConceptId = null;

  if (payload.resolvedConceptId != null) {
    assertNonEmptyString(payload.resolvedConceptId, 'resolvedConceptId');
    resolvedConceptId = payload.resolvedConceptId;
  }

  if (payload.responseType === 'concept_match') {
    assertNonEmptyString(resolvedConceptId, 'resolvedConceptId');

    if (candidateConceptIds.length > 0 || suggestionConceptIds.length > 0) {
      throw new TypeError('concept_match feedback must not include candidate or suggestion concept IDs.');
    }
  }

  if (payload.responseType === 'ambiguous_match') {
    assertNonEmptyString(resolvedConceptId, 'resolvedConceptId');

    if (candidateConceptIds.length < 2) {
      throw new TypeError('ambiguous_match feedback must include at least two candidate concept IDs.');
    }

    if (suggestionConceptIds.length > 0) {
      throw new TypeError('ambiguous_match feedback must not include suggestion concept IDs.');
    }
  }

  if (payload.responseType === 'no_exact_match') {
    if (candidateConceptIds.length > 0) {
      throw new TypeError('no_exact_match feedback must not include candidate concept IDs.');
    }

    resolvedConceptId = null;
  }

  return {
    sessionId: payload.sessionId ?? null,
    rawQuery: payload.rawQuery,
    normalizedQuery: payload.normalizedQuery,
    responseType: payload.responseType,
    feedbackType: payload.feedbackType,
    resolvedConceptId,
    candidateConceptIds,
    suggestionConceptIds,
    contractVersion: payload.contractVersion,
    normalizerVersion: payload.normalizerVersion,
    matcherVersion: payload.matcherVersion,
    conceptSetVersion: payload.conceptSetVersion,
  };
}

function recordFeedback(payload) {
  const normalizedPayload = normalizeFeedbackPayload(payload);
  const createdAt = new Date().toISOString();
  const feedbackId = insertFeedbackEvent({
    ...normalizedPayload,
    createdAt,
  });

  return {
    status: 'recorded',
    feedbackId,
    createdAt,
  };
}

module.exports = {
  recordFeedback,
};

