'use strict';

const Mapping = require('./mapping.model');
const OverrideRecord = require('../overrides/override-record.model');
const { loadConceptSet } = require('../../concepts/concept-loader');
const { deriveRoutingText, normalizeQuery } = require('../../concepts/normalizer');

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
  'UNDECLARED_SYNONYM_PATH',
  'UNAPPROVED_OVERRIDE_RECORD',
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
  UNDECLARED_SYNONYM_PATH: 'invalid',
  UNAPPROVED_OVERRIDE_RECORD: 'invalid',
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

let cachedSynonymGovernance = null;

function pushCandidate(map, key, concept) {
  if (!map.has(key)) {
    map.set(key, []);
  }

  map.get(key).push(concept);
}

function loadSynonymGovernance() {
  if (cachedSynonymGovernance) {
    return cachedSynonymGovernance;
  }

  const liveConcepts = loadConceptSet();
  const liveConceptsById = new Map(liveConcepts.map((concept) => [concept.conceptId, concept]));
  const governedSynonyms = new Map();

  for (const concept of liveConcepts) {
    const seen = new Set();

    for (const synonym of [...concept.aliases, ...concept.normalizedAliases]) {
      const synonymKey = deriveRoutingText(normalizeQuery(synonym));

      if (seen.has(synonymKey)) {
        continue;
      }

      seen.add(synonymKey);
      pushCandidate(governedSynonyms, synonymKey, concept);
    }
  }

  cachedSynonymGovernance = Object.freeze({
    liveConcepts,
    liveConceptsById,
    governedSynonyms,
  });

  return cachedSynonymGovernance;
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

  if (typeof decision.mappingId !== 'string' || decision.mappingId.trim().length === 0) {
    return 'Resolver success decisions require mappingId.';
  }

  if (typeof decision.mappingType !== 'string' || decision.mappingType.trim().length === 0) {
    return 'Resolver success decisions require mappingType.';
  }

  if (!decision.matchBasis || typeof decision.matchBasis !== 'string') {
    return 'Resolver success decisions require deterministic matchBasis.';
  }

  if (typeof decision.resolverRuleId !== 'string' || decision.resolverRuleId.trim().length === 0) {
    return 'Resolver success decisions require resolverRuleId.';
  }

  if (
    decision.matchBasis === 'exact_synonym'
    && (typeof decision.synonymTerm !== 'string' || decision.synonymTerm.trim().length === 0)
  ) {
    return 'Exact synonym mappings require synonymTerm.';
  }

  if (
    decision.matchBasis === 'exact_synonym'
    && (typeof decision.conceptId !== 'string' || decision.conceptId.trim().length === 0)
  ) {
    return 'Exact synonym mappings require conceptId.';
  }

  if (
    decision.matchBasis === 'manual_override'
    && (typeof decision.overrideId !== 'string' || decision.overrideId.trim().length === 0)
  ) {
    return 'Manual override mappings require overrideId.';
  }

  if (decision.mappingType === 'concept' && (typeof decision.conceptId !== 'string' || decision.conceptId.trim().length === 0)) {
    return 'Concept mappings require conceptId.';
  }

  if (decision.mappingType === 'authority' && (typeof decision.authorityId !== 'string' || decision.authorityId.trim().length === 0)) {
    return 'Authority mappings require authorityId.';
  }

  if (
    decision.mappingType === 'combined'
    && (typeof decision.conceptId !== 'string' || decision.conceptId.trim().length === 0)
    && (typeof decision.authorityId !== 'string' || decision.authorityId.trim().length === 0)
  ) {
    return 'Combined mappings require conceptId and/or authorityId.';
  }

  return null;
}

function normalizeSynonymTerm(value) {
  return deriveRoutingText(normalizeQuery(value));
}

function normalizeTrimmedString(value) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildSynonymGovernanceBlocker(message, context) {
  return buildTerminalResult({
    failureCode: 'UNDECLARED_SYNONYM_PATH',
    reason: message,
    extras: {
      ...context,
      mappingWritten: false,
    },
  });
}

