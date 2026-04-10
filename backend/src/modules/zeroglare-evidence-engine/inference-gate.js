'use strict';

const {
  ZEE_INTERNAL_ENGINE_ERROR_CODES,
  ZEE_INTERNAL_ENGINE_INFERENCE_LAYER,
  ZEE_INTERNAL_ENGINE_INFERENCE_MIN_SUPPORT,
  ZEE_INTERNAL_ENGINE_INFERENCE_NON_AUTHORITATIVE_NOTE,
  ZEE_INTERNAL_ENGINE_INFERENCE_NOTE,
  ZEE_INTERNAL_ENGINE_INFERENCE_REJECTED_CLAIM_TYPES,
  ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORTED_CLAIM_TYPES,
  ZEE_INTERNAL_ENGINE_INFERENCE_UNKNOWN_TYPES,
  ZEE_INTERNAL_ENGINE_INFERENCE_VERSION,
  ZEE_INTERNAL_ENGINE_MEASUREMENT_LAYER,
  ZEE_INTERNAL_ENGINE_STABILITY_LAYER,
} = require('./constants');
const { ZeeObservedInputError } = require('./input-contract');

const MEASUREMENT_KIND_PRIORITY = new Map(
  ['dominant_color', 'visible_region'].map((kind, index) => [kind, index]),
);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !Buffer.isBuffer(value);
}

function makeNote(code, message, details) {
  const note = {
    code,
    message,
  };

  if (details !== undefined) {
    note.details = details;
  }

  return note;
}

function compareMeasurementOrder(left, right) {
  return (
    (MEASUREMENT_KIND_PRIORITY.get(left.signalKind) ?? Number.MAX_SAFE_INTEGER)
    - (MEASUREMENT_KIND_PRIORITY.get(right.signalKind) ?? Number.MAX_SAFE_INTEGER)
    || String(left.measurementType).localeCompare(String(right.measurementType))
    || String(left.stableSignalId).localeCompare(String(right.stableSignalId))
  );
}

