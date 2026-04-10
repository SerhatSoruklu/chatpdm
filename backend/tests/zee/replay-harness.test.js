'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { runZeeReplayCase, runZeeReplaySuite } = require('../../src/modules/zeroglare-evidence-engine/replay-harness');

const ZEE_INFRASTRUCTURE_FRAME_PATH = path.resolve(
  __dirname,
  '../../../frontend/public/assets/zee/44e767cb-bfa1-4f8c-884c-473dfd7eaefd.png',
);

function buildReplayCase(caseId, frameOrder) {
  return {
    caseId,
    metadata: {
      description: `Replay case ${caseId} with explicit frame ordering.`,
      purpose: 'determinism',
      title: `${caseId} replay case`,
    },
    frames: frameOrder.map((frameIndex) => ({
      frameIndex,
      label: `${caseId}-frame-${frameIndex}`,
      path: ZEE_INFRASTRUCTURE_FRAME_PATH,
    })),
    options: {
      edgeThreshold: 24,
      tileSize: 32,
    },
  };
}

test('ZEE replay harness returns identical output across repeated runs', () => {
  const replayCase = buildReplayCase('alpha', [1, 0]);
  const first = runZeeReplayCase(replayCase);
  const second = runZeeReplayCase(replayCase);

  assert.deepEqual(second, first);
  assert.ok(typeof first.artifactId === 'string' && first.artifactId.length > 0);
  assert.equal(first.type, 'ZEE_EVIDENCE_TRACE');
  assert.equal(first.artifactKind, 'replay_case');
  assert.equal(first.contractMarker, 'ZEE_NON_CONSUMABLE_EVIDENCE_SURFACE');
  assert.equal(first.policyVersion, 'v1');
  assert.equal(first.schemaVersion, 'v1');
  assert.equal(first.traceContract.version, 'v1');
  assert.equal(first.traceContract.phaseOutcomeTaxonomySchemaVersion, 'v1');
  assert.equal(first.traceContract.replayManifestSchemaVersion, 'v1');
  assert.equal(first.canonicalReplayArtifact.schemaVersion, 'v1');
  assert.equal(first.canonicalTrace.type, 'ZEE_EVIDENCE_TRACE');
  assert.equal(first.canonicalTrace.artifactKind, 'canonical_trace');
  assert.equal(first.replayManifest.manifestType, 'case');
  assert.equal(first.replayManifest.manifestVersion, 'v1');
  assert.equal(first.replayManifest.schemaVersion, 'v1');
  assert.equal(first.replayManifest.resultTaxonomyVersion, 'v1');
  assert.equal(first.replayManifest.supportPolicy.minMeasuredSignals, 2);
  assert.equal(first.replayManifest.supportPolicy.minDistinctSignalKinds, 2);
  assert.equal(first.replayManifest.supportPolicy.supportRule, 'cross_kind_distinct_multi_signal');
  assert.equal(first.replayManifest.ordering.caseOrdering, 'case_id_utf8_nfc_bytewise');
  assert.equal(first.replayManifest.ordering.frameOrdering, 'frame_identity_utf8_nfc_bytewise');
  assert.equal(first.replayManifest.serialization.objectKeyOrdering, 'utf8_nfc_bytewise');
  assert.equal(first.replayManifest.serialization.textNormalization, 'nfc');
  assert.equal(first.layer, 'Replay Harness');
  assert.equal(first.caseId, 'alpha');
  assert.equal(first.observed.frames.length > 0, true);
  assert.equal(first.stable.layer, 'Signal Stability');
  assert.equal(first.measured.layer, 'Measured');
  assert.equal(Array.isArray(first.inferred), true);
  assert.equal(Array.isArray(first.rejected_claims), true);
  assert.equal(Array.isArray(first.unknowns), true);
  assert.equal(first.replayManifest.type, 'ZEE_EVIDENCE_TRACE');
  assert.equal(first.replayManifest.artifactKind, 'replay_manifest');
  assert.equal(first.replayManifest.contractMarker, 'ZEE_NON_CONSUMABLE_EVIDENCE_SURFACE');
  assert.equal(first.canonicalReplayArtifact.type, 'ZEE_EVIDENCE_TRACE');
  assert.equal(first.canonicalReplayArtifact.artifactKind, 'canonical_replay_artifact');
  assert.equal(first.canonicalReplayArtifact.contractMarker, 'ZEE_NON_CONSUMABLE_EVIDENCE_SURFACE');
  assert.equal(first.input.frames[0].frameId, first.canonicalTrace.frames[0].frameId);
  assert.equal(first.input.frames[0].sourcePath, undefined);
  assert.equal(first.input.frames[0].sourceType, undefined);
  assert.ok(
    first.diagnosticNotes.some((note) => note.code === 'replay_case'),
    'Expected the replay harness to explain how the case was executed.',
  );
});

