'use strict';

const assert = require('node:assert/strict');
const {
  CONCEPT_UNLOCK_OVERRIDE_TEMPLATE,
  OVERRIDE_APPROVAL_TOKEN,
  clearOverrideAttemptLog,
  evaluateBlockedConceptAdmission,
  getOverrideAttemptLog,
} = require('../src/modules/concepts');

function verifyViolationRemainsBlockedWithoutOverridePath() {
  const validOverride = {
    ...CONCEPT_UNLOCK_OVERRIDE_TEMPLATE,
    timestamp: '2026-03-31T13:00:00Z',
  };

  clearOverrideAttemptLog();

  const result = evaluateBlockedConceptAdmission('violation', validOverride);

  assert.deepEqual(
    result,
    {
      status: 'concept_blocked',
      reason: 'override_not_supported',
      conceptId: 'violation',
    },
    'violation should remain blocked because the unlock override path is disabled.',
  );

  const logEntries = getOverrideAttemptLog();
  assert.equal(logEntries.length, 0, 'blocked admission without override support should not write override logs.');

  process.stdout.write('PASS blocked_concept_admission_violation_remains_blocked\n');
}

function verifyAnyBlockedConceptReturnsNoOverrideSupport() {
  const validLookingOverride = {
    ...CONCEPT_UNLOCK_OVERRIDE_TEMPLATE,
    timestamp: '2026-03-31T13:00:00Z',
    approvalToken: `${OVERRIDE_APPROVAL_TOKEN}`,
  };

  clearOverrideAttemptLog();

  const result = evaluateBlockedConceptAdmission('violation', validLookingOverride);

  assert.deepEqual(
    result,
    {
      status: 'concept_blocked',
      reason: 'override_not_supported',
      conceptId: 'violation',
    },
    'blocked concept admission should not expose an unlock path for violation.',
  );

  const logEntries = getOverrideAttemptLog();
  assert.equal(logEntries.length, 0, 'disabled override path should not write override logs.');

  process.stdout.write('PASS blocked_concept_admission_override_not_supported\n');
}

function main() {
  verifyViolationRemainsBlockedWithoutOverridePath();
  verifyAnyBlockedConceptReturnsNoOverrideSupport();
  process.stdout.write('ChatPDM blocked concept admission verification passed.\n');
}

main();
