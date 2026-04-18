'use strict';

const {
  isPlainObject,
} = require('./fact-schema-utils');
const {
  MILITARY_CONSTRAINT_REASON_CODES,
} = require('./military-constraint-reason-codes');
const {
  isLocatorBoundToSource,
  isNonEmptyString,
  buildSourceRegistryIndex,
  isReviewedClauseProvenance,
  normalizeReviewedClauseProvenance,
  sortRuleForBundle,
} = require('./reference-pack-utils');

const COMPILER_VERSION = '1.0.0';

const CANONICAL_TEMPLATE_BRANCH_MARK = Symbol('chatpdm.militaryConstraints.canonicalTemplateBranch');

const CANONICAL_TEMPLATE_BRANCHES = Object.freeze({
  LEGAL_FLOOR: Object.freeze({
    clauseType: 'PROHIBITION',
    branchId: 'LEGAL_FLOOR_PROHIBITION',
  }),
  POLICY_OVERLAY: Object.freeze({
    clauseType: 'AUTHORITY_GATE',
    branchId: 'POLICY_OVERLAY_AUTHORITY_GATE',
  }),
});

const SOURCE_ROLE_BY_LAYER = {
  LEGAL_FLOOR: new Set(['LEGAL_FLOOR']),
  POLICY_OVERLAY: new Set(['ROE_STRUCTURE', 'DOCTRINE_FRAME', 'EXAMPLE_ONLY']),
  ADMISSIBILITY: new Set(['LEGAL_FLOOR', 'ROE_STRUCTURE', 'DOCTRINE_FRAME']),
};

const RESOLVED_AMBIGUITY_STATUSES = new Set([
  'CLEAR',
  'RESOLVED',
]);

const COMPILATION_REVIEW_STATUSES = new Set([
  'COMPILATION_READY',
  'APPROVED',
]);

const LEGAL_FLOOR_PROHIBITION_TEMPLATE = Object.freeze({
  stage: 'LEGAL_FLOOR',
  priority: 900,
  effect: {
    decision: 'REFUSED',
    reasonCode: 'PROHIBITED_TARGET',
  },
  scope: {
    domains: ['LAND', 'AIR', 'MARITIME'],
    missionTypes: ['ARMED_CONFLICT'],
    actionKinds: ['STRIKE', 'ENGAGE', 'FIRE'],
  },
  authority: {
    minimumLevelId: 'BATTALION',
    requiresExplicitDelegation: false,
    delegationEdgeIds: [],
  },
  requiredFacts: ['target.protectedClass', 'target.militaryObjectiveStatus'],
  predicate: {
    all: [
      {
        eq: [
          { fact: 'target.protectedClass' },
          { value: 'CIVILIAN' },
        ],
      },
      {
        neq: [
          { fact: 'target.militaryObjectiveStatus' },
          { value: 'CONFIRMED_TRUE' },
        ],
      },
    ],
  },
});

const POLICY_OVERLAY_AUTHORITY_GATE_TEMPLATE = Object.freeze({
  stage: 'POLICY_OVERLAY',
  priority: 800,
  effect: {
    decision: 'REFUSED',
    reasonCode: 'AUTHORITY_INVALID',
  },
  scope: {
    domains: ['AIR'],
    missionTypes: ['ARMED_CONFLICT'],
    actionKinds: ['STRIKE'],
  },
  authority: {
    minimumLevelId: 'BRIGADE',
    requiresExplicitDelegation: true,
    delegationEdgeIds: ['DEL-THEATER-BRIGADE-SELF-DEFENSE'],
  },
  requiredFacts: ['actor.authorityLevelId', 'action.kind'],
  predicate: {
    neq: [
      { fact: 'actor.authorityLevelId' },
      { value: 'BRIGADE' },
    ],
  },
});

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function markCanonicalTemplateBranch(rule, branchId) {
  if (!isPlainObject(rule) || typeof branchId !== 'string' || branchId.length === 0) {
    return rule;
  }

  Object.defineProperty(rule, CANONICAL_TEMPLATE_BRANCH_MARK, {
    configurable: false,
    enumerable: false,
    value: branchId,
    writable: false,
  });

  return rule;
}

