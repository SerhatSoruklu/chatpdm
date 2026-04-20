'use strict';

const Mapping = require('../mapping/mapping.model');

const SERVICE_NAME = 'validation-kernel.service';
const OWNED_FAILURE_CODES = new Set([
  'SOURCE_OVERRIDE_ATTEMPT',
  'INSUFFICIENT_DOCTRINE',
  'VALIDITY_EFFICACY_CONFUSION',
  'FACTUAL_LINKAGE_MISSING',
  'UNAUTHORIZED_DECISION_PATH',
]);
const PROPAGATABLE_FAILURE_CODES = new Set([
  'AUTHORITY_SCOPE_VIOLATION',
]);

const TERMINAL_RESULTS_BY_FAILURE_CODE = Object.freeze({
  AUTHORITY_SCOPE_VIOLATION: 'invalid',
  SOURCE_OVERRIDE_ATTEMPT: 'invalid',
  INSUFFICIENT_DOCTRINE: 'unresolved',
  VALIDITY_EFFICACY_CONFUSION: 'invalid',
  FACTUAL_LINKAGE_MISSING: 'unresolved',
  UNAUTHORIZED_DECISION_PATH: 'invalid',
});

const DECISION_STATUS_TO_FAILURE_CODE = Object.freeze({
  authority_scope_violation: 'AUTHORITY_SCOPE_VIOLATION',
  doctrine_gap: 'INSUFFICIENT_DOCTRINE',
  source_override: 'SOURCE_OVERRIDE_ATTEMPT',
  factual_linkage_missing: 'FACTUAL_LINKAGE_MISSING',
  validity_efficacy_confusion: 'VALIDITY_EFFICACY_CONFUSION',
  unauthorized_decision_path: 'UNAUTHORIZED_DECISION_PATH',
});
const ALLOWED_DECISION_STATUSES = new Set([
  'valid',
  'authority_scope_violation',
  'doctrine_gap',
  'source_override',
  'factual_linkage_missing',
  'validity_efficacy_confusion',
  'unauthorized_decision_path',
]);

function isAllowedFailureCode(failureCode) {
  return OWNED_FAILURE_CODES.has(failureCode) || PROPAGATABLE_FAILURE_CODES.has(failureCode);
}

function buildKernelContext({
  argumentUnitId,
  matterId,
  documentId,
  doctrineArtifactId,
  doctrineHash,
  mappingId,
}) {
  return {
    argumentUnitId,
    matterId,
    documentId,
    doctrineArtifactId,
    doctrineHash,
    mappingId,
    validationWritten: false,
  };
}

function buildTerminalResult({ failureCode, reason, result = null, extras = {} }) {
  if (!isAllowedFailureCode(failureCode)) {
    throw new Error(`${SERVICE_NAME} cannot emit unowned failure code ${failureCode}.`);
  }

  const normalizedResult = result || TERMINAL_RESULTS_BY_FAILURE_CODE[failureCode];

  if (!['invalid', 'unresolved'].includes(normalizedResult)) {
    throw new Error(`${SERVICE_NAME} terminal results are limited to invalid or unresolved in this wave.`);
  }

  return {
    ok: false,
    terminal: true,
    result: normalizedResult,
    failureCode,
    reason,
    service: SERVICE_NAME,
    ...extras,
  };
}

function buildContinueResult({ context, validationRuleIds = [] }) {
  return {
    ok: true,
    terminal: false,
    service: SERVICE_NAME,
    ...context,
    validationOutcome: 'valid',
    validationRuleIds,
    validationWritten: false,
  };
}

function assertContinueInput(name, value) {
  if (!value || value.ok !== true || value.terminal !== false) {
    throw new Error(`${SERVICE_NAME} requires a continue outcome from ${name}.`);
  }
}

function getResolverContext(resolverResult, doctrineLoadResult) {
  const argumentUnitId = resolverResult.argumentUnitId || null;
  const matterId = resolverResult.matterId || null;
  const documentId = resolverResult.documentId || null;
  const doctrineArtifactId = resolverResult.doctrineArtifactId || doctrineLoadResult.doctrineArtifactId || null;
  const doctrineHash = resolverResult.doctrineHash || doctrineLoadResult.doctrineHash || null;
  const mappingId = resolverResult.mappingId || null;

  if (!argumentUnitId || !matterId || !documentId || !doctrineArtifactId || !doctrineHash) {
    throw new Error(
      `${SERVICE_NAME} requires argumentUnitId, matterId, documentId, doctrineArtifactId, and doctrineHash from resolver.service and doctrine-loader.service.`,
    );
  }

  return {
    argumentUnitId,
    matterId,
    documentId,
    doctrineArtifactId,
    doctrineHash,
    mappingId,
  };
}

function normalizeValidationDecision({ validationDecision = null, explicitStop = null } = {}) {
  const decision = validationDecision && typeof validationDecision === 'object'
    ? validationDecision
    : explicitStop && typeof explicitStop === 'object'
      ? explicitStop
      : null;

  if (!decision) {
    return null;
  }

  if (decision.status && !ALLOWED_DECISION_STATUSES.has(decision.status)) {
    throw new Error(`${SERVICE_NAME} received unsupported decision.status=${decision.status}.`);
  }

  return decision;
}

