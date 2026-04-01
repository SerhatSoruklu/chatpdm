'use strict';

const assert = require('node:assert/strict');
const {
  buildLiveConceptProfiles,
  compareConceptProfiles,
  compareProfileAgainstLiveConcepts,
} = require('../src/modules/concepts/concept-profile-comparator');
const { loadConceptSet } = require('../src/modules/concepts/concept-loader');
const { normalizeConceptToProfile, validateConceptStructuralProfile } = require('../src/modules/concepts/concept-structural-profile');
const { LIVE_CONCEPT_IDS } = require('../src/modules/concepts/constants');

function getLiveProfile(conceptId) {
  const concept = loadConceptSet().find((entry) => entry.conceptId === conceptId);
  assert.notEqual(concept, undefined, `Missing live concept fixture for ${conceptId}.`);
  return normalizeConceptToProfile(concept);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildBoundaryCandidateProfile() {
  return validateConceptStructuralProfile({
    conceptId: 'binding-condition-candidate',
    domain: 'governance-structures',
    coreMeaning: 'The candidate marks a binding condition that places conduct under owed force before the conduct line is finalized as duty.',
    function: 'binding condition that places conduct under owed force',
    object: 'conduct or restraint owed by an actor',
    sourceType: 'rule, role, office, or obligation with binding force',
    actorRelation: 'actor stands under a binding condition that can make conduct owed',
    temporalRole: 'pre-duty binding condition',
    enforcementRole: 'exposes the actor to later enforcement if the owed condition is carried into duty and unmet',
    answerabilityRole: 'does not assign answerability by itself',
    requiredConductRole: 'conditions required conduct without fixing the final conduct line by itself',
    outcomeAttributionRole: 'does not attribute outcomes by itself',
    forbiddenEquivalences: ['duty', 'responsibility'],
    boundaryNotes: [
      'duty: the candidate marks the binding condition; duty marks the conduct owed under that condition.',
      'responsibility: the candidate concerns binding force before answerability; responsibility concerns answerability after attribution.',
    ],
  });
}

function verifyDutyResponsibilityDistinct() {
  const duty = getLiveProfile('duty');
  const responsibility = getLiveProfile('responsibility');
  const result = compareConceptProfiles(duty, responsibility);

  assert.equal(result.otherConceptId, 'responsibility', 'duty vs responsibility otherConceptId mismatch.');
  assert.equal(result.classification, 'distinct', 'duty vs responsibility should remain distinct.');
  assert.equal(result.requiredBoundaryProof, false, 'duty vs responsibility should not require a boundary proof at comparison time.');
  assert.equal(result.reasons.length > 0, true, 'duty vs responsibility reasons must be populated.');

  process.stdout.write('PASS concept_profile_comparison_duty_vs_responsibility\n');
}

function verifyBoundaryCandidateDutyRequirement() {
  const candidate = buildBoundaryCandidateProfile();
  const duty = getLiveProfile('duty');
  const result = compareConceptProfiles(candidate, duty);

  assert.equal(result.otherConceptId, 'duty', 'boundary candidate vs duty otherConceptId mismatch.');
  assert.equal(
    result.classification,
    'requires_explicit_boundary_note',
    'boundary candidate vs duty should require an explicit boundary note.',
  );
  assert.equal(result.requiredBoundaryProof, true, 'boundary candidate vs duty should require boundary proof.');
  assert.equal(result.collidingFields.includes('domain'), true, 'boundary candidate vs duty must collide on domain.');
  assert.equal(result.collidingFields.includes('object'), true, 'boundary candidate vs duty must collide on object.');

  process.stdout.write('PASS concept_profile_comparison_boundary_candidate_vs_duty\n');
}

function verifyAuthorityPowerAdjacent() {
  const authority = getLiveProfile('authority');
  const power = getLiveProfile('power');
  const result = compareConceptProfiles(authority, power);

  assert.equal(result.otherConceptId, 'power', 'authority vs power otherConceptId mismatch.');
  assert.equal(result.classification, 'adjacent', 'authority vs power should remain adjacent.');
  assert.equal(result.requiredBoundaryProof, true, 'authority vs power should keep boundary-proof pressure.');
  assert.deepEqual(
    result.collidingFields,
    ['domain', 'forbiddenEquivalences', 'boundaryNotes'],
    'authority vs power collidingFields mismatch.',
  );

  process.stdout.write('PASS concept_profile_comparison_authority_vs_power\n');
}

function verifyIdenticalMockProfilesDuplicate() {
  const left = buildBoundaryCandidateProfile();
  const right = validateConceptStructuralProfile({
    ...clone(left),
    conceptId: 'binding-condition-candidate-shadow',
    forbiddenEquivalences: ['duty', 'responsibility'],
    boundaryNotes: [
      'duty: the shadow candidate intentionally mirrors the original profile for duplication testing.',
    ],
  });

  const result = compareConceptProfiles(left, right);

  assert.equal(result.otherConceptId, 'binding-condition-candidate-shadow', 'duplicate mock otherConceptId mismatch.');
  assert.equal(result.classification, 'duplicate_candidate', 'identical mock profiles must be duplicate candidates.');
  assert.equal(result.requiredBoundaryProof, false, 'duplicate candidate should not ask for boundary proof.');
  assert.deepEqual(
    result.collidingFields.slice(0, 3),
    ['function', 'object', 'temporalRole'],
    'duplicate candidate must collide on the primary identity fields.',
  );

  process.stdout.write('PASS concept_profile_comparison_identical_mock_duplicate\n');
}

function verifyCandidateAgainstAllLiveConcepts() {
  const candidate = buildBoundaryCandidateProfile();
  const liveProfiles = buildLiveConceptProfiles();
  const results = compareProfileAgainstLiveConcepts(candidate, liveProfiles);

  assert.equal(results.length, LIVE_CONCEPT_IDS.length, 'candidate must be compared against every live concept.');
  assert.deepEqual(
    results.map((entry) => entry.otherConceptId),
    LIVE_CONCEPT_IDS,
    'candidate comparison ordering must follow live concept ordering.',
  );

  const dutyResult = results.find((entry) => entry.otherConceptId === 'duty');
  assert.notEqual(dutyResult, undefined, 'candidate live comparison must include duty.');
  assert.equal(
    dutyResult.classification,
    'requires_explicit_boundary_note',
    'live comparison must preserve the duty boundary requirement.',
  );

  process.stdout.write('PASS concept_profile_comparison_candidate_against_live_set\n');
}

function main() {
  verifyDutyResponsibilityDistinct();
  verifyBoundaryCandidateDutyRequirement();
  verifyAuthorityPowerAdjacent();
  verifyIdenticalMockProfilesDuplicate();
  verifyCandidateAgainstAllLiveConcepts();
  process.stdout.write('ChatPDM concept profile comparison verification passed.\n');
}

main();
