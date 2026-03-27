'use strict';

const { EMPTY_NORMALIZED_QUERY } = require('./constants');
const { extractCanonicalId, normalizeQuery } = require('./normalizer');

function pushCandidate(map, key, concept) {
  if (!map.has(key)) {
    map.set(key, []);
  }

  map.get(key).push(concept);
}

function buildExactAliasIndex(concepts) {
  const exactAliasIndex = new Map();

  for (const concept of concepts) {
    const seenKeys = new Set();
    for (const alias of concept.aliases) {
      const aliasKey = normalizeQuery(alias);
      if (seenKeys.has(aliasKey)) {
        continue;
      }

      seenKeys.add(aliasKey);
      pushCandidate(exactAliasIndex, aliasKey, concept);
    }
  }

  return exactAliasIndex;
}

function buildNormalizedAliasIndex(concepts) {
  const normalizedAliasIndex = new Map();

  for (const concept of concepts) {
    const seenKeys = new Set();
    for (const normalizedAlias of concept.normalizedAliases) {
      const aliasKey = normalizeQuery(normalizedAlias);
      if (seenKeys.has(aliasKey)) {
        continue;
      }

      seenKeys.add(aliasKey);
      pushCandidate(normalizedAliasIndex, aliasKey, concept);
    }
  }

  return normalizedAliasIndex;
}

function findAuthorDefinedDisambiguation({ normalizedQuery, concepts, resolveRules }) {
  const rule = resolveRules.authorDefinedDisambiguations.find(
    (candidate) => candidate.normalizedQuery === normalizedQuery,
  );

  if (!rule) {
    return null;
  }

  const candidates = rule.candidateConceptIds.map((conceptId) => {
    const concept = concepts.find((candidate) => candidate.conceptId === conceptId);

    if (!concept) {
      throw new Error(`Unknown concept "${conceptId}" referenced in authorDefinedDisambiguations.`);
    }

    return concept;
  });

  return {
    type: 'ambiguous_match',
    candidates,
  };
}

function findAuthorDefinedSuggestions({ normalizedQuery, concepts, resolveRules }) {
  const rule = resolveRules.authorDefinedSuggestions.find(
    (candidate) => candidate.normalizedQuery === normalizedQuery,
  );

  if (!rule) {
    return [];
  }

  return rule.suggestions.map((suggestion) => {
    const concept = concepts.find((candidate) => candidate.conceptId === suggestion.conceptId);

    if (!concept) {
      throw new Error(`Unknown concept "${suggestion.conceptId}" referenced in authorDefinedSuggestions.`);
    }

    return {
      conceptId: concept.conceptId,
      title: concept.title,
      reason: suggestion.reason,
    };
  });
}

function buildAmbiguousResult(method, basis, candidates) {
  return {
    type: 'ambiguous_match',
    method,
    candidates: candidates.map((concept) => ({
      conceptId: concept.conceptId,
      title: concept.title,
      shortDefinition: concept.shortDefinition,
      basis,
    })),
  };
}

function buildConceptMatch(method, concept) {
  return {
    type: 'concept_match',
    method,
    concept,
  };
}

function buildNoExactMatch(suggestions = []) {
  return {
    type: 'no_exact_match',
    method: 'no_exact_match',
    suggestions,
  };
}

function matchQuery({ rawQuery, normalizedQuery, concepts, resolveRules }) {
  if (normalizedQuery === EMPTY_NORMALIZED_QUERY) {
    return buildNoExactMatch([]);
  }

  const canonicalId = extractCanonicalId(rawQuery);
  if (canonicalId !== null) {
    if (canonicalId === '') {
      return buildNoExactMatch(findAuthorDefinedSuggestions({
        rawQuery,
        normalizedQuery,
        concepts,
        resolveRules,
      }));
    }

    const concept = concepts.find((candidate) => candidate.conceptId === canonicalId);
    if (concept) {
      return buildConceptMatch('canonical_id', concept);
    }

    return buildNoExactMatch(findAuthorDefinedSuggestions({
      rawQuery,
      normalizedQuery,
      concepts,
      resolveRules,
    }));
  }

  const exactAliasMatches = buildExactAliasIndex(concepts).get(normalizedQuery) || [];
  if (exactAliasMatches.length === 1) {
    return buildConceptMatch('exact_alias', exactAliasMatches[0]);
  }

  if (exactAliasMatches.length > 1) {
    return buildAmbiguousResult('ambiguous_alias', 'shared_alias', exactAliasMatches);
  }

  const normalizedAliasMatches = buildNormalizedAliasIndex(concepts).get(normalizedQuery) || [];
  if (normalizedAliasMatches.length === 1) {
    return buildConceptMatch('normalized_alias', normalizedAliasMatches[0]);
  }

  if (normalizedAliasMatches.length > 1) {
    return buildAmbiguousResult(
      'ambiguous_normalized_alias',
      'normalized_overlap',
      normalizedAliasMatches,
    );
  }

  const authorDefinedDisambiguation = findAuthorDefinedDisambiguation({
    rawQuery,
    normalizedQuery,
    concepts,
    resolveRules,
  });
  if (authorDefinedDisambiguation) {
    if (authorDefinedDisambiguation.type === 'concept_match') {
      return buildConceptMatch('author_defined_disambiguation', authorDefinedDisambiguation.concept);
    }

    if (authorDefinedDisambiguation.type === 'ambiguous_match') {
      return buildAmbiguousResult(
        'author_defined_disambiguation',
        'author_defined_disambiguation',
        authorDefinedDisambiguation.candidates,
      );
    }
  }

  const suggestions = findAuthorDefinedSuggestions({
    rawQuery,
    normalizedQuery,
    concepts,
    resolveRules,
  });

  return buildNoExactMatch(suggestions);
}

module.exports = {
  matchQuery,
};
