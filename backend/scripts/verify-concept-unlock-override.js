'use strict';

const assert = require('node:assert/strict');
const {
  CONCEPT_UNLOCK_OVERRIDE_TEMPLATE,
  INVALID_OVERRIDE_REASON,
  OVERRIDE_DISABLED_REASON,
  OVERRIDABLE_CONCEPT_ID,
  OVERRIDE_APPROVAL_TOKEN,
  applyOverride,
  clearOverrideAttemptLog,
  getOverrideAttemptLog,
  validateOverride,
} = require('../src/modules/concepts');

function withCapturedStderr(fn) {
  const originalWrite = process.stderr.write;
  let captured = '';

  process.stderr.write = (chunk, encoding, callback) => {
    captured += String(chunk);

    if (typeof encoding === 'function') {
      encoding();
      return true;
    }

    if (typeof callback === 'function') {
      callback();
    }

    return true;
  };

  try {
    return {
      result: fn(),
      captured,
    };
  } finally {
    process.stderr.write = originalWrite;
  }
}

function assertSingleLogEntry(expectedStatus, expectedReason) {
  const entries = getOverrideAttemptLog();
  assert.equal(entries.length, 1, 'exactly one log entry should be recorded.');
  assert.equal(entries[0].status, expectedStatus, 'log status mismatch.');
  assert.equal(entries[0].reason, expectedReason, 'log reason mismatch.');
  assert.equal(entries[0].conceptId, OVERRIDABLE_CONCEPT_ID, 'log conceptId mismatch.');
}

function verifyValidOverride() {
  const validOverride = {
    ...CONCEPT_UNLOCK_OVERRIDE_TEMPLATE,
    timestamp: '2026-03-31T12:00:00Z',
  };

  assert.deepEqual(
    validateOverride(validOverride),
    { valid: true, reason: null },
    'valid override should pass validation.',
  );

  clearOverrideAttemptLog();
  const { result, captured } = withCapturedStderr(() => applyOverride(validOverride));

  assert.deepEqual(
    result,
    {
      status: 'override_rejected',
      reason: OVERRIDE_DISABLED_REASON,
    },
    'valid-looking override should still be rejected when no concept unlock path is supported.',
  );
  assert.match(captured, /\[chatpdm-concepts] override-attempt /, 'valid override should write a log line.');
  assert.match(captured, /"status":"override_rejected"/, 'valid override log line should include rejected status.');
  assertSingleLogEntry('override_rejected', OVERRIDE_DISABLED_REASON);

  process.stdout.write('PASS valid_override_rejected_when_unlock_disabled\n');
}

function verifyInvalidApprovalToken() {
  const invalidOverride = {
    ...CONCEPT_UNLOCK_OVERRIDE_TEMPLATE,
    timestamp: '2026-03-31T12:00:00Z',
    approvalToken: `${OVERRIDE_APPROVAL_TOKEN}_NOPE`,
  };

  assert.deepEqual(
    validateOverride(invalidOverride),
    { valid: false, reason: INVALID_OVERRIDE_REASON },
    'invalid approval token should fail validation.',
  );

  clearOverrideAttemptLog();
  const { result, captured } = withCapturedStderr(() => applyOverride(invalidOverride));

  assert.deepEqual(
    result,
    {
      status: 'override_rejected',
      reason: INVALID_OVERRIDE_REASON,
    },
    'invalid approval token should reject override.',
  );
  assert.match(captured, /"status":"override_rejected"/, 'invalid override log line should include rejected status.');
  assertSingleLogEntry('override_rejected', INVALID_OVERRIDE_REASON);

  process.stdout.write('PASS invalid_approval_token_rejected\n');
}

function verifyMissingOrExtraFieldsReject() {
  const missingFieldOverride = {
    reason: 'manual_review',
    scope: 'concept_unlock',
    actorRole: 'admin',
    approvalToken: OVERRIDE_APPROVAL_TOKEN,
  };
  const extraFieldOverride = {
    ...CONCEPT_UNLOCK_OVERRIDE_TEMPLATE,
    timestamp: '2026-03-31T12:00:00Z',
    conceptId: OVERRIDABLE_CONCEPT_ID,
  };

  assert.equal(
    validateOverride(missingFieldOverride).valid,
    false,
    'missing timestamp should fail validation.',
  );
  assert.equal(
    validateOverride(extraFieldOverride).valid,
    false,
    'extra fields should fail validation.',
  );

  process.stdout.write('PASS missing_or_extra_fields_rejected\n');
}

function verifyInvalidTimestampRejects() {
  const invalidTimestampOverride = {
    ...CONCEPT_UNLOCK_OVERRIDE_TEMPLATE,
    timestamp: '2026-03-31 12:00:00',
  };

  assert.deepEqual(
    validateOverride(invalidTimestampOverride),
    { valid: false, reason: INVALID_OVERRIDE_REASON },
    'non-ISO timestamp should fail validation.',
  );

  clearOverrideAttemptLog();
  const { result } = withCapturedStderr(() => applyOverride(invalidTimestampOverride));
  assert.deepEqual(
    result,
    {
      status: 'override_rejected',
      reason: INVALID_OVERRIDE_REASON,
    },
    'invalid timestamp should reject override.',
  );
  assertSingleLogEntry('override_rejected', INVALID_OVERRIDE_REASON);
  assert.equal(getOverrideAttemptLog()[0].timestamp, null, 'invalid timestamps should log as null.');

  process.stdout.write('PASS invalid_timestamp_rejected\n');
}

function main() {
  verifyValidOverride();
  verifyInvalidApprovalToken();
  verifyMissingOrExtraFieldsReject();
  verifyInvalidTimestampRejects();
  process.stdout.write('ChatPDM concept unlock override verification passed.\n');
}

main();
