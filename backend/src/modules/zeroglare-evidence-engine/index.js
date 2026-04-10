'use strict';

const {
  ZEE_INTERNAL_ENGINE_INPUT_CONTRACT,
  ZEE_INTERNAL_ENGINE_LAYER,
  ZEE_INTERNAL_ENGINE_NAME,
  ZEE_INTERNAL_ENGINE_NON_OPERATIONAL_NOTE,
  ZEE_INTERNAL_ENGINE_OBSERVED_ONLY_NOTE,
  ZEE_INTERNAL_ENGINE_SUPPORTED_FORMATS,
  ZEE_INTERNAL_ENGINE_VERSION,
} = require('./constants');
const { normalizeObservedInput } = require('./input-contract');
const { analyzeObservedPngFrame } = require('./png-observed-extractor');
const { buildZeeInferenceGateReport } = require('./inference-gate');
const { buildZeeMeasurementReport } = require('./measurement-layer');
const { buildZeeSignalStabilityReport } = require('./signal-stability-layer');

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
      message: ZEE_INTERNAL_ENGINE_OBSERVED_ONLY_NOTE,
    },
    {
      code: 'module_isolation',
      message: ZEE_INTERNAL_ENGINE_NON_OPERATIONAL_NOTE,
    },
    {
      code: 'frame_count',
      message: `Processed ${frameReports.length} frame${frameReports.length === 1 ? '' : 's'} through the observed-only pipeline.`,
    },
    {
      code: 'signal_stability',
      message: `Signal stability retained ${signalStability.stableSignals.length} stable track${signalStability.stableSignals.length === 1 ? '' : 's'} and discarded ${signalStability.discardedSignals.length} unstable track${signalStability.discardedSignals.length === 1 ? '' : 's'}.`,
    },
    {
      code: 'measurement_layer',
      message: `Measurement layer produced ${measurementLayer.measurements.length} stable measurement${measurementLayer.measurements.length === 1 ? '' : 's'} and discarded ${measurementLayer.discardedMeasurements.length} non-measurable stable signal${measurementLayer.discardedMeasurements.length === 1 ? '' : 's'}.`,
    },
    {
      code: 'inference_gate',
      message: `Inference gate supported ${inferenceGate.supported_inferences.length} bounded structural similarity inference${inferenceGate.supported_inferences.length === 1 ? '' : 's'} and rejected ${inferenceGate.rejected_claims.length} unsupported claim${inferenceGate.rejected_claims.length === 1 ? '' : 's'}.`,
    },
  ];
}

function analyzeZeeObservedFrames(input) {
  const normalizedInput = normalizeObservedInput(input);
  const frameReports = normalizedInput.frames.map((frame) => analyzeObservedPngFrame(frame, normalizedInput.options));
  const signalStability = buildZeeSignalStabilityReport(frameReports);
  const measurementLayer = buildZeeMeasurementReport(signalStability);
  const inferenceGate = buildZeeInferenceGateReport(measurementLayer);

  return {
    diagnosticNotes: buildTopLevelDiagnosticNotes(frameReports, signalStability, measurementLayer, inferenceGate),
    engine: {
      inputContract: ZEE_INTERNAL_ENGINE_INPUT_CONTRACT,
      layer: ZEE_INTERNAL_ENGINE_LAYER,
      name: ZEE_INTERNAL_ENGINE_NAME,
      supportedFormats: [...ZEE_INTERNAL_ENGINE_SUPPORTED_FORMATS],
      version: ZEE_INTERNAL_ENGINE_VERSION,
    },
    input: {
      frameCount: normalizedInput.frames.length,
      frames: normalizedInput.frames.map((frame) => ({
        frameIndex: frame.frameIndex,
        sourceId: frame.sourceId ?? null,
        sourceLabel: frame.sourceLabel,
        sourcePath: frame.sourcePath,
        sourceType: frame.sourceType,
      })),
      options: normalizedInput.options,
    },
    observedSummary: buildObservedSummary(frameReports),
    measurementLayer,
    inferenceGate,
    signalStability,
    frames: frameReports,
  };
}

module.exports = {
  analyzeZeeObservedFrames,
  buildZeeInferenceGateReport,
  buildZeeMeasurementReport,
  buildZeeSignalStabilityReport,
};
