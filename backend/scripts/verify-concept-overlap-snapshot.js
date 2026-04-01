'use strict';

const assert = require('node:assert/strict');

const {
  buildCurrentConceptRelationshipSnapshot,
  evaluateConceptRelationshipSnapshotDrift,
  loadBoundaryChangeApprovalRegistry,
  loadStoredConceptRelationshipSnapshot,
  validateBoundaryChangeApproval,
} = require('../src/modules/concepts/concept-overlap-snapshot');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function findSnapshotEntry(snapshot, predicate) {
  return [...snapshot.authoredPairs, ...snapshot.regressionPairs].find(predicate);
}

function mutateSnapshotEntry(snapshot, predicate, newClassification) {
  const entry = findSnapshotEntry(snapshot, predicate);
  assert.notEqual(entry, undefined, 'Target snapshot entry was not found.');
  entry.classification = newClassification;
}

function verifyStoredSnapshotMatchesCurrentRelationships() {
  const storedSnapshot = loadStoredConceptRelationshipSnapshot();
  const currentSnapshot = buildCurrentConceptRelationshipSnapshot();
  const approvals = loadBoundaryChangeApprovalRegistry();
  const drift = evaluateConceptRelationshipSnapshotDrift(storedSnapshot, currentSnapshot, approvals);

  assert.equal(
    drift.changes.length,
    0,
    `Concept relationship snapshot drift detected: ${JSON.stringify(drift.changes, null, 2)}`,
  );

  process.stdout.write('PASS concept_overlap_snapshot_matches_current_relationships\n');
}

function verifyClassificationChangeFailsWithoutApproval() {
  const storedSnapshot = clone(buildCurrentConceptRelationshipSnapshot());
  mutateSnapshotEntry(
    storedSnapshot,
    (entry) => entry.scope === 'authored_pair'
      && entry.conceptId === 'authority'
      && entry.otherConceptId === 'power',
    'distinct',
  );

  const drift = evaluateConceptRelationshipSnapshotDrift(
    storedSnapshot,
    buildCurrentConceptRelationshipSnapshot(),
    { approvals: [] },
  );

  assert.equal(drift.blockingChanges.length, 1, 'classification drift without approval must block.');
  assert.deepEqual(
    drift.blockingChanges[0],
    {
      scope: 'authored_pair',
      caseId: null,
      conceptId: 'authority',
      otherConceptId: 'power',
      previousClassification: 'distinct',
      newClassification: 'adjacent',
      approved: false,
      reason: null,
      approvedBy: null,
      approvedAt: null,
    },
    'unapproved classification drift log mismatch.',
  );

  process.stdout.write('PASS concept_overlap_snapshot_classification_change_fails_without_approval\n');
}

function verifyApprovedChangeIsRecognizedExplicitly() {
  const storedSnapshot = clone(buildCurrentConceptRelationshipSnapshot());
  mutateSnapshotEntry(
    storedSnapshot,
    (entry) => entry.scope === 'regression_pair' && entry.caseId === 'obligation_vs_duty',
    'adjacent',
  );

  const approval = validateBoundaryChangeApproval({
    scope: 'regression_pair',
    caseId: 'obligation_vs_duty',
    conceptId: 'obligation',
    otherConceptId: 'duty',
    previousClassification: 'adjacent',
    newClassification: 'requires_explicit_boundary_note',
    reason: 'Approved regression restoration for obligation duty boundary classification.',
    approvedBy: 'test-harness',
    approvedAt: '2026-04-01T00:00:00Z',
  });

  const drift = evaluateConceptRelationshipSnapshotDrift(
    storedSnapshot,
    buildCurrentConceptRelationshipSnapshot(),
    { approvals: [approval] },
  );

  assert.equal(drift.blockingChanges.length, 0, 'approved classification drift should not remain blocking.');
  assert.equal(drift.approvedChanges.length, 1, 'approved classification drift should be logged exactly once.');
  assert.equal(drift.approvedChanges[0].reason, approval.reason, 'approved change reason mismatch.');

  process.stdout.write('PASS concept_overlap_snapshot_approved_change_logged\n');
}

function verifyRegressionPairsRemainFrozen() {
  const storedSnapshot = loadStoredConceptRelationshipSnapshot();

  assert.equal(
    findSnapshotEntry(
      storedSnapshot,
      (entry) => entry.scope === 'regression_pair' && entry.caseId === 'duty_vs_responsibility',
    ).classification,
    'distinct',
    'duty vs responsibility regression classification mismatch.',
  );
  assert.equal(
    findSnapshotEntry(
      storedSnapshot,
      (entry) => entry.scope === 'regression_pair' && entry.caseId === 'obligation_vs_duty',
    ).classification,
    'requires_explicit_boundary_note',
    'obligation vs duty regression classification mismatch.',
  );
  assert.equal(
    findSnapshotEntry(
      storedSnapshot,
      (entry) => entry.scope === 'regression_pair' && entry.caseId === 'obligation_vs_responsibility',
    ).classification,
    'distinct',
    'obligation vs responsibility regression classification mismatch.',
  );
  assert.equal(
    findSnapshotEntry(
      storedSnapshot,
      (entry) => entry.scope === 'regression_pair' && entry.caseId === 'authority_vs_power',
    ).classification,
    'adjacent',
    'authority vs power regression classification mismatch.',
  );
  assert.equal(
    findSnapshotEntry(
      storedSnapshot,
      (entry) => entry.scope === 'regression_pair' && entry.caseId === 'legitimacy_vs_authority',
    ).classification,
    'adjacent',
    'legitimacy vs authority regression classification mismatch.',
  );

  process.stdout.write('PASS concept_overlap_snapshot_regression_pairs_frozen\n');
}

function main() {
  verifyStoredSnapshotMatchesCurrentRelationships();
  verifyClassificationChangeFailsWithoutApproval();
  verifyApprovedChangeIsRecognizedExplicitly();
  verifyRegressionPairsRemainFrozen();
  process.stdout.write('ChatPDM concept overlap snapshot verification passed.\n');
}

main();
