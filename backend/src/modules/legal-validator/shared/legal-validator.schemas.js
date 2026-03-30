'use strict';

const doctrineGovernanceStatuses = Object.freeze(['draft', 'reviewed', 'approved', 'locked']);
const runtimeEligibleDoctrineStatuses = Object.freeze(['approved', 'locked']);
const mappingStatuses = Object.freeze(['success', 'ambiguous', 'unresolved', 'rejected']);
const mappingMatchBases = Object.freeze([
  'exact_canonical',
  'exact_synonym',
  'exact_structural_rule',
  'manual_override',
]);
const validationResults = Object.freeze(['valid', 'invalid', 'unresolved']);

function isNonEmptyTrimmedString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasPairedValues(left, right) {
  return (left == null && right == null) || (left != null && right != null);
}

function hasNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function validateDoctrineManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    return {
      ok: false,
      message: 'DoctrineArtifact manifest is required.',
    };
  }

  const interpretationRegime = manifest.interpretationRegime;

  if (!interpretationRegime || typeof interpretationRegime !== 'object') {
    return {
      ok: false,
      message: 'DoctrineArtifact manifest must declare an interpretationRegime.',
    };
  }

  if (!isNonEmptyTrimmedString(interpretationRegime.regimeId)) {
    return {
      ok: false,
      message: 'DoctrineArtifact interpretationRegime.regimeId is required.',
    };
  }

  if (!isNonEmptyTrimmedString(interpretationRegime.name)) {
    return {
      ok: false,
      message: 'DoctrineArtifact interpretationRegime.name is required.',
    };
  }

  return { ok: true };
}

function validateDoctrineGovernance(governance) {
  if (!governance || typeof governance !== 'object') {
    return {
      ok: false,
      message: 'DoctrineArtifact governance state is required.',
    };
  }

  if (!doctrineGovernanceStatuses.includes(governance.status)) {
    return {
      ok: false,
      message: 'DoctrineArtifact governance.status is invalid.',
    };
  }

  if (!hasPairedValues(governance.reviewedBy, governance.reviewedAt)) {
    return {
      ok: false,
      message: 'DoctrineArtifact reviewedBy and reviewedAt must be set together.',
    };
  }

  if (!hasPairedValues(governance.approvedBy, governance.approvedAt)) {
    return {
      ok: false,
      message: 'DoctrineArtifact approvedBy and approvedAt must be set together.',
    };
  }

  switch (governance.status) {
    case 'draft':
      if (governance.reviewedBy || governance.reviewedAt || governance.approvedBy || governance.approvedAt || governance.lockedAt) {
        return {
          ok: false,
          message: 'Draft doctrine artifacts cannot carry review, approval, or lock metadata.',
        };
      }
      break;
    case 'reviewed':
      if (!governance.reviewedBy || !governance.reviewedAt) {
        return {
          ok: false,
          message: 'Reviewed doctrine artifacts require reviewedBy and reviewedAt.',
        };
      }
      if (governance.approvedBy || governance.approvedAt || governance.lockedAt) {
        return {
          ok: false,
          message: 'Reviewed doctrine artifacts cannot carry approval or lock metadata.',
        };
      }
      break;
    case 'approved':
      if (!governance.approvedBy || !governance.approvedAt) {
        return {
          ok: false,
          message: 'Approved doctrine artifacts require approvedBy and approvedAt.',
        };
      }
      if (governance.lockedAt) {
        return {
          ok: false,
          message: 'Approved doctrine artifacts cannot carry lockedAt before lock status.',
        };
      }
      break;
    case 'locked':
      if (!governance.approvedBy || !governance.approvedAt || !governance.lockedAt) {
        return {
          ok: false,
          message: 'Locked doctrine artifacts require approvedBy, approvedAt, and lockedAt.',
        };
      }
      break;
    default:
      break;
  }

  return { ok: true };
}

function isRuntimeEligibleDoctrineStatus(status) {
  return runtimeEligibleDoctrineStatuses.includes(status);
}

