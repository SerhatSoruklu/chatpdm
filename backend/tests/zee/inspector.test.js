'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  inspectZeeReplayCase,
  inspectZeeReplaySuite,
} = require('../../src/modules/zeroglare-evidence-engine/inspector');

const ZEE_INFRASTRUCTURE_FRAME_PATH = path.resolve(
  __dirname,
  '../../../frontend/public/assets/zee/44e767cb-bfa1-4f8c-884c-473dfd7eaefd.png',
);

function buildReplayCase(caseId, frameCount) {
  return {
    caseId,
    metadata: {
      description: `${caseId} inspector case`,
      purpose: 'debug',
      title: `${caseId} inspection`,
    },
    frames: Array.from({ length: frameCount }, (_unused, index) => ({
      frameIndex: index,
      label: `${caseId}-frame-${index}`,
      path: ZEE_INFRASTRUCTURE_FRAME_PATH,
    })),
    options: {
      edgeThreshold: 24,
      tileSize: 32,
    },
  };
}

test('ZEE inspector groups a replay case into traceable pipeline sections', () => {
  const replayCase = buildReplayCase('alpha-discard', 1);
  const first = inspectZeeReplayCase(replayCase);
  const second = inspectZeeReplayCase(replayCase);

  assert.deepEqual(second, first);
  assert.equal(first.kind, 'case');
  assert.equal(first.layer, 'Inspector');
  assert.equal(first.caseId, 'alpha-discard');
  assert.equal(first.observed.frames.length, 1);
  assert.equal(first.discarded.signals.length > 0, true);
  assert.equal(first.measured.signals.length, 0);
  assert.equal(first.inferred.inferences.length, 0);
  assert.equal(first.rejected.claims.length > 0, true);
  assert.equal(first.unknowns.items.length > 0, true);
  assert.ok(
    first.discarded.signals[0].discardReasons.length > 0,
    'Expected discarded signals to include explicit reasons.',
  );
  assert.ok(
    first.rejected.claims[0].reason,
    'Expected rejected claims to include an explicit reason.',
  );
  assert.ok(
    first.diagnosticNotes.some((note) => note.code === 'replay_case'),
    'Expected the replay case trace to be preserved in the inspector output.',
  );
});

test('ZEE inspector suite output stays deterministic and order-stable', () => {
  const discardedCase = buildReplayCase('alpha-discard', 1);
  const supportedCase = buildReplayCase('beta-support', 2);

  const canonical = inspectZeeReplaySuite({
    cases: [supportedCase, discardedCase],
    metadata: {
      suite: 'debug-suite',
    },
    suiteId: 'zee-inspector-suite',
  });

  const reordered = inspectZeeReplaySuite({
    cases: [discardedCase, supportedCase],
    metadata: {
      suite: 'debug-suite',
    },
    suiteId: 'zee-inspector-suite',
  });

  assert.deepEqual(reordered, canonical);
  assert.equal(canonical.kind, 'suite');
  assert.equal(canonical.layer, 'Inspector');
  assert.deepEqual(canonical.caseIds, ['alpha-discard', 'beta-support']);
  assert.equal(canonical.caseCount, 2);
  assert.equal(canonical.cases[0].discarded.signals.length > 0, true);
  assert.equal(canonical.cases[0].rejected.claims.length > 0, true);
  assert.equal(canonical.cases[1].stable.signals.length > 0, true);
  assert.equal(canonical.cases[1].measured.signals.length > 0, true);
  assert.equal(canonical.cases[1].inferred.inferences.length > 0, true);
  assert.ok(
    canonical.diagnosticNotes.some((note) => note.code === 'inspector_suite_order'),
    'Expected the inspector suite to explain the deterministic ordering rule.',
  );
});
