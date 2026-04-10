'use strict';

const ZEE_INTERNAL_ENGINE_POLICY_MANIFEST_VERSION = 'v1';
const ZEE_INTERNAL_ENGINE_POLICY_VERSION = ZEE_INTERNAL_ENGINE_POLICY_MANIFEST_VERSION;

function freezeArray(values) {
  return Object.freeze([...values]);
}

function freezeRecord(record) {
  return Object.freeze(record);
}

function createComparatorPolicy(policyVersion) {
  return freezeRecord({
    ordering: 'utf8_nfc_bytewise',
    policyVersion,
    version: policyVersion,
  });
}

function createInputPolicy(policyVersion) {
  return freezeRecord({
    maxFrameBytes: 25 * 1024 * 1024,
    maxFrames: 8,
    policyVersion,
    supportedFormats: freezeArray(['png']),
    version: policyVersion,
  });
}

function createPngPolicy(policyVersion) {
  return freezeRecord({
    maxChunkDataBytes: 25 * 1024 * 1024,
    policyVersion,
    rejectBitDepths: freezeArray([16]),
    requireCrc: true,
    requireIend: true,
    version: policyVersion,
  });
}

function createExtractorPolicy(policyVersion) {
  return freezeRecord({
    activeTileThresholds: freezeRecord({
      activity: 0.16,
      edgeDensity: 0.08,
      variance: 420,
    }),
    candidateScoreWeights: freezeRecord({
      activityContribution: 1,
      contrastContribution: 0.12,
      contrastScale: 1400,
      sizeContributionCap: 0.25,
      sizeContributionScale: 18,
    }),
    classificationThresholds: freezeRecord({
      densePatchEdgeDensity: 0.22,
      densePatchVariance: 1200,
      horizontalStripAspect: 1.6,
      squareBlockAspectMax: 1.15,
      squareBlockAspectMin: 0.85,
      squareBlockAreaMultiplier: 9,
      tallStripAspect: 0.55,
      verticalStripAspect: 0.625,
      widePanelAspect: 1.8,
    }),
    defaultEdgeThreshold: 24,
    defaultMaxDominantColors: 8,
    defaultMaxRegionCandidates: 12,
    defaultTileSize: 32,
    policyVersion,
    roundingPrecision: 4,
    tileActivityWeights: freezeRecord({
      contrastContribution: 0.20,
      contrastScale: 90,
      edgeDensityContribution: 0.45,
      edgeDensityScale: 0.24,
      varianceContribution: 0.35,
      varianceScale: 4800,
    }),
    version: policyVersion,
  });
}

function createStabilityPolicy(policyVersion) {
  return freezeRecord({
    defaultRoundingPrecision: 4,
    dominantColorDistanceThreshold: 48,
    dominantColorRatioThreshold: 0.18,
    dominantColorScoreWeights: freezeRecord({
      colorDistanceScale: 765,
      colorDistanceWeight: 0.75,
      rankDistanceCap: 4,
      rankDistanceWeight: 0.0125,
      ratioWeight: 0.2,
    }),
    kindOrder: freezeArray([
      'dominant_color',
      'visible_region',
    ]),
    matchScoreThreshold: 0.72,
    minSupport: 2,
    regionAreaShiftThreshold: 0.2,
    regionCenterShiftThreshold: 0.14,
    regionSizeShiftThreshold: 0.38,
    visibleRegionScoreWeights: freezeRecord({
      areaShiftWeight: 1.5,
      centerShiftWeight: 1.9,
      geometryMismatchPenalty: 0.28,
      heightShiftWeight: 1.2,
      widthShiftWeight: 1.2,
    }),
    policyVersion,
    version: policyVersion,
  });
}

function createMeasurementPolicy(policyVersion) {
  return freezeRecord({
    policyVersion,
    numericPrecision: 6,
    supportedSignalKinds: freezeArray([
      'dominant_color',
      'visible_region',
    ]),
    version: policyVersion,
  });
}

