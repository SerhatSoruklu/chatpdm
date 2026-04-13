'use strict';

const {
  MILITARY_CONSTRAINT_REASON_CODES,
} = require('./military-constraint-reason-codes');
const { isPlainObject } = require('./fact-schema-utils');

const COMPILABLE_CLAUSE_TYPES = new Set([
  'PROHIBITION',
  'REQUIREMENT',
  'AUTHORITY_GATE',
]);

const RESOLVED_AMBIGUITY_STATUSES = new Set([
  'CLEAR',
  'RESOLVED',
]);

function makeResult() {
  return {
    valid: true,
    reasonCode: null,
    errors: [],
  };
}

function fail(result, reasonCode, message) {
  result.valid = false;
  if (result.reasonCode === null) {
    result.reasonCode = reasonCode;
  }
  result.errors.push(message);
}

function finish(result) {
  return Object.freeze({
    valid: result.valid,
    reasonCode: result.reasonCode,
    errors: Object.freeze([...result.errors]),
  });
}

function buildSourceIndex(sourceRegistry) {
  const index = new Map();

  if (!Array.isArray(sourceRegistry)) {
    return index;
  }

  sourceRegistry.forEach((entry) => {
    if (isPlainObject(entry) && typeof entry.sourceId === 'string' && entry.sourceId.length > 0) {
      index.set(entry.sourceId, entry);
    }
  });

  return index;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateReviewedClauseCorpus(input) {
  const result = makeResult();
  const clauses = isPlainObject(input) && Array.isArray(input.clauses)
    ? input.clauses
    : Array.isArray(input.corpus)
      ? input.corpus
      : [];
  const sourceIndex = buildSourceIndex(isPlainObject(input) ? input.sourceRegistry : null);
  const seenClauseIds = new Set();

  if (clauses.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, 'clauses must be a non-empty array.');
    return finish(result);
  }

  clauses.forEach((clause) => {
    if (!isPlainObject(clause)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, 'corpus must contain plain clause objects.');
      return;
    }

    if (!isNonEmptyString(clause.clauseId)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, 'each clause must include a clauseId.');
      return;
    }

    if (seenClauseIds.has(clause.clauseId)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_CONFLICT, `duplicate clauseId "${clause.clauseId}" detected.`);
    } else {
      seenClauseIds.add(clause.clauseId);
    }

    const sourceEntry = sourceIndex.get(clause.sourceId);
    if (!isPlainObject(sourceEntry)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `clause ${clause.clauseId} references unknown sourceId "${clause.sourceId}".`);
      return;
    }

    if (!isNonEmptyString(clause.locator)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `clause ${clause.clauseId} is missing a locator.`);
    }

    if (!isNonEmptyString(clause.normalizedText)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `clause ${clause.clauseId} must have non-empty normalizedText.`);
    }

    if (sourceEntry.exampleOnly === true && clause.layer !== 'EXAMPLE_ONLY' && sourceEntry.normativeOverride !== true) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.ILLEGAL_OVERLAY, `example-only source "${sourceEntry.sourceId}" cannot be promoted by clause ${clause.clauseId} without an explicit normative override.`);
    }

    const isCompilable = clause.machineCandidate === true || clause.reviewStatus === 'COMPILATION_READY';
    if (sourceEntry.exampleOnly === true && isCompilable && sourceEntry.normativeOverride !== true) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.ILLEGAL_OVERLAY, `example-only source "${sourceEntry.sourceId}" cannot enter the compilable corpus through clause ${clause.clauseId} without an explicit normative override.`);
    }

    if (isCompilable && !RESOLVED_AMBIGUITY_STATUSES.has(clause.ambiguityStatus)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `clause ${clause.clauseId} is compilable but not CLEAR or RESOLVED.`);
    }

    if (isCompilable && !COMPILABLE_CLAUSE_TYPES.has(clause.clauseType)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `clause ${clause.clauseId} uses unsupported compilable clauseType "${clause.clauseType}".`);
    }

    if (clause.reviewStatus === 'COMPILATION_READY' && clause.clauseType === 'REQUIREMENT') {
      if (!isPlainObject(clause.compilationHint)) {
        fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `compilation-ready requirement clause ${clause.clauseId} requires a compilationHint.`);
      } else if (!isPlainObject(clause.compilationHint.predicate)) {
        fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `compilation-ready requirement clause ${clause.clauseId} requires a predicate in compilationHint.`);
      }
    }
  });

  return finish(result);
}

module.exports = {
  validateReviewedClauseCorpus,
};
