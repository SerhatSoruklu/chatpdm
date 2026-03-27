'use strict';

const COMPARISON_ALLOWLIST = Object.freeze([
  ['authority', 'power'],
  ['authority', 'legitimacy'],
  ['power', 'legitimacy'],
  ['responsibility', 'duty'],
]);

function normalizePair(conceptIds) {
  return [...conceptIds].sort((left, right) => left.localeCompare(right));
}

function pairKey(conceptIds) {
  return normalizePair(conceptIds).join('::');
}

const ALLOWLIST_KEYS = new Set(COMPARISON_ALLOWLIST.map(pairKey));

function isAllowedComparisonPair(conceptIds) {
  return ALLOWLIST_KEYS.has(pairKey(conceptIds));
}

function buildComparisonPayload(conceptIds, conceptIndex) {
  const normalizedPair = normalizePair(conceptIds);
  const [conceptAId, conceptBId] = normalizedPair;
  const conceptA = conceptIndex.get(conceptAId);
  const conceptB = conceptIndex.get(conceptBId);

  if (!conceptA || !conceptB) {
    return null;
  }

  const comparisonEntry = conceptA.comparison?.[conceptBId];
  if (!comparisonEntry || !Array.isArray(comparisonEntry.axes) || comparisonEntry.axes.length === 0) {
    return null;
  }

  return {
    conceptA: conceptAId,
    conceptB: conceptBId,
    axes: comparisonEntry.axes.map((axis) => ({ ...axis })),
  };
}

function resolveComparisonQuery(conceptIds, conceptIndex) {
  if (!Array.isArray(conceptIds) || conceptIds.length !== 2) {
    return null;
  }

  if (!isAllowedComparisonPair(conceptIds)) {
    return null;
  }

  return buildComparisonPayload(conceptIds, conceptIndex);
}

module.exports = {
  COMPARISON_ALLOWLIST,
  resolveComparisonQuery,
};
