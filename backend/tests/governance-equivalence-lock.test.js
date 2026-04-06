'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const fixture = require('./fixtures/governance-equivalence-lock.json');
const {
  MAX_INPUT_BYTES,
  MAX_TRANSFORM_DEPTH,
} = require('../src/normalization/normalization.pipeline.ts');
const {
  resolveConceptQuery,
} = require('../src/modules/concepts/resolver');
const {
  runFullPipeline,
} = require('../src/modules/concepts/pipeline-runner');
const {
  deriveRuntimeResolutionStateFromResponse,
} = require('../src/modules/concepts/runtime-resolution-state');

function reverseText(text) {
  return Array.from(text).reverse().join('');
}

function encodeBase64(text) {
  return Buffer.from(text, 'utf8').toString('base64');
}

function encodeHex(text) {
  return Buffer.from(text, 'utf8').toString('hex').toUpperCase();
}

function encodePercent(text) {
  return Array.from(text, (character) => (
    `%${character.codePointAt(0).toString(16).toUpperCase().padStart(2, '0')}`
  )).join('');
}

function encodeBase64NTimes(text, count) {
  let current = text;

  for (let index = 0; index < count; index += 1) {
    current = encodeBase64(current);
  }

  return current;
}

function applyEncodeSteps(text, encodeSteps) {
  return encodeSteps.reduce((current, step) => {
    switch (step) {
      case 'base64':
        return encodeBase64(current);
      case 'reverse':
        return reverseText(current);
      case 'hex':
        return encodeHex(current);
      case 'percent':
        return encodePercent(current);
      default:
        throw new Error(`Unsupported encode step "${step}".`);
    }
  }, text);
}

function materializeBoundaryInput(testCase) {
  if (typeof testCase.input === 'string') {
    return testCase.input;
  }

  if (!testCase.inputGenerator || typeof testCase.inputGenerator !== 'object') {
    throw new Error(`Boundary case "${testCase.name}" is missing input data.`);
  }

  switch (testCase.inputGenerator.kind) {
    case 'nested_base64': {
      const depth = MAX_TRANSFORM_DEPTH + testCase.inputGenerator.depthOffset;
      return encodeBase64NTimes(testCase.inputGenerator.seed, depth);
    }
    case 'repeat':
      return testCase.inputGenerator.char.repeat(MAX_INPUT_BYTES + testCase.inputGenerator.lengthOffset);
    default:
      throw new Error(`Unsupported boundary input generator "${testCase.inputGenerator.kind}".`);
  }
}

function buildResolverEquivalenceSignature(response) {
  return {
    normalizedQuery: response.normalizedQuery,
    type: response.type,
    queryType: response.queryType,
    interpretationType: response.interpretation?.interpretationType ?? null,
    resolutionMethod: response.resolution?.method ?? null,
    conceptId: response.resolution?.conceptId ?? null,
    runtimeState: deriveRuntimeResolutionStateFromResponse(response),
  };
}

function buildPipelineEquivalenceSignature(result) {
  return {
    normalizedQuery: result.normalized_query,
    admissionState: result.admission_state,
    finalState: result.final_output.state,
    resolutionType: result.resolution_output.type,
    resolutionReason: result.resolution_output.payload.reason ?? null,
    resolutionConceptId: result.resolution_output.payload.resolution?.conceptId ?? null,
  };
}

function buildBoundaryResolverSignature(response) {
  return {
    type: response.type,
    queryType: response.queryType,
    interpretationType: response.interpretation?.interpretationType ?? null,
    resolutionMethod: response.resolution?.method ?? null,
    conceptId: response.resolution?.conceptId ?? null,
    runtimeState: deriveRuntimeResolutionStateFromResponse(response),
  };
}

function buildBoundaryPipelineSignature(result) {
  return {
    admissionState: result.admission_state,
    finalState: result.final_output.state,
    resolutionType: result.resolution_output.type,
    resolutionReason: result.resolution_output.payload.reason ?? null,
  };
}

function runFamilyVariant(family, variant) {
  const input = applyEncodeSteps(family.plainText, variant.encodeSteps);
  const resolverResponse = resolveConceptQuery(input);
  const pipelineResult = runFullPipeline(input);

  return {
    input,
    resolverResponse,
    pipelineResult,
  };
}

