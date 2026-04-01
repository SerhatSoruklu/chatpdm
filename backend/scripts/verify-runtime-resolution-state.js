'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  RESPONSE_TYPE_TO_RUNTIME_RESOLUTION_STATE,
  assertSingleRuntimeResolutionState,
  deriveRuntimeResolutionStateFromResponse,
  resolveConceptQuery,
} = require('../src/modules/concepts');

const phase75FixturePath = path.resolve(
  __dirname,
  '../../tests/runtime/fixtures/phase-7-5-cases.json',
);
const comparisonFixturePath = path.resolve(
  __dirname,
  '../../tests/runtime/fixtures/phase-11-comparison-cases.json',
);

function loadCases() {
  return [
    ...JSON.parse(fs.readFileSync(phase75FixturePath, 'utf8')),
    ...JSON.parse(fs.readFileSync(comparisonFixturePath, 'utf8')),
  ];
}

function verifyRuntimeResolutionMappingAcrossFixtures() {
  const cases = loadCases();

  cases.forEach((testCase) => {
    const response = resolveConceptQuery(testCase.input);
    const runtimeResolutionState = assertSingleRuntimeResolutionState(response);
    const expectedState = RESPONSE_TYPE_TO_RUNTIME_RESOLUTION_STATE[testCase.expectedType];

    assert.equal(
      runtimeResolutionState,
      expectedState,
      `${testCase.name} runtime resolution state mismatch.`,
    );
  });

  process.stdout.write('PASS runtime_resolution_state_fixture_mapping\n');
}

function verifyConflictStateRemainsExplicit() {
  const runtimeResolutionState = deriveRuntimeResolutionStateFromResponse({
    type: 'ambiguous_match',
  });

  assert.equal(
    runtimeResolutionState,
    'conflict',
    'ambiguous_match must map to conflict as an internal runtime outcome.',
  );

  process.stdout.write('PASS runtime_resolution_state_conflict_mapping\n');
}

function verifyUnknownTypeFailsClosed() {
  assert.throws(
    () => deriveRuntimeResolutionStateFromResponse({ type: 'mystery_type' }),
    /Unsupported response type/,
    'runtime resolution-state derivation must fail closed on unknown response types.',
  );

  process.stdout.write('PASS runtime_resolution_state_unknown_type_fails_closed\n');
}

function main() {
  verifyRuntimeResolutionMappingAcrossFixtures();
  verifyConflictStateRemainsExplicit();
  verifyUnknownTypeFailsClosed();
  process.stdout.write('Runtime resolution-state verification passed.\n');
}

main();
