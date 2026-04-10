'use strict';

const path = require('node:path');

const { analyzeZeeObservedFrames } = require('./index');
const { ZEE_INTERNAL_ENGINE_ERROR_CODES } = require('./constants');
const { ZeeObservedInputError } = require('./input-contract');

const ZEE_REPLAY_LAYER = 'Replay Harness';
const ZEE_REPLAY_VERSION = 'v1';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !Buffer.isBuffer(value);
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

function normalizeReplayValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeReplayValue(entry));
  }

  if (isPlainObject(value)) {
    const normalized = {};

    [...Object.keys(value)].sort().forEach((key) => {
      normalized[key] = normalizeReplayValue(value[key]);
    });

    return normalized;
  }

  return value;
}

function normalizeReplayMetadata(metadata) {
  if (metadata === undefined || metadata === null) {
    return {};
  }

  if (!isPlainObject(metadata)) {
    throw new ZeeObservedInputError(
      'ZEE replay metadata must be a non-null object when provided.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  return normalizeReplayValue(metadata);
}

function getFrameSortLabel(frame, index) {
  if (Buffer.isBuffer(frame)) {
    return `buffer-frame-${index + 1}`;
  }

  if (typeof frame === 'string') {
    return path.basename(frame) || `path-frame-${index + 1}`;
  }

  if (isPlainObject(frame)) {
    if (typeof frame.label === 'string' && frame.label.trim() !== '') {
      return frame.label.trim();
    }

    if (typeof frame.sourceId === 'string' && frame.sourceId.trim() !== '') {
      return frame.sourceId.trim();
    }

    if (typeof frame.path === 'string' && frame.path.trim() !== '') {
      return path.basename(frame.path.trim()) || `path-frame-${index + 1}`;
    }
  }

  return `frame-${index + 1}`;
}

function normalizeReplayFrame(frame, index) {
  const sortLabel = getFrameSortLabel(frame, index);
  const hasExplicitFrameIndex = isPlainObject(frame) && Number.isInteger(frame.frameIndex);
  const frameIndex = hasExplicitFrameIndex ? frame.frameIndex : index;

  if (hasExplicitFrameIndex && frame.frameIndex < 0) {
    throw new ZeeObservedInputError(
      `Replay frame ${index + 1} must use a non-negative integer frameIndex.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  return {
    frame,
    frameIndex,
    originalIndex: index,
    sortLabel,
    hasExplicitFrameIndex,
  };
}

function compareReplayFrameEntries(left, right) {
  return (
    left.frameIndex - right.frameIndex
    || left.sortLabel.localeCompare(right.sortLabel)
    || left.originalIndex - right.originalIndex
  );
}

function normalizeReplayCaseConfig(caseConfig, index) {
  if (!isPlainObject(caseConfig)) {
    throw new ZeeObservedInputError(
      `Replay case ${index + 1} must be a non-null object.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  const caseId = typeof caseConfig.caseId === 'string' && caseConfig.caseId.trim() !== ''
    ? caseConfig.caseId.trim()
    : null;

  if (!caseId) {
    throw new ZeeObservedInputError(
      `Replay case ${index + 1} must include a non-empty caseId.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (!Array.isArray(caseConfig.frames) || caseConfig.frames.length === 0) {
    throw new ZeeObservedInputError(
      `Replay case "${caseId}" must include at least one frame.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  const frameEntries = caseConfig.frames.map((frame, frameIndex) => normalizeReplayFrame(frame, frameIndex));
  const explicitFrameIndexes = frameEntries
    .filter((entry) => entry.hasExplicitFrameIndex)
    .map((entry) => entry.frameIndex);
  const uniqueExplicitFrameIndexes = new Set(explicitFrameIndexes);

  if (uniqueExplicitFrameIndexes.size !== explicitFrameIndexes.length) {
    throw new ZeeObservedInputError(
      `Replay case "${caseId}" must not repeat explicit frameIndex values.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  return {
    caseId,
    frameEntries: frameEntries.sort(compareReplayFrameEntries),
    metadata: normalizeReplayMetadata(caseConfig.metadata),
    originalIndex: index,
    options: caseConfig.options === undefined || caseConfig.options === null
      ? undefined
      : normalizeReplayMetadata(caseConfig.options),
  };
}

function normalizeReplaySuiteInput(input) {
  if (!isPlainObject(input)) {
    throw new ZeeObservedInputError(
      'ZEE replay suite input must be a non-null object containing a cases array.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (!Array.isArray(input.cases) || input.cases.length === 0) {
    throw new ZeeObservedInputError(
      'ZEE replay suite input must include at least one replay case.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  const normalizedCases = input.cases.map((caseConfig, index) => normalizeReplayCaseConfig(caseConfig, index));
  const seenCaseIds = new Set();

  normalizedCases.forEach((caseConfig) => {
    if (seenCaseIds.has(caseConfig.caseId)) {
      throw new ZeeObservedInputError(
        `Replay suite must not contain duplicate caseId values: "${caseConfig.caseId}".`,
        ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
      );
    }

    seenCaseIds.add(caseConfig.caseId);
  });

  return {
    metadata: normalizeReplayMetadata(input.metadata),
    cases: normalizedCases.sort(
      (left, right) => left.caseId.localeCompare(right.caseId) || left.originalIndex - right.originalIndex,
    ),
    suiteId: typeof input.suiteId === 'string' && input.suiteId.trim() !== ''
      ? input.suiteId.trim()
      : null,
  };
}

function buildCaseInputSummary(normalizedCase) {
  return {
    frameCount: normalizedCase.frameEntries.length,
    frames: normalizedCase.frameEntries.map((entry, frameIndex) => ({
      frameIndex,
      sourceId: isPlainObject(entry.frame) && typeof entry.frame.sourceId === 'string' && entry.frame.sourceId.trim() !== ''
        ? entry.frame.sourceId.trim()
        : null,
      sourceLabel: isPlainObject(entry.frame)
        ? (typeof entry.frame.label === 'string' && entry.frame.label.trim() !== ''
          ? entry.frame.label.trim()
          : (typeof entry.frame.sourceId === 'string' && entry.frame.sourceId.trim() !== ''
            ? entry.frame.sourceId.trim()
            : entry.sortLabel))
        : entry.sortLabel,
      sourcePath: isPlainObject(entry.frame) && typeof entry.frame.path === 'string' && entry.frame.path.trim() !== ''
        ? path.resolve(entry.frame.path.trim())
        : (typeof entry.frame === 'string' ? path.resolve(entry.frame) : null),
      sourceType: Buffer.isBuffer(entry.frame)
        ? 'buffer'
        : (typeof entry.frame === 'string' ? 'path' : (isPlainObject(entry.frame) && Buffer.isBuffer(entry.frame.buffer) ? 'buffer' : 'path')),
    })),
    options: normalizedCase.options === undefined ? null : normalizedCase.options,
  };
}

function buildReplayCaseDiagnostics(normalizedCase, pipeline) {
  return [
    makeNote(
      'replay_case',
      `Replay case "${normalizedCase.caseId}" executed through the full ZEE pipeline in deterministic frame order.`,
      {
        caseId: normalizedCase.caseId,
        frameCount: normalizedCase.frameEntries.length,
      },
    ),
    ...pipeline.diagnosticNotes,
  ];
}

function buildReplayCaseSummary(pipeline) {
  return {
    measuredCount: pipeline.measurementLayer.measurements.length,
    observedFrameCount: pipeline.frames.length,
    rejectedClaimCount: pipeline.inferenceGate.rejected_claims.length,
    stableSignalCount: pipeline.signalStability.stableSignals.length,
    supportedInferenceCount: pipeline.inferenceGate.supported_inferences.length,
    unknownCount: pipeline.inferenceGate.unknowns.length,
  };
}

function executeReplayCase(normalizedCase) {
  const pipeline = analyzeZeeObservedFrames({
    frames: normalizedCase.frameEntries.map((entry) => entry.frame),
    options: normalizedCase.options,
  });

  const input = buildCaseInputSummary(normalizedCase);

  return {
    caseId: normalizedCase.caseId,
    diagnosticNotes: buildReplayCaseDiagnostics(normalizedCase, pipeline),
    inferred: pipeline.inferenceGate.supported_inferences,
    input,
    layer: ZEE_REPLAY_LAYER,
    metadata: normalizedCase.metadata,
    measured: pipeline.measurementLayer,
    observed: {
      frames: pipeline.frames,
      summary: pipeline.observedSummary,
    },
    pipeline,
    rejected_claims: pipeline.inferenceGate.rejected_claims,
    stable: pipeline.signalStability,
    summary: buildReplayCaseSummary(pipeline),
    unknowns: pipeline.inferenceGate.unknowns,
    version: ZEE_REPLAY_VERSION,
  };
}

function runZeeReplayCase(caseConfig) {
  const normalizedCase = normalizeReplayCaseConfig(caseConfig, 0);

  return executeReplayCase(normalizedCase);
}

function buildReplaySuiteDiagnostics(normalizedSuite, caseResults) {
  return [
    makeNote(
      'replay_suite',
      `Replay suite "${normalizedSuite.suiteId ?? 'unnamed-suite'}" executed ${caseResults.length} case${caseResults.length === 1 ? '' : 's'} in deterministic order.`,
      {
        caseCount: caseResults.length,
        caseIds: caseResults.map((entry) => entry.caseId),
      },
    ),
    makeNote(
      'replay_suite_order',
      'Cases are sorted by caseId before execution to keep replay output stable.',
      {
        sortedCaseIds: caseResults.map((entry) => entry.caseId),
      },
    ),
  ];
}

function buildReplaySuiteSummary(caseResults) {
  return caseResults.reduce((summary, caseResult) => {
    summary.caseCount += 1;
    summary.measuredCount += caseResult.summary.measuredCount;
    summary.observedFrameCount += caseResult.summary.observedFrameCount;
    summary.rejectedClaimCount += caseResult.summary.rejectedClaimCount;
    summary.stableSignalCount += caseResult.summary.stableSignalCount;
    summary.supportedInferenceCount += caseResult.summary.supportedInferenceCount;
    summary.unknownCount += caseResult.summary.unknownCount;
    return summary;
  }, {
    caseCount: 0,
    measuredCount: 0,
    observedFrameCount: 0,
    rejectedClaimCount: 0,
    stableSignalCount: 0,
    supportedInferenceCount: 0,
    unknownCount: 0,
  });
}

function runZeeReplaySuite(input) {
  const normalizedSuite = normalizeReplaySuiteInput(input);
  const caseResults = normalizedSuite.cases.map((caseConfig) => executeReplayCase(caseConfig));

  return {
    caseCount: caseResults.length,
    caseIds: caseResults.map((caseResult) => caseResult.caseId),
    cases: caseResults,
    diagnosticNotes: buildReplaySuiteDiagnostics(normalizedSuite, caseResults),
    layer: ZEE_REPLAY_LAYER,
    metadata: normalizedSuite.metadata,
    summary: buildReplaySuiteSummary(caseResults),
    suiteId: normalizedSuite.suiteId,
    version: ZEE_REPLAY_VERSION,
  };
}

module.exports = {
  runZeeReplayCase,
  runZeeReplaySuite,
};
