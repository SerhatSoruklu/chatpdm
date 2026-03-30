'use strict';

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu;

const ABSTRACT_NOUN_HINTS = Object.freeze([
  'authority',
  'legitimacy',
  'capacity',
  'validity',
  'efficacy',
  'standing',
  'composition',
  'recognition',
  'institution',
  'structure',
  'relation',
  'governance',
  'directive',
  'justification',
  'attribution',
  'answerability',
  'stewardship',
  'obligation',
  'compliance',
]);

const ABSTRACT_NOUN_SUFFIXES = Object.freeze([
  'tion',
  'sion',
  'ment',
  'ness',
  'ity',
  'ance',
  'ence',
  'ship',
]);

function tokenizeWords(text) {
  return String(text ?? '')
    .toLowerCase()
    .match(WORD_PATTERN) || [];
}

function splitSentences(text) {
  return String(text ?? '')
    .split(/\n+/)
    .flatMap((chunk) => chunk.split(/[.!?]+/))
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function sentenceLengths(text) {
  return splitSentences(text).map((sentence) => tokenizeWords(sentence).length);
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function countAbstractNouns(words) {
  return words.filter((word) => (
    ABSTRACT_NOUN_HINTS.includes(word)
    || ABSTRACT_NOUN_SUFFIXES.some((suffix) => word.endsWith(suffix))
  )).length;
}

function commaCountsPerSentence(text) {
  return splitSentences(text).map((sentence) => (sentence.match(/,/g) || []).length);
}

function hasSemicolon(text) {
  return String(text ?? '').includes(';');
}

function collectTextStats(text) {
  const words = tokenizeWords(text);
  const lengths = sentenceLengths(text);
  const longWordCount = words.filter((word) => word.length > 6).length;
  const abstractNounCount = countAbstractNouns(words);

  return {
    wordCount: words.length,
    sentenceCount: lengths.length,
    sentenceLengths: lengths,
    averageSentenceLength: average(lengths),
    maxSentenceLength: lengths.length > 0 ? Math.max(...lengths) : 0,
    longWordRatio: words.length > 0 ? longWordCount / words.length : 0,
    abstractNounDensity: words.length > 0 ? abstractNounCount / words.length : 0,
    commaCountsPerSentence: commaCountsPerSentence(text),
    hasSemicolon: hasSemicolon(text),
  };
}

module.exports = {
  ABSTRACT_NOUN_HINTS,
  ABSTRACT_NOUN_SUFFIXES,
  collectTextStats,
  commaCountsPerSentence,
  hasSemicolon,
  sentenceLengths,
  splitSentences,
  tokenizeWords,
};
