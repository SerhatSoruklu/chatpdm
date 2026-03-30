'use strict';

const Mapping = require('./mapping.model');

const SERVICE_NAME = 'resolver.service';
const OWNED_FAILURE_CODES = new Set([
  'RULE_NOT_AUTHORED',
  'ANALOGY_RULE_NOT_ENCODED',
  'CATEGORY_BOUNDARY_NOT_AUTHORED',
  'AMBIGUOUS_CONCEPT_MAPPING',
  'ATTRIBUTION_OVERREACH',
  'INTERPRETATION_OVERRIDE_ATTEMPT',
  'NON_DETERMINISTIC_SUCCESS_PATH',
]);

function buildTerminalResult({ result, failureCode, reason, extras = {} }) {
  if (!OWNED_FAILURE_CODES.has(failureCode)) {
    throw new Error(`${SERVICE_NAME} cannot emit unowned failure code ${failureCode}.`);
  }

  if (!['invalid', 'unresolved'].includes(result)) {
    throw new Error(`${SERVICE_NAME} terminal results are limited to invalid or unresolved in this wave.`);
  }

  return {
    ok: false,
    terminal: true,
    result,
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

async function persistMapping(mappingPayload) {
  const mapping = new Mapping(mappingPayload);

  try {
    await mapping.save();
  } catch (error) {
    if (error && error.name === 'ValidationError') {
      return buildTerminalResult({
        result: 'invalid',
        failureCode: 'NON_DETERMINISTIC_SUCCESS_PATH',
        reason: error.message,
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
  proposedMappings = [],
  explicitStop = null,
} = {}) {
  assertContinueInput('doctrine-loader.service', doctrineLoadResult);
  assertContinueInput('admissibility.service', admissibilityResult);

  if (authorityLookupResult && authorityLookupResult.terminal === true) {
    throw new Error(`${SERVICE_NAME} must not run after a terminal authority-registry result.`);
  }

  if (explicitStop) {
    return buildTerminalResult(explicitStop);
  }

  if (!Array.isArray(proposedMappings) || proposedMappings.length === 0) {
    return buildTerminalResult({
      result: 'unresolved',
      failureCode: 'RULE_NOT_AUTHORED',
      reason: 'Resolver skeleton requires explicit authored mapping payloads until mapping intelligence is implemented.',
    });
  }

  const persistedMappings = [];
  const mappingRuleIds = [];
  let interpretationUsed = false;
  let interpretationRegimeId = null;
  let manualOverrideUsed = false;
  const overrideIds = [];

  for (const mappingPayload of proposedMappings) {
    const persistResult = await persistMapping({
      matterId: matterId || mappingPayload.matterId,
      doctrineArtifactId: doctrineLoadResult.doctrineArtifactId,
      ...mappingPayload,
    });

    if (persistResult.terminal) {
      return persistResult;
    }

    const { mapping } = persistResult;

    persistedMappings.push(mapping);

    if (mapping.resolverRuleId) {
      mappingRuleIds.push(mapping.resolverRuleId);
    }

    if (mapping.overrideId) {
      manualOverrideUsed = true;
      overrideIds.push(mapping.overrideId);
    }

    if (mapping.mappingType === 'authority' || mapping.mappingType === 'combined') {
      interpretationUsed = true;
      interpretationRegimeId = doctrineLoadResult.interpretationRegime?.regimeId || null;
    }
  }

  return {
    ok: true,
    terminal: false,
    service: SERVICE_NAME,
    mappings: persistedMappings,
    mappingSummary: persistedMappings.map((mapping) => ({
      mappingId: mapping.mappingId,
      argumentUnitId: mapping.argumentUnitId,
      status: mapping.status,
      failureCode: mapping.failureCode,
    })),
    trace: {
      mappingRuleIds,
      interpretationUsed,
      interpretationRegimeId,
      manualOverrideUsed,
      overrideIds,
    },
  };
}

module.exports = {
  SERVICE_NAME,
  OWNED_FAILURE_CODES,
  resolve,
  persistMapping,
  buildTerminalResult,
};