test('ZEE replay harness preserves ordering stability for frames and cases', () => {
  const alpha = buildReplayCase('alpha', [0, 1]);
  const beta = buildReplayCase('beta', [1, 0]);

  const canonical = runZeeReplaySuite({
    cases: [alpha, beta],
    metadata: {
      suite: 'canonical',
    },
    suiteId: 'zee-replay-suite',
  });

  const reordered = runZeeReplaySuite({
    cases: [beta, alpha],
    metadata: {
      suite: 'canonical',
    },
    suiteId: 'zee-replay-suite',
  });

  assert.deepEqual(reordered, canonical);
  assert.deepEqual(canonical.caseIds, ['alpha', 'beta']);
  assert.equal(canonical.caseCount, 2);
  assert.ok(
    canonical.diagnosticNotes.some((note) => note.code === 'replay_suite_order'),
    'Expected the suite diagnostics to describe the deterministic ordering rule.',
  );
  assert.equal(canonical.policyVersion, 'v1');
  assert.equal(canonical.type, 'ZEE_EVIDENCE_TRACE');
  assert.equal(canonical.artifactKind, 'replay_suite');
  assert.equal(canonical.contractMarker, 'ZEE_NON_CONSUMABLE_EVIDENCE_SURFACE');
  assert.equal(canonical.schemaVersion, 'v1');
  assert.equal(canonical.traceContract.version, 'v1');
  assert.equal(canonical.traceContract.phaseOutcomeTaxonomySchemaVersion, 'v1');
  assert.equal(canonical.canonicalReplayArtifact.schemaVersion, 'v1');
  assert.equal(canonical.replayManifest.manifestType, 'suite');
  assert.equal(canonical.replayManifest.type, 'ZEE_EVIDENCE_TRACE');
  assert.equal(canonical.replayManifest.artifactKind, 'replay_manifest');
  assert.equal(canonical.replayManifest.contractMarker, 'ZEE_NON_CONSUMABLE_EVIDENCE_SURFACE');
  assert.equal(canonical.replayManifest.manifestVersion, 'v1');
  assert.equal(canonical.replayManifest.schemaVersion, 'v1');
  assert.equal(canonical.replayManifest.resultTaxonomyVersion, 'v1');
  assert.equal(canonical.replayManifest.ordering.objectKeyOrdering, 'utf8_nfc_bytewise');
  assert.equal(canonical.replayManifest.serialization.textNormalization, 'nfc');
  assert.deepEqual(canonical.replayManifest.caseIds, ['alpha', 'beta']);
});

test('ZEE replay harness uses locale-independent ordering for case identifiers', () => {
  const zeta = buildReplayCase('zeta', [0, 1]);
  const umlaut = buildReplayCase('äpsilon', [0, 1]);

  const suite = runZeeReplaySuite({
    cases: [umlaut, zeta],
    metadata: {
      suite: 'locale-check',
    },
    suiteId: 'locale-independent-suite',
  });

  assert.deepEqual(suite.caseIds, ['zeta', 'äpsilon']);
});
