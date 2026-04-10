'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { analyzeZeeObservedFrames } = require('../../src/modules/zeroglare-evidence-engine');
const {
  computeCrc32,
} = require('../../src/modules/zeroglare-evidence-engine/policy');

const ZEE_INFRASTRUCTURE_FRAME_PATH = path.resolve(
  __dirname,
  '../../../frontend/public/assets/zee/44e767cb-bfa1-4f8c-884c-473dfd7eaefd.png',
);

function readInfrastructureFrameBuffer(framePath = ZEE_INFRASTRUCTURE_FRAME_PATH) {
  return fs.readFileSync(framePath);
}

function mutateInfrastructureIhdrBitDepthTo16(buffer) {
  const mutated = Buffer.from(buffer);
  const ihdrDataOffset = 16;
  const ihdrDataLength = 13;
  const ihdrCrcOffset = ihdrDataOffset + ihdrDataLength;

  mutated.writeUInt8(16, ihdrDataOffset + 8);
  const crc = computeCrc32([
    Buffer.from('IHDR', 'ascii'),
    mutated.subarray(ihdrDataOffset, ihdrDataOffset + ihdrDataLength),
  ]);
  mutated.writeUInt32BE(crc, ihdrCrcOffset);

  return mutated;
}

function mutateInfrastructureIhdrDataWithoutUpdatingCrc(buffer) {
  const mutated = Buffer.from(buffer);
  const ihdrDataOffset = 16;

  mutated[ihdrDataOffset + 8] ^= 0x01;

  return mutated;
}

function truncateInfrastructureIend(buffer) {
  return Buffer.from(buffer.subarray(0, buffer.length - 12));
}

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
  assert.equal(output.engine.policyVersion, 'v1');
  assert.equal(output.traceContract.version, 'v1');
  assert.equal(output.traceContract.observedFrameArtifactSchemaVersion, 'v1');
  assert.equal(output.traceContract.canonicalReplayArtifactSchemaVersion, 'v1');
  assert.equal(output.traceContract.observedFrameSchemaVersion, 'v1');
  assert.equal(output.traceContract.signalStabilitySchemaVersion, 'v1');
  assert.equal(output.traceContract.measurementSchemaVersion, 'v1');
  assert.equal(output.traceContract.inferenceGateSchemaVersion, 'v1');
  assert.equal(output.traceContract.phaseOutcomeTaxonomySchemaVersion, 'v1');
  assert.equal(output.traceContract.replayManifestSchemaVersion, 'v1');
  assert.equal(output.traceContract.supportPolicySchemaVersion, 'v1');
  assert.ok(typeof output.artifactId === 'string' && output.artifactId.length > 0);
  assert.equal(output.policyVersion, 'v1');
  assert.equal(output.schemaVersion, 'v1');
  assert.equal(output.type, 'ZEE_EVIDENCE_TRACE');
  assert.equal(output.artifactKind, 'canonical_trace');
  assert.equal(output.contractMarker, 'ZEE_NON_CONSUMABLE_EVIDENCE_SURFACE');

  assert.equal(output.input.frameCount, 2);
  assert.equal(output.input.artifactId, output.artifactId);
  assert.equal(output.frames.length, 2);
  assert.equal(output.observedSummary.frameCount, 2);
  assert.equal(output.observedSummary.observedLayer, 'Observed');
  assert.equal(output.signalStability.layer, 'Signal Stability');
  assert.equal(output.signalStability.frameCount, 2);
  assert.equal(output.signalStability.type, 'ZEE_EVIDENCE_TRACE');
  assert.equal(output.signalStability.artifactKind, 'signal_stability');
  assert.equal(output.signalStability.contractMarker, 'ZEE_NON_CONSUMABLE_EVIDENCE_SURFACE');
  assert.equal(output.signalStability.policyVersion, 'v1');
  assert.equal(output.signalStability.schemaVersion, 'v1');
  assert.equal(output.signalStability.resultTaxonomyVersion, 'v1');
  assert.equal(output.signalStability.resultTaxonomy.stable, 'STABLE');
  assert.equal(output.signalStability.resultTaxonomy.discarded, 'DISCARDED');
  assert.ok(output.signalStability.stableSignals.length > 0);
  assert.equal(output.signalStability.stableSignals[0].outcomeCategory, 'STABLE');
  assert.equal(output.signalStability.discardedSignals.length, 0);
  assert.equal(output.measurementLayer.layer, 'Measured');
  assert.equal(output.measurementLayer.frameCount, 2);
  assert.equal(output.measurementLayer.type, 'ZEE_EVIDENCE_TRACE');
  assert.equal(output.measurementLayer.artifactKind, 'measurement');
  assert.equal(output.measurementLayer.contractMarker, 'ZEE_NON_CONSUMABLE_EVIDENCE_SURFACE');
  assert.equal(output.measurementLayer.policyVersion, 'v1');
  assert.equal(output.measurementLayer.schemaVersion, 'v1');
  assert.equal(output.measurementLayer.resultTaxonomyVersion, 'v1');
  assert.equal(output.measurementLayer.resultTaxonomy.measured, 'MEASURED');
  assert.equal(output.measurementLayer.resultTaxonomy.discarded, 'DISCARDED');
  assert.ok(output.measurementLayer.measurements.length > 0);
  assert.equal(output.measurementLayer.measurements[0].outcomeCategory, 'MEASURED');
  assert.equal(output.measurementLayer.discardedMeasurements.length, 0);
  assert.equal(output.inferenceGate.layer, 'Inference Gate');
  assert.equal(output.inferenceGate.frame_count, 2);
  assert.equal(output.inferenceGate.type, 'ZEE_EVIDENCE_TRACE');
  assert.equal(output.inferenceGate.artifactKind, 'inference_gate');
  assert.equal(output.inferenceGate.contractMarker, 'ZEE_NON_CONSUMABLE_EVIDENCE_SURFACE');
  assert.equal(output.inferenceGate.policyVersion, 'v1');
  assert.equal(output.inferenceGate.schemaVersion, 'v1');
  assert.equal(output.inferenceGate.resultTaxonomyVersion, 'v1');
  assert.equal(output.inferenceGate.resultTaxonomy.supported, 'SUPPORTED');
  assert.equal(output.inferenceGate.resultTaxonomy.refused, 'REFUSED');
  assert.equal(output.inferenceGate.resultTaxonomy.unsupported, 'UNSUPPORTED');
  assert.equal(output.inferenceGate.resultTaxonomy.unknown, 'UNKNOWN');
  assert.equal(output.inferenceGate.supportPolicy.minMeasuredSignals, 2);
  assert.equal(output.inferenceGate.supportPolicy.supportRule, 'cross_kind_distinct_multi_signal');
  assert.equal(output.inferenceGate.supportPolicy.requiresCrossKindDiversity, true);
  assert.ok(output.inferenceGate.supported_inferences.length > 0);
  assert.equal(output.inferenceGate.supported_inferences[0].outcomeCategory, 'SUPPORTED');
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
  assert.equal(output.frames[0].frameMetadata.artifactSchemaVersion, 'v1');
  assert.equal(output.frames[0].frameMetadata.schemaVersion, 'v1');
  assert.equal(output.frames[0].frameMetadata.policyVersion, 'v1');
  assert.equal(output.frames[0].type, 'ZEE_EVIDENCE_TRACE');
  assert.equal(output.frames[0].artifactKind, 'observed_frame');
  assert.equal(output.frames[0].contractMarker, 'ZEE_NON_CONSUMABLE_EVIDENCE_SURFACE');
  assert.equal(output.frames[0].schemaVersion, 'v1');
  assert.ok(output.frames[0].frameMetadata.artifactId.length > 0);
  assert.equal(output.frames[0].frameMetadata.sourcePath, undefined);
  assert.equal(output.frames[0].frameMetadata.sourceType, undefined);
  assert.equal(output.frames[0].frameMetadata.fileName, undefined);
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

