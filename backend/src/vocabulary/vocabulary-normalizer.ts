/// <reference path="./commonjs-globals.d.ts" />

function normalizeVocabularyInput(input: string): string {
  if (typeof input !== 'string') {
    throw new TypeError('Expected vocabulary input to be a string.');
  }

  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

module.exports = {
  normalizeVocabularyInput,
};
