'use strict';

const {
  isLiveConceptId,
  isVisibleOnlyConceptId,
} = require('./admission-state');
const {
  normalizeQuery,
} = require('./normalizer');
const {
  getRejectedConceptRecord,
} = require('./rejection-registry-loader');

const ADMISSION_STATES = Object.freeze({
  LIVE: 'LIVE',
  VISIBLE_ONLY: 'VISIBLE_ONLY',
  REJECTED: 'REJECTED',
  NOT_A_CONCEPT: 'NOT_A_CONCEPT',
});

function assertNormalizedQueryValue(normalizedQuery) {
  if (typeof normalizedQuery !== 'string') {
    throw new TypeError('Expected normalizedQuery to be a string.');
  }

  const recomputed = normalizeQuery(normalizedQuery);
  if (recomputed !== normalizedQuery) {
    throw new Error('Expected an already-normalized query value for concept admission gate.');
  }
}

function assertVocabularyRecognitionShape(vocabularyRecognition) {
  if (vocabularyRecognition == null) {
    return;
  }

  if (!vocabularyRecognition || typeof vocabularyRecognition !== 'object' || Array.isArray(vocabularyRecognition)) {
    throw new TypeError('Expected vocabularyRecognition to be an object when provided.');
  }

  if (typeof vocabularyRecognition.recognized !== 'boolean') {
    throw new Error('Expected vocabularyRecognition.recognized to be boolean.');
  }

  if (vocabularyRecognition.type !== 'vocab' && vocabularyRecognition.type !== 'unknown') {
    throw new Error('Expected vocabularyRecognition.type to be "vocab" or "unknown".');
  }

  if (vocabularyRecognition.recognized) {
    if (vocabularyRecognition.type !== 'vocab') {
      throw new Error('Recognized vocabulary must declare type "vocab".');
    }

    if (typeof vocabularyRecognition.classification !== 'string' || vocabularyRecognition.classification.trim() === '') {
      throw new Error('Recognized vocabulary must declare a non-empty classification.');
    }
  }
}

function resolveAdmissionState(normalizedQuery, vocabularyRecognition = null) {
  assertNormalizedQueryValue(normalizedQuery);
  assertVocabularyRecognitionShape(vocabularyRecognition);

  if (isLiveConceptId(normalizedQuery)) {
    return {
      admission_state: ADMISSION_STATES.LIVE,
    };
  }

  if (isVisibleOnlyConceptId(normalizedQuery)) {
    return {
      admission_state: ADMISSION_STATES.VISIBLE_ONLY,
    };
  }

  if (getRejectedConceptRecord(normalizedQuery)) {
    return {
      admission_state: ADMISSION_STATES.REJECTED,
    };
  }

  if (vocabularyRecognition?.recognized === true) {
    return {
      admission_state: ADMISSION_STATES.NOT_A_CONCEPT,
    };
  }

  return {
    admission_state: ADMISSION_STATES.NOT_A_CONCEPT,
  };
}

module.exports = {
  ADMISSION_STATES,
  resolveAdmissionState,
};
