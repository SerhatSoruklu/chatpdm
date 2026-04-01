'use strict';

const assert = require('node:assert/strict');
const {
  assertConceptEligibleForLiveAdmission,
  assertLiveConceptOverlapAdmissions,
  evaluateConceptOverlapAdmission,
  getConceptById,
  loadConceptSet,
} = require('../src/modules/concepts');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getLiveConcept(conceptId) {
  const concept = getConceptById(conceptId);
  assert.notEqual(concept, null, `Expected authored concept packet for ${conceptId}.`);
  return concept;
}

function buildConflictingConceptCandidate() {
  const candidate = clone(getLiveConcept('authority'));
  candidate.conceptId = 'directive-capacity';
  candidate.concept = 'directive-capacity';
  candidate.title = 'Directive Capacity';
  candidate.canonical.invariant = 'Directive capacity is the governance-layer position in which agenda-shaping leverage can structure direction without becoming recognized standing.';
  candidate.canonical.adjacent = {
    law: 'Directive capacity can shape directional conditions around governance without becoming law as a binding normative rule.',
  };
  candidate.shortDefinition = 'Directive capacity is a governance-layer position in which agenda-shaping leverage structures direction without becoming recognized standing.';
  candidate.coreMeaning = 'Directive capacity marks a governance-layer position in which leverage can shape direction while remaining distinct from recognized standing, required conduct, and answerability.';
  candidate.fullDefinition = 'Directive capacity marks a governance-layer position in which agenda-shaping leverage structures direction without becoming recognized standing. It remains distinct from authority because it does not attach directive right to a recognized role or office, even though it can shape how direction is exercised.';
  candidate.registers.standard.shortDefinition = candidate.shortDefinition;
  candidate.registers.standard.coreMeaning = candidate.coreMeaning;
  candidate.registers.standard.fullDefinition = candidate.fullDefinition;
  candidate.constraintContract.expectedIdentityKind = 'agenda_shaping_leverage';
  candidate.structuralProfile.function = 'agenda-shaping leverage within a governance order';
  candidate.structuralProfile.object = 'agenda leverage around directive activity';
  candidate.structuralProfile.temporalRole = 'operative during agenda formation';
  candidate.reviewMetadata.must_not_collapse_into = ['law'];
  delete candidate.boundaryProofs;
  return candidate;
}

function buildDuplicateConceptCandidate() {
  const candidate = clone(getLiveConcept('power'));
  candidate.conceptId = 'power-shadow';
  candidate.concept = 'power-shadow';
  candidate.title = 'Power Shadow';
  candidate.canonical.invariant = 'Power shadow is effective capacity to produce outcomes in relation to a governance structure.';
  candidate.canonical.adjacent = {
    authority: 'Authority concerns recognized standing to direct, not effective capacity by itself.',
    legitimacy: 'Legitimacy concerns valid standing within an order, not operative capacity to produce outcomes.',
  };
  candidate.reviewMetadata.must_not_collapse_into = ['authority', 'legitimacy'];
  delete candidate.boundaryProofs;
  return candidate;
}

function buildAdjacentConceptWithoutProof() {
  const candidate = clone(getLiveConcept('power'));
  candidate.conceptId = 'power-transition';
  candidate.concept = 'power-transition';
  candidate.title = 'Power Transition';
  candidate.canonical.invariant = 'Power transition is effective capacity to produce outcomes as it moves from latent leverage into operative exercise within governance.';
  candidate.shortDefinition = 'Power transition is effective capacity to produce outcomes as it moves from latent leverage into operative exercise within governance.';
  candidate.coreMeaning = 'Power transition marks the same outcome-producing capacity as power while assigning it a different temporal position between latent leverage and fully operative exercise.';
  candidate.fullDefinition = 'Power transition marks the same outcome-producing capacity as power while assigning it a different temporal position between latent leverage and fully operative exercise. It remains close enough to power that explicit separation must be authored before admission.';
  candidate.registers.standard.shortDefinition = candidate.shortDefinition;
  candidate.registers.standard.coreMeaning = candidate.coreMeaning;
  candidate.registers.standard.fullDefinition = candidate.fullDefinition;
  candidate.constraintContract.expectedIdentityKind = 'transitional_outcome_capacity';
  candidate.structuralProfile.temporalRole = 'transition from latent leverage into operative outcome production';
  delete candidate.boundaryProofs;
  return candidate;
}

