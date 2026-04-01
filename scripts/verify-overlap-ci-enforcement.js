'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { REASON_CODES } = require('./lib/register-validation/reason-codes');
const {
  attachOverlapValidationResults,
  buildLiveConceptSet,
  validateConceptOverlapReport,
} = require('./lib/register-validation/validate-overlap-enforcement');

const conceptsDirectory = path.resolve(__dirname, '../data/concepts');
const NON_CONCEPT_PACKET_FILES = new Set([
  'concept-admission-state.json',
  'overlap-boundary-change-approvals.json',
  'overlap-classification-snapshot.json',
  'resolve-rules.json',
]);

function loadConceptPackets() {
  return fs.readdirSync(conceptsDirectory)
    .filter((fileName) => fileName.endsWith('.json'))
    .filter((fileName) => !NON_CONCEPT_PACKET_FILES.has(fileName))
    .sort()
    .map((fileName) => JSON.parse(fs.readFileSync(path.join(conceptsDirectory, fileName), 'utf8')));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getConcept(concepts, conceptId) {
  const concept = concepts.find((entry) => entry.conceptId === conceptId);
  assert.notEqual(concept, undefined, `Missing concept fixture for ${conceptId}.`);
  return concept;
}

function hasFailure(report, code) {
  return report.failures.some((entry) => entry.code === code);
}

function verifyCurrentConceptSetProducesOverlapReports(concepts) {
  const conceptReports = concepts.map((concept) => ({
    conceptId: concept.conceptId,
    passed: true,
  }));
  const overlapSummary = attachOverlapValidationResults(conceptReports, concepts);

  assert.equal(overlapSummary.failingConcepts, 0, 'current concept set should pass overlap CI enforcement.');
  conceptReports.forEach((conceptReport) => {
    assert.equal(conceptReport.overlap.profilePresent, true, `${conceptReport.conceptId} structural profile must be present.`);

    if (conceptReport.overlap.applicable) {
      assert.equal(conceptReport.overlap.reportPresent, true, `${conceptReport.conceptId} overlap report must exist.`);
      return;
    }

    assert.equal(conceptReport.overlap.reportPresent, false, `${conceptReport.conceptId} overlap report must be skipped when overlap enforcement is not applicable.`);
  });

  process.stdout.write('PASS overlap_ci_current_concept_set_reports_present\n');
}

function verifyVisibleOnlyInteractionConceptsAreSkipped(concepts) {
  const conceptReports = concepts.map((concept) => ({
    conceptId: concept.conceptId,
    passed: true,
  }));
  attachOverlapValidationResults(conceptReports, concepts);

  ['agreement', 'breach', 'commitment'].forEach((conceptId) => {
    const report = conceptReports.find((entry) => entry.conceptId === conceptId)?.overlap;
    assert.notEqual(report, undefined, `Missing overlap report for ${conceptId}.`);
    assert.equal(report.applicable, false, `${conceptId} overlap enforcement should be skipped.`);
    assert.equal(report.admission, 'not_applicable', `${conceptId} overlap admission should be not_applicable.`);
    assert.equal(report.reportPresent, false, `${conceptId} should not be forced through live overlap comparison.`);
    assert.equal(report.profilePresent, true, `${conceptId} should still carry a structural profile.`);
  });

  process.stdout.write('PASS overlap_ci_visible_only_interaction_concepts_skipped\n');
}

function verifyMissingStructuralProfileFails(concepts, liveConceptSet) {
  const candidate = clone(getConcept(concepts, 'power'));
  candidate.conceptId = 'power-profile-gap';
  candidate.concept = 'power-profile-gap';
  delete candidate.structuralProfile;

  const report = validateConceptOverlapReport(candidate, liveConceptSet);

  assert.equal(report.passed, false, 'missing structural profile must fail overlap CI validation.');
  assert.equal(hasFailure(report, REASON_CODES.OVERLAP_STRUCTURAL_PROFILE_MISSING), true, 'missing profile must report OVERLAP_STRUCTURAL_PROFILE_MISSING.');

  process.stdout.write('PASS overlap_ci_missing_profile_fails\n');
}

function verifyComparisonReportMissingFails(concepts) {
  const truncatedConcepts = concepts.filter((concept) => concept.conceptId !== 'legitimacy');
  const conceptReports = truncatedConcepts.map((concept) => ({
    conceptId: concept.conceptId,
    passed: true,
  }));
  const overlapSummary = attachOverlapValidationResults(conceptReports, truncatedConcepts);

  assert.equal(
    Boolean(overlapSummary.failureCategories[REASON_CODES.OVERLAP_LIVE_TARGET_MISSING]),
    true,
    'missing live target must surface as OVERLAP_LIVE_TARGET_MISSING.',
  );
  assert.equal(
    conceptReports.some((report) => hasFailure(report.overlap, REASON_CODES.OVERLAP_COMPARISON_REPORT_MISSING)),
    true,
    'truncated live target set must surface comparison report failures.',
  );

  process.stdout.write('PASS overlap_ci_missing_comparison_report_fails\n');
}

function verifyMissingBoundaryProofFails(concepts, liveConceptSet) {
  const candidate = clone(getConcept(concepts, 'power'));
  candidate.conceptId = 'power-transition';
  candidate.concept = 'power-transition';
  candidate.title = 'Power Transition';
  candidate.constraintContract.expectedIdentityKind = 'power-transition-kind';
  candidate.canonical.invariant = 'Power transition is effective capacity to produce outcomes as it moves from latent leverage into operative exercise within governance.';
  candidate.shortDefinition = 'Power transition is effective capacity to produce outcomes as it moves from latent leverage into operative exercise within governance.';
  candidate.coreMeaning = 'Power transition marks the same outcome-producing capacity as power while assigning it a different temporal position between latent leverage and fully operative exercise.';
  candidate.fullDefinition = 'Power transition marks the same outcome-producing capacity as power while assigning it a different temporal position between latent leverage and fully operative exercise. It remains close enough to power that explicit separation must be authored before admission.';
  candidate.registers.standard.shortDefinition = candidate.shortDefinition;
  candidate.registers.standard.coreMeaning = candidate.coreMeaning;
  candidate.registers.standard.fullDefinition = candidate.fullDefinition;
  candidate.structuralProfile.temporalRole = 'transition from latent leverage into operative outcome production';
  delete candidate.boundaryProofs;

  const report = validateConceptOverlapReport(candidate, liveConceptSet);

  assert.equal(report.passed, false, 'missing boundary proof must fail overlap CI validation.');
  assert.equal(hasFailure(report, REASON_CODES.OVERLAP_BOUNDARY_PROOF_MISSING), true, 'missing proof must report OVERLAP_BOUNDARY_PROOF_MISSING.');

  process.stdout.write('PASS overlap_ci_missing_boundary_proof_fails\n');
}

function verifyUnsafeDuplicateFails(concepts, liveConceptSet) {
  const candidate = clone(getConcept(concepts, 'power'));
  candidate.conceptId = 'power-shadow';
  candidate.concept = 'power-shadow';
  candidate.title = 'Power Shadow';

  const report = validateConceptOverlapReport(candidate, liveConceptSet);

  assert.equal(report.passed, false, 'duplicate candidate must fail overlap CI validation.');
  assert.equal(hasFailure(report, REASON_CODES.OVERLAP_UNSAFE_DUPLICATE), true, 'duplicate candidate must report OVERLAP_UNSAFE_DUPLICATE.');

  process.stdout.write('PASS overlap_ci_unsafe_duplicate_fails\n');
}

function main() {
  const concepts = loadConceptPackets();
  const liveConceptSet = buildLiveConceptSet(concepts);

  verifyCurrentConceptSetProducesOverlapReports(concepts);
  verifyVisibleOnlyInteractionConceptsAreSkipped(concepts);
  verifyMissingStructuralProfileFails(concepts, liveConceptSet);
  verifyComparisonReportMissingFails(concepts);
  verifyMissingBoundaryProofFails(concepts, liveConceptSet);
  verifyUnsafeDuplicateFails(concepts, liveConceptSet);
  process.stdout.write('ChatPDM overlap CI enforcement verification passed.\n');
}

main();
