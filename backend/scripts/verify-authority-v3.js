'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  readAuthorityStructureV3,
  readOptionalStructureV3Envelope,
} = require('../src/modules/concepts/concept-structure-schema');
const { validateConceptShape } = require('../src/modules/concepts/concept-loader');
const { validateConcept } = require('../../scripts/lib/register-validation/validate-concept');
const { REASON_CODES } = require('../../scripts/lib/register-validation/reason-codes');
const { validateAuthorityShape } = require('../../scripts/lib/register-validation/validate-authority-shape');

const fixturesDirectory = path.resolve(__dirname, '../../tests/validator/fixtures');
const powerFixturePath = path.resolve(__dirname, '../../data/concepts/power.json');

function loadFixture(fileName) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDirectory, fileName), 'utf8'));
}

function loadPowerConcept() {
  return JSON.parse(fs.readFileSync(powerFixturePath, 'utf8'));
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
  const concept = loadFixture('authority.complete-v3.json');

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'loader validation should accept a complete Authority V3 fixture.',
  );
  assert.notEqual(readOptionalStructureV3Envelope(concept), null, 'complete fixture should expose a V3 envelope.');
  assert.notEqual(readAuthorityStructureV3(concept), null, 'complete fixture should expose an authority V3 block.');

  const shapeReport = validateAuthorityShape(concept);
  assert.equal(shapeReport.passed, true, 'complete Authority V3 fixture should pass shape validation.');
  assert.equal(shapeReport.v3Status, 'passing', 'complete Authority V3 fixture v3Status mismatch.');
  assert.equal(shapeReport.failures.length, 0, 'complete Authority V3 fixture should not fail any required slot.');
  assert.equal(shapeReport.warnings.length, 0, 'complete Authority V3 fixture should not warn on recommended slots or boundary checks.');

  const conceptReport = validateConcept(concept);
  assert.equal(conceptReport.languagePassed, true, 'complete Authority V3 fixture should remain language-valid.');
  assert.equal(conceptReport.v3Status, 'passing', 'complete Authority V3 pipeline v3Status mismatch.');
  assert.equal(conceptReport.validationState, 'fully_validated', 'complete Authority V3 pipeline classification mismatch.');
  assert.equal(conceptReport.passed, true, 'complete Authority V3 fixture should fully validate.');

  process.stdout.write('PASS authority_v3_complete_fixture\n');
}

function verifyMissingRequiredSlots() {
  const baseConcept = loadFixture('authority.complete-v3.json');
  const cases = [
    ['holder', REASON_CODES.AUTHORITY_MISSING_HOLDER],
    ['scope', REASON_CODES.AUTHORITY_MISSING_SCOPE],
    ['source', REASON_CODES.AUTHORITY_MISSING_SOURCE],
  ];

  cases.forEach(([slotName, code]) => {
    const concept = clone(baseConcept);
    delete concept.structureV3.authority[slotName];

    const shapeReport = validateAuthorityShape(concept);
    assertStructurallyIncomplete(shapeReport, `missing ${slotName}`);
    assert.equal(findCode(shapeReport.failures, code, slotName), true, `missing ${slotName} must report ${code}.`);
  });

  process.stdout.write('PASS authority_v3_missing_required_slots\n');
}

function verifyRecommendedSlotWarnings() {
  const missingTargets = clone(loadFixture('authority.complete-v3.json'));
  delete missingTargets.structureV3.authority.targets;

  const targetsReport = validateAuthorityShape(missingTargets);
  assert.equal(targetsReport.passed, true, 'missing targets should warn, not fail.');
  assert.equal(
    findCode(targetsReport.warnings, REASON_CODES.MISSING_RECOMMENDED_SLOT, 'targets'),
    true,
    'missing targets must warn deterministically.',
  );

  const missingLimits = clone(loadFixture('authority.complete-v3.json'));
  delete missingLimits.structureV3.authority.limits;

  const limitsReport = validateAuthorityShape(missingLimits);
  assert.equal(limitsReport.passed, true, 'missing limits should warn, not fail.');
  assert.equal(
    findCode(limitsReport.warnings, REASON_CODES.MISSING_RECOMMENDED_SLOT, 'limits'),
    true,
    'missing limits must warn deterministically.',
  );

  process.stdout.write('PASS authority_v3_recommended_slot_warnings\n');
}

function verifyLanguageValidButStructurallyIncomplete() {
  const concept = loadFixture('authority.partial-v3.json');

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'partial Authority V3 fixture should still pass loader validation.',
  );

  const conceptReport = validateConcept(concept);
  assert.equal(conceptReport.languagePassed, true, 'partial Authority V3 fixture should still pass V1/V2 language checks.');
  assert.equal(conceptReport.v3Status, 'incomplete', 'partial Authority V3 fixture should be structurally incomplete.');
  assert.equal(
    conceptReport.validationState,
    'structurally_incomplete',
    'partial Authority V3 fixture classification mismatch.',
  );
  assert.equal(conceptReport.passed, false, 'partial Authority V3 fixture should fail the overall validator.');
  assert.equal(
    findCode(conceptReport.v3.failures, REASON_CODES.AUTHORITY_MISSING_SOURCE, 'source'),
    true,
    'partial Authority V3 fixture must report missing source.',
  );

  process.stdout.write('PASS authority_v3_language_valid_but_structurally_incomplete\n');
}

