'use strict';

const {
  ZEE_INTERNAL_ENGINE_ERROR_CODES,
  ZEE_INTERNAL_ENGINE_MEASUREMENT_LAYER,
  ZEE_INTERNAL_ENGINE_MEASUREMENT_NUMERIC_PRECISION,
  ZEE_INTERNAL_ENGINE_MEASUREMENT_SUPPORTED_SIGNAL_KINDS,
  ZEE_INTERNAL_ENGINE_MEASUREMENT_SCHEMA,
  ZEE_INTERNAL_ENGINE_MEASUREMENT_POLICY,
  ZEE_INTERNAL_ENGINE_MEASUREMENT_VERSION,
  ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY,
  ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY_VERSION,
  ZEE_INTERNAL_ENGINE_STABILITY_LAYER,
} = require('./constants');
const {
  compareCanonicalNumber,
  compareCanonicalText,
} = require('./policy');
const {
  createZeeArtifactMarker,
} = require('./artifact-markers');
const { ZeeObservedInputError } = require('./input-contract');

const SIGNAL_KIND_PRIORITY = new Map(
  ZEE_INTERNAL_ENGINE_MEASUREMENT_SUPPORTED_SIGNAL_KINDS.map((kind, index) => [kind, index]),
);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !Buffer.isBuffer(value);
}

function roundTo(value, precision = ZEE_INTERNAL_ENGINE_MEASUREMENT_NUMERIC_PRECISION) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function makeNote(code, message, details) {
  const note = {
    code,
    message,
  };

  if (details !== undefined) {
    note.details = details;
  }

  return note;
}

function createNumericMeasurement(value, unit) {
  return {
    kind: 'numeric',
    precision: ZEE_INTERNAL_ENGINE_MEASUREMENT_NUMERIC_PRECISION,
    unit,
    value: roundTo(value),
  };
}

