'use strict';

const assert = require('node:assert/strict');
const {
  CONCEPT_UNLOCK_OVERRIDE_TEMPLATE,
  INVALID_OVERRIDE_REASON,
  OVERRIDABLE_CONCEPT_ID,
  OVERRIDE_APPROVAL_TOKEN,
  clearOverrideAttemptLog,
  evaluateBlockedConceptAdmission,
  getOverrideAttemptLog,
} = require('../src/modules/concepts');

function verifyValidOverrideUnlocksViolation() {
  const validOverride = {
    ...CONCEPT_UNLOCK_OVERRIDE_TEMPLATE,
    timestamp: '2026-03-31T13:00:00Z',
  };

  clearOverrideAttemptLog();

  const result = evaluateBlockedConceptAdmission('violation', validOverride);

  assert.deepEqual(
    result,
    {
      status: 'override_applied',
      effect: 'concept_unlocked',
      conceptId: OVERRIDABLE_CONCEPT_ID,
    },
    'valid override should unlock violation through the admission gate.',
  );

  const logEntries = getOverrideAttemptLog();
  assert.equal(logEntries.length, 1, 'valid admission override should record one log entry.');
  assert.equal(logEntries[0].status, 'override_applied', 'valid admission override log status mismatch.');
  assert.equal(logEntries[0].conceptId, OVERRIDABLE_CONCEPT_ID, 'valid admission override conceptId mismatch.');

  process.stdout.write('PASS blocked_concept_admission_valid_override_unlocks_violation\n');
}

function verifyInvalidOverrideKeepsViolationBlocked() {
  const invalidOverride = {
    ...CONCEPT_UNLOCK_OVERRIDE_TEMPLATE,
    timestamp: '2026-03-31T13:00:00Z',
    approvalToken: `${OVERRIDE_APPROVAL_TOKEN}_INVALID`,
  };

  clearOverrideAttemptLog();

  const result = evaluateBlockedConceptAdmission('violation', invalidOverride);

  assert.deepEqual(
    result,
    {
      status: 'override_rejected',
      reason: INVALID_OVERRIDE_REASON,
    },
    'invalid override should be rejected through the admission gate.',
  );

  const logEntries = getOverrideAttemptLog();
  assert.equal(logEntries.length, 1, 'invalid admission override should record one log entry.');
  assert.equal(logEntries[0].status, 'override_rejected', 'invalid admission override log status mismatch.');
  assert.equal(logEntries[0].reason, INVALID_OVERRIDE_REASON, 'invalid admission override log reason mismatch.');
  assert.equal(logEntries[0].conceptId, OVERRIDABLE_CONCEPT_ID, 'invalid admission override conceptId mismatch.');

  process.stdout.write('PASS blocked_concept_admission_invalid_override_keeps_violation_blocked\n');
}

function main() {
  verifyValidOverrideUnlocksViolation();
  verifyInvalidOverrideKeepsViolationBlocked();
  process.stdout.write('ChatPDM blocked concept admission verification passed.\n');
}

main();