function verifyLegacyFixtureIsMigrationSafe() {
  const concept = loadFixture('authority.legacy-text-only.json');

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'legacy Authority fixture without structureV3 must remain loader-safe.',
  );
  assert.equal(readOptionalStructureV3Envelope(concept), null, 'legacy Authority fixture should not expose a V3 envelope.');
  assert.equal(readAuthorityStructureV3(concept), null, 'legacy Authority fixture should not expose an authority V3 block.');

  const shapeReport = validateAuthorityShape(concept);
  assertStructurallyIncomplete(shapeReport, 'legacy authority');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.AUTHORITY_MISSING_HOLDER, 'holder'), true, 'legacy authority must report missing holder.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.AUTHORITY_MISSING_SCOPE, 'scope'), true, 'legacy authority must report missing scope.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.AUTHORITY_MISSING_SOURCE, 'source'), true, 'legacy authority must report missing source.');

  process.stdout.write('PASS authority_v3_legacy_fixture\n');
}

function verifyMalformedEnvelopeIsDeterministic() {
  const concept = loadFixture('authority.complete-v3.json');
  concept.structureV3 = [];

  assert.doesNotThrow(
    () => validateConceptShape(concept, concept.conceptId),
    'malformed structureV3 must not crash loader validation.',
  );
  assert.equal(readOptionalStructureV3Envelope(concept), null, 'malformed structureV3 should normalize to null envelope.');
  assert.equal(readAuthorityStructureV3(concept), null, 'malformed structureV3 should normalize to null authority block.');

  const shapeReport = validateAuthorityShape(concept);
  assertStructurallyIncomplete(shapeReport, 'malformed authority v3 envelope');
  assert.equal(shapeReport.schemaVersion, null, 'malformed structureV3 should not leak schemaVersion.');
  assert.equal(shapeReport.conceptFamily, null, 'malformed structureV3 should not leak conceptFamily.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.AUTHORITY_MISSING_HOLDER, 'holder'), true, 'malformed structureV3 must report missing holder.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.AUTHORITY_MISSING_SCOPE, 'scope'), true, 'malformed structureV3 must report missing scope.');
  assert.equal(findCode(shapeReport.failures, REASON_CODES.AUTHORITY_MISSING_SOURCE, 'source'), true, 'malformed structureV3 must report missing source.');

  process.stdout.write('PASS authority_v3_malformed_envelope\n');
}

function verifyAuthorityPowerBoundaryWarnings() {
  const collapsingAuthority = loadFixture('authority.complete-v3.json');
  collapsingAuthority.fullDefinition = 'Authority is the effective capacity to produce outcomes and secure compliance in a governance structure.';

  const authorityReport = validateConcept(collapsingAuthority);
  assert.equal(
    authorityReport.v3.boundaryChecks.some((entry) => entry.code === REASON_CODES.AUTHORITY_COLLAPSES_TO_POWER),
    true,
    'authority boundary check must flag power-style collapse.',
  );
  assert.equal(
    authorityReport.v3.warnings.some((entry) => entry.code === REASON_CODES.AUTHORITY_COLLAPSES_TO_POWER),
    true,
    'authority collapse must surface as a report-only V3 warning.',
  );
  assert.equal(authorityReport.passed, true, 'authority collapse warning must remain non-blocking in this phase.');

  const collapsingPower = loadPowerConcept();
  collapsingPower.fullDefinition = 'Power is the recognized standing and right to direct within a governance order.';

  const powerReport = validateConcept(collapsingPower);
  assert.equal(powerReport.v3.v3Status, 'passing', 'power should participate in V3 reporting in this phase.');
  assert.equal(
    powerReport.v3.boundaryChecks.some((entry) => entry.code === REASON_CODES.POWER_COLLAPSES_TO_AUTHORITY),
    true,
    'power boundary check must flag authority-style collapse.',
  );
  assert.equal(
    powerReport.v3.warnings.some((entry) => entry.code === REASON_CODES.POWER_COLLAPSES_TO_AUTHORITY),
    true,
    'power collapse must surface as a report-only V3 warning.',
  );
  assert.equal(powerReport.passed, true, 'power collapse warning must remain non-blocking in this phase.');

  process.stdout.write('PASS authority_power_boundary_warnings\n');
}

function main() {
  verifyCompleteFixturePasses();
  verifyMissingRequiredSlots();
  verifyRecommendedSlotWarnings();
  verifyLanguageValidButStructurallyIncomplete();
  verifyLegacyFixtureIsMigrationSafe();
  verifyMalformedEnvelopeIsDeterministic();
  verifyAuthorityPowerBoundaryWarnings();
  process.stdout.write('ChatPDM Authority V3 verification passed.\n');
}

main();
