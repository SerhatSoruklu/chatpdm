/// <reference path="../vocabulary/commonjs-globals.d.ts" />

import type {
  NormalizationRefusalCode,
  NormalizationResult,
  NormalizationTransformKind,
} from './normalization.types.ts';

const NORMALIZATION_TRANSFORM_KINDS: readonly NormalizationTransformKind[] = Object.freeze([
  'surface_cleanup',
  'unicode_nfc',
  'percent_decode',
  'base64_decode',
  'hex_decode',
  'reverse_then_base64_decode',
  'reverse_then_hex_decode',
]);

const NORMALIZATION_REFUSAL_CODES: readonly NormalizationRefusalCode[] = Object.freeze([
  'NORMALIZATION_TOO_DEEP',
  'NORMALIZATION_TOO_LARGE',
  'NORMALIZATION_INVALID_ENCODING',
  'NORMALIZATION_AMBIGUOUS',
  'NORMALIZATION_NON_TEXT_OUTPUT',
  'NORMALIZATION_POLICY_BLOCKED',
]);

const NORMALIZATION_DURATION_MS_BUCKET_LABELS: readonly string[] = Object.freeze([
  '0-1',
  '1-2',
  '2-5',
  '5-10',
  '10-25',
  '25-50',
  '50-100',
  '100-250',
  '250+',
]);

type NormalizationTransformCounts = Record<NormalizationTransformKind, number>;
type NormalizationRefusalCounts = Record<NormalizationRefusalCode, number>;
type NormalizationDurationBucketCounts = Record<string, number>;

interface NormalizationExpansionRatioSummary {
  count: number;
  min: number | null;
  max: number | null;
  sum: number;
  last: number | null;
  average: number | null;
}

interface NormalizationMetricsSnapshot {
  normalization_attempt_total: number;
  normalization_changed_total: number;
  normalization_applied_total: NormalizationTransformCounts;
  normalization_refused_total: NormalizationRefusalCounts;
  normalization_depth_histogram: Record<string, number>;
  normalization_output_expansion_ratio: NormalizationExpansionRatioSummary;
  normalization_ambiguity_total: number;
  normalization_duration_ms: {
    count: number;
    buckets: NormalizationDurationBucketCounts;
  };
}

const INITIAL_TRANSFORM_COUNTS = Object.freeze(
  NORMALIZATION_TRANSFORM_KINDS.reduce((accumulator, transform) => {
    accumulator[transform] = 0;
    return accumulator;
  }, Object.create(null) as NormalizationTransformCounts),
);

const INITIAL_REFUSAL_COUNTS = Object.freeze(
  NORMALIZATION_REFUSAL_CODES.reduce((accumulator, refusalCode) => {
    accumulator[refusalCode] = 0;
    return accumulator;
  }, Object.create(null) as NormalizationRefusalCounts),
);

function createEmptyDepthHistogram(): Record<string, number> {
  return Object.create(null);
}

function createEmptyExpansionRatioSummary(): NormalizationExpansionRatioSummary {
  return {
    count: 0,
    min: null,
    max: null,
    sum: 0,
    last: null,
    average: null,
  };
}

function createEmptyDurationHistogram(): {
  count: number;
  buckets: NormalizationDurationBucketCounts;
} {
  return {
    count: 0,
    buckets: NORMALIZATION_DURATION_MS_BUCKET_LABELS.reduce((accumulator, label) => {
      accumulator[label] = 0;
      return accumulator;
    }, Object.create(null) as NormalizationDurationBucketCounts),
  };
}

function createInitialNormalizationMetrics(): NormalizationMetricsSnapshot {
  return {
    normalization_attempt_total: 0,
    normalization_changed_total: 0,
    normalization_applied_total: {
      ...INITIAL_TRANSFORM_COUNTS,
    },
    normalization_refused_total: {
      ...INITIAL_REFUSAL_COUNTS,
    },
    normalization_depth_histogram: createEmptyDepthHistogram(),
    normalization_output_expansion_ratio: createEmptyExpansionRatioSummary(),
    normalization_ambiguity_total: 0,
    normalization_duration_ms: createEmptyDurationHistogram(),
  };
}

const normalizationMetricsState = createInitialNormalizationMetrics();

function bucketNormalizationDurationMs(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return '250+';
  }

  if (durationMs < 1) {
    return '0-1';
  }

  if (durationMs < 2) {
    return '1-2';
  }

  if (durationMs < 5) {
    return '2-5';
  }

  if (durationMs < 10) {
    return '5-10';
  }

  if (durationMs < 25) {
    return '10-25';
  }

  if (durationMs < 50) {
    return '25-50';
  }

  if (durationMs < 100) {
    return '50-100';
  }

  if (durationMs < 250) {
    return '100-250';
  }

  return '250+';
}