function createInferencePolicy(policyVersion) {
  const supportPolicy = freezeRecord({
    minimumDistinctMeasurementTypes: 2,
    minimumDistinctSignalKinds: 2,
    minimumMeasuredSignals: 2,
    minDistinctMeasurementTypes: 2,
    minDistinctSignalKinds: 2,
    minMeasuredSignals: 2,
    policyVersion,
    requiresCrossKindDiversity: true,
    requiresDistinctMeasurementTypes: true,
    requiresDistinctStableSignalIds: true,
    requireDistinctStableSignalIds: true,
    supportRule: 'cross_kind_distinct_multi_signal',
    supportRuleVersion: policyVersion,
    supportType: 'bounded_structural_similarity',
    supportTypeVersion: policyVersion,
    version: policyVersion,
  });

  return freezeRecord({
    minimumDistinctMeasurementTypes: supportPolicy.minimumDistinctMeasurementTypes,
    minimumDistinctSignalKinds: supportPolicy.minimumDistinctSignalKinds,
    minimumMeasuredSignals: supportPolicy.minimumMeasuredSignals,
    minDistinctMeasurementTypes: supportPolicy.minDistinctMeasurementTypes,
    minDistinctSignalKinds: supportPolicy.minDistinctSignalKinds,
    minMeasuredSignals: supportPolicy.minMeasuredSignals,
    minSupport: supportPolicy.minMeasuredSignals,
    policyVersion,
    requiresCrossKindDiversity: supportPolicy.requiresCrossKindDiversity,
    requiresDistinctMeasurementTypes: supportPolicy.requiresDistinctMeasurementTypes,
    requiresDistinctStableSignalIds: supportPolicy.requiresDistinctStableSignalIds,
    requireDistinctStableSignalIds: supportPolicy.requireDistinctStableSignalIds,
    supportPolicy,
    supportRule: supportPolicy.supportRule,
    supportRuleVersion: supportPolicy.supportRuleVersion,
    supportType: supportPolicy.supportType,
    supportTypeVersion: supportPolicy.supportTypeVersion,
    version: policyVersion,
  });
}

function createZeePolicyManifest(policyVersion = ZEE_INTERNAL_ENGINE_POLICY_MANIFEST_VERSION) {
  return freezeRecord({
    comparator: createComparatorPolicy(policyVersion),
    extraction: createExtractorPolicy(policyVersion),
    inference: createInferencePolicy(policyVersion),
    input: createInputPolicy(policyVersion),
    measurement: createMeasurementPolicy(policyVersion),
    policyVersion,
    png: createPngPolicy(policyVersion),
    stability: createStabilityPolicy(policyVersion),
    version: policyVersion,
  });
}

const ZEE_INTERNAL_ENGINE_POLICY_MANIFEST = createZeePolicyManifest();
const ZEE_INTERNAL_ENGINE_COMPARATOR_POLICY = ZEE_INTERNAL_ENGINE_POLICY_MANIFEST.comparator;
const ZEE_INTERNAL_ENGINE_EXTRACTOR_POLICY = ZEE_INTERNAL_ENGINE_POLICY_MANIFEST.extraction;
const ZEE_INTERNAL_ENGINE_INFERENCE_POLICY = ZEE_INTERNAL_ENGINE_POLICY_MANIFEST.inference;
const ZEE_INTERNAL_ENGINE_INPUT_POLICY = ZEE_INTERNAL_ENGINE_POLICY_MANIFEST.input;
const ZEE_INTERNAL_ENGINE_MEASUREMENT_POLICY = ZEE_INTERNAL_ENGINE_POLICY_MANIFEST.measurement;
const ZEE_INTERNAL_ENGINE_PNG_POLICY = ZEE_INTERNAL_ENGINE_POLICY_MANIFEST.png;
const ZEE_INTERNAL_ENGINE_STABILITY_POLICY = ZEE_INTERNAL_ENGINE_POLICY_MANIFEST.stability;

module.exports = {
  ZEE_INTERNAL_ENGINE_COMPARATOR_POLICY,
  ZEE_INTERNAL_ENGINE_EXTRACTOR_POLICY,
  ZEE_INTERNAL_ENGINE_INFERENCE_POLICY,
  ZEE_INTERNAL_ENGINE_INPUT_POLICY,
  ZEE_INTERNAL_ENGINE_MEASUREMENT_POLICY,
  ZEE_INTERNAL_ENGINE_PNG_POLICY,
  ZEE_INTERNAL_ENGINE_POLICY_MANIFEST,
  ZEE_INTERNAL_ENGINE_POLICY_MANIFEST_VERSION,
  ZEE_INTERNAL_ENGINE_POLICY_VERSION,
  ZEE_INTERNAL_ENGINE_STABILITY_POLICY,
  createZeePolicyManifest,
};
