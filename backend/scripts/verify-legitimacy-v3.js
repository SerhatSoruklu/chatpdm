'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  readLegitimacyStructureV3,
  readOptionalStructureV3Envelope,
} = require('../src/modules/concepts/concept-structure-schema');
const { validateConceptShape } = require('../src/modules/concepts/concept-loader');
const { validateConcept } = require('../../scripts/lib/register-validation/validate-concept');
const { REASON_CODES } = require('../../scripts/lib/register-validation/reason-codes');
const { validateLegitimacyShape } = require('../../scripts/lib/register-validation/validate-legitimacy-shape');

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
  const concept = loadFixture('legitimacy.complete-v3.json');

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'loader validation should accept a complete Legitimacy V3 fixture.',
  );
  assert.notEqual(readOptionalStructureV3Envelope(concept), null, 'complete fixture should expose a V3 envelope.');
  assert.notEqual(readLegitimacyStructureV3(concept), null, 'complete fixture should expose a legitimacy V3 block.');

  const shapeReport = validateLegitimacyShape(concept);
  assert.equal(shapeReport.passed, true, 'complete Legitimacy V3 fixture should pass shape validation.');
  assert.equal(shapeReport.v3Status, 'passing', 'complete Legitimacy V3 fixture v3Status mismatch.');
  assert.equal(shapeReport.failures.length, 0, 'complete Legitimacy V3 fixture should not fail any required slot.');
  assert.equal(shapeReport.warnings.length, 0, 'complete Legitimacy V3 fixture should not warn on recommended slots or boundary checks.');

  const conceptReport = validateConcept(concept);
  assert.equal(conceptReport.languagePassed, true, 'complete Legitimacy V3 fixture should remain language-valid.');
  assert.equal(conceptReport.v3Status, 'passing', 'complete Legitimacy V3 pipeline v3Status mismatch.');
  assert.equal(conceptReport.validationState, 'fully_validated', 'complete Legitimacy V3 pipeline classification mismatch.');
  assert.equal(conceptReport.passed, true, 'complete Legitimacy V3 fixture should fully validate.');
  assert.equal(
    conceptReport.v3.boundaryChecks.length,
    0,
    'complete Legitimacy V3 fixture should not trigger authority or power boundary warnings.',
  );

  process.stdout.write('PASS legitimacy_v3_complete_fixture\n');
}

function verifyMissingRequiredSlots() {
  const baseConcept = loadFixture('legitimacy.complete-v3.json');
  const cases = [
    ['subject', REASON_CODES.LEGITIMACY_MISSING_SUBJECT],
    ['basis', REASON_CODES.LEGITIMACY_MISSING_BASIS],
    ['scope', REASON_CODES.LEGITIMACY_MISSING_SCOPE],
    ['status', REASON_CODES.LEGITIMACY_MISSING_STATUS],
  ];

  cases.forEach(([slotName, code]) => {
    const concept = clone(baseConcept);
    delete concept.structureV3.legitimacy[slotName];

    const shapeReport = validateLegitimacyShape(concept);
    assertStructurallyIncomplete(shapeReport, `missing ${slotName}`);
    assert.equal(findCode(shapeReport.failures, code, slotName), true, `missing ${slotName} must report ${code}.`);
  });

  process.stdout.write('PASS legitimacy_v3_missing_required_slots\n');
}

