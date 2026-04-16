'use strict';

const {
  MILITARY_CONSTRAINT_REASON_CODES,
} = require('./military-constraint-reason-codes');
const { isPlainObject } = require('./fact-schema-utils');
const {
  isLocatorBoundToSource,
  isNonEmptyString,
  isReviewedClauseProvenance,
} = require('./reference-pack-utils');

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

function validateClauseProvenance(clause, result) {
  if (!isReviewedClauseProvenance(clause.provenance)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `clause ${clause.clauseId} must include explicit provenance metadata.`);
    return;
  }

  const provenance = clause.provenance;

  if (clause.layer === 'EXAMPLE_ONLY' && provenance.derivationType !== 'ILLUSTRATIVE') {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `example-only clause ${clause.clauseId} must be marked ILLUSTRATIVE.`);
    return;
  }

  if (provenance.derivationType === 'DIRECT' && clause.rawText !== clause.normalizedText) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `direct provenance for clause ${clause.clauseId} must preserve source text exactly.`);
    return;
  }

  if (provenance.derivationType === 'INTERPRETED' && clause.rawText === clause.normalizedText) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `interpreted provenance for clause ${clause.clauseId} requires a normalized transformation.`);
    return;
  }

  if (provenance.derivationType === 'COMPOSED') {
    if (!Array.isArray(provenance.parentClauseIds) || provenance.parentClauseIds.length === 0) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `composed clause ${clause.clauseId} requires parentClauseIds.`);
      return;
    }
  } else if (Array.isArray(provenance.parentClauseIds) && provenance.parentClauseIds.length > 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `clause ${clause.clauseId} may only declare parentClauseIds when provenance is COMPOSED.`);
    return;
  }

  if (provenance.derivationType === 'ILLUSTRATIVE' && clause.machineCandidate === true) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `illustrative clause ${clause.clauseId} cannot be marked machineCandidate.`);
  }
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

    if (!isNonEmptyString(sourceEntry.locator)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `sourceId "${sourceEntry.sourceId}" is missing a locator.`);
      return;
    }

    if (!isLocatorBoundToSource(sourceEntry.locator, clause.locator)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `clause ${clause.clauseId} locator "${clause.locator}" is not bound to source locator anchor "${sourceEntry.locator}".`);
    }

    if (!isNonEmptyString(clause.normalizedText)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `clause ${clause.clauseId} must have non-empty normalizedText.`);
    }

    validateClauseProvenance(clause, result);

    const hintAuthority = isPlainObject(clause.compilationHint) && isPlainObject(clause.compilationHint.authority)
      ? clause.compilationHint.authority
      : null;

    if (hintAuthority && hintAuthority.requiresExplicitDelegation === true && (!Array.isArray(hintAuthority.delegationEdgeIds) || hintAuthority.delegationEdgeIds.length === 0)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.AUTHORITY_UNRESOLVED, `clause ${clause.clauseId} requires an explicit delegation path.`);
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