function buildContractDuplicateConceptCandidate() {
  const candidate = clone(getLiveConcept('authority'));
  candidate.conceptId = 'directive-office-shadow';
  candidate.concept = 'directive-office-shadow';
  candidate.title = 'Directive Office Shadow';
  candidate.canonical.invariant = 'Directive office shadow is a governance-layer standing that settles internal direction without becoming a new runtime concept role.';
  candidate.canonical.adjacent = {
    power: 'Power concerns capacity to produce outcomes, not recognized standing to direct.',
    legitimacy: 'Legitimacy concerns valid standing, not the standing role itself.',
  };
  candidate.shortDefinition = 'Directive office shadow is a governance-layer standing that settles internal direction without becoming a new runtime concept role.';
  candidate.coreMeaning = 'Directive office shadow marks a claimed governance standing that remains distinct in profile wording but still claims the same contract role as authority.';
  candidate.fullDefinition = 'Directive office shadow marks a claimed governance standing that remains distinct in profile wording but still claims the same contract role as authority. The overlap gate must block it because the contract role is already occupied inside the live kernel.';
  candidate.registers.standard.shortDefinition = candidate.shortDefinition;
  candidate.registers.standard.coreMeaning = candidate.coreMeaning;
  candidate.registers.standard.fullDefinition = candidate.fullDefinition;
  candidate.structuralProfile.function = 'recognized dispute-settlement standing within a governance order';
  candidate.structuralProfile.object = 'settlement acts and directional settlement authority';
  candidate.structuralProfile.actorRelation = 'actor or office holds recognized standing to settle directional disputes';
  candidate.structuralProfile.temporalRole = 'standing during adjudicative settlement';
  delete candidate.boundaryProofs;
  return candidate;
}

function buildMissingContractCandidate() {
  const candidate = clone(getLiveConcept('law'));
  candidate.conceptId = 'law-shadow';
  candidate.concept = 'law-shadow';
  candidate.title = 'Law Shadow';
  candidate.canonical.invariant = 'Law shadow is a claimed governance source-like concept used only to verify contract-presence blocking.';
  candidate.shortDefinition = 'Law shadow is a claimed governance source-like concept used only to verify contract-presence blocking.';
  candidate.coreMeaning = 'Law shadow keeps a valid authored shape while intentionally removing the constraint contract so the overlap gate must fail closed.';
  candidate.fullDefinition = 'Law shadow keeps a valid authored shape while intentionally removing the constraint contract so the overlap gate must fail closed before any admission decision can be treated as safe.';
  candidate.registers.standard.shortDefinition = candidate.shortDefinition;
  candidate.registers.standard.coreMeaning = candidate.coreMeaning;
  candidate.registers.standard.fullDefinition = candidate.fullDefinition;
  delete candidate.constraintContract;
  delete candidate.boundaryProofs;
  return candidate;
}

function verifyConflictingConceptBlocked(liveConcepts) {
  const report = evaluateConceptOverlapAdmission(buildConflictingConceptCandidate(), liveConcepts);

  assert.equal(report.admission, 'overlap_scan_failed_conflict', 'conflicting concept must fail overlap admission.');
  assert.equal(report.blocking, true, 'conflicting concept must block admission.');
  assert.equal(report.blockingResults.some((result) => result.classification === 'conflicting'), true, 'conflicting concept must expose conflicting comparison results.');

  process.stdout.write('PASS concept_overlap_admission_conflicting_concept_blocked\n');
}