function getCanonicalTemplateBranch(rule) {
  if (!isPlainObject(rule)) {
    return null;
  }

  return typeof rule[CANONICAL_TEMPLATE_BRANCH_MARK] === 'string'
    ? rule[CANONICAL_TEMPLATE_BRANCH_MARK]
    : null;
}

function validateClauseProvenance(clause, result) {
  if (!isReviewedClauseProvenance(clause.provenance)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `clause ${clause.clauseId} must include explicit provenance metadata.`);
    return null;
  }

  const provenance = clause.provenance;

  if (clause.layer === 'EXAMPLE_ONLY' && provenance.derivationType !== 'ILLUSTRATIVE') {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `example-only clause ${clause.clauseId} must be marked ILLUSTRATIVE.`);
    return null;
  }

  if (provenance.derivationType === 'DIRECT' && clause.rawText !== clause.normalizedText) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `direct provenance for clause ${clause.clauseId} must preserve source text exactly.`);
    return null;
  }

  if (provenance.derivationType === 'INTERPRETED' && clause.rawText === clause.normalizedText) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `interpreted provenance for clause ${clause.clauseId} requires a normalized transformation.`);
    return null;
  }

  if (provenance.derivationType === 'COMPOSED') {
    if (!Array.isArray(provenance.parentClauseIds) || provenance.parentClauseIds.length === 0) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `composed clause ${clause.clauseId} requires parentClauseIds.`);
      return null;
    }
  } else if (Array.isArray(provenance.parentClauseIds) && provenance.parentClauseIds.length > 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `clause ${clause.clauseId} may only declare parentClauseIds when provenance is COMPOSED.`);
    return null;
  }

  if (provenance.derivationType === 'ILLUSTRATIVE') {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `illustrative clause ${clause.clauseId} cannot compile into executable output.`);
    return null;
  }

  return normalizeReviewedClauseProvenance(provenance);
}

function makeResult() {
  return {
    valid: true,
    reasonCode: null,
    errors: [],
    compiledRule: null,
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
    compiledRule: result.compiledRule ? Object.freeze(result.compiledRule) : null,
  });
}

function isCompilableClause(clause) {
  return isPlainObject(clause)
    && typeof clause.clauseId === 'string'
    && clause.clauseId.length > 0
    && typeof clause.sourceId === 'string'
    && clause.sourceId.length > 0
    && typeof clause.locator === 'string'
    && clause.locator.length > 0
    && typeof clause.jurisdiction === 'string'
    && clause.jurisdiction.length > 0
    && typeof clause.layer === 'string'
    && typeof clause.clauseType === 'string'
    && typeof clause.rawText === 'string'
    && typeof clause.normalizedText === 'string'
    && typeof clause.machineCandidate === 'boolean'
    && typeof clause.ambiguityStatus === 'string'
    && typeof clause.reviewStatus === 'string'
    && typeof clause.reviewNotes === 'string';
}


function buildNotes(clause, sourceEntry, compilerVersion) {
  return [
    `compiledFromClauseId=${clause.clauseId}`,
    `sourceId=${sourceEntry.sourceId}`,
    `locator=${clause.locator}`,
    `compilerVersion=${compilerVersion}`,
  ].join('; ');
}

