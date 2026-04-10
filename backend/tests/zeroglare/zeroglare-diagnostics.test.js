'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildZeroglareDiagnostics,
} = require('../../src/modules/concepts/zeroglare-diagnostics');
const {
  validateAndExposeOutput,
} = require('../../src/modules/concepts/output-validation-gate');
const {
  runFullPipeline,
} = require('../../src/modules/concepts/pipeline-runner');
const { analyzeZeeObservedFrames } = require('../../src/modules/zeroglare-evidence-engine');

const ZEE_INFRASTRUCTURE_FRAME_PATH = path.resolve(
  __dirname,
  '../../../frontend/public/assets/zee/44e767cb-bfa1-4f8c-884c-473dfd7eaefd.png',
);

test('Zeroglare diagnostics flag the full signal stack for a noisy bridge query', () => {
  const diagnostics = buildZeroglareDiagnostics(
    'Basically, authority vs legitimacy means the same thing for all cases.',
  );

  assert.equal(diagnostics.layer, 'zeroglare');
  assert.equal(diagnostics.status, 'pressure');
  assert.equal(diagnostics.summary.state, 'pressure');
  assert.equal(diagnostics.summary.primary_signal, 'rhetorical_noise');
  assert.deepEqual(diagnostics.summary.active_signals, [
    'rhetorical_noise',
    'ambiguity_surface',
    'unsupported_semantic_bridge',
    'scope_pressure',
  ]);

  const rhetoricalNoise = diagnostics.signals.find((signal) => signal.code === 'rhetorical_noise');
  const ambiguitySurface = diagnostics.signals.find((signal) => signal.code === 'ambiguity_surface');
  const unsupportedBridge = diagnostics.signals.find((signal) => signal.code === 'unsupported_semantic_bridge');
  const scopePressure = diagnostics.signals.find((signal) => signal.code === 'scope_pressure');

  assert.equal(rhetoricalNoise.detected, true);
  assert.equal(ambiguitySurface.detected, true);
  assert.equal(unsupportedBridge.detected, true);
  assert.equal(scopePressure.detected, true);

  assert.ok(rhetoricalNoise.evidence.includes('basically'));
  assert.ok(ambiguitySurface.evidence.includes('vs'));
  assert.ok(unsupportedBridge.evidence.includes('means'));
  assert.ok(scopePressure.evidence.includes('all cases'));
});

test('Zeroglare diagnostics stay clear for a direct concept query', () => {
  const diagnostics = buildZeroglareDiagnostics('authority');

  assert.equal(diagnostics.status, 'clear');
  assert.equal(diagnostics.summary.state, 'clear');
  assert.equal(diagnostics.summary.primary_signal, null);
  assert.deepEqual(diagnostics.summary.active_signals, []);
  assert.ok(diagnostics.signals.every((signal) => signal.detected === false));
});

test('Zeroglare diagnostics stay clear for empty input', () => {
  const diagnostics = buildZeroglareDiagnostics('');

  assert.equal(diagnostics.status, 'clear');
  assert.equal(diagnostics.summary.state, 'clear');
  assert.equal(diagnostics.summary.primary_signal, null);
  assert.deepEqual(diagnostics.summary.active_signals, []);
  assert.ok(diagnostics.signals.every((signal) => signal.detected === false));
});

test('runFullPipeline stays deterministic for empty input', () => {
  const result = runFullPipeline('');

  assert.equal(result.raw_query, '');
  assert.equal(result.normalized_query, '__empty__');
  assert.equal(result.admission_state, 'NOT_A_CONCEPT');
  assert.equal(result.resolution_output.type, 'NO_MATCH');
  assert.equal(result.final_output.state, 'refused');
  assert.equal(result.zeroglare_diagnostics.status, 'clear');
  assert.equal(
    Object.prototype.propertyIsEnumerable.call(result, 'zeroglare_diagnostics'),
    false,
  );
});

test('runFullPipeline exposes Zeroglare diagnostics without changing the enumerable pipeline contract', () => {
  const result = runFullPipeline('authority');

  assert.equal(result.zeroglare_diagnostics.status, 'clear');
  assert.equal(result.zeroglare_diagnostics.summary.primary_signal, null);
  assert.equal(
    Object.prototype.propertyIsEnumerable.call(result, 'zeroglare_diagnostics'),
    false,
  );
  assert.equal(Object.keys(result).includes('zeroglare_diagnostics'), false);
});

test('runFullPipeline rejects ZEE-shaped artifacts at the runtime boundary', () => {
  assert.throws(
    () => runFullPipeline({
      artifactId: 'zee-trace:deadbeef',
      engine: {
        name: 'ZEE Internal Engine',
      },
      frames: [],
      inferenceGate: {
        layer: 'Inference Gate',
      },
      measurementLayer: {
        layer: 'Measured',
      },
      observedSummary: {
        frameCount: 0,
      },
      signalStability: {
        layer: 'Signal Stability',
      },
      traceContract: {
        version: 'v1',
      },
    }),
    (error) => {
      assert.equal(error.code, 'ZEE_ARTIFACT_CONSUMPTION_BLOCKED');
      assert.match(error.message, /non-consumption boundary/i);
      return true;
    },
  );
});

test('validateAndExposeOutput rejects ZEE artifact shapes with a structured governance error', () => {
  const zeeArtifact = analyzeZeeObservedFrames({
    frames: [
      fs.readFileSync(ZEE_INFRASTRUCTURE_FRAME_PATH),
    ],
  });

  assert.throws(
    () => validateAndExposeOutput(zeeArtifact),
    (error) => {
      assert.equal(error.code, 'ZEE_ARTIFACT_CONSUMPTION_BLOCKED');
      assert.equal(error.name, 'ZeeGovernanceBoundaryError');
      assert.equal(error.details.marker.type, 'ZEE_EVIDENCE_TRACE');
      assert.match(error.message, /non-consumption boundary/i);
      return true;
    },
  );
});
