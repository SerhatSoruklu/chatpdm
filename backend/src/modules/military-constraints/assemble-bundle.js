'use strict';

const {
  isPlainObject,
} = require('./fact-schema-utils');
const {
  MILITARY_CONSTRAINT_REASON_CODES,
} = require('./military-constraint-reason-codes');
const {
  computeBundleHash,
  validateContractPack,
} = require('./military-constraint-validator');

const SOURCE_ROLE_PRIORITY = {
  LEGAL_FLOOR: 0,
  ROE_STRUCTURE: 1,
  DOCTRINE_FRAME: 2,
  EXAMPLE_ONLY: 3,
  EXTRACTION_AID: 4,
};

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function sortStrings(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function makeResult() {
  return {
    valid: true,
    reasonCode: null,
    errors: [],
    bundle: null,
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
    bundle: result.bundle ? Object.freeze(result.bundle) : null,
  });
}

function sortByBundleOrder(rules, stageOrder) {
  const stageIndex = new Map(stageOrder.map((stage, index) => [stage, index]));

  return [...rules].sort((left, right) => {
    const leftStage = stageIndex.has(left.stage) ? stageIndex.get(left.stage) : Number.MAX_SAFE_INTEGER;
    const rightStage = stageIndex.has(right.stage) ? stageIndex.get(right.stage) : Number.MAX_SAFE_INTEGER;

    if (leftStage !== rightStage) {
      return leftStage - rightStage;
    }

    if (left.priority !== right.priority) {
      return right.priority - left.priority;
    }

    return String(left.ruleId).localeCompare(String(right.ruleId));
  });
}

function sortRuleForBundle(rule) {
  const clone = cloneJson(rule);

  if (isPlainObject(clone.scope)) {
    if (Array.isArray(clone.scope.actionKinds)) {
      clone.scope.actionKinds = sortStrings(clone.scope.actionKinds);
    }
    if (Array.isArray(clone.scope.domains)) {
      clone.scope.domains = sortStrings(clone.scope.domains);
    }
    if (Array.isArray(clone.scope.missionTypes)) {
      clone.scope.missionTypes = sortStrings(clone.scope.missionTypes);
    }
  }

  if (isPlainObject(clone.authority) && Array.isArray(clone.authority.delegationEdgeIds)) {
    clone.authority.delegationEdgeIds = sortStrings(clone.authority.delegationEdgeIds);
  }

  if (Array.isArray(clone.requiredFacts)) {
    clone.requiredFacts = sortStrings(clone.requiredFacts);
  }

  if (Array.isArray(clone.sourceRefs)) {
    clone.sourceRefs = [...clone.sourceRefs].sort((left, right) => {
      const leftSource = typeof left.sourceId === 'string' ? left.sourceId : '';
      const rightSource = typeof right.sourceId === 'string' ? right.sourceId : '';
      if (leftSource !== rightSource) {
        return leftSource.localeCompare(rightSource);
      }

      const leftLocator = typeof left.locator === 'string' ? left.locator : '';
      const rightLocator = typeof right.locator === 'string' ? right.locator : '';
      return leftLocator.localeCompare(rightLocator);
    });
  }

  return clone;
}

function sortAuthorityGraph(authorityGraph) {
  const clone = cloneJson(authorityGraph);

  if (Array.isArray(clone.levels)) {
    clone.levels = [...clone.levels].sort((left, right) => {
      const leftRank = Number.isInteger(left.rank) ? left.rank : -1;
      const rightRank = Number.isInteger(right.rank) ? right.rank : -1;
      if (leftRank !== rightRank) {
        return rightRank - leftRank;
      }

      return String(left.levelId).localeCompare(String(right.levelId));
    });
  }

  if (Array.isArray(clone.delegationEdges)) {
    clone.delegationEdges = [...clone.delegationEdges].sort((left, right) => {
      return String(left.edgeId).localeCompare(String(right.edgeId));
    });
  }

  return clone;
}