function loadDoctrineValidationRuleIds(doctrineLoadResult, context) {
  const validationRuleIds = doctrineLoadResult?.manifest?.validationRuleIds;

  if (!Array.isArray(validationRuleIds)) {
    return buildTerminalResult({
      failureCode: 'INSUFFICIENT_DOCTRINE',
      reason: `Doctrine artifact ${context.doctrineArtifactId} does not declare validationRuleIds required for runtime-owned validation.`,
      extras: context,
    });
  }

  const normalizedValidationRuleIds = normalizeValidationRuleIds(validationRuleIds);

  if (normalizedValidationRuleIds.length === 0) {
    return buildTerminalResult({
      failureCode: 'INSUFFICIENT_DOCTRINE',
      reason: `Doctrine artifact ${context.doctrineArtifactId} does not declare any runtime validationRuleIds.`,
      extras: context,
    });
  }

  if (normalizedValidationRuleIds.length !== validationRuleIds.length || hasDuplicateValidationRuleIds(normalizedValidationRuleIds)) {
    return buildTerminalResult({
      failureCode: 'UNAUTHORIZED_DECISION_PATH',
      reason: `Doctrine artifact ${context.doctrineArtifactId} declares malformed validationRuleIds and cannot support runtime-owned validation.`,
      extras: context,
    });
  }

  return {
    ok: true,
    terminal: false,
    service: SERVICE_NAME,
    validationRuleIds: normalizedValidationRuleIds,
  };
}

function normalizeTerminalDecision(decision, context) {
  const failureCode = decision.failureCode || DECISION_STATUS_TO_FAILURE_CODE[decision.status];

  if (!failureCode) {
    throw new Error(`${SERVICE_NAME} requires an explicit failureCode or supported terminal status.`);
  }

  if (failureCode === 'AUTHORITY_SCOPE_VIOLATION' && decision.fromAuthorityLayer !== true) {
    throw new Error(`${SERVICE_NAME} cannot originate AUTHORITY_SCOPE_VIOLATION.`);
  }

  return buildTerminalResult({
    failureCode,
    reason: decision.reason || `Validation kernel stopped with ${failureCode}.`,
    extras: {
      ...context,
      validationWritten: false,
    },
  });
}

async function loadResolverMapping(resolverResult, context) {
  if (resolverResult.mappingWritten !== true || !context.mappingId) {
    return buildTerminalResult({
      failureCode: 'UNAUTHORIZED_DECISION_PATH',
      reason: 'Validation kernel cannot continue without a resolver-written mapping.',
      extras: context,
    });
  }

  const mapping = await Mapping.findOne({ mappingId: context.mappingId }).lean().exec();

  if (!mapping) {
    return buildTerminalResult({
      failureCode: 'UNAUTHORIZED_DECISION_PATH',
      reason: `Validation kernel could not load Mapping ${context.mappingId}.`,
      extras: context,
    });
  }

  if (
    mapping.status !== 'success'
    || mapping.argumentUnitId !== context.argumentUnitId
    || mapping.matterId !== context.matterId
    || mapping.doctrineArtifactId !== context.doctrineArtifactId
  ) {
    return buildTerminalResult({
      failureCode: 'UNAUTHORIZED_DECISION_PATH',
      reason: `Validation kernel received an invalid resolver mapping for mappingId=${context.mappingId}.`,
      extras: context,
    });
  }

  if (!mapping.matchBasis || !mapping.mappingType) {
    return buildTerminalResult({
      failureCode: 'UNAUTHORIZED_DECISION_PATH',
      reason: `Validation kernel received a mapping missing deterministic fields for mappingId=${context.mappingId}.`,
      extras: context,
    });
  }

  return {
    ok: true,
    terminal: false,
    service: SERVICE_NAME,
    mapping,
  };
}

function normalizeValidationRuleIds(validationRuleIds) {
  if (!Array.isArray(validationRuleIds)) {
    return [];
  }

  return validationRuleIds.filter((ruleId) => typeof ruleId === 'string' && ruleId.trim().length > 0);
}

function hasDuplicateValidationRuleIds(validationRuleIds) {
  return new Set(validationRuleIds).size !== validationRuleIds.length;
}

async function evaluate({
  doctrineLoadResult,
  resolverResult,
  authorityLookupResult = null,
  validationDecision = null,
  explicitStop = null,
} = {}) {
  assertContinueInput('doctrine-loader.service', doctrineLoadResult);
  assertContinueInput('resolver.service', resolverResult);

  if (authorityLookupResult?.terminal === true) {
    return authorityLookupResult;
  }

  const context = buildKernelContext(getResolverContext(resolverResult, doctrineLoadResult));
  const decision = normalizeValidationDecision({
    validationDecision,
    explicitStop,
  });

  if (decision && decision.status !== 'valid') {
    return normalizeTerminalDecision(decision, context);
  }

  const mappingResult = await loadResolverMapping(resolverResult, context);

  if (mappingResult.terminal) {
    return mappingResult;
  }

  const doctrineValidationRuleIdsResult = loadDoctrineValidationRuleIds(doctrineLoadResult, context);

  if (doctrineValidationRuleIdsResult.terminal) {
    return doctrineValidationRuleIdsResult;
  }

  return buildContinueResult({
    context,
    validationRuleIds: doctrineValidationRuleIdsResult.validationRuleIds,
  });
}

module.exports = {
  SERVICE_NAME,
  OWNED_FAILURE_CODES,
  PROPAGATABLE_FAILURE_CODES,
  evaluate,
  buildTerminalResult,
  buildContinueResult,
};
