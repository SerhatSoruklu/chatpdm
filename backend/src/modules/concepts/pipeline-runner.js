'use strict';

const {
  recognizeLegalVocabulary,
} = require('../legal-vocabulary');
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
const {
  assertNotZeeArtifact,
} = require('../../lib/zee-governance-guard');

const PIPELINE_PHASE_PATH = Object.freeze([0, 1, 2, 3, 4, 5]);

function buildRuntimeTelemetry({
  phasePath,
  preResolutionGuard,
  vocabularyRecognition,
  admissionState,
  resolutionOutput,
  finalOutput,
  zeroglareDiagnostics,
}) {
  const resolutionReason = typeof resolutionOutput?.payload?.reason === 'string'
    ? resolutionOutput.payload.reason
    : null;

  return Object.freeze({
    phase_path: Object.freeze([...phasePath]),
    pre_resolution_guard: Object.freeze({
      refused: preResolutionGuard.refused,
      reason: preResolutionGuard.reason,
      query_type: preResolutionGuard.queryType,
      matched_reasons: Object.freeze([...preResolutionGuard.matchedReasons]),
      domain: preResolutionGuard.domain,
    }),
    vocabulary_recognition: Object.freeze({
      recognized: vocabularyRecognition.recognized === true,
      classification: typeof vocabularyRecognition.classification === 'string'
        ? vocabularyRecognition.classification
        : null,
    }),
    admission_state: admissionState,
    resolution_type: resolutionOutput.type,
    resolution_reason: resolutionReason,
    final_state: finalOutput.state,
    final_type: finalOutput.type,
    final_reason: typeof finalOutput.reason === 'string' ? finalOutput.reason : null,
    zeroglare: Object.freeze({
      status: zeroglareDiagnostics.status,
      primary_signal: zeroglareDiagnostics.summary.primary_signal,
      active_signals: Object.freeze([...zeroglareDiagnostics.summary.active_signals]),
    }),
  });
}

function runFullPipeline(rawQuery) {
  assertNotZeeArtifact(rawQuery, 'Concept runtime pipeline input');

  if (typeof rawQuery !== 'string') {
    throw new TypeError('Expected rawQuery to be a string.');
  }

  const preResolutionGuard = evaluatePreResolutionGuard(rawQuery);
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
    const zeroglareDiagnostics = buildZeroglareDiagnostics(rawQuery);
    const runtimeTelemetry = buildRuntimeTelemetry({
      phasePath: PIPELINE_PHASE_PATH,
      preResolutionGuard,
      vocabularyRecognition,
      admissionState: ADMISSION_STATES.NOT_A_CONCEPT,
      resolutionOutput,
      finalOutput,
      zeroglareDiagnostics,
    });
    const pipelineResult = {
      raw_query: rawQuery,
      normalized_query: normalizedQuery,
      vocabulary_recognition: vocabularyRecognition,
      admission_state: ADMISSION_STATES.NOT_A_CONCEPT,
      resolution_output: resolutionOutput,
      final_output: finalOutput,
      phase_path: [...PIPELINE_PHASE_PATH],
    };

    Object.defineProperty(pipelineResult, 'zeroglare_diagnostics', {
      value: zeroglareDiagnostics,
      enumerable: false,
      configurable: false,
      writable: false,
    });
    Object.defineProperty(pipelineResult, 'runtime_telemetry', {
      value: runtimeTelemetry,
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
  const zeroglareDiagnostics = buildZeroglareDiagnostics(rawQuery);
  const runtimeTelemetry = buildRuntimeTelemetry({
    phasePath: PIPELINE_PHASE_PATH,
    preResolutionGuard: preResolutionGuard,
    vocabularyRecognition,
    admissionState: routedAdmissionState,
    resolutionOutput,
    finalOutput,
    zeroglareDiagnostics,
  });

  const pipelineResult = {
    raw_query: rawQuery,
    normalized_query: normalizedQuery,
    vocabulary_recognition: vocabularyRecognition,
    admission_state: routedAdmissionState,
    resolution_output: resolutionOutput,
    final_output: finalOutput,
    phase_path: [...PIPELINE_PHASE_PATH],
  };

  Object.defineProperty(pipelineResult, 'zeroglare_diagnostics', {
    value: zeroglareDiagnostics,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  Object.defineProperty(pipelineResult, 'runtime_telemetry', {
    value: runtimeTelemetry,
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