function buildLegalFloorRule(clause, sourceEntry, compilerVersion, provenance) {
  // Canonical template branch: this clause family compiles to a fixed
  // executable rule shape. Clause text is retained for audit, not used as
  // free-form semantic input for the predicate shape.
  const minimumLevelId = clause.jurisdiction === 'INTL'
    ? 'UNIT'
    : LEGAL_FLOOR_PROHIBITION_TEMPLATE.authority.minimumLevelId;

  const rule = {
    ruleId: `CR-${clause.clauseId}`,
    version: 1,
    stage: LEGAL_FLOOR_PROHIBITION_TEMPLATE.stage,
    priority: LEGAL_FLOOR_PROHIBITION_TEMPLATE.priority,
    status: 'ACTIVE',
    effect: cloneJson(LEGAL_FLOOR_PROHIBITION_TEMPLATE.effect),
    scope: {
      jurisdiction: clause.jurisdiction,
      domains: [...LEGAL_FLOOR_PROHIBITION_TEMPLATE.scope.domains],
      missionTypes: [...LEGAL_FLOOR_PROHIBITION_TEMPLATE.scope.missionTypes],
      actionKinds: [...LEGAL_FLOOR_PROHIBITION_TEMPLATE.scope.actionKinds],
    },
    authority: {
      ...cloneJson(LEGAL_FLOOR_PROHIBITION_TEMPLATE.authority),
      minimumLevelId,
    },
    requiredFacts: [...LEGAL_FLOOR_PROHIBITION_TEMPLATE.requiredFacts],
    predicate: cloneJson(LEGAL_FLOOR_PROHIBITION_TEMPLATE.predicate),
    sourceRefs: [
      {
        sourceId: sourceEntry.sourceId,
        locator: clause.locator,
      },
    ],
    provenance,
    notes: buildNotes(clause, sourceEntry, compilerVersion),
  };

  return markCanonicalTemplateBranch(sortRuleForBundle(rule), CANONICAL_TEMPLATE_BRANCHES.LEGAL_FLOOR.branchId);
}

function buildPolicyOverlayRule(clause, sourceEntry, compilerVersion, provenance) {
  // Canonical template branch: this clause family compiles to a fixed
  // executable rule shape. Clause text is retained for audit, not used as
  // free-form semantic input for the predicate shape.
  const rule = {
    ruleId: `CR-${clause.clauseId}`,
    version: 1,
    stage: POLICY_OVERLAY_AUTHORITY_GATE_TEMPLATE.stage,
    priority: POLICY_OVERLAY_AUTHORITY_GATE_TEMPLATE.priority,
    status: 'ACTIVE',
    effect: cloneJson(POLICY_OVERLAY_AUTHORITY_GATE_TEMPLATE.effect),
    scope: {
      jurisdiction: clause.jurisdiction,
      domains: [...POLICY_OVERLAY_AUTHORITY_GATE_TEMPLATE.scope.domains],
      missionTypes: [...POLICY_OVERLAY_AUTHORITY_GATE_TEMPLATE.scope.missionTypes],
      actionKinds: [...POLICY_OVERLAY_AUTHORITY_GATE_TEMPLATE.scope.actionKinds],
    },
    authority: cloneJson(POLICY_OVERLAY_AUTHORITY_GATE_TEMPLATE.authority),
    requiredFacts: [...POLICY_OVERLAY_AUTHORITY_GATE_TEMPLATE.requiredFacts],
    predicate: cloneJson(POLICY_OVERLAY_AUTHORITY_GATE_TEMPLATE.predicate),
    sourceRefs: [
      {
        sourceId: sourceEntry.sourceId,
        locator: clause.locator,
      },
    ],
    provenance,
    notes: buildNotes(clause, sourceEntry, compilerVersion),
  };

  return markCanonicalTemplateBranch(sortRuleForBundle(rule), CANONICAL_TEMPLATE_BRANCHES.POLICY_OVERLAY.branchId);
}

function compileCanonicalTemplateBranch(clause, sourceEntry, compilerVersion, provenance, result) {
  const contract = CANONICAL_TEMPLATE_BRANCHES[clause.layer];
  if (!isPlainObject(contract)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `unsupported canonical template branch for layer "${clause.layer}".`);
    return null;
  }

  if (clause.clauseType !== contract.clauseType) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `${clause.layer.toLowerCase().replace('_', '-')} canonical template branch only compiles ${contract.clauseType} clauses in this bridge.`);
    return null;
  }

  if (clause.layer === 'LEGAL_FLOOR') {
    return buildLegalFloorRule(clause, sourceEntry, compilerVersion, provenance);
  }

  if (clause.layer === 'POLICY_OVERLAY') {
    return buildPolicyOverlayRule(clause, sourceEntry, compilerVersion, provenance);
  }

  fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `unsupported canonical template branch for layer "${clause.layer}".`);
  return null;
}

