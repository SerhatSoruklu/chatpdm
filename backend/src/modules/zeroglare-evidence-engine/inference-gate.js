'use strict';

const {
  ZEE_INTERNAL_ENGINE_ERROR_CODES,
  ZEE_INTERNAL_ENGINE_INFERENCE_LAYER,
  ZEE_INTERNAL_ENGINE_INFERENCE_MIN_SUPPORT,
  ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY,
  ZEE_INTERNAL_ENGINE_INFERENCE_REJECTED_CLAIM_TYPES,
  ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORTED_CLAIM_TYPES,
  ZEE_INTERNAL_ENGINE_INFERENCE_UNKNOWN_TYPES,
  ZEE_INTERNAL_ENGINE_INFERENCE_GATE_SCHEMA,
  ZEE_INTERNAL_ENGINE_INFERENCE_POLICY,
  ZEE_INTERNAL_ENGINE_INFERENCE_VERSION,
  ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY,
  ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY_VERSION,
  ZEE_INTERNAL_ENGINE_MEASUREMENT_LAYER,
  ZEE_INTERNAL_ENGINE_STABILITY_LAYER,
} = require('./constants');
const {
  compareCanonicalNumber,
  compareCanonicalText,
} = require('./policy');
const {
  createZeeArtifactMarker,
} = require('./artifact-markers');
const { ZeeObservedInputError } = require('./input-contract');

const MEASUREMENT_KIND_PRIORITY = new Map(
  ['dominant_color', 'visible_region'].map((kind, index) => [kind, index]),
);
const INFERENCE_OUTCOME_CATEGORY_BY_CLAIM_TYPE = Object.freeze({
  cross_kind_support_required: 'UNSUPPORTED',
  identity_inference: 'REFUSED',
  intent_inference: 'REFUSED',
  location_certainty: 'REFUSED',
  meaning_reconstruction: 'REFUSED',
  single_signal_inference: 'UNSUPPORTED',
  truth_claim: 'REFUSED',
});

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
    compareCanonicalNumber(
      MEASUREMENT_KIND_PRIORITY.get(left.signalKind) ?? Number.MAX_SAFE_INTEGER,
      MEASUREMENT_KIND_PRIORITY.get(right.signalKind) ?? Number.MAX_SAFE_INTEGER,
    )
    || compareCanonicalText(String(left.measurementType), String(right.measurementType))
    || compareCanonicalText(String(left.stableSignalId), String(right.stableSignalId))
  );
}

function summarizeSupportPolicy() {
  return {
    minimumDistinctMeasurementTypes: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.minimumDistinctMeasurementTypes,
    minimumDistinctSignalKinds: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.minimumDistinctSignalKinds,
    minimumMeasuredSignals: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.minimumMeasuredSignals,
    minDistinctMeasurementTypes: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.minDistinctMeasurementTypes,
    minDistinctSignalKinds: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.minDistinctSignalKinds,
    minMeasuredSignals: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.minMeasuredSignals,
    policyVersion: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.policyVersion,
    requiresCrossKindDiversity: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.requiresCrossKindDiversity,
    requiresDistinctMeasurementTypes: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.requiresDistinctMeasurementTypes,
    requireDistinctStableSignalIds: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.requireDistinctStableSignalIds,
    requiresDistinctStableSignalIds: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.requiresDistinctStableSignalIds,
    supportRule: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.supportRule,
    supportRuleVersion: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.supportRuleVersion,
    supportType: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.supportType,
    supportTypeVersion: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.supportTypeVersion,
    version: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.version,
  };
}

function summarizeSupportSignals(measurements) {
  const supportSignalIds = measurements.map((signal) => signal.stableSignalId);
  const supportSignalKinds = [...new Set(measurements.map((signal) => signal.signalKind))];
  const supportMeasurementTypes = [...new Set(measurements.map((signal) => signal.measurementType))];

  return {
    distinctMeasurementTypeCount: supportMeasurementTypes.length,
    distinctSignalKindCount: supportSignalKinds.length,
    distinctStableSignalIdCount: new Set(supportSignalIds).size,
    supportMeasurementTypes,
    supportSignalIds,
    supportSignalKinds,
    supportingSignalCount: measurements.length,
  };
}

