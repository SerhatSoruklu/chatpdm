'use strict';

const {
  MILITARY_CONSTRAINT_REASON_CODES,
} = require('./military-constraint-reason-codes');
const {
  validateAuthorityReferences,
  validateContractPack,
} = require('./military-constraint-validator');
const { evaluateRule } = require('./evaluate-rule');
const {
  isPlainObject,
  validateFactPacket,
} = require('./fact-schema-utils');

function sortByEvaluationOrder(rules, stageOrder) {
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

function sortUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function bundleIdentityMatches(bundle, facts) {
  if (!isPlainObject(bundle) || !isPlainObject(facts)) {
    return false;
  }

  if (bundle.bundleId !== facts.bundleId) {
    return false;
  }

  if (bundle.bundleVersion !== facts.bundleVersion) {
    return false;
  }

  if (bundle.bundleHash !== facts.bundleHash) {
    return false;
  }

  return true;
}

function collectMissingBundleIdentity(bundle, facts) {
  const missing = [];

  if (!isPlainObject(facts)) {
    return ['bundleId', 'bundleVersion', 'bundleHash'];
  }

  if (bundle.bundleId !== facts.bundleId) {
    missing.push('bundleId');
  }

  if (bundle.bundleVersion !== facts.bundleVersion) {
    missing.push('bundleVersion');
  }

  if (bundle.bundleHash !== facts.bundleHash) {
    missing.push('bundleHash');
  }

  return sortUnique(missing);
}

/**
 * Evaluate a validated bundle against structured facts.
 *
 * @param {{ bundle: object, facts: object, factSchema: object }} input
 * @returns {{
 *   decision: string,
 *   reasonCode: string|null,
 *   failedStage: string|null,
 *   failingRuleIds: string[],
 *   missingFactIds: string[],
 *   authorityTrace: object,
 *   ruleTrace: Array<object>,
 *   bundleId: string|null,
 *   bundleVersion: string|null,
 *   bundleHash: string|null
 * }}
 */
function evaluateBundle(input) {
  const bundle = isPlainObject(input) ? input.bundle : null;
  const facts = isPlainObject(input) ? input.facts : null;
  const factSchema = isPlainObject(input) ? input.factSchema : null;
  const bundleId = bundle && typeof bundle.bundleId === 'string' ? bundle.bundleId : null;

  const emptyOutput = {
    decision: 'REFUSED',
    reasonCode: MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID,
    failedStage: 'BUNDLE_INTEGRITY',
    failingRuleIds: [],
    missingFactIds: [],
    authorityTrace: {
      valid: false,
      validation: null,
    },
    ruleTrace: [],
    bundleId,
    bundleVersion: bundle && typeof bundle.bundleVersion === 'string' ? bundle.bundleVersion : null,
    bundleHash: bundle && typeof bundle.bundleHash === 'string' ? bundle.bundleHash : null,
  };

  if (!isPlainObject(bundle) || !isPlainObject(facts) || !isPlainObject(factSchema)) {
    return emptyOutput;
  }

  const contractValidation = validateContractPack({
    bundle,
    rules: bundle.rules,
    authorityGraph: bundle.authorityGraph,
    factSchema,
  });

  const authorityValidation = validateAuthorityReferences({
    bundle,
    rules: bundle.rules,
    authorityGraph: bundle.authorityGraph,
  });

  const baseOutput = {
    decision: 'REFUSED',
    reasonCode: null,
    failedStage: null,
    failingRuleIds: [],
    missingFactIds: [],
    authorityTrace: {
      valid: authorityValidation.valid,
      reasonCode: authorityValidation.reasonCode,
      errors: authorityValidation.errors,
      authorityGraphId: bundle.authorityGraphId,
    },
    ruleTrace: [],
    bundleId,
    bundleVersion: typeof bundle.bundleVersion === 'string' ? bundle.bundleVersion : null,
    bundleHash: typeof bundle.bundleHash === 'string' ? bundle.bundleHash : null,
  };

  if (!contractValidation.valid) {
    return {
      ...baseOutput,
      reasonCode: contractValidation.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID,
      failedStage: 'BUNDLE_INTEGRITY',
    };
  }

  const factValidation = validateFactPacket(facts, factSchema);
  if (!factValidation.valid) {
    return {
      ...baseOutput,
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: factValidation.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.FACT_PACKET_INVALID,
      failedStage: 'ADMISSIBILITY',
      missingFactIds: [],
      failingRuleIds: [],
    };
  }

  if (!bundleIdentityMatches(bundle, facts)) {
    return {
      ...baseOutput,
      reasonCode: collectMissingBundleIdentity(bundle, facts).includes('bundleHash')
        ? MILITARY_CONSTRAINT_REASON_CODES.BUNDLE_HASH_MISMATCH
        : MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID,
      failedStage: 'BUNDLE_INTEGRITY',
      missingFactIds: collectMissingBundleIdentity(bundle, facts),
    };
  }

  const activeRules = Array.isArray(bundle.rules)
    ? bundle.rules.filter((rule) => isPlainObject(rule) && rule.status === 'ACTIVE')
    : [];
  const orderedRules = sortByEvaluationOrder(activeRules, Array.isArray(bundle.precedencePolicy && bundle.precedencePolicy.stageOrder) ? bundle.precedencePolicy.stageOrder : []);
  const ruleTrace = [];
  const failingRuleIds = [];
  const missingFactIds = [];

  for (let index = 0; index < orderedRules.length; index += 1) {
    const rule = orderedRules[index];
    const outcome = evaluateRule({
      rule,
      facts,
      bundle,
      factSchema,
    });

    ruleTrace.push({
      ruleId: outcome.ruleId,
      stage: outcome.stage,
      priority: outcome.priority,
      outcome: outcome.outcome,
      matched: outcome.matched,
      missingFactIds: outcome.missingFactIds,
      usedFacts: outcome.usedFacts,
      sourceRefs: outcome.sourceRefs,
    });

    if (outcome.outcome === 'NOT_APPLICABLE' || outcome.outcome === 'NO_MATCH') {
      continue;
    }

    if (outcome.outcome === 'REFUSED_INCOMPLETE') {
      failingRuleIds.push(outcome.ruleId);
      missingFactIds.push(...outcome.missingFactIds);
      return {
        ...baseOutput,
        decision: 'REFUSED_INCOMPLETE',
        reasonCode: outcome.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.MISSING_REQUIRED_FACT,
        failedStage: outcome.stage,
        failingRuleIds: sortUnique(failingRuleIds.filter(Boolean)),
        missingFactIds: sortUnique(missingFactIds),
        ruleTrace,
      };
    }

    if (outcome.outcome === 'MATCHED_EFFECT') {
      if (!outcome.effect || typeof outcome.effect.decision !== 'string') {
        continue;
      }

      if (outcome.effect.decision === 'ALLOWED') {
        continue;
      }

      if (outcome.effect.decision === 'REFUSED_INCOMPLETE') {
        failingRuleIds.push(outcome.ruleId);
        return {
          ...baseOutput,
          decision: 'REFUSED_INCOMPLETE',
          reasonCode: outcome.effect.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.MISSING_REQUIRED_FACT,
          failedStage: outcome.stage,
          failingRuleIds: sortUnique(failingRuleIds.filter(Boolean)),
          missingFactIds: sortUnique(outcome.missingFactIds),
          ruleTrace,
        };
      }

      failingRuleIds.push(outcome.ruleId);
      return {
        ...baseOutput,
        decision: 'REFUSED',
        reasonCode: outcome.effect.reasonCode || MILITARY_CONSTRAINT_REASON_CODES.POLICY_BUNDLE_INVALID,
        failedStage: outcome.stage,
        failingRuleIds: sortUnique(failingRuleIds.filter(Boolean)),
        missingFactIds: sortUnique(missingFactIds),
        ruleTrace,
      };
    }
  }

  return {
    ...baseOutput,
    decision: 'ALLOWED',
    reasonCode: null,
    failedStage: null,
    failingRuleIds: [],
    missingFactIds: [],
    ruleTrace,
  };
}

module.exports = {
  evaluateBundle,
};
