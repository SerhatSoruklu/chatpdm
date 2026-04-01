'use strict';

const RUNTIME_RESOLUTION_STATES = Object.freeze([
  'allowed',
  'invalid',
  'conflict',
  'refused',
]);

const RESPONSE_TYPE_TO_RUNTIME_RESOLUTION_STATE = Object.freeze({
  concept_match: 'allowed',
  comparison: 'allowed',
  VOCABULARY_DETECTED: 'refused',
  invalid_query: 'invalid',
  ambiguous_match: 'conflict',
  no_exact_match: 'refused',
  rejected_concept: 'refused',
  unsupported_query_type: 'refused',
});

function deriveRuntimeResolutionStateFromResponse(response) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new Error('Runtime resolution-state derivation requires a response object.');
  }

  const responseType = typeof response.type === 'string' ? response.type.trim() : '';
  const runtimeResolutionState = RESPONSE_TYPE_TO_RUNTIME_RESOLUTION_STATE[responseType] ?? null;

  if (!runtimeResolutionState) {
    throw new Error(`Unsupported response type "${responseType}" for runtime resolution-state derivation.`);
  }

  return runtimeResolutionState;
}

function assertSingleRuntimeResolutionState(response) {
  const runtimeResolutionState = deriveRuntimeResolutionStateFromResponse(response);
  const matchingStates = RUNTIME_RESOLUTION_STATES.filter((state) => state === runtimeResolutionState);

  if (matchingStates.length !== 1) {
    throw new Error('Runtime response must resolve to exactly one internal resolution state.');
  }

  return runtimeResolutionState;
}

module.exports = {
  RESPONSE_TYPE_TO_RUNTIME_RESOLUTION_STATE,
  RUNTIME_RESOLUTION_STATES,
  assertSingleRuntimeResolutionState,
  deriveRuntimeResolutionStateFromResponse,
};
