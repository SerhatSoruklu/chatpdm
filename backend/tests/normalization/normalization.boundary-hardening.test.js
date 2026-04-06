'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MAX_INPUT_BYTES,
  normalizeChatPdmInput,
} = require('../../src/normalization/normalization.pipeline.ts');
const {
  resetNormalizationMetrics,
  snapshotNormalizationMetrics,
  NORMALIZATION_TRANSFORM_KINDS,
  NORMALIZATION_REFUSAL_CODES,
} = require('../../src/normalization/normalization.metrics.ts');

const fixturesPath = path.resolve(
  __dirname,
  'fixtures/normalization-boundary-hardening.json',
);

function loadFixtures() {
  return JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
}

function reverseText(text) {
  return Array.from(text).reverse().join('');
}

function encodeBase64NTimes(text, times) {
  let current = text;

  for (let index = 0; index < times; index += 1) {
    current = Buffer.from(current, 'utf8').toString('base64');
  }

  return current;
}

function buildCases() {
  return [
    ...loadFixtures(),
    {
      name: 'max_depth_trap',
      input: encodeBase64NTimes('Hello ChatPDM', 4),
      expectedStatus: 'refused',
      expectedRefusalCode: 'NORMALIZATION_TOO_DEEP',
      expectedDepthUsed: 3,
      expectedAppliedTransformKinds: [
        'base64_decode',
        'base64_decode',
        'base64_decode',
      ],
      expectedChanged: true,
    },
    {
      name: 'max_size_trap',
      input: 'a'.repeat(MAX_INPUT_BYTES + 1),
      expectedStatus: 'refused',
      expectedRefusalCode: 'NORMALIZATION_TOO_LARGE',
      expectedDepthUsed: 0,
      expectedAppliedTransformKinds: [],
      expectedChanged: false,
    },
    {
      name: 'reverse_base64_harmful_chain',
      input: reverseText(Buffer.from('what is consciousness', 'utf8').toString('base64')),
      expectedStatus: 'normalized',
      expectedCanonicalText: 'what is consciousness',
      expectedDepthUsed: 1,
      expectedAppliedTransformKinds: [
        'reverse_then_base64_decode',
      ],
      expectedChanged: true,
    },
  ];
}

function createCounts(keys) {
  return keys.reduce((accumulator, key) => {
    accumulator[key] = 0;
    return accumulator;
  }, {});
}

function updateMetricsExpectation(expected, testCase) {
  expected.attempt_total += 1;
  expected.changed_total += testCase.expectedChanged ? 1 : 0;
  expected.depth_histogram[String(testCase.expectedDepthUsed)] = (
    expected.depth_histogram[String(testCase.expectedDepthUsed)] ?? 0
  ) + 1;

  for (const transform of testCase.expectedAppliedTransformKinds) {
    expected.applied_total[transform] += 1;
  }

  if (testCase.expectedStatus === 'refused') {
    expected.refused_total[testCase.expectedRefusalCode] += 1;

    if (testCase.expectedRefusalCode === 'NORMALIZATION_AMBIGUOUS') {
      expected.ambiguity_total += 1;
    }
  }
}

function computeOutputRatio(result) {
  if (result.outputBytes === null) {
    return null;
  }

  if (result.inputBytes === 0) {
    return 0;
  }

  return result.outputBytes / result.inputBytes;
}

function updateRatioExpectation(expected, ratio) {
  if (ratio === null) {
    return;
  }

  expected.output_ratio_count += 1;
  expected.output_ratio_sum += ratio;
  expected.output_ratio_last = ratio;
  expected.output_ratio_min = expected.output_ratio_min === null
    ? ratio
    : Math.min(expected.output_ratio_min, ratio);
  expected.output_ratio_max = expected.output_ratio_max === null
    ? ratio
    : Math.max(expected.output_ratio_max, ratio);
}

function sumHistogramBuckets(histogram) {
  return Object.values(histogram).reduce((sum, value) => sum + value, 0);
}

