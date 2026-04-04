'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ZEROGLARE_REFUSAL_CONTRACTS,
  evaluateZeroglareRefusal,
} = require('../../src/modules/concepts/zeroglare-refusal-contracts');
const {
  buildZeroglareAnalysis,
} = require('../../src/modules/concepts/zeroglare-diagnostics');

test('ZeroGlare refusal contract registry is limited to the v1 contracts', () => {
  assert.equal(ZEROGLARE_REFUSAL_CONTRACTS.length, 3);
  assert.deepEqual(
    ZEROGLARE_REFUSAL_CONTRACTS.map((contract) => contract.contract_name),
    [
      'self_sealing_validity_claim',
      'no_exit_contradictory_bind',
      'unresolvable_recursive_closure',
    ],
  );
});

const REFUSAL_CASES = [
  {
    name: 'self sealing validity claim refuses enacted input',
    input: 'The fact that you doubt this proves it is true.',
    reasonCode: 'self_sealing_validity_claim',
  },
  {
    name: 'no exit contradictory bind refuses enacted input',
    input: 'If you accept it, you are naive. If you reject it, that proves you fear it.',
    reasonCode: 'no_exit_contradictory_bind',
  },
  {
    name: 'unresolvable recursive closure refuses enacted input',
    input: 'If you reject this, that proves it.',
    reasonCode: 'unresolvable_recursive_closure',
  },
];

for (const testCase of REFUSAL_CASES) {
  test(`ZeroGlare refusal evaluator: ${testCase.name}`, () => {
    const result = evaluateZeroglareRefusal(testCase.input);

    assert.equal(result.refused, true);
    assert.equal(result.contract_name, testCase.reasonCode);
    assert.equal(result.reason_code, testCase.reasonCode);
    assert.equal(typeof result.reason, 'string');
    assert.ok(result.reason.length > 0);
    assert.equal(result.matched_features.length > 0, true);
    assert.deepEqual(result.matched_disqualifiers, []);
  });
}

const DESCRIPTION_CASES = [
  {
    name: 'self sealing description does not refuse',
    input: "The phrase 'if you doubt it, that proves it' is a self-sealing argument.",
  },
  {
    name: 'no exit description does not refuse',
    input: 'This sentence describes a false dilemma.',
  },
  {
    name: 'recursive closure description does not refuse',
    input: 'This statement talks about recursive logic.',
  },
];

for (const testCase of DESCRIPTION_CASES) {
  test(`ZeroGlare refusal evaluator: ${testCase.name}`, () => {
    const result = evaluateZeroglareRefusal(testCase.input);

    assert.equal(result.refused, false);
    assert.equal(result.contract_name, null);
    assert.equal(result.reason_code, null);
    assert.equal(result.reason, null);
    assert.deepEqual(result.matched_features, []);
    assert.deepEqual(result.matched_disqualifiers, []);
  });
}

test('ZeroGlare analysis returns refusal output for an enacted self sealing claim', () => {
  const result = buildZeroglareAnalysis('The fact that you doubt this proves it is true.');

  assert.equal(result.status, 'refused');
  assert.equal(result.summary.state, 'refused');
  assert.equal(result.summary.refusal_count, 1);
  assert.equal(result.summary.marker_count, 0);
  assert.ok(Object.prototype.hasOwnProperty.call(result, 'refusal'));
  assert.equal(result.refusal.reason_code, 'self_sealing_validity_claim');
  assert.equal(result.refusal.reason, 'Input converts challenge or doubt into self-confirming evidence without an independent validation path.');
  assert.deepEqual(result.markers, []);
  assert.equal(result.summary.clear_count, 0);
  assert.equal(result.summary.fail_count, 0);
});