async function validateSynonymGovernance(decision, context) {
  const governance = loadSynonymGovernance();
  const conceptId = normalizeTrimmedString(decision.conceptId);
  const concept = governance.liveConceptsById.get(conceptId);

  if (!concept) {
    return buildSynonymGovernanceBlocker(
      `Resolver cannot use synonym mapping for unknown conceptId=${conceptId}.`,
      {
        ...context,
        conceptId,
        synonymTerm: decision.synonymTerm,
      },
    );
  }

  const synonymKey = normalizeSynonymTerm(decision.synonymTerm);
  const candidates = governance.governedSynonyms.get(synonymKey) || [];

  if (candidates.length === 0) {
    return buildSynonymGovernanceBlocker(
      `Synonym "${decision.synonymTerm}" is not authorized by the active concept registry.`,
      {
        ...context,
        conceptId,
        synonymTerm: decision.synonymTerm,
      },
    );
  }

  if (candidates.length > 1) {
    return buildTerminalResult({
      failureCode: 'AMBIGUOUS_CONCEPT_MAPPING',
      reason: `Synonym "${decision.synonymTerm}" is shared by multiple live concepts and cannot support deterministic mapping.`,
      extras: {
        ...context,
        conceptId,
        synonymTerm: decision.synonymTerm,
        mappingWritten: false,
      },
    });
  }

  if (candidates[0].conceptId !== conceptId) {
    return buildSynonymGovernanceBlocker(
      `Synonym "${decision.synonymTerm}" is governed by conceptId=${candidates[0].conceptId}, not conceptId=${conceptId}.`,
      {
        ...context,
        conceptId,
        synonymTerm: decision.synonymTerm,
      },
    );
  }

  return {
    ok: true,
    synonymTerm: decision.synonymTerm.trim(),
  };
}

async function validateManualOverrideGovernance(decision, context) {
  const overrideId = normalizeTrimmedString(decision.overrideId);
  const overrideCheck = await OverrideRecord.findApprovedMappingOverride(overrideId, {
    matterId: context.matterId,
    argumentUnitId: context.argumentUnitId,
    mappingId: decision.mappingId,
  });

  if (overrideCheck.blocker) {
    return buildTerminalResult({
      failureCode: overrideCheck.blocker.failureCode,
      reason: overrideCheck.blocker.reason,
      extras: {
        ...context,
        overrideId,
        mappingWritten: false,
      },
    });
  }

  return {
    ok: true,
    overrideId: overrideCheck.overrideRecord.overrideId,
    manualOverrideReason: overrideCheck.overrideRecord.reason,
  };
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

function buildSuccessResult({ context, mapping, mappingWritten }) {
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
    overrideId: mapping.overrideId,
    manualOverrideReason: mapping.manualOverrideReason,
    synonymTerm: mapping.synonymTerm,
    resolverRuleId: mapping.resolverRuleId,
    mappingWritten,
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
  persist = true,
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

  let governanceResult = {
    ok: true,
    overrideId: null,
    manualOverrideReason: null,
    synonymTerm: null,
  };

  if (decision.matchBasis === 'exact_synonym') {
    governanceResult = await validateSynonymGovernance(decision, context);

    if (governanceResult.terminal) {
      return governanceResult;
    }
  }

  if (decision.matchBasis === 'manual_override') {
    governanceResult = await validateManualOverrideGovernance(decision, context);

    if (governanceResult.terminal) {
      return governanceResult;
    }
  }

  const mappingPayload = {
    mappingId: decision.mappingId,
    matterId: context.matterId,
    argumentUnitId: context.argumentUnitId,
    doctrineArtifactId: context.doctrineArtifactId,
    conceptId: normalizeTrimmedString(decision.conceptId) ?? null,
    authorityId: normalizeTrimmedString(decision.authorityId) ?? null,
    overrideId: normalizeTrimmedString(decision.overrideId) ?? null,
    manualOverrideReason: governanceResult.manualOverrideReason,
    synonymTerm: governanceResult.synonymTerm,
    mappingType: decision.mappingType,
    status: 'success',
    matchBasis: decision.matchBasis,
    resolverRuleId: decision.resolverRuleId,
    failureCode: null,
    failureReason: null,
  }

  if (persist !== false) {
    const persistResult = await persistMapping(mappingPayload, context);

    if (persistResult.terminal) {
      return persistResult;
    }

    return buildSuccessResult({
      context,
      mapping: persistResult.mapping,
      mappingWritten: true,
    });
  }

  return buildSuccessResult({
    context,
    mapping: mappingPayload,
    mappingWritten: false,
  });
}

module.exports = {
  SERVICE_NAME,
  OWNED_FAILURE_CODES,
  resolve,
  persistMapping,
  buildTerminalResult,
};
