'use strict';

const {
  EMPTY_NORMALIZED_QUERY,
  LEADING_FILLER_PHRASES,
  PUNCTUATION_CHARACTERS,
} = require('./constants');

function escapeForCharClass(character) {
  return /[\\\-\]\[]/.test(character) ? `\\${character}` : character;
}

const punctuationPattern = new RegExp(
  `[${PUNCTUATION_CHARACTERS.map(escapeForCharClass).join('')}]`,
  'g',
);

function normalizeQuery(rawQuery) {
  if (typeof rawQuery !== 'string') {
    throw new TypeError('Expected rawQuery to be a string.');
  }

  let normalizedQuery = rawQuery.trim();
  normalizedQuery = normalizedQuery.toLowerCase();
  normalizedQuery = normalizedQuery.replace(/\s+/g, ' ');
  normalizedQuery = normalizedQuery.replace(punctuationPattern, '');

  const matchingPrefix = LEADING_FILLER_PHRASES.find((prefix) => normalizedQuery.startsWith(prefix));
  if (matchingPrefix) {
    normalizedQuery = normalizedQuery.slice(matchingPrefix.length);
  }

  normalizedQuery = normalizedQuery.trim();

  return normalizedQuery === '' ? EMPTY_NORMALIZED_QUERY : normalizedQuery;
}

function extractCanonicalId(rawQuery) {
  if (typeof rawQuery !== 'string' || !rawQuery.startsWith('concept:')) {
    return null;
  }

  return rawQuery.slice('concept:'.length);
}

module.exports = {
  extractCanonicalId,
  normalizeQuery,
};