function verifyRecommendedSlotWarnings() {
  const missingEvaluator = clone(loadFixture('legitimacy.complete-v3.json'));
  delete missingEvaluator.structureV3.legitimacy.evaluator;

  const evaluatorReport = validateLegitimacyShape(missingEvaluator);
  assert.equal(evaluatorReport.passed, true, 'missing evaluator should warn, not fail.');
  assert.equal(
    findCode(evaluatorReport.warnings, REASON_CODES.MISSING_RECOMMENDED_SLOT, 'evaluator'),
    true,
    'missing evaluator must warn deterministically.',
  );

  const missingConditions = clone(loadFixture('legitimacy.complete-v3.json'));
  delete missingConditions.structureV3.legitimacy.conditions;

  const conditionsReport = validateLegitimacyShape(missingConditions);
  assert.equal(conditionsReport.passed, true, 'missing conditions should warn, not fail.');
  assert.equal(
    findCode(conditionsReport.warnings, REASON_CODES.MISSING_RECOMMENDED_SLOT, 'conditions'),
    true,
    'missing conditions must warn deterministically.',
  );

  process.stdout.write('PASS legitimacy_v3_recommended_slot_warnings\n');
}

function verifyLanguageValidButStructurallyIncomplete() {
  const concept = loadFixture('legitimacy.partial-v3.json');

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'partial Legitimacy V3 fixture should still pass loader validation.',
  );

  const conceptReport = validateConcept(concept);
  assert.equal(conceptReport.languagePassed, true, 'partial Legitimacy V3 fixture should still pass V1/V2 language checks.');
  assert.equal(conceptReport.v3Status, 'incomplete', 'partial Legitimacy V3 fixture should be structurally incomplete.');
  assert.equal(
    conceptReport.validationState,
    'structurally_incomplete',
    'partial Legitimacy V3 fixture classification mismatch.',
  );
  assert.equal(conceptReport.passed, false, 'partial Legitimacy V3 fixture should fail the overall validator.');
  assert.equal(
    findCode(conceptReport.v3.failures, REASON_CODES.LEGITIMACY_MISSING_STATUS, 'status'),
    true,
    'partial Legitimacy V3 fixture must report missing status.',
  );

  process.stdout.write('PASS legitimacy_v3_language_valid_but_structurally_incomplete\n');
}

function verifyLegacyFixtureIsMigrationSafe() {
  const concept = loadFixture('legitimacy.legacy-text-only.json');

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'legacy Legitimacy fixture without structureV3 must remain loader-safe.',
  );
  assert.equal(readOptionalStructureV3Envelope(concept), null, 'legacy Legitimacy fixture should not expose a V3 envelope.');
  assert.equal(readLegitimacyStructureV3(concept), null, 'legacy Legitimacy fixture should not expose a legitimacy V3 block.');

  const shapeReport = validateLegitimacyShape(concept);
  assertStructurallyIncomplete(shapeReport, 'legacy legitimacy');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.LEGITIMACY_MISSING_SUBJECT, 'subject'), true, 'legacy legitimacy must report missing subject.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.LEGITIMACY_MISSING_BASIS, 'basis'), true, 'legacy legitimacy must report missing basis.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.LEGITIMACY_MISSING_SCOPE, 'scope'), true, 'legacy legitimacy must report missing scope.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.LEGITIMACY_MISSING_STATUS, 'status'), true, 'legacy legitimacy must report missing status.');

  process.stdout.write('PASS legitimacy_v3_legacy_fixture\n');
}

function verifyMalformedEnvelopeIsDeterministic() {
  const concept = loadFixture('legitimacy.complete-v3.json');
  concept.structureV3 = [];

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'malformed structureV3 must not crash loader validation.',
  );
  assert.equal(readOptionalStructureV3Envelope(concept), null, 'malformed structureV3 should normalize to null envelope.');
  assert.equal(readLegitimacyStructureV3(concept), null, 'malformed structureV3 should normalize to null legitimacy block.');

  const shapeReport = validateLegitimacyShape(concept);
  assertStructurallyIncomplete(shapeReport, 'malformed legitimacy v3 envelope');
  assert.equal(shapeReport.schemaVersion, null, 'malformed structureV3 should not leak schemaVersion.');
  assert.equal(shapeReport.conceptFamily, null, 'malformed structureV3 should not leak conceptFamily.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.LEGITIMACY_MISSING_SUBJECT, 'subject'), true, 'malformed structureV3 must report missing subject.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.LEGITIMACY_MISSING_BASIS, 'basis'), true, 'malformed structureV3 must report missing basis.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.LEGITIMACY_MISSING_SCOPE, 'scope'), true, 'malformed structureV3 must report missing scope.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.LEGITIMACY_MISSING_STATUS, 'status'), true, 'malformed structureV3 must report missing status.');

  process.stdout.write('PASS legitimacy_v3_malformed_envelope\n');
}

