'use strict';

const {
  buildConceptDetail,
} = require('./concept-detail-service');
const {
  ADMISSION_STATES,
  resolveAdmissionState,
} = require('./admission-gate');
const {
  normalizeQuery,
} = require('./normalizer');
const {
  resolveConceptQuery,
} = require('./resolver');
const {
  detectOutOfScopeInteractionQuery,
  extractMentionedOutOfScopeInteractionConceptIds,
  hasGovernanceKernelAnchor,
} = require('./interaction-kernel-boundary');
const {
  recognizeLegalVocabulary,
} = require('../legal-vocabulary');

const RESOLUTION_ENGINE_TYPES = Object.freeze({
  LIVE_RESOLUTION: 'LIVE_RESOLUTION',
  VISIBLE_INSPECTION: 'VISIBLE_INSPECTION',
  STRUCTURAL_REJECTION: 'STRUCTURAL_REJECTION',
  VOCAB_CLASSIFICATION: 'VOCAB_CLASSIFICATION',
  NO_MATCH: 'NO_MATCH',
});

function assertNormalizedQueryValue(normalizedQuery) {
  if (typeof normalizedQuery !== 'string') {
    throw new TypeError('Expected normalizedQuery to be a string.');
  }

  const recomputed = normalizeQuery(normalizedQuery);
  if (recomputed !== normalizedQuery) {
    throw new Error('Expected an already-normalized query value for the resolution engine.');
  }
}

function assertAdmissionState(admissionState) {
  if (!Object.values(ADMISSION_STATES).includes(admissionState)) {
    throw new Error(`Unsupported admission state "${admissionState}" for resolution engine.`);
  }
}

function assertAdmissionBoundaryConsistency(admissionState, normalizedQuery, vocabularyRecognition) {
  const expected = resolveAdmissionState(normalizedQuery, vocabularyRecognition).admission_state;

  if (expected !== admissionState) {
    throw new Error(
      `Resolution engine admission-state mismatch for "${normalizedQuery}": expected ${expected}, received ${admissionState}.`,
    );
  }
}

function buildLiveResolution(normalizedQuery) {
  const response = resolveConceptQuery(normalizedQuery);

  if (response.type !== 'concept_match') {
    const governanceUnavailable = response.type === 'no_exact_match'
      && response.interpretation?.interpretationType === 'validation_blocked'
      && typeof response.interpretation?.message === 'string'
      && /governance evidence is unavailable/i.test(response.interpretation.message);

    return {
      type: RESOLUTION_ENGINE_TYPES.NO_MATCH,
      payload: {
        normalized_query: normalizedQuery,
        reason: governanceUnavailable ? 'governance_unavailable' : 'no_live_concept_match',
      },
    };
  }

  return {
    type: RESOLUTION_ENGINE_TYPES.LIVE_RESOLUTION,
    payload: response,
  };
}

function buildVisibleInspection(normalizedQuery) {
  const detail = buildConceptDetail(normalizedQuery);

  if (!detail) {
    throw new Error(`Expected visible-only concept detail for "${normalizedQuery}".`);
  }

  return {
    type: RESOLUTION_ENGINE_TYPES.VISIBLE_INSPECTION,
    payload: detail,
  };
}

function buildStructuralRejection(normalizedQuery) {
  const response = resolveConceptQuery(normalizedQuery);

  if (response.type !== 'rejected_concept') {
    throw new Error(`Expected structural rejection for "${normalizedQuery}".`);
  }

  return {
    type: RESOLUTION_ENGINE_TYPES.STRUCTURAL_REJECTION,
    payload: response,
  };
}

function buildNotAConceptOutcome(normalizedQuery, vocabularyRecognition) {
  const interactionBoundaryQuery = detectOutOfScopeInteractionQuery(normalizedQuery);
  const mentionedInteractionTerms = extractMentionedOutOfScopeInteractionConceptIds(normalizedQuery);

  if (interactionBoundaryQuery) {
    return {
      type: RESOLUTION_ENGINE_TYPES.NO_MATCH,
      payload: {
        normalized_query: normalizedQuery,
        reason: 'out_of_scope_interaction_construct',
      },
    };
  }

  if (mentionedInteractionTerms.length > 0 && hasGovernanceKernelAnchor(normalizedQuery)) {
    return {
      type: RESOLUTION_ENGINE_TYPES.NO_MATCH,
      payload: {
        normalized_query: normalizedQuery,
        reason: 'anchored_interaction_construct_requires_governance_path',
      },
    };
  }

  if (vocabularyRecognition.recognized === true) {
    return {
      type: RESOLUTION_ENGINE_TYPES.VOCAB_CLASSIFICATION,
      payload: {
        recognized: true,
        type: 'vocab',
        classification: vocabularyRecognition.classification,
      },
    };
  }

  return {
    type: RESOLUTION_ENGINE_TYPES.NO_MATCH,
    payload: {
      normalized_query: normalizedQuery,
    },
  };
}

function resolveFromAdmissionState({ admission_state: admissionState, normalized_query: normalizedQuery }) {
  assertAdmissionState(admissionState);
  assertNormalizedQueryValue(normalizedQuery);

  const vocabularyRecognition = recognizeLegalVocabulary(normalizedQuery);
  assertAdmissionBoundaryConsistency(admissionState, normalizedQuery, vocabularyRecognition);

  if (admissionState === ADMISSION_STATES.LIVE) {
    return buildLiveResolution(normalizedQuery);
  }

  if (admissionState === ADMISSION_STATES.VISIBLE_ONLY) {
    return buildVisibleInspection(normalizedQuery);
  }

  if (admissionState === ADMISSION_STATES.REJECTED) {
    return buildStructuralRejection(normalizedQuery);
  }

  return buildNotAConceptOutcome(normalizedQuery, vocabularyRecognition);
}

module.exports = {
  ADMISSION_STATES,
  RESOLUTION_ENGINE_TYPES,
  resolveFromAdmissionState,
};
