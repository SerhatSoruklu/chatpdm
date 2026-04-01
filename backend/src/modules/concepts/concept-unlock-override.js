'use strict';

const OVERRIDABLE_CONCEPT_ID = null;
const OVERRIDE_REASON = 'manual_review';
const OVERRIDE_SCOPE = 'concept_unlock';
const OVERRIDE_ACTOR_ROLE = 'admin';
const OVERRIDE_APPROVAL_TOKEN = 'LLGS_ADMIN_OVERRIDE_V1';
const INVALID_OVERRIDE_REASON = 'invalid_override_object';
const OVERRIDE_DISABLED_REASON = 'concept_unlock_override_disabled';
const ISO_8601_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;
const REQUIRED_OVERRIDE_KEYS = Object.freeze([
  'actorRole',
  'approvalToken',
  'reason',
  'scope',
  'timestamp',
]);

const CONCEPT_UNLOCK_OVERRIDE_TEMPLATE = Object.freeze({
  reason: OVERRIDE_REASON,
  scope: OVERRIDE_SCOPE,
  actorRole: OVERRIDE_ACTOR_ROLE,
  timestamp: '<ISO-8601>',
  approvalToken: OVERRIDE_APPROVAL_TOKEN,
});

const overrideAttemptLog = [];

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactRequiredKeys(override) {
  const actualKeys = Object.keys(override).sort();

  if (actualKeys.length !== REQUIRED_OVERRIDE_KEYS.length) {
    return false;
  }

  return REQUIRED_OVERRIDE_KEYS.every((expectedKey, index) => actualKeys[index] === expectedKey);
}

function isValidIso8601Timestamp(value) {
  return typeof value === 'string'
    && ISO_8601_TIMESTAMP_PATTERN.test(value)
    && !Number.isNaN(Date.parse(value));
}

function invalidValidationResult() {
  return Object.freeze({
    valid: false,
    reason: INVALID_OVERRIDE_REASON,
  });
}

function validateOverride(override) {
  if (!isPlainObject(override)) {
    return invalidValidationResult();
  }

  if (!hasExactRequiredKeys(override)) {
    return invalidValidationResult();
  }

  if (override.reason !== OVERRIDE_REASON) {
    return invalidValidationResult();
  }

  if (override.scope !== OVERRIDE_SCOPE) {
    return invalidValidationResult();
  }

  if (override.actorRole !== OVERRIDE_ACTOR_ROLE) {
    return invalidValidationResult();
  }

  if (!isValidIso8601Timestamp(override.timestamp)) {
    return invalidValidationResult();
  }

  if (override.approvalToken !== OVERRIDE_APPROVAL_TOKEN) {
    return invalidValidationResult();
  }

  return Object.freeze({
    valid: true,
    reason: null,
  });
}

function logOverrideAttempt({ timestamp, status, reason, conceptId }) {
  const logEntry = Object.freeze({
    timestamp: isValidIso8601Timestamp(timestamp) ? timestamp : null,
    status,
    reason: reason ?? null,
    conceptId,
  });

  overrideAttemptLog.push(logEntry);
  process.stderr.write(`[chatpdm-concepts] override-attempt ${JSON.stringify(logEntry)}\n`);
  return logEntry;
}

function applyOverride(override) {
  const validation = validateOverride(override);

  if (!validation.valid) {
    const result = Object.freeze({
      status: 'override_rejected',
      reason: INVALID_OVERRIDE_REASON,
    });

    logOverrideAttempt({
      timestamp: isPlainObject(override) ? override.timestamp : null,
      status: result.status,
      reason: result.reason,
      conceptId: OVERRIDABLE_CONCEPT_ID,
    });

    return result;
  }

  const result = Object.freeze({
    status: 'override_rejected',
    reason: OVERRIDE_DISABLED_REASON,
  });

  logOverrideAttempt({
    timestamp: override.timestamp,
    status: result.status,
    reason: result.reason,
    conceptId: OVERRIDABLE_CONCEPT_ID,
  });

  return result;
}

function getOverrideAttemptLog() {
  return overrideAttemptLog.slice();
}

function clearOverrideAttemptLog() {
  overrideAttemptLog.length = 0;
}

module.exports = {
  CONCEPT_UNLOCK_OVERRIDE_TEMPLATE,
  INVALID_OVERRIDE_REASON,
  OVERRIDE_DISABLED_REASON,
  OVERRIDABLE_CONCEPT_ID,
  OVERRIDE_ACTOR_ROLE,
  OVERRIDE_APPROVAL_TOKEN,
  OVERRIDE_REASON,
  OVERRIDE_SCOPE,
  applyOverride,
  clearOverrideAttemptLog,
  getOverrideAttemptLog,
  logOverrideAttempt,
  validateOverride,
};
