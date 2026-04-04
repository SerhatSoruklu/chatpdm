'use strict';

/**
 * ZeroGlare Refusal Boundary Pack v1.
 *
 * This pack exists to prove boundary integrity for the three encoded refusal
 * contracts only. It is intentionally narrow. New refusal contracts must
 * extend this pack, not bypass it.
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
  buildZeroglareAnalysis,
} = require('../../src/modules/concepts/zeroglare-diagnostics');

const CORPUS_FIXTURE_PATH = path.resolve(
  __dirname,
  './fixtures/zeroglare-refusal-boundary.v1.json',
);
const CORPUS_FIXTURE = JSON.parse(fs.readFileSync(CORPUS_FIXTURE_PATH, 'utf8'));

const REFUSAL_REASON_BY_CONTRACT = Object.freeze({
  self_sealing_validity_claim: 'Input converts challenge or doubt into self-confirming evidence without an independent validation path.',
  no_exit_contradictory_bind: 'Input creates a contradictory bind in which all available response paths collapse into the same imposed conclusion.',
  unresolvable_recursive_closure: 'Input contains a recursive closure with no bounded exit path.',
});

const BOUNDARY_GRID = Object.freeze({
  self_sealing_validity_claim: Object.freeze({
    positive: [
      makeCase('direct doubt becomes proof', 'The fact that you doubt this proves it is true.', true),
      makeCase('doubt stays proof in an active sentence', 'When you doubt this, it proves it is true.', true),
      makeCase('disagreement stays proof', 'Anyone who disagrees only proves they do not understand.', true),
      makeCase('resistance stays evidence', 'Resistance is evidence that the mechanism is working.', true),
      makeCase('direct doubt remains proof in a longer clause', 'The fact that you doubt this proves it is true, and nothing else.', true),
      makeCase('doubt remains proof in a longer paragraph', 'When you doubt this, it proves it is true, inside a longer paragraph about method.', true),
      makeCase('disagreement remains proof with a location tag', 'Anyone who disagrees here only proves they do not understand.', true),
      makeCase('resistance remains evidence with procedural framing', 'Resistance is evidence that the mechanism is working, and the rest is procedural.', true),
      makeCase('direct doubt is still proof after a prefatory clause', 'Before the explanation ends, the fact that you doubt this proves it is true.', true),
      makeCase('doubt is still proof in a direct closing claim', 'The claim is direct: when you doubt this, it proves it is true, full stop.', true),
    ],
    negative: [
      makeCase('example language does not refuse', 'This is an example of a self-sealing argument.', false),
      makeCase('general discussion does not refuse', 'Some arguments treat disagreement as proof.', false),
      makeCase('quoted example does not refuse', 'The phrase "if you doubt it, that proves it" is a self-sealing argument.', false),
      makeCase('callout language does not refuse', 'People sometimes call this a self-sealing argument.', false),
      makeCase('descriptive rhetoric does not refuse', 'The note describes how doubt can be used as proof in rhetoric.', false),
      makeCase('pattern discussion does not refuse', 'A self-sealing argument can appear in debate, but this sentence only describes the pattern.', false),
      makeCase('doubt with evidence request does not refuse', 'If someone doubts it, they may ask for evidence instead of assuming it is true.', false),
      makeCase('discussion without enactment does not refuse', 'This passage discusses self-sealing claims without asserting one.', false),
      makeCase('quoted analysis does not refuse', 'The text quoted a self-sealing claim for analysis.', false),
      makeCase('independent validation blocks refusal', 'Independent validation remains available, so doubt does not become proof here.', false),
    ],
    edge: [
      makeCase('longer paragraph still refuses', 'Before the explanation ends, the fact that you doubt this proves it is true.', true),
      makeCase('wrapped method paragraph still refuses', 'When you doubt this, it proves it is true, inside a longer paragraph about method.', true),
      makeCase('surrounding paragraph stays procedural but still refuses', 'The fact that you doubt this proves it is true, and the surrounding paragraph stays procedural.', true),
      makeCase('explicit self-confirmation still refuses', 'The text states that anyone who disagrees only proves they do not understand.', true),
      makeCase('closed resistance claim still refuses', 'Resistance is evidence that the mechanism is working, as a closed claim.', true),
      makeCase('quoted example stays non-refusing', 'The phrase "if you doubt it, that proves it" is a self-sealing argument.', false),
      makeCase('softened wording stays non-refusing', 'Some people wrongly say that doubting something proves it.', false),
      makeCase('suggested proof stays non-refusing', 'The writer suggests that doubt can be treated as proof, but no claim is made here.', false),
      makeCase('quoted analysis stays non-refusing', 'The text quoted a self-sealing claim for analysis.', false),
      makeCase('independent validation stays non-refusing', 'Independent validation remains available, so doubt does not become proof here.', false),
    ],
  }),
  no_exit_contradictory_bind: Object.freeze({
    positive: [
      makeCase('accept reject bind', 'If you accept it, you are naive. If you reject it, that proves you fear it.', true),
      makeCase('silence objection bind', 'Silence means consent. Objection means defensiveness.', true),
      makeCase('agree disagree bind', 'Agree and you concede. Disagree and you confirm.', true),
      makeCase('longer accept reject bind', 'If you accept it, you are naive. If you reject it, that proves you fear it, and no exit is offered.', true),
      makeCase('longer silence objection bind', 'Silence means consent. Objection means defensiveness, with no neutral path.', true),
      makeCase('same conclusion imposed across both branches', 'Agree and you concede. Disagree and you confirm, inside the same imposed conclusion.', true),
      makeCase('accept reject bind in a longer paragraph', 'If you accept it, you are naive. If you reject it, that proves you fear it, inside a longer paragraph.', true),
      makeCase('silence objection bind with explanatory framing', 'Silence means consent. Objection means defensiveness, although the surrounding discussion is explanatory.', true),
      makeCase('agree disagree bind with extended framing', 'Agree and you concede. Disagree and you confirm, even when presented as part of a longer paragraph.', true),
      makeCase('accept reject bind with no alternate exit', 'If you accept it, you are naive. If you reject it, that proves you fear it. The text gives no alternate exit.', true),
    ],
    negative: [
      makeCase('false dilemma discussion does not refuse', 'This sentence describes a false dilemma.', false),
      makeCase('general bind discussion does not refuse', 'Some rhetoric creates binds where every answer looks bad.', false),
      makeCase('bind explanation does not refuse', 'The text explains how a bind can trap responses without actually creating one.', false),
      makeCase('independent review path blocks refusal', 'There are two options here, but an independent review path exists.', false),
      makeCase('revision path does not refuse', 'If you accept the proposal, you may prefer it; if you reject it, you may ask for revisions.', false),
      makeCase('contradictory setup discussion does not refuse', 'The paragraph notes a contradictory setup, but it does not force a single conclusion.', false),
      makeCase('dilemma discussion does not refuse', 'A dilemma is being discussed rather than enacted.', false),
      makeCase('defensive reading discussion does not refuse', 'The writer says objection can look defensive in some settings.', false),
      makeCase('quoted bind critique does not refuse', 'The note quotes a bind for critique.', false),
      makeCase('neutral exit path blocks refusal', 'There is disagreement, but a neutral exit path remains available.', false),
    ],
    edge: [
      makeCase('closed bind still refuses', 'If you accept it, you are naive. If you reject it, that proves you fear it. The framing stays closed.', true),
      makeCase('explanatory wrapping still refuses', 'Silence means consent. Objection means defensiveness, and the surrounding discussion is explanatory.', true),
      makeCase('longer paragraph still refuses', 'Agree and you concede. Disagree and you confirm, as part of a longer paragraph.', true),
      makeCase('bind analysis stays non-refusing', 'The phrase "silence means consent, objection means defensiveness" is being analyzed.', false),
      makeCase('generalization stays non-refusing', 'Some people wrongly frame disagreement as confirmation.', false),
      makeCase('bind explanation stays non-refusing', 'The note says a bind can force all answers to one outcome, but it does not itself do so.', false),
      makeCase('independent validation path stays non-refusing', 'Two answers are presented, and one can leave through an independent validation path.', false),
      makeCase('third party verification blocks refusal', 'If you accept it, you are naive. If you reject it, that proves you fear it, unless third party verification changes the result.', false),
      makeCase('neutral exit discussion stays non-refusing', 'The text discusses a contradictory bind and says a neutral exit path should exist.', false),
      makeCase('longer no-exit bind still refuses', 'Silence means consent. Objection means defensiveness, with no neutral path.', true),
    ],
  }),
  unresolvable_recursive_closure: Object.freeze({
    positive: [
      makeCase('rejecting the claim proves it', 'If you reject this, that proves it.', true),
      makeCase('questioning confirms the claim', 'Questioning it confirms it.', true),
      makeCase('stepping outside the frame loops back', 'Trying to step outside the frame keeps you inside the frame.', true),
      makeCase('longer loop closes itself', 'If you reject this, that proves it, and the claim closes the loop.', true),
      makeCase('questioning still confirms in a longer clause', 'Questioning it confirms it, and no exit is offered.', true),
      makeCase('frame structure still loops in a longer clause', 'Trying to step outside the frame keeps you inside the frame, by the text\'s own structure.', true),
      makeCase('rejecting the claim proves it in a longer paragraph', 'If you reject this, that proves it, inside a longer paragraph.', true),
      makeCase('questioning still confirms after surrounding explanation', 'Questioning it confirms it, even after surrounding explanation.', true),
      makeCase('frame loop remains closed', 'Trying to step outside the frame keeps you inside the frame, and the loop remains closed.', true),
      makeCase('direct recursive closure still refuses', 'If you reject this, that proves it, full stop.', true),
    ],
    negative: [
      makeCase('recursive logic discussion does not refuse', 'This statement talks about recursive logic.', false),
      makeCase('recursive closure definition does not refuse', 'A recursive closure happens when every interpretation loops back.', false),
      makeCase('recursive closure description does not refuse', 'The text describes a recursive closure rather than enacting one.', false),
      makeCase('mistake without proof does not refuse', 'If you reject this, the writer says that would be a mistake, but not proof.', false),
      makeCase('questioning without confirmation does not refuse', 'Questioning the claim may be productive, but it is not treated as confirmation.', false),
      makeCase('non-recursive exit path blocks refusal', 'The passage explains recursion while leaving a non-recursive exit path open.', false),
      makeCase('external validation path blocks refusal', 'There is an external validation path, so the loop is not closed.', false),
      makeCase('independent review path blocks refusal', 'An independent review path can still settle the matter.', false),
      makeCase('quoted recursive claim does not refuse', 'The sentence quoted a recursive claim for analysis.', false),
      makeCase('descriptive loop language does not refuse', 'The paragraph notes that every interpretation can loop back, but only as a description.', false),
    ],
    edge: [
      makeCase('longer paragraph still refuses', 'If you reject this, that proves it, inside a longer paragraph.', true),
      makeCase('confirmation still refuses with explanatory wrapping', 'Questioning it confirms it, and no exit is offered.', true),
      makeCase('frame loop still refuses with explanatory wrapping', 'Trying to step outside the frame keeps you inside the frame, by the text\'s own structure.', true),
      makeCase('quoted clause stays non-refusing', 'The clause "if you reject this, that proves it" appears inside a longer argument.', false),
      makeCase('loop discussion stays non-refusing', 'The passage says recursion can trap interpretation, but it does not enact the trap.', false),
      makeCase('independent validation path stays non-refusing', 'The note describes a loop and then provides an independent validation path.', false),
      makeCase('quoted recursive claim stays non-refusing', 'A quoted recursive claim appears in the paragraph, but the text is still commentary.', false),
      makeCase('third party verification blocks refusal', 'If you reject this, that proves it, unless third party verification changes the outcome.', false),
      makeCase('descriptive closure stays non-refusing', 'The claim is presented as an example of recursive closure rather than as a live claim.', false),
      makeCase('loop discussion stays non-refusing', 'The structure is discussed, but the text does not require accepting the loop.', false),
    ],
  }),
});

test('ZeroGlare refusal boundary pack keeps the v1 registry limited to three contracts', () => {
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

for (const [contractName, buckets] of Object.entries(BOUNDARY_GRID)) {
  for (const [bucketName, cases] of Object.entries(buckets)) {
    cases.forEach((testCase, index) => {
      test(
        `ZeroGlare boundary grid: ${contractName} ${bucketName} ${index + 1} - ${testCase.name}`,
        () => {
          const evaluation = evaluateZeroglareRefusal(testCase.input);
          const analysis = buildZeroglareAnalysis(testCase.input);

          assert.equal(analysis.resource, 'zeroglare');
          assert.equal(analysis.taxonomy_version, 'v1');
          assert.equal(Array.isArray(analysis.markers), true);
          assert.equal(Array.isArray(analysis.signals), true);
          assert.equal(Array.isArray(analysis.pipeline_position), true);

          if (testCase.refused) {
            assert.equal(evaluation.refused, true);
            assert.equal(evaluation.contract_name, contractName);
            assert.equal(evaluation.reason_code, contractName);
            assert.equal(evaluation.reason, REFUSAL_REASON_BY_CONTRACT[contractName]);
            assert.equal(Array.isArray(evaluation.matched_features), true);
            assert.equal(evaluation.matched_features.length > 0, true);
            assert.deepEqual(evaluation.matched_disqualifiers, []);
            assert.equal(Object.keys(evaluation).sort().join(','), [
              'contract_name',
              'matched_disqualifiers',
              'matched_features',
              'reason',
              'reason_code',
              'refused',
            ].join(','));

            assert.equal(analysis.status, 'refused');
            assert.equal(analysis.summary.state, 'refused');
            assert.equal(analysis.summary.refusal_count, 1);
            assert.equal(analysis.summary.clear_count, 0);
            assert.equal(analysis.summary.fail_count, 0);
            assert.equal(Object.prototype.hasOwnProperty.call(analysis, 'refusal'), true);
            assert.equal(analysis.refusal.contract_name, contractName);
            assert.equal(analysis.refusal.reason_code, contractName);
            assert.equal(analysis.refusal.reason, REFUSAL_REASON_BY_CONTRACT[contractName]);
            assert.deepEqual(analysis.refusal.matched_features, evaluation.matched_features);
            assert.deepEqual(analysis.refusal.matched_disqualifiers, evaluation.matched_disqualifiers);
            assert.equal(Object.keys(analysis.refusal).sort().join(','), [
              'contract_name',
              'matched_disqualifiers',
              'matched_features',
              'reason',
              'reason_code',
            ].join(','));
          } else {
            assert.equal(evaluation.refused, false);
            assert.equal(evaluation.contract_name, null);
            assert.equal(evaluation.reason_code, null);
            assert.equal(evaluation.reason, null);
            assert.deepEqual(evaluation.matched_features, []);
            assert.deepEqual(evaluation.matched_disqualifiers, []);
            assert.equal(Object.keys(evaluation).sort().join(','), [
              'contract_name',
              'matched_disqualifiers',
              'matched_features',
              'reason',
              'reason_code',
              'refused',
            ].join(','));

            assert.notEqual(analysis.status, 'refused');
            assert.equal(analysis.summary.state, analysis.status);
            assert.equal(analysis.summary.refusal_count, 0);
            assert.equal(Object.prototype.hasOwnProperty.call(analysis, 'refusal'), false);
          }
        },
      );
    });
  }
}

const CORPUS_CATEGORY_ORDER = [
  'clear',
  'pressure_but_allowed',
  'refused_self_sealing_validity_claim',
  'refused_no_exit_contradictory_bind',
  'refused_unresolvable_recursive_closure',
  'descriptive_discussion',
];

test('ZeroGlare refusal boundary corpus remains frozen', () => {
  assert.equal(CORPUS_FIXTURE.metadata.pack_name, 'ZeroGlare Refusal Boundary Pack');
  assert.equal(CORPUS_FIXTURE.metadata.version, 'v1');

  for (const categoryName of CORPUS_CATEGORY_ORDER) {
    const cases = CORPUS_FIXTURE[categoryName];
    assert.ok(Array.isArray(cases));

    for (const caseDef of cases) {
      const analysis = buildZeroglareAnalysis(caseDef.input);
      const expected = caseDef.expected;

      assert.equal(analysis.resource, 'zeroglare');
      assert.equal(analysis.taxonomy_version, 'v1');
      assert.equal(analysis.status, expected.status);
      assert.equal(analysis.summary.state, expected.status);
      assert.equal(Object.prototype.hasOwnProperty.call(analysis, 'refusal'), expected.status === 'refused');

      if (expected.status === 'refused') {
        assert.equal(analysis.summary.refusal_count, 1);
        assert.equal(analysis.refusal.reason_code, expected.reason_code);
        assert.equal(analysis.refusal.reason, expected.reason);
        assert.equal(analysis.refusal.contract_name, expected.reason_code);
        assert.equal(Array.isArray(analysis.refusal.matched_features), true);
        assert.equal(analysis.refusal.matched_features.length > 0, true);
        assert.deepEqual(analysis.refusal.matched_disqualifiers, []);
      } else {
        assert.equal(analysis.summary.refusal_count, 0);
        assert.equal(Object.prototype.hasOwnProperty.call(analysis, 'refusal'), false);
        if (Array.isArray(expected.markers)) {
          assert.deepEqual(analysis.markers, expected.markers);
        }
      }

      if (Array.isArray(expected.markers)) {
        assert.deepEqual(analysis.markers, expected.markers);
      }
    }
  }
});

function makeCase(name, input, refused) {
  return {
    name,
    input,
    refused,
  };
}
