'use strict';

const CONTRACT_VERSION = 'v1.1';
const NORMALIZER_VERSION = '2026-03-27.v1';
const MATCHER_VERSION = '2026-03-27.v2';
const CONCEPT_SET_VERSION = '20260327.2';
const EMPTY_NORMALIZED_QUERY = '__empty__';

const SEED_CONCEPT_IDS = Object.freeze([
  'authority',
  'power',
  'legitimacy',
  'responsibility',
  'duty',
]);

const PUNCTUATION_CHARACTERS = Object.freeze([
  '.',
  '!',
  '?',
  ',',
  ';',
  ':',
  '(',
  ')',
  '[',
  ']',
  '{',
  '}',
  '"',
  '\'',
]);

const LEADING_FILLER_PHRASES = Object.freeze([
  'what is ',
  'what are ',
  'define ',
  'meaning of ',
  'explain ',
  'tell me about ',
]);

const NO_EXACT_MATCH_MESSAGE = 'No exact canonical concept match was found for this query.';
const AMBIGUOUS_MATCH_MESSAGE = 'Multiple canonical concepts match this query. Choose one to continue.';

module.exports = {
  AMBIGUOUS_MATCH_MESSAGE,
  CONCEPT_SET_VERSION,
  CONTRACT_VERSION,
  EMPTY_NORMALIZED_QUERY,
  LEADING_FILLER_PHRASES,
  MATCHER_VERSION,
  NORMALIZER_VERSION,
  NO_EXACT_MATCH_MESSAGE,
  PUNCTUATION_CHARACTERS,
  SEED_CONCEPT_IDS,
};
