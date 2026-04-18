'use strict';

const {
  isPlainObject,
} = require('./fact-schema-utils');
const {
  MILITARY_CONSTRAINT_REASON_CODES,
} = require('./military-constraint-reason-codes');
const {
  computeBundleHash,
  CANONICAL_STAGE_ORDER,
  validateContractPack,
} = require('./military-constraint-validator');
const {
  buildSourceRegistryIndex,
  isLocatorBoundToSource,
  isNonEmptyString,
  BUNDLE_CONTRACT_VERSION,
  validateBundleContractVersion,
  sortRuleForBundle,
} = require('./reference-pack-utils');
const { createPreparedBundle } = require('./prepared-bundle-contract');

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
    preparedBundle: null,
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
    preparedBundle: result.preparedBundle ? Object.freeze(result.preparedBundle) : null,
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

function buildSourceRegistrySnapshot(sourceIndex, usedSourceIds, bundleJurisdiction) {
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

    if (!isNonEmptyString(entry.sourceVersion) || !isNonEmptyString(entry.trustTier) || !isNonEmptyString(entry.locator)) {
      selected.push({
        error: `sourceId "${sourceId}" must retain sourceVersion, trustTier, and locator.`,
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

function ruleSourceRefs(rule) {
  if (!isPlainObject(rule) || !Array.isArray(rule.sourceRefs)) {
    return [];
  }

  return rule.sourceRefs.filter((entry) => isPlainObject(entry));
}

function ruleSourceIds(rule) {
  return ruleSourceRefs(rule)
    .map((entry) => (typeof entry.sourceId === 'string' ? entry.sourceId : null))
    .filter((value) => typeof value === 'string');
}

function validateSourcePriorityAndStage(rule, sourceIndex, bundleJurisdiction, result) {
  const sourceRefs = ruleSourceRefs(rule);

  if (sourceRefs.length === 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `rule ${rule.ruleId} must retain sourceRefs.`);
    return;
  }

  sourceRefs.forEach((sourceRef) => {
    if (!isNonEmptyString(sourceRef.sourceId) || !isNonEmptyString(sourceRef.locator)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.RULE_SHAPE_INVALID, `rule ${rule.ruleId} must retain sourceRefs with sourceId and locator.`);
      return;
    }

    const sourceId = sourceRef.sourceId;
    const entry = sourceIndex.get(sourceId);
    if (!isPlainObject(entry)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `rule ${rule.ruleId} references unknown sourceId "${sourceId}".`);
      return;
    }

    if (!isNonEmptyString(entry.locator)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `sourceId "${sourceId}" is missing a locator.`);
      return;
    }

    if (!isLocatorBoundToSource(entry.locator, sourceRef.locator)) {
      fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, `rule ${rule.ruleId} sourceRef locator "${sourceRef.locator}" is not bound to source locator anchor "${entry.locator}".`);
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

  const contractVersionValidation = validateBundleContractVersion(bundleDraft);
  if (!contractVersionValidation.valid) {
    fail(
      result,
      contractVersionValidation.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID,
      contractVersionValidation.errors[0] || 'bundleDraft contract version validation failed.',
    );
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

  const sourceRegistrySnapshot = buildSourceRegistrySnapshot(sourceIndex, sortStrings(usedSourceIds), bundleDraft.jurisdiction);
  const registryErrors = sourceRegistrySnapshot.filter((entry) => typeof entry.error === 'string');
  if (registryErrors.length > 0) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, registryErrors[0].error);
    return finish(result);
  }

  const canonicalRules = sortByBundleOrder(
    compiledRules.map(sortRuleForBundle),
    CANONICAL_STAGE_ORDER,
  );
  const canonicalAuthorityGraph = sortAuthorityGraph(authorityGraph);

  const bundle = {
    bundleId: bundleDraft.bundleId,
    bundleVersion: bundleDraft.bundleVersion,
    contractVersion: contractVersionValidation.contractVersion || BUNDLE_CONTRACT_VERSION,
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

  const preparedBundle = createPreparedBundle(bundle);
  if (!preparedBundle) {
    fail(result, MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID, 'bundle preparation failed.');
    return finish(result);
  }

  result.bundle = bundle;
  result.preparedBundle = preparedBundle;
  return finish(result);
}

module.exports = {
  assembleBundle,
};
