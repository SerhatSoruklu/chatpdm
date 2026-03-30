'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  readOptionalStructureV3Envelope,
  readResponsibilityStructureV3,
} = require('../src/modules/concepts/concept-structure-schema');
const { validateConceptShape } = require('../src/modules/concepts/concept-loader');
const { validateConcept } = require('../../scripts/lib/register-validation/validate-concept');
const { REASON_CODES } = require('../../scripts/lib/register-validation/reason-codes');
const { validateResponsibilityShape } = require('../../scripts/lib/register-validation/validate-responsibility-shape');

const fixturesDirectory = path.resolve(__dirname, '../../tests/validator/fixtures');

function loadFixture(fileName) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDirectory, fileName), 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function findCode(entries, code, fieldName) {
  return entries.some((entry) => entry.code === code && (fieldName === undefined || entry.slot === fieldName));
}

function assertStructurallyIncomplete(report, context) {
  assert.equal(report.passed, false, `${context} should fail V3.`);
  assert.equal(report.v3Status, 'incomplete', `${context} v3Status mismatch.`);
  assert.equal(
    findCode(report.failures, REASON_CODES.STRUCTURALLY_INCOMPLETE_CONCEPT),
    true,
    `${context} must include STRUCTURALLY_INCOMPLETE_CONCEPT.`,
  );
}

function verifyCompleteFixturePasses() {
  const concept = loadFixture('responsibility.complete-v3.json');

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'loader validation should accept a complete Responsibility V3 fixture.',
  );
  assert.notEqual(readOptionalStructureV3Envelope(concept), null, 'complete fixture should expose a V3 envelope.');
  assert.notEqual(readResponsibilityStructureV3(concept), null, 'complete fixture should expose a responsibility V3 block.');

  const shapeReport = validateResponsibilityShape(concept);
  assert.equal(shapeReport.passed, true, 'complete Responsibility V3 fixture should pass shape validation.');
  assert.equal(shapeReport.v3Status, 'passing', 'complete Responsibility V3 fixture v3Status mismatch.');
  assert.equal(shapeReport.failures.length, 0, 'complete Responsibility V3 fixture should not fail any required slot.');
  assert.equal(shapeReport.warnings.length, 0, 'complete Responsibility V3 fixture should not warn on recommended slots or boundary checks.');

  const conceptReport = validateConcept(concept);
  assert.equal(conceptReport.languagePassed, true, 'complete Responsibility V3 fixture should remain language-valid.');
  assert.equal(conceptReport.v3Status, 'passing', 'complete Responsibility V3 pipeline v3Status mismatch.');
  assert.equal(conceptReport.validationState, 'fully_validated', 'complete Responsibility V3 pipeline classification mismatch.');
  assert.equal(conceptReport.passed, true, 'complete Responsibility V3 fixture should fully validate.');

  process.stdout.write('PASS responsibility_v3_complete_fixture\n');
}

function verifyMissingRequiredSlots() {
  const baseConcept = loadFixture('responsibility.complete-v3.json');
  const cases = [
    ['subject', REASON_CODES.RESPONSIBILITY_MISSING_SUBJECT],
    ['trigger', REASON_CODES.RESPONSIBILITY_MISSING_TRIGGER],
    ['scope', REASON_CODES.RESPONSIBILITY_MISSING_SCOPE],
  ];

  cases.forEach(([slotName, code]) => {
    const concept = clone(baseConcept);
    delete concept.structureV3.responsibility[slotName];

    const shapeReport = validateResponsibilityShape(concept);
    assertStructurallyIncomplete(shapeReport, `missing ${slotName}`);
    assert.equal(findCode(shapeReport.failures, code, slotName), true, `missing ${slotName} must report ${code}.`);
  });

  process.stdout.write('PASS responsibility_v3_missing_required_slots\n');
}

function verifyRecommendedSlotWarnings() {
  const missingAttribution = clone(loadFixture('responsibility.complete-v3.json'));
  delete missingAttribution.structureV3.responsibility.attribution;

  const attributionReport = validateResponsibilityShape(missingAttribution);
  assert.equal(attributionReport.passed, true, 'missing attribution should warn, not fail.');
  assert.equal(
    findCode(attributionReport.warnings, REASON_CODES.MISSING_RECOMMENDED_SLOT, 'attribution'),
    true,
    'missing attribution must warn deterministically.',
  );

  const missingAccountability = clone(loadFixture('responsibility.complete-v3.json'));
  delete missingAccountability.structureV3.responsibility.accountability;

  const accountabilityReport = validateResponsibilityShape(missingAccountability);
  assert.equal(accountabilityReport.passed, true, 'missing accountability should warn, not fail.');
  assert.equal(
    findCode(accountabilityReport.warnings, REASON_CODES.MISSING_RECOMMENDED_SLOT, 'accountability'),
    true,
    'missing accountability must warn deterministically.',
  );

  process.stdout.write('PASS responsibility_v3_recommended_slot_warnings\n');
}

