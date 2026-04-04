'use strict';

const META_DESCRIPTION_DISQUALIFIERS = Object.freeze([
  'example',
  'examples',
  'example of',
  'for example',
  'called',
  'describes',
  'described',
  'describing',
  'phrase',
  'quoted',
  'quote',
  'sentence',
  'talks about',
  'argument',
  'arguments',
]);

const AMBIGUITY_DISQUALIFIERS = Object.freeze([
  ...META_DESCRIPTION_DISQUALIFIERS,
  'direct disagreement',
  'descriptive discussion',
  'explicit argument',
]);

const SOFT_PRESSURE_DISQUALIFIERS = Object.freeze([
  ...META_DESCRIPTION_DISQUALIFIERS,
  'according to',
  'because the data',
  'data',
  'findings',
  'results',
  'survey',
  'surveys',
  'study',
  'studies',
  'supported by',
  'evidence',
]);

const QUOTATION_MARK_PAIRS = Object.freeze([
  ['"', '"'],
  ["'", "'"],
  ['“', '”'],
  ['‘', '’'],
]);

function normalizeGuidanceText(rawQuery) {
  if (typeof rawQuery !== 'string') {
    return '';
  }

  return rawQuery
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasPhrase(normalizedText, phrase) {
  if (typeof normalizedText !== 'string' || normalizedText === '') {
    return false;
  }

  const normalizedPhrase = normalizeGuidanceText(phrase);

  if (normalizedPhrase === '') {
    return false;
  }

  return ` ${normalizedText} `.includes(` ${normalizedPhrase} `);
}

function collectMatchedPhrases(normalizedText, phrases) {
  return phrases.filter((phrase) => hasPhrase(normalizedText, phrase));
}

function isEntireInputQuoted(rawQuery) {
  if (typeof rawQuery !== 'string') {
    return false;
  }

  const trimmed = rawQuery.trim();

  if (trimmed.length < 2) {
    return false;
  }

  return QUOTATION_MARK_PAIRS.some(([openQuote, closeQuote]) => (
    trimmed.startsWith(openQuote)
    && trimmed.endsWith(closeQuote)
    && trimmed.slice(openQuote.length, trimmed.length - closeQuote.length).trim() !== ''
  ));
}

function buildMatchResult(pattern, matchedFeatures, matchedDisqualifiers) {
  return Object.freeze({
    matched: true,
    pattern: pattern.pattern_name,
    response: pattern.response,
    strategy: pattern.strategy,
    intent: pattern.intent,
    matched_features: Object.freeze([...new Set(matchedFeatures)]),
    matched_disqualifiers: Object.freeze([...new Set(matchedDisqualifiers)]),
  });
}

function buildEmptyResult(matchedDisqualifiers = []) {
  return Object.freeze({
    matched: false,
    pattern: null,
    response: null,
    strategy: null,
    intent: null,
    matched_features: Object.freeze([]),
    matched_disqualifiers: Object.freeze([...new Set(matchedDisqualifiers)]),
  });
}

const ZEROGLARE_CONVERSATIONAL_GUIDANCE_PATTERNS = Object.freeze([
  Object.freeze({
    pattern_name: 'ambiguity_uncertain_interpretation',
    scope: 'Conversational guidance',
    trigger_conditions: Object.freeze([
      'The text expresses uncertainty about how to interpret the statement.',
      'The text implies a hidden meaning or unstated implication.',
      'The text splits the interpretation into multiple possible responses.',
      'The structure is enacted by the input, not merely described.',
    ]),
    required_features: Object.freeze([
      'An uncertainty phrase is present.',
      'An implied meaning phrase is present.',
      'A split-interpretation phrase is present.',
    ]),
    disqualifiers: Object.freeze([
      ...AMBIGUITY_DISQUALIFIERS,
      'survey',
      'survey data',
      'data',
      'study',
      'studies',
      'results',
    ]),
    response: 'There’s no hidden implication. The claim is just this: [state claim clearly].',
    strategy: 'clarification',
    intent: 'stabilize_interpretation',
    matcher_rules: Object.freeze([
      Object.freeze({
        allOf: Object.freeze([
          'i think i understand',
          'implying something',
          'not sure if i m supposed to',
          'agree with it or question it',
        ]),
      }),
      Object.freeze({
        allOf: Object.freeze([
          'i can t tell',
          'direct claim',
          'implying something',
          'behind it',
        ]),
      }),
      Object.freeze({
        allOf: Object.freeze([
          'two different things',
          'not sure which one',
          'supposed to respond to',
        ]),
      }),
      Object.freeze({
        allOf: Object.freeze([
          'uncertain how to interpret',
          'hidden meaning',
          'multiple possible scenarios',
        ]),
      }),
    ]),
  }),
  Object.freeze({
    pattern_name: 'soft_pressure_expectation_frame',
    scope: 'Conversational guidance',
    trigger_conditions: Object.freeze([
      'The text nudges the listener toward a preferred conclusion.',
      'The text uses expectation, consensus, or mild social pressure.',
      'The text does not collapse into a refusal contract.',
      'The structure is enacted by the input, not merely described.',
    ]),
    required_features: Object.freeze([
      'An expectation or consensus cue is present.',
      'A preferred-conclusion cue is present.',
    ]),
    disqualifiers: Object.freeze([
      ...SOFT_PRESSURE_DISQUALIFIERS,
      'survey',
      'survey data',
      'according to the survey',
      'because the data',
      'supported by evidence',
      'backed by evidence',
    ]),
    response: 'What is the actual claim, and what supports it?',
    strategy: 'burden_reset',
    intent: 'stabilize_evaluation',
    matcher_rules: Object.freeze([
      Object.freeze({
        allOf: Object.freeze(['most reasonable people', 'would agree']),
      }),
      Object.freeze({
        allOf: Object.freeze(['you already know', 'right answer']),
      }),
      Object.freeze({
        allOf: Object.freeze([
          'you probably don t want to be the kind of person',
          'ignores this',
        ]),
      }),
      Object.freeze({
        allOf: Object.freeze(['obvious conclusion', 'right in front of you']),
      }),
    ]),
  }),
]);

function evaluateZeroglareConversationalGuidance(rawQuery) {
  const normalizedText = normalizeGuidanceText(rawQuery);
  let blockedDisqualifiers = [];

  if (normalizedText === '' || isEntireInputQuoted(rawQuery)) {
    return buildEmptyResult();
  }

  for (const pattern of ZEROGLARE_CONVERSATIONAL_GUIDANCE_PATTERNS) {
    const matchedDisqualifiers = collectMatchedPhrases(normalizedText, pattern.disqualifiers);

    if (matchedDisqualifiers.length > 0) {
      if (blockedDisqualifiers.length === 0) {
        blockedDisqualifiers = matchedDisqualifiers;
      }

      continue;
    }

    for (const rule of pattern.matcher_rules) {
      const matchedFeatures = collectMatchedPhrases(normalizedText, rule.allOf);

      if (matchedFeatures.length === rule.allOf.length) {
        return buildMatchResult(pattern, matchedFeatures, matchedDisqualifiers);
      }
    }
  }

  return buildEmptyResult(blockedDisqualifiers);
}

module.exports = {
  ZEROGLARE_CONVERSATIONAL_GUIDANCE_PATTERNS,
  evaluateZeroglareConversationalGuidance,
};
