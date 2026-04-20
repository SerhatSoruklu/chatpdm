'use strict';

const DoctrineArtifact = require('../doctrine/doctrine-artifact.model');
const ValidationRun = require('./validation-run.model');
const legalValidatorSchemas = require('../shared/legal-validator.schemas');
const ArgumentUnit = require('../arguments/argument-unit.model');
const SourceDocument = require('../sources/source-document.model');
const SourceSegment = require('../sources/source-segment.model');
const segmentationService = require('../sources/segmentation.service');
const extractionService = require('../arguments/extraction.service');
const admissibilityService = require('../arguments/admissibility.service');
const authorityRegistryService = require('../authority/authority-registry.service');
const resolverService = require('../mapping/resolver.service');
const validationKernelService = require('./validation-kernel.service');
const Mapping = require('../mapping/mapping.model');

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

function clonePlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return JSON.parse(JSON.stringify(value));
}

function normalizeReplayStringArray(values) {
  return canonicalizeStringArray(normalizeStringArray(values));
}

function buildReplayContext({
  traceInput = {},
  extractionResult = null,
  authorityLookupResult = null,
  authorityInput = null,
  resolverDecision = null,
  validationDecision = null,
  doctrineLoadResult,
  resolverResult,
}) {
  return {
    sourceDocumentId: extractionResult?.sourceDocumentId || null,
    sourceSegmentIds: normalizeReplayStringArray(extractionResult?.sourceSegmentIds),
    argumentUnitIds: normalizeReplayStringArray(extractionResult?.extractedArgumentUnitIds),
    authorityInput: clonePlainObject(authorityInput || traceInput.authorityInput || null),
    resolverDecision: clonePlainObject(resolverDecision || traceInput.resolverDecision || null),
    validationDecision: clonePlainObject(validationDecision || traceInput.validationDecision || null),
    authorityId: authorityLookupResult?.authorityId || traceInput.authorityId || null,
    authorityCitation: authorityLookupResult?.citation || traceInput.authorityCitation || null,
    mappingId: resolverResult?.mappingId || traceInput.mappingId || null,
    mappingType: resolverResult?.mappingType || traceInput.mappingType || null,
    matchBasis: resolverResult?.matchBasis || traceInput.matchBasis || null,
    conceptId: resolverResult?.conceptId || traceInput.conceptId || null,
    overrideId: resolverResult?.overrideId || traceInput.overrideId || null,
    synonymTerm: resolverResult?.synonymTerm || traceInput.synonymTerm || null,
    manualOverrideReason: resolverResult?.manualOverrideReason || traceInput.manualOverrideReason || null,
    doctrineArtifactId: doctrineLoadResult?.doctrineArtifactId || null,
    doctrineHash: doctrineLoadResult?.doctrineHash || null,
    matterId: resolverResult?.matterId || traceInput.matterId || null,
  };
}

async function loadTraceExtractionContext({
  extractionResult = null,
  resolverResult = null,
  validationKernelResult = null,
} = {}) {
  if (
    extractionResult
    && Array.isArray(extractionResult.sourceSegmentIds)
    && extractionResult.sourceSegmentIds.length > 0
    && Array.isArray(extractionResult.extractedArgumentUnitIds)
    && extractionResult.extractedArgumentUnitIds.length > 0
  ) {
    return extractionResult;
  }

  const argumentUnitId = validationKernelResult?.argumentUnitId
    || resolverResult?.argumentUnitId
    || null;

  if (!argumentUnitId) {
    return {
      sourceDocumentId: null,
      sourceSegmentIds: [],
      extractedArgumentUnitIds: [],
    };
  }

  const argumentUnit = await ArgumentUnit.findOne({ argumentUnitId }).lean().exec();

  if (!argumentUnit) {
    return {
      sourceDocumentId: null,
      sourceSegmentIds: [],
      extractedArgumentUnitIds: [argumentUnitId],
    };
  }

  return {
    sourceDocumentId: null,
    sourceSegmentIds: canonicalizeStringArray(normalizeStringArray(argumentUnit.sourceSegmentIds)),
    extractedArgumentUnitIds: [argumentUnit.argumentUnitId],
  };
}

