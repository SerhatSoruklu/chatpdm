'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { resolveConceptQuery } = require('../src/modules/concepts');

const fixturePath = path.resolve(
  __dirname,
  '../../tests/runtime/fixtures/phase-7-5-cases.json',
);
const comparisonFixturePath = path.resolve(
  __dirname,
  '../../tests/runtime/fixtures/phase-11-comparison-cases.json',
);

function loadCases() {
  return [
    ...JSON.parse(fs.readFileSync(fixturePath, 'utf8')),
    ...JSON.parse(fs.readFileSync(comparisonFixturePath, 'utf8')),
  ];
}

function assertSubset(actualValue, expectedValue, context) {
  assert.notEqual(actualValue, null, `${context} is missing.`);

  for (const [key, value] of Object.entries(expectedValue)) {
    const actualField = actualValue[key];

    if (Array.isArray(value)) {
      assert.ok(Array.isArray(actualField), `${context}.${key} should be an array.`);
      assert.equal(actualField.length, value.length, `${context}.${key} length mismatch.`);
      value.forEach((expectedItem, index) => {
        if (expectedItem && typeof expectedItem === 'object' && !Array.isArray(expectedItem)) {
          assertSubset(actualField[index], expectedItem, `${context}.${key}[${index}]`);
          return;
        }

        assert.deepEqual(actualField[index], expectedItem, `${context}.${key}[${index}] mismatch.`);
      });
      continue;
    }

    if (value && typeof value === 'object') {
      assertSubset(actualField, value, `${context}.${key}`);
      continue;
    }

    assert.equal(actualField, value, `${context}.${key} mismatch.`);
  }
}

function runCase(testCase) {
  const firstResult = resolveConceptQuery(testCase.input);
  const secondResult = resolveConceptQuery(testCase.input);
  const thirdResult = resolveConceptQuery(testCase.input);

  assert.deepEqual(secondResult, firstResult, `${testCase.name} changed between run 1 and run 2.`);
  assert.deepEqual(thirdResult, firstResult, `${testCase.name} changed between run 1 and run 3.`);

  assert.equal(firstResult.normalizedQuery, testCase.expectedNormalizedQuery, `${testCase.name} normalizedQuery mismatch.`);
  assert.equal(firstResult.type, testCase.expectedType, `${testCase.name} response type mismatch.`);
  if (typeof testCase.expectedMethod === 'string') {
    assert.equal(firstResult.resolution.method, testCase.expectedMethod, `${testCase.name} resolution.method mismatch.`);
  }

  if (typeof testCase.expectedQueryType === 'string') {
    assert.equal(firstResult.queryType, testCase.expectedQueryType, `${testCase.name} queryType mismatch.`);
  }

  if (testCase.expectedInterpretation === null) {
    assert.equal(firstResult.interpretation, null, `${testCase.name} interpretation should be null.`);
  } else if (testCase.expectedInterpretation) {
    assertSubset(firstResult.interpretation, testCase.expectedInterpretation, `${testCase.name} interpretation`);
  }

  if (testCase.expectedType === 'concept_match') {
    assert.equal(
      firstResult.resolution.conceptId,
      testCase.expectedConceptId,
      `${testCase.name} conceptId mismatch.`,
    );
  }

  if (testCase.expectedType === 'ambiguous_match') {
    assert.deepEqual(
      firstResult.candidates.map((candidate) => candidate.conceptId),
      testCase.expectedCandidates,
      `${testCase.name} candidate ordering mismatch.`,
    );
  }

  if (testCase.expectedType === 'no_exact_match') {
    const actualSuggestions = firstResult.suggestions.map((suggestion) => ({
      conceptId: suggestion.conceptId,
      reason: suggestion.reason,
    }));

    assert.deepEqual(
      actualSuggestions,
      testCase.expectedSuggestions,
      `${testCase.name} suggestions mismatch.`,
    );
  }

  if (testCase.expectedType === 'comparison') {
    assertSubset(firstResult.comparison, testCase.expectedComparison, `${testCase.name} comparison`);
  }

  process.stdout.write(`PASS ${testCase.name}\n`);
}

function main() {
  assert.throws(
    () => resolveConceptQuery(''),
    /non-empty string/,
    'empty string input should be rejected before product response generation.',
  );
  process.stdout.write('PASS empty_string_invalid_input\n');

  const cases = loadCases();
  cases.forEach(runCase);
  process.stdout.write(`ChatPDM runtime proof passed for ${cases.length + 1} cases.\n`);
}

main();
