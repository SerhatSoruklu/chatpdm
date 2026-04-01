'use strict';

const {
  EMPTY_NORMALIZED_QUERY,
  LEADING_FILLER_PHRASES,
} = require('./constants');

function findLeadingFillerPhrase(normalizedQuery) {
  if (typeof normalizedQuery !== 'string' || normalizedQuery.trim() === '') {
    return null;
  }

  return LEADING_FILLER_PHRASES.find((phrase) => (
    normalizedQuery.startsWith(phrase)
    && (
      normalizedQuery.length === phrase.length
      || normalizedQuery.charAt(phrase.length) === ' '
    )
  )) ?? null;
}

function normalizeQuery(rawQuery) {
  if (typeof rawQuery !== 'string') {
    throw new TypeError('Expected rawQuery to be a string.');
  }

  let normalizedQuery = rawQuery.trim();
  normalizedQuery = normalizedQuery.toLowerCase();
  normalizedQuery = normalizedQuery.replace(/\s+/g, ' ');

  const matchingPrefix = findLeadingFillerPhrase(normalizedQuery);
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
  findLeadingFillerPhrase,
  normalizeQuery,
};