function freezeMetricsSnapshot(snapshot: NormalizationMetricsSnapshot): NormalizationMetricsSnapshot {
  return Object.freeze({
    ...snapshot,
    normalization_applied_total: Object.freeze({
      ...snapshot.normalization_applied_total,
    }),
    normalization_refused_total: Object.freeze({
      ...snapshot.normalization_refused_total,
    }),
    normalization_depth_histogram: Object.freeze({
      ...snapshot.normalization_depth_histogram,
    }),
    normalization_output_expansion_ratio: Object.freeze({
      ...snapshot.normalization_output_expansion_ratio,
    }),
    normalization_duration_ms: Object.freeze({
      count: snapshot.normalization_duration_ms.count,
      buckets: Object.freeze({
        ...snapshot.normalization_duration_ms.buckets,
      }),
    }),
  });
}

function updateExpansionRatioSummary(ratio: number) {
  const summary = normalizationMetricsState.normalization_output_expansion_ratio;

  summary.count += 1;
  summary.sum += ratio;
  summary.last = ratio;
  summary.min = summary.min === null ? ratio : Math.min(summary.min, ratio);
  summary.max = summary.max === null ? ratio : Math.max(summary.max, ratio);
  summary.average = summary.sum / summary.count;
}

function recordNormalizationMetrics(result: NormalizationResult) {
  normalizationMetricsState.normalization_attempt_total += 1;

  if (result.changed) {
    normalizationMetricsState.normalization_changed_total += 1;
  }

  for (const transform of result.appliedTransformKinds) {
    normalizationMetricsState.normalization_applied_total[transform] += 1;
  }

  const depthKey = String(result.depthUsed);
  normalizationMetricsState.normalization_depth_histogram[depthKey] = (
    normalizationMetricsState.normalization_depth_histogram[depthKey] ?? 0
  ) + 1;

  if (result.status === 'refused') {
    normalizationMetricsState.normalization_refused_total[result.refusalCode] += 1;

    if (result.refusalCode === 'NORMALIZATION_AMBIGUOUS') {
      normalizationMetricsState.normalization_ambiguity_total += 1;
    }
  }

  if (typeof result.expansionRatio === 'number' && Number.isFinite(result.expansionRatio)) {
    updateExpansionRatioSummary(result.expansionRatio);
  }
}

function recordNormalizationDurationMs(durationMs: number) {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return;
  }

  const summary = normalizationMetricsState.normalization_duration_ms;
  const bucketLabel = bucketNormalizationDurationMs(durationMs);

  summary.count += 1;
  summary.buckets[bucketLabel] = (summary.buckets[bucketLabel] ?? 0) + 1;
}

function resetNormalizationMetrics() {
  const reset = createInitialNormalizationMetrics();

  normalizationMetricsState.normalization_attempt_total = reset.normalization_attempt_total;
  normalizationMetricsState.normalization_changed_total = reset.normalization_changed_total;
  normalizationMetricsState.normalization_applied_total = reset.normalization_applied_total;
  normalizationMetricsState.normalization_refused_total = reset.normalization_refused_total;
  normalizationMetricsState.normalization_depth_histogram = reset.normalization_depth_histogram;
  normalizationMetricsState.normalization_output_expansion_ratio = reset.normalization_output_expansion_ratio;
  normalizationMetricsState.normalization_ambiguity_total = reset.normalization_ambiguity_total;
  normalizationMetricsState.normalization_duration_ms = reset.normalization_duration_ms;
}

function snapshotNormalizationMetrics(): NormalizationMetricsSnapshot {
  return freezeMetricsSnapshot({
    normalization_attempt_total: normalizationMetricsState.normalization_attempt_total,
    normalization_changed_total: normalizationMetricsState.normalization_changed_total,
    normalization_applied_total: normalizationMetricsState.normalization_applied_total,
    normalization_refused_total: normalizationMetricsState.normalization_refused_total,
    normalization_depth_histogram: normalizationMetricsState.normalization_depth_histogram,
    normalization_output_expansion_ratio: normalizationMetricsState.normalization_output_expansion_ratio,
    normalization_ambiguity_total: normalizationMetricsState.normalization_ambiguity_total,
    normalization_duration_ms: normalizationMetricsState.normalization_duration_ms,
  });
}

module.exports = {
  recordNormalizationMetrics,
  recordNormalizationDurationMs,
  resetNormalizationMetrics,
  snapshotNormalizationMetrics,
  NORMALIZATION_TRANSFORM_KINDS,
  NORMALIZATION_REFUSAL_CODES,
  NORMALIZATION_DURATION_MS_BUCKET_LABELS,
};
