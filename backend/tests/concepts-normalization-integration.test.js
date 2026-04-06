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

function reverseText(value) {
  return Array.from(value).reverse().join('');
}

function encodeBase64(value) {
  return Buffer.from(value, 'utf8').toString('base64');
}

function extractResolverSummary(response) {
  return {
    type: response.type,
    runtimeState: deriveRuntimeResolutionStateFromResponse(response),
    queryType: response.queryType,
    normalizedQuery: response.normalizedQuery,
    interpretationType: response.interpretation?.interpretationType ?? null,
    interpretationDomain: response.interpretation?.domain ?? null,
    resolutionMethod: response.resolution?.method ?? null,
    message: response.message ?? null,
  };
}

function extractPipelineSummary(result) {
  return {
    normalizedQuery: result.normalized_query,
    finalState: result.final_output.state,
    resolutionType: result.resolution_output.type,
    resolutionReason: result.resolution_output.payload.reason ?? null,
    normalizationCanonicalText: result.normalization.canonicalText,
    normalizationRefusalCode: result.normalization.refusalCode ?? null,
  };
}

test('plain and allowed-obfuscated harmful inputs converge through the canonicalized concept pipeline', () => {
  const plainInput = 'what is consciousness';
  const base64Input = encodeBase64(plainInput);
  const reversedBase64Input = reverseText(base64Input);

  const plainResolver = resolveConceptQuery(plainInput);
  const base64Resolver = resolveConceptQuery(base64Input);
  const reversedResolver = resolveConceptQuery(reversedBase64Input);

  assert.deepEqual(
    extractResolverSummary(base64Resolver),
    extractResolverSummary(plainResolver),
  );
  assert.deepEqual(
    extractResolverSummary(reversedResolver),
    extractResolverSummary(plainResolver),
  );

  const plainPipeline = runFullPipeline(plainInput);
  const base64Pipeline = runFullPipeline(base64Input);
  const reversedPipeline = runFullPipeline(reversedBase64Input);

  assert.equal(plainPipeline.normalization.status, 'unchanged');
  assert.equal(base64Pipeline.normalization.status, 'normalized');
  assert.equal(reversedPipeline.normalization.status, 'normalized');

  assert.equal(plainPipeline.normalization.rawText, plainInput);
  assert.equal(base64Pipeline.normalization.rawText, base64Input);
  assert.equal(reversedPipeline.normalization.rawText, reversedBase64Input);

  assert.equal(plainPipeline.normalization.canonicalText, plainInput);
  assert.equal(base64Pipeline.normalization.canonicalText, plainInput);
  assert.equal(reversedPipeline.normalization.canonicalText, plainInput);

  assert.deepEqual(
    extractPipelineSummary(base64Pipeline),
    extractPipelineSummary(plainPipeline),
  );
  assert.deepEqual(
    extractPipelineSummary(reversedPipeline),
    extractPipelineSummary(plainPipeline),
  );

  assert.equal(plainPipeline.final_output.state, 'refused');
  assert.equal(plainPipeline.resolution_output.payload.reason, 'unresolved_domain');
  assert.equal(plainPipeline.resolution_output.type, 'NO_MATCH');
  assert.equal(plainPipeline.normalized_query, base64Pipeline.normalized_query);
  assert.equal(plainPipeline.normalized_query, reversedPipeline.normalized_query);
});

test('normalization refusal short-circuits before guard and resolver work', () => {
  const malformedBase64 = 'SGVsbG8===';

  const resolverResponse = resolveConceptQuery(malformedBase64);
  assert.equal(resolverResponse.type, 'invalid_query');
  assert.equal(deriveRuntimeResolutionStateFromResponse(resolverResponse), 'invalid');
  assert.equal(resolverResponse.interpretation.interpretationType, 'invalid_query');
  assert.match(
    resolverResponse.message,
    /No recognizable concept or supported query structure was detected\./,
  );

  const pipelineResult = runFullPipeline(malformedBase64);
  assert.equal(pipelineResult.normalization.status, 'refused');
  assert.equal(pipelineResult.normalization.refusalCode, 'NORMALIZATION_INVALID_ENCODING');
  assert.equal(pipelineResult.normalization.canonicalText, null);
  assert.equal(pipelineResult.normalization.rawText, malformedBase64);
  assert.equal(pipelineResult.final_output.state, 'refused');
  assert.equal(pipelineResult.resolution_output.type, 'NO_MATCH');
  assert.equal(pipelineResult.resolution_output.payload.reason, 'normalization_refused');
  assert.equal(
    pipelineResult.resolution_output.payload.normalization_refusal_code,
    'NORMALIZATION_INVALID_ENCODING',
  );
});

test('unchanged safe input still flows through the normal concept pipeline', () => {
  const resolverResponse = resolveConceptQuery('authority');
  const pipelineResult = runFullPipeline('authority');

  assert.equal(resolverResponse.type, 'concept_match');
  assert.equal(deriveRuntimeResolutionStateFromResponse(resolverResponse), 'allowed');
  assert.equal(pipelineResult.normalization.status, 'unchanged');
  assert.equal(pipelineResult.normalization.canonicalText, 'authority');
  assert.equal(pipelineResult.normalized_query, 'authority');
  assert.equal(pipelineResult.final_output.state, 'valid');
  assert.equal(pipelineResult.resolution_output.type, 'LIVE_RESOLUTION');
});
