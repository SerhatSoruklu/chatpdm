'use strict';

const { REASON_CODES } = require('./reason-codes');

const CANONICAL_ZONE_NAMES = Object.freeze([
  'shortDefinition',
  'coreMeaning',
  'fullDefinition',
]);

const DUTY_COLLAPSE_PATTERNS = Object.freeze([
  'answerable connection',
  'answerability for',
  'held answerable',
  'held to account',
  'called to account',
  'who must answer for',
  'attributable action',
  'attributable actions',
  'attributable outcome',
  'attributable outcomes',
  'attributable conduct',
  'post breach',
  'post-breach',
  'after action',
  'after outcome',
  'blame',
  'blamed',
]);

const DUTY_CONTRAST_SHIELDS = Object.freeze([
  'responsibility links',
  'responsibility concerns',
  'not identical to responsibility',
  'further question',
  'not the definition of duty',
  'not who is answerable',
  'whether failure produces broader responsibility',
  'rather than',
]);

const RESPONSIBILITY_COLLAPSE_PATTERNS = Object.freeze([
  'required conduct',
  'conduct that is owed',
  'conduct is owed',
  'must be done',
  'must be done or avoided',
  'must be done or refrained from',
  'what must be done',
  'what must be done or avoided',
  'before action occurs',
  'before the action is taken',
  'owed under a rule',
  'required line of conduct',
]);

const RESPONSIBILITY_CONTRAST_SHIELDS = Object.freeze([
  'duty concerns',
  'duty is',
  'not the same as duty',
  'not identical to duty',
  'duty instead',
  'responsibility concerns',
  'rather than what conduct was antecedently required',
  'rather than what conduct was required',
]);

function normalizeSentence(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function splitSentences(text) {
  return String(text)
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => normalizeSentence(sentence))
    .filter(Boolean);
}

function sentenceHasPattern(sentence, patterns) {
  return patterns.some((pattern) => sentence.includes(pattern));
}

function createBoundaryEntry(code, zone, matchedSentence) {
  return {
    code,
    zone,
    matchedSentence,
  };
}

function evaluateZoneBoundary(text, zoneName, code, collapsePatterns, shieldPatterns) {
  const sentences = splitSentences(text);

  for (const sentence of sentences) {
    if (!sentenceHasPattern(sentence, collapsePatterns)) {
      continue;
    }

    if (sentenceHasPattern(sentence, shieldPatterns)) {
      continue;
    }

    return createBoundaryEntry(code, zoneName, sentence);
  }

  return null;
}

function validateDutyResponsibilityBoundary(concept) {
  const conceptId = concept?.conceptId;

  if (conceptId !== 'duty' && conceptId !== 'responsibility') {
    return [];
  }

  const code = conceptId === 'duty'
    ? REASON_CODES.DUTY_COLLAPSES_TO_RESPONSIBILITY
    : REASON_CODES.RESPONSIBILITY_COLLAPSES_TO_DUTY;
  const collapsePatterns = conceptId === 'duty'
    ? DUTY_COLLAPSE_PATTERNS
    : RESPONSIBILITY_COLLAPSE_PATTERNS;
  const shieldPatterns = conceptId === 'duty'
    ? DUTY_CONTRAST_SHIELDS
    : RESPONSIBILITY_CONTRAST_SHIELDS;

  return CANONICAL_ZONE_NAMES
    .map((zoneName) => evaluateZoneBoundary(concept?.[zoneName], zoneName, code, collapsePatterns, shieldPatterns))
    .filter(Boolean);
}

module.exports = {
  validateDutyResponsibilityBoundary,
};