test('normalization boundary hardening fixtures stay locked and measurable', () => {
  resetNormalizationMetrics();

  const cases = buildCases();
  const expectedMetrics = {
    attempt_total: 0,
    changed_total: 0,
    applied_total: createCounts(NORMALIZATION_TRANSFORM_KINDS),
    refused_total: createCounts(NORMALIZATION_REFUSAL_CODES),
    depth_histogram: {},
    ambiguity_total: 0,
    output_ratio_count: 0,
    output_ratio_sum: 0,
    output_ratio_min: null,
    output_ratio_max: null,
    output_ratio_last: null,
  };

  for (const testCase of cases) {
    const result = normalizeChatPdmInput(testCase.input);
    const rawInputBytes = Buffer.byteLength(testCase.input, 'utf8');
    const expectedOutputBytes = result.canonicalText === null
      ? null
      : Buffer.byteLength(result.canonicalText, 'utf8');
    const expectedRatio = computeOutputRatio(result);

    assert.equal(result.rawText, testCase.input, `${testCase.name} rawText mismatch`);
    assert.equal(result.inputBytes, rawInputBytes, `${testCase.name} inputBytes mismatch`);
    assert.equal(result.outputBytes, expectedOutputBytes, `${testCase.name} outputBytes mismatch`);
    assert.equal(result.expansionRatio, expectedRatio, `${testCase.name} expansionRatio mismatch`);
    assert.equal(result.changed, testCase.expectedChanged, `${testCase.name} changed mismatch`);
    assert.equal(result.depthUsed, testCase.expectedDepthUsed, `${testCase.name} depthUsed mismatch`);
    assert.deepEqual(
      result.appliedTransformKinds,
      testCase.expectedAppliedTransformKinds,
      `${testCase.name} appliedTransformKinds mismatch`,
    );

    if (testCase.expectedStatus === 'normalized') {
      assert.equal(result.status, 'normalized', `${testCase.name} status mismatch`);
      assert.equal(result.canonicalText, testCase.expectedCanonicalText, `${testCase.name} canonicalText mismatch`);
      assert.equal(result.refusalCode, undefined, `${testCase.name} should not expose refusalCode`);
    } else {
      assert.equal(result.status, 'refused', `${testCase.name} status mismatch`);
      assert.equal(result.refusalCode, testCase.expectedRefusalCode, `${testCase.name} refusalCode mismatch`);
      assert.equal(result.canonicalText, null, `${testCase.name} canonicalText should be null`);
      assert.equal(typeof result.refusalMessage, 'string', `${testCase.name} refusalMessage missing`);
    }

    updateMetricsExpectation(expectedMetrics, testCase);
    updateRatioExpectation(expectedMetrics, expectedRatio);
  }

  const snapshot = snapshotNormalizationMetrics();

  assert.equal(snapshot.normalization_attempt_total, expectedMetrics.attempt_total, 'attempt_total mismatch');
  assert.equal(snapshot.normalization_changed_total, expectedMetrics.changed_total, 'changed_total mismatch');
  assert.deepEqual(snapshot.normalization_applied_total, expectedMetrics.applied_total, 'applied_total mismatch');
  assert.deepEqual(snapshot.normalization_refused_total, expectedMetrics.refused_total, 'refused_total mismatch');
  assert.deepEqual(snapshot.normalization_depth_histogram, expectedMetrics.depth_histogram, 'depth_histogram mismatch');
  assert.equal(snapshot.normalization_ambiguity_total, expectedMetrics.ambiguity_total, 'ambiguity_total mismatch');
  assert.equal(snapshot.normalization_duration_ms.count, expectedMetrics.attempt_total, 'duration_ms.count mismatch');
  assert.equal(
    sumHistogramBuckets(snapshot.normalization_duration_ms.buckets),
    expectedMetrics.attempt_total,
    'duration_ms bucket sum mismatch',
  );

  assert.equal(
    snapshot.normalization_output_expansion_ratio.count,
    expectedMetrics.output_ratio_count,
    'output_expansion_ratio.count mismatch',
  );
  assert.equal(
    snapshot.normalization_output_expansion_ratio.sum,
    expectedMetrics.output_ratio_sum,
    'output_expansion_ratio.sum mismatch',
  );
  assert.equal(
    snapshot.normalization_output_expansion_ratio.min,
    expectedMetrics.output_ratio_min,
    'output_expansion_ratio.min mismatch',
  );
  assert.equal(
    snapshot.normalization_output_expansion_ratio.max,
    expectedMetrics.output_ratio_max,
    'output_expansion_ratio.max mismatch',
  );
  assert.equal(
    snapshot.normalization_output_expansion_ratio.last,
    expectedMetrics.output_ratio_last,
    'output_expansion_ratio.last mismatch',
  );
  assert.equal(
    snapshot.normalization_output_expansion_ratio.average,
    expectedMetrics.output_ratio_count === 0
      ? null
      : expectedMetrics.output_ratio_sum / expectedMetrics.output_ratio_count,
    'output_expansion_ratio.average mismatch',
  );
});