function normalizeMeasuredSignal(measurement, index) {
  if (!isPlainObject(measurement)) {
    throw new ZeeObservedInputError(
      `Measured signal ${index + 1} must be a non-null object.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (measurement.status !== 'measured') {
    throw new ZeeObservedInputError(
      `Inference gate only accepts measured signals; signal ${index + 1} is "${measurement.status ?? 'unknown'}".`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  const stableSignalId = typeof measurement.stableSignalId === 'string' && measurement.stableSignalId.trim() !== ''
    ? measurement.stableSignalId.trim()
    : null;
  const signalKind = typeof measurement.signalKind === 'string' && measurement.signalKind.trim() !== ''
    ? measurement.signalKind.trim()
    : null;
  const measurementType = typeof measurement.measurementType === 'string' && measurement.measurementType.trim() !== ''
    ? measurement.measurementType.trim()
    : null;

  if (!stableSignalId || !signalKind || !measurementType) {
    throw new ZeeObservedInputError(
      `Measured signal ${index + 1} must include stableSignalId, signalKind, and measurementType.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  return {
    measurementDiagnostics: Array.isArray(measurement.measurementDiagnostics)
      ? measurement.measurementDiagnostics.filter(isPlainObject)
      : [],
    measurementType,
    measurementValue: measurement.measurementValue,
    signalKind,
    stableSignalId,
    status: 'measured',
  };
}

function normalizeInferenceInput(input) {
  if (!isPlainObject(input)) {
    throw new ZeeObservedInputError(
      'ZEE inference gate input must be a non-null object containing measured signals.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (input.layer !== ZEE_INTERNAL_ENGINE_MEASUREMENT_LAYER) {
    throw new ZeeObservedInputError(
      `ZEE inference gate expects a "${ZEE_INTERNAL_ENGINE_MEASUREMENT_LAYER}" report.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (input.sourceLayer !== ZEE_INTERNAL_ENGINE_STABILITY_LAYER) {
    throw new ZeeObservedInputError(
      `ZEE inference gate expects measurement input produced by the "${ZEE_INTERNAL_ENGINE_STABILITY_LAYER}" layer.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (!Array.isArray(input.measurements)) {
    throw new ZeeObservedInputError(
      'ZEE inference gate input must include a measurements array.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  const normalizedMeasurements = [];
  const seenSignalIds = new Set();

  input.measurements.forEach((measurement, index) => {
    const normalizedMeasurement = normalizeMeasuredSignal(measurement, index);

    if (seenSignalIds.has(normalizedMeasurement.stableSignalId)) {
      return;
    }

    seenSignalIds.add(normalizedMeasurement.stableSignalId);
    normalizedMeasurements.push(normalizedMeasurement);
  });

  return {
    frameCount: Number.isInteger(input.frameCount) && input.frameCount >= 0
      ? input.frameCount
      : normalizedMeasurements.length,
    measurements: normalizedMeasurements.sort(compareMeasurementOrder),
    sourceLayer: input.sourceLayer,
    sourceVersion: typeof input.sourceVersion === 'string' ? input.sourceVersion : null,
  };
}

function buildSignalSnapshot(measurement) {
  return {
    measurement_diagnostics: measurement.measurementDiagnostics,
    measurement_type: measurement.measurementType,
    measurement_value: measurement.measurementValue,
    signal_kind: measurement.signalKind,
    stable_signal_id: measurement.stableSignalId,
  };
}

function buildSupportedInference(measurements) {
  if (measurements.length < ZEE_INTERNAL_ENGINE_INFERENCE_MIN_SUPPORT) {
    return null;
  }

  const supportingSignals = measurements.map(buildSignalSnapshot);
  const supportSignalIds = supportingSignals.map((signal) => signal.stable_signal_id);
  const supportSignalKinds = [...new Set(supportingSignals.map((signal) => signal.signal_kind))];
  const supportMeasurementTypes = [...new Set(supportingSignals.map((signal) => signal.measurement_type))];

  return {
    claim: 'Multiple independent measured signals support a bounded structural similarity claim.',
    claim_type: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORTED_CLAIM_TYPES[0],
    inference_id: `multi_signal_structural_similarity:${supportSignalIds[0]}`,
    inference_type: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORTED_CLAIM_TYPES[0],
    reasoning: [
      makeNote(
        'multi_signal_requirement',
        `Inference support requires at least ${ZEE_INTERNAL_ENGINE_INFERENCE_MIN_SUPPORT} independent measured signals; ${supportingSignals.length} were provided.`,
        {
          measuredSignalCount: supportingSignals.length,
          minimumSupport: ZEE_INTERNAL_ENGINE_INFERENCE_MIN_SUPPORT,
        },
      ),
      makeNote(
        'independence_check',
        'Each supporting signal has a distinct stable signal identifier.',
        {
          supportingSignalIds: supportSignalIds,
        },
      ),
      makeNote(
        'signal_diversity',
        'The gate preserves the measured signal set without turning it into identity, intent, location, or truth claims.',
        {
          distinctMeasurementTypes: supportMeasurementTypes,
          distinctSignalKinds: supportSignalKinds,
        },
      ),
    ],
    status: 'supported',
    support_summary: {
      distinct_measurement_type_count: supportMeasurementTypes.length,
      distinct_signal_kind_count: supportSignalKinds.length,
      supporting_signal_count: supportingSignals.length,
    },
    supporting_signals: supportingSignals,
  };
}

function buildRejectedSingleSignalClaim(measurements) {
  return {
    claim: 'A single measured signal cannot support inference.',
    claim_type: 'single_signal_inference',
    reasoning: [
      makeNote(
        'insufficient_signal_support',
        `Inference requires at least ${ZEE_INTERNAL_ENGINE_INFERENCE_MIN_SUPPORT} independent measured signals.`,
        {
          measuredSignalCount: measurements.length,
          minimumSupport: ZEE_INTERNAL_ENGINE_INFERENCE_MIN_SUPPORT,
        },
      ),
    ],
    reason: makeNote(
      'insufficient_signal_support',
      `Inference requires at least ${ZEE_INTERNAL_ENGINE_INFERENCE_MIN_SUPPORT} independent measured signals.`,
      {
        measuredSignalCount: measurements.length,
      },
    ),
    status: 'rejected',
    supporting_signals: measurements.map(buildSignalSnapshot),
  };
}

function buildRejectedScopeClaim(claimType, claim, code, message) {
  return {
    claim,
    claim_type: claimType,
    reason: makeNote(code, message),
    reasoning: [
      makeNote(
        code,
        message,
      ),
    ],
    status: 'rejected',
    supporting_signals: [],
  };
}

function buildUnknowns(measurements) {
  return [
    {
      question: 'Whether the measured signals carry a broader semantic meaning remains unknown.',
      reason: makeNote(
        ZEE_INTERNAL_ENGINE_INFERENCE_UNKNOWN_TYPES[0],
        'The inference gate only produces bounded structural similarity claims and does not reconstruct meaning.',
      ),
      status: 'unknown',
      unknown_type: ZEE_INTERNAL_ENGINE_INFERENCE_UNKNOWN_TYPES[0],
      support_summary: {
        measured_signal_count: measurements.length,
      },
    },
  ];
}

function buildSummary(supportedInferences, rejectedClaims, unknowns, measurements) {
  const distinctSignalKinds = new Set(measurements.map((measurement) => measurement.signalKind));
  const distinctMeasurementTypes = new Set(measurements.map((measurement) => measurement.measurementType));

  return {
    distinct_measurement_type_count: distinctMeasurementTypes.size,
    distinct_signal_kind_count: distinctSignalKinds.size,
    measured_signal_count: measurements.length,
    rejected_claim_count: rejectedClaims.length,
    supported_inference_count: supportedInferences.length,
    unknown_count: unknowns.length,
  };
}

function buildDiagnosticNotes(summary) {
  return [
    makeNote(
      'inference_gate',
      ZEE_INTERNAL_ENGINE_INFERENCE_NOTE,
      {
        measuredSignalCount: summary.measured_signal_count,
        supportedInferenceCount: summary.supported_inference_count,
      },
    ),
    makeNote(
      'inference_scope',
      ZEE_INTERNAL_ENGINE_INFERENCE_NON_AUTHORITATIVE_NOTE,
      {
        rejectedClaimCount: summary.rejected_claim_count,
        unknownCount: summary.unknown_count,
      },
    ),
  ];
}

function buildRejectedClaims(measurements) {
  const rejectedClaims = [];

  if (measurements.length < ZEE_INTERNAL_ENGINE_INFERENCE_MIN_SUPPORT) {
    rejectedClaims.push(buildRejectedSingleSignalClaim(measurements));
  }

  ZEE_INTERNAL_ENGINE_INFERENCE_REJECTED_CLAIM_TYPES
    .filter((claimType) => claimType !== 'single_signal_inference')
    .forEach((claimType) => {
      if (claimType === 'identity_inference') {
        rejectedClaims.push(buildRejectedScopeClaim(
          claimType,
          'Identity inference is not supported by the inference gate.',
          'identity_inference_disallowed',
          'The gate does not infer identity.',
        ));
        return;
      }

      if (claimType === 'intent_inference') {
        rejectedClaims.push(buildRejectedScopeClaim(
          claimType,
          'Intent inference is not supported by the inference gate.',
          'intent_inference_disallowed',
          'The gate does not infer intent.',
        ));
        return;
      }

      if (claimType === 'location_certainty') {
        rejectedClaims.push(buildRejectedScopeClaim(
          claimType,
          'Location certainty is not supported by the inference gate.',
          'location_certainty_disallowed',
          'The gate does not infer location certainty.',
        ));
        return;
      }

      if (claimType === 'truth_claim') {
        rejectedClaims.push(buildRejectedScopeClaim(
          claimType,
          'Truth claims are not supported by the inference gate.',
          'truth_claim_disallowed',
          'The gate does not produce truth claims.',
        ));
        return;
      }

      if (claimType === 'meaning_reconstruction') {
        rejectedClaims.push(buildRejectedScopeClaim(
          claimType,
          'Meaning reconstruction is not supported by the inference gate.',
          'meaning_reconstruction_disallowed',
          'The gate does not reconstruct semantic meaning from measured signals.',
        ));
      }
    });

  return rejectedClaims;
}

function buildZeeInferenceGateReport(measurementReport) {
  const normalizedInput = normalizeInferenceInput(measurementReport);
  const supportedInferences = [];

  const supportedInference = buildSupportedInference(normalizedInput.measurements);
  if (supportedInference) {
    supportedInferences.push(supportedInference);
  }

  const rejectedClaims = buildRejectedClaims(normalizedInput.measurements);
  const unknowns = buildUnknowns(normalizedInput.measurements);
  const summary = buildSummary(
    supportedInferences,
    rejectedClaims,
    unknowns,
    normalizedInput.measurements,
  );

  return {
    diagnostic_notes: buildDiagnosticNotes(summary),
    frame_count: normalizedInput.frameCount,
    layer: ZEE_INTERNAL_ENGINE_INFERENCE_LAYER,
    rejected_claims: rejectedClaims,
    source_layer: normalizedInput.sourceLayer,
    source_version: normalizedInput.sourceVersion,
    summary,
    supported_inferences: supportedInferences,
    unknowns,
    version: ZEE_INTERNAL_ENGINE_INFERENCE_VERSION,
  };
}

module.exports = {
  buildZeeInferenceGateReport,
};
