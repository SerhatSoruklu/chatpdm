/// <reference path="./commonjs-globals.d.ts" />

import type {
  VocabularyEntry,
  VocabularySystemFlags,
} from './vocabulary.types.ts';

const VOCABULARY_SYSTEM_FLAGS: VocabularySystemFlags = Object.freeze({
  isCoreConcept: false,
  usableInResolver: false,
  reasoningAllowed: false,
});

const VOCABULARY_ENTRIES: readonly VocabularyEntry[] = Object.freeze([
  Object.freeze({
    term: 'obligation',
    classification: 'legal_term',
    relations: Object.freeze({
      closestConcept: 'duty',
      contrastWith: Object.freeze(['responsibility']),
      relatedConcepts: Object.freeze(['duty']),
    }),
  }),
  Object.freeze({
    term: 'liability',
    classification: 'legal_term',
    relations: Object.freeze({
      contrastWith: Object.freeze(['responsibility', 'violation']),
      relatedConcepts: Object.freeze(['responsibility', 'violation']),
    }),
  }),
  Object.freeze({
    term: 'jurisdiction',
    classification: 'legal_term',
  }),
]);

module.exports = {
  VOCABULARY_ENTRIES,
  VOCABULARY_SYSTEM_FLAGS,
};
