'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  deriveRuntimeResolutionStateFromResponse,
} = require('../src/modules/concepts/runtime-resolution-state');
const {
  resolveConceptQuery,
} = require('../src/modules/concepts/resolver');
const {
  runFullPipeline,
} = require('../src/modules/concepts/pipeline-runner');

function assertGuardRefusal(response, expectedReason) {
  assert.equal(response.type, 'no_exact_match');
  assert.equal(deriveRuntimeResolutionStateFromResponse(response), 'refused');
  assert.equal(response.resolution.method, 'no_exact_match');
  assert.equal(response.interpretation.interpretationType, expectedReason);
  assert.match(response.interpretation.message, /refused/i);
}

test('valid ordinary concepts still resolve through the normal path', () => {
  const response = resolveConceptQuery('authority');

  assert.equal(response.type, 'concept_match');
  assert.equal(response.resolution.method, 'exact_alias');

  const pipelineResult = runFullPipeline('authority');

  assert.equal(pipelineResult.final_output.state, 'valid');
  assert.equal(pipelineResult.resolution_output.type, 'LIVE_RESOLUTION');
  assert.equal(pipelineResult.resolution_output.payload.type, 'concept_match');
});

test('unresolved domain inputs refuse before resolution', () => {
  const response = resolveConceptQuery('what is consciousness');

  assertGuardRefusal(response, 'unresolved_domain');
  assert.equal(response.interpretation.domain, 'consciousness');

  const pipelineResult = runFullPipeline('what is consciousness');

  assert.equal(pipelineResult.final_output.state, 'refused');
  assert.equal(pipelineResult.resolution_output.type, 'NO_MATCH');
  assert.equal(pipelineResult.resolution_output.payload.reason, 'unresolved_domain');
});

test('unsupported semantic bridge inputs refuse before resolution', () => {
  const response = resolveConceptQuery('microtubules therefore consciousness');

  assertGuardRefusal(response, 'unsupported_semantic_bridge');
  assert.ok(response.interpretation.message.length > 0);
});

test('domain boundary violations refuse before resolution', () => {
  const response = resolveConceptQuery('quantum entanglement proves metaphysical truth');

  assertGuardRefusal(response, 'domain_boundary_violation');
  assert.match(response.interpretation.domain ?? '', /physics|metaphysics/i);
});

test('causal overreach inputs refuse before resolution', () => {
  const response = resolveConceptQuery('x correlates with y so x causes y');

  assertGuardRefusal(response, 'causal_overreach');
  assert.equal(response.interpretation.domain ?? null, null);
});
