'use strict';

const assert = require('node:assert/strict');
const {
  buildLiveConceptProfiles,
} = require('../src/modules/concepts/concept-profile-comparator');
const {
  getConceptById,
} = require('../src/modules/concepts/concept-loader');
const {
  validateBoundaryProofRequirements,
} = require('../src/modules/concepts/concept-boundary-proof');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getConcept(conceptId) {
  const concept = getConceptById(conceptId);
  assert.notEqual(concept, null, `Expected authored concept packet for ${conceptId}.`);
  return concept;
}

function verifyMissingProofFails(liveConceptProfiles) {
  const authority = clone(getConcept('authority'));
  delete authority.boundaryProofs;

  assert.throws(
    () => validateBoundaryProofRequirements(authority, liveConceptProfiles),
    /missing boundaryProofs\.power/,
    'missing boundary proof must fail deterministically.',
  );

  process.stdout.write('PASS concept_boundary_proof_missing_proof_fails\n');
}

function verifyGenericProofFails(liveConceptProfiles) {
  const authority = clone(getConcept('authority'));
  authority.boundaryProofs.power.boundaryStatement = 'different';

  assert.throws(
    () => validateBoundaryProofRequirements(authority, liveConceptProfiles),
    /generic boundaryProofs\.power\.boundaryStatement/,
    'generic boundary proof text must fail deterministically.',
  );

  process.stdout.write('PASS concept_boundary_proof_generic_proof_fails\n');
}

function verifyMismatchedReferenceFails(liveConceptProfiles) {
  const power = clone(getConcept('power'));
  power.boundaryProofs.authority.notIdenticalTo = 'legitimacy';

  assert.throws(
    () => validateBoundaryProofRequirements(power, liveConceptProfiles),
    /boundaryProofs\.authority\.notIdenticalTo must equal "authority"/,
    'boundary proof reference mismatch must fail deterministically.',
  );

  process.stdout.write('PASS concept_boundary_proof_reference_mismatch_fails\n');
}

function verifyValidLiveProofsPass(liveConceptProfiles) {
  const authorityReport = validateBoundaryProofRequirements(getConcept('authority'), liveConceptProfiles);
  const powerReport = validateBoundaryProofRequirements(getConcept('power'), liveConceptProfiles);
  const legitimacyReport = validateBoundaryProofRequirements(getConcept('legitimacy'), liveConceptProfiles);

  assert.deepEqual(
    authorityReport.requiredComparisons.map((entry) => entry.otherConceptId),
    ['power', 'legitimacy'],
    'authority boundary proof requirements mismatch.',
  );
  assert.deepEqual(
    powerReport.requiredComparisons.map((entry) => entry.otherConceptId),
    ['authority', 'legitimacy'],
    'power boundary proof requirements mismatch.',
  );
  assert.deepEqual(
    legitimacyReport.requiredComparisons.map((entry) => entry.otherConceptId),
    ['authority', 'power'],
    'legitimacy boundary proof requirements mismatch.',
  );

  process.stdout.write('PASS concept_boundary_proof_valid_proof_passes\n');
}

function main() {
  const liveConceptProfiles = buildLiveConceptProfiles();
  verifyMissingProofFails(liveConceptProfiles);
  verifyGenericProofFails(liveConceptProfiles);
  verifyMismatchedReferenceFails(liveConceptProfiles);
  verifyValidLiveProofsPass(liveConceptProfiles);
  process.stdout.write('ChatPDM concept boundary proof verification passed.\n');
}

main();
