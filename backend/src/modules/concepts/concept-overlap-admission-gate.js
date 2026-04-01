'use strict';

const { validateBoundaryProofRequirements } = require('./concept-boundary-proof');
const {
  buildConstraintContractSummary,
} = require('./constraint-contract');
const { compareConceptProfiles } = require('./concept-profile-comparator');
const { normalizeConceptToProfile } = require('./concept-structural-profile');
const {
  STRUCTURAL_FAILURE_KINDS,
  classifyConstraintContractCollision,
} = require('./structural-failure-layer');

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
    structuralFailureKinds: Object.freeze([...(report.structuralFailureKinds ?? [])]),
    blockingResults: Object.freeze([...report.blockingResults]),
    comparisonResults: Object.freeze([...report.comparisonResults]),
  });
}

function freezeComparisonResult(result) {
  return Object.freeze({
    ...result,
    reasons: Object.freeze([...(result.reasons ?? [])]),
    collidingFields: Object.freeze([...(result.collidingFields ?? [])]),
    substitutionRiskExamples: Object.freeze([...(result.substitutionRiskExamples ?? [])]),
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

function normalizeLiveRecords(liveConcepts) {
  const liveProfiles = normalizeLiveProfiles(liveConcepts);

  return Object.freeze(
    liveConcepts.map((concept, index) => Object.freeze({
      conceptId: concept.conceptId,
      profile: liveProfiles[index],
      contractSummary: buildConstraintContractSummary(concept),
    })),
  );
}

function buildPendingOverlapReport(conceptId) {
  return freezeReport({
    conceptId,
    admission: 'pending_overlap_scan',
    blocking: true,
    reason: 'live concept set unavailable for overlap scan.',
    comparedConceptIds: [],
    structuralFailureKinds: [],
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
    structuralFailureKinds: [...new Set(
      blockingResults
        .map((result) => result.structuralFailureKind)
        .filter((kind) => STRUCTURAL_FAILURE_KINDS.includes(kind)),
    )],
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
    structuralFailureKinds: [],
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
    structuralFailureKinds: [],
    blockingResults: [],
    comparisonResults,
  });
}

function resolveContractDuplicateResult(candidateConcept, candidateContractSummary, liveRecord) {
  const structuralFailureKind = classifyConstraintContractCollision(
    candidateContractSummary,
    liveRecord.contractSummary,
  );

  if (!structuralFailureKind) {
    return null;
  }

  return freezeComparisonResult({
    otherConceptId: liveRecord.conceptId,
    classification: 'duplicate_candidate',
    reasons: [
      'constraintContract assigns the same structural role as an existing live concept.',
      'A new concept cannot claim a live contract kind that is already occupied inside the governance kernel.',
    ],
    collidingFields: [
      'constraintContract.kindField',
      'constraintContract.kindValue',
      'constraintContract.templateRole',
    ],
    requiredBoundaryProof: false,
    substitutionRiskExamples: [
      `Substituting "${candidateConcept.conceptId}" for "${liveRecord.conceptId}" would preserve the same contract role ${candidateContractSummary.kindField}=${candidateContractSummary.kindValue}.`,
    ],
    signalSource: 'constraint_contract',
    structuralFailureKind,
  });
}

function compareCandidateAgainstLiveConcepts(candidateConcept, liveRecords) {
  const candidateProfile = normalizeConceptToProfile(candidateConcept);
  const candidateContractSummary = buildConstraintContractSummary(candidateConcept);

  return Object.freeze(
    liveRecords
      .filter((liveRecord) => liveRecord.conceptId !== candidateProfile.conceptId)
      .map((liveRecord) => {
        const contractDuplicateResult = resolveContractDuplicateResult(
          candidateConcept,
          candidateContractSummary,
          liveRecord,
        );

        if (contractDuplicateResult) {
          return contractDuplicateResult;
        }

        return freezeComparisonResult({
          ...compareConceptProfiles(candidateProfile, liveRecord.profile),
          signalSource: 'structural_profile',
          structuralFailureKind: null,
        });
      }),
  );
}

function resolveContractViolationReport(candidateConcept, error) {
  return freezeReport({
    conceptId: candidateConcept.conceptId,
    admission: 'overlap_scan_failed_conflict',
    blocking: true,
    reason: error.message,
    comparedConceptIds: [],
    structuralFailureKinds: ['contract_violation'],
    blockingResults: [],
    comparisonResults: [],
  });
}

function evaluateConceptOverlapAdmission(candidateConcept, liveConcepts = null) {
  assertCandidateConcept(candidateConcept);

  if (liveConcepts === null) {
    return buildPendingOverlapReport(candidateConcept.conceptId);
  }

  let liveRecords;
  let comparisonResults;

  try {
    liveRecords = normalizeLiveRecords(liveConcepts);
    comparisonResults = compareCandidateAgainstLiveConcepts(candidateConcept, liveRecords);
  } catch (error) {
    return resolveContractViolationReport(candidateConcept, error);
  }

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
      validateBoundaryProofRequirements(
        candidateConcept,
        liveRecords.map((liveRecord) => liveRecord.profile),
      );
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
