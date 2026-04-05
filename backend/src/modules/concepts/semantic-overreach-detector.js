'use strict';

const BRIDGE_CUE_TERMS = Object.freeze([
  'therefore',
  'thus',
  'hence',
  'implies',
  'imply',
  'means',
  'thereby',
  'proves',
  'proven',
]);

const UNSUPPORTED_SEMANTIC_BRIDGE_RULES = Object.freeze([
  Object.freeze({
    reason: 'microtubules_to_consciousness',
    allOf: Object.freeze(['microtubules', 'consciousness']),
    anyOf: BRIDGE_CUE_TERMS,
  }),
  Object.freeze({
    reason: 'microtubules_to_cosmic_consciousness',
    allOf: Object.freeze(['microtubules', 'consciousness', 'cosmic']),
    anyOf: BRIDGE_CUE_TERMS,
  }),
  Object.freeze({
    reason: 'quantum_biology_to_consciousness',
    allOf: Object.freeze(['quantum', 'biology', 'consciousness']),
    anyOf: BRIDGE_CUE_TERMS,
  }),
  Object.freeze({
    reason: 'quantum_biology_to_quantum_computer',
    allOf: Object.freeze(['quantum biology', 'brain', 'quantum computer']),
    anyOf: BRIDGE_CUE_TERMS,
  }),
  Object.freeze({
    reason: 'measurement_problem_to_observer_created_reality',
    allOf: Object.freeze(['measurement_problem', 'observer_created_reality']),
    anyOf: BRIDGE_CUE_TERMS,
  }),
  Object.freeze({
    reason: 'measurement_problem_to_cosmic_consciousness',
    allOf: Object.freeze(['measurement_problem', 'cosmic_consciousness']),
    anyOf: BRIDGE_CUE_TERMS,
  }),
]);

const CAUSAL_OVERREACH_RULES = Object.freeze([
  Object.freeze({
    reason: 'correlation_to_causation',
    allOf: Object.freeze(['correlates_with']),
    anyOf: Object.freeze(['causes', 'cause', 'caused by', 'produces', 'generate', 'generates', 'creates', 'drives']),
  }),
  Object.freeze({
    reason: 'association_to_causation',
    allOf: Object.freeze(['associated_with']),
    anyOf: Object.freeze(['causes', 'cause', 'caused by', 'produces', 'generate', 'generates', 'creates', 'drives']),
  }),
  Object.freeze({
    reason: 'correlation_to_causation',
    allOf: Object.freeze(['correlation']),
    anyOf: Object.freeze(['causes', 'cause', 'caused by', 'produces', 'generate', 'generates', 'creates', 'drives']),
  }),
  Object.freeze({
    reason: 'suggestion_to_necessity',
    allOf: Object.freeze(['suggests']),
    anyOf: Object.freeze(['necessary_and_sufficient', 'must_be', 'proves', 'guarantees']),
  }),
  Object.freeze({
    reason: 'indication_to_necessity',
    allOf: Object.freeze(['indicates']),
    anyOf: Object.freeze(['necessary_and_sufficient', 'must_be', 'proves', 'guarantees']),
  }),
  Object.freeze({
    reason: 'implies_to_necessity',
    allOf: Object.freeze(['implies']),
    anyOf: Object.freeze(['necessary_and_sufficient', 'must_be', 'proves', 'guarantees']),
  }),
  Object.freeze({
    reason: 'process_to_consciousness',
    allOf: Object.freeze(['process', 'consciousness']),
    anyOf: Object.freeze(['proves', 'generate', 'generates', 'produces', 'creates', 'causes', 'must_create', 'must_be', 'must_generate', 'must_produce', 'must_cause']),
  }),
  Object.freeze({
    reason: 'microtubules_to_consciousness_via_must_create',
    allOf: Object.freeze(['microtubules', 'consciousness']),
    anyOf: Object.freeze(['must_create', 'must_be', 'must_generate', 'must_produce', 'must_cause', 'creates', 'create', 'generates', 'generate', 'causes', 'cause', 'proves']),
  }),
  Object.freeze({
    reason: 'coherence_to_awareness',
    allOf: Object.freeze(['coherence', 'awareness']),
    anyOf: Object.freeze(['means', 'imply', 'implies', 'generate', 'generates', 'creates', 'create', 'causes', 'cause', 'proves']),
  }),
]);

function isAsciiLowerAlphaNumericCode(code) {
  return (code >= 48 && code <= 57) || (code >= 97 && code <= 122);
}

function normalizeSemanticOverreachText(text) {
  if (typeof text !== 'string') {
    return '';
  }

  const trimmed = text.trim().toLowerCase();
  const normalized = [];

  for (let index = 0; index < trimmed.length; index += 1) {
    const charCode = trimmed.charCodeAt(index);

    if (isAsciiLowerAlphaNumericCode(charCode)) {
      normalized.push(trimmed[index]);
      continue;
    }

    if (normalized.length > 0 && normalized[normalized.length - 1] !== '_') {
      normalized.push('_');
    }
  }

  if (normalized[normalized.length - 1] === '_') {
    normalized.pop();
  }

  return normalized.join('');
}

function hasNormalizedTerm(normalizedText, term) {
  if (typeof normalizedText !== 'string' || normalizedText === '') {
    return false;
  }

  const normalizedTerm = normalizeSemanticOverreachText(term);
  if (normalizedTerm === '') {
    return false;
  }

  let searchStart = 0;

  while (searchStart <= normalizedText.length - normalizedTerm.length) {
    const matchIndex = normalizedText.indexOf(normalizedTerm, searchStart);

    if (matchIndex === -1) {
      return false;
    }

    const beforeMatches = matchIndex === 0 || normalizedText.charAt(matchIndex - 1) === '_';
    const afterIndex = matchIndex + normalizedTerm.length;
    const afterMatches = afterIndex === normalizedText.length || normalizedText.charAt(afterIndex) === '_';

    if (beforeMatches && afterMatches) {
      return true;
    }

    searchStart = matchIndex + 1;
  }

  return false;
}

function ruleMatches(normalizedText, rule) {
  return rule.allOf.every((term) => hasNormalizedTerm(normalizedText, term))
    && rule.anyOf.some((term) => hasNormalizedTerm(normalizedText, term));
}

function collectMatchedReasons(normalizedText, rules) {
  return rules
    .filter((rule) => ruleMatches(normalizedText, rule))
    .map((rule) => rule.reason);
}

function detectSemanticOverreach(text) {
  const normalizedText = normalizeSemanticOverreachText(text);
  const unsupportedSemanticBridgeReasons = collectMatchedReasons(
    normalizedText,
    UNSUPPORTED_SEMANTIC_BRIDGE_RULES,
  );
  const causalOverreachReasons = collectMatchedReasons(normalizedText, CAUSAL_OVERREACH_RULES);
  const matchedReasons = [...new Set([...unsupportedSemanticBridgeReasons, ...causalOverreachReasons])];

  return Object.freeze({
    unsupportedSemanticBridge: unsupportedSemanticBridgeReasons.length > 0,
    causalOverreach: causalOverreachReasons.length > 0,
    matchedReasons: Object.freeze(matchedReasons),
  });
}

module.exports = {
  BRIDGE_CUE_TERMS,
  CAUSAL_OVERREACH_RULES,
  UNSUPPORTED_SEMANTIC_BRIDGE_RULES,
  collectMatchedReasons,
  detectSemanticOverreach,
  hasNormalizedTerm,
  normalizeSemanticOverreachText,
  ruleMatches,
};
