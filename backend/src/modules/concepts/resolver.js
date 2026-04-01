'use strict';

const {
  AMBIGUOUS_MATCH_MESSAGE,
  CONCEPT_SET_VERSION,
  CONTRACT_VERSION,
  INVALID_QUERY_MESSAGE,
  MATCHER_VERSION,
  NORMALIZER_VERSION,
  NO_EXACT_MATCH_MESSAGE,
  REJECTED_CONCEPT_MESSAGE,
  UNSUPPORTED_QUERY_TYPE_MESSAGE,
} = require('./constants');
const {
  VISIBLE_ONLY_PUBLIC_CONCEPT_IDS,
  isLiveConceptId,
  isVisibleOnlyConceptId,
} = require('./admission-state');
const {
  loadConceptSet,
} = require('./concept-loader');
const { getConceptRuntimeGovernanceState } = require('./concept-validation-state-loader');
const { buildReadingRegistersForConcept } = require('./reading-registers');
const { getConceptReviewState } = require('./concept-review-state-loader');
const { loadResolveRules } = require('./resolve-rules-loader');
const { getRejectedConceptRecord } = require('./rejection-registry-loader');
const { assertSingleRuntimeResolutionState } = require('./runtime-resolution-state');
const { matchQuery } = require('./matcher');
const { extractCanonicalId, normalizeQuery } = require('./normalizer');
const { classifyQueryShape } = require('./query-shape-classifier');
const { resolveComparisonQuery } = require('./comparison-resolver');
const { detectGovernanceScopeEnforcement } = require('./governance-scope-enforcer');
const { detectOutOfScopeInteractionQuery } = require('./interaction-kernel-boundary');
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

