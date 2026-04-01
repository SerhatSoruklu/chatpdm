/// <reference path="./commonjs-globals.d.ts" />

import type { VocabularyClassificationResult } from './vocabulary.types.ts';

const { classifyVocabulary } = require('./vocabulary-classifier.ts');

function classifyVocabularySurface(input: string): VocabularyClassificationResult {
  return classifyVocabulary(input);
}

module.exports = {
  classifyVocabularySurface,
};
