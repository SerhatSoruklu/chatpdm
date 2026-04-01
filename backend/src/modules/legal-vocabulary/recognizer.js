'use strict';

const {
  EMPTY_NORMALIZED_QUERY,
} = require('../concepts/constants');
const {
  deriveRoutingText,
  normalizeQuery,
} = require('../concepts/normalizer');
const {
  loadLegalVocabularyRegistry,
} = require('./recognition-registry-loader');

function assertNormalizedQueryValue(normalizedQuery) {
  if (typeof normalizedQuery !== 'string') {
    throw new TypeError('Expected normalizedQuery to be a string.');
  }

  const recomputed = normalizeQuery(normalizedQuery);
  if (recomputed !== normalizedQuery) {
    throw new Error('Expected an already-normalized query value for legal vocabulary recognition.');
  }
}

function recognizeLegalVocabulary(normalizedQuery) {
  assertNormalizedQueryValue(normalizedQuery);
  const routingQuery = deriveRoutingText(normalizedQuery);

  if (routingQuery === EMPTY_NORMALIZED_QUERY) {
    return {
      recognized: false,
      type: 'unknown',
    };
  }

  const registry = loadLegalVocabularyRegistry();
  const record = registry.recordsByTerm.get(routingQuery);

  if (!record) {
    return {
      recognized: false,
      type: 'unknown',
    };
  }

  return {
    recognized: true,
    type: 'vocab',
    classification: record.classification,
  };
}

module.exports = {
  recognizeLegalVocabulary,
};