test('ZEE Internal Engine v1 emits path-free canonical output for identical bytes from different sources', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatpdm-zee-'));
  const copiedFramePath = path.join(tempDir, 'copy.png');

  try {
    fs.copyFileSync(ZEE_INFRASTRUCTURE_FRAME_PATH, copiedFramePath);
    const pathOutput = analyzeZeeObservedFrames({
      frames: [
        copiedFramePath,
      ],
    });
    const pathOutputFromOriginal = analyzeZeeObservedFrames({
      frames: [
        ZEE_INFRASTRUCTURE_FRAME_PATH,
      ],
    });
    const bufferOutput = analyzeZeeObservedFrames({
      frames: [
        readInfrastructureFrameBuffer(),
      ],
    });

    assert.deepEqual(pathOutput, pathOutputFromOriginal);
    assert.deepEqual(bufferOutput, pathOutputFromOriginal);
    assert.equal(pathOutput.frames[0].frameMetadata.sourcePath, undefined);
    assert.equal(pathOutput.frames[0].frameMetadata.sourceType, undefined);
    assert.equal(pathOutput.frames[0].frameMetadata.fileName, undefined);
    assert.equal(pathOutput.input.frames[0].sourcePath, undefined);
    assert.equal(pathOutput.input.frames[0].sourceType, undefined);
  } finally {
    fs.rmSync(tempDir, { force: true, recursive: true });
  }
});

test('ZEE Internal Engine v1 rejects PNG frames with bad CRC, malformed IEND, and 16-bit payloads', () => {
  const originalBuffer = readInfrastructureFrameBuffer();

  assert.throws(
    () => analyzeZeeObservedFrames({
      frames: [
        mutateInfrastructureIhdrDataWithoutUpdatingCrc(originalBuffer),
      ],
    }),
    (error) => {
      assert.equal(error.code, 'invalid_zee_image');
      assert.match(error.message, /CRC/i);
      return true;
    },
  );

  assert.throws(
    () => analyzeZeeObservedFrames({
      frames: [
        truncateInfrastructureIend(originalBuffer),
      ],
    }),
    (error) => {
      assert.equal(error.code, 'invalid_zee_image');
      assert.match(error.message, /IEND/i);
      return true;
    },
  );

  assert.throws(
    () => analyzeZeeObservedFrames({
      frames: [
        mutateInfrastructureIhdrBitDepthTo16(originalBuffer),
      ],
    }),
    (error) => {
      assert.equal(error.code, 'invalid_zee_image');
      assert.match(error.message, /16-bit/i);
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
