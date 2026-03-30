'use strict';

const Mapping = require('./mapping.model');

const SERVICE_NAME = 'resolver.service';
const OWNED_FAILURE_CODES = new Set([
  'RULE_NOT_DEFINED',
  'RULE_NOT_AUTHORED',
  'PRECEDENT_NOT_STRUCTURED',
  'ANALOGY_RULE_NOT_ENCODED',
  'CATEGORY_BOUNDARY_NOT_AUTHORED',
  'AMBIGUOUS_CONCEPT_MAPPING',
  'ATTRIBUTION_OVERREACH',
  'INTERPRETATION_OVERRIDE_ATTEMPT',
  'NON_DETERMINISTIC_SUCCESS_PATH',
]);

const TERMINAL_RESULTS_BY_FAILURE_CODE = Object.freeze({
  AMBIGUOUS_CONCEPT_MAPPING: 'unresolved',
  ANALOGY_RULE_NOT_ENCODED: 'unresolved',
  PRECEDENT_NOT_STRUCTURED: 'unresolved',
  RULE_NOT_DEFINED: 'unresolved',
  RULE_NOT_AUTHORED: 'unresolved',
  ATTRIBUTION_OVERREACH: 'invalid',
  CATEGORY_BOUNDARY_NOT_AUTHORED: 'invalid',
  INTERPRETATION_OVERRIDE_ATTEMPT: 'invalid',
  NON_DETERMINISTIC_SUCCESS_PATH: 'invalid',
});

const DECISION_STATUS_TO_FAILURE_CODE = Object.freeze({
  ambiguous: 'AMBIGUOUS_CONCEPT_MAPPING',
  rule_not_defined: 'RULE_NOT_DEFINED',
  raw_precedent: 'PRECEDENT_NOT_STRUCTURED',
  attribution_overreach: 'ATTRIBUTION_OVERREACH',
});

function buildResolverContext({
  argumentUnitId,
  matterId,
  documentId,
  doctrineArtifactId,
  doctrineHash,
}) {
  return {
    argumentUnitId,
    matterId,
    documentId,
    doctrineArtifactId,
    doctrineHash,
    mappingWritten: false,
  };
}

