'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { analyzeZeeObservedFrames } = require('../../src/modules/zeroglare-evidence-engine');

const ZEE_INFRASTRUCTURE_FRAME_PATH = path.resolve(
  __dirname,
  '../../../frontend/public/assets/zee/44e767cb-bfa1-4f8c-884c-473dfd7eaefd.png',
);

test('ZEE Internal Engine v1 emits observed-only structured output for valid frame input', () => {
  const output = analyzeZeeObservedFrames({
    frames: [
      { label: 'zee-infographic-primary', path: ZEE_INFRASTRUCTURE_FRAME_PATH },
      { label: 'zee-infographic-secondary', path: ZEE_INFRASTRUCTURE_FRAME_PATH },
    ],
  });

  assert.equal(output.engine.name, 'ZEE Internal Engine');
  assert.equal(output.engine.version, 'v1');
  assert.equal(output.engine.layer, 'Observed');
  assert.deepEqual(output.engine.supportedFormats, ['png']);

  assert.equal(output.input.frameCount, 2);
  assert.equal(output.frames.length, 2);
  assert.equal(output.observedSummary.frameCount, 2);
  assert.equal(output.observedSummary.observedLayer, 'Observed');
  assert.equal(output.signalStability.layer, 'Signal Stability');
  assert.equal(output.signalStability.frameCount, 2);
  assert.ok(output.signalStability.stableSignals.length > 0);
  assert.equal(output.signalStability.discardedSignals.length, 0);
  assert.equal(output.measurementLayer.layer, 'Measured');
  assert.equal(output.measurementLayer.frameCount, 2);
  assert.ok(output.measurementLayer.measurements.length > 0);
  assert.equal(output.measurementLayer.discardedMeasurements.length, 0);
  assert.equal(output.inferenceGate.layer, 'Inference Gate');
  assert.equal(output.inferenceGate.frame_count, 2);
  assert.ok(output.inferenceGate.supported_inferences.length > 0);
  assert.ok(output.inferenceGate.rejected_claims.length > 0);
  assert.ok(
    output.measurementLayer.measurements.every((measurement) => measurement.measurementDiagnostics.length > 0),
    'Expected each measured signal to include diagnostics.',
  );
  assert.ok(
    output.inferenceGate.rejected_claims.some((claim) => claim.claim_type === 'identity_inference'),
    'Expected the inference gate to reject identity claims explicitly.',
  );
  assert.equal(output.frames[0].frameMetadata.imageFormat, 'png');
  assert.equal(output.frames[0].frameMetadata.width, 1369);
  assert.equal(output.frames[0].frameMetadata.height, 1149);
  assert.ok(output.frames[0].observedFeatures.dominantColors.length > 0);
  assert.ok(output.frames[0].observedFeatures.edgeMetrics.combinedDensity > 0);
  assert.ok(output.frames[0].observedFeatures.visibleGeometricRegions.length > 0);
  assert.ok(
    output.frames[0].diagnosticNotes.some((note) => note.code === 'observed_only'),
    'Expected the frame diagnostic notes to state observed-only extraction.',
  );
  assert.ok(
    output.diagnosticNotes.some((note) => note.code === 'module_isolation'),
    'Expected the top-level diagnostics to state module isolation.',
  );
});

test('ZEE Internal Engine v1 rejects invalid frame inputs', () => {
  assert.throws(
    () => analyzeZeeObservedFrames({ frames: [] }),
    (error) => {
      assert.equal(error.code, 'invalid_zee_input');
      assert.match(error.message, /at least one frame/i);
      return true;
    },
  );

  assert.throws(
    () => analyzeZeeObservedFrames({ frames: [Buffer.from('not a png frame')] }),
    (error) => {
      assert.equal(error.code, 'invalid_zee_image');
      assert.match(error.message, /PNG frames only/i);
      return true;
    },
  );
});

test('ZEE Internal Engine v1 returns deterministic output for the same input', () => {
  const first = analyzeZeeObservedFrames({
    frames: [
      { label: 'zee-infographic', path: ZEE_INFRASTRUCTURE_FRAME_PATH },
    ],
  });

  const second = analyzeZeeObservedFrames({
    frames: [
      { label: 'zee-infographic', path: ZEE_INFRASTRUCTURE_FRAME_PATH },
    ],
  });

  assert.deepEqual(second, first);
});