function supportsMultiSignalInference(measurements) {
  const summary = summarizeSupportSignals(measurements);
  const supportPolicy = ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY;

  return summary.supportingSignalCount >= supportPolicy.minimumMeasuredSignals
    && summary.distinctSignalKindCount >= supportPolicy.minimumDistinctSignalKinds
    && summary.distinctMeasurementTypeCount >= supportPolicy.minimumDistinctMeasurementTypes
    && supportPolicy.requiresCrossKindDiversity
    && supportPolicy.requiresDistinctMeasurementTypes
    && summary.distinctStableSignalIdCount === summary.supportingSignalCount;
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
  if (!supportsMultiSignalInference(measurements)) {
    return null;
  }

  const supportSnapshot = summarizeSupportSignals(measurements);
  const supportingSignals = measurements.map(buildSignalSnapshot);

  return {
    claim: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORTED_CLAIM_TYPES[0],
    claim_type: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORTED_CLAIM_TYPES[0],
    inference_id: `multi_signal_structural_similarity:${supportSnapshot.supportSignalIds[0]}`,
    inference_type: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORTED_CLAIM_TYPES[0],
    outcomeCategory: ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY.inference.supported,
    reasoning: [
      makeNote(
        'multi_signal_requirement',
        'cross_kind_distinct_multi_signal',
        {
          measuredSignalCount: supportSnapshot.supportingSignalCount,
          minimumDistinctMeasurementTypes: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.minimumDistinctMeasurementTypes,
          minimumDistinctSignalKinds: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.minimumDistinctSignalKinds,
          minimumSupport: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.minimumMeasuredSignals,
        },
      ),
      makeNote(
        'independence_check',
        'distinct_stable_signal_ids',
        {
          supportingSignalIds: supportSnapshot.supportSignalIds,
        },
      ),
      makeNote(
        'support_policy',
        ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.supportRule,
        {
          distinctMeasurementTypeCount: supportSnapshot.distinctMeasurementTypeCount,
          distinctSignalKindCount: supportSnapshot.distinctSignalKindCount,
          supportRule: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.supportRule,
          supportRuleVersion: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.supportRuleVersion,
          supportPolicyVersion: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.version,
        },
      ),
    ],
    status: 'supported',
    support_summary: {
      distinct_measurement_type_count: supportSnapshot.distinctMeasurementTypeCount,
      distinct_signal_kind_count: supportSnapshot.distinctSignalKindCount,
      distinct_stable_signal_id_count: supportSnapshot.distinctStableSignalIdCount,
      supporting_signal_count: supportSnapshot.supportingSignalCount,
    },
    support_policy: summarizeSupportPolicy(),
    supporting_signals: supportingSignals,
  };
}

function buildRejectedSingleSignalClaim(measurements) {
  return {
    claim: 'single_signal_inference',
    claim_type: 'single_signal_inference',
    outcomeCategory: INFERENCE_OUTCOME_CATEGORY_BY_CLAIM_TYPE.single_signal_inference,
    reasoning: [
      makeNote(
        'insufficient_signal_support',
        'insufficient_signal_support',
        {
          measuredSignalCount: measurements.length,
          minimumSupport: ZEE_INTERNAL_ENGINE_INFERENCE_MIN_SUPPORT,
        },
      ),
    ],
    reason: makeNote(
      'insufficient_signal_support',
      'insufficient_signal_support',
      {
        measuredSignalCount: measurements.length,
      },
    ),
    status: 'unsupported',
    supporting_signals: measurements.map(buildSignalSnapshot),
  };
}

function buildRejectedCrossKindClaim(measurements) {
  const supportSnapshot = summarizeSupportSignals(measurements);

  return {
    claim: 'cross_kind_support_required',
    claim_type: 'cross_kind_support_required',
    outcomeCategory: INFERENCE_OUTCOME_CATEGORY_BY_CLAIM_TYPE.cross_kind_support_required,
    reason: makeNote(
      'cross_kind_support_required',
      'cross_kind_support_required',
      {
        distinctMeasurementTypeCount: supportSnapshot.distinctMeasurementTypeCount,
        distinctSignalKindCount: supportSnapshot.distinctSignalKindCount,
        measuredSignalCount: supportSnapshot.supportingSignalCount,
      },
    ),
    reasoning: [
      makeNote(
        'cross_kind_support_required',
        'cross_kind_support_required',
        {
          distinctMeasurementTypeCount: supportSnapshot.distinctMeasurementTypeCount,
          distinctSignalKindCount: supportSnapshot.distinctSignalKindCount,
          measuredSignalCount: supportSnapshot.supportingSignalCount,
        },
      ),
    ],
    status: 'unsupported',
    supporting_signals: measurements.map(buildSignalSnapshot),
  };
}

function buildRejectedScopeClaim(claimType, claim, code, message) {
  return {
    claim,
    claim_type: claimType,
    outcomeCategory: INFERENCE_OUTCOME_CATEGORY_BY_CLAIM_TYPE[claimType] ?? ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY.inference.refused,
    reason: makeNote(code, message),
    reasoning: [
      makeNote(
        code,
        code,
      ),
    ],
    status: 'refused',
    supporting_signals: [],
  };
}