function buildRequirementRule(clause, sourceEntry, compilerVersion, provenance, result) {
  const hint = isPlainObject(clause.compilationHint) ? clause.compilationHint : null;

  if (!isPlainObject(hint)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `requirement clause ${clause.clauseId} requires a compilationHint.`);
    return null;
  }

  if (typeof hint.stage !== 'string' || hint.stage.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `requirement clause ${clause.clauseId} requires a stage in the compilationHint.`);
    return null;
  }

  if (!Number.isInteger(hint.priority)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `requirement clause ${clause.clauseId} requires an integer priority in the compilationHint.`);
    return null;
  }

  if (!isPlainObject(hint.effect) || typeof hint.effect.decision !== 'string' || typeof hint.effect.reasonCode !== 'string') {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `requirement clause ${clause.clauseId} requires an effect object in the compilationHint.`);
    return null;
  }

  if (!isPlainObject(hint.scope) || !isPlainObject(hint.authority)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `requirement clause ${clause.clauseId} requires scope and authority objects in the compilationHint.`);
    return null;
  }

  if (hint.stage === 'POLICY_OVERLAY' && clause.layer === 'LEGAL_FLOOR') {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.ILLEGAL_OVERLAY, `legal-floor requirement clause ${clause.clauseId} cannot compile to POLICY_OVERLAY.`);
    return null;
  }

  if (hint.stage === 'LEGAL_FLOOR' && clause.layer === 'POLICY_OVERLAY') {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.ILLEGAL_OVERLAY, `policy-overlay requirement clause ${clause.clauseId} cannot compile to LEGAL_FLOOR.`);
    return null;
  }

  if (!Array.isArray(hint.requiredFacts) || hint.requiredFacts.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `requirement clause ${clause.clauseId} requires non-empty requiredFacts in the compilationHint.`);
    return null;
  }

  if (!isPlainObject(hint.predicate)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `requirement clause ${clause.clauseId} requires a predicate in the compilationHint.`);
    return null;
  }

  const requiresExplicitDelegation = Boolean(hint.authority && hint.authority.requiresExplicitDelegation);
  const delegationEdgeIds = Array.isArray(hint.authority && hint.authority.delegationEdgeIds)
    ? [...hint.authority.delegationEdgeIds]
    : [];

  if (requiresExplicitDelegation && delegationEdgeIds.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.AUTHORITY_UNRESOLVED, `requirement clause ${clause.clauseId} requires an explicit delegation path.`);
    return null;
  }

  const rule = {
    ruleId: `CR-${clause.clauseId}`,
    version: 1,
    stage: hint.stage,
    priority: hint.priority,
    status: 'ACTIVE',
    effect: cloneJson(hint.effect),
    scope: {
      jurisdiction: clause.jurisdiction,
      domains: Array.isArray(hint.scope && hint.scope.domains) ? [...hint.scope.domains] : [],
      missionTypes: Array.isArray(hint.scope && hint.scope.missionTypes) ? [...hint.scope.missionTypes] : [],
      actionKinds: Array.isArray(hint.scope && hint.scope.actionKinds) ? [...hint.scope.actionKinds] : [],
    },
    authority: {
      minimumLevelId: hint.authority && typeof hint.authority.minimumLevelId === 'string' ? hint.authority.minimumLevelId : 'PLATOON',
      requiresExplicitDelegation,
      delegationEdgeIds,
    },
    requiredFacts: [...hint.requiredFacts],
    predicate: cloneJson(hint.predicate),
    sourceRefs: [
      {
        sourceId: sourceEntry.sourceId,
        locator: clause.locator,
      },
    ],
    provenance,
    notes: buildNotes(clause, sourceEntry, compilerVersion),
  };

  return sortRuleForBundle(rule);
}

/**
 * Compile a reviewed source clause into a deterministic compiled rule.
 *
 * @param {{ clause: object, sourceRegistry: Array<object>, compilerVersion?: string }} input
 * @returns {{ valid: boolean, reasonCode: string|null, errors: string[], compiledRule: object|null }}
 */
