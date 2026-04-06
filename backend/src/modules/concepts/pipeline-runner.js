'use strict';

const {
  recognizeLegalVocabulary,
} = require('../legal-vocabulary');
const {
  normalizeChatPdmInput,
} = require('../../normalization/normalization.pipeline.ts');
const {
  resolveAdmissionState,
  ADMISSION_STATES,
} = require('./admission-gate');
const {
  resolveFromAdmissionState,
} = require('./resolution-engine');
const {
  validateAndExposeOutput,
} = require('./output-validation-gate');
const {
  buildZeroglareDiagnostics,
} = require('./zeroglare-diagnostics');
const {
  evaluatePreResolutionGuard,
} = require('./pre-resolution-guard');

const PIPELINE_PHASE_PATH = Object.freeze([0, 1, 2, 3, 4, 5]);

function runFullPipeline(rawQuery) {
  if (typeof rawQuery !== 'string') {
    throw new TypeError('Expected rawQuery to be a string.');
  }

  const normalization = normalizeChatPdmInput(rawQuery);
  const downstreamQuery = normalization.status === 'refused'
    ? rawQuery
    : normalization.canonicalText;

  if (normalization.status === 'refused') {
    const resolutionOutput = {
      type: 'NO_MATCH',
      payload: {
        normalized_query: downstreamQuery,
        reason: 'normalization_refused',
        normalization_refusal_code: normalization.refusalCode,
      },
    };
    const finalOutput = validateAndExposeOutput(resolutionOutput);
    const zeroglareDiagnostics = buildZeroglareDiagnostics(downstreamQuery);
    const pipelineResult = {
      raw_query: rawQuery,
      normalized_query: downstreamQuery,
      vocabulary_recognition: {
        recognized: false,
        type: 'unknown',
      },
      admission_state: ADMISSION_STATES.NOT_A_CONCEPT,
      resolution_output: resolutionOutput,
      final_output: finalOutput,
      normalization,
      phase_path: [...PIPELINE_PHASE_PATH],
    };

    Object.defineProperty(pipelineResult, 'zeroglare_diagnostics', {
      value: zeroglareDiagnostics,
      enumerable: false,
      configurable: false,
      writable: false,
    });

    return pipelineResult;
  }

  const preResolutionGuard = evaluatePreResolutionGuard(downstreamQuery);
  const normalizedQuery = preResolutionGuard.normalizedQuery;
  const vocabularyRecognition = recognizeLegalVocabulary(normalizedQuery);

  if (preResolutionGuard.refused) {
    const resolutionOutput = {
      type: 'NO_MATCH',
      payload: {
        normalized_query: normalizedQuery,
        reason: preResolutionGuard.reason,
      },
    };
    const finalOutput = validateAndExposeOutput(resolutionOutput);
    const zeroglareDiagnostics = buildZeroglareDiagnostics(downstreamQuery);
    const pipelineResult = {
      raw_query: rawQuery,
      normalized_query: normalizedQuery,
      vocabulary_recognition: vocabularyRecognition,
      admission_state: ADMISSION_STATES.NOT_A_CONCEPT,
      resolution_output: resolutionOutput,
      final_output: finalOutput,
      normalization,
      phase_path: [...PIPELINE_PHASE_PATH],
    };

    Object.defineProperty(pipelineResult, 'zeroglare_diagnostics', {
      value: zeroglareDiagnostics,
      enumerable: false,
      configurable: false,
      writable: false,
    });

    return pipelineResult;
  }

  const admission = resolveAdmissionState(normalizedQuery, vocabularyRecognition);
  const routedAdmissionState = admission.admission_state;
  const resolutionOutput = resolveFromAdmissionState({
    admission_state: routedAdmissionState,
    normalized_query: normalizedQuery,
  });
  const finalOutput = validateAndExposeOutput(resolutionOutput);
  const zeroglareDiagnostics = buildZeroglareDiagnostics(downstreamQuery);

  const pipelineResult = {
    raw_query: rawQuery,
    normalized_query: normalizedQuery,
    vocabulary_recognition: vocabularyRecognition,
    admission_state: routedAdmissionState,
    resolution_output: resolutionOutput,
    final_output: finalOutput,
    normalization,
    phase_path: [...PIPELINE_PHASE_PATH],
  };

  Object.defineProperty(pipelineResult, 'zeroglare_diagnostics', {
    value: zeroglareDiagnostics,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  return pipelineResult;
}

module.exports = {
  PIPELINE_PHASE_PATH,
  runFullPipeline,
};
