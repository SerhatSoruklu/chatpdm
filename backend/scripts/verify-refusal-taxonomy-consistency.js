'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  PRE_RESOLUTION_GUARD_MESSAGES,
  PRE_RESOLUTION_GUARD_REASONS,
} = require('../src/modules/concepts/pre-resolution-guard');
const {
  RESPONSE_TYPE_TO_RUNTIME_RESOLUTION_STATE,
  RUNTIME_RESOLUTION_STATES,
  deriveRuntimeResolutionStateFromResponse,
} = require('../src/modules/concepts');
const { REASON_CODES } = require('../../scripts/lib/register-validation/reason-codes');

const responseSchemaPath = path.resolve(__dirname, '../../docs/product/response-schema.json');

const EXPECTED_RUNTIME_STATE_BY_RESPONSE_TYPE = Object.freeze({
  concept_match: 'allowed',
  comparison: 'allowed',
  VOCABULARY_DETECTED: 'refused',
  invalid_query: 'invalid',
  ambiguous_match: 'conflict',
  no_exact_match: 'refused',
  rejected_concept: 'refused',
  unsupported_query_type: 'refused',
});

const EXPECTED_RUNTIME_RESOLUTION_STATES = Object.freeze([
  'allowed',
  'invalid',
  'conflict',
  'refused',
]);

function loadResponseSchema() {
  return JSON.parse(fs.readFileSync(responseSchemaPath, 'utf8'));
}

function verifyGuardReasonAlignment() {
  const responseSchema = loadResponseSchema();
  const interpretationEnum = responseSchema?.$defs?.interpretationObject?.properties?.interpretationType?.enum;

  assert.ok(
    Array.isArray(interpretationEnum),
    'docs/product/response-schema.json interpretationType enum is missing.',
  );

  assert.deepEqual(
    Object.keys(PRE_RESOLUTION_GUARD_MESSAGES),
    PRE_RESOLUTION_GUARD_REASONS,
    'PRE_RESOLUTION_GUARD_MESSAGES keys must stay aligned with PRE_RESOLUTION_GUARD_REASONS.',
  );

  const reasonCodeValues = new Set(Object.values(REASON_CODES));
  const schemaInterpretationValues = new Set(interpretationEnum);

  PRE_RESOLUTION_GUARD_REASONS.forEach((reason) => {
    const message = PRE_RESOLUTION_GUARD_MESSAGES[reason];

    assert.equal(
      typeof message,
      'string',
      `Pre-resolution guard reason "${reason}" must have a message entry.`,
    );
    assert.equal(
      message.trim().length > 0,
      true,
      `Pre-resolution guard reason "${reason}" must have a non-empty message.`,
    );
    assert.equal(
      reasonCodeValues.has(reason),
      true,
      `Pre-resolution guard reason "${reason}" is missing from REASON_CODES.`,
    );
    assert.equal(
      schemaInterpretationValues.has(reason),
      true,
      `Pre-resolution guard reason "${reason}" is missing from docs/product/response-schema.json interpretationType enum.`,
    );
  });

  process.stdout.write('PASS refusal_taxonomy_guard_reason_alignment\n');
}

function verifyRuntimeStateAlignment() {
  assert.deepEqual(
    RUNTIME_RESOLUTION_STATES,
    EXPECTED_RUNTIME_RESOLUTION_STATES,
    'Runtime resolution states must remain the closed refusal-state set.',
  );

  assert.deepEqual(
    RESPONSE_TYPE_TO_RUNTIME_RESOLUTION_STATE,
    EXPECTED_RUNTIME_STATE_BY_RESPONSE_TYPE,
    'Response-type to runtime-state mapping drifted.',
  );

  for (const [responseType, expectedRuntimeState] of Object.entries(EXPECTED_RUNTIME_STATE_BY_RESPONSE_TYPE)) {
    assert.equal(
      RUNTIME_RESOLUTION_STATES.includes(expectedRuntimeState),
      true,
      `Runtime state "${expectedRuntimeState}" for response type "${responseType}" is not declared in RUNTIME_RESOLUTION_STATES.`,
    );
    assert.equal(
      deriveRuntimeResolutionStateFromResponse({ type: responseType }),
      expectedRuntimeState,
      `Response type "${responseType}" must derive runtime state "${expectedRuntimeState}".`,
    );
  }

  process.stdout.write('PASS refusal_taxonomy_runtime_state_alignment\n');
}

function main() {
  verifyGuardReasonAlignment();
  verifyRuntimeStateAlignment();
  process.stdout.write('Refusal taxonomy consistency verification passed.\n');
}

main();
