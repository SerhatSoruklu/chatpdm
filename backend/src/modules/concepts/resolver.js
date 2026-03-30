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
const { getConceptRuntimeGovernanceState } = require('./concept-validation-state-loader');
const { buildReadingRegistersForConcept } = require('./reading-registers');
const { loadResolveRules } = require('./resolve-rules-loader');
const { matchQuery } = require('./matcher');
const { normalizeQuery } = require('./normalizer');
const { classifyQueryShape } = require('./query-shape-classifier');
const { resolveComparisonQuery } = require('./comparison-resolver');
const { detectGovernanceScopeEnforcement } = require('./governance-scope-enforcer');
const { assertDeterministicPathFreeOfAiMarkers } = require('../../lib/ai-governance-guard');
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

function buildValidationBlockedInterpretation(blockedConceptIds) {
  const uniqueBlockedConceptIds = [...new Set(
    blockedConceptIds.filter((conceptId) => typeof conceptId === 'string' && conceptId.trim() !== ''),
  )];
  const blockedConceptId = uniqueBlockedConceptIds[0] ?? null;

  return {
    interpretationType: 'validation_blocked',
    concepts: uniqueBlockedConceptIds,
    targetConceptId: blockedConceptId,
    message: blockedConceptId
      ? `The authored concept "${blockedConceptId}" is currently blocked by validator law enforcement and is not actionable in the runtime.`
      : 'This authored concept is currently blocked by validator law enforcement and is not actionable in the runtime.',
  };
}

function buildValidationBlockedResponse(baseResponse, blockedConceptIds) {
  return {
    ...baseResponse,
    type: 'no_exact_match',
    interpretation: buildValidationBlockedInterpretation(blockedConceptIds),
    resolution: {
      method: 'no_exact_match',
    },
    message: NO_EXACT_MATCH_MESSAGE,
    suggestions: [],
  };
}

function isBlockedConceptId(conceptId) {
  return getConceptRuntimeGovernanceState(conceptId).isBlocked;
}

function filterActionableSuggestions(suggestions) {
  return suggestions.filter((suggestion) => !isBlockedConceptId(suggestion.conceptId));
}

function filterActionableRelatedConcepts(relatedConcepts) {
  return relatedConcepts.filter((relatedConcept) => !isBlockedConceptId(relatedConcept.conceptId));
}

function filterActionableCandidates(candidates) {
  return candidates.filter((candidate) => !isBlockedConceptId(candidate.conceptId));
}

function traceGovernanceState(governanceState) {
  if (!governanceState) {
    return;
  }

  if (!governanceState.available) {
    process.stderr.write(
      `[chatpdm-runtime] governance state unavailable for concept "${governanceState.trace.conceptId}": ${governanceState.trace.unavailableReason}\n`,
    );
    return;
  }

  if (
    governanceState.isBlocked
    || governanceState.isStructurallyIncomplete
    || governanceState.enforcementStatus === 'warning_only'
    || governanceState.lawStatus === 'warning_only'
  ) {
    process.stderr.write(
      `[chatpdm-runtime] governance state for concept "${governanceState.trace.conceptId}": enforcement=${governanceState.enforcementStatus} system=${governanceState.systemValidationState} actionable=${governanceState.isActionable}\n`,
    );
  }
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
    const blockedConceptIds = (queryClassification.interpretation?.concepts ?? [])
      .filter((conceptId) => isBlockedConceptId(conceptId));

    if (blockedConceptIds.length > 0) {
      response = buildValidationBlockedResponse(baseResponse, blockedConceptIds);
    } else {
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
    }
  } else if (match.type === 'concept_match') {
    const governanceState = getConceptRuntimeGovernanceState(match.concept.conceptId);

    traceGovernanceState(governanceState);

    if (governanceState.isBlocked) {
      response = buildValidationBlockedResponse(baseResponse, [match.concept.conceptId]);
    } else {
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
          governanceState,
          registers: buildReadingRegistersForConcept(match.concept),
          contexts: match.concept.contexts.map(buildContextPayload),
          sources: match.concept.sources.map((source) => ({
            id: source.id,
            label: source.label,
            type: source.type,
            usedFor: source.usedFor,
          })),
          relatedConcepts: filterActionableRelatedConcepts(match.concept.relatedConcepts).map((relatedConcept) => (
            buildRelatedConceptPayload(relatedConcept, conceptIndex)
          )),
        },
      };
    }
  } else if (match.type === 'ambiguous_match') {
    const actionableCandidates = filterActionableCandidates(match.candidates);

    if (actionableCandidates.length === 0) {
      response = buildValidationBlockedResponse(
        baseResponse,
        match.candidates.map((candidate) => candidate.conceptId),
      );
    } else {
    response = {
      ...baseResponse,
      type: 'ambiguous_match',
      resolution: {
        method: match.method,
      },
      message: AMBIGUOUS_MATCH_MESSAGE,
      candidates: actionableCandidates,
    };
    }
  } else {
    const actionableSuggestions = filterActionableSuggestions(match.suggestions);
    response = {
      ...baseResponse,
      type: 'no_exact_match',
      resolution: {
        method: 'no_exact_match',
      },
      message: NO_EXACT_MATCH_MESSAGE,
      suggestions: actionableSuggestions,
    };
  }

  assertDeterministicPathFreeOfAiMarkers(response, 'Concept resolver response');
  return assertValidProductResponse(response);
}

module.exports = {
  resolveConceptQuery,
};
