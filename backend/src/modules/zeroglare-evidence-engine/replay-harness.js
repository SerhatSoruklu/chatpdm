'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const { analyzeZeeObservedFrames } = require('./index');
const {
  ZEE_INTERNAL_ENGINE_ERROR_CODES,
  ZEE_INTERNAL_ENGINE_POLICY_MANIFEST,
  ZEE_INTERNAL_ENGINE_TRACE_CONTRACT,
} = require('./constants');
const {
  buildZeeReplayCaseManifest,
  buildZeeReplaySuiteManifest,
} = require('./replay-manifest');
const {
  createZeeArtifactMarker,
} = require('./artifact-markers');
const {
  buildCanonicalArtifactId,
  buildCanonicalFrameArtifactId,
  compareCanonicalNumber,
  compareCanonicalText,
} = require('./policy');
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

    [...Object.keys(value)].sort(compareCanonicalText).forEach((key) => {
      normalized[key] = normalizeReplayValue(value[key]);
    });

    return normalized;
  }

  return value;
}

function resolveReplayFramePayload(frame, index) {
  const frameNumber = index + 1;
  const fallbackSourceLabel = `frame-${frameNumber}`;
  let buffer = null;
  let declaredArtifactId = null;
  let sourceId = null;
  let sourceLabel = fallbackSourceLabel;

  if (Buffer.isBuffer(frame)) {
    buffer = frame;
  } else if (typeof frame === 'string') {
    buffer = fs.readFileSync(frame);
  } else if (isPlainObject(frame)) {
    declaredArtifactId = typeof frame.artifactId === 'string' && frame.artifactId.trim() !== ''
      ? frame.artifactId.trim()
      : null;
    sourceId = typeof frame.sourceId === 'string' && frame.sourceId.trim() !== ''
      ? frame.sourceId.trim()
      : null;
    sourceLabel = typeof frame.label === 'string' && frame.label.trim() !== ''
      ? frame.label.trim()
      : fallbackSourceLabel;

    if (Buffer.isBuffer(frame.buffer)) {
      buffer = frame.buffer;
    } else if (typeof frame.path === 'string' && frame.path.trim() !== '') {
      buffer = fs.readFileSync(frame.path.trim());
    }
  }

  if (!Buffer.isBuffer(buffer)) {
    throw new ZeeObservedInputError(
      `Replay frame ${frameNumber} must be a string path, Buffer, or object with a path or buffer.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  const frameFingerprint = crypto.createHash('sha256').update(buffer).digest('hex');
  const frameId = frameFingerprint;
  const artifactId = declaredArtifactId || sourceId || buildCanonicalFrameArtifactId(frameFingerprint);
  const frameOrderKey = [
    artifactId,
    frameId,
    sourceLabel,
  ].join('\u001f');

  return {
    artifactId,
    buffer,
    frameId,
    frameOrderKey,
    sourceId,
    sourceLabel,
  };
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

function normalizeReplayFrame(frame, index) {
  const { artifactId, frameId, frameOrderKey, sourceId, sourceLabel } = resolveReplayFramePayload(frame, index);
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
    artifactId,
    frameIndex,
    frameId,
    originalIndex: index,
    sourceId,
    sourceLabel,
    frameOrderKey,
    hasExplicitFrameIndex,
  };
}

function compareReplayFrameEntries(left, right) {
  return (
    compareCanonicalText(left.frameOrderKey, right.frameOrderKey)
    || compareCanonicalNumber(left.originalIndex, right.originalIndex)
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
      (left, right) => compareCanonicalText(left.caseId, right.caseId)
        || compareCanonicalNumber(left.originalIndex, right.originalIndex),
    ),
    suiteId: typeof input.suiteId === 'string' && input.suiteId.trim() !== ''
      ? input.suiteId.trim()
      : null,
  };
}

function buildCaseInputSummary(normalizedCase) {
  return {
    artifactId: normalizedCase.caseId,
    frameCount: normalizedCase.frameEntries.length,
    frames: normalizedCase.frameEntries.map((entry, frameIndex) => ({
      artifactId: entry.artifactId,
      frameId: entry.frameId,
      frameIndex,
      sourceId: entry.sourceId,
      sourceLabel: entry.sourceLabel,
    })),
    options: normalizedCase.options === undefined ? null : normalizedCase.options,
  };
}

function buildReplayCaseDiagnostics(normalizedCase, pipeline) {
  return [
    makeNote(
      'replay_case',
      'replay_case',
      {
        caseId: normalizedCase.caseId,
        frameCount: normalizedCase.frameEntries.length,
      },
    ),
    ...pipeline.diagnosticNotes,
  ];
}

function buildReplayCaseSummary(pipeline) {
  const rejectedClaims = pipeline.inferenceGate.rejected_claims;

  return {
    measuredCount: pipeline.measurementLayer.measurements.length,
    observedFrameCount: pipeline.frames.length,
    rejectedClaimCount: rejectedClaims.length,
    refusedClaimCount: rejectedClaims.filter((claim) => claim.outcomeCategory === 'REFUSED').length,
    stableSignalCount: pipeline.signalStability.stableSignals.length,
    supportedInferenceCount: pipeline.inferenceGate.supported_inferences.length,
    unsupportedClaimCount: rejectedClaims.filter((claim) => claim.outcomeCategory === 'UNSUPPORTED').length,
    unknownCount: pipeline.inferenceGate.unknowns.length,
  };
}

function executeReplayCase(normalizedCase) {
  const pipeline = analyzeZeeObservedFrames({
    frames: normalizedCase.frameEntries.map((entry) => entry.frame),
    options: normalizedCase.options,
  });

  const input = buildCaseInputSummary(normalizedCase);
  const artifactId = normalizedCase.caseId;
  const replayManifest = buildZeeReplayCaseManifest({
    artifactId,
    caseId: normalizedCase.caseId,
    frameArtifactIds: input.frames.map((frame) => frame.artifactId),
    frameCount: input.frameCount,
    inputArtifactId: input.artifactId,
  });

  return {
    ...createZeeArtifactMarker('replay_case'),
    caseId: normalizedCase.caseId,
    artifactId,
    diagnosticNotes: buildReplayCaseDiagnostics(normalizedCase, pipeline),
    canonicalTrace: pipeline,
    inferred: pipeline.inferenceGate.supported_inferences,
    input,
    layer: ZEE_REPLAY_LAYER,
    policyVersion: ZEE_INTERNAL_ENGINE_POLICY_MANIFEST.version,
    metadata: normalizedCase.metadata,
    measured: pipeline.measurementLayer,
    observed: {
      frames: pipeline.frames,
      summary: pipeline.observedSummary,
    },
    pipeline,
    replayManifest,
    traceContract: ZEE_INTERNAL_ENGINE_TRACE_CONTRACT,
    rejected_claims: pipeline.inferenceGate.rejected_claims,
    schemaVersion: ZEE_INTERNAL_ENGINE_TRACE_CONTRACT.canonicalTraceSchemaVersion,
    stable: pipeline.signalStability,
    canonicalReplayArtifact: {
      ...createZeeArtifactMarker('canonical_replay_artifact'),
      artifactId,
      schemaVersion: ZEE_INTERNAL_ENGINE_TRACE_CONTRACT.canonicalReplayArtifactSchemaVersion,
    },
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
      'replay_suite',
      {
        caseCount: caseResults.length,
        caseIds: caseResults.map((entry) => entry.caseId),
      },
    ),
    makeNote(
      'replay_suite_order',
      'case_id_utf8_nfc_bytewise',
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
    summary.refusedClaimCount += caseResult.summary.refusedClaimCount;
    summary.stableSignalCount += caseResult.summary.stableSignalCount;
    summary.supportedInferenceCount += caseResult.summary.supportedInferenceCount;
    summary.unsupportedClaimCount += caseResult.summary.unsupportedClaimCount;
    summary.unknownCount += caseResult.summary.unknownCount;
    return summary;
  }, {
    caseCount: 0,
    measuredCount: 0,
    observedFrameCount: 0,
    rejectedClaimCount: 0,
    refusedClaimCount: 0,
    stableSignalCount: 0,
    supportedInferenceCount: 0,
    unsupportedClaimCount: 0,
    unknownCount: 0,
  });
}

function runZeeReplaySuite(input) {
  const normalizedSuite = normalizeReplaySuiteInput(input);
  const caseResults = normalizedSuite.cases.map((caseConfig) => executeReplayCase(caseConfig));
  const artifactId = normalizedSuite.suiteId ?? buildCanonicalArtifactId('zee-replay-suite', [
    caseResults.map((caseResult) => caseResult.artifactId),
    normalizedSuite.metadata,
  ]);
  const replayManifest = buildZeeReplaySuiteManifest({
    artifactId,
    caseCount: caseResults.length,
    caseIds: caseResults.map((caseResult) => caseResult.caseId),
    suiteId: normalizedSuite.suiteId,
  });

  return {
    ...createZeeArtifactMarker('replay_suite'),
    caseCount: caseResults.length,
    caseIds: caseResults.map((caseResult) => caseResult.caseId),
    cases: caseResults,
    artifactId,
    diagnosticNotes: buildReplaySuiteDiagnostics(normalizedSuite, caseResults),
    canonicalTraces: caseResults.map((caseResult) => caseResult.canonicalTrace ?? caseResult.pipeline),
    layer: ZEE_REPLAY_LAYER,
    policyVersion: ZEE_INTERNAL_ENGINE_POLICY_MANIFEST.version,
    metadata: normalizedSuite.metadata,
    replayManifest,
    traceContract: ZEE_INTERNAL_ENGINE_TRACE_CONTRACT,
    schemaVersion: ZEE_INTERNAL_ENGINE_TRACE_CONTRACT.canonicalTraceSchemaVersion,
    summary: buildReplaySuiteSummary(caseResults),
    suiteId: normalizedSuite.suiteId,
    canonicalReplayArtifact: {
      ...createZeeArtifactMarker('canonical_replay_artifact'),
      artifactId,
      schemaVersion: ZEE_INTERNAL_ENGINE_TRACE_CONTRACT.canonicalReplayArtifactSchemaVersion,
    },
    version: ZEE_REPLAY_VERSION,
  };
}

module.exports = {
  runZeeReplayCase,
  runZeeReplaySuite,
};
