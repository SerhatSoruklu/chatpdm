'use strict';

const {
  normalizeQuery,
} = require('./normalizer');
const {
  recognizeLegalVocabulary,
} = require('../legal-vocabulary');
const {
  resolveAdmissionState,
} = require('./admission-gate');
const {
  resolveFromAdmissionState,
} = require('./resolution-engine');
const {
  validateAndExposeOutput,
} = require('./output-validation-gate');

const PIPELINE_PHASE_PATH = Object.freeze([0, 1, 2, 3, 4, 5]);

function runFullPipeline(rawQuery) {
  if (typeof rawQuery !== 'string') {
    throw new TypeError('Expected rawQuery to be a string.');
  }

  if (rawQuery.length === 0) {
    throw new TypeError('Expected rawQuery to be a non-empty string.');
  }

  const normalizedQuery = normalizeQuery(rawQuery);
  const vocabularyRecognition = recognizeLegalVocabulary(normalizedQuery);
  const admission = resolveAdmissionState(normalizedQuery, vocabularyRecognition);
  const routedAdmissionState = admission.admission_state;
  const resolutionOutput = resolveFromAdmissionState({
    admission_state: routedAdmissionState,
    normalized_query: normalizedQuery,
  });
  const finalOutput = validateAndExposeOutput(resolutionOutput);

  return {
    raw_query: rawQuery,
    normalized_query: normalizedQuery,
    vocabulary_recognition: vocabularyRecognition,
    admission_state: routedAdmissionState,
    resolution_output: resolutionOutput,
    final_output: finalOutput,
    phase_path: [...PIPELINE_PHASE_PATH],
  };
}

module.exports = {
  PIPELINE_PHASE_PATH,
  runFullPipeline,
};
