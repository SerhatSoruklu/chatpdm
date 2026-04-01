'use strict';

const STRUCTURAL_FAILURE_KINDS = Object.freeze([
  'invariant_breach',
  'ontological_impossibility',
  'contract_violation',
]);

function assertPlainResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Structural failure classification requires a constraint-contract result object.');
  }
}

function classifyConstraintContractFailure(result) {
  assertPlainResult(result);

  if (result.resolution === 'valid') {
    return null;
  }

  if (result.resolution === 'invalid' || result.resolution === 'refused') {
    return 'contract_violation';
  }

  if (result.resolution === 'conflict') {
    if (typeof result.code === 'string' && /_(IDENTITY|SOURCE)_KIND_MISMATCH$/.test(result.code)) {
      return 'ontological_impossibility';
    }

    return 'invariant_breach';
  }

  throw new Error(`Unsupported constraint-contract resolution "${result.resolution}".`);
}

function classifyConstraintContractCollision(leftSummary, rightSummary) {
  if (!leftSummary || typeof leftSummary !== 'object' || Array.isArray(leftSummary)) {
    throw new Error('Structural failure collision classification requires a left contract summary object.');
  }

  if (!rightSummary || typeof rightSummary !== 'object' || Array.isArray(rightSummary)) {
    throw new Error('Structural failure collision classification requires a right contract summary object.');
  }

  if (leftSummary.kindField === rightSummary.kindField && leftSummary.kindValue === rightSummary.kindValue) {
    return 'ontological_impossibility';
  }

  return null;
}

module.exports = {
  STRUCTURAL_FAILURE_KINDS,
  classifyConstraintContractCollision,
  classifyConstraintContractFailure,
};
