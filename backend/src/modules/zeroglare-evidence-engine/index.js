'use strict';

const {
  ZEE_INTERNAL_ENGINE_INPUT_CONTRACT,
  ZEE_INTERNAL_ENGINE_LAYER,
  ZEE_INTERNAL_ENGINE_NAME,
  ZEE_INTERNAL_ENGINE_POLICY_MANIFEST,
  ZEE_INTERNAL_ENGINE_TRACE_CONTRACT,
  ZEE_INTERNAL_ENGINE_SUPPORTED_FORMATS,
  ZEE_INTERNAL_ENGINE_VERSION,
} = require('./constants');
const {
  buildCanonicalTraceArtifactId,
} = require('./policy');
const { normalizeObservedInput } = require('./input-contract');
const { analyzeObservedPngFrame } = require('./png-observed-extractor');
const { buildZeeInferenceGateReport } = require('./inference-gate');
const { buildZeeMeasurementReport } = require('./measurement-layer');
const { buildZeeSignalStabilityReport } = require('./signal-stability-layer');
const {
  createZeeArtifactMarker,
} = require('./artifact-markers');

function buildSharedDominantColors(frameReports) {
  if (frameReports.length === 0) {
    return [];
  }

  const firstFrameDominantColors = frameReports[0].observedFeatures.dominantColors.map((color) => color.hex);

  if (frameReports.length === 1) {
    return firstFrameDominantColors.slice(0, 3);
  }

  const sharedColors = firstFrameDominantColors.filter((colorHex) => (
    frameReports.every((frameReport) => (
      frameReport.observedFeatures.dominantColors.some((color) => color.hex === colorHex)
    ))
  ));

  return sharedColors.length > 0 ? sharedColors.slice(0, 5) : firstFrameDominantColors.slice(0, 3);
}

function buildObservedSummary(frameReports) {
  const frameCount = frameReports.length;
  const averageEdgeDensity = frameCount === 0
    ? 0
    : frameReports.reduce((sum, frameReport) => sum + frameReport.observedFeatures.edgeMetrics.combinedDensity, 0) / frameCount;

  return {
    averageEdgeDensity: Number(averageEdgeDensity.toFixed(6)),
    frameCount,
    observedLayer: ZEE_INTERNAL_ENGINE_LAYER,
    regionCandidateCount: frameReports.reduce(
      (sum, frameReport) => sum + frameReport.observedFeatures.visibleGeometricRegions.length,
      0,
    ),
    sharedDominantColors: buildSharedDominantColors(frameReports),
  };
}

function buildTopLevelDiagnosticNotes(frameReports, signalStability, measurementLayer, inferenceGate) {
  return [
    {
      code: 'observed_only',
      message: 'observed_only',
    },
    {
      code: 'module_isolation',
      message: 'module_isolation',
    },
    {
      code: 'frame_count',
      message: 'frame_count',
      details: {
        frameCount: frameReports.length,
      },
    },
    {
      code: 'signal_stability',
      message: 'signal_stability',
      details: {
        discardedCount: signalStability.discardedSignals.length,
        stableCount: signalStability.stableSignals.length,
      },
    },
    {
      code: 'measurement_layer',
      message: 'measurement_layer',
      details: {
        discardedCount: measurementLayer.discardedMeasurements.length,
        measuredCount: measurementLayer.measurements.length,
      },
    },
    {
      code: 'inference_gate',
      message: 'inference_gate',
      details: {
        rejectedClaimCount: inferenceGate.rejected_claims.length,
        supportedInferenceCount: inferenceGate.supported_inferences.length,
        unknownCount: inferenceGate.unknowns.length,
      },
    },
  ];
}

function analyzeZeeObservedFrames(input) {
  const normalizedInput = normalizeObservedInput(input);
  const frameReports = normalizedInput.frames.map((frame) => analyzeObservedPngFrame(frame, normalizedInput.options));
  const signalStability = buildZeeSignalStabilityReport(frameReports);
  const measurementLayer = buildZeeMeasurementReport(signalStability);
  const inferenceGate = buildZeeInferenceGateReport(measurementLayer);
  const artifactId = buildCanonicalTraceArtifactId(
    frameReports.map((frameReport) => frameReport.frameId),
    normalizedInput.options,
    ZEE_INTERNAL_ENGINE_POLICY_MANIFEST.version,
  );

  return {
    ...createZeeArtifactMarker('canonical_trace'),
    artifactId,
    diagnosticNotes: buildTopLevelDiagnosticNotes(frameReports, signalStability, measurementLayer, inferenceGate),
    engine: {
      inputContract: ZEE_INTERNAL_ENGINE_INPUT_CONTRACT,
      layer: ZEE_INTERNAL_ENGINE_LAYER,
      name: ZEE_INTERNAL_ENGINE_NAME,
      policyVersion: ZEE_INTERNAL_ENGINE_POLICY_MANIFEST.version,
      traceContract: ZEE_INTERNAL_ENGINE_TRACE_CONTRACT,
      supportedFormats: [...ZEE_INTERNAL_ENGINE_SUPPORTED_FORMATS],
      version: ZEE_INTERNAL_ENGINE_VERSION,
    },
    input: {
      artifactId,
      frameCount: normalizedInput.frames.length,
      frames: normalizedInput.frames.map((frame) => ({
        artifactId: frame.artifactId,
        frameIndex: frame.frameIndex,
        sourceId: frame.sourceId ?? null,
        sourceLabel: frame.sourceLabel,
      })),
      options: normalizedInput.options,
    },
    policyVersion: ZEE_INTERNAL_ENGINE_POLICY_MANIFEST.version,
    schemaVersion: ZEE_INTERNAL_ENGINE_TRACE_CONTRACT.canonicalTraceSchemaVersion,
    observedSummary: buildObservedSummary(frameReports),
    measurementLayer,
    inferenceGate,
    signalStability,
    traceContract: ZEE_INTERNAL_ENGINE_TRACE_CONTRACT,
    frames: frameReports,
  };
}

module.exports = {
  analyzeZeeObservedFrames,
  buildZeeInferenceGateReport,
  buildZeeMeasurementReport,
  buildZeeSignalStabilityReport,
};
