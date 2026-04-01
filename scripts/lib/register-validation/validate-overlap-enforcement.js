'use strict';

const { REASON_CODES } = require('./reason-codes');
const { LIVE_CONCEPT_IDS } = require('../../../backend/src/modules/concepts/admission-state');
const { evaluateConceptOverlapAdmission } = require('../../../backend/src/modules/concepts/concept-overlap-admission-gate');
const { normalizeConceptToProfile } = require('../../../backend/src/modules/concepts/concept-structural-profile');
const { validateConceptShape } = require('../../../backend/src/modules/concepts/concept-loader');

function countBy(items, selector) {
  const counts = new Map();

  items.forEach((item) => {
    const key = selector(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return Object.fromEntries([...counts.entries()].sort());
}

function freezeJson(value) {
  return Object.freeze(JSON.parse(JSON.stringify(value)));
}

function createFailure(code, detail, otherConceptId = null, classification = null) {
  return {
    code,
    detail,
    otherConceptId,
    classification,
  };
}

function compactComparisonResult(result) {
  return {
    otherConceptId: result.otherConceptId,
    classification: result.classification,
    requiredBoundaryProof: result.requiredBoundaryProof,
    collidingFields: [...result.collidingFields],
    reasons: [...result.reasons],
  };
}

function buildLiveConceptSet(concepts) {
  const conceptsById = new Map(
    concepts.map((concept) => [concept.conceptId, concept]),
  );
  const failures = [];
  const liveConcepts = [];

  LIVE_CONCEPT_IDS.forEach((conceptId) => {
    const concept = conceptsById.get(conceptId);

    if (!concept) {
      failures.push(createFailure(
        REASON_CODES.OVERLAP_LIVE_TARGET_MISSING,
        `Live overlap target "${conceptId}" is missing from authored concept packets.`,
        conceptId,
      ));
      return;
    }

    liveConcepts.push(concept);
  });

  return {
    liveConceptIds: [...LIVE_CONCEPT_IDS],
    liveConcepts,
    failures,
  };
}

function expectedComparisonTargetIds(conceptId, liveConceptIds) {
  return liveConceptIds.filter((otherConceptId) => otherConceptId !== conceptId);
}

function deriveUnsafeFailures(admissionReport) {
  if (admissionReport.admission === 'overlap_scan_failed_conflict') {
    return admissionReport.blockingResults.map((result) => createFailure(
      REASON_CODES.OVERLAP_UNSAFE_CONFLICT,
      `Structural conflict with "${result.otherConceptId}" blocks admission.`,
      result.otherConceptId,
      result.classification,
    ));
  }

  if (admissionReport.admission === 'overlap_scan_failed_duplicate') {
    return admissionReport.blockingResults.map((result) => createFailure(
      REASON_CODES.OVERLAP_UNSAFE_DUPLICATE,
      `Duplicate candidate against "${result.otherConceptId}" blocks admission.`,
      result.otherConceptId,
      result.classification,
    ));
  }

  if (admissionReport.admission === 'overlap_scan_failed_compression') {
    return admissionReport.blockingResults.map((result) => createFailure(
      REASON_CODES.OVERLAP_UNSAFE_COMPRESSION,
      `Compressed synonym risk against "${result.otherConceptId}" blocks admission.`,
      result.otherConceptId,
      result.classification,
    ));
  }

  if (admissionReport.admission === 'overlap_scan_boundary_required') {
    const boundaryTargets = admissionReport.blockingResults.length > 0
      ? admissionReport.blockingResults
      : admissionReport.comparisonResults.filter((result) => result.requiredBoundaryProof);

    return boundaryTargets.map((result) => createFailure(
      REASON_CODES.OVERLAP_BOUNDARY_PROOF_MISSING,
      `Boundary proof is required against "${result.otherConceptId}" because comparison classified the pair as "${result.classification}".`,
      result.otherConceptId,
      result.classification,
    ));
  }

  return [];
}

function validateConceptOverlapReport(concept, liveConceptSet) {
  const failures = [];
  let profile = null;
  let admissionReport = null;

  try {
    validateConceptShape(concept, concept.conceptId);
    profile = normalizeConceptToProfile(concept);
  } catch (error) {
    failures.push(createFailure(
      REASON_CODES.OVERLAP_STRUCTURAL_PROFILE_MISSING,
      error.message,
    ));
  }

  if (!profile) {
    return freezeJson({
      conceptId: concept.conceptId,
      applicable: true,
      targetSet: 'live_concepts',
      passed: false,
      profilePresent: false,
      reportPresent: false,
      admission: 'pending_overlap_scan',
      expectedComparisonTargetIds: expectedComparisonTargetIds(concept.conceptId, liveConceptSet.liveConceptIds),
      comparedConceptIds: [],
      forbiddenEquivalenceCoverage: {
        required: [],
        covered: [],
        missing: [],
      },
      failures,
      results: [],
    });
  }

  try {
    admissionReport = evaluateConceptOverlapAdmission(concept, liveConceptSet.liveConcepts);
  } catch (error) {
    failures.push(createFailure(
      REASON_CODES.OVERLAP_COMPARISON_REPORT_MISSING,
      error.message,
    ));
  }

  const expectedTargetIds = expectedComparisonTargetIds(concept.conceptId, liveConceptSet.liveConceptIds);
  const comparedConceptIds = admissionReport?.comparedConceptIds || [];
  const missingComparisonTargets = expectedTargetIds.filter(
    (otherConceptId) => !comparedConceptIds.includes(otherConceptId),
  );

  if (!admissionReport) {
    return freezeJson({
      conceptId: concept.conceptId,
      applicable: true,
      targetSet: 'live_concepts',
      passed: false,
      profilePresent: true,
      reportPresent: false,
      admission: 'pending_overlap_scan',
      expectedComparisonTargetIds: expectedTargetIds,
      comparedConceptIds,
      forbiddenEquivalenceCoverage: {
        required: [],
        covered: [],
        missing: [],
      },
      failures,
      results: [],
    });
  }

  if (comparedConceptIds.length !== expectedTargetIds.length || missingComparisonTargets.length > 0) {
    failures.push(createFailure(
      REASON_CODES.OVERLAP_COMPARISON_REPORT_MISSING,
      `Comparison report is missing live targets: ${missingComparisonTargets.join(', ') || 'count mismatch'}.`,
    ));
  }

  const requiredForbiddenEquivalences = profile.forbiddenEquivalences
    .filter((otherConceptId) => expectedTargetIds.includes(otherConceptId));
  const missingForbiddenCoverage = requiredForbiddenEquivalences
    .filter((otherConceptId) => !comparedConceptIds.includes(otherConceptId));

  if (missingForbiddenCoverage.length > 0) {
    failures.push(createFailure(
      REASON_CODES.OVERLAP_FORBIDDEN_EQUIVALENCE_UNCHECKED,
      `Forbidden equivalence targets are missing from overlap report: ${missingForbiddenCoverage.join(', ')}.`,
    ));
  }

  failures.push(...deriveUnsafeFailures(admissionReport));

  return freezeJson({
    conceptId: concept.conceptId,
    applicable: true,
    targetSet: 'live_concepts',
    passed: failures.length === 0,
    profilePresent: true,
    reportPresent: true,
    admission: admissionReport.admission,
    expectedComparisonTargetIds: expectedTargetIds,
    comparedConceptIds,
    forbiddenEquivalenceCoverage: {
      required: requiredForbiddenEquivalences,
      covered: requiredForbiddenEquivalences.filter((otherConceptId) => comparedConceptIds.includes(otherConceptId)),
      missing: missingForbiddenCoverage,
    },
    failures,
    results: admissionReport.comparisonResults.map(compactComparisonResult),
  });
}

function attachOverlapValidationResults(conceptReports, concepts) {
  const liveConceptSet = buildLiveConceptSet(concepts);
  const overlapReports = conceptReports.map((conceptReport, index) => {
    const overlapReport = validateConceptOverlapReport(concepts[index], liveConceptSet);
    conceptReport.overlap = overlapReport;

    if (!overlapReport.passed) {
      conceptReport.passed = false;
    }

    return overlapReport;
  });

  const statusCounts = countBy(overlapReports, (report) => report.admission);
  const failureEntries = [
    ...liveConceptSet.failures,
    ...overlapReports.flatMap((report) => report.failures),
  ];

  return freezeJson({
    applicable: true,
    targetSet: 'live_concepts',
    liveConceptIds: liveConceptSet.liveConceptIds,
    totalConcepts: overlapReports.length,
    passingConcepts: overlapReports.filter((report) => report.passed).length,
    failingConcepts: overlapReports.filter((report) => !report.passed).length,
    statusCounts,
    failureCategories: countBy(failureEntries, (entry) => entry.code),
    failures: failureEntries,
    concepts: overlapReports,
  });
}

module.exports = {
  attachOverlapValidationResults,
  buildLiveConceptSet,
  validateConceptOverlapReport,
};
