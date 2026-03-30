'use strict';

const { REASON_CODES } = require('./reason-codes');

const BLOCKING_LAW_REASON_CODES = new Set([
  REASON_CODES.INVALID_RELATION_DIRECTION,
  REASON_CODES.AUTHORITY_CANNOT_GROUND_DUTY_OUTSIDE_SCOPE,
  REASON_CODES.DUTY_TRIGGER_MISSING_RESPONSIBILITY_BASIS,
  REASON_CODES.DUTY_DERIVATION_MISSING_VALID_SOURCE,
  REASON_CODES.RESPONSIBILITY_MISSING_VALID_TRIGGER_RELATION,
  REASON_CODES.RELATION_REQUIRES_STRUCTURALLY_VALID_CONCEPT,
]);

function countCategories(entries) {
  const counts = new Map();

  entries.forEach((entry) => {
    counts.set(entry.code, (counts.get(entry.code) || 0) + 1);
  });

  return Object.fromEntries([...counts.entries()].sort());
}

function deriveEnforcementStatus(blockingFailures, nonBlockingWarnings) {
  if (blockingFailures.length > 0) {
    return 'blocked';
  }

  if (nonBlockingWarnings.length > 0) {
    return 'warning_only';
  }

  return 'passing';
}

function deriveSystemValidationState({ languagePassed, v3Status, enforcementStatus }) {
  if (!languagePassed) {
    return 'language_invalid';
  }

  if (v3Status === 'incomplete') {
    return 'structurally_incomplete';
  }

  if (enforcementStatus === 'blocked') {
    return 'law_blocked';
  }

  if (enforcementStatus === 'warning_only') {
    return 'law_warning_only';
  }

  if (v3Status === 'passing') {
    return 'law_validated';
  }

  return 'language_valid';
}

function deriveGovernanceEnforcement({ relationFailures = [], relationWarnings = [], lawFailures = [], lawWarnings = [] } = {}) {
  const candidateFailures = [
    ...relationFailures,
    ...lawFailures,
  ];
  const blockingFailures = candidateFailures.filter(
    (entry) => BLOCKING_LAW_REASON_CODES.has(entry.code) || entry?.severity !== 'warning',
  );
  const nonBlockingWarnings = [
    ...relationWarnings,
    ...lawWarnings,
  ];
  const enforcementStatus = deriveEnforcementStatus(blockingFailures, nonBlockingWarnings);
  const activations = enforcementStatus === 'passing'
    ? []
    : [{
      code: REASON_CODES.LAW_ENFORCEMENT_ACTIVE,
      status: enforcementStatus,
      detail: enforcementStatus === 'blocked'
        ? 'Connected governance-law validation is actively blocking invalid runtime states.'
        : 'Connected governance-law validation is active and emitting non-blocking warnings.',
    }];

  return {
    enforcementStatus,
    blockingFailures,
    nonBlockingWarnings,
    activations,
    blockingFailureCategories: countCategories(blockingFailures),
    nonBlockingWarningCategories: countCategories(nonBlockingWarnings),
  };
}

module.exports = {
  BLOCKING_LAW_REASON_CODES,
  deriveGovernanceEnforcement,
  deriveSystemValidationState,
};
