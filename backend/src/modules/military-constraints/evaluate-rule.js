'use strict';

const { evaluatePredicate } = require('./evaluate-predicate');
const { isPlainObject, resolveFactPath } = require('./fact-schema-utils');

function sortUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function getScopeFieldValues(scope, key) {
  if (!isPlainObject(scope) || !Array.isArray(scope[key])) {
    return [];
  }
  return scope[key];
}

function matchesScope(rule, bundle, facts) {
  if (!isPlainObject(rule) || !isPlainObject(bundle) || !isPlainObject(facts)) {
    return false;
  }

  const scope = isPlainObject(rule.scope) ? rule.scope : {};

  if (typeof scope.jurisdiction === 'string' && scope.jurisdiction.length > 0 && scope.jurisdiction !== bundle.jurisdiction) {
    return false;
  }

  const actionKind = facts.action && facts.action.kind;
  if (typeof actionKind === 'string' && getScopeFieldValues(scope, 'actionKinds').length > 0 && !getScopeFieldValues(scope, 'actionKinds').includes(actionKind)) {
    return false;
  }

  const domain = facts.action && facts.action.domain;
  if (typeof domain === 'string' && getScopeFieldValues(scope, 'domains').length > 0 && !getScopeFieldValues(scope, 'domains').includes(domain)) {
    return false;
  }

  const missionType = facts.context && facts.context.missionType;
  if (typeof missionType === 'string' && getScopeFieldValues(scope, 'missionTypes').length > 0 && !getScopeFieldValues(scope, 'missionTypes').includes(missionType)) {
    return false;
  }

  return true;
}

function requiredFactPresence(facts, requiredFacts) {
  const missing = [];

  if (!Array.isArray(requiredFacts)) {
    return missing;
  }

  requiredFacts.forEach((factPath) => {
    const resolved = resolveFactPath(facts, factPath);
    if (!resolved.present) {
      missing.push(factPath);
    }
  });

  return sortUnique(missing);
}

function collectPredicateMissingFacts(predicateErrors) {
  const missing = [];

  predicateErrors.forEach((entry) => {
    if (entry && entry.code === 'MISSING_FACT' && entry.details && typeof entry.details.factPath === 'string') {
      missing.push(entry.details.factPath);
    }
  });

  return sortUnique(missing);
}

/**
 * Evaluate a single rule against structured facts.
 *
 * @param {{ rule: object, facts: object, bundle: object, factSchema: object }} input
 * @returns {{ outcome: string, ruleId: string|null, stage: string|null, priority: number|null, matched: boolean, missingFactIds: string[], usedFacts: string[], effect: object|null, reasonCode: string|null }}
 */
function evaluateRule(input) {
  const rule = isPlainObject(input) ? input.rule : null;
  const facts = isPlainObject(input) ? input.facts : null;
  const bundle = isPlainObject(input) ? input.bundle : null;
  const factSchema = isPlainObject(input) ? input.factSchema : null;

  const ruleId = rule && typeof rule.ruleId === 'string' ? rule.ruleId : null;
  const stage = rule && typeof rule.stage === 'string' ? rule.stage : null;
  const priority = rule && Number.isInteger(rule.priority) ? rule.priority : null;

  if (!isPlainObject(rule) || !isPlainObject(facts) || !isPlainObject(bundle)) {
    return {
      outcome: 'NOT_APPLICABLE',
      ruleId,
      stage,
      priority,
      matched: false,
      missingFactIds: [],
      usedFacts: [],
      effect: null,
      reasonCode: null,
    };
  }

  if (!matchesScope(rule, bundle, facts)) {
    return {
      outcome: 'NOT_APPLICABLE',
      ruleId,
      stage,
      priority,
      matched: false,
      missingFactIds: [],
      usedFacts: [],
      effect: null,
      reasonCode: null,
    };
  }

  const missingFactIds = requiredFactPresence(facts, Array.isArray(rule.requiredFacts) ? rule.requiredFacts : []);
  if (missingFactIds.length > 0) {
    return {
      outcome: 'REFUSED_INCOMPLETE',
      ruleId,
      stage,
      priority,
      matched: false,
      missingFactIds,
      usedFacts: [],
      effect: cloneJson(rule.effect),
      reasonCode: 'MISSING_REQUIRED_FACT',
    };
  }

  const predicateResult = evaluatePredicate({
    predicate: rule.predicate,
    facts,
    factSchema,
  });

  const usedFacts = sortUnique(predicateResult.usedFacts || []);
  const predicateMissing = collectPredicateMissingFacts(predicateResult.errors || []);
  const allMissing = sortUnique([...missingFactIds, ...predicateMissing]);

  if ((predicateResult.errors || []).length > 0) {
    return {
      outcome: 'REFUSED_INCOMPLETE',
      ruleId,
      stage,
      priority,
      matched: false,
      missingFactIds: allMissing,
      usedFacts,
      effect: cloneJson(rule.effect),
      reasonCode: 'MISSING_REQUIRED_FACT',
    };
  }

  if (!predicateResult.ok) {
    return {
      outcome: 'NO_MATCH',
      ruleId,
      stage,
      priority,
      matched: false,
      missingFactIds: [],
      usedFacts,
      effect: null,
      reasonCode: null,
    };
  }

  return {
    outcome: 'MATCHED_EFFECT',
    ruleId,
    stage,
    priority,
    matched: true,
    missingFactIds: [],
    usedFacts,
    effect: cloneJson(rule.effect),
    reasonCode: rule.effect && typeof rule.effect.reasonCode === 'string' ? rule.effect.reasonCode : null,
  };
}

module.exports = {
  evaluateRule,
};
