'use strict';

const { validateBoundaryProofRequirements } = require('./concept-boundary-proof');
const { compareConceptProfiles } = require('./concept-profile-comparator');
const { normalizeConceptToProfile } = require('./concept-structural-profile');

const OVERLAP_ADMISSION_VALUES = Object.freeze([
  'pending_overlap_scan',
  'overlap_scan_passed',
  'overlap_scan_failed_conflict',
  'overlap_scan_failed_duplicate',
  'overlap_scan_failed_compression',
  'overlap_scan_boundary_required',
]);

const BLOCKING_OVERLAP_ADMISSION_VALUES = Object.freeze([
  'pending_overlap_scan',
  'overlap_scan_failed_conflict',
  'overlap_scan_failed_duplicate',
  'overlap_scan_failed_compression',
  'overlap_scan_boundary_required',
]);

const FAILURE_CLASSIFICATION_TO_ADMISSION = Object.freeze({
  conflicting: 'overlap_scan_failed_conflict',
  duplicate_candidate: 'overlap_scan_failed_duplicate',
  compressed_synonym_risk: 'overlap_scan_failed_compression',
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function freezeReport(report) {
  return Object.freeze({
    ...report,
    comparedConceptIds: Object.freeze([...report.comparedConceptIds]),
    blockingResults: Object.freeze([...report.blockingResults]),
    comparisonResults: Object.freeze([...report.comparisonResults]),
  });
}

function assertCandidateConcept(candidateConcept) {
  if (!isPlainObject(candidateConcept)) {
    throw new Error('Concept overlap admission gate requires a concept object.');
  }

  if (typeof candidateConcept.conceptId !== 'string' || candidateConcept.conceptId.trim() === '') {
    throw new Error('Concept overlap admission gate requires a normalized conceptId.');
  }
}

function normalizeLiveProfiles(liveConcepts) {
  if (!Array.isArray(liveConcepts)) {
    throw new Error('Concept overlap admission gate requires a live concept array.');
  }

  return Object.freeze(
    liveConcepts.map((concept) => normalizeConceptToProfile(concept)),
  );
}

function buildPendingOverlapReport(conceptId) {
  return freezeReport({
    conceptId,
    admission: 'pending_overlap_scan',
    blocking: true,
    reason: 'live concept set unavailable for overlap scan.',
    comparedConceptIds: [],
    blockingResults: [],
    comparisonResults: [],
  });
}

function filterBlockingResults(comparisonResults, classification) {
  return comparisonResults.filter((result) => result.classification === classification);
}

function resolveFailureReport(candidateConcept, comparisonResults, classification) {
  const blockingResults = filterBlockingResults(comparisonResults, classification);
  const admission = FAILURE_CLASSIFICATION_TO_ADMISSION[classification];

  return freezeReport({
    conceptId: candidateConcept.conceptId,
    admission,
    blocking: true,
    reason: `Overlap scan found ${classification} against live concepts.`,
    comparedConceptIds: comparisonResults.map((result) => result.otherConceptId),
    blockingResults,
    comparisonResults,
  });
}

function resolveBoundaryRequiredReport(candidateConcept, comparisonResults, error) {
  const blockingResults = comparisonResults.filter((result) => result.requiredBoundaryProof);

  return freezeReport({
    conceptId: candidateConcept.conceptId,
    admission: 'overlap_scan_boundary_required',
    blocking: true,
    reason: error.message,
    comparedConceptIds: comparisonResults.map((result) => result.otherConceptId),
    blockingResults,
    comparisonResults,
  });
}

function resolvePassingReport(candidateConcept, comparisonResults) {
  return freezeReport({
    conceptId: candidateConcept.conceptId,
    admission: 'overlap_scan_passed',
    blocking: false,
    reason: 'All live concept comparisons passed and required boundary proofs are present.',
    comparedConceptIds: comparisonResults.map((result) => result.otherConceptId),
    blockingResults: [],
    comparisonResults,
  });
}

function compareCandidateAgainstLiveConcepts(candidateConcept, liveConceptProfiles) {
  const candidateProfile = normalizeConceptToProfile(candidateConcept);

  return Object.freeze(
    liveConceptProfiles
      .filter((liveProfile) => liveProfile.conceptId !== candidateProfile.conceptId)
      .map((liveProfile) => compareConceptProfiles(candidateProfile, liveProfile)),
  );
}

function evaluateConceptOverlapAdmission(candidateConcept, liveConcepts = null) {
  assertCandidateConcept(candidateConcept);

  if (liveConcepts === null) {
    return buildPendingOverlapReport(candidateConcept.conceptId);
  }

  const liveConceptProfiles = normalizeLiveProfiles(liveConcepts);
  const comparisonResults = compareCandidateAgainstLiveConcepts(candidateConcept, liveConceptProfiles);

  if (filterBlockingResults(comparisonResults, 'conflicting').length > 0) {
    return resolveFailureReport(candidateConcept, comparisonResults, 'conflicting');
  }

  if (filterBlockingResults(comparisonResults, 'duplicate_candidate').length > 0) {
    return resolveFailureReport(candidateConcept, comparisonResults, 'duplicate_candidate');
  }

  if (filterBlockingResults(comparisonResults, 'compressed_synonym_risk').length > 0) {
    return resolveFailureReport(candidateConcept, comparisonResults, 'compressed_synonym_risk');
  }

  if (comparisonResults.some((result) => result.requiredBoundaryProof)) {
    try {
      validateBoundaryProofRequirements(candidateConcept, liveConceptProfiles);
    } catch (error) {
      return resolveBoundaryRequiredReport(candidateConcept, comparisonResults, error);
    }
  }

  return resolvePassingReport(candidateConcept, comparisonResults);
}

function assertConceptEligibleForLiveAdmission(candidateConcept, liveConcepts) {
  const report = evaluateConceptOverlapAdmission(candidateConcept, liveConcepts);

  if (report.admission !== 'overlap_scan_passed') {
    throw new Error(
      `Concept "${candidateConcept.conceptId}" failed overlap admission with state "${report.admission}": ${report.reason}`,
    );
  }

  return report;
}

function assertLiveConceptOverlapAdmissions(liveConcepts) {
  if (!Array.isArray(liveConcepts)) {
    throw new Error('Live concept overlap admission requires an array of live concepts.');
  }

  const reports = liveConcepts.map((concept) => evaluateConceptOverlapAdmission(concept, liveConcepts));
  const failingReports = reports.filter((report) => report.admission !== 'overlap_scan_passed');

  if (failingReports.length > 0) {
    const detail = failingReports
      .map((report) => `${report.conceptId}=${report.admission}`)
      .join(', ');

    throw new Error(`Live concept overlap admission blocked: ${detail}.`);
  }

  return Object.freeze(reports);
}

module.exports = {
  BLOCKING_OVERLAP_ADMISSION_VALUES,
  OVERLAP_ADMISSION_VALUES,
  assertConceptEligibleForLiveAdmission,
  assertLiveConceptOverlapAdmissions,
  evaluateConceptOverlapAdmission,
};
