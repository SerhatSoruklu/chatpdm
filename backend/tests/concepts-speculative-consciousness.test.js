'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluatePreResolutionGuard,
} = require('../src/modules/concepts/pre-resolution-guard');
const {
  resolveConceptQuery,
} = require('../src/modules/concepts/resolver');
const {
  runFullPipeline,
} = require('../src/modules/concepts/pipeline-runner');
const {
  deriveRuntimeResolutionStateFromResponse,
} = require('../src/modules/concepts/runtime-resolution-state');

const REFUSAL_CASES = [
  {
    category: 'unresolved_domain',
    input: 'consciousness is a universal field',
    reason: 'unresolved_domain',
  },
  {
    category: 'unresolved_domain',
    input: 'afterlife is a continuation of quantum information',
    reason: 'unresolved_domain',
  },
  {
    category: 'unresolved_domain',
    input: 'telepathy is non-local mind entanglement',
    reason: 'unresolved_domain',
  },
  {
    category: 'unsupported_semantic_bridge',
    input: 'microtubules show quantum effects therefore consciousness is cosmic',
    reason: 'unsupported_semantic_bridge',
  },
  {
    category: 'unsupported_semantic_bridge',
    input: 'quantum biology exists therefore the brain is a quantum computer',
    reason: 'unsupported_semantic_bridge',
  },
  {
    category: 'unsupported_semantic_bridge',
    input: 'measurement problem implies observer-created reality',
    reason: 'unsupported_semantic_bridge',
  },
  {
    category: 'causal_overreach',
    input: 'this correlation proves consciousness is caused by quantum coherence',
    reason: 'causal_overreach',
  },
  {
    category: 'causal_overreach',
    input: 'presence of coherence means it generates awareness',
    reason: 'causal_overreach',
  },
  {
    category: 'causal_overreach',
    input: 'because anesthesia affects microtubules, microtubules must create consciousness',
    reason: 'causal_overreach',
  },
  {
    category: 'domain_boundary_violation',
    input: 'quantum entanglement proves minds are linked across the universe',
    reason: 'domain_boundary_violation',
  },
  {
    category: 'domain_boundary_violation',
    input: 'brain timing data proves metaphysical non-locality',
    reason: 'domain_boundary_violation',
  },
  {
    category: 'domain_boundary_violation',
    input: 'physics observations prove spiritual ontology',
    reason: 'domain_boundary_violation',
  },
];

const SAFE_CASES = [
  'microtubules are structures in cells',
  'consciousness remains an unresolved problem',
  'quantum biology studies limited quantum effects in some living systems',
  'anesthesia changes conscious state',
  'correlation does not prove causation',
];

function assertGuardRefusal(decision, expectedReason) {
  assert.equal(decision.refused, true);
  assert.equal(decision.reason, expectedReason);
  assert.equal(decision.interpretationType, expectedReason);
  assert.match(decision.message, /refused/i);
  assert.ok(Array.isArray(decision.matchedReasons));
  assert.ok(decision.matchedReasons.length > 0);
}

function assertPipelineRefusal(pipelineResult, expectedReason) {
  assert.equal(pipelineResult.final_output.state, 'refused');
  assert.equal(pipelineResult.resolution_output.type, 'NO_MATCH');
  assert.equal(pipelineResult.resolution_output.payload.reason, expectedReason);
}

for (const testCase of REFUSAL_CASES) {
  test(`speculative consciousness refusal: ${testCase.category} :: ${testCase.input}`, () => {
    const guardDecision = evaluatePreResolutionGuard(testCase.input);
    assertGuardRefusal(guardDecision, testCase.reason);

    const resolved = resolveConceptQuery(testCase.input);
    assert.equal(deriveRuntimeResolutionStateFromResponse(resolved), 'refused');
    assert.equal(resolved.interpretation.interpretationType, testCase.reason);

    const pipelineResult = runFullPipeline(testCase.input);
    assertPipelineRefusal(pipelineResult, testCase.reason);
  });
}

for (const input of SAFE_CASES) {
  test(`safe bounded statement stays unflagged by the guard: ${input}`, () => {
    const guardDecision = evaluatePreResolutionGuard(input);

    assert.equal(guardDecision.refused, false);
    assert.equal(guardDecision.reason, null);
    assert.equal(guardDecision.interpretationType, null);
    assert.deepEqual(guardDecision.matchedReasons, []);
    assert.equal(guardDecision.message, null);
  });
}
