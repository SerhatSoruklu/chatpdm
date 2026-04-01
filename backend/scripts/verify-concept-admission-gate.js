'use strict';

const assert = require('node:assert/strict');

const {
  resolveAdmissionState,
  ADMISSION_STATES,
} = require('../src/modules/concepts/admission-gate');
const {
  recognizeLegalVocabulary,
} = require('../src/modules/legal-vocabulary');

function verifyExactAdmissionStates() {
  const cases = [
    ['authority', null, ADMISSION_STATES.LIVE],
    ['law', null, ADMISSION_STATES.LIVE],
    ['agreement', null, ADMISSION_STATES.VISIBLE_ONLY],
    ['commitment', recognizeLegalVocabulary('commitment'), ADMISSION_STATES.NOT_A_CONCEPT],
    ['promise', recognizeLegalVocabulary('promise'), ADMISSION_STATES.NOT_A_CONCEPT],
    ['undertaking', recognizeLegalVocabulary('undertaking'), ADMISSION_STATES.NOT_A_CONCEPT],
    ['breach', recognizeLegalVocabulary('breach'), ADMISSION_STATES.NOT_A_CONCEPT],
    ['obligation', recognizeLegalVocabulary('obligation'), ADMISSION_STATES.NOT_A_CONCEPT],
    ['liability', recognizeLegalVocabulary('liability'), ADMISSION_STATES.NOT_A_CONCEPT],
    ['defeasibility', recognizeLegalVocabulary('defeasibility'), ADMISSION_STATES.REJECTED],
    ['jurisdiction', recognizeLegalVocabulary('jurisdiction'), ADMISSION_STATES.NOT_A_CONCEPT],
    ['mens rea', recognizeLegalVocabulary('mens rea'), ADMISSION_STATES.NOT_A_CONCEPT],
    ['burden of proof', recognizeLegalVocabulary('burden of proof'), ADMISSION_STATES.NOT_A_CONCEPT],
    ['public authority', recognizeLegalVocabulary('public authority'), ADMISSION_STATES.NOT_A_CONCEPT],
    ['invented legal moonword', recognizeLegalVocabulary('invented legal moonword'), ADMISSION_STATES.NOT_A_CONCEPT],
  ];

  cases.forEach(([query, vocabularyRecognition, expected]) => {
    assert.deepEqual(
      resolveAdmissionState(query, vocabularyRecognition),
      { admission_state: expected },
      `${query} admission state mismatch.`,
    );
  });

  process.stdout.write('PASS concept_admission_gate_exact_states\n');
}

function verifyRejectedPrecedence() {
  assert.deepEqual(
    resolveAdmissionState('defeasibility', {
      recognized: true,
      type: 'vocab',
      classification: 'rejected_candidate',
    }),
    { admission_state: ADMISSION_STATES.REJECTED },
    'rejected concepts must still win before vocabulary classification when the concept remains rejected.',
  );

  process.stdout.write('PASS concept_admission_gate_rejected_precedence\n');
}

function verifyNoUpgradeWithoutExactMatch() {
  assert.deepEqual(
    resolveAdmissionState('authorit', {
      recognized: false,
      type: 'unknown',
    }),
    { admission_state: ADMISSION_STATES.NOT_A_CONCEPT },
    'near-match input must not be upgraded to LIVE.',
  );

  assert.deepEqual(
    resolveAdmissionState('responsibility duty', {
      recognized: false,
      type: 'unknown',
    }),
    { admission_state: ADMISSION_STATES.NOT_A_CONCEPT },
    'mixed unmatched input must not be upgraded by admission gate.',
  );

  assert.deepEqual(
    resolveAdmissionState('breach of contract', recognizeLegalVocabulary('breach of contract')),
    { admission_state: ADMISSION_STATES.NOT_A_CONCEPT },
    'unanchored interaction-layer breach phrasing must remain NOT_A_CONCEPT.',
  );

  process.stdout.write('PASS concept_admission_gate_no_upgrade_without_exact_match\n');
}

function verifyInputContracts() {
  assert.throws(
    () => resolveAdmissionState('What Is Authority'),
    /already-normalized query value/,
    'admission gate should reject unnormalized input.',
  );

  assert.throws(
    () => resolveAdmissionState('authority', {
      recognized: true,
      type: 'unknown',
      classification: 'derived',
    }),
    /Recognized vocabulary must declare type "vocab"/,
    'admission gate should reject invalid vocabulary shape.',
  );

  process.stdout.write('PASS concept_admission_gate_input_contract\n');
}

function main() {
  verifyExactAdmissionStates();
  verifyRejectedPrecedence();
  verifyNoUpgradeWithoutExactMatch();
  verifyInputContracts();
  process.stdout.write('Concept admission gate verification passed.\n');
}

main();
