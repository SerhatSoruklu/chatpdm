'use strict';

const DoctrineArtifact = require('../doctrine/doctrine-artifact.model');
const ValidationRun = require('./validation-run.model');
const legalValidatorSchemas = require('../shared/legal-validator.schemas');

const SERVICE_NAME = 'trace.service';
const OWNED_FAILURE_CODES = new Set([
  'DOCTRINE_ARTIFACT_UNAVAILABLE',
  'REPLAY_ARTIFACT_MISMATCH',
  'TRACE_INCOMPLETE',
]);

function buildTerminalResult({ failureCode, reason, extras = {} }) {
  if (!OWNED_FAILURE_CODES.has(failureCode)) {
    throw new Error(`${SERVICE_NAME} cannot emit unowned failure code ${failureCode}.`);
  }

  return {
    ok: false,
    terminal: true,
    result: 'invalid',
    failureCode,
    reason,
    service: SERVICE_NAME,
    validationRunWritten: false,
    ...extras,
  };
}

function buildContinueResult({ context, validationRun, persistedTraceSummary }) {
  return {
    ok: true,
    terminal: false,
    service: SERVICE_NAME,
    doctrineArtifactId: context.doctrineArtifactId,
    doctrineHash: context.doctrineHash,
    mappingId: context.mappingId,
    validationRunId: validationRun.validationRunId,
    validationRunWritten: true,
    result: validationRun.result,
    persistedTraceSummary,
  };
}

function assertContinueInput(name, value) {
  if (!value || value.ok !== true || value.terminal !== false) {
    throw new Error(`${SERVICE_NAME} requires a continue outcome from ${name}.`);
  }
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.filter((value) => typeof value === 'string' && value.trim().length > 0);
}

