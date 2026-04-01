'use strict';

const conceptRelationSchema = require('./concept-relation-schema');
const {
  BOUNDARY_PROOF_FIELDS,
  BOUNDARY_PROOF_REQUIRED_CLASSIFICATIONS,
  getRequiredBoundaryProofComparisons,
  validateBoundaryProof,
  validateBoundaryProofCatalog,
  validateBoundaryProofRequirements,
} = require('./concept-boundary-proof');
const {
  BLOCKING_OVERLAP_ADMISSION_VALUES,
  OVERLAP_ADMISSION_VALUES,
  assertConceptEligibleForLiveAdmission,
  assertLiveConceptOverlapAdmissions,
  evaluateConceptOverlapAdmission,
} = require('./concept-overlap-admission-gate');
const {
  ADJACENCY_CLASSIFICATIONS,
  BLOCKING_CLASSIFICATIONS,
  buildConceptOverlapInspectionReport,
  getConceptOverlapReport,
  loadInspectableConceptSet,
} = require('./concept-overlap-report-service');
const {
  BOUNDARY_CHANGE_APPROVAL_FIELDS,
  buildCurrentConceptRelationshipSnapshot,
  evaluateConceptRelationshipSnapshotDrift,
  findMatchingBoundaryChangeApproval,
  loadBoundaryChangeApprovalRegistry,
  loadStoredConceptRelationshipSnapshot,
  writeConceptRelationshipSnapshot,
} = require('./concept-overlap-snapshot');
const {
  COMPARISON_CLASSIFICATIONS,
  COMPARISON_FIELD_ORDER,
  ROLE_DIFFERENTIATION_FIELDS,
  buildLiveConceptProfiles,
  compareConceptProfiles,
  compareProfileAgainstLiveConcepts,
} = require('./concept-profile-comparator');
const {
  STRUCTURAL_PROFILE_FIELDS,
  STRUCTURAL_PROFILE_SEED_FIELDS,
  normalizeConceptToProfile,
  validateConceptStructuralProfile,
  validateConceptStructuralProfileSeed,
} = require('./concept-structural-profile');
const { loadAuthoredRelationPackets } = require('./concept-relation-loader');
const {
  deriveConceptRuntimeGovernanceState,
  getConceptRuntimeGovernanceState,
  loadConceptValidationSnapshot,
} = require('./concept-validation-state-loader');
const { buildConceptDetail } = require('./concept-detail-service');
const {
  getConceptById,
  loadConceptSet,
} = require('./concept-loader');
const {
  ALLOWED_ADMISSION_VALUES,
  ALLOWED_VALIDATION_SOURCES,
  clearConceptReviewStateCache,
  getConceptReviewState,
  loadConceptReviewStateRegistry,
  reviewStateDirectoryPath,
  validateConceptReviewStateRecord,
} = require('./concept-review-state-loader');
const { evaluateBlockedConceptAdmission } = require('./blocked-concept-admission');
const {
  CONCEPT_UNLOCK_OVERRIDE_TEMPLATE,
  INVALID_OVERRIDE_REASON,
  OVERRIDABLE_CONCEPT_ID,
  OVERRIDE_ACTOR_ROLE,
  OVERRIDE_APPROVAL_TOKEN,
  OVERRIDE_REASON,
  OVERRIDE_SCOPE,
  applyOverride,
  clearOverrideAttemptLog,
  getOverrideAttemptLog,
  logOverrideAttempt,
  validateOverride,
} = require('./concept-unlock-override');
const conceptStructureSchema = require('./concept-structure-schema');
const { resolveConceptQuery } = require('./resolver');

module.exports = {
  ALLOWED_ADMISSION_VALUES,
  ALLOWED_VALIDATION_SOURCES,
  ADJACENCY_CLASSIFICATIONS,
  BOUNDARY_CHANGE_APPROVAL_FIELDS,
  BLOCKING_OVERLAP_ADMISSION_VALUES,
  BLOCKING_CLASSIFICATIONS,
  BOUNDARY_PROOF_FIELDS,
  BOUNDARY_PROOF_REQUIRED_CLASSIFICATIONS,
  COMPARISON_CLASSIFICATIONS,
  COMPARISON_FIELD_ORDER,
  CONCEPT_UNLOCK_OVERRIDE_TEMPLATE,
  INVALID_OVERRIDE_REASON,
  OVERRIDABLE_CONCEPT_ID,
  OVERRIDE_ACTOR_ROLE,
  OVERRIDE_APPROVAL_TOKEN,
  OVERRIDE_REASON,
  OVERRIDE_SCOPE,
  ROLE_DIFFERENTIATION_FIELDS,
  STRUCTURAL_PROFILE_FIELDS,
  STRUCTURAL_PROFILE_SEED_FIELDS,
  applyOverride,
  assertConceptEligibleForLiveAdmission,
  assertLiveConceptOverlapAdmissions,
  buildCurrentConceptRelationshipSnapshot,
  buildConceptOverlapInspectionReport,
  buildLiveConceptProfiles,
  buildConceptDetail,
  clearConceptReviewStateCache,
  clearOverrideAttemptLog,
  evaluateBlockedConceptAdmission,
  evaluateConceptRelationshipSnapshotDrift,
  deriveConceptRuntimeGovernanceState,
  findMatchingBoundaryChangeApproval,
  getConceptById,
  getConceptReviewState,
  getConceptRuntimeGovernanceState,
  loadBoundaryChangeApprovalRegistry,
  getOverrideAttemptLog,
  loadConceptSet,
  loadStoredConceptRelationshipSnapshot,
  loadConceptReviewStateRegistry,
  loadConceptValidationSnapshot,
  loadAuthoredRelationPackets,
  logOverrideAttempt,
  compareConceptProfiles,
  compareProfileAgainstLiveConcepts,
  conceptRelationSchema,
  conceptStructureSchema,
  evaluateConceptOverlapAdmission,
  getRequiredBoundaryProofComparisons,
  getConceptOverlapReport,
  normalizeConceptToProfile,
  OVERLAP_ADMISSION_VALUES,
  loadInspectableConceptSet,
  reviewStateDirectoryPath,
  resolveConceptQuery,
  validateBoundaryProof,
  validateBoundaryProofCatalog,
  validateBoundaryProofRequirements,
  validateConceptStructuralProfile,
  validateConceptStructuralProfileSeed,
  validateConceptReviewStateRecord,
  validateOverride,
  writeConceptRelationshipSnapshot,
};
