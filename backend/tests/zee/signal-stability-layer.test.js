'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { buildZeeSignalStabilityReport } = require('../../src/modules/zeroglare-evidence-engine/signal-stability-layer');

function buildFrameReport(frameIndex, variant) {
  const stableColor = {
    hex: '#f28c28',
    rank: 1,
    rgba: {
      alpha: 255,
      blue: 40,
      green: 140,
      red: 242,
    },
    ratio: 0.42 + (frameIndex * 0.01),
  };

  const neutralColor = {
    hex: '#f5f5f5',
    rank: 2,
    rgba: {
      alpha: 255,
      blue: 245,
      green: 245,
      red: 245,
    },
    ratio: 0.22,
  };

  const stableRegion = {
    bounds: {
      height: 60,
      left: 12,
      top: 10,
      width: 8,
    },
    edgeDensity: 0.31,
    geometryClass: 'vertical_strip',
    pixelCoverage: 0.048,
    score: 0.93,
    variance: 120,
  };

  const unstableRegion = frameIndex < 2
    ? {
        bounds: {
          height: 10,
          left: 60 + frameIndex,
          top: 58 + frameIndex,
          width: 10 + frameIndex,
        },
        edgeDensity: 0.12,
        geometryClass: 'compact_block',
        pixelCoverage: 0.01 + (frameIndex * 0.002),
        score: 0.44 + (frameIndex * 0.01),
        variance: 70 + (frameIndex * 3),
      }
    : {
        bounds: {
          height: 12,
          left: 4,
          top: 6,
          width: 28,
        },
        edgeDensity: 0.09,
        geometryClass: 'wide_panel',
        pixelCoverage: 0.0336,
        score: 0.49,
        variance: 55,
      };

  const dominantColors = variant === 'reversed'
    ? [neutralColor, stableColor]
    : [stableColor, neutralColor];

  const visibleGeometricRegions = variant === 'reversed'
    ? [unstableRegion, stableRegion]
    : [stableRegion, unstableRegion];

  return {
    frameIndex,
    frameMetadata: {
      height: 100,
      width: 100,
    },
    observedFeatures: {
      dominantColors,
      visibleGeometricRegions,
    },
  };
}

function buildFrameReports(variant = 'normal') {
  return [
    buildFrameReport(0, variant),
    buildFrameReport(1, variant),
    buildFrameReport(2, variant),
  ];
}

test('signal stability retains recurring stable signals across adjacent frames', () => {
  const report = buildZeeSignalStabilityReport(buildFrameReports());

  const stableColor = report.stableSignals.find(
    (signal) => signal.signalKind === 'dominant_color' && signal.signalKey === 'dominant_color:#f28c28',
  );
  const stableRegion = report.stableSignals.find(
    (signal) => signal.signalKind === 'visible_region' && signal.signalKey.startsWith('visible_region:vertical_strip'),
  );

  assert.ok(stableColor, 'Expected the recurring dominant color to be retained.');
  assert.ok(stableRegion, 'Expected the recurring region to be retained.');
  assert.equal(stableColor.status, 'stable');
  assert.equal(stableColor.outcomeCategory, 'STABLE');
  assert.equal(stableColor.support.frameCount, 3);
  assert.equal(stableRegion.status, 'stable');
  assert.equal(stableRegion.outcomeCategory, 'STABLE');
  assert.equal(stableRegion.support.frameCount, 3);
  assert.equal(report.discardedSignals.some((signal) => signal.signalKind === 'dominant_color'), false);
});

test('signal stability discards unstable region signals with explicit reasons', () => {
  const report = buildZeeSignalStabilityReport(buildFrameReports());

  const discardedRegion = report.discardedSignals.find(
    (signal) => signal.signalKind === 'visible_region' && signal.signalKey.startsWith('visible_region:compact_block'),
  );

  assert.ok(discardedRegion, 'Expected the unstable region to be discarded.');
  assert.equal(discardedRegion.status, 'discarded');
  assert.equal(discardedRegion.outcomeCategory, 'DISCARDED');
  assert.equal(discardedRegion.support.frameCount, 2);
  assert.ok(
    discardedRegion.discardReasons.some((reason) => reason.code === 'location_shift' || reason.code === 'form_change'),
    'Expected the discard reasons to explain the instability.',
  );
  assert.ok(
    discardedRegion.discardReasons.length > 0,
    'Expected at least one explicit discard reason.',
  );
});

test('signal stability output ordering is deterministic', () => {
  const first = buildZeeSignalStabilityReport(buildFrameReports('normal'));
  const second = buildZeeSignalStabilityReport(buildFrameReports('reversed'));

  assert.deepEqual(second, first);

  assert.deepEqual(
    first.stableSignals.map((signal) => signal.signalKind),
    ['dominant_color', 'dominant_color', 'visible_region'],
  );
  assert.equal(first.type, 'ZEE_EVIDENCE_TRACE');
  assert.equal(first.artifactKind, 'signal_stability');
  assert.equal(first.contractMarker, 'ZEE_NON_CONSUMABLE_EVIDENCE_SURFACE');
  assert.equal(first.policyVersion, 'v1');
  assert.equal(first.schemaVersion, 'v1');
  assert.equal(first.resultTaxonomyVersion, 'v1');
  assert.equal(first.resultTaxonomy.stable, 'STABLE');
  assert.equal(first.resultTaxonomy.discarded, 'DISCARDED');
});