function verifyDuplicateConceptBlocked(liveConcepts) {
  const report = evaluateConceptOverlapAdmission(buildDuplicateConceptCandidate(), liveConcepts);

  assert.equal(report.admission, 'overlap_scan_failed_duplicate', 'duplicate concept must fail overlap admission.');
  assert.equal(report.blocking, true, 'duplicate concept must block admission.');
  assert.equal(report.blockingResults.some((result) => result.classification === 'duplicate_candidate'), true, 'duplicate concept must expose duplicate comparison results.');

  process.stdout.write('PASS concept_overlap_admission_duplicate_concept_blocked\n');
}

function verifyContractDuplicateConceptBlocked(liveConcepts) {
  const report = evaluateConceptOverlapAdmission(buildContractDuplicateConceptCandidate(), liveConcepts);

  assert.equal(report.admission, 'overlap_scan_failed_duplicate', 'contract-duplicate concept must fail overlap admission.');
  assert.equal(report.blocking, true, 'contract-duplicate concept must block admission.');
  assert.equal(
    report.blockingResults.some((result) => (
      result.classification === 'duplicate_candidate'
      && result.signalSource === 'constraint_contract'
      && result.structuralFailureKind === 'ontological_impossibility'
    )),
    true,
    'contract-duplicate concept must expose a constraint-contract duplicate result.',
  );

  process.stdout.write('PASS concept_overlap_admission_contract_duplicate_blocked\n');
}

function verifyAdjacentConceptWithoutProofBlocked(liveConcepts) {
  const report = evaluateConceptOverlapAdmission(buildAdjacentConceptWithoutProof(), liveConcepts);

  assert.equal(report.admission, 'overlap_scan_boundary_required', 'adjacent concept without proof must block on boundary proof.');
  assert.equal(report.blocking, true, 'adjacent concept without proof must block admission.');
  assert.equal(report.blockingResults.some((result) => result.requiredBoundaryProof), true, 'adjacent concept must surface a boundary-proof requirement.');

  process.stdout.write('PASS concept_overlap_admission_adjacent_without_proof_blocked\n');
}

function verifyMissingConstraintContractBlocked(liveConcepts) {
  const report = evaluateConceptOverlapAdmission(buildMissingContractCandidate(), liveConcepts);

  assert.equal(report.admission, 'overlap_scan_failed_conflict', 'missing constraint contract must fail as a blocking conflict.');
  assert.equal(report.blocking, true, 'missing constraint contract must block admission.');
  assert.deepEqual(
    report.structuralFailureKinds,
    ['contract_violation'],
    'missing constraint contract must map to contract_violation.',
  );

  process.stdout.write('PASS concept_overlap_admission_missing_constraint_contract_blocked\n');
}

function verifyValidConceptPasses(liveConcepts) {
  const power = getLiveConcept('power');
  const report = evaluateConceptOverlapAdmission(power, liveConcepts);

  assert.equal(report.admission, 'overlap_scan_passed', 'valid live concept must pass overlap admission.');
  assert.equal(report.blocking, false, 'valid live concept must not block admission.');
  assert.doesNotThrow(
    () => assertConceptEligibleForLiveAdmission(power, liveConcepts),
    'valid live concept should remain eligible for live admission.',
  );
  assert.doesNotThrow(
    () => assertLiveConceptOverlapAdmissions(loadConceptSet()),
    'current live concept set must satisfy the overlap admission gate.',
  );

  process.stdout.write('PASS concept_overlap_admission_valid_concept_passes\n');
}

function main() {
  const liveConcepts = loadConceptSet();
  verifyConflictingConceptBlocked(liveConcepts);
  verifyDuplicateConceptBlocked(liveConcepts);
  verifyContractDuplicateConceptBlocked(liveConcepts);
  verifyAdjacentConceptWithoutProofBlocked(liveConcepts);
  verifyMissingConstraintContractBlocked(liveConcepts);
  verifyValidConceptPasses(liveConcepts);
  process.stdout.write('ChatPDM concept overlap admission gate verification passed.\n');
}

main();
