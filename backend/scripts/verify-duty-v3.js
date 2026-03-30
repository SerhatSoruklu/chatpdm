'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateConceptShape } = require('../src/modules/concepts/concept-loader');
const {
  readDutyStructureV3,
  readOptionalStructureV3Envelope,
} = require('../src/modules/concepts/concept-structure-schema');
const { validateConcept } = require('../../scripts/lib/register-validation/validate-concept');
const { REASON_CODES } = require('../../scripts/lib/register-validation/reason-codes');
const { validateDutyShape } = require('../../scripts/lib/register-validation/validate-duty-shape');

const fixturesDirectory = path.resolve(__dirname, '../../tests/validator/fixtures');

function loadFixture(fileName) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDirectory, fileName), 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function findCode(entries, code, slot) {
  return entries.some((entry) => entry.code === code && (slot === undefined || entry.slot === slot));
}

function assertStructurallyIncomplete(report, context) {
  assert.equal(report.passed, false, `${context} should fail V3.`);
  assert.equal(report.v3Status, 'incomplete', `${context} v3Status mismatch.`);
  assert.equal(
    findCode(report.failures, REASON_CODES.STRUCTURALLY_INCOMPLETE_CONCEPT, null),
    true,
    `${context} must include STRUCTURALLY_INCOMPLETE_CONCEPT.`,
  );
}

function verifyCompleteFixturePasses() {
  const concept = loadFixture('duty.complete-v3.json');

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'loader validation should accept a complete Duty V3 fixture.',
  );
  assert.notEqual(readOptionalStructureV3Envelope(concept), null, 'complete fixture should expose a V3 envelope.');
  assert.notEqual(readDutyStructureV3(concept), null, 'complete fixture should expose a duty V3 block.');

  const shapeReport = validateDutyShape(concept);
  assert.equal(shapeReport.passed, true, 'complete Duty V3 fixture should pass shape validation.');
  assert.equal(shapeReport.v3Status, 'passing', 'complete Duty V3 fixture v3Status mismatch.');
  assert.equal(shapeReport.failures.length, 0, 'complete Duty V3 fixture should not fail any required slot.');
  assert.equal(shapeReport.warnings.length, 0, 'complete Duty V3 fixture should not warn on recommended slots.');

  const conceptReport = validateConcept(concept);
  assert.equal(conceptReport.languagePassed, true, 'complete Duty V3 fixture should remain language-valid.');
  assert.equal(conceptReport.v3Status, 'passing', 'complete Duty V3 pipeline v3Status mismatch.');
  assert.equal(conceptReport.validationState, 'fully_validated', 'complete Duty V3 pipeline classification mismatch.');
  assert.equal(conceptReport.passed, true, 'complete Duty V3 fixture should fully validate.');

  process.stdout.write('PASS duty_v3_complete_fixture\n');
}

function verifyMissingRequiredSlots() {
  const baseConcept = loadFixture('duty.complete-v3.json');
  const cases = [
    ['bearer', REASON_CODES.DUTY_MISSING_BEARER],
    ['content', REASON_CODES.DUTY_MISSING_CONTENT],
    ['source', REASON_CODES.DUTY_MISSING_SOURCE],
  ];

  cases.forEach(([slotName, code]) => {
    const concept = clone(baseConcept);
    delete concept.structureV3.duty[slotName];

    const shapeReport = validateDutyShape(concept);
    assertStructurallyIncomplete(shapeReport, `missing ${slotName}`);
    assert.equal(findCode(shapeReport.failures, code, slotName), true, `missing ${slotName} must report ${code}.`);
  });

  process.stdout.write('PASS duty_v3_missing_required_slots\n');
}