function validateAuthorityAttribution(attribution) {
  if (!attribution || typeof attribution !== 'object') {
    return {
      ok: false,
      message: 'Authority attribution is required.',
    };
  }

  if (!isNonEmptyTrimmedString(attribution.interpretationRegimeId)) {
    return {
      ok: false,
      message: 'Authority attribution.interpretationRegimeId is required.',
    };
  }

  if (!isNonEmptyTrimmedString(attribution.sourcePath)) {
    return {
      ok: false,
      message: 'Authority attribution.sourcePath is required.',
    };
  }

  return { ok: true };
}

function matchesDoctrineInterpretationRegimeId(manifest, interpretationRegimeId) {
  if (!manifest || !manifest.interpretationRegime || !isNonEmptyTrimmedString(interpretationRegimeId)) {
    return false;
  }

  return manifest.interpretationRegime.regimeId === interpretationRegimeId;
}

function validateMappingState(mapping) {
  if (!mappingStatuses.includes(mapping.status)) {
    return {
      ok: false,
      message: 'Mapping status is invalid.',
    };
  }

  const hasFailureCode = isNonEmptyTrimmedString(mapping.failureCode);
  const hasMatchBasis = isNonEmptyTrimmedString(mapping.matchBasis);
  const hasOverrideId = isNonEmptyTrimmedString(mapping.overrideId);

  if (mapping.status === 'success' && !hasMatchBasis) {
    return {
      ok: false,
      message: 'Successful mappings require an explicit matchBasis.',
    };
  }

  if (mapping.status === 'success' && hasFailureCode) {
    return {
      ok: false,
      message: 'Successful mappings cannot carry a failureCode.',
    };
  }

  if (hasMatchBasis && !mappingMatchBases.includes(mapping.matchBasis)) {
    return {
      ok: false,
      message: 'Mapping matchBasis is invalid.',
    };
  }

  if (mapping.matchBasis === 'manual_override' && !hasOverrideId) {
    return {
      ok: false,
      message: 'Manual override mappings require an explicit overrideId.',
    };
  }

  return { ok: true };
}

function isTraceStructurallyEmpty(trace) {
  if (!trace || typeof trace !== 'object') {
    return true;
  }

  return !(
    hasNonEmptyArray(trace.sourceAnchors)
    || isNonEmptyTrimmedString(trace.interpretationRegimeId)
    || hasNonEmptyArray(trace.mappingRuleIds)
    || hasNonEmptyArray(trace.validationRuleIds)
    || hasNonEmptyArray(trace.overrideIds)
    || hasNonEmptyArray(trace?.loadedManifest?.conceptIds)
    || hasNonEmptyArray(trace?.loadedManifest?.authorityIds)
  );
}

function validateValidationRunTrace(validationRun) {
  if (!validationResults.includes(validationRun.result)) {
    return {
      ok: false,
      message: 'ValidationRun result is invalid.',
    };
  }

  const trace = validationRun.trace;

  if (!trace || typeof trace !== 'object') {
    return {
      ok: false,
      message: 'ValidationRun trace is required.',
    };
  }

  if (trace.interpretationUsed === true && !isNonEmptyTrimmedString(trace.interpretationRegimeId)) {
    return {
      ok: false,
      message: 'ValidationRun trace.interpretationRegimeId is required when interpretationUsed is true.',
    };
  }

  if (trace.manualOverrideUsed === true && !hasNonEmptyArray(trace.overrideIds)) {
    return {
      ok: false,
      message: 'ValidationRun trace.overrideIds is required when manualOverrideUsed is true.',
    };
  }

  if (validationRun.result === 'valid' && isTraceStructurallyEmpty(trace)) {
    return {
      ok: false,
      message: 'Successful validation runs require a non-empty deterministic trace.',
    };
  }

  return { ok: true };
}

module.exports = {
  doctrineGovernanceStatuses,
  runtimeEligibleDoctrineStatuses,
  mappingStatuses,
  mappingMatchBases,
  validationResults,
  isNonEmptyTrimmedString,
  validateDoctrineManifest,
  validateDoctrineGovernance,
  isRuntimeEligibleDoctrineStatus,
  validateAuthorityAttribution,
  matchesDoctrineInterpretationRegimeId,
  validateMappingState,
  validateValidationRunTrace,
  isTraceStructurallyEmpty,
};
