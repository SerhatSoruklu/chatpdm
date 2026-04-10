'use strict';

const {
  ZEE_INTERNAL_ENGINE_STABILITY_DOMINANT_COLOR_DISTANCE_THRESHOLD,
  ZEE_INTERNAL_ENGINE_STABILITY_DOMINANT_COLOR_RATIO_THRESHOLD,
  ZEE_INTERNAL_ENGINE_STABILITY_KIND_ORDER,
  ZEE_INTERNAL_ENGINE_STABILITY_LAYER,
  ZEE_INTERNAL_ENGINE_STABILITY_MATCH_SCORE_THRESHOLD,
  ZEE_INTERNAL_ENGINE_STABILITY_MIN_SUPPORT,
  ZEE_INTERNAL_ENGINE_STABILITY_REGION_AREA_SHIFT_THRESHOLD,
  ZEE_INTERNAL_ENGINE_STABILITY_REGION_CENTER_SHIFT_THRESHOLD,
  ZEE_INTERNAL_ENGINE_STABILITY_REGION_SIZE_SHIFT_THRESHOLD,
  ZEE_INTERNAL_ENGINE_SIGNAL_STABILITY_SCHEMA,
  ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY,
  ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY_VERSION,
  ZEE_INTERNAL_ENGINE_STABILITY_POLICY,
  ZEE_INTERNAL_ENGINE_STABILITY_VERSION,
  ZEE_INTERNAL_ENGINE_ERROR_CODES,
} = require('./constants');
const {
  compareCanonicalNumber,
  compareCanonicalText,
} = require('./policy');
const {
  createZeeArtifactMarker,
} = require('./artifact-markers');
const { ZeeObservedInputError } = require('./input-contract');

