'use strict';

/**
 * ZeroGlare Boundary Integrity v1.
 *
 * This pack exists to preserve the deterministic v1 boundaries.
 * It is intentionally narrow. New refusal contracts or guidance patterns
 * must expand this pack explicitly; silent broadening is not acceptable.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  ZEROGLARE_REFUSAL_CONTRACTS,
  evaluateZeroglareRefusal,
} = require('../../src/modules/concepts/zeroglare-refusal-contracts');
const {
  ZEROGLARE_CONVERSATIONAL_GUIDANCE_PATTERNS,
  evaluateZeroglareConversationalGuidance,
} = require('../../src/modules/concepts/zeroglare-conversational-guidance');
const {
  buildZeroglareAnalysis,
} = require('../../src/modules/concepts/zeroglare-diagnostics');

const CORPUS_FIXTURE_PATH = path.resolve(
  __dirname,
  './fixtures/zeroglare-boundary-integrity.v1.json',
);
const CORPUS_FIXTURE = JSON.parse(fs.readFileSync(CORPUS_FIXTURE_PATH, 'utf8'));

const CORPUS_GROUP_ORDER = Object.freeze([
  'clear',
  'pressure_but_allowed',
  'refused_self_sealing_validity_claim',
  'refused_no_exit_contradictory_bind',
  'refused_unresolvable_recursive_closure',
  'guidance_ambiguity_uncertain_interpretation',
  'guidance_soft_pressure_expectation_frame',
  'descriptive_or_meta_non_match',
]);

const REFUSAL_REASON_BY_CODE = Object.freeze({
  self_sealing_validity_claim: 'Input converts challenge or doubt into self-confirming evidence without an independent validation path.',
  no_exit_contradictory_bind: 'Input creates a contradictory bind in which all available response paths collapse into the same imposed conclusion.',
  unresolvable_recursive_closure: 'Input contains a recursive closure with no bounded exit path.',
});

const GUIDANCE_COPY_BY_PATTERN = Object.freeze({
  ambiguity_uncertain_interpretation: Object.freeze({
    response: 'There’s no hidden implication. The claim is just this: [state claim clearly].',
    strategy: 'clarification',
    intent: 'stabilize_interpretation',
  }),
  soft_pressure_expectation_frame: Object.freeze({
    response: 'What is the actual claim, and what supports it?',
    strategy: 'burden_reset',
    intent: 'stabilize_evaluation',
  }),
});

function assertAnalysisEnvelope(analysis) {
  assert.equal(analysis.resource, 'zeroglare');
  assert.equal(analysis.taxonomy_version, 'v1');
  assert.equal(Array.isArray(analysis.markers), true);
  assert.equal(Array.isArray(analysis.signals), true);
  assert.equal(Array.isArray(analysis.pipeline_position), true);
  assert.equal(analysis.summary.marker_count, analysis.markers.length);
}

function assertRefusalSignal(refusal, expectedReasonCode) {
  assert.equal(refusal.refused, true);
  assert.equal(refusal.contract_name, expectedReasonCode);
  assert.equal(refusal.reason_code, expectedReasonCode);
  assert.equal(refusal.reason, REFUSAL_REASON_BY_CODE[expectedReasonCode]);
  assert.equal(Array.isArray(refusal.matched_features), true);
  assert.equal(refusal.matched_features.length > 0, true);
  assert.deepEqual(refusal.matched_disqualifiers, []);
}

function assertGuidanceSignal(guidance, expectedPattern) {
  const guidanceCopy = GUIDANCE_COPY_BY_PATTERN[expectedPattern];

  assert.equal(guidance.matched, true);
  assert.equal(guidance.pattern, expectedPattern);
  assert.equal(guidance.response, guidanceCopy.response);
  assert.equal(guidance.strategy, guidanceCopy.strategy);
  assert.equal(guidance.intent, guidanceCopy.intent);
  assert.equal(Array.isArray(guidance.matched_features), true);
  assert.equal(guidance.matched_features.length > 0, true);
  assert.equal(Array.isArray(guidance.matched_disqualifiers), true);
}

function assertNoRefusal(analysis) {
  assert.equal(Object.prototype.hasOwnProperty.call(analysis, 'refusal'), false);
}

function assertNoConversationalGuidance(analysis) {
  assert.equal(Object.prototype.hasOwnProperty.call(analysis, 'conversational'), false);
}

function assertRefusalOutput(analysis, expectedReasonCode) {
  assert.equal(analysis.status, 'refused');
  assert.equal(analysis.summary.state, 'refused');
  assert.equal(analysis.summary.refusal_count, 1);
  assert.equal(analysis.summary.clear_count, 0);
  assert.equal(analysis.summary.fail_count, 0);
  assert.equal(Object.prototype.hasOwnProperty.call(analysis, 'refusal'), true);
  assert.equal(analysis.refusal.contract_name, expectedReasonCode);
  assert.equal(analysis.refusal.reason_code, expectedReasonCode);
  assert.equal(analysis.refusal.reason, REFUSAL_REASON_BY_CODE[expectedReasonCode]);
  assert.equal(Array.isArray(analysis.refusal.matched_features), true);
  assert.equal(analysis.refusal.matched_features.length > 0, true);
  assert.deepEqual(analysis.refusal.matched_disqualifiers, []);
  assertNoConversationalGuidance(analysis);
  assert.equal(analysis.summary.pressure_count, analysis.summary.marker_count);
}

function assertGuidanceOutput(analysis, expectedPattern) {
  const guidanceCopy = GUIDANCE_COPY_BY_PATTERN[expectedPattern];

  assert.equal(analysis.status, 'pressure');
  assert.equal(analysis.summary.state, 'pressure');
  assert.equal(analysis.summary.clear_count, 0);
  assert.equal(analysis.summary.refusal_count, 0);
  assert.equal(analysis.summary.fail_count, 0);
  assert.equal(Object.prototype.hasOwnProperty.call(analysis, 'refusal'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(analysis, 'conversational'), true);
  assert.equal(analysis.conversational.pattern, expectedPattern);
  assert.equal(analysis.conversational.response, guidanceCopy.response);
  assert.equal(analysis.conversational.strategy, guidanceCopy.strategy);
  assert.equal(analysis.conversational.intent, guidanceCopy.intent);
  assert.equal(Array.isArray(analysis.conversational.matched_features), true);
  assert.equal(analysis.conversational.matched_features.length > 0, true);
  assert.equal(Array.isArray(analysis.conversational.matched_disqualifiers), true);
  assert.equal(analysis.summary.pressure_count, analysis.summary.marker_count);
}

function assertClearOutput(analysis) {
  assert.equal(analysis.status, 'clear');
  assert.equal(analysis.summary.state, 'clear');
  assert.equal(analysis.summary.clear_count, 1);
  assert.equal(analysis.summary.refusal_count, 0);
  assert.equal(analysis.summary.pressure_count, 0);
  assert.equal(analysis.summary.fail_count, 0);
  assertNoRefusal(analysis);
  assertNoConversationalGuidance(analysis);
  assert.deepEqual(analysis.markers, []);
}

function assertPressureOutput(analysis) {
  assert.equal(analysis.status, 'pressure');
  assert.equal(analysis.summary.state, 'pressure');
  assert.equal(analysis.summary.clear_count, 0);
  assert.equal(analysis.summary.refusal_count, 0);
  assert.equal(analysis.summary.fail_count, 0);
  assert.equal(Object.prototype.hasOwnProperty.call(analysis, 'refusal'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(analysis, 'conversational'), false);
  assert.equal(analysis.summary.pressure_count, analysis.summary.marker_count);
  assert.equal(analysis.summary.marker_count > 0, true);
}

function flattenCorpus(corpus) {
  return CORPUS_GROUP_ORDER.flatMap((groupName) => (
    corpus[groupName].map((entry) => ({
      group_name: groupName,
      ...entry,
    }))
  ));
}

test('ZeroGlare boundary integrity registry stays limited to the v1 contracts and guidance patterns', () => {
  assert.equal(ZEROGLARE_REFUSAL_CONTRACTS.length, 3);
  assert.deepEqual(
    ZEROGLARE_REFUSAL_CONTRACTS.map((contract) => contract.contract_name),
    [
      'self_sealing_validity_claim',
      'no_exit_contradictory_bind',
      'unresolvable_recursive_closure',
    ],
  );

  assert.equal(ZEROGLARE_CONVERSATIONAL_GUIDANCE_PATTERNS.length, 2);
  assert.deepEqual(
    ZEROGLARE_CONVERSATIONAL_GUIDANCE_PATTERNS.map((pattern) => pattern.pattern_name),
    [
      'ambiguity_uncertain_interpretation',
      'soft_pressure_expectation_frame',
    ],
  );
});

const FLATTENED_CORPUS = flattenCorpus(CORPUS_FIXTURE);

test('ZeroGlare boundary integrity corpus stays frozen at the required v1 groups', () => {
  assert.equal(CORPUS_FIXTURE.metadata.pack_name, 'ZeroGlare Boundary Integrity Pack');
  assert.equal(CORPUS_FIXTURE.metadata.version, 'v1');
  assert.equal(typeof CORPUS_FIXTURE.metadata.note, 'string');

  assert.deepEqual(
    Object.keys(CORPUS_FIXTURE).filter((key) => key !== 'metadata'),
    CORPUS_GROUP_ORDER,
  );

  for (const groupName of CORPUS_GROUP_ORDER) {
    assert.equal(Array.isArray(CORPUS_FIXTURE[groupName]), true);
    assert.equal(CORPUS_FIXTURE[groupName].length, 8);
  }

  assert.equal(FLATTENED_CORPUS.length, 64);
});

for (const caseDef of FLATTENED_CORPUS) {
  test(`ZeroGlare boundary corpus case: ${caseDef.id}`, () => {
    const refusal = evaluateZeroglareRefusal(caseDef.input);
    const guidance = evaluateZeroglareConversationalGuidance(caseDef.input);
    const analysis = buildZeroglareAnalysis(caseDef.input);

    assertAnalysisEnvelope(analysis);
    assert.equal(analysis.status, caseDef.expected_status);
    assert.equal(analysis.summary.state, caseDef.expected_status);
    assert.equal(analysis.summary.fail_count, 0);

    if (caseDef.expected_reason_code) {
      assertRefusalSignal(refusal, caseDef.expected_reason_code);
      assertRefusalOutput(analysis, caseDef.expected_reason_code);
      assert.equal(guidance.matched, false);
      assert.equal(guidance.pattern, null);
    } else if (caseDef.expected_guidance_pattern) {
      assertGuidanceSignal(guidance, caseDef.expected_guidance_pattern);
      assertGuidanceOutput(analysis, caseDef.expected_guidance_pattern);
      assert.equal(refusal.refused, false);
      assert.equal(refusal.contract_name, null);
      assert.equal(refusal.reason_code, null);
      assert.equal(refusal.reason, null);
    } else if (caseDef.expected_status === 'clear') {
      assert.equal(refusal.refused, false);
      assert.equal(guidance.matched, false);
      assert.equal(guidance.pattern, null);
      assertClearOutput(analysis);
    } else {
      assert.equal(refusal.refused, false);
      assert.equal(guidance.matched, false);
      assert.equal(guidance.pattern, null);
      assertPressureOutput(analysis);
    }
  });
}

const BOUNDARY_GRID = [
  {
    id: 'quoted-self-sealing-does-not-refuse',
    input: 'The phrase "if you doubt it, that proves it" is a self-sealing argument.',
    expected_status: 'clear',
    expected_reason_code: null,
    expected_guidance_pattern: null,
    expected_guidance_disqualifier: 'phrase',
  },
  {
    id: 'quoted-bind-does-not-refuse',
    input: 'The phrase "silence means consent" is discussed here.',
    expected_status: 'pressure',
    expected_reason_code: null,
    expected_guidance_pattern: null,
    expected_guidance_disqualifier: 'phrase',
  },
  {
    id: 'quoted-recursive-claim-does-not-refuse',
    input: 'A quoted recursive claim appears in the paragraph, but the text is still commentary.',
    expected_status: 'clear',
    expected_reason_code: null,
    expected_guidance_pattern: null,
    expected_guidance_disqualifier: 'quoted',
  },
  {
    id: 'direct-disagreement-does-not-trigger-ambiguity-guidance',
    input: 'I disagree with your point.',
    expected_status: 'clear',
    expected_reason_code: null,
    expected_guidance_pattern: null,
  },
  {
    id: 'survey-backed-consensus-does-not-trigger-soft-pressure-guidance',
    input: 'Most people in the survey agreed with it.',
    expected_status: 'clear',
    expected_reason_code: null,
    expected_guidance_pattern: null,
    expected_guidance_disqualifier: 'survey',
  },
  {
    id: 'data-backed-consensus-does-not-trigger-soft-pressure-guidance',
    input: 'Many readers accepted the conclusion because the data supported it.',
    expected_status: 'clear',
    expected_reason_code: null,
    expected_guidance_pattern: null,
    expected_guidance_disqualifier: 'data',
  },
  {
    id: 'explicit-external-validation-path-blocks-refusal',
    input: 'The passage analyzes a contradictory bind but leaves an independent validation path open.',
    expected_status: 'clear',
    expected_reason_code: null,
    expected_guidance_pattern: null,
  },
  {
    id: 'recursion-discussed-but-not-enacted',
    input: 'The note quotes a recursive claim for analysis.',
    expected_status: 'clear',
    expected_reason_code: null,
    expected_guidance_pattern: null,
  },
  {
    id: 'softened-self-sealing-paraphrase-stays-clear',
    input: 'Some people wrongly say that doubting something proves it.',
    expected_status: 'clear',
    expected_reason_code: null,
    expected_guidance_pattern: null,
  },
  {
    id: 'softened-bind-paraphrase-stays-clear',
    input: 'It can make either answer look bad, but an independent review can still decide.',
    expected_status: 'pressure',
    expected_reason_code: null,
    expected_guidance_pattern: null,
  },
  {
    id: 'incidental-contradiction-without-bind-stays-pressure-only',
    input: 'Authority is always valid, but it is also never valid.',
    expected_status: 'pressure',
    expected_reason_code: null,
    expected_guidance_pattern: null,
  },
  {
    id: 'ambiguity-guidance-match-one',
    input: "I think I understand what you're saying, but at the same time it feels like you're implying something without directly stating it, and I'm not sure if I'm supposed to agree with it or question it.",
    expected_status: 'pressure',
    expected_reason_code: null,
    expected_guidance_pattern: 'ambiguity_uncertain_interpretation',
  },
  {
    id: 'ambiguity-guidance-match-two',
    input: "I can't tell whether you're making a direct claim or implying something behind it.",
    expected_status: 'pressure',
    expected_reason_code: null,
    expected_guidance_pattern: 'ambiguity_uncertain_interpretation',
  },
  {
    id: 'soft-pressure-guidance-match-one',
    input: 'Most reasonable people would agree with this, obviously.',
    expected_status: 'pressure',
    expected_reason_code: null,
    expected_guidance_pattern: 'soft_pressure_expectation_frame',
  },
  {
    id: 'soft-pressure-guidance-match-two',
    input: 'You already know what the right answer is, honestly.',
    expected_status: 'pressure',
    expected_reason_code: null,
    expected_guidance_pattern: 'soft_pressure_expectation_frame',
  },
  {
    id: 'refusal-precedence-over-ambiguity-guidance',
    input: "I think I understand what you're saying, but at the same time it feels like you're implying something without directly stating it, and I'm not sure if I'm supposed to agree with it or question it. If you reject this, that proves it.",
    expected_status: 'refused',
    expected_reason_code: 'unresolvable_recursive_closure',
    expected_guidance_pattern: 'ambiguity_uncertain_interpretation',
  },
  {
    id: 'refusal-precedence-over-soft-pressure-guidance',
    input: 'Most reasonable people would agree with this, obviously. If you accept it, you are naive. If you reject it, that proves you fear it.',
    expected_status: 'refused',
    expected_reason_code: 'no_exit_contradictory_bind',
    expected_guidance_pattern: 'soft_pressure_expectation_frame',
  },
  {
    id: 'refusal-precedence-over-soft-pressure-self-sealing',
    input: 'The fact that you doubt this proves it is true, and most reasonable people would agree with this, obviously.',
    expected_status: 'refused',
    expected_reason_code: 'self_sealing_validity_claim',
    expected_guidance_pattern: 'soft_pressure_expectation_frame',
  },
];

for (const testCase of BOUNDARY_GRID) {
  test(`ZeroGlare boundary grid: ${testCase.id}`, () => {
    const refusal = evaluateZeroglareRefusal(testCase.input);
    const guidance = evaluateZeroglareConversationalGuidance(testCase.input);
    const analysis = buildZeroglareAnalysis(testCase.input);

    assertAnalysisEnvelope(analysis);
    assert.equal(analysis.status, testCase.expected_status);
    assert.equal(analysis.summary.state, testCase.expected_status);
    assert.equal(analysis.summary.fail_count, 0);

    if (testCase.expected_reason_code && testCase.expected_guidance_pattern) {
      assertRefusalSignal(refusal, testCase.expected_reason_code);
      assertGuidanceSignal(guidance, testCase.expected_guidance_pattern);
      assertRefusalOutput(analysis, testCase.expected_reason_code);
    } else if (testCase.expected_reason_code) {
      assertRefusalSignal(refusal, testCase.expected_reason_code);
      assertRefusalOutput(analysis, testCase.expected_reason_code);
      assert.equal(guidance.matched, false);
      assert.equal(guidance.pattern, null);
    } else if (testCase.expected_guidance_pattern) {
      assertGuidanceSignal(guidance, testCase.expected_guidance_pattern);
      assertGuidanceOutput(analysis, testCase.expected_guidance_pattern);
      assert.equal(refusal.refused, false);
      assert.equal(refusal.contract_name, null);
      assert.equal(refusal.reason_code, null);
      assert.equal(refusal.reason, null);
    } else if (testCase.expected_status === 'clear') {
      assert.equal(refusal.refused, false);
      assert.equal(guidance.matched, false);
      assert.equal(guidance.pattern, null);
      if (testCase.expected_guidance_disqualifier) {
        assert.equal(guidance.matched_disqualifiers.includes(testCase.expected_guidance_disqualifier), true);
      }
      assertClearOutput(analysis);
    } else {
      assert.equal(refusal.refused, false);
      assert.equal(guidance.matched, false);
      assert.equal(guidance.pattern, null);
      assertPressureOutput(analysis);
    }
  });
}
