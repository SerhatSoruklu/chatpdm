'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  readOptionalStructureV3Envelope,
  readPowerStructureV3,
} = require('../src/modules/concepts/concept-structure-schema');
const { validateConceptShape } = require('../src/modules/concepts/concept-loader');
const { validateConcept } = require('../../scripts/lib/register-validation/validate-concept');
const { REASON_CODES } = require('../../scripts/lib/register-validation/reason-codes');
const { validatePowerShape } = require('../../scripts/lib/register-validation/validate-power-shape');

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

function findBoundary(entries, code, zone) {
  return entries.some((entry) => entry.code === code && (zone === undefined || entry.zone === zone));
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
  const concept = loadFixture('power.complete-v3.json');

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'loader validation should accept a complete Power V3 fixture.',
  );
  assert.notEqual(readOptionalStructureV3Envelope(concept), null, 'complete fixture should expose a V3 envelope.');
  assert.notEqual(readPowerStructureV3(concept), null, 'complete fixture should expose a power V3 block.');

  const shapeReport = validatePowerShape(concept);
  assert.equal(shapeReport.passed, true, 'complete Power V3 fixture should pass shape validation.');
  assert.equal(shapeReport.v3Status, 'passing', 'complete Power V3 fixture v3Status mismatch.');
  assert.equal(shapeReport.failures.length, 0, 'complete Power V3 fixture should not fail any required slot.');
  assert.equal(shapeReport.warnings.length, 0, 'complete Power V3 fixture should not warn on recommended slots or boundary checks.');

  const conceptReport = validateConcept(concept);
  assert.equal(conceptReport.languagePassed, true, 'complete Power V3 fixture should remain language-valid.');
  assert.equal(conceptReport.v3Status, 'passing', 'complete Power V3 pipeline v3Status mismatch.');
  assert.equal(conceptReport.validationState, 'fully_validated', 'complete Power V3 pipeline classification mismatch.');
  assert.equal(conceptReport.passed, true, 'complete Power V3 fixture should fully validate.');
  assert.equal(
    conceptReport.v3.boundaryChecks.length,
    0,
    'complete Power V3 fixture should not trigger authority or legitimacy boundary warnings.',
  );

  process.stdout.write('PASS power_v3_complete_fixture\n');
}

function verifyMissingRequiredSlots() {
  const baseConcept = loadFixture('power.complete-v3.json');
  const cases = [
    ['holder', REASON_CODES.POWER_MISSING_HOLDER],
    ['capability', REASON_CODES.POWER_MISSING_CAPABILITY],
    ['scope', REASON_CODES.POWER_MISSING_SCOPE],
  ];

  cases.forEach(([slotName, code]) => {
    const concept = clone(baseConcept);
    delete concept.structureV3.power[slotName];

    const shapeReport = validatePowerShape(concept);
    assertStructurallyIncomplete(shapeReport, `missing ${slotName}`);
    assert.equal(findCode(shapeReport.failures, code, slotName), true, `missing ${slotName} must report ${code}.`);
  });

  process.stdout.write('PASS power_v3_missing_required_slots\n');
}

function verifyRecommendedSlotWarnings() {
  const missingConstraints = clone(loadFixture('power.complete-v3.json'));
  delete missingConstraints.structureV3.power.constraints;

  const constraintsReport = validatePowerShape(missingConstraints);
  assert.equal(constraintsReport.passed, true, 'missing constraints should warn, not fail.');
  assert.equal(
    findCode(constraintsReport.warnings, REASON_CODES.MISSING_RECOMMENDED_SLOT, 'constraints'),
    true,
    'missing constraints must warn deterministically.',
  );

  const missingSource = clone(loadFixture('power.complete-v3.json'));
  delete missingSource.structureV3.power.source;

  const sourceReport = validatePowerShape(missingSource);
  assert.equal(sourceReport.passed, true, 'missing source should warn, not fail.');
  assert.equal(
    findCode(sourceReport.warnings, REASON_CODES.MISSING_RECOMMENDED_SLOT, 'source'),
    true,
    'missing source must warn deterministically.',
  );

  process.stdout.write('PASS power_v3_recommended_slot_warnings\n');
}

function verifyLanguageValidButStructurallyIncomplete() {
  const concept = loadFixture('power.partial-v3.json');

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'partial Power V3 fixture should still pass loader validation.',
  );

  const conceptReport = validateConcept(concept);
  assert.equal(conceptReport.languagePassed, true, 'partial Power V3 fixture should still pass V1/V2 language checks.');
  assert.equal(conceptReport.v3Status, 'incomplete', 'partial Power V3 fixture should be structurally incomplete.');
  assert.equal(
    conceptReport.validationState,
    'structurally_incomplete',
    'partial Power V3 fixture classification mismatch.',
  );
  assert.equal(conceptReport.passed, false, 'partial Power V3 fixture should fail the overall validator.');
  assert.equal(
    findCode(conceptReport.v3.failures, REASON_CODES.POWER_MISSING_SCOPE, 'scope'),
    true,
    'partial Power V3 fixture must report missing scope.',
  );

  process.stdout.write('PASS power_v3_language_valid_but_structurally_incomplete\n');
}