function hasReplayContextPayload(replayContext) {
  if (!replayContext || typeof replayContext !== 'object' || Array.isArray(replayContext)) {
    return false;
  }

  return Boolean(
    Array.isArray(replayContext.sourceSegmentIds)
    && replayContext.sourceSegmentIds.length > 0
    && Array.isArray(replayContext.argumentUnitIds)
    && replayContext.argumentUnitIds.length > 0
  );
}

function haveSameCanonicalValues(left, right) {
  return canonicalizeStringArray(left).join('\n') === canonicalizeStringArray(right).join('\n');
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

function buildLoadedManifest(doctrineLoadResult) {
  return {
    conceptIds: canonicalizeStringArray(normalizeStringArray(doctrineLoadResult?.manifest?.packageConceptsDeclared)),
    authorityIds: canonicalizeStringArray(normalizeStringArray(doctrineLoadResult?.manifest?.authorityIds)),
  };
}

function buildRecordedSourceAnchors(segmentationResult, extractionResult) {
  if (Array.isArray(extractionResult?.sourceAnchors) && extractionResult.sourceAnchors.length > 0) {
    return canonicalizeStringArray(normalizeStringArray(extractionResult.sourceAnchors));
  }

  if (Array.isArray(segmentationResult?.sourceSegments) && segmentationResult.sourceSegments.length > 0) {
    return canonicalizeStringArray(
      normalizeStringArray(
        segmentationResult.sourceSegments
          .filter((segment) => segment && segment.segmentType === 'paragraph')
          .map((segment) => segment.sourceAnchor),
      ),
    );
  }

  return canonicalizeStringArray(normalizeStringArray(segmentationResult?.sourceAnchors));
}

function buildTracePayload({
  doctrineLoadResult,
  resolverResult,
  validationKernelResult = null,
  authorityLookupResult = null,
  extractionResult = null,
  authorityInput = null,
  resolverDecision = null,
  validationDecision = null,
  finalOutcome,
  traceInput = {},
}) {
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
  const requestedInterpretationRegimeId = legalValidatorSchemas.isNonEmptyTrimmedString(traceInput.interpretationRegimeId)
    ? traceInput.interpretationRegimeId
    : null;
  const normalizedMappingRuleIds = normalizeStringArray(traceInput.mappingRuleIds);
  const normalizedValidationRuleIdsFromTraceInput = normalizeStringArray(traceInput.validationRuleIds);
  const normalizedValidationRuleIdsFromKernel = canonicalizeStringArray(normalizeStringArray(validationKernelResult?.validationRuleIds));
  const resolverDerivedMappingRuleIds = resolverResult.mappingWritten === true
    ? canonicalizeStringArray(normalizeStringArray([resolverResult.resolverRuleId]))
    : [];
  const doctrineInterpretationRegimeId = doctrineLoadResult?.manifest?.interpretationRegime?.regimeId
    || doctrineLoadResult?.interpretationRegime?.regimeId
    || null;
  const overrideIdsFromTraceInput = normalizeStringArray(traceInput.overrideIds);
  const overrideIdsFromResolver = legalValidatorSchemas.isNonEmptyTrimmedString(resolverResult.overrideId)
    ? [resolverResult.overrideId]
    : [];
  const overrideIds = overrideIdsFromResolver.length > 0
    ? canonicalizeStringArray(overrideIdsFromResolver)
    : canonicalizeStringArray(overrideIdsFromTraceInput);
  const loadedManifest = buildLoadedManifest(doctrineLoadResult);
  const providedLoadedManifest = traceInput.loadedManifest && typeof traceInput.loadedManifest === 'object'
    ? {
      conceptIds: canonicalizeStringArray(normalizeStringArray(traceInput.loadedManifest.conceptIds)),
      authorityIds: canonicalizeStringArray(normalizeStringArray(traceInput.loadedManifest.authorityIds)),
    }
    : null;
  let interpretationRegimeId = null;
  let mappingRuleIds = [];
  let validationRuleIds = [];

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

  if (providedLoadedManifest) {
    if (
      !haveSameCanonicalValues(providedLoadedManifest.conceptIds, loadedManifest.conceptIds)
      || !haveSameCanonicalValues(providedLoadedManifest.authorityIds, loadedManifest.authorityIds)
    ) {
      return {
        ok: false,
        reason: 'Trace finalization must not alter loadedManifest derived from doctrine-loader.service.',
      };
    }
  }

  if (resolverResult.mappingWritten !== true && normalizedMappingRuleIds.length > 0) {
    return {
      ok: false,
      reason: 'Trace finalization must not include mappingRuleIds before resolver.service writes Mapping.',
    };
  }

  if (resolverResult.mappingWritten === true) {
    if (resolverDerivedMappingRuleIds.length === 0) {
      return {
        ok: false,
        reason: 'Trace finalization requires resolverRuleId when resolver.service wrote Mapping.',
      };
    }

    if (
      normalizedMappingRuleIds.length > 0
      && !haveSameCanonicalValues(normalizedMappingRuleIds, resolverDerivedMappingRuleIds)
    ) {
      return {
        ok: false,
        reason: 'Trace finalization must not alter mappingRuleIds produced by resolver.service.',
      };
    }

    mappingRuleIds = resolverDerivedMappingRuleIds;
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

  if (finalOutcome.stopStage === 'validation-kernel') {
    if (
      normalizedValidationRuleIdsFromTraceInput.length > 0
      && !haveSameCanonicalValues(normalizedValidationRuleIdsFromTraceInput, normalizedValidationRuleIdsFromKernel)
    ) {
      return {
        ok: false,
        reason: 'Trace finalization must not alter validationRuleIds produced by validation-kernel.service.',
      };
    }

    validationRuleIds = normalizedValidationRuleIdsFromKernel;
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

  if (!interpretationUsed && requestedInterpretationRegimeId) {
    return {
      ok: false,
      reason: 'Trace finalization must not include interpretationRegimeId when interpretationUsed is false.',
    };
  }

  if (interpretationUsed) {
    if (!doctrineInterpretationRegimeId) {
      return {
        ok: false,
        reason: 'Trace finalization requires doctrine-derived interpretationRegimeId when interpretationUsed is true.',
      };
    }

    if (requestedInterpretationRegimeId && requestedInterpretationRegimeId !== doctrineInterpretationRegimeId) {
      return {
        ok: false,
        reason: 'Trace finalization must not alter interpretationRegimeId derived from doctrine-loader.service.',
      };
    }

    interpretationRegimeId = doctrineInterpretationRegimeId;
  }

  if (manualOverrideUsed && overrideIds.length === 0) {
    return {
      ok: false,
      reason: 'Trace finalization requires overrideIds when manualOverrideUsed is true.',
    };
  }

  if (
    overrideIdsFromTraceInput.length > 0
    && overrideIdsFromResolver.length > 0
    && !haveSameCanonicalValues(overrideIdsFromTraceInput, overrideIdsFromResolver)
  ) {
    return {
      ok: false,
      reason: 'Trace finalization must not alter overrideIds produced by resolver.service.',
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
    replayContext: buildReplayContext({
      traceInput,
      extractionResult,
      authorityLookupResult,
      authorityInput,
      resolverDecision,
      validationDecision,
      doctrineLoadResult,
      resolverResult,
    }),
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

function buildReplayExecutionSignature({
  validationRun,
  doctrineLoadResult,
  segmentationResult,
  extractionResult,
  authorityLookupResult = null,
  resolverResult = null,
  validationKernelResult = null,
}) {
  const manifest = doctrineLoadResult?.manifest || {};
  const replayContext = validationRun.trace?.replayContext || {};

  return {
    result: validationKernelResult
      ? (validationKernelResult.ok === true
        ? validationKernelResult.validationOutcome || validationKernelResult.result || validationRun.result
        : validationKernelResult.result)
      : resolverResult
        ? resolverResult.result
        : authorityLookupResult
          ? authorityLookupResult.result
          : validationRun.result,
    failureCodes: validationKernelResult
      ? validationKernelResult.ok === true
        ? []
        : [validationKernelResult.failureCode]
      : resolverResult
        ? [resolverResult.failureCode]
        : authorityLookupResult
          ? [authorityLookupResult.failureCode]
          : [...validationRun.failureCodes],
    sourceAnchors: buildRecordedSourceAnchors(segmentationResult, extractionResult),
    interpretationUsed: validationRun.trace?.interpretationUsed === true,
    interpretationRegimeId: doctrineLoadResult?.manifest?.interpretationRegime?.regimeId
      || doctrineLoadResult?.interpretationRegime?.regimeId
      || null,
    manualOverrideUsed: validationRun.trace?.manualOverrideUsed === true,
    mappingRuleIds: resolverResult?.ok === true
      ? canonicalizeStringArray(normalizeStringArray([resolverResult.resolverRuleId]))
      : [],
    validationRuleIds: validationKernelResult?.ok === true
      ? canonicalizeStringArray(normalizeStringArray(validationKernelResult.validationRuleIds))
      : [],
    loadedManifest: {
      conceptIds: canonicalizeStringArray(normalizeStringArray(manifest.packageConceptsDeclared)),
      authorityIds: canonicalizeStringArray(normalizeStringArray(manifest.authorityIds)),
    },
    overrideIds: resolverResult?.ok === true && legalValidatorSchemas.isNonEmptyTrimmedString(resolverResult.overrideId)
      ? [resolverResult.overrideId]
      : normalizeStringArray(validationRun.trace?.overrideIds),
    replayContext: {
      sourceDocumentId: extractionResult?.sourceDocumentId || replayContext.sourceDocumentId || null,
      sourceSegmentIds: canonicalizeStringArray(normalizeStringArray(extractionResult?.sourceSegmentIds)),
      argumentUnitIds: canonicalizeStringArray(normalizeStringArray(extractionResult?.extractedArgumentUnitIds)),
      authorityId: authorityLookupResult?.ok === true ? authorityLookupResult.authorityId : replayContext.authorityId || null,
      mappingId: resolverResult?.ok === true ? resolverResult.mappingId : replayContext.mappingId || null,
    },
    doctrineArtifactId: doctrineLoadResult?.doctrineArtifactId || null,
    doctrineHash: doctrineLoadResult?.doctrineHash || null,
    resolverVersion: validationRun.resolverVersion,
    inputHash: validationRun.inputHash,
    matterId: validationRun.matterId,
  };
}

function compareReplayExecution(expectedValidationRun, actualSignature) {
  const mismatches = [];
  const expectedTrace = expectedValidationRun.trace || {};
  const expectedReplayContext = expectedTrace.replayContext || {};

  if (expectedValidationRun.result !== actualSignature.result) {
    mismatches.push('result');
  }

  if (!haveSameCanonicalValues(expectedValidationRun.failureCodes || [], actualSignature.failureCodes || [])) {
    mismatches.push('failureCodes');
  }

  if (!haveSameCanonicalValues(expectedTrace.sourceAnchors || [], actualSignature.sourceAnchors || [])) {
    mismatches.push('sourceAnchors');
  }

  if ((expectedTrace.interpretationUsed === true) !== (actualSignature.interpretationUsed === true)) {
    mismatches.push('interpretationUsed');
  }

  if ((expectedTrace.manualOverrideUsed === true) !== (actualSignature.manualOverrideUsed === true)) {
    mismatches.push('manualOverrideUsed');
  }

  if (!haveSameCanonicalValues(expectedTrace.mappingRuleIds || [], actualSignature.mappingRuleIds || [])) {
    mismatches.push('mappingRuleIds');
  }

  if (!haveSameCanonicalValues(expectedTrace.validationRuleIds || [], actualSignature.validationRuleIds || [])) {
    mismatches.push('validationRuleIds');
  }

  if (!haveSameCanonicalValues(expectedTrace.overrideIds || [], actualSignature.overrideIds || [])) {
    mismatches.push('overrideIds');
  }

  if (!haveSameCanonicalValues(expectedTrace.loadedManifest?.conceptIds || [], actualSignature.loadedManifest?.conceptIds || [])) {
    mismatches.push('loadedManifest.conceptIds');
  }

  if (!haveSameCanonicalValues(expectedTrace.loadedManifest?.authorityIds || [], actualSignature.loadedManifest?.authorityIds || [])) {
    mismatches.push('loadedManifest.authorityIds');
  }

  if (expectedTrace.interpretationRegimeId !== actualSignature.interpretationRegimeId) {
    mismatches.push('interpretationRegimeId');
  }

  if (
    legalValidatorSchemas.isNonEmptyTrimmedString(expectedReplayContext.sourceDocumentId)
    && expectedReplayContext.sourceDocumentId !== actualSignature.replayContext.sourceDocumentId
  ) {
    mismatches.push('replayContext.sourceDocumentId');
  }

  if (!haveSameCanonicalValues(expectedReplayContext.sourceSegmentIds || [], actualSignature.replayContext.sourceSegmentIds || [])) {
    mismatches.push('replayContext.sourceSegmentIds');
  }

  if (!haveSameCanonicalValues(expectedReplayContext.argumentUnitIds || [], actualSignature.replayContext.argumentUnitIds || [])) {
    mismatches.push('replayContext.argumentUnitIds');
  }

  if (
    legalValidatorSchemas.isNonEmptyTrimmedString(expectedReplayContext.authorityId)
    && (expectedReplayContext.authorityId || null) !== (actualSignature.replayContext.authorityId || null)
  ) {
    mismatches.push('replayContext.authorityId');
  }

  if (
    legalValidatorSchemas.isNonEmptyTrimmedString(expectedReplayContext.mappingId)
    && (expectedReplayContext.mappingId || null) !== (actualSignature.replayContext.mappingId || null)
  ) {
    mismatches.push('replayContext.mappingId');
  }

  if ((expectedValidationRun.doctrineArtifactId || null) !== (actualSignature.doctrineArtifactId || null)) {
    mismatches.push('doctrineArtifactId');
  }

  if ((expectedValidationRun.doctrineHash || null) !== (actualSignature.doctrineHash || null)) {
    mismatches.push('doctrineHash');
  }

  if ((expectedValidationRun.resolverVersion || null) !== (actualSignature.resolverVersion || null)) {
    mismatches.push('resolverVersion');
  }

  if ((expectedValidationRun.inputHash || null) !== (actualSignature.inputHash || null)) {
    mismatches.push('inputHash');
  }

  if ((expectedValidationRun.matterId || null) !== (actualSignature.matterId || null)) {
    mismatches.push('matterId');
  }

  return {
    ok: mismatches.length === 0,
    mismatches,
  };
}

async function replayValidationRun({ validationRunId = null } = {}) {
  if (!legalValidatorSchemas.isNonEmptyTrimmedString(validationRunId)) {
    return buildTerminalResult({
      failureCode: 'TRACE_INCOMPLETE',
      reason: 'Replay requires validationRunId.',
      extras: {
        validationRunId: null,
      },
    });
  }

  const validationRun = await ValidationRun.findOne({ validationRunId }).lean().exec();

  if (!validationRun) {
    return buildTerminalResult({
      failureCode: 'TRACE_INCOMPLETE',
      reason: `ValidationRun ${validationRunId} could not be loaded for replay.`,
      extras: {
        validationRunId,
      },
    });
  }

  const replayContext = validationRun.trace?.replayContext;

  if (!hasReplayContextPayload(replayContext)) {
    return buildTerminalResult({
      failureCode: 'TRACE_INCOMPLETE',
      reason: `ValidationRun ${validationRunId} does not carry replay context sufficient for deterministic re-execution.`,
      extras: {
        validationRunId,
      },
    });
  }

  let sourceDocument = null;
  let sourceSegments = [];

  if (legalValidatorSchemas.isNonEmptyTrimmedString(replayContext.sourceDocumentId)) {
    sourceDocument = await SourceDocument.findOne({ sourceDocumentId: replayContext.sourceDocumentId }).lean().exec();

    if (!sourceDocument) {
      return buildTerminalResult({
        failureCode: 'TRACE_INCOMPLETE',
        reason: `ValidationRun ${validationRunId} could not load SourceDocument ${replayContext.sourceDocumentId}.`,
        extras: {
          validationRunId,
        },
      });
    }

    sourceSegments = await SourceSegment.find({
      sourceDocumentId: replayContext.sourceDocumentId,
    })
      .sort({ sequence: 1 })
      .lean()
      .exec();
  } else {
    const recordedSourceSegments = await SourceSegment.find({
      sourceAnchor: { $in: validationRun.trace.sourceAnchors || [] },
    })
      .sort({ sequence: 1 })
      .lean()
      .exec();

    if (recordedSourceSegments.length === 0) {
      return buildTerminalResult({
        failureCode: 'TRACE_INCOMPLETE',
        reason: `ValidationRun ${validationRunId} could not reconstruct the recorded source segments.`,
        extras: {
          validationRunId,
        },
      });
    }

    sourceDocument = await SourceDocument.findOne({
      sourceDocumentId: recordedSourceSegments[0].sourceDocumentId,
    }).lean().exec();

    if (!sourceDocument) {
      return buildTerminalResult({
        failureCode: 'TRACE_INCOMPLETE',
        reason: `ValidationRun ${validationRunId} could not load SourceDocument ${recordedSourceSegments[0].sourceDocumentId}.`,
        extras: {
          validationRunId,
        },
      });
    }

    sourceSegments = await SourceSegment.find({
      sourceDocumentId: sourceDocument.sourceDocumentId,
    })
      .sort({ sequence: 1 })
      .lean()
      .exec();
  }

  if (sourceSegments.length === 0) {
    return buildTerminalResult({
      failureCode: 'TRACE_INCOMPLETE',
      reason: `ValidationRun ${validationRunId} could not reconstruct SourceSegment records for replay.`,
      extras: {
        validationRunId,
      },
    });
  }

  if (!haveSameCanonicalValues(buildRecordedSourceAnchors({ sourceSegments }, null), validationRun.trace.sourceAnchors || [])) {
    return buildTerminalResult({
      failureCode: 'REPLAY_ARTIFACT_MISMATCH',
      reason: `ValidationRun ${validationRunId} source segments no longer match the recorded source anchors.`,
      extras: {
        validationRunId,
      },
    });
  }

  const segmentationReplay = await segmentationService.segmentSourceDocument({
    sourceDocument,
    persist: false,
  });

  if (!segmentationReplay.ok) {
    return buildTerminalResult({
      failureCode: 'REPLAY_ARTIFACT_MISMATCH',
      reason: segmentationReplay.reason,
      extras: {
        validationRunId,
      },
    });
  }

  if (!haveSameCanonicalValues(buildRecordedSourceAnchors(segmentationReplay, null), validationRun.trace.sourceAnchors || [])) {
    return buildTerminalResult({
      failureCode: 'REPLAY_ARTIFACT_MISMATCH',
      reason: `ValidationRun ${validationRunId} replayed segmentation diverged from the recorded source anchors.`,
      extras: {
        validationRunId,
      },
    });
  }

  const extractionReplay = await extractionService.extractArgumentUnitsFromSourceDocument({
    sourceDocument,
    sourceSegments,
    persist: false,
  });

  if (!extractionReplay.ok) {
    return buildTerminalResult({
      failureCode: 'REPLAY_ARTIFACT_MISMATCH',
      reason: extractionReplay.reason,
      extras: {
        validationRunId,
      },
    });
  }

  if (!haveSameCanonicalValues(extractionReplay.sourceSegmentIds || [], replayContext.sourceSegmentIds || [])) {
    return buildTerminalResult({
      failureCode: 'REPLAY_ARTIFACT_MISMATCH',
      reason: `ValidationRun ${validationRunId} replayed extraction diverged from the recorded source segment lineage.`,
      extras: {
        validationRunId,
      },
    });
  }

  const doctrineLoadResult = {
    ok: true,
    terminal: false,
    service: 'doctrine-loader.service',
    doctrineArtifactId: validationRun.doctrineArtifactId,
    doctrineHash: validationRun.doctrineHash,
    packageId: null,
    version: null,
    manifest: null,
    interpretationRegime: null,
    runtimeEligible: true,
  };

  const retainedArtifactResult = await loadRetainedDoctrineArtifact({
    doctrineArtifactId: validationRun.doctrineArtifactId,
    doctrineHash: validationRun.doctrineHash,
    matterId: validationRun.matterId,
    mappingId: replayContext.mappingId || null,
  });

  if (retainedArtifactResult.terminal) {
    return retainedArtifactResult;
  }

  doctrineLoadResult.packageId = retainedArtifactResult.doctrineArtifact.packageId;
  doctrineLoadResult.version = retainedArtifactResult.doctrineArtifact.version;
  doctrineLoadResult.manifest = retainedArtifactResult.doctrineArtifact.manifest;
  doctrineLoadResult.interpretationRegime = retainedArtifactResult.doctrineArtifact.manifest.interpretationRegime;

  const admissibilityReplay = await admissibilityService.evaluateArgumentUnits({
    argumentUnits: extractionReplay.extractedArgumentUnits,
  });

  if (!admissibilityReplay.ok) {
    return buildTerminalResult({
      failureCode: 'REPLAY_ARTIFACT_MISMATCH',
      reason: `ValidationRun ${validationRunId} replayed admissibility diverged from the recorded run.`,
      extras: {
        validationRunId,
      },
    });
  }

  const authorityInput = replayContext.authorityInput || (
    replayContext.authorityId
      ? {
          authorityId: replayContext.authorityId,
          citation: replayContext.authorityCitation || null,
          evaluationDate: null,
          expectedJurisdiction: null,
          expectedSourceClass: null,
          expectedInstitution: null,
          requiredInterpretationRegimeId: doctrineLoadResult.interpretationRegime?.regimeId || null,
        }
      : null
  );

  const authorityLookupReplay = await authorityRegistryService.resolveAuthority({
    doctrineLoadResult,
    admissibilityResult: admissibilityReplay,
    authorityInput,
  });

  if (authorityLookupReplay.terminal) {
    const actualSignature = buildReplayExecutionSignature({
      validationRun,
      doctrineLoadResult,
      segmentationResult: segmentationReplay,
      extractionResult: extractionReplay,
      authorityLookupResult: authorityLookupReplay,
      resolverResult: null,
      validationKernelResult: null,
    });

    const comparison = compareReplayExecution(validationRun, actualSignature);

    if (!comparison.ok) {
      return buildTerminalResult({
        failureCode: 'REPLAY_ARTIFACT_MISMATCH',
        reason: `ValidationRun ${validationRunId} replay diverged on ${comparison.mismatches.join(', ')}.`,
        extras: {
          validationRunId,
          replayComparison: comparison,
        },
      });
    }

    return {
      ok: true,
      terminal: false,
      service: SERVICE_NAME,
      validationRunId,
      originalValidationRun: validationRun,
      replayedResult: actualSignature.result,
      replayedFailureCodes: actualSignature.failureCodes,
      replayComparison: comparison,
      replayedTraceSummary: {
        sourceAnchors: actualSignature.sourceAnchors,
        interpretationRegimeId: actualSignature.interpretationRegimeId,
        mappingRuleIds: actualSignature.mappingRuleIds,
        validationRuleIds: actualSignature.validationRuleIds,
        overrideIds: actualSignature.overrideIds,
      },
    };
  }

  let replayResolverDecision = replayContext.resolverDecision || null;

  if (!replayResolverDecision && legalValidatorSchemas.isNonEmptyTrimmedString(replayContext.mappingId)) {
    const persistedMapping = await Mapping.findOne({ mappingId: replayContext.mappingId }).lean().exec();

    if (!persistedMapping) {
      return buildTerminalResult({
        failureCode: 'TRACE_INCOMPLETE',
        reason: `ValidationRun ${validationRunId} could not load Mapping ${replayContext.mappingId} for replay.`,
        extras: {
          validationRunId,
        },
      });
    }

    replayResolverDecision = {
      status: 'success',
      mappingId: persistedMapping.mappingId,
      mappingType: persistedMapping.mappingType,
      matchBasis: persistedMapping.matchBasis,
      conceptId: persistedMapping.conceptId,
      authorityId: persistedMapping.authorityId,
      resolverRuleId: persistedMapping.resolverRuleId,
      overrideId: persistedMapping.overrideId,
      synonymTerm: persistedMapping.synonymTerm,
      manualOverrideReason: persistedMapping.manualOverrideReason,
    };
  }

  const resolverPreview = await resolverService.resolve({
    doctrineLoadResult,
    admissibilityResult: admissibilityReplay,
    authorityLookupResult: authorityLookupReplay,
    resolverDecision: replayResolverDecision,
    persist: false,
  });

  if (resolverPreview.terminal) {
    const actualSignature = buildReplayExecutionSignature({
      validationRun,
      doctrineLoadResult,
      segmentationResult: segmentationReplay,
      extractionResult: extractionReplay,
      authorityLookupResult: authorityLookupReplay,
      resolverResult: resolverPreview,
      validationKernelResult: null,
    });

    const comparison = compareReplayExecution(validationRun, actualSignature);

    if (!comparison.ok) {
      return buildTerminalResult({
        failureCode: 'REPLAY_ARTIFACT_MISMATCH',
        reason: `ValidationRun ${validationRunId} replay diverged on ${comparison.mismatches.join(', ')}.`,
        extras: {
          validationRunId,
          replayComparison: comparison,
        },
      });
    }

    return {
      ok: true,
      terminal: false,
      service: SERVICE_NAME,
      validationRunId,
      originalValidationRun: validationRun,
      replayedResult: actualSignature.result,
      replayedFailureCodes: actualSignature.failureCodes,
      replayComparison: comparison,
      replayedTraceSummary: {
        sourceAnchors: actualSignature.sourceAnchors,
        interpretationRegimeId: actualSignature.interpretationRegimeId,
        mappingRuleIds: actualSignature.mappingRuleIds,
        validationRuleIds: actualSignature.validationRuleIds,
        overrideIds: actualSignature.overrideIds,
      },
    };
  }

  const resolverResultForKernel = {
    ...resolverPreview,
    mappingWritten: true,
  };

  const validationKernelReplay = await validationKernelService.evaluate({
    doctrineLoadResult,
    resolverResult: resolverResultForKernel,
    authorityLookupResult: authorityLookupReplay,
    validationDecision: replayContext.validationDecision || null,
  });

  const actualSignature = buildReplayExecutionSignature({
    validationRun,
    doctrineLoadResult,
    segmentationResult: segmentationReplay,
    extractionResult: extractionReplay,
    authorityLookupResult: authorityLookupReplay,
    resolverResult: resolverPreview,
    validationKernelResult: validationKernelReplay,
  });

  const comparison = compareReplayExecution(validationRun, actualSignature);

  if (!comparison.ok) {
    return buildTerminalResult({
      failureCode: 'REPLAY_ARTIFACT_MISMATCH',
      reason: `ValidationRun ${validationRunId} replay diverged on ${comparison.mismatches.join(', ')}.`,
      extras: {
        validationRunId,
        replayComparison: comparison,
      },
    });
  }

  return {
    ok: true,
    terminal: false,
    service: SERVICE_NAME,
    validationRunId,
    originalValidationRun: validationRun,
    replayedResult: actualSignature.result,
    replayedFailureCodes: actualSignature.failureCodes,
    replayComparison: comparison,
    replayedTraceSummary: {
      sourceAnchors: actualSignature.sourceAnchors,
      interpretationRegimeId: actualSignature.interpretationRegimeId,
      mappingRuleIds: actualSignature.mappingRuleIds,
      validationRuleIds: actualSignature.validationRuleIds,
      overrideIds: actualSignature.overrideIds,
    },
  };
}

async function finalize({
  doctrineLoadResult,
  resolverResult,
  validationKernelResult = null,
  authorityLookupResult = null,
  extractionResult = null,
  authorityInput = null,
  resolverDecision = null,
  validationDecision = null,
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
  const replayExtractionContext = await loadTraceExtractionContext({
    extractionResult,
    resolverResult,
    validationKernelResult,
  });

  const retainedArtifactResult = await loadRetainedDoctrineArtifact(context);

  if (retainedArtifactResult.terminal) {
    return retainedArtifactResult;
  }

  const tracePayload = buildTracePayload({
    doctrineLoadResult,
    resolverResult,
    validationKernelResult,
    authorityLookupResult,
    extractionResult: replayExtractionContext,
    authorityInput,
    resolverDecision,
    validationDecision,
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
  replayValidationRun,
  buildTerminalResult,
  buildContinueResult,
};