function assertFamilyBaseline(family, variant, resolverResponse, pipelineResult) {
  assert.equal(pipelineResult.raw_query, family.plainText, `${family.name} ${variant.name} raw_query mismatch`);
  assert.equal(pipelineResult.normalization.status, variant.expectedNormalizationStatus, `${family.name} ${variant.name} normalization status mismatch`);
  assert.equal(
    pipelineResult.normalization.changed,
    variant.expectedNormalizationStatus === 'normalized',
    `${family.name} ${variant.name} normalization changed mismatch`,
  );
  assert.equal(pipelineResult.normalization.canonicalText, family.canonicalText, `${family.name} ${variant.name} canonicalText mismatch`);
  assert.equal(pipelineResult.normalized_query, family.canonicalText, `${family.name} ${variant.name} normalized_query mismatch`);
  assert.equal(pipelineResult.normalization.refusalCode ?? null, null, `${family.name} ${variant.name} should not refuse normalization`);
  assert.equal(pipelineResult.final_output.state, family.expectedPipeline.finalState, `${family.name} ${variant.name} final state mismatch`);
  assert.equal(pipelineResult.resolution_output.type, family.expectedPipeline.resolutionType, `${family.name} ${variant.name} resolution type mismatch`);
  assert.equal(pipelineResult.resolution_output.payload.reason ?? null, family.expectedPipeline.resolutionReason, `${family.name} ${variant.name} resolution reason mismatch`);
  assert.equal(pipelineResult.admission_state, family.expectedPipeline.admissionState, `${family.name} ${variant.name} admission state mismatch`);
  assert.equal(
    pipelineResult.resolution_output.payload.resolution?.conceptId ?? null,
    family.expectedPipeline.resolutionConceptId,
    `${family.name} ${variant.name} resolution conceptId mismatch`,
  );

  assert.equal(resolverResponse.query, pipelineResult.raw_query, `${family.name} ${variant.name} resolver query mismatch`);
  assert.equal(resolverResponse.normalizedQuery, family.canonicalText, `${family.name} ${variant.name} resolver normalizedQuery mismatch`);
  assert.equal(resolverResponse.type, family.expectedResolver.type, `${family.name} ${variant.name} resolver type mismatch`);
  assert.equal(resolverResponse.queryType, family.expectedResolver.queryType, `${family.name} ${variant.name} resolver queryType mismatch`);
  assert.equal(
    resolverResponse.interpretation?.interpretationType ?? null,
    family.expectedResolver.interpretationType,
    `${family.name} ${variant.name} resolver interpretationType mismatch`,
  );
  assert.equal(
    resolverResponse.resolution?.method ?? null,
    family.expectedResolver.resolutionMethod,
    `${family.name} ${variant.name} resolver resolutionMethod mismatch`,
  );
  assert.equal(
    resolverResponse.resolution?.conceptId ?? null,
    family.expectedResolver.conceptId,
    `${family.name} ${variant.name} resolver conceptId mismatch`,
  );
  assert.equal(
    deriveRuntimeResolutionStateFromResponse(resolverResponse),
    family.expectedResolver.runtimeState,
    `${family.name} ${variant.name} runtime state mismatch`,
  );
}

function assertFamilyVariantEquivalence(
  family,
  baselineSignature,
  baselinePipelineSignature,
  variant,
  input,
  resolverResponse,
  pipelineResult,
) {
  assert.equal(pipelineResult.raw_query, input, `${family.name} ${variant.name} raw_query mismatch`);
  assert.equal(resolverResponse.query, input, `${family.name} ${variant.name} resolver query mismatch`);
  assert.equal(pipelineResult.normalization.status, variant.expectedNormalizationStatus, `${family.name} ${variant.name} normalization status mismatch`);
  assert.equal(pipelineResult.normalization.canonicalText, family.canonicalText, `${family.name} ${variant.name} canonicalText mismatch`);
  assert.equal(pipelineResult.normalized_query, family.canonicalText, `${family.name} ${variant.name} normalized_query mismatch`);
  assert.equal(
    pipelineResult.normalization.changed,
    variant.expectedNormalizationStatus === 'normalized',
    `${family.name} ${variant.name} normalization changed flag mismatch`,
  );

  assert.deepEqual(
    buildResolverEquivalenceSignature(resolverResponse),
    baselineSignature,
    `${family.name} ${variant.name} resolver signature mismatch`,
  );

  assert.deepEqual(
    buildPipelineEquivalenceSignature(pipelineResult),
    baselinePipelineSignature,
    `${family.name} ${variant.name} pipeline signature mismatch`,
  );
}