function compileClauseToRule(input) {
  const result = makeResult();
  const clause = isPlainObject(input) ? input.clause : null;
  const sourceRegistry = isPlainObject(input) && Array.isArray(input.sourceRegistry) ? input.sourceRegistry : [];
  const compilerVersion = isPlainObject(input) && typeof input.compilerVersion === 'string' && input.compilerVersion.length > 0
    ? input.compilerVersion
    : COMPILER_VERSION;

  if (!isCompilableClause(clause)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, 'clause must be a reviewed clause artifact.');
    return finish(result);
  }

  const sourceRegistryIndex = buildSourceRegistryIndex(sourceRegistry);
  if (!sourceRegistryIndex.valid) {
    fail(
      result,
      sourceRegistryIndex.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID,
      sourceRegistryIndex.errors[0] || 'source registry validation failed.',
    );
    sourceRegistryIndex.errors.slice(1).forEach((message) => {
      result.errors.push(message);
    });
    return finish(result);
  }

  const sourceIndex = sourceRegistryIndex.sourceIndex;
  const sourceEntry = sourceIndex.get(clause.sourceId);

  if (!isPlainObject(sourceEntry)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `sourceId "${clause.sourceId}" is not registered.`);
    return finish(result);
  }

  if (sourceEntry.jurisdiction !== clause.jurisdiction) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.SCOPE_VIOLATION, `clause ${clause.clauseId} jurisdiction must match registered source jurisdiction.`);
    return finish(result);
  }

  if (!isNonEmptyString(sourceEntry.locator)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `sourceId "${sourceEntry.sourceId}" is missing a locator.`);
    return finish(result);
  }

  if (!isLocatorBoundToSource(sourceEntry.locator, clause.locator)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `clause ${clause.clauseId} locator "${clause.locator}" is not bound to source locator anchor "${sourceEntry.locator}".`);
    return finish(result);
  }

  const provenance = validateClauseProvenance(clause, result);
  if (!result.valid) {
    return finish(result);
  }

  if (clause.machineCandidate !== true) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `clause ${clause.clauseId} is not marked machineCandidate.`);
  }

  if (!RESOLVED_AMBIGUITY_STATUSES.has(clause.ambiguityStatus)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `clause ${clause.clauseId} must have CLEAR or RESOLVED ambiguity status.`);
  }

  if (!COMPILATION_REVIEW_STATUSES.has(clause.reviewStatus)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `clause ${clause.clauseId} must be COMPILATION_READY or APPROVED.`);
  }

  if (clause.layer === 'EXAMPLE_ONLY') {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `clause ${clause.clauseId} cannot compile from EXAMPLE_ONLY layer.`);
  }

  if (sourceEntry.exampleOnly === true && sourceEntry.normativeOverride !== true) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `sourceId "${sourceEntry.sourceId}" is example-only without an explicit normative override.`);
  }

  const allowedLayers = SOURCE_ROLE_BY_LAYER[clause.layer];
  if (!(allowedLayers instanceof Set) || !allowedLayers.has(sourceEntry.role)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.ILLEGAL_OVERLAY, `source role "${sourceEntry.role}" cannot compile clause layer "${clause.layer}".`);
  }

  if (!result.valid) {
    return finish(result);
  }

  if (clause.layer === 'LEGAL_FLOOR') {
    if (clause.clauseType === 'REQUIREMENT') {
      result.compiledRule = buildRequirementRule(clause, sourceEntry, compilerVersion, provenance, result);
      return finish(result);
    }

    if (clause.clauseType !== 'PROHIBITION') {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `legal-floor clauses only compile from PROHIBITION or REQUIREMENT clauses in this bridge.`);
      return finish(result);
    }

    result.compiledRule = compileCanonicalTemplateBranch(clause, sourceEntry, compilerVersion, provenance, result);
    return finish(result);
  }

  if (clause.layer === 'POLICY_OVERLAY') {
    if (clause.clauseType === 'REQUIREMENT') {
      result.compiledRule = buildRequirementRule(clause, sourceEntry, compilerVersion, provenance, result);
      return finish(result);
    }

    if (clause.clauseType !== 'AUTHORITY_GATE') {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `policy-overlay clauses only compile from REQUIREMENT or AUTHORITY_GATE clauses in this bridge.`);
      return finish(result);
    }

    result.compiledRule = compileCanonicalTemplateBranch(clause, sourceEntry, compilerVersion, provenance, result);
    return finish(result);
  }

  fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `unsupported clause layer "${clause.layer}".`);
  return finish(result);
}

module.exports = {
  COMPILER_VERSION,
  compileClauseToRule,
  getCanonicalTemplateBranch,
};
