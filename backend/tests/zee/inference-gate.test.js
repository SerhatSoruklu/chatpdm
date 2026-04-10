'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { buildZeeInferenceGateReport } = require('../../src/modules/zeroglare-evidence-engine/inference-gate');

function buildDominantColorMeasurement() {
  return {
    measurementDiagnostics: [
      {
        code: 'measurement_stub',
        message: 'Dominant color measurement stub.',
      },
    ],
    measurementType: 'dominant_palette_distribution',
    measurementValue: {
      averageRatio: {
        kind: 'numeric',
        precision: 6,
        unit: 'ratio',
        value: 0.4,
      },
      hex: {
        kind: 'categorical',
        value: '#f28c28',
      },
    },
    signalKind: 'dominant_color',
    stableSignalId: 'dominant_color:#f28c28:f0',
    status: 'measured',
  };
}

function buildVisibleRegionMeasurement() {
  return {
    measurementDiagnostics: [
      {
        code: 'measurement_stub',
        message: 'Visible region measurement stub.',
      },
    ],
    measurementType: 'region_geometry_profile',
    measurementValue: {
      aspectRatio: {
        kind: 'numeric',
        precision: 6,
        unit: 'ratio',
        value: 0.5,
      },
      geometryClass: {
        kind: 'categorical',
        value: 'vertical_strip',
      },
      centerX: {
        kind: 'numeric',
        precision: 6,
        unit: 'ratio',
        value: 0.16,
      },
    },
    signalKind: 'visible_region',
    stableSignalId: 'visible_region:vertical_strip:20:30:80:160:f0',
    status: 'measured',
  };
}

function buildInferenceInput(variant = 'canonical') {
  const measurements = variant === 'reversed'
    ? [buildVisibleRegionMeasurement(), buildDominantColorMeasurement()]
    : [buildDominantColorMeasurement(), buildVisibleRegionMeasurement()];

  return {
    frameCount: 3,
    layer: 'Measured',
    measurements,
    sourceLayer: 'Signal Stability',
    sourceVersion: 'v1',
    version: 'v1',
  };
}

test('inference gate supports a bounded structural similarity claim when multiple measured signals are present', () => {
  const report = buildZeeInferenceGateReport(buildInferenceInput());

  assert.equal(report.layer, 'Inference Gate');
  assert.equal(report.supported_inferences.length, 1);
  assert.equal(report.supported_inferences[0].inference_type, 'multi_signal_structural_similarity');
  assert.equal(report.supported_inferences[0].supporting_signals.length, 2);
  assert.equal(report.supported_inferences[0].supporting_signals[0].stable_signal_id, 'dominant_color:#f28c28:f0');
  assert.equal(report.supported_inferences[0].supporting_signals[1].stable_signal_id, 'visible_region:vertical_strip:20:30:80:160:f0');
  assert.ok(
    report.supported_inferences[0].reasoning.some((step) => step.code === 'multi_signal_requirement'),
    'Expected the inference to document the multi-signal threshold.',
  );
  assert.ok(
    report.rejected_claims.some((claim) => claim.claim_type === 'identity_inference'),
    'Expected identity claims to be rejected explicitly.',
  );
  assert.ok(
    report.rejected_claims.some((claim) => claim.claim_type === 'truth_claim'),
    'Expected truth claims to be rejected explicitly.',
  );
  assert.ok(Array.isArray(report.unknowns));
  assert.equal(report.unknowns[0].unknown_type, 'semantic_reconstruction_unknown');
});

test('inference gate rejects single-signal inference with explicit reasons', () => {
  const report = buildZeeInferenceGateReport({
    ...buildInferenceInput(),
    measurements: [buildDominantColorMeasurement()],
  });

  const rejectedSingleSignal = report.rejected_claims.find((claim) => claim.claim_type === 'single_signal_inference');

  assert.equal(report.supported_inferences.length, 0);
  assert.ok(rejectedSingleSignal, 'Expected a single-signal inference rejection.');
  assert.equal(rejectedSingleSignal.status, 'rejected');
  assert.equal(rejectedSingleSignal.reason.code, 'insufficient_signal_support');
  assert.equal(rejectedSingleSignal.supporting_signals.length, 1);
  assert.ok(
    rejectedSingleSignal.reasoning.some((step) => step.code === 'insufficient_signal_support'),
    'Expected the rejection reasoning to explain why a single signal is insufficient.',
  );
});

test('inference gate output ordering is deterministic', () => {
  const canonical = buildZeeInferenceGateReport(buildInferenceInput('canonical'));
  const reversed = buildZeeInferenceGateReport(buildInferenceInput('reversed'));

  assert.deepEqual(reversed, canonical);
});