function verifyLegitimacyBoundaryWarnings() {
  const collapsingLegitimacyAuthorityText = loadFixture('legitimacy.complete-v3.json');
  collapsingLegitimacyAuthorityText.fullDefinition = 'Legitimacy is the recognized right to direct within a governance order.';

  const legitimacyAuthorityTextReport = validateConcept(collapsingLegitimacyAuthorityText);
  assert.equal(
    findBoundary(
      legitimacyAuthorityTextReport.v3.boundaryChecks,
      REASON_CODES.LEGITIMACY_COLLAPSES_TO_AUTHORITY,
      'fullDefinition',
    ),
    true,
    'legitimacy text boundary check must flag authority-style collapse.',
  );
  assert.equal(legitimacyAuthorityTextReport.passed, true, 'legitimacy authority-style collapse warning must remain non-blocking.');

  const collapsingLegitimacyPowerSchema = loadFixture('legitimacy.complete-v3.json');
  collapsingLegitimacyPowerSchema.structureV3.legitimacy.basis.description = 'effective capacity to produce outcomes within a governance structure';

  const legitimacyPowerSchemaReport = validateConcept(collapsingLegitimacyPowerSchema);
  assert.equal(
    findBoundary(
      legitimacyPowerSchemaReport.v3.boundaryChecks,
      REASON_CODES.LEGITIMACY_COLLAPSES_TO_POWER,
      'structureV3.basis',
    ),
    true,
    'legitimacy schema boundary check must flag power-style collapse.',
  );
  assert.equal(legitimacyPowerSchemaReport.passed, true, 'legitimacy power-style collapse warning must remain non-blocking.');

  const collapsingAuthorityText = loadFixture('authority.complete-v3.json');
  collapsingAuthorityText.fullDefinition = 'Authority is the accepted or justified validity of standing within a governance order.';

  const authorityReport = validateConcept(collapsingAuthorityText);
  assert.equal(
    findBoundary(authorityReport.v3.boundaryChecks, REASON_CODES.AUTHORITY_COLLAPSES_TO_LEGITIMACY, 'fullDefinition'),
    true,
    'authority boundary check must flag legitimacy-style collapse.',
  );
  assert.equal(authorityReport.passed, true, 'authority legitimacy-style collapse warning must remain non-blocking.');

  const collapsingPowerSchema = loadFixture('power.complete-v3.json');
  collapsingPowerSchema.structureV3.power.capability.description = 'accepted or justified validity of standing within a governance order';

  const powerReport = validateConcept(collapsingPowerSchema);
  assert.equal(
    findBoundary(powerReport.v3.boundaryChecks, REASON_CODES.POWER_COLLAPSES_TO_LEGITIMACY, 'structureV3.capability'),
    true,
    'power schema boundary check must flag legitimacy-style collapse.',
  );
  assert.equal(powerReport.passed, true, 'power legitimacy-style collapse warning must remain non-blocking.');

  process.stdout.write('PASS legitimacy_boundary_hardening\n');
}

function main() {
  verifyCompleteFixturePasses();
  verifyMissingRequiredSlots();
  verifyRecommendedSlotWarnings();
  verifyLanguageValidButStructurallyIncomplete();
  verifyLegacyFixtureIsMigrationSafe();
  verifyMalformedEnvelopeIsDeterministic();
  verifyLegitimacyBoundaryWarnings();
  process.stdout.write('ChatPDM Legitimacy V3 verification passed.\n');
}

main();
