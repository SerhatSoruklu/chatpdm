'use strict';

const {
  ZEE_INTERNAL_ENGINE_ERROR_CODES,
} = require('./constants');
const { ZeeObservedInputError } = require('./input-contract');
const { runZeeReplayCase, runZeeReplaySuite } = require('./replay-harness');

const ZEE_INSPECTOR_LAYER = 'Inspector';
const ZEE_INSPECTOR_VERSION = 'v1';

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

function buildGroupSummary(items) {
  return {
    count: items.length,
  };
}

function buildCaseSummary(replayResult) {
  return {
    discardedSignalCount: replayResult.stable.discardedSignals.length,
    inferredCount: replayResult.inferred.length,
    measuredCount: replayResult.measured.measurements.length,
    observedFrameCount: replayResult.observed.frames.length,
    rejectedClaimCount: replayResult.rejected_claims.length,
    stableSignalCount: replayResult.stable.stableSignals.length,
    unknownCount: replayResult.unknowns.length,
  };
}

function normalizeInspectorReplayResult(replayResult) {
  if (!isPlainObject(replayResult)) {
    throw new ZeeObservedInputError(
      'ZEE inspector expects a replay result object.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (!isPlainObject(replayResult.pipeline)) {
    throw new ZeeObservedInputError(
      'ZEE inspector expects replay result.pipeline to be present.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  return replayResult;
}

function buildCaseInspectionFromReplayResult(replayResult) {
  const normalizedReplayResult = normalizeInspectorReplayResult(replayResult);
  const signalStability = normalizedReplayResult.pipeline.signalStability;
  const measurementLayer = normalizedReplayResult.pipeline.measurementLayer;

  return {
    caseId: normalizedReplayResult.caseId,
    diagnosticNotes: normalizedReplayResult.diagnosticNotes,
    discarded: {
      signals: signalStability.discardedSignals,
      summary: buildGroupSummary(signalStability.discardedSignals),
    },
    inferred: {
      inferences: normalizedReplayResult.inferred,
      summary: buildGroupSummary(normalizedReplayResult.inferred),
    },
    input: normalizedReplayResult.input,
    kind: 'case',
    layer: ZEE_INSPECTOR_LAYER,
    measured: {
      signals: measurementLayer.measurements,
      summary: buildGroupSummary(measurementLayer.measurements),
    },
    metadata: normalizedReplayResult.metadata,
    observed: {
      frames: normalizedReplayResult.observed.frames,
      summary: normalizedReplayResult.observed.summary,
    },
    rejected: {
      claims: normalizedReplayResult.rejected_claims,
      summary: buildGroupSummary(normalizedReplayResult.rejected_claims),
    },
    source: {
      kind: 'replay_case',
      layer: normalizedReplayResult.layer,
      version: normalizedReplayResult.version,
    },
    stable: {
      signals: signalStability.stableSignals,
      summary: buildGroupSummary(signalStability.stableSignals),
    },
    summary: buildCaseSummary(normalizedReplayResult),
    unknowns: {
      items: normalizedReplayResult.unknowns,
      summary: buildGroupSummary(normalizedReplayResult.unknowns),
    },
    version: ZEE_INSPECTOR_VERSION,
  };
}

function buildSuiteSummary(caseInspections) {
  return caseInspections.reduce((summary, caseInspection) => {
    summary.caseCount += 1;
    summary.discardedSignalCount += caseInspection.discarded.signals.length;
    summary.inferredCount += caseInspection.inferred.inferences.length;
    summary.measuredCount += caseInspection.measured.signals.length;
    summary.observedFrameCount += caseInspection.observed.frames.length;
    summary.rejectedClaimCount += caseInspection.rejected.claims.length;
    summary.stableSignalCount += caseInspection.stable.signals.length;
    summary.unknownCount += caseInspection.unknowns.items.length;
    return summary;
  }, {
    caseCount: 0,
    discardedSignalCount: 0,
    inferredCount: 0,
    measuredCount: 0,
    observedFrameCount: 0,
    rejectedClaimCount: 0,
    stableSignalCount: 0,
    unknownCount: 0,
  });
}

function buildSuiteDiagnosticNotes(replaySuite, caseInspections) {
  return [
    makeNote(
      'inspector_suite',
      `Inspector rendered ${caseInspections.length} replay case${caseInspections.length === 1 ? '' : 's'} as grouped pipeline output.`,
      {
        caseCount: caseInspections.length,
        caseIds: replaySuite.caseIds,
      },
    ),
    makeNote(
      'inspector_suite_order',
      'Replay cases are already sorted by caseId before inspection, so the grouped output stays stable across runs.',
      {
        sortedCaseIds: replaySuite.caseIds,
      },
    ),
  ];
}

function inspectZeeReplayCase(caseConfig) {
  const replayResult = runZeeReplayCase(caseConfig);

  return buildCaseInspectionFromReplayResult(replayResult);
}

function inspectZeeReplaySuite(suiteConfig) {
  const replaySuite = runZeeReplaySuite(suiteConfig);
  const caseInspections = replaySuite.cases.map((caseResult) => buildCaseInspectionFromReplayResult(caseResult));

  return {
    caseCount: replaySuite.caseCount,
    caseIds: replaySuite.caseIds,
    cases: caseInspections,
    diagnosticNotes: buildSuiteDiagnosticNotes(replaySuite, caseInspections),
    kind: 'suite',
    layer: ZEE_INSPECTOR_LAYER,
    metadata: replaySuite.metadata,
    source: {
      kind: 'replay_suite',
      layer: replaySuite.layer,
      version: replaySuite.version,
    },
    summary: buildSuiteSummary(caseInspections),
    suiteId: replaySuite.suiteId,
    version: ZEE_INSPECTOR_VERSION,
  };
}

module.exports = {
  inspectZeeReplayCase,
  inspectZeeReplaySuite,
};
