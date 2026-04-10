'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { buildZeeMeasurementReport } = require('../../src/modules/zeroglare-evidence-engine/measurement-layer');

function buildDominantColorSignal() {
  return {
    observations: [
      {
        frameHeight: 100,
        frameIndex: 0,
        frameWidth: 200,
        hex: '#f28c28',
        observationType: 'dominant_color',
        rgba: {
          alpha: 255,
          blue: 40,
          green: 140,
          red: 242,
        },
        rank: 1,
        ratio: 0.4000001,
      },
      {
        frameHeight: 100,
        frameIndex: 1,
        frameWidth: 200,
        hex: '#f28c28',
        observationType: 'dominant_color',
        rgba: {
          alpha: 255,
          blue: 40,
          green: 140,
          red: 242,
        },
        rank: 1,
        ratio: 0.3999999,
      },
      {
        frameHeight: 100,
        frameIndex: 2,
        frameWidth: 200,
        hex: '#f28c28',
        observationType: 'dominant_color',
        rgba: {
          alpha: 255,
          blue: 40,
          green: 140,
          red: 242,
        },
        rank: 1,
        ratio: 0.4,
      },
    ],
    signalId: 'dominant_color:#f28c28:f0',
    signalKey: 'dominant_color:#f28c28',
    signalKind: 'dominant_color',
    stability: {
      averageTransitionScore: 0.98,
      status: 'stable',
      transitionCount: 2,
    },
    status: 'stable',
    support: {
      consecutiveFrameCount: 3,
      firstFrameIndex: 0,
      frameCount: 3,
      frames: [0, 1, 2],
      lastFrameIndex: 2,
    },
    transitionDetails: [],
  };
}

function buildVisibleRegionSignal() {
  return {
    observations: [
      {
        bounds: {
          height: 160,
          left: 20,
          top: 30,
          width: 80,
        },
        center: {
          x: 0.15,
          y: 0.55,
        },
        edgeDensity: 0.31,
        frameHeight: 200,
        frameIndex: 0,
        frameWidth: 400,
        geometryClass: 'vertical_strip',
        observationType: 'visible_region',
        pixelCoverage: 0.16,
        score: 0.93,
        variance: 120,
      },
      {
        bounds: {
          height: 160,
          left: 21,
          top: 31,
          width: 80,
        },
        center: {
          x: 0.16,
          y: 0.56,
        },
        edgeDensity: 0.32,
        frameHeight: 200,
        frameIndex: 1,
        frameWidth: 400,
        geometryClass: 'vertical_strip',
        observationType: 'visible_region',
        pixelCoverage: 0.16,
        score: 0.92,
        variance: 121,
      },
      {
        bounds: {
          height: 160,
          left: 22,
          top: 32,
          width: 80,
        },
        center: {
          x: 0.17,
          y: 0.57,
        },
        edgeDensity: 0.33,
        frameHeight: 200,
        frameIndex: 2,
        frameWidth: 400,
        geometryClass: 'vertical_strip',
        observationType: 'visible_region',
        pixelCoverage: 0.16,
        score: 0.91,
        variance: 122,
      },
    ],
    signalId: 'visible_region:vertical_strip:20:30:80:160:f0',
    signalKey: 'visible_region:vertical_strip:20:30:80:160',
    signalKind: 'visible_region',
    stability: {
      averageTransitionScore: 0.95,
      status: 'stable',
      transitionCount: 2,
    },
    status: 'stable',
    support: {
      consecutiveFrameCount: 3,
      firstFrameIndex: 0,
      frameCount: 3,
      frames: [0, 1, 2],
      lastFrameIndex: 2,
    },
    transitionDetails: [],
  };
}

function buildUnsupportedSignal() {
  return {
    observations: [
      {
        frameIndex: 0,
        text: 'unsupported label',
      },
    ],
    signalId: 'text_fragment:banner:f0',
    signalKey: 'text_fragment:banner',
    signalKind: 'text_fragment',
    stability: {
      averageTransitionScore: 1,
      status: 'stable',
      transitionCount: 0,
    },
    status: 'stable',
    support: {
      consecutiveFrameCount: 1,
      firstFrameIndex: 0,
      frameCount: 1,
      frames: [0],
      lastFrameIndex: 0,
    },
    transitionDetails: [],
  };
}