function buildUnknowns(measurements) {
  return [
    {
      question: 'bounded_support_scope_unknown',
      reason: makeNote(
        ZEE_INTERNAL_ENGINE_INFERENCE_UNKNOWN_TYPES[0],
        ZEE_INTERNAL_ENGINE_INFERENCE_UNKNOWN_TYPES[0],
      ),
      outcomeCategory: ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY.inference.unknown,
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
  const refusedClaimCount = rejectedClaims.filter((claim) => claim.outcomeCategory === ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY.inference.refused).length;
  const unsupportedClaimCount = rejectedClaims.filter((claim) => claim.outcomeCategory === ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY.inference.unsupported).length;

  return {
    distinct_measurement_type_count: distinctMeasurementTypes.size,
    distinct_signal_kind_count: distinctSignalKinds.size,
    measured_signal_count: measurements.length,
    refused_claim_count: refusedClaimCount,
    rejected_claim_count: rejectedClaims.length,
    supported_inference_count: supportedInferences.length,
    unsupported_claim_count: unsupportedClaimCount,
    unknown_count: unknowns.length,
  };
}

function buildDiagnosticNotes(summary) {
  return [
    makeNote(
      'inference_gate',
      'cross_kind_distinct_multi_signal',
      {
        measuredSignalCount: summary.measured_signal_count,
        supportedInferenceCount: summary.supported_inference_count,
        supportRule: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.supportRule,
        supportRuleVersion: ZEE_INTERNAL_ENGINE_INFERENCE_SUPPORT_POLICY.supportRuleVersion,
      },
    ),
    makeNote(
      'inference_scope',
      'bounded_non_authoritative',
      {
        refusedClaimCount: summary.refused_claim_count,
        rejectedClaimCount: summary.rejected_claim_count,
        unsupportedClaimCount: summary.unsupported_claim_count,
        unknownCount: summary.unknown_count,
      },
    ),
  ];
}

function buildRejectedClaims(measurements) {
  const rejectedClaims = [];

  if (measurements.length < ZEE_INTERNAL_ENGINE_INFERENCE_MIN_SUPPORT) {
    rejectedClaims.push(buildRejectedSingleSignalClaim(measurements));
    return rejectedClaims;
  }

  if (!supportsMultiSignalInference(measurements)) {
    rejectedClaims.push(buildRejectedCrossKindClaim(measurements));
  }

  ZEE_INTERNAL_ENGINE_INFERENCE_REJECTED_CLAIM_TYPES
    .filter((claimType) => claimType !== 'single_signal_inference' && claimType !== 'cross_kind_support_required')
    .forEach((claimType) => {
      if (claimType === 'identity_inference') {
        rejectedClaims.push(buildRejectedScopeClaim(
          claimType,
          'identity_inference',
          'identity_inference_disallowed',
          'identity_inference_disallowed',
        ));
        return;
      }

      if (claimType === 'intent_inference') {
        rejectedClaims.push(buildRejectedScopeClaim(
          claimType,
          'intent_inference',
          'intent_inference_disallowed',
          'intent_inference_disallowed',
        ));
        return;
      }

      if (claimType === 'location_certainty') {
        rejectedClaims.push(buildRejectedScopeClaim(
          claimType,
          'location_certainty',
          'location_certainty_disallowed',
          'location_certainty_disallowed',
        ));
        return;
      }

      if (claimType === 'truth_claim') {
        rejectedClaims.push(buildRejectedScopeClaim(
          claimType,
          'truth_claim',
          'truth_claim_disallowed',
          'truth_claim_disallowed',
        ));
        return;
      }

      if (claimType === 'meaning_reconstruction') {
        rejectedClaims.push(buildRejectedScopeClaim(
          claimType,
          'meaning_reconstruction',
          'meaning_reconstruction_disallowed',
          'meaning_reconstruction_disallowed',
        ));
      }
    });

  return rejectedClaims;
}

function buildZeeInferenceGateReport(measurementReport) {
  const normalizedInput = normalizeInferenceInput(measurementReport);
  const supportedInferences = [];
  const supportPolicy = summarizeSupportPolicy();

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
    ...createZeeArtifactMarker('inference_gate'),
    diagnostic_notes: buildDiagnosticNotes(summary),
    frame_count: normalizedInput.frameCount,
    layer: ZEE_INTERNAL_ENGINE_INFERENCE_LAYER,
    policyVersion: ZEE_INTERNAL_ENGINE_INFERENCE_POLICY.version,
    resultTaxonomy: ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY.inference,
    resultTaxonomyVersion: ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY_VERSION,
    schemaVersion: ZEE_INTERNAL_ENGINE_INFERENCE_GATE_SCHEMA.version,
    rejected_claims: rejectedClaims,
    source_layer: normalizedInput.sourceLayer,
    source_version: normalizedInput.sourceVersion,
    summary,
    supportPolicy,
    supported_inferences: supportedInferences,
    unknowns,
    version: ZEE_INTERNAL_ENGINE_INFERENCE_VERSION,
  };
}

module.exports = {
  buildZeeInferenceGateReport,
};