function buildTerminalResult({ result = null, failureCode, reason, extras = {} }) {
  if (!OWNED_FAILURE_CODES.has(failureCode)) {
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

function assertContinueInput(name, value) {
  if (!value || value.ok !== true || value.terminal !== false) {
    throw new Error(`${SERVICE_NAME} requires a continue outcome from ${name}.`);
  }
}

function getArgumentUnitContext(admissibilityResult) {
  const eligibleArgumentUnit = Array.isArray(admissibilityResult.eligibleArgumentUnits)
    ? admissibilityResult.eligibleArgumentUnits[0]
    : null;

  const argumentUnitId = admissibilityResult.argumentUnitId || eligibleArgumentUnit?.argumentUnitId || null;
  const matterId = admissibilityResult.matterId || eligibleArgumentUnit?.matterId || null;
  const documentId = admissibilityResult.documentId || eligibleArgumentUnit?.documentId || null;

  if (!argumentUnitId || !matterId || !documentId) {
    throw new Error(`${SERVICE_NAME} requires argumentUnitId, matterId, and documentId from admissibility.service.`);
  }

  return {
    argumentUnitId,
    matterId,
    documentId,
  };
}

function normalizeResolverDecision({ resolverDecision = null, explicitStop = null, proposedMappings = [] } = {}) {
  if (resolverDecision && typeof resolverDecision === 'object') {
    return resolverDecision;
  }

  if (explicitStop && typeof explicitStop === 'object') {
    return explicitStop;
  }

  if (Array.isArray(proposedMappings) && proposedMappings.length > 0) {
    if (proposedMappings.length > 1) {
      throw new Error(`${SERVICE_NAME} skeleton accepts only one explicit mapping decision at a time.`);
    }

    return {
      status: proposedMappings[0].status,
      ...proposedMappings[0],
    };
  }

  return null;
}

function normalizeTerminalDecision(decision, context) {
  const failureCode = decision.failureCode || DECISION_STATUS_TO_FAILURE_CODE[decision.status];

  if (!failureCode) {
    throw new Error(`${SERVICE_NAME} requires an explicit failureCode or supported non-success status.`);
  }

  return buildTerminalResult({
    failureCode,
    reason: decision.reason || `Resolver stopped with ${failureCode}.`,
    extras: {
      ...context,
      mappingWritten: false,
    },
  });
}

function validateSuccessDecision(decision) {
  if (!decision || typeof decision !== 'object') {
    throw new Error(`${SERVICE_NAME} requires a resolverDecision for success-path mapping.`);
  }

  if (!decision.mappingId || typeof decision.mappingId !== 'string') {
    return 'Resolver success decisions require mappingId.';
  }

  if (!decision.mappingType || typeof decision.mappingType !== 'string') {
    return 'Resolver success decisions require mappingType.';
  }

  if (!decision.matchBasis || typeof decision.matchBasis !== 'string') {
    return 'Resolver success decisions require deterministic matchBasis.';
  }

  if (!decision.resolverRuleId || typeof decision.resolverRuleId !== 'string') {
    return 'Resolver success decisions require resolverRuleId.';
  }

  if (decision.mappingType === 'concept' && !decision.conceptId) {
    return 'Concept mappings require conceptId.';
  }

  if (decision.mappingType === 'authority' && !decision.authorityId) {
    return 'Authority mappings require authorityId.';
  }

  if (decision.mappingType === 'combined' && !decision.conceptId && !decision.authorityId) {
    return 'Combined mappings require conceptId and/or authorityId.';
  }

  return null;
}

async function persistMapping(mappingPayload, context) {
  const mapping = new Mapping(mappingPayload);

  try {
    await mapping.save();
  } catch (error) {
    if (error && error.name === 'ValidationError') {
      return buildTerminalResult({
        failureCode: 'NON_DETERMINISTIC_SUCCESS_PATH',
        reason: error.message,
        extras: {
          ...context,
          mappingWritten: false,
        },
      });
    }

    throw error;
  }

  return {
    ok: true,
    terminal: false,
    service: SERVICE_NAME,
    mapping,
  };
}

async function resolve({
  matterId = null,
  doctrineLoadResult,
  admissibilityResult,
  authorityLookupResult = null,
  resolverDecision = null,
  proposedMappings = [],
  explicitStop = null,
} = {}) {
  assertContinueInput('doctrine-loader.service', doctrineLoadResult);
  assertContinueInput('admissibility.service', admissibilityResult);

  if (authorityLookupResult && authorityLookupResult.terminal === true) {
    throw new Error(`${SERVICE_NAME} must not run after a terminal authority-registry result.`);
  }

  const argumentUnitContext = getArgumentUnitContext(admissibilityResult);
  const context = buildResolverContext({
    ...argumentUnitContext,
    matterId: matterId || argumentUnitContext.matterId,
    doctrineArtifactId: doctrineLoadResult.doctrineArtifactId,
    doctrineHash: doctrineLoadResult.doctrineHash,
  });

  const decision = normalizeResolverDecision({
    resolverDecision,
    explicitStop,
    proposedMappings,
  });

  if (!decision) {
    return buildTerminalResult({
      failureCode: 'RULE_NOT_DEFINED',
      reason: 'Resolver skeleton requires an explicit deterministic resolverDecision until mapping intelligence is implemented.',
      extras: context,
    });
  }

  if (decision.status !== 'success') {
    return normalizeTerminalDecision(decision, context);
  }

  const successValidationError = validateSuccessDecision(decision);

  if (successValidationError) {
    return buildTerminalResult({
      failureCode: 'NON_DETERMINISTIC_SUCCESS_PATH',
      reason: successValidationError,
      extras: context,
    });
  }

  const persistResult = await persistMapping({
    mappingId: decision.mappingId,
    matterId: context.matterId,
    argumentUnitId: context.argumentUnitId,
    doctrineArtifactId: context.doctrineArtifactId,
    conceptId: decision.conceptId ?? null,
    authorityId: decision.authorityId ?? null,
    overrideId: decision.overrideId ?? null,
    mappingType: decision.mappingType,
    status: 'success',
    matchBasis: decision.matchBasis,
    resolverRuleId: decision.resolverRuleId,
    failureCode: null,
    failureReason: null,
  }, context);

  if (persistResult.terminal) {
    return persistResult;
  }

  const { mapping } = persistResult;

  return {
    ok: true,
    terminal: false,
    service: SERVICE_NAME,
    ...context,
    mappingId: mapping.mappingId,
    mappingStatus: mapping.status,
    matchBasis: mapping.matchBasis,
    mappingType: mapping.mappingType,
    conceptId: mapping.conceptId,
    authorityId: mapping.authorityId,
    resolverRuleId: mapping.resolverRuleId,
    mappingWritten: true,
  };
}

module.exports = {
  SERVICE_NAME,
  OWNED_FAILURE_CODES,
  resolve,
  persistMapping,
  buildTerminalResult,
};