function verifyLanguageValidButStructurallyIncomplete() {
  const concept = loadFixture('responsibility.partial-v3.json');

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'partial Responsibility V3 fixture should still pass loader validation.',
  );

  const conceptReport = validateConcept(concept);
  assert.equal(conceptReport.languagePassed, true, 'partial Responsibility V3 fixture should still pass V1/V2 language checks.');
  assert.equal(conceptReport.v3Status, 'incomplete', 'partial Responsibility V3 fixture should be structurally incomplete.');
  assert.equal(
    conceptReport.validationState,
    'structurally_incomplete',
    'partial Responsibility V3 fixture classification mismatch.',
  );
  assert.equal(conceptReport.passed, false, 'partial Responsibility V3 fixture should fail the overall validator.');
  assert.equal(
    findCode(conceptReport.v3.failures, REASON_CODES.RESPONSIBILITY_MISSING_SCOPE, 'scope'),
    true,
    'partial Responsibility V3 fixture must report missing scope.',
  );

  process.stdout.write('PASS responsibility_v3_language_valid_but_structurally_incomplete\n');
}

function verifyLegacyFixtureIsMigrationSafe() {
  const concept = loadFixture('responsibility.legacy-text-only.json');

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'legacy Responsibility fixture without structureV3 must remain loader-safe.',
  );
  assert.equal(readOptionalStructureV3Envelope(concept), null, 'legacy Responsibility fixture should not expose a V3 envelope.');
  assert.equal(readResponsibilityStructureV3(concept), null, 'legacy Responsibility fixture should not expose a responsibility V3 block.');

  const shapeReport = validateResponsibilityShape(concept);
  assertStructurallyIncomplete(shapeReport, 'legacy responsibility');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.RESPONSIBILITY_MISSING_SUBJECT, 'subject'), true, 'legacy responsibility must report missing subject.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.RESPONSIBILITY_MISSING_TRIGGER, 'trigger'), true, 'legacy responsibility must report missing trigger.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.RESPONSIBILITY_MISSING_SCOPE, 'scope'), true, 'legacy responsibility must report missing scope.');

  process.stdout.write('PASS responsibility_v3_legacy_fixture\n');
}

function verifyMalformedEnvelopeIsDeterministic() {
  const concept = loadFixture('responsibility.complete-v3.json');
  concept.structureV3 = [];

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'malformed structureV3 must not crash loader validation.',
  );
  assert.equal(readOptionalStructureV3Envelope(concept), null, 'malformed structureV3 should normalize to null envelope.');
  assert.equal(readResponsibilityStructureV3(concept), null, 'malformed structureV3 should normalize to null responsibility block.');

  const shapeReport = validateResponsibilityShape(concept);
  assertStructurallyIncomplete(shapeReport, 'malformed responsibility v3 envelope');
  assert.equal(shapeReport.schemaVersion, null, 'malformed structureV3 should not leak schemaVersion.');
  assert.equal(shapeReport.conceptFamily, null, 'malformed structureV3 should not leak conceptFamily.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.RESPONSIBILITY_MISSING_SUBJECT, 'subject'), true, 'malformed structureV3 must report missing subject.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.RESPONSIBILITY_MISSING_TRIGGER, 'trigger'), true, 'malformed structureV3 must report missing trigger.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.RESPONSIBILITY_MISSING_SCOPE, 'scope'), true, 'malformed structureV3 must report missing scope.');

  process.stdout.write('PASS responsibility_v3_malformed_envelope\n');
}

function verifyDutyResponsibilityBoundaryWarnings() {
  const collapsingResponsibility = loadFixture('responsibility.complete-v3.json');
  collapsingResponsibility.fullDefinition = 'Responsibility is required conduct owed by an actor before action occurs under a binding rule.';

  const responsibilityReport = validateConcept(collapsingResponsibility);
  assert.equal(
    responsibilityReport.v3.boundaryChecks.some((entry) => entry.code === REASON_CODES.RESPONSIBILITY_COLLAPSES_TO_DUTY),
    true,
    'responsibility boundary check must flag duty-style collapse.',
  );
  assert.equal(
    responsibilityReport.v3.warnings.some((entry) => entry.code === REASON_CODES.RESPONSIBILITY_COLLAPSES_TO_DUTY),
    true,
    'responsibility collapse must surface as a report-only V3 warning.',
  );
  assert.equal(responsibilityReport.passed, true, 'responsibility collapse warning must remain non-blocking in this phase.');

  const collapsingDuty = loadFixture('duty.complete-v3.json');
  collapsingDuty.fullDefinition = 'Duty is the answerable connection between an actor and attributable outcomes after action.';

  const dutyReport = validateConcept(collapsingDuty);
  assert.equal(
    dutyReport.v3.boundaryChecks.some((entry) => entry.code === REASON_CODES.DUTY_COLLAPSES_TO_RESPONSIBILITY),
    true,
    'duty boundary check must flag responsibility-style collapse.',
  );
  assert.equal(
    dutyReport.v3.warnings.some((entry) => entry.code === REASON_CODES.DUTY_COLLAPSES_TO_RESPONSIBILITY),
    true,
    'duty collapse must surface as a report-only V3 warning.',
  );
  assert.equal(dutyReport.passed, true, 'duty collapse warning must remain non-blocking in this phase.');

  process.stdout.write('PASS duty_responsibility_boundary_warnings\n');
}

function main() {
  verifyCompleteFixturePasses();
  verifyMissingRequiredSlots();
  verifyRecommendedSlotWarnings();
  verifyLanguageValidButStructurallyIncomplete();
  verifyLegacyFixtureIsMigrationSafe();
  verifyMalformedEnvelopeIsDeterministic();
  verifyDutyResponsibilityBoundaryWarnings();
  process.stdout.write('ChatPDM Responsibility V3 verification passed.\n');
}

main();