function createCategoricalMeasurement(value) {
  return {
    kind: 'categorical',
    value,
  };
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function selectMode(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const counts = new Map();

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((left, right) => (
      compareCanonicalNumber(right[1], left[1])
      || compareCanonicalText(left[0], right[0])
    ))[0][0];
}

function compareSignalOrder(left, right) {
  return (
    compareCanonicalNumber(
      SIGNAL_KIND_PRIORITY.get(left.signalKind) ?? Number.MAX_SAFE_INTEGER,
      SIGNAL_KIND_PRIORITY.get(right.signalKind) ?? Number.MAX_SAFE_INTEGER,
    )
    || compareCanonicalNumber(left.firstFrameIndex, right.firstFrameIndex)
    || compareCanonicalText(left.signalKey, right.signalKey)
    || compareCanonicalText(left.signalId, right.signalId)
  );
}

function normalizeObservationOrder(observations) {
  return [...observations].sort((left, right) => (
    compareCanonicalNumber(left.frameIndex, right.frameIndex)
    || compareCanonicalText(String(left.signalKind ?? ''), String(right.signalKind ?? ''))
  ));
}

function normalizeStableSignal(signal, index) {
  if (!isPlainObject(signal)) {
    throw new ZeeObservedInputError(
      `Stable signal ${index + 1} must be a non-null object.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (signal.status !== 'stable') {
    throw new ZeeObservedInputError(
      `Measurement layer only accepts stable signals; signal ${index + 1} is "${signal.status ?? 'unknown'}".`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  const signalId = typeof signal.signalId === 'string' && signal.signalId.trim() !== ''
    ? signal.signalId.trim()
    : null;
  const signalKind = typeof signal.signalKind === 'string' && signal.signalKind.trim() !== ''
    ? signal.signalKind.trim()
    : null;

  if (!signalId || !signalKind) {
    throw new ZeeObservedInputError(
      `Stable signal ${index + 1} must include a signalId and signalKind.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  const observations = Array.isArray(signal.observations)
    ? normalizeObservationOrder(signal.observations.filter(isPlainObject))
    : [];

  const support = isPlainObject(signal.support)
    ? signal.support
    : null;

  const firstFrameIndex = Number.isInteger(support?.firstFrameIndex)
    ? support.firstFrameIndex
    : (Number.isInteger(observations[0]?.frameIndex) ? observations[0].frameIndex : index);

  return {
    firstFrameIndex,
    observations,
    signalId,
    signalKey: typeof signal.signalKey === 'string' && signal.signalKey.trim() !== ''
      ? signal.signalKey.trim()
      : signalId,
    signalKind,
    support,
  };
}

function normalizeMeasurementInput(input) {
  if (!isPlainObject(input)) {
    throw new ZeeObservedInputError(
      'ZEE measurement layer input must be a non-null object containing stable signals.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (input.layer !== ZEE_INTERNAL_ENGINE_STABILITY_LAYER) {
    throw new ZeeObservedInputError(
      `ZEE measurement layer expects a "${ZEE_INTERNAL_ENGINE_STABILITY_LAYER}" report.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (!Array.isArray(input.stableSignals)) {
    throw new ZeeObservedInputError(
      'ZEE measurement layer input must include a stableSignals array.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  return {
    frameCount: Number.isInteger(input.frameCount) && input.frameCount >= 0
      ? input.frameCount
      : input.stableSignals.length,
    sourceLayer: input.layer,
    sourceVersion: typeof input.version === 'string' ? input.version : null,
    stableSignals: input.stableSignals.map((signal, index) => normalizeStableSignal(signal, index)).sort(compareSignalOrder),
  };
}

function buildMeasuredRecord(signal, measurementType, measurementValue, measurementDiagnostics) {
  return {
    outcomeCategory: ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY.measurement.measured,
    measurementDiagnostics,
    measurementType,
    measurementValue,
    signalKind: signal.signalKind,
    stableSignalId: signal.signalId,
    status: 'measured',
  };
}

function buildDiscardedRecord(signal, reasonCode, reasonMessage, details) {
  const reason = makeNote(reasonCode, reasonMessage, details);

  return {
    discardReasons: [reason],
    outcomeCategory: ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY.measurement.discarded,
    measurementDiagnostics: [reason],
    measurementType: null,
    measurementValue: null,
    signalKind: signal.signalKind,
    stableSignalId: signal.signalId,
    status: 'discarded',
  };
}

function summarizeNumericSeries(values, unit) {
  if (!Array.isArray(values) || values.length === 0) {
    return {
      average: createNumericMeasurement(0, unit),
      max: createNumericMeasurement(0, unit),
      min: createNumericMeasurement(0, unit),
      spread: createNumericMeasurement(0, unit),
    };
  }

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const averageValue = average(values);

  return {
    average: createNumericMeasurement(averageValue, unit),
    max: createNumericMeasurement(maximum, unit),
    min: createNumericMeasurement(minimum, unit),
    spread: createNumericMeasurement(maximum - minimum, unit),
  };
}

function buildDominantColorMeasurement(signal) {
  const observations = signal.observations.filter((observation) => (
    typeof observation.hex === 'string'
    && isPlainObject(observation.rgba)
    && Number.isFinite(observation.ratio)
  ));

  if (observations.length === 0) {
    return buildDiscardedRecord(
      signal,
      'missing_observation_values',
      'missing_observation_values',
      {
        supportedKinds: ['dominant_color'],
      },
    );
  }

  const hex = selectMode(observations.map((observation) => String(observation.hex).trim().toLowerCase()))
    ?? String(observations[0].hex).trim().toLowerCase();
  const ratios = observations.map((observation) => observation.ratio);
  const reds = observations.map((observation) => Number.isFinite(observation.rgba.red) ? observation.rgba.red : 0);
  const greens = observations.map((observation) => Number.isFinite(observation.rgba.green) ? observation.rgba.green : 0);
  const blues = observations.map((observation) => Number.isFinite(observation.rgba.blue) ? observation.rgba.blue : 0);
  const alphas = observations.map((observation) => Number.isFinite(observation.rgba.alpha) ? observation.rgba.alpha : 255);
  const ranks = observations.map((observation, index) => Number.isFinite(observation.rank) ? observation.rank : index + 1);

  const measurementValue = {
    averageRatio: createNumericMeasurement(average(ratios), 'ratio'),
    averageRank: createNumericMeasurement(average(ranks), 'rank'),
    hex: createCategoricalMeasurement(hex),
    maxRatio: createNumericMeasurement(Math.max(...ratios), 'ratio'),
    minRatio: createNumericMeasurement(Math.min(...ratios), 'ratio'),
    ratioSpread: createNumericMeasurement(Math.max(...ratios) - Math.min(...ratios), 'ratio'),
    rgba: {
      alpha: createNumericMeasurement(average(alphas), 'channel'),
      blue: createNumericMeasurement(average(blues), 'channel'),
      green: createNumericMeasurement(average(greens), 'channel'),
      red: createNumericMeasurement(average(reds), 'channel'),
    },
  };

  const frameIndices = observations.map((observation) => observation.frameIndex).sort((left, right) => left - right);

  return buildMeasuredRecord(signal, 'dominant_palette_distribution', measurementValue, [
    makeNote(
      'observation_count',
      'observation_count',
      {
        frameIndices,
      },
    ),
    makeNote(
      'normalization_precision',
      'normalization_precision',
      {
        precision: ZEE_INTERNAL_ENGINE_MEASUREMENT_NUMERIC_PRECISION,
      },
    ),
    makeNote(
      'value_span',
      'value_span',
      {
        ratioAverage: roundTo(average(ratios)),
        ratioMax: roundTo(Math.max(...ratios)),
        ratioMin: roundTo(Math.min(...ratios)),
      },
    ),
  ]);
}

function normalizeRegionObservation(observation) {
  const bounds = isPlainObject(observation.bounds)
    ? observation.bounds
    : null;
  const frameWidth = Number.isFinite(observation.frameWidth) && observation.frameWidth > 0
    ? observation.frameWidth
    : null;
  const frameHeight = Number.isFinite(observation.frameHeight) && observation.frameHeight > 0
    ? observation.frameHeight
    : null;
  const width = Number.isFinite(bounds?.width) && bounds.width > 0
    ? bounds.width
    : null;
  const height = Number.isFinite(bounds?.height) && bounds.height > 0
    ? bounds.height
    : null;

  if (!bounds || !frameWidth || !frameHeight || !width || !height) {
    return null;
  }

  const left = Number.isFinite(bounds.left) ? bounds.left : 0;
  const top = Number.isFinite(bounds.top) ? bounds.top : 0;
  const centerX = Number.isFinite(observation.center?.x)
    ? observation.center.x
    : (left + (width / 2)) / frameWidth;
  const centerY = Number.isFinite(observation.center?.y)
    ? observation.center.y
    : (top + (height / 2)) / frameHeight;
  const areaCoverage = Number.isFinite(observation.pixelCoverage)
    ? observation.pixelCoverage
    : (width * height) / (frameWidth * frameHeight);
  const edgeDensity = Number.isFinite(observation.edgeDensity)
    ? observation.edgeDensity
    : 0;
  const variance = Number.isFinite(observation.variance)
    ? observation.variance
    : 0;
  const geometryClass = typeof observation.geometryClass === 'string' && observation.geometryClass.trim() !== ''
    ? observation.geometryClass.trim()
    : 'compact_block';

  return {
    areaCoverage,
    bounds: {
      height,
      left,
      top,
      width,
    },
    centerX,
    centerY,
    edgeDensity,
    frameHeight,
    frameWidth,
    geometryClass,
    aspectRatio: width / height,
    heightRatio: height / frameHeight,
    leftRatio: left / frameWidth,
    topRatio: top / frameHeight,
    variance,
    widthRatio: width / frameWidth,
  };
}

function buildVisibleRegionMeasurement(signal) {
  const observations = signal.observations
    .map(normalizeRegionObservation)
    .filter(Boolean);

  if (observations.length === 0) {
    return buildDiscardedRecord(
      signal,
      'missing_observation_values',
      'missing_observation_values',
      {
        supportedKinds: ['visible_region'],
      },
    );
  }

  const geometryClass = selectMode(observations.map((observation) => observation.geometryClass)) ?? 'compact_block';
  const aspectRatios = observations.map((observation) => observation.aspectRatio);
  const centerXs = observations.map((observation) => observation.centerX);
  const centerYs = observations.map((observation) => observation.centerY);
  const areaCoverages = observations.map((observation) => observation.areaCoverage);
  const edgeDensities = observations.map((observation) => observation.edgeDensity);
  const variances = observations.map((observation) => observation.variance);
  const leftRatios = observations.map((observation) => observation.leftRatio);
  const topRatios = observations.map((observation) => observation.topRatio);
  const widthRatios = observations.map((observation) => observation.widthRatio);
  const heightRatios = observations.map((observation) => observation.heightRatio);
  const frameIndices = signal.observations
    .map((observation) => observation.frameIndex)
    .filter((frameIndex) => Number.isInteger(frameIndex))
    .sort((left, right) => left - right);

  const measurementValue = {
    areaCoverage: createNumericMeasurement(average(areaCoverages), 'ratio'),
    aspectRatio: createNumericMeasurement(average(aspectRatios), 'ratio'),
    centerX: createNumericMeasurement(average(centerXs), 'ratio'),
    centerY: createNumericMeasurement(average(centerYs), 'ratio'),
    edgeDensity: createNumericMeasurement(average(edgeDensities), 'density'),
    geometryClass: createCategoricalMeasurement(geometryClass),
    heightRatio: createNumericMeasurement(average(heightRatios), 'ratio'),
    leftRatio: createNumericMeasurement(average(leftRatios), 'ratio'),
    topRatio: createNumericMeasurement(average(topRatios), 'ratio'),
    variance: createNumericMeasurement(average(variances), 'variance'),
    widthRatio: createNumericMeasurement(average(widthRatios), 'ratio'),
  };

  return buildMeasuredRecord(signal, 'region_geometry_profile', measurementValue, [
    makeNote(
      'observation_count',
      'observation_count',
      {
        frameIndices,
      },
    ),
    makeNote(
      'normalization_precision',
      'normalization_precision',
      {
        precision: ZEE_INTERNAL_ENGINE_MEASUREMENT_NUMERIC_PRECISION,
      },
    ),
    makeNote(
      'value_span',
      'value_span',
      {
        areaCoverage: summarizeNumericSeries(areaCoverages, 'ratio'),
        aspectRatio: summarizeNumericSeries(aspectRatios, 'ratio'),
        centerX: summarizeNumericSeries(centerXs, 'ratio'),
        centerY: summarizeNumericSeries(centerYs, 'ratio'),
      },
    ),
  ]);
}

function measureStableSignal(signal) {
  if (!ZEE_INTERNAL_ENGINE_MEASUREMENT_SUPPORTED_SIGNAL_KINDS.includes(signal.signalKind)) {
    return buildDiscardedRecord(
      signal,
      'unsupported_signal_kind',
      'unsupported_signal_kind',
      {
        supportedKinds: [...ZEE_INTERNAL_ENGINE_MEASUREMENT_SUPPORTED_SIGNAL_KINDS],
      },
    );
  }

  if (!Array.isArray(signal.observations) || signal.observations.length === 0) {
    return buildDiscardedRecord(
      signal,
      'missing_observations',
      'missing_observations',
      {
        supportedKinds: [...ZEE_INTERNAL_ENGINE_MEASUREMENT_SUPPORTED_SIGNAL_KINDS],
      },
    );
  }

  if (signal.signalKind === 'dominant_color') {
    return buildDominantColorMeasurement(signal);
  }

  if (signal.signalKind === 'visible_region') {
    return buildVisibleRegionMeasurement(signal);
  }

  return buildDiscardedRecord(
    signal,
    'unsupported_signal_kind',
    'unsupported_signal_kind',
    {
      supportedKinds: [...ZEE_INTERNAL_ENGINE_MEASUREMENT_SUPPORTED_SIGNAL_KINDS],
    },
  );
}

function buildMeasurementSummary(measurements, discardedMeasurements, stableSignalCount) {
  const summary = {
    byMeasurementType: {},
    bySignalKind: {},
    discardedCount: discardedMeasurements.length,
    measuredCount: measurements.length,
    stableSignalCount,
    totalCount: measurements.length + discardedMeasurements.length,
  };

  [...measurements, ...discardedMeasurements].forEach((entry) => {
    if (!summary.bySignalKind[entry.signalKind]) {
      summary.bySignalKind[entry.signalKind] = {
        discarded: 0,
        measured: 0,
      };
    }

    summary.bySignalKind[entry.signalKind][entry.status] += 1;

    if (entry.status === 'measured' && entry.measurementType) {
      summary.byMeasurementType[entry.measurementType] = (summary.byMeasurementType[entry.measurementType] ?? 0) + 1;
    }
  });

  return summary;
}

function buildDiagnosticNotes(summary) {
  return [
    makeNote(
      'measurement_layer',
      'measurement_layer',
      {
        discardedCount: summary.discardedCount,
        measuredCount: summary.measuredCount,
        stableSignalCount: summary.stableSignalCount,
      },
    ),
    makeNote(
      'measurement_non_measurable',
      'measurement_non_measurable',
      {
        discardedCount: summary.discardedCount,
        supportedKinds: [...ZEE_INTERNAL_ENGINE_MEASUREMENT_SUPPORTED_SIGNAL_KINDS],
      },
    ),
  ];
}

function buildZeeMeasurementReport(signalStabilityReport) {
  const normalizedInput = normalizeMeasurementInput(signalStabilityReport);
  const measurements = [];
  const discardedMeasurements = [];

  normalizedInput.stableSignals.forEach((signal) => {
    const record = measureStableSignal(signal);

    if (record.status === 'measured') {
      measurements.push(record);
      return;
    }

    discardedMeasurements.push(record);
  });

  const summary = buildMeasurementSummary(
    measurements,
    discardedMeasurements,
    normalizedInput.stableSignals.length,
  );

  return {
    ...createZeeArtifactMarker('measurement'),
    diagnosticNotes: buildDiagnosticNotes(summary),
    discardedMeasurements,
    frameCount: normalizedInput.frameCount,
    layer: ZEE_INTERNAL_ENGINE_MEASUREMENT_LAYER,
    policyVersion: ZEE_INTERNAL_ENGINE_MEASUREMENT_POLICY.version,
    resultTaxonomy: ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY.measurement,
    resultTaxonomyVersion: ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY_VERSION,
    schemaVersion: ZEE_INTERNAL_ENGINE_MEASUREMENT_SCHEMA.version,
    measurements,
    sourceLayer: normalizedInput.sourceLayer,
    sourceVersion: normalizedInput.sourceVersion,
    summary,
    version: ZEE_INTERNAL_ENGINE_MEASUREMENT_VERSION,
  };
}

module.exports = {
  buildZeeMeasurementReport,
};