function buildUnstableSignal() {
  return {
    observations: [
      {
        frameIndex: 0,
      },
    ],
    signalId: 'visible_region:unstable:f0',
    signalKey: 'visible_region:unstable',
    signalKind: 'visible_region',
    stability: {
      averageTransitionScore: 0.2,
      status: 'discarded',
      transitionCount: 0,
    },
    status: 'discarded',
    support: {
      consecutiveFrameCount: 1,
      firstFrameIndex: 0,
      frameCount: 1,
      frames: [0],
      lastFrameIndex: 0,
    },
    transitionDetails: [],
  };
}

function buildMeasurementInput(variant = 'canonical') {
  const stableSignals = variant === 'reversed'
    ? [buildVisibleRegionSignal(), buildDominantColorSignal()]
    : [buildDominantColorSignal(), buildVisibleRegionSignal()];

  return {
    discardedSignals: [],
    frameCount: 3,
    layer: 'Signal Stability',
    stableSignals,
    summary: {
      byKind: {
        dominant_color: {
          discarded: 0,
          stable: 1,
        },
        visible_region: {
          discarded: 0,
          stable: 1,
        },
      },
      discardedCount: 0,
      stableCount: 2,
      totalCount: 2,
    },
    version: 'v1',
  };
}

test('measurement layer normalizes stable signals into deterministic comparable measurements', () => {
  const canonical = buildZeeMeasurementReport(buildMeasurementInput('canonical'));
  const reversed = buildZeeMeasurementReport(buildMeasurementInput('reversed'));

  assert.deepEqual(reversed, canonical);
  assert.equal(canonical.layer, 'Measured');
  assert.equal(canonical.measurements.length, 2);
  assert.equal(canonical.measurements[0].measurementType, 'dominant_palette_distribution');
  assert.equal(canonical.measurements[0].measurementValue.hex.value, '#f28c28');
  assert.equal(canonical.measurements[0].measurementValue.averageRatio.value, 0.4);
  assert.equal(canonical.measurements[1].measurementType, 'region_geometry_profile');
  assert.equal(canonical.measurements[1].measurementValue.geometryClass.value, 'vertical_strip');
  assert.equal(canonical.measurements[1].measurementValue.aspectRatio.value, 0.5);
  assert.equal(canonical.measurements[1].measurementValue.centerX.value, 0.16);
});

test('measurement layer rejects unstable signals before quantification', () => {
  assert.throws(
    () => buildZeeMeasurementReport({
      ...buildMeasurementInput(),
      stableSignals: [buildDominantColorSignal(), buildUnstableSignal()],
    }),
    (error) => {
      assert.equal(error.code, 'invalid_zee_input');
      assert.match(error.message, /only accepts stable signals/i);
      return true;
    },
  );
});

test('measurement layer discards non-measurable stable signals with explicit diagnostics', () => {
  const report = buildZeeMeasurementReport({
    ...buildMeasurementInput(),
    stableSignals: [buildDominantColorSignal(), buildUnsupportedSignal()],
  });

  const discarded = report.discardedMeasurements.find((measurement) => measurement.signalKind === 'text_fragment');

  assert.equal(report.measurements.length, 1);
  assert.equal(report.discardedMeasurements.length, 1);
  assert.ok(discarded, 'Expected the non-measurable stable signal to be discarded.');
  assert.equal(discarded.status, 'discarded');
  assert.equal(discarded.measurementType, null);
  assert.ok(
    discarded.discardReasons.some((reason) => reason.code === 'unsupported_signal_kind'),
    'Expected an explicit discard reason for the unsupported stable signal kind.',
  );
  assert.ok(
    discarded.measurementDiagnostics.some((reason) => reason.code === 'unsupported_signal_kind'),
    'Expected the discard diagnostics to state why the signal was not measurable.',
  );
});