function buildRejectedConceptResponse(query, normalizedQuery, conceptId, queryType, rejectionRecord) {
  return {
    query,
    normalizedQuery,
    contractVersion: CONTRACT_VERSION,
    normalizerVersion: NORMALIZER_VERSION,
    matcherVersion: MATCHER_VERSION,
    conceptSetVersion: CONCEPT_SET_VERSION,
    queryType,
    interpretation: {
      interpretationType: 'explicitly_rejected_concept',
      targetConceptId: conceptId,
      concepts: [conceptId],
      message: `The concept "${conceptId}" is explicitly rejected under the current system state.`,
    },
    type: 'rejected_concept',
    resolution: {
      method: 'rejection_registry',
      conceptId,
    },
    message: REJECTED_CONCEPT_MESSAGE,
    rejection: {
      status: rejectionRecord.status,
      decisionType: rejectionRecord.decisionType,
      finality: rejectionRecord.finality,
    },
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

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function detectVisibleOnlyConceptIds(normalizedQuery) {
  if (typeof normalizedQuery !== 'string' || normalizedQuery.trim() === '') {
    return [];
  }

  return VISIBLE_ONLY_PUBLIC_CONCEPT_IDS.filter((conceptId) => {
    const pattern = new RegExp(`(^| )${escapePattern(conceptId)}( |$)`);
    return pattern.test(normalizedQuery);
  });
}

function buildVisibleOnlyConceptInterpretation({
  targetConceptId = null,
  concepts = [],
  comparison = false,
}) {
  const derivedVisibleOnlyConcepts = (targetConceptId ? [targetConceptId] : concepts)
    .filter((conceptId) => getConceptReviewState(conceptId)?.admission === 'visible_only_derived');
  const isDerivedVisibleOnly = derivedVisibleOnlyConcepts.length > 0;

  if (comparison) {
    return {
      interpretationType: 'visible_only_public_concept',
      concepts,
      message: isDerivedVisibleOnly
        ? 'This query refers to a derived visible-only concept that remains inspectable but is not admitted to live runtime comparison.'
        : 'This query refers to visible-only public concepts that are inspectable but not admitted to live runtime comparison.',
    };
  }

  return {
    interpretationType: 'visible_only_public_concept',
    targetConceptId,
    concepts: targetConceptId ? [targetConceptId] : concepts,
    message: targetConceptId
      ? (
        isDerivedVisibleOnly
          ? `The concept "${targetConceptId}" is inspectable as a derived concept computed from duty evaluation, but it is not admitted to the live public runtime.`
          : `The concept "${targetConceptId}" is visible in public scope and detail, but it is not admitted to the live public runtime.`
      )
      : 'This concept is visible in public scope and detail, but it is not admitted to the live public runtime.',
  };
}

function buildVisibleOnlyConceptResponse(baseResponse, interpretation) {
  return {
    ...baseResponse,
    type: 'no_exact_match',
    interpretation,
    resolution: {
      method: 'no_exact_match',
    },
    message: NO_EXACT_MATCH_MESSAGE,
    suggestions: [],
  };
}

function traceAdmissionBoundaryWarning(kind, conceptIds) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  process.stderr.write(
    `[chatpdm-runtime] admission boundary warning (${kind}): visible-only concept reached live-only path for ${conceptIds.join(', ')}\n`,
  );
}

function buildInvalidQueryResponse(baseResponse) {
  return {
    ...baseResponse,
    type: 'invalid_query',
    resolution: {
      method: 'invalid_query',
    },
    message: INVALID_QUERY_MESSAGE,
  };
}

function buildUnsupportedQueryTypeResponse(baseResponse) {
  return {
    ...baseResponse,
    type: 'unsupported_query_type',
    resolution: {
      method: 'unsupported_query_type',
    },
    message: UNSUPPORTED_QUERY_TYPE_MESSAGE,
  };
}

function finalizeResolvedResponse(response) {
  assertSingleRuntimeResolutionState(response);
  assertDeterministicPathFreeOfAiMarkers(response, 'Concept resolver response');
  return assertValidProductResponse(response);
}

function isBlockedConceptId(conceptId) {
  return getConceptRuntimeGovernanceState(conceptId).isBlocked;
}

function filterActionableSuggestions(suggestions) {
  return suggestions.filter((suggestion) => !isBlockedConceptId(suggestion.conceptId));
}

function filterActionableRelatedConcepts(relatedConcepts, conceptIndex) {
  return relatedConcepts.filter((relatedConcept) => {
    if (isBlockedConceptId(relatedConcept.conceptId)) {
      return false;
    }

    if (!conceptIndex.has(relatedConcept.conceptId)) {
      if (isVisibleOnlyConceptId(relatedConcept.conceptId)) {
        traceAdmissionBoundaryWarning('related_concept', [relatedConcept.conceptId]);
      }

      return false;
    }

    return true;
  });
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

  const normalizedQuery = normalizeQuery(rawQuery);
  const canonicalId = extractCanonicalId(rawQuery);
  const visibleOnlyCanonicalConceptId = canonicalId !== null && isVisibleOnlyConceptId(canonicalId)
    ? canonicalId
    : null;
  const rejectedConcept = getRejectedConceptRecord(canonicalId !== null ? canonicalId : normalizedQuery);

  if (rejectedConcept) {
    const response = buildRejectedConceptResponse(
      rawQuery,
      normalizedQuery,
      rejectedConcept.conceptId,
      canonicalId !== null ? 'canonical_id_query' : 'exact_concept_query',
      rejectedConcept,
    );

    return finalizeResolvedResponse(response);
  }

  const concepts = loadConceptSet();
  const resolveRules = loadResolveRules();
  const conceptIndex = new Map(concepts.map((concept) => [concept.conceptId, concept]));
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
  const visibleOnlyMentionedConceptIds = detectVisibleOnlyConceptIds(normalizedQuery);
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

    return finalizeResolvedResponse(response);
  }

  const interactionBoundaryQuery = detectOutOfScopeInteractionQuery(
    canonicalId !== null ? canonicalId : normalizedQuery,
  );

  if (interactionBoundaryQuery) {
    response = {
      ...baseResponse,
      type: 'no_exact_match',
      interpretation: {
        interpretationType: 'out_of_scope',
        targetConceptId: interactionBoundaryQuery.targetConceptId,
        concepts: interactionBoundaryQuery.concepts,
        message: interactionBoundaryQuery.message,
      },
      resolution: {
        method: 'out_of_scope',
      },
      message: NO_EXACT_MATCH_MESSAGE,
      suggestions: [],
    };

    return finalizeResolvedResponse(response);
  }

  if (visibleOnlyCanonicalConceptId) {
    response = buildVisibleOnlyConceptResponse(
      baseResponse,
      buildVisibleOnlyConceptInterpretation({
        targetConceptId: visibleOnlyCanonicalConceptId,
      }),
    );

    return finalizeResolvedResponse(response);
  }

  if (
    queryClassification.queryType === 'exact_concept_query'
    && isVisibleOnlyConceptId(normalizedQuery)
  ) {
    response = buildVisibleOnlyConceptResponse(
      baseResponse,
      buildVisibleOnlyConceptInterpretation({
        targetConceptId: normalizedQuery,
      }),
    );

    return finalizeResolvedResponse(response);
  }

  if (queryClassification.queryType === 'invalid_query') {
    response = buildInvalidQueryResponse(baseResponse);
  } else if (
    queryClassification.queryType === 'role_or_actor_query'
    || queryClassification.queryType === 'relation_query'
    || (
      queryClassification.queryType === 'unsupported_complex_query'
      && (match.type !== 'no_exact_match' || match.suggestions.length === 0)
    )
  ) {
    response = buildUnsupportedQueryTypeResponse(baseResponse);
  } else if (queryClassification.queryType === 'comparison_query') {
    if (visibleOnlyMentionedConceptIds.length > 0) {
      response = buildVisibleOnlyConceptResponse(
        baseResponse,
        buildVisibleOnlyConceptInterpretation({
          concepts: visibleOnlyMentionedConceptIds,
          comparison: true,
        }),
      );

      return finalizeResolvedResponse(response);
    }

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
    if (!isLiveConceptId(match.concept.conceptId)) {
      traceAdmissionBoundaryWarning('concept_match', [match.concept.conceptId]);
      response = buildVisibleOnlyConceptResponse(
        baseResponse,
        buildVisibleOnlyConceptInterpretation({
          targetConceptId: match.concept.conceptId,
        }),
      );

      return finalizeResolvedResponse(response);
    }

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
          relatedConcepts: filterActionableRelatedConcepts(match.concept.relatedConcepts, conceptIndex).map((relatedConcept) => (
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

  return finalizeResolvedResponse(response);
}

module.exports = {
  resolveConceptQuery,
};
