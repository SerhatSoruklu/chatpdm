'use strict';

const {
  ZEE_INTERNAL_ENGINE_POLICY_MANIFEST_VERSION,
} = require('./policy-manifest');

const ZEE_INTERNAL_ENGINE_PHASE_SCHEMA_VERSION = ZEE_INTERNAL_ENGINE_POLICY_MANIFEST_VERSION;

function freezeArray(values) {
  return Object.freeze([...values]);
}

function freezeRecord(record) {
  return Object.freeze(record);
}

function createFieldSchema(type, details = {}) {
  return freezeRecord({
    type,
    ...details,
  });
}

function createObjectSchema(fields, ordering) {
  return freezeRecord({
    fields: freezeRecord(fields),
    ordering: freezeArray(ordering),
    type: 'object',
  });
}

function createZeePhaseSchemas(policyVersion = ZEE_INTERNAL_ENGINE_PHASE_SCHEMA_VERSION) {
  const observedFrame = freezeRecord({
    fields: freezeRecord({
      artifactId: createFieldSchema('string'),
      artifactKind: createFieldSchema('string'),
      contractMarker: createFieldSchema('string'),
      diagnosticNotes: createFieldSchema('array<object>'),
      frameId: createFieldSchema('string'),
      frameIndex: createFieldSchema('integer'),
      frameMetadata: createObjectSchema({
        artifactId: createFieldSchema('string'),
        artifactSchemaVersion: createFieldSchema('string'),
        bitDepth: createFieldSchema('integer'),
        byteLength: createFieldSchema('integer'),
        colorType: createFieldSchema('integer'),
        colorTypeLabel: createFieldSchema('string'),
        compressionMethod: createFieldSchema('integer'),
        fingerprint: createFieldSchema('string'),
        height: createFieldSchema('integer'),
        imageFormat: createFieldSchema('string'),
        interlaceMethod: createFieldSchema('integer'),
        paletteEntries: createFieldSchema('integer'),
        pixelCount: createFieldSchema('integer'),
        policyVersion: createFieldSchema('string'),
        rowByteLength: createFieldSchema('integer'),
        schemaVersion: createFieldSchema('string'),
        sourceId: createFieldSchema('string|null'),
        sourceLabel: createFieldSchema('string'),
        transparentPaletteEntries: createFieldSchema('integer'),
        width: createFieldSchema('integer'),
      }, [
        'artifactId',
        'artifactSchemaVersion',
        'bitDepth',
        'byteLength',
        'colorType',
        'colorTypeLabel',
        'compressionMethod',
        'fingerprint',
        'height',
        'imageFormat',
        'interlaceMethod',
        'paletteEntries',
        'pixelCount',
        'policyVersion',
        'rowByteLength',
        'schemaVersion',
        'sourceId',
        'sourceLabel',
        'transparentPaletteEntries',
        'width',
      ]),
      observedFeatures: createObjectSchema({
        dominantColors: createFieldSchema('array<object>'),
        edgeMetrics: createObjectSchema({
          combinedDensity: createFieldSchema('number'),
          diagonalDensity: createFieldSchema('number'),
          horizontalDensity: createFieldSchema('number'),
          horizontalTransitions: createFieldSchema('integer'),
          totalPixels: createFieldSchema('integer'),
          verticalDensity: createFieldSchema('number'),
          verticalTransitions: createFieldSchema('integer'),
        }, [
          'combinedDensity',
          'diagonalDensity',
          'horizontalDensity',
          'horizontalTransitions',
          'totalPixels',
          'verticalDensity',
          'verticalTransitions',
        ]),
        visibleGeometricRegions: createFieldSchema('array<object>'),
      }, [
        'dominantColors',
        'edgeMetrics',
        'visibleGeometricRegions',
      ]),
      policyVersion: createFieldSchema('string'),
      schemaVersion: createFieldSchema('string'),
    }),
    ordering: freezeArray([
      'schemaVersion',
      'policyVersion',
      'type',
      'artifactKind',
      'contractMarker',
      'artifactId',
      'frameId',
      'frameIndex',
      'diagnosticNotes',
      'frameMetadata',
      'observedFeatures',
    ]),
    policyVersion,
    version: policyVersion,
  });

  const signalStability = freezeRecord({
    fields: freezeRecord({
      artifactKind: createFieldSchema('string'),
      contractMarker: createFieldSchema('string'),
      discardedSignals: createFieldSchema('array<object>'),
      diagnosticNotes: createFieldSchema('array<object>'),
      frameCount: createFieldSchema('integer'),
      layer: createFieldSchema('string'),
      policyVersion: createFieldSchema('string'),
      resultTaxonomy: createObjectSchema({
        discarded: createFieldSchema('string'),
        stable: createFieldSchema('string'),
      }, [
        'discarded',
        'stable',
      ]),
      resultTaxonomyVersion: createFieldSchema('string'),
      schemaVersion: createFieldSchema('string'),
      stableSignals: createFieldSchema('array<object>'),
      summary: createObjectSchema({
        byKind: createFieldSchema('object'),
        discardedCount: createFieldSchema('integer'),
        stableCount: createFieldSchema('integer'),
        totalCount: createFieldSchema('integer'),
      }, [
        'byKind',
        'discardedCount',
        'stableCount',
        'totalCount',
      ]),
      version: createFieldSchema('string'),
    }),
    ordering: freezeArray([
      'schemaVersion',
      'policyVersion',
      'type',
      'artifactKind',
      'contractMarker',
      'layer',
      'version',
      'frameCount',
      'resultTaxonomyVersion',
      'resultTaxonomy',
      'stableSignals',
      'discardedSignals',
      'summary',
      'diagnosticNotes',
    ]),
    policyVersion,
    version: policyVersion,
  });

  const measurement = freezeRecord({
    fields: freezeRecord({
      artifactKind: createFieldSchema('string'),
      contractMarker: createFieldSchema('string'),
      discardedMeasurements: createFieldSchema('array<object>'),
      diagnosticNotes: createFieldSchema('array<object>'),
      frameCount: createFieldSchema('integer'),
      layer: createFieldSchema('string'),
      policyVersion: createFieldSchema('string'),
      resultTaxonomy: createObjectSchema({
        discarded: createFieldSchema('string'),
        measured: createFieldSchema('string'),
      }, [
        'discarded',
        'measured',
      ]),
      resultTaxonomyVersion: createFieldSchema('string'),
      schemaVersion: createFieldSchema('string'),
      measurements: createFieldSchema('array<object>'),
      sourceLayer: createFieldSchema('string'),
      sourceVersion: createFieldSchema('string|null'),
      summary: createFieldSchema('object'),
      version: createFieldSchema('string'),
    }),
    ordering: freezeArray([
      'schemaVersion',
      'policyVersion',
      'type',
      'artifactKind',
      'contractMarker',
      'layer',
      'version',
      'frameCount',
      'resultTaxonomyVersion',
      'resultTaxonomy',
      'measurements',
      'discardedMeasurements',
      'summary',
      'diagnosticNotes',
    ]),
    policyVersion,
    version: policyVersion,
  });

  const inferenceSupportSummary = createObjectSchema({
    distinct_measurement_type_count: createFieldSchema('integer'),
    distinct_signal_kind_count: createFieldSchema('integer'),
    distinct_stable_signal_id_count: createFieldSchema('integer'),
    supporting_signal_count: createFieldSchema('integer'),
  }, [
    'distinct_measurement_type_count',
    'distinct_signal_kind_count',
    'distinct_stable_signal_id_count',
    'supporting_signal_count',
  ]);

  const inferenceSupportPolicy = createObjectSchema({
    minimumDistinctMeasurementTypes: createFieldSchema('integer'),
    minimumDistinctSignalKinds: createFieldSchema('integer'),
    minimumMeasuredSignals: createFieldSchema('integer'),
    minDistinctMeasurementTypes: createFieldSchema('integer'),
    minDistinctSignalKinds: createFieldSchema('integer'),
    minMeasuredSignals: createFieldSchema('integer'),
    policyVersion: createFieldSchema('string'),
    requiresCrossKindDiversity: createFieldSchema('boolean'),
    requiresDistinctMeasurementTypes: createFieldSchema('boolean'),
    requireDistinctStableSignalIds: createFieldSchema('boolean'),
    requiresDistinctStableSignalIds: createFieldSchema('boolean'),
    supportRule: createFieldSchema('string'),
    supportRuleVersion: createFieldSchema('string'),
    supportType: createFieldSchema('string'),
    supportTypeVersion: createFieldSchema('string'),
    version: createFieldSchema('string'),
  }, [
    'supportRule',
    'supportRuleVersion',
    'supportType',
    'supportTypeVersion',
    'minimumMeasuredSignals',
    'minimumDistinctSignalKinds',
    'minimumDistinctMeasurementTypes',
    'minMeasuredSignals',
    'minDistinctSignalKinds',
    'minDistinctMeasurementTypes',
    'requiresCrossKindDiversity',
    'requiresDistinctMeasurementTypes',
    'requireDistinctStableSignalIds',
    'requiresDistinctStableSignalIds',
    'policyVersion',
    'version',
  ]);

  const supportedInference = createObjectSchema({
    claim: createFieldSchema('string'),
    claim_type: createFieldSchema('string'),
    inference_id: createFieldSchema('string'),
    inference_type: createFieldSchema('string'),
    outcomeCategory: createFieldSchema('string'),
    reasoning: createFieldSchema('array<object>'),
    status: createFieldSchema('string'),
    support_policy: inferenceSupportPolicy,
    support_summary: inferenceSupportSummary,
    supporting_signals: createFieldSchema('array<object>'),
  }, [
    'outcomeCategory',
    'status',
    'claim_type',
    'claim',
    'inference_type',
    'inference_id',
    'support_policy',
    'support_summary',
    'supporting_signals',
    'reasoning',
  ]);

  const rejectedClaim = createObjectSchema({
    claim: createFieldSchema('string'),
    claim_type: createFieldSchema('string'),
    outcomeCategory: createFieldSchema('string'),
    reason: createFieldSchema('object'),
    reasoning: createFieldSchema('array<object>'),
    status: createFieldSchema('string'),
    supporting_signals: createFieldSchema('array<object>'),
  }, [
    'outcomeCategory',
    'status',
    'claim_type',
    'claim',
    'reason',
    'reasoning',
    'supporting_signals',
  ]);

  const unknownOutcome = createObjectSchema({
    outcomeCategory: createFieldSchema('string'),
    question: createFieldSchema('string'),
    reason: createFieldSchema('object'),
    status: createFieldSchema('string'),
    support_summary: inferenceSupportSummary,
    unknown_type: createFieldSchema('string'),
  }, [
    'outcomeCategory',
    'status',
    'unknown_type',
    'question',
    'reason',
    'support_summary',
  ]);

  const inferenceGate = freezeRecord({
    fields: freezeRecord({
      artifactKind: createFieldSchema('string'),
      contractMarker: createFieldSchema('string'),
      diagnostic_notes: createFieldSchema('array<object>'),
      frame_count: createFieldSchema('integer'),
      layer: createFieldSchema('string'),
      policyVersion: createFieldSchema('string'),
      rejected_claims: createFieldSchema('array<object>'),
      resultTaxonomy: createObjectSchema({
        refused: createFieldSchema('string'),
        supported: createFieldSchema('string'),
        unknown: createFieldSchema('string'),
        unsupported: createFieldSchema('string'),
      }, [
        'refused',
        'supported',
        'unsupported',
        'unknown',
      ]),
      resultTaxonomyVersion: createFieldSchema('string'),
      schemaVersion: createFieldSchema('string'),
      source_layer: createFieldSchema('string'),
      source_version: createFieldSchema('string|null'),
      summary: createFieldSchema('object'),
      supportPolicy: inferenceSupportPolicy,
      supported_inferences: createFieldSchema('array<object>'),
      unknowns: createFieldSchema('array<object>'),
      version: createFieldSchema('string'),
    }),
    ordering: freezeArray([
      'schemaVersion',
      'policyVersion',
      'type',
      'artifactKind',
      'contractMarker',
      'layer',
      'version',
      'frame_count',
      'resultTaxonomyVersion',
      'resultTaxonomy',
      'supportPolicy',
      'supported_inferences',
      'rejected_claims',
      'unknowns',
      'summary',
      'diagnostic_notes',
    ]),
    policyVersion,
    version: policyVersion,
  });

  const canonicalTrace = freezeRecord({
    fields: freezeRecord({
      artifactId: createFieldSchema('string'),
      artifactKind: createFieldSchema('string'),
      contractMarker: createFieldSchema('string'),
      diagnosticNotes: createFieldSchema('array<object>'),
      engine: createObjectSchema({
        inputContract: createFieldSchema('object'),
        layer: createFieldSchema('string'),
        name: createFieldSchema('string'),
        policyVersion: createFieldSchema('string'),
        supportedFormats: createFieldSchema('array<string>'),
        traceContract: createFieldSchema('object'),
        version: createFieldSchema('string'),
      }, [
        'inputContract',
        'layer',
        'name',
        'policyVersion',
        'supportedFormats',
        'traceContract',
        'version',
      ]),
      frames: createFieldSchema('array<object>'),
      inferenceGate: createFieldSchema('object'),
      input: createObjectSchema({
        artifactId: createFieldSchema('string'),
        frameCount: createFieldSchema('integer'),
        frames: createFieldSchema('array<object>'),
        options: createFieldSchema('object'),
      }, [
        'artifactId',
        'frameCount',
        'frames',
        'options',
      ]),
      measurementLayer: createFieldSchema('object'),
      observedSummary: createObjectSchema({
        averageEdgeDensity: createFieldSchema('number'),
        frameCount: createFieldSchema('integer'),
        observedLayer: createFieldSchema('string'),
        regionCandidateCount: createFieldSchema('integer'),
        sharedDominantColors: createFieldSchema('array<string>'),
      }, [
        'averageEdgeDensity',
        'frameCount',
        'observedLayer',
        'regionCandidateCount',
        'sharedDominantColors',
      ]),
      policyVersion: createFieldSchema('string'),
      schemaVersion: createFieldSchema('string'),
      signalStability: createFieldSchema('object'),
      traceContract: createFieldSchema('object'),
    }),
    ordering: freezeArray([
      'schemaVersion',
      'policyVersion',
      'type',
      'artifactKind',
      'contractMarker',
      'artifactId',
      'diagnosticNotes',
      'engine',
      'input',
      'observedSummary',
      'signalStability',
      'measurementLayer',
      'inferenceGate',
      'traceContract',
      'frames',
    ]),
    policyVersion,
    version: policyVersion,
  });

  return freezeRecord({
    canonicalTrace,
    inferenceGate,
    inferenceSupportPolicy,
    rejectedClaim,
    measurement,
    observedFrame,
    signalStability,
    supportedInference,
    unknownOutcome,
  });
}

const ZEE_INTERNAL_ENGINE_PHASE_SCHEMAS = createZeePhaseSchemas();

module.exports = {
  ZEE_INTERNAL_ENGINE_PHASE_SCHEMA_VERSION,
  ZEE_INTERNAL_ENGINE_PHASE_SCHEMAS,
  createFieldSchema,
  createObjectSchema,
  createZeePhaseSchemas,
};