function assertBoundaryCase(testCase, expectedResolverSignature, expectedPipelineSignature) {
  const input = materializeBoundaryInput(testCase);
  const resolverResponse = resolveConceptQuery(input);
  const pipelineResult = runFullPipeline(input);

  assert.equal(pipelineResult.raw_query, input, `${testCase.name} raw_query mismatch`);
  assert.equal(resolverResponse.query, input, `${testCase.name} resolver query mismatch`);
  assert.equal(resolverResponse.normalizedQuery, input, `${testCase.name} normalizedQuery should remain raw input`);
  assert.equal(pipelineResult.normalized_query, input, `${testCase.name} normalized_query should remain raw input`);
  assert.equal(pipelineResult.normalization.status, testCase.expectedNormalization.status, `${testCase.name} normalization status mismatch`);
  assert.equal(pipelineResult.normalization.refusalCode, testCase.expectedNormalization.refusalCode, `${testCase.name} normalization refusal code mismatch`);
  assert.equal(pipelineResult.normalization.changed, testCase.expectedNormalization.changed, `${testCase.name} normalization changed mismatch`);
  assert.equal(pipelineResult.normalization.canonicalText, null, `${testCase.name} canonicalText should be null`);
  assert.equal(pipelineResult.final_output.state, testCase.expectedPipeline.finalState, `${testCase.name} final state mismatch`);
  assert.equal(pipelineResult.resolution_output.type, testCase.expectedPipeline.resolutionType, `${testCase.name} resolution type mismatch`);
  assert.equal(pipelineResult.resolution_output.payload.reason, testCase.expectedPipeline.resolutionReason, `${testCase.name} resolution reason mismatch`);
  assert.equal(pipelineResult.admission_state, testCase.expectedPipeline.admissionState, `${testCase.name} admission state mismatch`);
  assert.equal(pipelineResult.resolution_output.payload.normalization_refusal_code, testCase.expectedNormalization.refusalCode, `${testCase.name} normalization refusal code should surface downstream`);

  assert.equal(resolverResponse.type, testCase.expectedResolver.type, `${testCase.name} resolver type mismatch`);
  assert.equal(resolverResponse.queryType, testCase.expectedResolver.queryType, `${testCase.name} resolver queryType mismatch`);
  assert.equal(
    resolverResponse.interpretation?.interpretationType ?? null,
    testCase.expectedResolver.interpretationType,
    `${testCase.name} resolver interpretationType mismatch`,
  );
  assert.equal(
    resolverResponse.resolution?.method ?? null,
    testCase.expectedResolver.resolutionMethod,
    `${testCase.name} resolver resolutionMethod mismatch`,
  );
  assert.equal(
    resolverResponse.resolution?.conceptId ?? null,
    testCase.expectedResolver.conceptId,
    `${testCase.name} resolver conceptId mismatch`,
  );
  assert.equal(
    deriveRuntimeResolutionStateFromResponse(resolverResponse),
    testCase.expectedResolver.runtimeState,
    `${testCase.name} runtime state mismatch`,
  );

  assert.deepEqual(buildBoundaryResolverSignature(resolverResponse), expectedResolverSignature, `${testCase.name} resolver boundary signature mismatch`);
  assert.deepEqual(buildBoundaryPipelineSignature(pipelineResult), expectedPipelineSignature, `${testCase.name} pipeline boundary signature mismatch`);
}

function assertGovernanceEquivalenceFamily(family) {
  const baselineVariant = family.variants[0];
  const baselineRun = runFamilyVariant(family, baselineVariant);

  assertFamilyBaseline(family, baselineVariant, baselineRun.resolverResponse, baselineRun.pipelineResult);

  const baselineResolverSignature = buildResolverEquivalenceSignature(baselineRun.resolverResponse);
  const baselinePipelineSignature = buildPipelineEquivalenceSignature(baselineRun.pipelineResult);

  for (const variant of family.variants.slice(1)) {
    const variantRun = runFamilyVariant(family, variant);
    assertFamilyVariantEquivalence(
      family,
      baselineResolverSignature,
      baselinePipelineSignature,
      variant,
      variantRun.input,
      variantRun.resolverResponse,
      variantRun.pipelineResult,
    );
  }
}

test('governance equivalence lock: harmful disguised inputs collapse to the same refusal family', () => {
  for (const family of fixture.harmfulFamilies) {
    assertGovernanceEquivalenceFamily(family);
  }
});

test('governance equivalence lock: safe disguised inputs collapse to the same allow/resolve family', () => {
  for (const family of fixture.safeFamilies) {
    assertGovernanceEquivalenceFamily(family);
  }
});

test('governance equivalence lock: boundary failures stay in normalization refusal and invalid_query branches', () => {
  const baselineCase = fixture.boundaryCases[0];
  const baselineInput = materializeBoundaryInput(baselineCase);
  const baselineResolverSignature = buildBoundaryResolverSignature(resolveConceptQuery(baselineInput));
  const baselinePipelineSignature = buildBoundaryPipelineSignature(runFullPipeline(baselineInput));

  assertBoundaryCase(
    baselineCase,
    baselineResolverSignature,
    baselinePipelineSignature,
  );

  for (const testCase of fixture.boundaryCases.slice(1)) {
    assertBoundaryCase(
      testCase,
      baselineResolverSignature,
      baselinePipelineSignature,
    );
  }
});
