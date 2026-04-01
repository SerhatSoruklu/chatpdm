'use strict';

const {
  assertDeterministicPathFreeOfAiMarkers,
} = require('../../lib/ai-governance-guard');
const {
  RESOLUTION_ENGINE_TYPES,
} = require('./resolution-engine');

const FINAL_OUTPUT_STATES = Object.freeze({
  valid: 'valid',
  refused: 'refused',
  classified: 'classified',
});

const OUTPUT_TYPE_TO_FINAL_STATE = Object.freeze({
  [RESOLUTION_ENGINE_TYPES.LIVE_RESOLUTION]: FINAL_OUTPUT_STATES.valid,
  [RESOLUTION_ENGINE_TYPES.VISIBLE_INSPECTION]: FINAL_OUTPUT_STATES.valid,
  [RESOLUTION_ENGINE_TYPES.STRUCTURAL_REJECTION]: FINAL_OUTPUT_STATES.refused,
  [RESOLUTION_ENGINE_TYPES.VOCAB_CLASSIFICATION]: FINAL_OUTPUT_STATES.classified,
  [RESOLUTION_ENGINE_TYPES.NO_MATCH]: FINAL_OUTPUT_STATES.refused,
});

const VOCAB_LEAKAGE_KEYS = Object.freeze([
  'answer',
  'conceptId',
  'governanceState',
  'interpretation',
  'readingRegisters',
  'rejection',
  'relatedConcepts',
  'resolution',
  'reviewState',
  'sources',
  'targetConceptId',
]);

function buildValidationFailure() {
  return {
    state: FINAL_OUTPUT_STATES.refused,
    reason: 'output_validation_failed',
  };
}

function assertObjectShape(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertResolutionOutputShape(resolutionOutput) {
  assertObjectShape(resolutionOutput, 'Resolution output');

  if (typeof resolutionOutput.type !== 'string' || resolutionOutput.type.trim() === '') {
    throw new Error('Resolution output must declare a non-empty type.');
  }

  if (!Object.prototype.hasOwnProperty.call(resolutionOutput, 'payload')) {
    throw new Error('Resolution output must declare payload.');
  }

  assertObjectShape(resolutionOutput.payload, 'Resolution output payload');

  const mappedState = OUTPUT_TYPE_TO_FINAL_STATE[resolutionOutput.type] ?? null;
  if (!mappedState) {
    throw new Error(`Unsupported resolution output type "${resolutionOutput.type}".`);
  }

  return mappedState;
}

function assertNoVocabConceptLeakage(payload) {
  const leakedKey = VOCAB_LEAKAGE_KEYS.find((key) => Object.prototype.hasOwnProperty.call(payload, key));

  if (leakedKey) {
    throw new Error(`Vocabulary classification payload must not leak concept field "${leakedKey}".`);
  }
}

function assertPayloadMatchesType(type, payload) {
  if (type === RESOLUTION_ENGINE_TYPES.LIVE_RESOLUTION) {
    if (payload.type !== 'concept_match') {
      throw new Error('LIVE_RESOLUTION payload must remain canonical concept resolution.');
    }

    return;
  }

  if (type === RESOLUTION_ENGINE_TYPES.VISIBLE_INSPECTION) {
    if (typeof payload.conceptId !== 'string' || payload.conceptId.trim() === '') {
      throw new Error('VISIBLE_INSPECTION payload must expose inspectable concept detail.');
    }

    return;
  }

  if (type === RESOLUTION_ENGINE_TYPES.STRUCTURAL_REJECTION) {
    if (payload.type !== 'rejected_concept') {
      throw new Error('STRUCTURAL_REJECTION payload must remain governed rejection output.');
    }

    return;
  }

  if (type === RESOLUTION_ENGINE_TYPES.VOCAB_CLASSIFICATION) {
    if (payload.recognized !== true || payload.type !== 'vocab') {
      throw new Error('VOCAB_CLASSIFICATION payload must remain pure vocabulary classification.');
    }

    if (typeof payload.classification !== 'string' || payload.classification.trim() === '') {
      throw new Error('VOCAB_CLASSIFICATION payload must declare a classification.');
    }

    assertNoVocabConceptLeakage(payload);
    return;
  }

  if (type === RESOLUTION_ENGINE_TYPES.NO_MATCH) {
    if (typeof payload.normalized_query !== 'string' || payload.normalized_query.trim() === '') {
      throw new Error('NO_MATCH payload must preserve normalized_query.');
    }
  }
}

function validateAndExposeOutput(resolutionOutput) {
  try {
    const finalState = assertResolutionOutputShape(resolutionOutput);

    assertDeterministicPathFreeOfAiMarkers(
      resolutionOutput,
      'Phase 5 output validation gate',
    );
    assertPayloadMatchesType(resolutionOutput.type, resolutionOutput.payload);

    return {
      state: finalState,
      type: resolutionOutput.type,
      payload: resolutionOutput.payload,
    };
  } catch (error) {
    return buildValidationFailure();
  }
}

module.exports = {
  FINAL_OUTPUT_STATES,
  OUTPUT_TYPE_TO_FINAL_STATE,
  validateAndExposeOutput,
};