const KIND_PRIORITY = new Map(
  ZEE_INTERNAL_ENGINE_STABILITY_KIND_ORDER.map((kind, index) => [kind, index]),
);
const DOMINANT_COLOR_SCORE_WEIGHTS = ZEE_INTERNAL_ENGINE_STABILITY_POLICY.dominantColorScoreWeights;
const VISUAL_REGION_SCORE_WEIGHTS = ZEE_INTERNAL_ENGINE_STABILITY_POLICY.visibleRegionScoreWeights;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundTo(value, precision = ZEE_INTERNAL_ENGINE_STABILITY_POLICY.roundingPrecision) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function assertFrameReport(frameReport, index) {
  if (!frameReport || typeof frameReport !== 'object' || Array.isArray(frameReport)) {
    throw new ZeeObservedInputError(
      `Frame report ${index + 1} must be a non-null object.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (!frameReport.observedFeatures || typeof frameReport.observedFeatures !== 'object') {
    throw new ZeeObservedInputError(
      `Frame report ${index + 1} is missing observed features.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (!frameReport.frameMetadata || typeof frameReport.frameMetadata !== 'object') {
    throw new ZeeObservedInputError(
      `Frame report ${index + 1} is missing frame metadata.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }
}

function normalizeFrameReports(frameReports) {
  if (!Array.isArray(frameReports) || frameReports.length === 0) {
    throw new ZeeObservedInputError(
      'ZEE signal stability requires at least one observed frame report.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  return frameReports.map((frameReport, index) => {
    assertFrameReport(frameReport, index);

    const frameIndex = Number.isInteger(frameReport.frameIndex)
      ? frameReport.frameIndex
      : index;
    const width = Number.isInteger(frameReport.frameMetadata.width)
      ? frameReport.frameMetadata.width
      : null;
    const height = Number.isInteger(frameReport.frameMetadata.height)
      ? frameReport.frameMetadata.height
      : null;

    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new ZeeObservedInputError(
        `Frame report ${index + 1} must include positive integer width and height values.`,
        ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
      );
    }

    return {
      frameIndex,
      frameMetadata: {
        height,
        width,
      },
      observedFeatures: {
        dominantColors: Array.isArray(frameReport.observedFeatures.dominantColors)
          ? frameReport.observedFeatures.dominantColors
          : [],
        visibleGeometricRegions: Array.isArray(frameReport.observedFeatures.visibleGeometricRegions)
          ? frameReport.observedFeatures.visibleGeometricRegions
          : [],
      },
    };
  });
}

function makeReason(code, message, details) {
  const reason = {
    code,
    message,
  };

  if (details !== undefined) {
    reason.details = details;
  }

  return reason;
}

function summarizeDominantColor(frameReport, color, colorIndex) {
  const hex = typeof color.hex === 'string' ? color.hex.toLowerCase() : '#000000';
  const rgba = color.rgba && typeof color.rgba === 'object'
    ? {
        alpha: Number.isFinite(color.rgba.alpha) ? color.rgba.alpha : 255,
        blue: Number.isFinite(color.rgba.blue) ? color.rgba.blue : 0,
        green: Number.isFinite(color.rgba.green) ? color.rgba.green : 0,
        red: Number.isFinite(color.rgba.red) ? color.rgba.red : 0,
      }
    : { alpha: 255, blue: 0, green: 0, red: 0 };
  const ratio = Number.isFinite(color.ratio) ? color.ratio : 0;
  const rank = Number.isInteger(color.rank) ? color.rank : colorIndex + 1;

  return {
    frameIndex: frameReport.frameIndex,
    frameHeight: frameReport.frameMetadata.height,
    frameWidth: frameReport.frameMetadata.width,
    hex,
    observationType: 'dominant_color',
    rgba,
    rank,
    ratio: roundTo(ratio, 6),
  };
}

function summarizeVisibleRegion(frameReport, region) {
  const bounds = region.bounds && typeof region.bounds === 'object'
    ? region.bounds
    : { height: 1, left: 0, top: 0, width: 1 };
  const width = Math.max(1, Number.isFinite(bounds.width) ? bounds.width : 1);
  const height = Math.max(1, Number.isFinite(bounds.height) ? bounds.height : 1);
  const left = Number.isFinite(bounds.left) ? bounds.left : 0;
  const top = Number.isFinite(bounds.top) ? bounds.top : 0;
  const frameWidth = frameReport.frameMetadata.width;
  const frameHeight = frameReport.frameMetadata.height;
  const centerX = (left + (width / 2)) / frameWidth;
  const centerY = (top + (height / 2)) / frameHeight;
  const score = Number.isFinite(region.score) ? region.score : 0;
  const pixelCoverage = Number.isFinite(region.pixelCoverage) ? region.pixelCoverage : (width * height) / (frameWidth * frameHeight);
  const edgeDensity = Number.isFinite(region.edgeDensity) ? region.edgeDensity : 0;
  const variance = Number.isFinite(region.variance) ? region.variance : 0;
  const geometryClass = typeof region.geometryClass === 'string' && region.geometryClass.trim() !== ''
    ? region.geometryClass.trim()
    : 'compact_block';

  return {
    bounds: {
      height,
      left,
      top,
      width,
    },
    center: {
      x: roundTo(centerX, 6),
      y: roundTo(centerY, 6),
    },
    edgeDensity: roundTo(edgeDensity, ZEE_INTERNAL_ENGINE_STABILITY_POLICY.roundingPrecision),
    frameIndex: frameReport.frameIndex,
    frameHeight,
    frameWidth,
    geometryClass,
    observationType: 'visible_region',
    pixelCoverage: roundTo(pixelCoverage, 6),
    score: roundTo(score, ZEE_INTERNAL_ENGINE_STABILITY_POLICY.roundingPrecision),
    variance: roundTo(variance, ZEE_INTERNAL_ENGINE_STABILITY_POLICY.roundingPrecision),
  };
}

function buildFrameCandidates(frameReport) {
  const dominantColors = [...frameReport.observedFeatures.dominantColors]
    .map((color, index) => ({
      frameIndex: frameReport.frameIndex,
      observation: summarizeDominantColor(frameReport, color, index),
      signalKind: 'dominant_color',
      signalKey: `dominant_color:${String(color.hex ?? '#000000').toLowerCase()}`,
      signalLabel: String(color.hex ?? '#000000').toLowerCase(),
      sortRank: Number.isInteger(color.rank) ? color.rank : index + 1,
      source: color,
    }))
    .sort((left, right) => (
      compareCanonicalNumber(left.sortRank, right.sortRank)
      || compareCanonicalText(left.signalKey, right.signalKey)
    ));

  const visibleRegions = [...frameReport.observedFeatures.visibleGeometricRegions]
    .map((region) => ({
      frameIndex: frameReport.frameIndex,
      observation: summarizeVisibleRegion(frameReport, region),
      signalKind: 'visible_region',
      signalKey: [
        'visible_region',
        String(region.geometryClass ?? 'compact_block'),
        String(region.bounds?.left ?? 0),
        String(region.bounds?.top ?? 0),
        String(region.bounds?.width ?? 0),
        String(region.bounds?.height ?? 0),
      ].join(':'),
      signalLabel: String(region.geometryClass ?? 'compact_block'),
      sortRank: Number.isFinite(region.score) ? -region.score : 0,
      source: region,
    }))
    .sort((left, right) => (
      compareCanonicalNumber(left.sortRank, right.sortRank)
      || compareCanonicalText(left.signalKey, right.signalKey)
    ));

  return [...dominantColors, ...visibleRegions];
}

function compareDominantColors(left, right) {
  const deltaRed = Math.abs(left.observation.rgba.red - right.observation.rgba.red);
  const deltaGreen = Math.abs(left.observation.rgba.green - right.observation.rgba.green);
  const deltaBlue = Math.abs(left.observation.rgba.blue - right.observation.rgba.blue);
  const deltaAlpha = Math.abs(left.observation.rgba.alpha - right.observation.rgba.alpha);
  const colorDistance = deltaRed + deltaGreen + deltaBlue + Math.round(deltaAlpha / 2);
  const ratioDistance = Math.abs(left.observation.ratio - right.observation.ratio);
  const rankDistance = Math.abs(left.observation.rank - right.observation.rank);
  const score = clamp(
    1
    - ((colorDistance / DOMINANT_COLOR_SCORE_WEIGHTS.colorDistanceScale) * DOMINANT_COLOR_SCORE_WEIGHTS.colorDistanceWeight)
    - (ratioDistance * DOMINANT_COLOR_SCORE_WEIGHTS.ratioWeight)
    - (Math.min(rankDistance, DOMINANT_COLOR_SCORE_WEIGHTS.rankDistanceCap) * DOMINANT_COLOR_SCORE_WEIGHTS.rankDistanceWeight),
    0,
    1,
  );
  const reasons = [];

  if (colorDistance > ZEE_INTERNAL_ENGINE_STABILITY_DOMINANT_COLOR_DISTANCE_THRESHOLD) {
    reasons.push(makeReason(
      'identity_change',
      'identity_change',
      {
        colorDistance,
      },
    ));
  }

  if (ratioDistance > ZEE_INTERNAL_ENGINE_STABILITY_DOMINANT_COLOR_RATIO_THRESHOLD) {
    reasons.push(makeReason(
      'form_change',
      'form_change',
      {
        ratioDistance: roundTo(ratioDistance, 6),
      },
    ));
  }

  return {
    reasons,
    score: roundTo(score, 6),
  };
}

function compareVisibleRegions(left, right) {
  const centerShiftX = Math.abs(left.observation.center.x - right.observation.center.x);
  const centerShiftY = Math.abs(left.observation.center.y - right.observation.center.y);
  const centerShift = Math.hypot(centerShiftX, centerShiftY);
  const widthShift = Math.abs(left.observation.bounds.width / left.observation.frameWidth - right.observation.bounds.width / right.observation.frameWidth);
  const heightShift = Math.abs(left.observation.bounds.height / left.observation.frameHeight - right.observation.bounds.height / right.observation.frameHeight);
  const areaShift = Math.abs(left.observation.pixelCoverage - right.observation.pixelCoverage);
  const geometryClassMatches = left.observation.geometryClass === right.observation.geometryClass;
  const score = clamp(
    1
    - (centerShift * VISUAL_REGION_SCORE_WEIGHTS.centerShiftWeight)
    - (widthShift * VISUAL_REGION_SCORE_WEIGHTS.widthShiftWeight)
    - (heightShift * VISUAL_REGION_SCORE_WEIGHTS.heightShiftWeight)
    - (areaShift * VISUAL_REGION_SCORE_WEIGHTS.areaShiftWeight)
    - (geometryClassMatches ? 0 : VISUAL_REGION_SCORE_WEIGHTS.geometryMismatchPenalty),
    0,
    1,
  );
  const reasons = [];

  if (!geometryClassMatches) {
    reasons.push(makeReason(
      'form_change',
      'form_change',
      {
        from: left.observation.geometryClass,
        to: right.observation.geometryClass,
      },
    ));
  }

  if (centerShift > ZEE_INTERNAL_ENGINE_STABILITY_REGION_CENTER_SHIFT_THRESHOLD) {
    reasons.push(makeReason(
      'location_shift',
      'location_shift',
      {
        centerShift: roundTo(centerShift, 6),
      },
    ));
  }

  if (
    widthShift > ZEE_INTERNAL_ENGINE_STABILITY_REGION_SIZE_SHIFT_THRESHOLD
    || heightShift > ZEE_INTERNAL_ENGINE_STABILITY_REGION_SIZE_SHIFT_THRESHOLD
    || areaShift > ZEE_INTERNAL_ENGINE_STABILITY_REGION_AREA_SHIFT_THRESHOLD
  ) {
    reasons.push(makeReason(
      'form_change',
      'form_change',
      {
        areaShift: roundTo(areaShift, 6),
        heightShift: roundTo(heightShift, 6),
        widthShift: roundTo(widthShift, 6),
      },
    ));
  }

  if (score < ZEE_INTERNAL_ENGINE_STABILITY_MATCH_SCORE_THRESHOLD && reasons.length === 0) {
    reasons.push(makeReason(
      'weak_similarity',
      'weak_similarity',
      {
        score: roundTo(score, 6),
      },
    ));
  }

  return {
    reasons,
    score: roundTo(score, 6),
  };
}

function compareCandidates(left, right) {
  if (left.signalKind === 'dominant_color') {
    return compareDominantColors(left, right);
  }

  if (left.signalKind === 'visible_region') {
    return compareVisibleRegions(left, right);
  }

  return {
    reasons: [
      makeReason(
        'unsupported_signal_kind',
        'unsupported_signal_kind',
      ),
    ],
    score: 0,
  };
}

function compareCandidateToTrack(track, candidate) {
  const comparison = compareCandidates(track.lastObservation, candidate);
  const matches = comparison.reasons.length === 0 && comparison.score >= ZEE_INTERNAL_ENGINE_STABILITY_MATCH_SCORE_THRESHOLD;

  return {
    ...comparison,
    matches,
  };
}

function buildSignalIdentity(candidate, firstFrameIndex) {
  return `${candidate.signalKind}:${candidate.signalKey}:f${firstFrameIndex}`;
}

function buildObservationSummary(candidate) {
  return candidate.observation;
}

function createTrack(candidate, nextTrackId) {
  return {
    closed: false,
    comparisons: [],
    firstFrameIndex: candidate.frameIndex,
    lastFrameIndex: candidate.frameIndex,
    lastObservation: candidate,
    observations: [buildObservationSummary(candidate)],
    signalId: null,
    signalKey: candidate.signalKey,
    signalKind: candidate.signalKind,
    trackId: nextTrackId,
  };
}

function appendObservation(track, candidate, comparison) {
  track.comparisons.push({
    fromFrameIndex: track.lastFrameIndex,
    toFrameIndex: candidate.frameIndex,
    score: comparison.score,
  });
  track.lastFrameIndex = candidate.frameIndex;
  track.lastObservation = candidate;
  track.observations.push(buildObservationSummary(candidate));
}

function finalizeTrack(track, status, details) {
  const support = {
    consecutiveFrameCount: track.observations.length,
    firstFrameIndex: track.firstFrameIndex,
    frameCount: track.observations.length,
    frames: track.observations.map((observation) => observation.frameIndex),
    lastFrameIndex: track.lastFrameIndex,
  };
  const averageScore = track.comparisons.length === 0
    ? 0
    : track.comparisons.reduce((sum, comparison) => sum + comparison.score, 0) / track.comparisons.length;

  return {
    discardReasons: status === 'discarded' ? details.discardReasons : [],
    outcomeCategory: status === 'stable'
      ? ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY.signalStability.stable
      : ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY.signalStability.discarded,
    observations: track.observations,
    retainedReason: status === 'stable'
      ? 'stable_signal_retained'
      : null,
    signalId: track.signalId,
    signalKey: track.signalKey,
    signalKind: track.signalKind,
    stability: {
      averageTransitionScore: roundTo(averageScore, 6),
      status,
      transitionCount: track.comparisons.length,
    },
    status,
    support,
    transitionDetails: track.comparisons,
    ...details.extraFields,
  };
}

function selectBestTrack(trackPool, candidate) {
  let bestTrack = null;
  let bestComparison = null;

  trackPool.forEach((track) => {
    const comparison = compareCandidateToTrack(track, candidate);

    if (!bestComparison) {
      bestTrack = track;
      bestComparison = comparison;
      return;
    }

    if (comparison.score > bestComparison.score) {
      bestTrack = track;
      bestComparison = comparison;
      return;
    }

    if (comparison.score === bestComparison.score) {
      const trackRank = compareCanonicalNumber(track.firstFrameIndex, bestTrack.firstFrameIndex)
        || compareCanonicalText(track.signalKey, bestTrack.signalKey)
        || compareCanonicalNumber(track.trackId, bestTrack.trackId);

      if (trackRank < 0) {
        bestTrack = track;
        bestComparison = comparison;
      }
    }
  });

  return { bestComparison, bestTrack };
}

function buildComparisonSummary(stableSignals, discardedSignals) {
  const summary = {
    discardedCount: discardedSignals.length,
    stableCount: stableSignals.length,
    totalCount: stableSignals.length + discardedSignals.length,
    byKind: {},
  };

  [...stableSignals, ...discardedSignals].forEach((signal) => {
    if (!summary.byKind[signal.signalKind]) {
      summary.byKind[signal.signalKind] = {
        discarded: 0,
        stable: 0,
      };
    }

    summary.byKind[signal.signalKind][signal.status] += 1;
  });

  return summary;
}

function buildDiagnosticNotes(summary) {
  return [
    makeReason(
      'signal_stability_layer',
      'signal_stability_layer',
      {
        discardedCount: summary.discardedCount,
        stableCount: summary.stableCount,
      },
    ),
    makeReason(
      'signal_stability_summary',
      'signal_stability_summary',
    ),
  ];
}

function buildZeeSignalStabilityReport(frameReports) {
  const normalizedFrameReports = normalizeFrameReports(frameReports);
  const activeTracks = [];
  const finishedTracks = [];

  normalizedFrameReports.forEach((frameReport, frameOrderIndex) => {
    const frameCandidates = buildFrameCandidates(frameReport);
    const previousFrameIndex = frameOrderIndex === 0
      ? null
      : normalizedFrameReports[frameOrderIndex - 1].frameIndex;
    const openTracks = activeTracks.filter(
      (track) => !track.closed && track.lastFrameIndex === previousFrameIndex,
    );
    const matchedTrackIds = new Set();

    frameCandidates.forEach((candidate) => {
      const sameKindPool = openTracks.filter(
        (track) => track.signalKind === candidate.signalKind && !matchedTrackIds.has(track.trackId),
      );
      const { bestComparison, bestTrack } = selectBestTrack(sameKindPool, candidate);

      if (bestTrack && bestComparison && bestComparison.matches) {
        appendObservation(bestTrack, candidate, bestComparison);
        matchedTrackIds.add(bestTrack.trackId);
        return;
      }

      const newTrack = createTrack(candidate, activeTracks.length + 1);
      activeTracks.push(newTrack);
    });

    openTracks.forEach((track) => {
      if (matchedTrackIds.has(track.trackId)) {
        return;
      }

      const sameKindCandidates = frameCandidates.filter((candidate) => candidate.signalKind === track.signalKind);
      let discardReasons = [
        makeReason(
          'missing_adjacent_match',
          'missing_adjacent_match',
        ),
      ];
      let comparisonScore = 0;

      if (sameKindCandidates.length > 0) {
        const bestComparisonCandidate = sameKindCandidates.reduce((bestCandidate, candidate) => {
          if (!bestCandidate) {
            return candidate;
          }

          const bestCandidateComparison = compareCandidates(track.lastObservation, bestCandidate);
          const candidateComparison = compareCandidates(track.lastObservation, candidate);
          if (candidateComparison.score > bestCandidateComparison.score) {
            return candidate;
          }
          if (candidateComparison.score === bestCandidateComparison.score) {
            const candidateRank = compareCanonicalText(candidate.signalKey, bestCandidate.signalKey)
              || compareCanonicalNumber(candidate.frameIndex, bestCandidate.frameIndex);
            return candidateRank < 0 ? candidate : bestCandidate;
          }
          return bestCandidate;
        }, null);

        if (bestComparisonCandidate) {
          const comparison = compareCandidates(track.lastObservation, bestComparisonCandidate);
          discardReasons = comparison.reasons.length > 0 ? comparison.reasons : discardReasons;
          comparisonScore = comparison.score;
        }
      }

      track.closed = true;
      const signalId = buildSignalIdentity(track.lastObservation, track.firstFrameIndex);
      track.signalId = signalId;
      finishedTracks.push(finalizeTrack(track, 'discarded', {
        discardReasons,
        extraFields: {
          signalId,
          stability: {
            averageTransitionScore: roundTo(comparisonScore, 6),
            outcomeCategory: ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY.signalStability.discarded,
            status: 'discarded',
            transitionCount: track.comparisons.length,
          },
        },
      }));
    });
  });

  activeTracks.forEach((track) => {
    if (track.closed) {
      return;
    }

    const signalId = buildSignalIdentity(track.lastObservation, track.firstFrameIndex);
    track.signalId = signalId;

    if (track.observations.length < ZEE_INTERNAL_ENGINE_STABILITY_MIN_SUPPORT) {
      finishedTracks.push(finalizeTrack(track, 'discarded', {
        discardReasons: [
          makeReason(
            'insufficient_support',
            'insufficient_support',
          ),
        ],
        extraFields: {
          signalId,
        },
      }));
      return;
    }

    finishedTracks.push(finalizeTrack(track, 'stable', {
      discardReasons: [],
      extraFields: {
        signalId,
      },
    }));
  });

  const stableSignals = finishedTracks
    .filter((signal) => signal.status === 'stable')
    .sort((left, right) => (
      compareCanonicalNumber(
        KIND_PRIORITY.get(left.signalKind) ?? Number.MAX_SAFE_INTEGER,
        KIND_PRIORITY.get(right.signalKind) ?? Number.MAX_SAFE_INTEGER,
      )
      || compareCanonicalNumber(left.support.firstFrameIndex, right.support.firstFrameIndex)
      || compareCanonicalText(left.signalKey, right.signalKey)
      || compareCanonicalText(left.signalId, right.signalId)
    ));

  const discardedSignals = finishedTracks
    .filter((signal) => signal.status === 'discarded')
    .sort((left, right) => (
      compareCanonicalNumber(
        KIND_PRIORITY.get(left.signalKind) ?? Number.MAX_SAFE_INTEGER,
        KIND_PRIORITY.get(right.signalKind) ?? Number.MAX_SAFE_INTEGER,
      )
      || compareCanonicalNumber(left.support.firstFrameIndex, right.support.firstFrameIndex)
      || compareCanonicalText(left.signalKey, right.signalKey)
      || compareCanonicalText(left.signalId, right.signalId)
    ));

  const summary = buildComparisonSummary(stableSignals, discardedSignals);

  return {
    diagnosticNotes: buildDiagnosticNotes(summary),
    discardedSignals,
    frameCount: normalizedFrameReports.length,
    layer: ZEE_INTERNAL_ENGINE_STABILITY_LAYER,
    ...createZeeArtifactMarker('signal_stability'),
    policyVersion: ZEE_INTERNAL_ENGINE_STABILITY_POLICY.version,
    resultTaxonomy: ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY.signalStability,
    resultTaxonomyVersion: ZEE_INTERNAL_ENGINE_RESULT_TAXONOMY_VERSION,
    schemaVersion: ZEE_INTERNAL_ENGINE_SIGNAL_STABILITY_SCHEMA.version,
    stableSignals,
    summary,
    version: ZEE_INTERNAL_ENGINE_STABILITY_VERSION,
  };
}

module.exports = {
  buildZeeSignalStabilityReport,
};
