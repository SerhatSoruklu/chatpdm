'use strict';

const {
  MILITARY_CONSTRAINT_REASON_CODES,
} = require('./military-constraint-reason-codes');

const PREDICATE_BUDGETS = Object.freeze({
  maxDepth: 64,
  maxNodes: 256,
  maxBranchWidth: 64,
});

function createPredicateBudgetState() {
  return {
    nodeCount: 0,
  };
}

function makePredicateBudgetError(message, details) {
  return {
    code: MILITARY_CONSTRAINT_REASON_CODES.PREDICATE_BUDGET_EXCEEDED,
    message,
    details: details || null,
  };
}

function checkPredicateNodeBudget(state, depth, operatorName) {
  if (!state || typeof state.nodeCount !== 'number') {
    return makePredicateBudgetError('predicate budget state is unavailable.', {
      depth,
      operatorName: typeof operatorName === 'string' ? operatorName : null,
    });
  }

  if (!Number.isInteger(depth) || depth < 0) {
    return makePredicateBudgetError('predicate depth tracking failed.', {
      depth,
      operatorName: typeof operatorName === 'string' ? operatorName : null,
    });
  }

  if (depth > PREDICATE_BUDGETS.maxDepth) {
    return makePredicateBudgetError(`predicate recursion depth exceeds the maximum of ${PREDICATE_BUDGETS.maxDepth}.`, {
      depth,
      maxDepth: PREDICATE_BUDGETS.maxDepth,
      operatorName: typeof operatorName === 'string' ? operatorName : null,
    });
  }

  if (state.nodeCount + 1 > PREDICATE_BUDGETS.maxNodes) {
    return makePredicateBudgetError(`predicate node count exceeds the maximum of ${PREDICATE_BUDGETS.maxNodes}.`, {
      nodeCount: state.nodeCount + 1,
      maxNodes: PREDICATE_BUDGETS.maxNodes,
      operatorName: typeof operatorName === 'string' ? operatorName : null,
    });
  }

  state.nodeCount += 1;
  return null;
}

function checkPredicateBranchWidth(operatorName, branchWidth) {
  if (!Number.isInteger(branchWidth) || branchWidth < 0) {
    return null;
  }

  if (branchWidth > PREDICATE_BUDGETS.maxBranchWidth) {
    return makePredicateBudgetError(`predicate branch width exceeds the maximum of ${PREDICATE_BUDGETS.maxBranchWidth}.`, {
      actualWidth: branchWidth,
      maxBranchWidth: PREDICATE_BUDGETS.maxBranchWidth,
      operatorName: typeof operatorName === 'string' ? operatorName : null,
    });
  }

  return null;
}

function isPredicateBudgetExceededError(entry) {
  return Boolean(entry)
    && typeof entry === 'object'
    && entry.code === MILITARY_CONSTRAINT_REASON_CODES.PREDICATE_BUDGET_EXCEEDED;
}

module.exports = {
  PREDICATE_BUDGETS,
  checkPredicateBranchWidth,
  checkPredicateNodeBudget,
  createPredicateBudgetState,
  isPredicateBudgetExceededError,
};
