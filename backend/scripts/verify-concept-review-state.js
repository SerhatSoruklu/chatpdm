'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  clearConceptReviewStateCache,
  getConceptReviewState,
  getConceptRuntimeGovernanceState,
  loadConceptReviewStateRegistry,
} = require('../src/modules/concepts');

function withTempReviewStateDirectory(fileMap, fn) {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'chatpdm-review-state-'));

  try {
    Object.entries(fileMap).forEach(([fileName, record]) => {
      fs.writeFileSync(path.join(tempDirectory, fileName), `${JSON.stringify(record, null, 2)}\n`);
    });

    clearConceptReviewStateCache();
    return fn(tempDirectory);
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
    clearConceptReviewStateCache();
  }
}

function verifyValidBlockedState() {
  const reviewState = getConceptReviewState('violation');

  assert.deepEqual(
    reviewState,
    {
      conceptId: 'violation',
      admission: 'blocked',
      lastValidatedAt: '2026-03-31T00:00:00Z',
      validationSource: 'manual_review',
    },
    'violation review state mismatch.',
  );

  process.stdout.write('PASS valid_blocked_review_state\n');
}

function verifyValidPhase2StableState() {
  const reviewState = getConceptReviewState('law');

  assert.deepEqual(
    reviewState,
    {
      conceptId: 'law',
      admission: 'phase2_stable',
      lastValidatedAt: '2026-03-31T00:00:00Z',
      validationSource: 'manual_review',
    },
    'law review state mismatch.',
  );

  process.stdout.write('PASS valid_phase2_stable_review_state\n');
}

function verifyValidPhase1PassedState() {
  withTempReviewStateDirectory({
    'trust.review-state.json': {
      conceptId: 'trust',
      admission: 'phase1_passed',
      lastValidatedAt: '2026-03-31T10:15:00Z',
      validationSource: 'system',
    },
  }, (directoryPath) => {
    const reviewState = getConceptReviewState('trust', directoryPath);

    assert.deepEqual(
      reviewState,
      {
        conceptId: 'trust',
        admission: 'phase1_passed',
        lastValidatedAt: '2026-03-31T10:15:00Z',
        validationSource: 'system',
      },
      'phase1_passed review state mismatch.',
    );
  });

  process.stdout.write('PASS valid_phase1_passed_review_state\n');
}

function verifyInvalidAdmissionRejected() {
  assert.throws(
    () => withTempReviewStateDirectory({
      'bad.review-state.json': {
        conceptId: 'law',
        admission: 'phase3_approved',
        lastValidatedAt: '2026-03-31T10:15:00Z',
        validationSource: 'manual_review',
      },
    }, (directoryPath) => loadConceptReviewStateRegistry(directoryPath)),
    /unsupported admission/,
    'invalid admission values must be rejected.',
  );

  process.stdout.write('PASS invalid_admission_rejected\n');
}

function verifyMissingRequiredFieldsRejected() {
  assert.throws(
    () => withTempReviewStateDirectory({
      'missing.review-state.json': {
        conceptId: 'law',
        admission: 'phase2_stable',
        validationSource: 'manual_review',
      },
    }, (directoryPath) => loadConceptReviewStateRegistry(directoryPath)),
    /invalid lastValidatedAt/,
    'missing required fields must be rejected.',
  );

  process.stdout.write('PASS missing_required_fields_rejected\n');
}

function verifyGovernanceStateRemainsUntouched() {
  const before = getConceptRuntimeGovernanceState('authority');
  getConceptReviewState('law');
  const after = getConceptRuntimeGovernanceState('authority');

  assert.deepEqual(after, before, 'governanceState should not change after loading review states.');
  assert.equal(
    Object.prototype.hasOwnProperty.call(after, 'admission'),
    false,
    'governanceState must not expose review-state fields.',
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(after, 'validationSource'),
    false,
    'governanceState must not expose review-state fields.',
  );

  process.stdout.write('PASS governance_state_untouched\n');
}

function main() {
  verifyValidBlockedState();
  verifyValidPhase1PassedState();
  verifyValidPhase2StableState();
  verifyInvalidAdmissionRejected();
  verifyMissingRequiredFieldsRejected();
  verifyGovernanceStateRemainsUntouched();
  process.stdout.write('ChatPDM concept review-state verification passed.\n');
}

main();
