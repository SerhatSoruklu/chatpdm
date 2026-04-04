'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../src/app');
const {
  buildZeroglareAnalysis,
} = require('../../src/modules/concepts/zeroglare-diagnostics');
const {
  ZEROGLARE_CONVERSATIONAL_GUIDANCE_PATTERNS,
  evaluateZeroglareConversationalGuidance,
} = require('../../src/modules/concepts/zeroglare-conversational-guidance');

const GUIDANCE_CASES = [
  {
    name: 'ambiguity guidance matches an uncertain split interpretation',
    input:
      "I think I understand what you're saying, but at the same time it feels like you're implying something without directly stating it, and I'm not sure if I'm supposed to agree with it or question it.",
    expectedPattern: 'ambiguity_uncertain_interpretation',
  },
  {
    name: 'ambiguity guidance matches a direct claim versus implied meaning',
    input:
      "I can't tell whether you're making a direct claim or implying something behind it.",
    expectedPattern: 'ambiguity_uncertain_interpretation',
  },
  {
    name: 'soft pressure guidance matches a consensus frame',
    input: 'Most reasonable people would agree with this.',
    expectedPattern: 'soft_pressure_expectation_frame',
  },
  {
    name: 'soft pressure guidance matches an implied preferred answer',
    input: 'You already know what the right answer is.',
    expectedPattern: 'soft_pressure_expectation_frame',
  },
];

const NON_MATCH_CASES = [
  {
    name: 'direct disagreement does not match the ambiguity pattern',
    input: 'I disagree with your point.',
  },
  {
    name: 'descriptive ambiguity does not match the ambiguity pattern',
    input: 'This sentence describes ambiguity in language.',
    expectedDisqualifier: 'describes',
  },
  {
    name: 'philosophical readings discussion does not match the ambiguity pattern',
    input: 'There are two possible readings of this text in philosophy.',
  },
  {
    name: 'survey-backed consensus does not match the soft pressure pattern',
    input: 'Most people in the survey agreed with it.',
    expectedDisqualifier: 'survey',
  },
  {
    name: 'evidence-backed consensus does not match the soft pressure pattern',
    input: 'Many readers accepted the conclusion because the data supported it.',
    expectedDisqualifier: 'data',
  },
  {
    name: 'descriptive social-pressure discussion does not match the soft pressure pattern',
    input: 'This sentence describes social pressure rhetoric.',
    expectedDisqualifier: 'describes',
  },
];

test('zeroglare conversational guidance registry exposes the two v1 patterns', () => {
  assert.deepEqual(
    ZEROGLARE_CONVERSATIONAL_GUIDANCE_PATTERNS.map((pattern) => pattern.pattern_name),
    [
      'ambiguity_uncertain_interpretation',
      'soft_pressure_expectation_frame',
    ],
  );
});

for (const testCase of GUIDANCE_CASES) {
  test(`zeroglare conversational guidance matches: ${testCase.name}`, () => {
    const result = evaluateZeroglareConversationalGuidance(testCase.input);

    assert.equal(result.matched, true);
    assert.equal(result.pattern, testCase.expectedPattern);
    assert.ok(result.response);
    assert.ok(result.strategy);
    assert.ok(result.intent);
    assert.ok(Array.isArray(result.matched_features));
    assert.equal(result.matched_features.length > 0, true);
    assert.deepEqual(result.matched_disqualifiers, []);
  });

  test(`zeroglare analysis attaches conversational guidance without refusing: ${testCase.name}`, () => {
    const result = buildZeroglareAnalysis(testCase.input);

    assert.notEqual(result.status, 'refused');
    assert.equal(Object.prototype.hasOwnProperty.call(result, 'refusal'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result, 'conversational'), true);
    assert.equal(result.conversational.pattern, testCase.expectedPattern);
    assert.ok(result.conversational.response);
    assert.ok(result.conversational.strategy);
    assert.ok(result.conversational.intent);
  });
}

for (const testCase of NON_MATCH_CASES) {
  test(`zeroglare conversational guidance does not match: ${testCase.name}`, () => {
    const result = evaluateZeroglareConversationalGuidance(testCase.input);

    assert.equal(result.matched, false);
    assert.equal(result.pattern, null);

    if (testCase.expectedDisqualifier) {
      assert.equal(result.matched_disqualifiers.includes(testCase.expectedDisqualifier), true);
    }
  });

  test(`zeroglare analysis stays non-refused for non-matching guidance: ${testCase.name}`, () => {
    const result = buildZeroglareAnalysis(testCase.input);

    assert.notEqual(result.status, 'refused');
    assert.equal(Object.prototype.hasOwnProperty.call(result, 'refusal'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result, 'conversational'), false);
  });
}

test('zeroglare analysis refuses before conversational guidance when both could apply', () => {
  const result = buildZeroglareAnalysis(
    "If you reject this, that proves it, and I can't tell whether you're making a direct claim or implying something behind it.",
  );

  assert.equal(result.status, 'refused');
  assert.equal(result.refusal.reason_code, 'unresolvable_recursive_closure');
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'conversational'), false);
});

test('zeroglare analyze api returns conversational guidance for a non-refusal pressure case', async (t) => {
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/zeroglare/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: 'Most reasonable people would agree with this.',
    }),
  });

  assert.equal(response.status, 200);

  const body = await response.json();
  assert.notEqual(body.status, 'refused');
  assert.equal(Object.prototype.hasOwnProperty.call(body, 'refusal'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(body, 'conversational'), true);
  assert.equal(body.conversational.pattern, 'soft_pressure_expectation_frame');
  assert.equal(body.conversational.response, 'What is the actual claim, and what supports it?');
  assert.equal(body.conversational.strategy, 'burden_reset');
  assert.equal(body.conversational.intent, 'stabilize_evaluation');
});
