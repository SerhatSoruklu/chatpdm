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
    failureCodes: validationRun.failureCodes,
    persistedTraceSummary,
  };
}

function isContinueInput(value) {
  return Boolean(value && value.ok === true && value.terminal === false);
}

function isTerminalInput(value) {
  return Boolean(
    value
    && value.ok === false
    && value.terminal === true
    && ['invalid', 'unresolved'].includes(value.result),
  );
}

function assertContinueInput(name, value) {
  if (!value || value.ok !== true || value.terminal !== false) {
    throw new Error(`${SERVICE_NAME} requires a continue outcome from ${name}.`);
  }
}

function assertTraceableInput(name, value) {
  if (isContinueInput(value) || isTerminalInput(value)) {
    return;
  }

  throw new Error(`${SERVICE_NAME} requires a continue or terminal outcome from ${name}.`);
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

function compareSharedContext(doctrineLoadResult, resolverResult, validationKernelResult = null) {
  const doctrineArtifactIds = [
    doctrineLoadResult.doctrineArtifactId,
    resolverResult.doctrineArtifactId,
  ];
  const doctrineHashes = [
    doctrineLoadResult.doctrineHash,
    resolverResult.doctrineHash,
  ];

  if (validationKernelResult != null) {
    doctrineArtifactIds.push(validationKernelResult.doctrineArtifactId);
    doctrineHashes.push(validationKernelResult.doctrineHash);
  }

  const mappingIds = [
    resolverResult.mappingId,
    validationKernelResult?.mappingId,
  ].filter(Boolean);
  const matterIds = [
    resolverResult.matterId,
    validationKernelResult?.matterId,
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

function buildTraceContext(doctrineLoadResult, resolverResult, validationKernelResult = null) {
  const doctrineArtifactId = validationKernelResult?.doctrineArtifactId
    || resolverResult.doctrineArtifactId
    || doctrineLoadResult.doctrineArtifactId
    || null;
  const doctrineHash = validationKernelResult?.doctrineHash
    || resolverResult.doctrineHash
    || doctrineLoadResult.doctrineHash
    || null;
  const mappingId = validationKernelResult?.mappingId || resolverResult.mappingId || null;
  const matterId = validationKernelResult?.matterId || resolverResult.matterId || null;

  if (!doctrineArtifactId || !doctrineHash || !matterId) {
    throw new Error(
      `${SERVICE_NAME} requires doctrineArtifactId, doctrineHash, and matterId from doctrine-loader.service, resolver.service, and validation-kernel.service.`,
    );
  }

  return {
    doctrineArtifactId,
    doctrineHash,
    mappingId: mappingId || null,
    matterId,
  };
}

function resolveFinalOutcome({ resolverResult, validationKernelResult = null }) {
  if (isTerminalInput(resolverResult) && validationKernelResult != null) {
    throw new Error(`${SERVICE_NAME} must not receive validation-kernel.service output after a terminal resolver.service result.`);
  }

  if (validationKernelResult != null) {
    assertTraceableInput('validation-kernel.service', validationKernelResult);

    if (isContinueInput(validationKernelResult)) {
      if (validationKernelResult.validationOutcome !== 'valid') {
        throw new Error(`${SERVICE_NAME} supports only validationOutcome=valid on continue results.`);
      }

      return {
        stopStage: 'validation-kernel',
        result: 'valid',
        failureCodes: [],
      };
    }

    return {
      stopStage: 'validation-kernel',
      result: validationKernelResult.result,
      failureCodes: [validationKernelResult.failureCode],
    };
  }

  if (isTerminalInput(resolverResult)) {
    return {
      stopStage: 'resolver',
      result: resolverResult.result,
      failureCodes: [resolverResult.failureCode],
    };
  }

  throw new Error(`${SERVICE_NAME} requires validation-kernel.service once resolver.service continues.`);
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

function buildTracePayload({ doctrineLoadResult, resolverResult, validationKernelResult = null, finalOutcome, traceInput = {} }) {
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
  const normalizedValidationRuleIdsFromTraceInput = normalizeStringArray(traceInput.validationRuleIds);
  const normalizedValidationRuleIdsFromKernel = normalizeStringArray(validationKernelResult?.validationRuleIds);
  const mappingRuleIds = normalizedMappingRuleIds.length > 0
    ? canonicalizeStringArray(normalizedMappingRuleIds)
    : canonicalizeStringArray(normalizeStringArray([resolverResult.resolverRuleId]));
  const validationRuleIds = normalizedValidationRuleIdsFromTraceInput.length > 0
    ? canonicalizeStringArray(normalizedValidationRuleIdsFromTraceInput)
    : canonicalizeStringArray(normalizedValidationRuleIdsFromKernel);
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

  if (normalizedMappingRuleIds.length > 0 && resolverResult.mappingWritten !== true) {
    return {
      ok: false,
      reason: 'Trace finalization must not include mappingRuleIds before resolver.service writes Mapping.',
    };
  }

  if (finalOutcome.stopStage === 'validation-kernel' && normalizedMappingRuleIds.length === 0 && !resolverResult.resolverRuleId) {
    return {
      ok: false,
      reason: 'Trace finalization requires resolverRuleId when no mappingRuleIds are provided.',
    };
  }

  if (finalOutcome.stopStage === 'validation-kernel' && mappingRuleIds.length === 0) {
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

  if (normalizedValidationRuleIdsFromTraceInput.length > 0 && finalOutcome.stopStage !== 'validation-kernel') {
    return {
      ok: false,
      reason: 'Trace finalization must not include validationRuleIds before validation-kernel.service runs.',
    };
  }

  if (
    normalizedValidationRuleIdsFromTraceInput.length > 0
    && finalOutcome.stopStage === 'validation-kernel'
    && normalizedValidationRuleIdsFromKernel.length === 0
  ) {
    return {
      ok: false,
      reason: 'Trace finalization must not include validationRuleIds not produced by validation-kernel.service.',
    };
  }

  if (
    normalizedValidationRuleIdsFromTraceInput.length > 0
    && finalOutcome.stopStage === 'validation-kernel'
    && validationRuleIds.join('\n') !== canonicalizeStringArray(normalizedValidationRuleIdsFromKernel).join('\n')
  ) {
    return {
      ok: false,
      reason: 'Trace finalization must not alter validationRuleIds produced by validation-kernel.service.',
    };
  }

  if (finalOutcome.result === 'valid' && validationRuleIds.length === 0) {
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
  validationKernelResult = null,
  traceInput = {},
} = {}) {
  assertContinueInput('doctrine-loader.service', doctrineLoadResult);
  assertTraceableInput('resolver.service', resolverResult);

  const finalOutcome = resolveFinalOutcome({
    resolverResult,
    validationKernelResult,
  });

  const contextMismatch = compareSharedContext(doctrineLoadResult, resolverResult, validationKernelResult);

  if (contextMismatch) {
    return buildTerminalResult({
      failureCode: 'REPLAY_ARTIFACT_MISMATCH',
      reason: contextMismatch,
      extras: buildTraceContext(doctrineLoadResult, resolverResult, validationKernelResult),
    });
  }

  const context = buildTraceContext(doctrineLoadResult, resolverResult, validationKernelResult);

  const retainedArtifactResult = await loadRetainedDoctrineArtifact(context);

  if (retainedArtifactResult.terminal) {
    return retainedArtifactResult;
  }

  const tracePayload = buildTracePayload({
    doctrineLoadResult,
    resolverResult,
    validationKernelResult,
    finalOutcome,
    traceInput,
  });

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
    result: finalOutcome.result,
    failureCodes: finalOutcome.failureCodes,
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
