'use strict';

const assert = require('node:assert/strict');
const {
  deriveConceptRuntimeGovernanceState,
  getConceptRuntimeGovernanceState,
  loadConceptValidationSnapshot,
} = require('../src/modules/concepts/concept-validation-state-loader');

function verifyPassingState() {
  const authorityState = getConceptRuntimeGovernanceState('authority');

  assert.equal(authorityState.available, true, 'authority runtime governance state should be available.');
  assert.equal(authorityState.source, 'validator_artifact', 'authority runtime governance state source mismatch.');
  assert.equal(authorityState.v3Status, 'passing', 'authority v3Status mismatch.');
  assert.equal(authorityState.relationStatus, 'passing', 'authority relationStatus mismatch.');
  assert.equal(authorityState.lawStatus, 'passing', 'authority lawStatus mismatch.');
  assert.equal(authorityState.enforcementStatus, 'passing', 'authority enforcementStatus mismatch.');
  assert.equal(authorityState.systemValidationState, 'law_validated', 'authority systemValidationState mismatch.');
  assert.equal(authorityState.isBlocked, false, 'authority should not be blocked.');
  assert.equal(authorityState.isStructurallyIncomplete, false, 'authority should not be structurally incomplete.');
  assert.equal(authorityState.isFullyValidated, true, 'authority should be fully validated.');
  assert.equal(authorityState.isActionable, true, 'authority should remain actionable.');

  process.stdout.write('PASS runtime_validation_state_passing\n');
}

function verifyBlockedStateMapping() {
  const blockedState = deriveConceptRuntimeGovernanceState({
    conceptId: 'duty',
    validationState: 'fully_validated',
    v3Status: 'passing',
    relationStatus: 'incomplete',
    lawStatus: 'failing',
    enforcementStatus: 'blocked',
    systemValidationState: 'law_blocked',
    relations: {
      source: 'authored',
      relationDataPresent: true,
      dataSource: 'authored_relation_packets',
    },
    laws: {
      source: 'authored',
      dataSource: 'authored_relation_packets',
    },
  });

  assert.equal(blockedState.isBlocked, true, 'blocked runtime state should set isBlocked.');
  assert.equal(blockedState.isActionable, false, 'blocked runtime state should not stay actionable.');
  assert.equal(blockedState.isFullyValidated, false, 'blocked runtime state must not count as fully validated.');
  assert.equal(blockedState.systemValidationState, 'law_blocked', 'blocked runtime state systemValidationState mismatch.');

  process.stdout.write('PASS runtime_validation_state_blocked_mapping\n');
}

function verifyStructuralIncompleteMapping() {
  const incompleteState = deriveConceptRuntimeGovernanceState({
    conceptId: 'responsibility',
    validationState: 'structurally_incomplete',
    v3Status: 'incomplete',
    relationStatus: 'not_applicable',
    lawStatus: 'not_applicable',
    enforcementStatus: 'passing',
    systemValidationState: 'structurally_incomplete',
    relations: {
      source: 'none',
      relationDataPresent: false,
      dataSource: 'none',
    },
    laws: {
      source: 'none',
      dataSource: 'none',
    },
  });

  assert.equal(
    incompleteState.isStructurallyIncomplete,
    true,
    'structurally incomplete runtime state should set isStructurallyIncomplete.',
  );
  assert.equal(incompleteState.isBlocked, false, 'structurally incomplete runtime state should not be blocked by default.');
  assert.equal(incompleteState.isFullyValidated, false, 'structurally incomplete runtime state must not count as fully validated.');
  assert.equal(incompleteState.isActionable, true, 'structurally incomplete runtime state should remain actionable.');

  process.stdout.write('PASS runtime_validation_state_structural_mapping\n');
}

function verifySnapshotAvailability() {
  const snapshot = loadConceptValidationSnapshot();

  assert.equal(snapshot.available, true, 'validation snapshot should be available in the checked-in repo state.');
  assert.equal(snapshot.source, 'validator_artifact', 'validation snapshot source mismatch.');
  assert.ok(snapshot.conceptsById.has('authority'), 'validation snapshot should include authority.');
  assert.ok(snapshot.conceptsById.has('power'), 'validation snapshot should include power.');

  process.stdout.write('PASS runtime_validation_snapshot_available\n');
}

function main() {
  verifySnapshotAvailability();
  verifyPassingState();
  verifyBlockedStateMapping();
  verifyStructuralIncompleteMapping();
  process.stdout.write('ChatPDM runtime validation-state verification passed.\n');
}

main();