function canonicalizeStringArray(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function hasDuplicateValues(values) {
  return new Set(values).size !== values.length;
}

function compareSharedContext(doctrineLoadResult, resolverResult, validationKernelResult) {
  const doctrineArtifactIds = [
    doctrineLoadResult.doctrineArtifactId,
    resolverResult.doctrineArtifactId,
    validationKernelResult.doctrineArtifactId,
  ];
  const doctrineHashes = [
    doctrineLoadResult.doctrineHash,
    resolverResult.doctrineHash,
    validationKernelResult.doctrineHash,
  ];
  const mappingIds = [
    resolverResult.mappingId,
    validationKernelResult.mappingId,
  ].filter(Boolean);
  const matterIds = [
    resolverResult.matterId,
    validationKernelResult.matterId,
  ].filter(Boolean);

  if (doctrineArtifactIds.some((value) => !value) || new Set(doctrineArtifactIds).size > 1) {
    return 'Doctrine artifact identity missing or diverged across upstream services.';
  }

  if (doctrineHashes.some((value) => !value) || new Set(doctrineHashes).size > 1) {
    return 'Doctrine hash missing or diverged across upstream services.';
  }

  if (new Set(mappingIds).size > 1) {
    return 'Mapping identity diverged across upstream services.';
  }

  if (new Set(matterIds).size > 1) {
    return 'Matter identity diverged across upstream services.';
  }

  return null;
}

function buildTraceContext(doctrineLoadResult, resolverResult, validationKernelResult) {
  const doctrineArtifactId = validationKernelResult.doctrineArtifactId
    || resolverResult.doctrineArtifactId
    || doctrineLoadResult.doctrineArtifactId
    || null;
  const doctrineHash = validationKernelResult.doctrineHash
    || resolverResult.doctrineHash
    || doctrineLoadResult.doctrineHash
    || null;
  const mappingId = validationKernelResult.mappingId || resolverResult.mappingId || null;
  const matterId = validationKernelResult.matterId || resolverResult.matterId || null;

  if (!doctrineArtifactId || !doctrineHash || !mappingId || !matterId) {
    throw new Error(
      `${SERVICE_NAME} requires doctrineArtifactId, doctrineHash, mappingId, and matterId from doctrine-loader.service, resolver.service, and validation-kernel.service.`,
    );
  }

  return {
    doctrineArtifactId,
    doctrineHash,
    mappingId,
    matterId,
  };
}

async function loadRetainedDoctrineArtifact(context) {
  const doctrineArtifact = await DoctrineArtifact.findOne({ artifactId: context.doctrineArtifactId }).lean().exec();

  if (!doctrineArtifact) {
    return buildTerminalResult({
      failureCode: 'DOCTRINE_ARTIFACT_UNAVAILABLE',
      reason: `Trace service could not load doctrine artifact ${context.doctrineArtifactId}.`,
      extras: context,
    });
  }

  if (doctrineArtifact.hash !== context.doctrineHash) {
    return buildTerminalResult({
      failureCode: 'REPLAY_ARTIFACT_MISMATCH',
      reason: `Trace service loaded doctrine artifact ${context.doctrineArtifactId} with a hash that does not match the validation context.`,
      extras: context,
    });
  }

  if (doctrineArtifact.replay?.isRetained !== true) {
    return buildTerminalResult({
      failureCode: 'DOCTRINE_ARTIFACT_UNAVAILABLE',
      reason: `Doctrine artifact ${context.doctrineArtifactId} is not retained for replay-safe ValidationRun persistence.`,
      extras: context,
    });
  }

  return {
    ok: true,
    terminal: false,
    doctrineArtifact,
  };
}

function buildLoadedManifest(doctrineLoadResult, traceInput = {}) {
  if (traceInput.loadedManifest && typeof traceInput.loadedManifest === 'object') {
    return {
      conceptIds: normalizeStringArray(traceInput.loadedManifest.conceptIds),
      authorityIds: normalizeStringArray(traceInput.loadedManifest.authorityIds),
    };
  }

  return {
    conceptIds: normalizeStringArray(doctrineLoadResult?.manifest?.packageConceptsDeclared),
    authorityIds: normalizeStringArray(doctrineLoadResult?.manifest?.authorityIds),
  };
}

function buildTracePayload(doctrineLoadResult, resolverResult, validationKernelResult, traceInput = {}) {
  const validationRunId = legalValidatorSchemas.isNonEmptyTrimmedString(traceInput.validationRunId)
    ? traceInput.validationRunId
    : null;
  const resolverVersion = legalValidatorSchemas.isNonEmptyTrimmedString(traceInput.resolverVersion)
    ? traceInput.resolverVersion
    : null;
  const inputHash = legalValidatorSchemas.isNonEmptyTrimmedString(traceInput.inputHash)
    ? traceInput.inputHash
    : null;
  const sourceAnchors = canonicalizeStringArray(normalizeStringArray(traceInput.sourceAnchors));
  const interpretationUsed = traceInput.interpretationUsed === true;
  const manualOverrideUsed = traceInput.manualOverrideUsed === true;
  const interpretationRegimeId = legalValidatorSchemas.isNonEmptyTrimmedString(traceInput.interpretationRegimeId)
    ? traceInput.interpretationRegimeId
    : null;
  const normalizedMappingRuleIds = normalizeStringArray(traceInput.mappingRuleIds);
  const mappingRuleIds = normalizedMappingRuleIds.length > 0
    ? canonicalizeStringArray(normalizedMappingRuleIds)
    : canonicalizeStringArray(normalizeStringArray([resolverResult.resolverRuleId]));
  const validationRuleIds = canonicalizeStringArray(normalizeStringArray(validationKernelResult.validationRuleIds));
  const overrideIds = normalizeStringArray(traceInput.overrideIds);
  const loadedManifest = buildLoadedManifest(doctrineLoadResult, traceInput);

  if (!validationRunId) {
    return {
      ok: false,
      reason: 'Trace finalization requires validationRunId.',
    };
  }

  if (!resolverVersion) {
    return {
      ok: false,
      reason: 'Trace finalization requires resolverVersion until a runtime version source exists.',
    };
  }

  if (!inputHash) {
    return {
      ok: false,
      reason: 'Trace finalization requires inputHash for replay-safe ValidationRun persistence.',
    };
  }

  // This wave does not accept synthetic placeholder anchors. Trace must carry explicit source references.
  if (sourceAnchors.length === 0) {
    return {
      ok: false,
      reason: 'Trace finalization requires at least one explicit source anchor.',
    };
  }

  if (normalizedMappingRuleIds.length === 0 && !resolverResult.resolverRuleId) {
    return {
      ok: false,
      reason: 'Trace finalization requires resolverRuleId when no mappingRuleIds are provided.',
    };
  }

  if (mappingRuleIds.length === 0) {
    return {
      ok: false,
      reason: 'Trace finalization requires mappingRuleIds from the resolver path.',
    };
  }

  if (hasDuplicateValues(mappingRuleIds)) {
    return {
      ok: false,
      reason: 'Trace finalization requires unique mappingRuleIds.',
    };
  }

  if (validationRuleIds.length === 0) {
    return {
      ok: false,
      reason: 'Trace finalization requires validationRuleIds from validation-kernel.service.',
    };
  }

  if (hasDuplicateValues(validationRuleIds)) {
    return {
      ok: false,
      reason: 'Trace finalization requires unique validationRuleIds.',
    };
  }

  if (interpretationUsed && !interpretationRegimeId) {
    return {
      ok: false,
      reason: 'Trace finalization requires interpretationRegimeId when interpretationUsed is true.',
    };
  }

  if (manualOverrideUsed && overrideIds.length === 0) {
    return {
      ok: false,
      reason: 'Trace finalization requires overrideIds when manualOverrideUsed is true.',
    };
  }

  const trace = {
    sourceAnchors,
    interpretationUsed,
    interpretationRegimeId,
    manualOverrideUsed,
    mappingRuleIds,
    validationRuleIds,
    loadedManifest,
    overrideIds,
    notes: [],
  };

  if (legalValidatorSchemas.isTraceStructurallyEmpty(trace)) {
    return {
      ok: false,
      reason: 'Trace finalization requires a non-empty deterministic trace.',
    };
  }

  return {
    ok: true,
    validationRunId,
    resolverVersion,
    inputHash,
    trace,
  };
}

async function persistValidationRun(validationRunPayload, context) {
  const validationRun = new ValidationRun(validationRunPayload);

  try {
    await validationRun.save();
  } catch (error) {
    if (error && error.name === 'ValidationError') {
      return buildTerminalResult({
        failureCode: 'TRACE_INCOMPLETE',
        reason: error.message,
        extras: context,
      });
    }

    throw error;
  }

  return {
    ok: true,
    terminal: false,
    validationRun,
  };
}

async function finalize({
  doctrineLoadResult,
  resolverResult,
  validationKernelResult,
  traceInput = {},
} = {}) {
  assertContinueInput('doctrine-loader.service', doctrineLoadResult);
  assertContinueInput('resolver.service', resolverResult);
  assertContinueInput('validation-kernel.service', validationKernelResult);

  const contextMismatch = compareSharedContext(doctrineLoadResult, resolverResult, validationKernelResult);

  if (contextMismatch) {
    return buildTerminalResult({
      failureCode: 'REPLAY_ARTIFACT_MISMATCH',
      reason: contextMismatch,
      extras: buildTraceContext(doctrineLoadResult, resolverResult, validationKernelResult),
    });
  }

  const context = buildTraceContext(doctrineLoadResult, resolverResult, validationKernelResult);

  // v1 limitation:
  // trace persistence only supports valid outcomes.
  // invalid/unresolved trace support will be introduced in a later phase.
  if (validationKernelResult.validationOutcome !== 'valid') {
    return buildTerminalResult({
      failureCode: 'TRACE_INCOMPLETE',
      reason: 'Trace service requires a valid continuation from validation-kernel.service in this wave.',
      extras: context,
    });
  }

  const retainedArtifactResult = await loadRetainedDoctrineArtifact(context);

  if (retainedArtifactResult.terminal) {
    return retainedArtifactResult;
  }

  const tracePayload = buildTracePayload(
    doctrineLoadResult,
    resolverResult,
    validationKernelResult,
    traceInput,
  );

  if (!tracePayload.ok) {
    return buildTerminalResult({
      failureCode: 'TRACE_INCOMPLETE',
      reason: tracePayload.reason,
      extras: context,
    });
  }

  const persistResult = await persistValidationRun({
    validationRunId: tracePayload.validationRunId,
    matterId: context.matterId,
    doctrineArtifactId: context.doctrineArtifactId,
    doctrineHash: context.doctrineHash,
    resolverVersion: tracePayload.resolverVersion,
    inputHash: tracePayload.inputHash,
    result: 'valid',
    failureCodes: [],
    trace: tracePayload.trace,
  }, context);

  if (persistResult.terminal) {
    return persistResult;
  }

  return buildContinueResult({
    context,
    validationRun: persistResult.validationRun,
    persistedTraceSummary: {
      sourceAnchors: tracePayload.trace.sourceAnchors,
      interpretationRegimeId: tracePayload.trace.interpretationRegimeId,
      mappingRuleIds: tracePayload.trace.mappingRuleIds,
      validationRuleIds: tracePayload.trace.validationRuleIds,
      overrideIds: tracePayload.trace.overrideIds,
    },
  });
}

module.exports = {
  SERVICE_NAME,
  OWNED_FAILURE_CODES,
  finalize,
  buildTerminalResult,
  buildContinueResult,
};