function buildSourceRegistrySnapshot(sourceRegistry, usedSourceIds, bundleJurisdiction) {
  const sourceIndex = new Map();

  sourceRegistry.forEach((entry) => {
    if (isPlainObject(entry) && typeof entry.sourceId === 'string' && entry.sourceId.length > 0) {
      sourceIndex.set(entry.sourceId, entry);
    }
  });

  const selected = [];

  usedSourceIds.forEach((sourceId) => {
    const entry = sourceIndex.get(sourceId);
    if (!isPlainObject(entry)) {
      selected.push({
        error: `sourceId "${sourceId}" is not present in the source registry.`,
        sourceId,
      });
      return;
    }

    if (entry.jurisdiction !== bundleJurisdiction) {
      selected.push({
        error: `sourceId "${sourceId}" has jurisdiction "${entry.jurisdiction}" and cannot enter a "${bundleJurisdiction}" bundle.`,
        sourceId,
      });
      return;
    }

    selected.push({
      sourceId: entry.sourceId,
      role: entry.role,
      sourceVersion: entry.sourceVersion,
      trustTier: entry.trustTier,
      locator: entry.locator,
      notes: entry.notes,
      _sourceRolePriority: Object.prototype.hasOwnProperty.call(SOURCE_ROLE_PRIORITY, entry.role)
        ? SOURCE_ROLE_PRIORITY[entry.role]
        : Number.MAX_SAFE_INTEGER,
    });
  });

  return selected.sort((left, right) => {
    const leftPriority = Number.isInteger(left._sourceRolePriority) ? left._sourceRolePriority : Number.MAX_SAFE_INTEGER;
    const rightPriority = Number.isInteger(right._sourceRolePriority) ? right._sourceRolePriority : Number.MAX_SAFE_INTEGER;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return String(left.sourceId).localeCompare(String(right.sourceId));
  });
}

function ruleSourceIds(rule) {
  if (!isPlainObject(rule) || !Array.isArray(rule.sourceRefs)) {
    return [];
  }

  return rule.sourceRefs
    .map((entry) => (isPlainObject(entry) && typeof entry.sourceId === 'string' ? entry.sourceId : null))
    .filter((value) => typeof value === 'string');
}

function validateSourcePriorityAndStage(rule, sourceIndex, bundleJurisdiction, result) {
  const sourceIds = ruleSourceIds(rule);

  if (sourceIds.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `rule ${rule.ruleId} must retain sourceRefs.`);
    return;
  }

  sourceIds.forEach((sourceId) => {
    const entry = sourceIndex.get(sourceId);
    if (!isPlainObject(entry)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `rule ${rule.ruleId} references unknown sourceId "${sourceId}".`);
      return;
    }

    if (entry.jurisdiction !== bundleJurisdiction) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.SCOPE_VIOLATION, `rule ${rule.ruleId} source jurisdiction "${entry.jurisdiction}" does not match bundle jurisdiction "${bundleJurisdiction}".`);
      return;
    }

    if (entry.exampleOnly === true && entry.normativeOverride !== true) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.ILLEGAL_OVERLAY, `rule ${rule.ruleId} cannot use example-only source "${sourceId}" without normative override.`);
      return;
    }

    if (rule.stage === 'LEGAL_FLOOR' && entry.role !== 'LEGAL_FLOOR') {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.ILLEGAL_OVERLAY, `rule ${rule.ruleId} stage LEGAL_FLOOR must come from a LEGAL_FLOOR source.`);
      return;
    }

    if (rule.stage === 'POLICY_OVERLAY' && entry.role === 'LEGAL_FLOOR') {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.ILLEGAL_OVERLAY, `rule ${rule.ruleId} stage POLICY_OVERLAY cannot be sourced from LEGAL_FLOOR material.`);
      return;
    }
  });
}

/**
 * Assemble a validated bundle from compiled rules.
 *
 * @param {{
 *   bundleDraft: object,
 *   compiledRules: Array<object>,
 *   authorityGraph: object,
 *   sourceRegistry: Array<object>,
 *   factSchema: object
 * }} input
 * @returns {{ valid: boolean, reasonCode: string|null, errors: string[], bundle: object|null }}
 */
