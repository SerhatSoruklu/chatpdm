'use strict';

const assert = require('node:assert/strict');

const {
  assertLiveConceptConstraintContractIntegration,
  assertStoredConceptRelationshipSnapshotAuthority,
  classifyConstraintContractFailure,
  evaluateConstraintContractCase,
  getConceptById,
  loadConceptSet,
} = require('../src/modules/concepts');

function verifyLiveConceptContractsIntegrated() {
  const liveConcepts = loadConceptSet();
  const summaries = assertLiveConceptConstraintContractIntegration(liveConcepts);
  const kindKeys = summaries.map((summary) => `${summary.kindField}:${summary.kindValue}`);

  assert.equal(
    summaries.length,
    liveConcepts.length,
    'every live concept must expose an integrated constraint contract.',
  );
  assert.equal(
    new Set(kindKeys).size,
    kindKeys.length,
    'live concept contract roles must remain unique across the live kernel.',
  );

  process.stdout.write('PASS constraint_contract_live_kernel_integration\n');
}

function verifySnapshotAuthorityPasses() {
  const drift = assertStoredConceptRelationshipSnapshotAuthority();

  assert.equal(
    drift.blockingChanges.length,
    0,
    'snapshot authority must not allow unapproved drift in the current repo state.',
  );

  process.stdout.write('PASS constraint_contract_snapshot_authority\n');
}

function verifyStructuralFailureClassification() {
  const authority = getConceptById('authority');
  assert.notEqual(authority, null, 'authority concept packet must be available.');

  const ontologicalMismatch = evaluateConstraintContractCase(
    {
      domain: 'governance',
      identityKind: 'operative_outcome_capacity',
      governanceOrder: 'governance_order',
    },
    authority,
  );
  assert.equal(
    classifyConstraintContractFailure(ontologicalMismatch),
    'ontological_impossibility',
    'identity-kind mismatch must map to ontological_impossibility.',
  );

  const invariantCollapse = evaluateConstraintContractCase(
    {
      domain: 'governance',
      identityKind: 'recognized_directive_standing',
      governanceOrder: 'governance_order',
      relationType: 'equivalent_to',
      relatedConceptId: 'power',
    },
    authority,
  );
  assert.equal(
    classifyConstraintContractFailure(invariantCollapse),
    'invariant_breach',
    'forbidden equivalence collapse must map to invariant_breach.',
  );

  const contractViolation = evaluateConstraintContractCase(
    {
      domain: 'psychology',
      identityKind: 'recognized_directive_standing',
      governanceOrder: 'governance_order',
    },
    authority,
  );
  assert.equal(
    classifyConstraintContractFailure(contractViolation),
    'contract_violation',
    'refused out-of-domain contract input must map to contract_violation.',
  );

  process.stdout.write('PASS constraint_contract_structural_failure_layer\n');
}

function main() {
  verifyLiveConceptContractsIntegrated();
  verifySnapshotAuthorityPasses();
  verifyStructuralFailureClassification();
  process.stdout.write('Constraint-contract system integration verification passed.\n');
}

main();
