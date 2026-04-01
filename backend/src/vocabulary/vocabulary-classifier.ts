/// <reference path="./commonjs-globals.d.ts" />

import type {
  VocabularyClassificationResult,
  VocabularyEntry,
  VocabularyRelations,
} from './vocabulary.types.ts';

const {
  VOCABULARY_ENTRIES,
  VOCABULARY_SYSTEM_FLAGS,
} = require('./vocabulary.constants.ts');
const { normalizeVocabularyInput } = require('./vocabulary-normalizer.ts');

const VOCABULARY_ENTRY_INDEX = new Map<string, VocabularyEntry>(
  VOCABULARY_ENTRIES.map((entry) => [entry.term, entry]),
);

function cloneRelations(relations?: VocabularyRelations | null): VocabularyRelations | null {
  if (!relations) {
    return null;
  }

  return {
    ...(relations.closestConcept ? { closestConcept: relations.closestConcept } : {}),
    ...(relations.contrastWith ? { contrastWith: [...relations.contrastWith] } : {}),
    ...(relations.relatedConcepts ? { relatedConcepts: [...relations.relatedConcepts] } : {}),
  };
}

function buildUnmatchedResult(
  input: string,
  normalizedInput: string,
): VocabularyClassificationResult {
  return {
    input,
    normalizedInput,
    matched: false,
    term: null,
    classification: null,
    relations: null,
    systemFlags: VOCABULARY_SYSTEM_FLAGS,
  };
}

function classifyVocabulary(input: string): VocabularyClassificationResult {
  const normalizedInput = normalizeVocabularyInput(input);
  const matchedEntry = VOCABULARY_ENTRY_INDEX.get(normalizedInput) ?? null;

  if (!matchedEntry) {
    return buildUnmatchedResult(input, normalizedInput);
  }

  return {
    input,
    normalizedInput,
    matched: true,
    term: matchedEntry.term,
    classification: matchedEntry.classification,
    relations: cloneRelations(matchedEntry.relations),
    systemFlags: VOCABULARY_SYSTEM_FLAGS,
  };
}

module.exports = {
  classifyVocabulary,
};
