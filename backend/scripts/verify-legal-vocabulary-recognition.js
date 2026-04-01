'use strict';

const assert = require('node:assert/strict');

const {
  loadLegalVocabularyRegistry,
  recognizeLegalVocabulary,
} = require('../src/modules/legal-vocabulary');

function verifyRegistryLoads() {
  const registry = loadLegalVocabularyRegistry();

  assert.equal(registry.available, true, 'legal vocabulary registry should load.');
  assert.equal(registry.totalTerms >= 1000, true, 'legal vocabulary registry should contain at least 1000 unique terms.');
  assert.equal(
    typeof registry.countsByClassification.derived,
    'number',
    'derived classification count missing.',
  );
  assert.equal(
    typeof registry.countsByClassification.procedural,
    'number',
    'procedural classification count missing.',
  );
  assert.equal(
    typeof registry.countsByClassification.carrier,
    'number',
    'carrier classification count missing.',
  );
  assert.equal(
    typeof registry.countsByClassification.rejected_candidate,
    'number',
    'rejected_candidate classification count missing.',
  );
  assert.equal(
    typeof registry.countsByClassification.unknown_structure,
    'number',
    'unknown_structure classification count missing.',
  );

  process.stdout.write('PASS legal_vocabulary_registry_loaded\n');
}

function verifyRecognitionCases() {
  const cases = [
    ['mens rea', { recognized: true, type: 'vocab', classification: 'derived' }],
    ['burden of proof', { recognized: true, type: 'vocab', classification: 'procedural' }],
    ['court', { recognized: true, type: 'vocab', classification: 'derived' }],
    ['property', { recognized: true, type: 'vocab', classification: 'carrier' }],
    ['commitment', { recognized: true, type: 'vocab', classification: 'derived' }],
    ['promise', { recognized: true, type: 'vocab', classification: 'derived' }],
    ['undertaking', { recognized: true, type: 'vocab', classification: 'derived' }],
    ['breach', { recognized: true, type: 'vocab', classification: 'derived' }],
    ['liability', { recognized: true, type: 'vocab', classification: 'rejected_candidate' }],
    ['defeasibility', { recognized: true, type: 'vocab', classification: 'rejected_candidate' }],
    ['scope', { recognized: true, type: 'vocab', classification: 'unknown_structure' }],
    ['authority', { recognized: false, type: 'unknown' }],
    ['violation', { recognized: false, type: 'unknown' }],
    ['invented legal moonword', { recognized: false, type: 'unknown' }],
  ];

  cases.forEach(([query, expected]) => {
    const actual = recognizeLegalVocabulary(query);
    assert.deepEqual(actual, expected, `${query} recognition mismatch.`);
  });

  process.stdout.write('PASS legal_vocabulary_recognition_cases\n');
}

function verifyNormalizedInputContract() {
  assert.throws(
    () => recognizeLegalVocabulary('What Is Authority'),
    /already-normalized query value/,
    'recognizer should reject unnormalized input.',
  );

  process.stdout.write('PASS legal_vocabulary_normalized_input_contract\n');
}

function main() {
  verifyRegistryLoads();
  verifyRecognitionCases();
  verifyNormalizedInputContract();
  process.stdout.write('Legal vocabulary recognition verification passed.\n');
}

main();
