'use strict';

const {
  AMBIGUOUS_MATCH_MESSAGE,
  CONCEPT_SET_VERSION,
  CONTRACT_VERSION,
  MATCHER_VERSION,
  NORMALIZER_VERSION,
  NO_EXACT_MATCH_MESSAGE,
} = require('./constants');
const {
  loadConceptSet,
} = require('./concept-loader');
const { buildReadingRegistersForConcept } = require('./reading-registers');
const { loadResolveRules } = require('./resolve-rules-loader');
const { matchQuery } = require('./matcher');
const { normalizeQuery } = require('./normalizer');
const { classifyQueryShape } = require('./query-shape-classifier');
const { resolveComparisonQuery } = require('./comparison-resolver');
const { detectGovernanceScopeEnforcement } = require('./governance-scope-enforcer');
const { assertValidProductResponse } = require('../../lib/product-response-validator');

function buildContextPayload(context) {
  const appliesTo = Array.isArray(context.appliesTo) && context.appliesTo.length > 0
    ? context.appliesTo
    : [context.label];

  return {
    label: context.label,
    appliesTo,
  };
}

function buildRelatedConceptPayload(relatedConcept, conceptIndex) {
  const related = conceptIndex.get(relatedConcept.conceptId);

  if (!related) {
    throw new Error(`Unknown related concept "${relatedConcept.conceptId}" in concept graph.`);
  }

  return {
    conceptId: relatedConcept.conceptId,
    title: related.title,
    relationType: relatedConcept.relationType,
  };
}

function buildBaseResponse(query, normalizedQuery, queryClassification) {
  return {
    query,
    normalizedQuery,
    contractVersion: CONTRACT_VERSION,
    normalizerVersion: NORMALIZER_VERSION,
    matcherVersion: MATCHER_VERSION,
    conceptSetVersion: CONCEPT_SET_VERSION,
    queryType: queryClassification.queryType,
    interpretation: queryClassification.interpretation,
  };
}

function resolveConceptQuery(rawQuery) {
  if (typeof rawQuery !== 'string') {
    throw new TypeError('Expected query to be a string.');
  }

  if (rawQuery.length === 0) {
    throw new TypeError('Expected query to be a non-empty string.');
  }

  const concepts = loadConceptSet();
  const resolveRules = loadResolveRules();
  const conceptIndex = new Map(concepts.map((concept) => [concept.conceptId, concept]));
  const normalizedQuery = normalizeQuery(rawQuery);
  const match = matchQuery({
    rawQuery,
    normalizedQuery,
    concepts,
    resolveRules,
  });
  const queryClassification = classifyQueryShape({
    rawQuery,
    normalizedQuery,
    concepts,
    resolveRules,
    match,
  });

  const baseResponse = buildBaseResponse(rawQuery, normalizedQuery, queryClassification);
  let response;
  const governanceScopeEnforcement = detectGovernanceScopeEnforcement({
    normalizedQuery,
    match,
    queryClassification,
    conceptIndex,
  });

  if (governanceScopeEnforcement) {
    response = {
      ...baseResponse,
      type: 'no_exact_match',
      interpretation: governanceScopeEnforcement.interpretation,
      resolution: {
        method: governanceScopeEnforcement.resolutionMethod,
      },
      message: NO_EXACT_MATCH_MESSAGE,
      suggestions: [],
    };

    return assertValidProductResponse(response);
  }

  if (queryClassification.queryType === 'comparison_query') {
    const comparison = resolveComparisonQuery(queryClassification.interpretation?.concepts ?? [], conceptIndex);

    if (comparison) {
      response = {
        ...baseResponse,
        type: 'comparison',
        mode: 'comparison',
        interpretation: null,
        comparison,
      };
    } else {
      response = {
        ...baseResponse,
        type: 'no_exact_match',
        resolution: {
          method: 'no_exact_match',
        },
        message: NO_EXACT_MATCH_MESSAGE,
        suggestions: [],
      };
    }
  } else if (match.type === 'concept_match') {
    response = {
      ...baseResponse,
      type: 'concept_match',
      resolution: {
        method: match.method,
        conceptId: match.concept.conceptId,
        conceptVersion: match.concept.version,
      },
      answer: {
        title: match.concept.title,
        shortDefinition: match.concept.shortDefinition,
        coreMeaning: match.concept.coreMeaning,
        fullDefinition: match.concept.fullDefinition,
        registers: buildReadingRegistersForConcept(match.concept),
        contexts: match.concept.contexts.map(buildContextPayload),
        sources: match.concept.sources.map((source) => ({
          id: source.id,
          label: source.label,
          type: source.type,
          usedFor: source.usedFor,
        })),
        relatedConcepts: match.concept.relatedConcepts.map((relatedConcept) => (
          buildRelatedConceptPayload(relatedConcept, conceptIndex)
        )),
      },
    };
  } else if (match.type === 'ambiguous_match') {
    response = {
      ...baseResponse,
      type: 'ambiguous_match',
      resolution: {
        method: match.method,
      },
      message: AMBIGUOUS_MATCH_MESSAGE,
      candidates: match.candidates,
    };
  } else {
    response = {
      ...baseResponse,
      type: 'no_exact_match',
      resolution: {
        method: 'no_exact_match',
      },
      message: NO_EXACT_MATCH_MESSAGE,
      suggestions: match.suggestions,
    };
  }

  return assertValidProductResponse(response);
}

module.exports = {
  resolveConceptQuery,
};
