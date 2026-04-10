'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createZeePolicyManifest,
} = require('../../src/modules/zeroglare-evidence-engine/policy-manifest');
const {
  createZeePhaseSchemas,
} = require('../../src/modules/zeroglare-evidence-engine/phase-schemas');

test('ZEE policy manifest is explicitly versioned and carries declared thresholds and weights', () => {
  const manifest = createZeePolicyManifest('v2');

  assert.equal(manifest.version, 'v2');
  assert.equal(manifest.policyVersion, 'v2');
  assert.equal(manifest.comparator.version, 'v2');
  assert.equal(manifest.comparator.policyVersion, 'v2');
  assert.equal(manifest.comparator.ordering, 'utf8_nfc_bytewise');
  assert.equal(manifest.input.version, 'v2');
  assert.equal(manifest.input.policyVersion, 'v2');
  assert.equal(manifest.input.maxFrames, 8);
  assert.equal(manifest.png.version, 'v2');
  assert.equal(manifest.png.policyVersion, 'v2');
  assert.equal(manifest.png.requireCrc, true);
  assert.equal(manifest.png.requireIend, true);
  assert.equal(manifest.png.rejectBitDepths[0], 16);
  assert.equal(manifest.extraction.version, 'v2');
  assert.equal(manifest.extraction.policyVersion, 'v2');
  assert.equal(manifest.extraction.roundingPrecision, 4);
  assert.equal(manifest.extraction.activeTileThresholds.activity, 0.16);
  assert.equal(manifest.extraction.candidateScoreWeights.activityContribution, 1);
  assert.equal(manifest.extraction.tileActivityWeights.contrastContribution, 0.2);
  assert.equal(manifest.stability.version, 'v2');
  assert.equal(manifest.stability.policyVersion, 'v2');
  assert.equal(manifest.stability.defaultRoundingPrecision, 4);
  assert.equal(manifest.stability.minSupport, 2);
  assert.equal(manifest.stability.dominantColorScoreWeights.colorDistanceWeight, 0.75);
  assert.equal(manifest.measurement.version, 'v2');
  assert.equal(manifest.measurement.policyVersion, 'v2');
  assert.equal(manifest.measurement.numericPrecision, 6);
  assert.equal(manifest.inference.version, 'v2');
  assert.equal(manifest.inference.policyVersion, 'v2');
  assert.equal(manifest.inference.minSupport, 2);
  assert.equal(manifest.inference.supportRule, 'cross_kind_distinct_multi_signal');
  assert.equal(manifest.inference.requiresCrossKindDiversity, true);
  assert.equal(manifest.inference.supportPolicy.supportRule, 'cross_kind_distinct_multi_signal');
  assert.equal(manifest.inference.supportPolicy.requiresDistinctMeasurementTypes, true);
  assert.equal(manifest.inference.supportPolicy.requireDistinctStableSignalIds, true);
});

test('ZEE phase schemas are versioned and declare field ordering expectations', () => {
  const schemas = createZeePhaseSchemas('v2');

  assert.equal(schemas.observedFrame.version, 'v2');
  assert.equal(schemas.observedFrame.policyVersion, 'v2');
  assert.equal(schemas.observedFrame.ordering[0], 'schemaVersion');
  assert.equal(schemas.observedFrame.fields.schemaVersion.type, 'string');
  assert.equal(schemas.observedFrame.fields.frameMetadata.fields.schemaVersion.type, 'string');
  assert.equal(schemas.signalStability.version, 'v2');
  assert.equal(schemas.signalStability.policyVersion, 'v2');
  assert.equal(schemas.signalStability.ordering[0], 'schemaVersion');
  assert.equal(schemas.measurement.version, 'v2');
  assert.equal(schemas.measurement.policyVersion, 'v2');
  assert.equal(schemas.measurement.ordering[0], 'schemaVersion');
  assert.equal(schemas.inferenceGate.version, 'v2');
  assert.equal(schemas.inferenceGate.policyVersion, 'v2');
  assert.equal(schemas.inferenceGate.ordering[0], 'schemaVersion');
  assert.equal(schemas.inferenceGate.fields.resultTaxonomy.fields.refused.type, 'string');
  assert.equal(schemas.inferenceGate.fields.resultTaxonomy.fields.unsupported.type, 'string');
  assert.equal(schemas.inferenceGate.fields.supportPolicy.fields.supportRule.type, 'string');
  assert.equal(schemas.inferenceGate.fields.supportPolicy.fields.requiresCrossKindDiversity.type, 'boolean');
  assert.equal(schemas.supportedInference.fields.outcomeCategory.type, 'string');
  assert.equal(schemas.rejectedClaim.fields.outcomeCategory.type, 'string');
  assert.equal(schemas.unknownOutcome.fields.outcomeCategory.type, 'string');
  assert.equal(schemas.canonicalTrace.version, 'v2');
  assert.equal(schemas.canonicalTrace.policyVersion, 'v2');
  assert.equal(schemas.canonicalTrace.ordering[0], 'schemaVersion');
});