function verifyRecommendedSlotWarnings() {
  const missingObligee = clone(loadFixture('duty.complete-v3.json'));
  delete missingObligee.structureV3.duty.obligee;

  const obligeeReport = validateDutyShape(missingObligee);
  assert.equal(obligeeReport.passed, true, 'missing obligee should warn, not fail.');
  assert.equal(
    findCode(obligeeReport.warnings, REASON_CODES.MISSING_RECOMMENDED_SLOT, 'obligee'),
    true,
    'missing obligee must warn deterministically.',
  );

  const missingPhase = clone(loadFixture('duty.complete-v3.json'));
  delete missingPhase.structureV3.duty.phase;

  const phaseReport = validateDutyShape(missingPhase);
  assert.equal(phaseReport.passed, true, 'missing phase should warn, not fail.');
  assert.equal(
    findCode(phaseReport.warnings, REASON_CODES.MISSING_RECOMMENDED_SLOT, 'phase'),
    true,
    'missing phase must warn deterministically.',
  );

  process.stdout.write('PASS duty_v3_recommended_slot_warnings\n');
}

function verifyLanguageValidButStructurallyIncomplete() {
  const concept = loadFixture('duty.partial-v3.json');

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'partial Duty V3 fixture should still pass loader validation.',
  );

  const conceptReport = validateConcept(concept);
  assert.equal(conceptReport.languagePassed, true, 'partial Duty V3 fixture should still pass V1/V2 language checks.');
  assert.equal(conceptReport.v3Status, 'incomplete', 'partial Duty V3 fixture should be structurally incomplete.');
  assert.equal(
    conceptReport.validationState,
    'structurally_incomplete',
    'partial Duty V3 fixture classification mismatch.',
  );
  assert.equal(conceptReport.passed, false, 'partial Duty V3 fixture should fail the overall validator.');
  assert.equal(
    findCode(conceptReport.v3.failures, REASON_CODES.DUTY_MISSING_SOURCE, 'source'),
    true,
    'partial Duty V3 fixture must report missing source.',
  );

  process.stdout.write('PASS duty_v3_language_valid_but_structurally_incomplete\n');
}

function verifyLegacyFixtureIsMigrationSafe() {
  const concept = loadFixture('duty.legacy-text-only.json');

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'legacy Duty fixture without structureV3 must remain loader-safe.',
  );
  assert.equal(readOptionalStructureV3Envelope(concept), null, 'legacy Duty fixture should not expose a V3 envelope.');
  assert.equal(readDutyStructureV3(concept), null, 'legacy Duty fixture should not expose a duty V3 block.');

  const shapeReport = validateDutyShape(concept);
  assertStructurallyIncomplete(shapeReport, 'legacy duty');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.DUTY_MISSING_BEARER, 'bearer'), true, 'legacy duty must report missing bearer.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.DUTY_MISSING_CONTENT, 'content'), true, 'legacy duty must report missing content.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.DUTY_MISSING_SOURCE, 'source'), true, 'legacy duty must report missing source.');

  process.stdout.write('PASS duty_v3_legacy_fixture\n');
}

function verifyMalformedEnvelopeIsDeterministic() {
  const concept = loadFixture('duty.complete-v3.json');
  concept.structureV3 = [];

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'malformed structureV3 must not crash loader validation.',
  );
  assert.equal(readOptionalStructureV3Envelope(concept), null, 'malformed structureV3 should normalize to null envelope.');
  assert.equal(readDutyStructureV3(concept), null, 'malformed structureV3 should normalize to null duty block.');

  const shapeReport = validateDutyShape(concept);
  assertStructurallyIncomplete(shapeReport, 'malformed duty v3 envelope');
  assert.equal(shapeReport.schemaVersion, null, 'malformed structureV3 should not leak schemaVersion.');
  assert.equal(shapeReport.conceptFamily, null, 'malformed structureV3 should not leak conceptFamily.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.DUTY_MISSING_BEARER, 'bearer'), true, 'malformed structureV3 must report missing bearer.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.DUTY_MISSING_CONTENT, 'content'), true, 'malformed structureV3 must report missing content.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.DUTY_MISSING_SOURCE, 'source'), true, 'malformed structureV3 must report missing source.');

  process.stdout.write('PASS duty_v3_malformed_envelope\n');
}

function main() {
  verifyCompleteFixturePasses();
  verifyMissingRequiredSlots();
  verifyRecommendedSlotWarnings();
  verifyLanguageValidButStructurallyIncomplete();
  verifyLegacyFixtureIsMigrationSafe();
  verifyMalformedEnvelopeIsDeterministic();
  process.stdout.write('ChatPDM Duty V3 verification passed.\n');
}

main();
