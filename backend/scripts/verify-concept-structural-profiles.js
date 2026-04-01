'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadConceptSet, validateConceptShape } = require('../src/modules/concepts/concept-loader');
const { normalizeConceptToProfile } = require('../src/modules/concepts/concept-structural-profile');

const conceptsDirectory = path.resolve(__dirname, '../../data/concepts');
const NON_CONCEPT_PACKET_FILES = new Set([
  'concept-admission-state.json',
  'overlap-boundary-change-approvals.json',
  'overlap-classification-snapshot.json',
  'resolve-rules.json',
]);

function loadAllConceptPackets() {
  return fs.readdirSync(conceptsDirectory)
    .filter((fileName) => fileName.endsWith('.json'))
    .filter((fileName) => !NON_CONCEPT_PACKET_FILES.has(fileName))
    .sort()
    .map((fileName) => {
      const concept = JSON.parse(fs.readFileSync(path.join(conceptsDirectory, fileName), 'utf8'));
      validateConceptShape(concept, concept.conceptId);
      return concept;
    });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertProfileShape(profile, concept) {
  assert.equal(profile.conceptId, concept.conceptId, `${concept.conceptId} profile conceptId mismatch.`);
  assert.equal(profile.domain, concept.domain, `${concept.conceptId} profile domain mismatch.`);
  assert.equal(profile.coreMeaning, concept.coreMeaning, `${concept.conceptId} profile coreMeaning mismatch.`);
  assert.equal(typeof profile.function, 'string', `${concept.conceptId} profile function must be a string.`);
  assert.equal(typeof profile.object, 'string', `${concept.conceptId} profile object must be a string.`);
  assert.equal(typeof profile.sourceType, 'string', `${concept.conceptId} profile sourceType must be a string.`);
  assert.equal(typeof profile.actorRelation, 'string', `${concept.conceptId} profile actorRelation must be a string.`);
  assert.equal(typeof profile.temporalRole, 'string', `${concept.conceptId} profile temporalRole must be a string.`);
  assert.equal(typeof profile.enforcementRole, 'string', `${concept.conceptId} profile enforcementRole must be a string.`);
  assert.equal(typeof profile.answerabilityRole, 'string', `${concept.conceptId} profile answerabilityRole must be a string.`);
  assert.equal(typeof profile.requiredConductRole, 'string', `${concept.conceptId} profile requiredConductRole must be a string.`);
  assert.equal(typeof profile.outcomeAttributionRole, 'string', `${concept.conceptId} profile outcomeAttributionRole must be a string.`);
  assert.equal(Array.isArray(profile.forbiddenEquivalences), true, `${concept.conceptId} forbiddenEquivalences must be an array.`);
  assert.equal(Array.isArray(profile.boundaryNotes), true, `${concept.conceptId} boundaryNotes must be an array.`);
  assert.equal(profile.forbiddenEquivalences.includes(concept.conceptId), false, `${concept.conceptId} must not forbid itself.`);
  assert.equal(profile.boundaryNotes.length > 0, true, `${concept.conceptId} must expose at least one boundary note.`);
  assert.equal(Object.isFrozen(profile), true, `${concept.conceptId} profile must be frozen.`);
  assert.equal(Object.isFrozen(profile.forbiddenEquivalences), true, `${concept.conceptId} forbiddenEquivalences must be frozen.`);
  assert.equal(Object.isFrozen(profile.boundaryNotes), true, `${concept.conceptId} boundaryNotes must be frozen.`);
}

function verifyAllAuthoredConceptsProduceProfiles() {
  const concepts = loadAllConceptPackets();

  concepts.forEach((concept) => {
    const profile = normalizeConceptToProfile(concept);
    assertProfileShape(profile, concept);
  });

  process.stdout.write('PASS concept_structural_profiles_all_authored_packets\n');
}

function verifyLiveConceptsProduceProfiles() {
  loadConceptSet().forEach((concept) => {
    const profile = normalizeConceptToProfile(concept);
    assert.equal(profile.conceptId, concept.conceptId, `${concept.conceptId} live profile mismatch.`);
  });

  process.stdout.write('PASS concept_structural_profiles_live_packets\n');
}

function verifyMissingStructuralFieldFails() {
  const concept = clone(loadConceptSet().find((entry) => entry.conceptId === 'duty'));
  delete concept.structuralProfile.function;

  assert.throws(
    () => validateConceptShape(concept, concept.conceptId),
    /structuralProfile\.function/,
    'missing structuralProfile.function must fail validation.',
  );

  process.stdout.write('PASS concept_structural_profiles_missing_field_fails\n');
}

function verifyUndefinedDomainFails() {
  const concept = clone(loadConceptSet().find((entry) => entry.conceptId === 'authority'));
  delete concept.domain;

  assert.throws(
    () => normalizeConceptToProfile(concept),
    /invalid domain/,
    'missing domain must fail normalization deterministically.',
  );

  process.stdout.write('PASS concept_structural_profiles_domain_required\n');
}

function verifySelfForbiddenEquivalenceFails() {
  const concept = clone(loadConceptSet().find((entry) => entry.conceptId === 'responsibility'));
  concept.reviewMetadata.must_not_collapse_into.push('responsibility');

  assert.throws(
    () => validateConceptShape(concept, concept.conceptId),
    /must not include the concept itself/,
    'self-referential forbiddenEquivalences must fail validation.',
  );

  process.stdout.write('PASS concept_structural_profiles_self_forbidden_equivalence_fails\n');
}

function main() {
  verifyAllAuthoredConceptsProduceProfiles();
  verifyLiveConceptsProduceProfiles();
  verifyMissingStructuralFieldFails();
  verifyUndefinedDomainFails();
  verifySelfForbiddenEquivalenceFails();
  process.stdout.write('ChatPDM concept structural profile verification passed.\n');
}

main();