function verifyLegacyFixtureIsMigrationSafe() {
  const concept = loadFixture('power.legacy-text-only.json');

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'legacy Power fixture without structureV3 must remain loader-safe.',
  );
  assert.equal(readOptionalStructureV3Envelope(concept), null, 'legacy Power fixture should not expose a V3 envelope.');
  assert.equal(readPowerStructureV3(concept), null, 'legacy Power fixture should not expose a power V3 block.');

  const shapeReport = validatePowerShape(concept);
  assertStructurallyIncomplete(shapeReport, 'legacy power');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.POWER_MISSING_HOLDER, 'holder'), true, 'legacy power must report missing holder.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.POWER_MISSING_CAPABILITY, 'capability'), true, 'legacy power must report missing capability.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.POWER_MISSING_SCOPE, 'scope'), true, 'legacy power must report missing scope.');

  process.stdout.write('PASS power_v3_legacy_fixture\n');
}

function verifyMalformedEnvelopeIsDeterministic() {
  const concept = loadFixture('power.complete-v3.json');
  concept.structureV3 = [];

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'malformed structureV3 must not crash loader validation.',
  );
  assert.equal(readOptionalStructureV3Envelope(concept), null, 'malformed structureV3 should normalize to null envelope.');
  assert.equal(readPowerStructureV3(concept), null, 'malformed structureV3 should normalize to null power block.');

  const shapeReport = validatePowerShape(concept);
  assertStructurallyIncomplete(shapeReport, 'malformed power v3 envelope');
  assert.equal(shapeReport.schemaVersion, null, 'malformed structureV3 should not leak schemaVersion.');
  assert.equal(shapeReport.conceptFamily, null, 'malformed structureV3 should not leak conceptFamily.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.POWER_MISSING_HOLDER, 'holder'), true, 'malformed structureV3 must report missing holder.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.POWER_MISSING_CAPABILITY, 'capability'), true, 'malformed structureV3 must report missing capability.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.POWER_MISSING_SCOPE, 'scope'), true, 'malformed structureV3 must report missing scope.');

  process.stdout.write('PASS power_v3_malformed_envelope\n');
}

function verifyAuthorityPowerBoundaryWarnings() {
  const collapsingPowerText = loadFixture('power.complete-v3.json');
  collapsingPowerText.fullDefinition = 'Power is the recognized standing and right to direct within a governance order.';

  const powerTextReport = validateConcept(collapsingPowerText);
  assert.equal(powerTextReport.v3.v3Status, 'passing', 'power should remain V3-participating in this phase.');
  assert.equal(
    findBoundary(powerTextReport.v3.boundaryChecks, REASON_CODES.POWER_COLLAPSES_TO_AUTHORITY, 'fullDefinition'),
    true,
    'power text boundary check must flag authority-style collapse.',
  );
  assert.equal(powerTextReport.passed, true, 'power text collapse warning must remain non-blocking in this phase.');

  const collapsingPowerSchema = loadFixture('power.complete-v3.json');
  collapsingPowerSchema.structureV3.power.capability.description = 'recognized right to direct within a governance order';

  const powerSchemaReport = validateConcept(collapsingPowerSchema);
  assert.equal(
    findBoundary(powerSchemaReport.v3.boundaryChecks, REASON_CODES.POWER_COLLAPSES_TO_AUTHORITY, 'structureV3.capability'),
    true,
    'power schema boundary check must flag authority-style collapse.',
  );
  assert.equal(powerSchemaReport.passed, true, 'power schema collapse warning must remain non-blocking in this phase.');

  const collapsingAuthorityText = loadFixture('authority.complete-v3.json');
  collapsingAuthorityText.fullDefinition = 'Authority is the effective capacity to produce outcomes and secure compliance in a governance structure.';

  const authorityTextReport = validateConcept(collapsingAuthorityText);
  assert.equal(
    findBoundary(authorityTextReport.v3.boundaryChecks, REASON_CODES.AUTHORITY_COLLAPSES_TO_POWER, 'fullDefinition'),
    true,
    'authority text boundary check must flag power-style collapse.',
  );
  assert.equal(authorityTextReport.passed, true, 'authority text collapse warning must remain non-blocking in this phase.');

  const collapsingAuthoritySchema = loadFixture('authority.complete-v3.json');
  collapsingAuthoritySchema.structureV3.authority.scope.actions = ['produce outcomes', 'secure compliance'];

  const authoritySchemaReport = validateConcept(collapsingAuthoritySchema);
  assert.equal(
    findBoundary(authoritySchemaReport.v3.boundaryChecks, REASON_CODES.AUTHORITY_COLLAPSES_TO_POWER, 'structureV3.scope'),
    true,
    'authority schema boundary check must flag power-style collapse.',
  );
  assert.equal(authoritySchemaReport.passed, true, 'authority schema collapse warning must remain non-blocking in this phase.');

  process.stdout.write('PASS authority_power_boundary_hardening\n');
}

function main() {
  verifyCompleteFixturePasses();
  verifyMissingRequiredSlots();
  verifyRecommendedSlotWarnings();
  verifyLanguageValidButStructurallyIncomplete();
  verifyLegacyFixtureIsMigrationSafe();
  verifyMalformedEnvelopeIsDeterministic();
  verifyAuthorityPowerBoundaryWarnings();
  process.stdout.write('ChatPDM Power V3 verification passed.\n');
}

main();