function assembleBundle(input) {
  const result = makeResult();
  const bundleDraft = isPlainObject(input) ? input.bundleDraft : null;
  const compiledRules = isPlainObject(input) && Array.isArray(input.compiledRules) ? input.compiledRules : [];
  const authorityGraph = isPlainObject(input) ? input.authorityGraph : null;
  const sourceRegistry = isPlainObject(input) && Array.isArray(input.sourceRegistry) ? input.sourceRegistry : [];
  const factSchema = isPlainObject(input) ? input.factSchema : null;

  if (!isPlainObject(bundleDraft)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundleDraft must be a plain object.');
    return finish(result);
  }

  if (!isPlainObject(authorityGraph) || !isPlainObject(factSchema)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'authorityGraph and factSchema must be plain objects.');
    return finish(result);
  }

  if (!Array.isArray(compiledRules) || compiledRules.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'compiledRules must be a non-empty array.');
    return finish(result);
  }

  if (!Array.isArray(sourceRegistry) || sourceRegistry.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'sourceRegistry must be a non-empty array.');
    return finish(result);
  }

  if (Array.isArray(bundleDraft.rules) && bundleDraft.rules.length > 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundleDraft.rules must be omitted or empty.');
    return finish(result);
  }

  if (typeof bundleDraft.bundleId !== 'string' || bundleDraft.bundleId.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundleDraft.bundleId is required.');
  }

  if (typeof bundleDraft.bundleVersion !== 'string' || bundleDraft.bundleVersion.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundleDraft.bundleVersion is required.');
  }

  if (typeof bundleDraft.jurisdiction !== 'string' || bundleDraft.jurisdiction.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundleDraft.jurisdiction is required.');
  }

  if (typeof bundleDraft.authorityOwner !== 'string' || bundleDraft.authorityOwner.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundleDraft.authorityOwner is required.');
  }

  if (!isPlainObject(bundleDraft.precedencePolicy)) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundleDraft.precedencePolicy is required.');
  }

  if (typeof bundleDraft.factSchemaVersion !== 'string' || bundleDraft.factSchemaVersion.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundleDraft.factSchemaVersion is required.');
  }

  if (typeof bundleDraft.authorityGraphId !== 'string' || bundleDraft.authorityGraphId.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundleDraft.authorityGraphId is required.');
  }

  if (typeof bundleDraft.status !== 'string' || bundleDraft.status.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundleDraft.status is required.');
  }

  if (typeof bundleDraft.compiledAt !== 'string' || bundleDraft.compiledAt.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundleDraft.compiledAt is required.');
  }

  if (!result.valid) {
    return finish(result);
  }

  const sourceIndex = new Map();
  sourceRegistry.forEach((entry) => {
    if (isPlainObject(entry) && typeof entry.sourceId === 'string' && entry.sourceId.length > 0) {
      sourceIndex.set(entry.sourceId, entry);
    }
  });

  compiledRules.forEach((rule) => {
    if (!isPlainObject(rule)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, 'compiledRules must contain plain rule objects.');
      return;
    }

    validateSourcePriorityAndStage(rule, sourceIndex, bundleDraft.jurisdiction, result);
  });

  if (!result.valid) {
    return finish(result);
  }

  const usedSourceIds = [];
  compiledRules.forEach((rule) => {
    ruleSourceIds(rule).forEach((sourceId) => usedSourceIds.push(sourceId));
  });

  const sourceRegistrySnapshot = buildSourceRegistrySnapshot(sourceRegistry, sortStrings(usedSourceIds), bundleDraft.jurisdiction);
  const registryErrors = sourceRegistrySnapshot.filter((entry) => typeof entry.error === 'string');
  if (registryErrors.length > 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, registryErrors[0].error);
    return finish(result);
  }

  const canonicalRules = sortByBundleOrder(
    compiledRules.map(sortRuleForBundle),
    Array.isArray(bundleDraft.precedencePolicy.stageOrder) ? bundleDraft.precedencePolicy.stageOrder : [],
  );
  const canonicalAuthorityGraph = sortAuthorityGraph(authorityGraph);

  const bundle = {
    bundleId: bundleDraft.bundleId,
    bundleVersion: bundleDraft.bundleVersion,
    status: bundleDraft.status,
    jurisdiction: bundleDraft.jurisdiction,
    authorityOwner: bundleDraft.authorityOwner,
    precedencePolicy: cloneJson(bundleDraft.precedencePolicy),
    factSchemaVersion: bundleDraft.factSchemaVersion,
    authorityGraphId: bundleDraft.authorityGraphId,
    authorityGraph: canonicalAuthorityGraph,
    sourceRegistrySnapshot: sourceRegistrySnapshot.map((entry) => ({
      sourceId: entry.sourceId,
      role: entry.role,
      sourceVersion: entry.sourceVersion,
      trustTier: entry.trustTier,
      locator: entry.locator,
      notes: entry.notes,
    })),
    rules: canonicalRules,
    compiledAt: bundleDraft.compiledAt,
  };

  bundle.bundleHash = computeBundleHash(bundle);

  const validation = validateContractPack({
    bundle,
    rules: bundle.rules,
    authorityGraph: bundle.authorityGraph,
    factSchema,
  });

  if (!validation.valid) {
    fail(result, validation.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, validation.errors[0] || 'bundle validation failed.');
    validation.errors.slice(1).forEach((message) => {
      result.errors.push(message);
    });
    return finish(result);
  }

  result.bundle = bundle;
  return finish(result);
}

module.exports = {
  assembleBundle,
};
