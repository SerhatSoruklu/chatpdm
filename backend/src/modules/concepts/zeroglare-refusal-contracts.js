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
]);

const EXPLICIT_ESCAPE_DISQUALIFIERS = Object.freeze([
  'bounded exit path',
  'bounded non recursive exit path',
  'external exit path',
  'external stabilizer',
  'external stabiliser',
  'external validation',
  'external validation path',
  'independent check',
  'independent validation',
  'independent validation path',
  'independent verification',
  'independent review',
  'outside validation',
  'neutral exit path',
  'third party verification',
  'third-party verification',
  'verified independently',
  'independently verify',
]);

const QUOTATION_MARK_PAIRS = Object.freeze([
  ['"', '"'],
  ["'", "'"],
  ['“', '”'],
  ['‘', '’'],
]);

function normalizeRefusalText(rawQuery) {
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

  const normalizedPhrase = normalizeRefusalText(phrase);

  if (normalizedPhrase === '') {
    return false;
  }

  return ` ${normalizedText} `.includes(` ${normalizedPhrase} `);
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

function collectMatchedPhrases(normalizedText, phrases) {
  return phrases.filter((phrase) => hasPhrase(normalizedText, phrase));
}

function matchesRule(normalizedText, rule) {
  return rule.allOf.every((phrase) => hasPhrase(normalizedText, phrase));
}

const ZEROGLARE_REFUSAL_CONTRACTS = Object.freeze([
  Object.freeze({
    contract_name: 'self_sealing_validity_claim',
    scope: 'Refusal',
    trigger_conditions: Object.freeze([
      'The input asserts or implies its own correctness.',
      'Challenge, doubt, or disagreement is converted into confirming evidence.',
      'No independent validation path is provided.',
      'The structure is enacted by the input, not merely described.',
    ]),
    required_features: Object.freeze([
      'A direct self-sealing claim is present.',
      'A challenge term is turned into proof, confirmation, or evidence.',
      'The text does not merely talk about a self-sealing argument.',
    ]),
    disqualifiers: Object.freeze([
      ...META_DESCRIPTION_DISQUALIFIERS,
      ...EXPLICIT_ESCAPE_DISQUALIFIERS,
      'argument',
      'arguments',
      'self sealing argument',
      'self sealing arguments',
    ]),
    refusal_reason_code: 'self_sealing_validity_claim',
    refusal_message: 'Input converts challenge or doubt into self-confirming evidence without an independent validation path.',
    examples_positive: Object.freeze([
      'The fact that you doubt this proves it is true.',
      'Anyone who disagrees only proves they do not understand.',
      'Resistance is evidence that the mechanism is working.',
    ]),
    examples_negative: Object.freeze([
      'This is an example of a self-sealing argument.',
      'Some arguments treat disagreement as proof.',
    ]),
    matcher_rules: Object.freeze([
      Object.freeze({
        allOf: Object.freeze(['you doubt', 'proves', 'true']),
      }),
      Object.freeze({
        allOf: Object.freeze(['anyone who disagrees', 'proves', 'understand']),
      }),
      Object.freeze({
        allOf: Object.freeze(['resistance is evidence', 'working']),
      }),
    ]),
  }),
  Object.freeze({
    contract_name: 'no_exit_contradictory_bind',
    scope: 'Refusal',
    trigger_conditions: Object.freeze([
      'The input presents two or more response paths.',
      'Each path is structured to produce the same imposed conclusion.',
      'No neutral or external exit path exists in the text.',
      'The contradiction is functional, not incidental.',
    ]),
    required_features: Object.freeze([
      'At least two response paths are present.',
      'Each path collapses into the same controlling conclusion.',
      'The text does not merely describe a false dilemma.',
    ]),
    disqualifiers: Object.freeze([
      ...META_DESCRIPTION_DISQUALIFIERS,
      ...EXPLICIT_ESCAPE_DISQUALIFIERS,
      'argument',
      'arguments',
      'bind',
      'binds',
      'false dilemma',
      'rhetoric',
      'rhetorical',
    ]),
    refusal_reason_code: 'no_exit_contradictory_bind',
    refusal_message: 'Input creates a contradictory bind in which all available response paths collapse into the same imposed conclusion.',
    examples_positive: Object.freeze([
      'If you accept it, you are naive. If you reject it, that proves you fear it.',
      'Silence means consent. Objection means defensiveness.',
      'Agree and you concede. Disagree and you confirm.',
    ]),
    examples_negative: Object.freeze([
      'This sentence describes a false dilemma.',
      'Some rhetoric creates binds where every answer looks bad.',
    ]),
    matcher_rules: Object.freeze([
      Object.freeze({
        allOf: Object.freeze(['if you accept it', 'you are naive', 'if you reject it', 'fear it']),
      }),
      Object.freeze({
        allOf: Object.freeze(['silence means consent', 'objection means defensiveness']),
      }),
      Object.freeze({
        allOf: Object.freeze(['agree and you concede', 'disagree and you confirm']),
      }),
    ]),
  }),
  Object.freeze({
    contract_name: 'unresolvable_recursive_closure',
    scope: 'Refusal',
    trigger_conditions: Object.freeze([
      'The input contains a recursive validation structure.',
      'The truth or validity of the claim depends on accepting the recursive structure itself.',
      'No bounded non-recursive exit path is available in the analyzed text.',
      'The system cannot classify the statement without inheriting the loop.',
    ]),
    required_features: Object.freeze([
      'A recursive closure is enacted in the text.',
      'The claim depends on the recursive structure itself.',
      'The text does not merely discuss recursive logic.',
    ]),
    disqualifiers: Object.freeze([
      ...META_DESCRIPTION_DISQUALIFIERS,
      ...EXPLICIT_ESCAPE_DISQUALIFIERS,
      'argument',
      'arguments',
      'recursive closure',
      'recursive logic',
    ]),
    refusal_reason_code: 'unresolvable_recursive_closure',
    refusal_message: 'Input contains a recursive closure with no bounded exit path.',
    examples_positive: Object.freeze([
      'If you reject this, that proves it.',
      'Questioning it confirms it.',
      'Trying to step outside the frame keeps you inside the frame.',
    ]),
    examples_negative: Object.freeze([
      'This statement talks about recursive logic.',
      'A recursive closure happens when every interpretation loops back.',
    ]),
    matcher_rules: Object.freeze([
      Object.freeze({
        allOf: Object.freeze(['if you reject this', 'proves it']),
      }),
      Object.freeze({
        allOf: Object.freeze(['questioning it', 'confirms it']),
      }),
      Object.freeze({
        allOf: Object.freeze(['step outside the frame', 'keeps you inside the frame']),
      }),
    ]),
  }),
]);

function evaluateZeroglareRefusal(rawQuery) {
  const normalizedText = normalizeRefusalText(rawQuery);

  if (normalizedText === '' || isEntireInputQuoted(rawQuery)) {
    return Object.freeze({
      refused: false,
      contract_name: null,
      reason_code: null,
      reason: null,
      matched_features: Object.freeze([]),
      matched_disqualifiers: Object.freeze([]),
    });
  }

  for (const contract of ZEROGLARE_REFUSAL_CONTRACTS) {
    const matchedDisqualifiers = collectMatchedPhrases(normalizedText, contract.disqualifiers);

    if (matchedDisqualifiers.length > 0) {
      continue;
    }

    const matchedRule = contract.matcher_rules.find((rule) => matchesRule(normalizedText, rule)) ?? null;

    if (!matchedRule) {
      continue;
    }

    const matchedFeatures = [
      ...collectMatchedPhrases(normalizedText, matchedRule.allOf),
    ];

    return Object.freeze({
      refused: true,
      contract_name: contract.contract_name,
      reason_code: contract.refusal_reason_code,
      reason: contract.refusal_message,
      matched_features: Object.freeze(matchedFeatures),
      matched_disqualifiers: Object.freeze(matchedDisqualifiers),
    });
  }

  return Object.freeze({
    refused: false,
    contract_name: null,
    reason_code: null,
    reason: null,
    matched_features: Object.freeze([]),
    matched_disqualifiers: Object.freeze([]),
  });
}

module.exports = {
  ZEROGLARE_REFUSAL_CONTRACTS,
  evaluateZeroglareRefusal,
  hasPhrase,
  normalizeRefusalText,
  isEntireInputQuoted,
};
