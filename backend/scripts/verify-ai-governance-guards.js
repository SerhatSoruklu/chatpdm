'use strict';

const assert = require('node:assert/strict');

const {
  AI_GOVERNANCE_ERROR_CODES,
  AiGovernanceBoundaryError,
  assertCanonicalStoreFreeOfAiMarkers,
  assertCanonicalWriteInputFreeOfAiMarkers,
  assertDeterministicPathFreeOfAiMarkers,
} = require('../src/lib/ai-governance-guard');
const { resolveConceptQuery } = require('../src/modules/concepts');

function expectBoundaryError(fn, expectedCode) {
  let thrownError = null;

  try {
    fn();
  } catch (error) {
    thrownError = error;
  }

  assert.ok(thrownError instanceof AiGovernanceBoundaryError, `Expected AiGovernanceBoundaryError for ${expectedCode}.`);
  assert.equal(thrownError.code, expectedCode);
}

function main() {
  const response = resolveConceptQuery('duty');

  assert.equal(response.type, 'concept_match');
  assert.equal(response.answer.title, 'Duty');

  assert.doesNotThrow(() => {
    assertCanonicalStoreFreeOfAiMarkers({
      conceptId: 'duty',
      title: 'Duty',
      registers: {
        standard: {
          shortDefinition: 'Duty is required conduct.',
        },
      },
    }, 'clean authored packet');
  });

  expectBoundaryError(
    () => assertCanonicalStoreFreeOfAiMarkers({ origin: 'openai' }, 'contaminated store packet'),
    AI_GOVERNANCE_ERROR_CODES.CANONICAL_STORE_REJECTED,
  );

  expectBoundaryError(
    () => assertCanonicalWriteInputFreeOfAiMarkers({ aiOrigin: true }, 'workflow mutation input'),
    AI_GOVERNANCE_ERROR_CODES.CANONICAL_WRITE_BLOCKED,
  );

  expectBoundaryError(
    () => assertDeterministicPathFreeOfAiMarkers(
      { answer: { label: 'AI (Advisory, Non-Canonical)' } },
      'deterministic response payload',
    ),
    AI_GOVERNANCE_ERROR_CODES.DETERMINISTIC_PATH_CONTAMINATED,
  );

  process.stdout.write('verify-ai-governance-guards: ok\n');
}

main();
