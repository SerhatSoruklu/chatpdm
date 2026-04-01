'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { classifyVocabulary } = require('../../src/vocabulary/vocabulary-classifier.ts');

const freezeFixturePath = path.resolve(
  __dirname,
  './fixtures/vocabulary-classification.freeze.json',
);
const freezeFixture = JSON.parse(fs.readFileSync(freezeFixturePath, 'utf8'));

test('vocabulary classification freeze: obligation', () => {
  assert.deepEqual(classifyVocabulary('obligation'), freezeFixture.obligation);
});

test('vocabulary classification freeze: liability', () => {
  assert.deepEqual(classifyVocabulary('liability'), freezeFixture.liability);
});

test('vocabulary classification freeze: jurisdiction', () => {
  assert.deepEqual(classifyVocabulary('jurisdiction'), freezeFixture.jurisdiction);
});

test('vocabulary classification freeze: unmatched term', () => {
  assert.deepEqual(classifyVocabulary('invented legal moonword'), freezeFixture.unknown);
});
