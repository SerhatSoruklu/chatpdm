'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { classifyVocabulary } = require('../../src/vocabulary/vocabulary-classifier.ts');
const { normalizeVocabularyInput } = require('../../src/vocabulary/vocabulary-normalizer.ts');
const { classifyVocabularySurface } = require('../../src/vocabulary/vocabulary-service.ts');

test('classifyVocabulary returns a matched result for an exact vocabulary term', () => {
  const result = classifyVocabulary('obligation');

  assert.deepEqual(result, {
    input: 'obligation',
    normalizedInput: 'obligation',
    matched: true,
    term: 'obligation',
    classification: 'legal_term',
    relations: {
      closestConcept: 'duty',
      contrastWith: ['responsibility'],
      relatedConcepts: ['duty'],
    },
    systemFlags: {
      isCoreConcept: false,
      usableInResolver: false,
      reasoningAllowed: false,
    },
  });
});

test('classifyVocabulary returns a matched result for liability', () => {
  const result = classifyVocabulary('liability');

  assert.deepEqual(result, {
    input: 'liability',
    normalizedInput: 'liability',
    matched: true,
    term: 'liability',
    classification: 'legal_term',
    relations: {
      contrastWith: ['responsibility', 'violation'],
      relatedConcepts: ['responsibility', 'violation'],
    },
    systemFlags: {
      isCoreConcept: false,
      usableInResolver: false,
      reasoningAllowed: false,
    },
  });
});

test('classifyVocabulary returns a matched result for jurisdiction', () => {
  const result = classifyVocabulary('jurisdiction');

  assert.deepEqual(result, {
    input: 'jurisdiction',
    normalizedInput: 'jurisdiction',
    matched: true,
    term: 'jurisdiction',
    classification: 'legal_term',
    relations: null,
    systemFlags: {
      isCoreConcept: false,
      usableInResolver: false,
      reasoningAllowed: false,
    },
  });
});

test('classifyVocabulary returns an unmatched result for an unknown term', () => {
  const result = classifyVocabulary('banana-state-actor');

  assert.deepEqual(result, {
    input: 'banana-state-actor',
    normalizedInput: 'banana-state-actor',
    matched: false,
    term: null,
    classification: null,
    relations: null,
    systemFlags: {
      isCoreConcept: false,
      usableInResolver: false,
      reasoningAllowed: false,
    },
  });
});

test('normalizeVocabularyInput trims, lowercases, and collapses whitespace', () => {
  assert.equal(
    normalizeVocabularyInput('   LiAbiLiTy   OF   CARE   '),
    'liability of care',
  );
});

test('systemFlags stay hard-false for matched and unmatched results', () => {
  const matched = classifyVocabulary('liability');
  const unmatched = classifyVocabulary('unknown term');

  assert.deepEqual(matched.systemFlags, {
    isCoreConcept: false,
    usableInResolver: false,
    reasoningAllowed: false,
  });
  assert.deepEqual(unmatched.systemFlags, {
    isCoreConcept: false,
    usableInResolver: false,
    reasoningAllowed: false,
  });
});

test('relations remain optional and stable across entries', () => {
  const withRelations = classifyVocabulary('liability');
  const withoutRelations = classifyVocabulary('jurisdiction');

  assert.deepEqual(withRelations.relations, {
    contrastWith: ['responsibility', 'violation'],
    relatedConcepts: ['responsibility', 'violation'],
  });
  assert.equal(withoutRelations.relations, null);
});

test('service wrapper returns the stable classifier contract unchanged', () => {
  const result = classifyVocabularySurface('  JuRiSdIcTiOn  ');

  assert.deepEqual(result, {
    input: '  JuRiSdIcTiOn  ',
    normalizedInput: 'jurisdiction',
    matched: true,
    term: 'jurisdiction',
    classification: 'legal_term',
    relations: null,
    systemFlags: {
      isCoreConcept: false,
      usableInResolver: false,
      reasoningAllowed: false,
    },
  });
});
