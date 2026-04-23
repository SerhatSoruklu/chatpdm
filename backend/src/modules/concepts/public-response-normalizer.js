'use strict';

const { createHash } = require('node:crypto');
const {
  CONCEPT_SET_VERSION,
  CONTRACT_VERSION,
} = require('./constants');

const RESPONSE_CONTRACT_BY_TYPE = Object.freeze({
  concept_match: Object.freeze({
    finalState: 'valid',
    reason: null,
    failedLayer: null,
  }),
  comparison: Object.freeze({
    finalState: 'valid',
    reason: null,
    failedLayer: null,
  }),
  rejected_concept: Object.freeze({
    finalState: 'refused',
    reason: 'registry_rejection',
    failedLayer: 'registry',
  }),
  VOCABULARY_DETECTED: Object.freeze({
    finalState: 'refused',
    reason: 'exposure_boundary',
    failedLayer: 'exposure',
  }),
  no_exact_match: Object.freeze({
    finalState: 'refused',
    reason: 'semantic_no_exact_match',
    failedLayer: 'semantic',
  }),
  invalid_query: Object.freeze({
    finalState: 'refused',
    reason: 'intake_invalid_query',
    failedLayer: 'intake',
  }),
  unsupported_query_type: Object.freeze({
    finalState: 'refused',
    reason: 'structure_unsupported_query_type',
    failedLayer: 'structure',
  }),
  ambiguous_match: Object.freeze({
    finalState: 'refused',
    reason: 'semantic_ambiguous_match',
    failedLayer: 'semantic',
  }),
});

const REGISTRY_VERSION = CONCEPT_SET_VERSION;
const POLICY_VERSION = CONTRACT_VERSION;

const FINAL_STATE_BY_TYPE = Object.freeze(
  Object.fromEntries(
    Object.entries(RESPONSE_CONTRACT_BY_TYPE).map(([type, contract]) => [type, contract.finalState]),
  ),
);

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function assertStringValue(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

function buildInputHash(normalizedQuery) {
  assertStringValue(normalizedQuery, 'Normalized query');

  return createHash('sha256')
    .update(normalizedQuery, 'utf8')
    .digest('hex');
}

function buildDeterministicKey(normalizedQuery, registryVersion, policyVersion) {
  const inputHash = buildInputHash(normalizedQuery);

  assertStringValue(registryVersion, 'Registry version');
  assertStringValue(policyVersion, 'Policy version');

  return createHash('sha256')
    .update(`${inputHash}\u001f${registryVersion}\u001f${policyVersion}`, 'utf8')
    .digest('hex');
}

function buildPublicResolverResponse(response, context = {}) {
  assertPlainObject(response, 'Public resolver response');
  assertPlainObject(context, 'Public resolver response context');

  const contract = RESPONSE_CONTRACT_BY_TYPE[response.type];

  if (!contract) {
    throw new Error(`Unsupported public resolver response type "${response.type}".`);
  }

  assertStringValue(context.traceId, 'Public resolver response context.traceId');
  assertStringValue(context.timestamp, 'Public resolver response context.timestamp');

  const traceId = context.traceId;
  const timestamp = context.timestamp;
  const registryVersion = REGISTRY_VERSION;
  const policyVersion = POLICY_VERSION;
  const deterministicKey = buildDeterministicKey(
    response.normalizedQuery,
    registryVersion,
    policyVersion,
  );

  return {
    ...response,
    finalState: contract.finalState,
    reason: contract.reason,
    failedLayer: contract.failedLayer,
    deterministicKey,
    registryVersion,
    policyVersion,
    traceId,
    timestamp,
  };
}

module.exports = {
  FINAL_STATE_BY_TYPE,
  RESPONSE_CONTRACT_BY_TYPE,
  buildDeterministicKey,
  buildPublicResolverResponse,
};
