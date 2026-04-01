'use strict';

const {
  EMPTY_NORMALIZED_QUERY,
  LEADING_FILLER_PHRASES,
} = require('./constants');

const EDGE_PUNCTUATION_PATTERN = /^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu;
const WORDLIKE_TOKEN_PATTERN = /[\p{L}\p{N}]/u;

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

function trimTokenEdgePunctuation(token) {
  if (typeof token !== 'string' || token === '') {
    return token;
  }

  const strippedToken = token.replace(EDGE_PUNCTUATION_PATTERN, '');

  if (!WORDLIKE_TOKEN_PATTERN.test(strippedToken)) {
    return token;
  }

  return strippedToken;
}

function deriveRoutingText(normalizedQuery) {
  if (typeof normalizedQuery !== 'string') {
    throw new TypeError('Expected normalizedQuery to be a string.');
  }

  if (normalizedQuery === EMPTY_NORMALIZED_QUERY) {
    return EMPTY_NORMALIZED_QUERY;
  }

  if (normalizeQuery(normalizedQuery) !== normalizedQuery) {
    throw new Error('Expected deriveRoutingText() to receive an already-normalized query value.');
  }

  const routingQuery = normalizedQuery
    .split(' ')
    .map((token) => trimTokenEdgePunctuation(token))
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ');

  return routingQuery === '' ? EMPTY_NORMALIZED_QUERY : routingQuery;
}

function normalizeQueryForRouting(rawQuery) {
  return deriveRoutingText(normalizeQuery(rawQuery));
}

function extractCanonicalId(rawQuery) {
  if (typeof rawQuery !== 'string' || !rawQuery.startsWith('concept:')) {
    return null;
  }

  return rawQuery.slice('concept:'.length);
}

module.exports = {
  deriveRoutingText,
  extractCanonicalId,
  findLeadingFillerPhrase,
  normalizeQuery,
  normalizeQueryForRouting,
};
