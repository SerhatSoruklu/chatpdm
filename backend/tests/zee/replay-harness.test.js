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
  assert.equal(first.layer, 'Replay Harness');
  assert.equal(first.caseId, 'alpha');
  assert.equal(first.observed.frames.length > 0, true);
  assert.equal(first.stable.layer, 'Signal Stability');
  assert.equal(first.measured.layer, 'Measured');
  assert.equal(Array.isArray(first.inferred), true);
  assert.equal(Array.isArray(first.rejected_claims), true);
  assert.equal(Array.isArray(first.unknowns), true);
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
});
