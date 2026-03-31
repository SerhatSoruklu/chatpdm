'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { resolveConceptQuery } = require('../src/modules/concepts');
const { getConceptRuntimeGovernanceState } = require('../src/modules/concepts/concept-validation-state-loader');
const { validateConceptShape } = require('../src/modules/concepts/concept-loader');

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

function loadConceptFixture(conceptId) {
  return JSON.parse(
    fs.readFileSync(path.resolve(__dirname, `../../data/concepts/${conceptId}.json`), 'utf8'),
  );
}

function assertReadingRegistersShell(registers, expectedConceptId, expectedConceptVersion, answer, context) {
  assert.notEqual(registers, null, `${context} is missing.`);
  assert.equal(registers.readOnly, true, `${context}.readOnly mismatch.`);
  assert.equal(registers.canonicalBinding.conceptId, expectedConceptId, `${context}.canonicalBinding.conceptId mismatch.`);
  assert.equal(
    registers.canonicalBinding.conceptVersion,
    expectedConceptVersion,
    `${context}.canonicalBinding.conceptVersion mismatch.`,
  );
  assert.match(registers.canonicalBinding.canonicalHash, /^[a-f0-9]{64}$/, `${context}.canonicalBinding.canonicalHash mismatch.`);

  for (const modeName of ['standard', 'simplified', 'formal']) {
    const mode = registers[modeName];

    assert.notEqual(mode, null, `${context}.${modeName} is missing.`);
    assert.equal(typeof mode.shortDefinition, 'string', `${context}.${modeName}.shortDefinition mismatch.`);
    assert.equal(typeof mode.coreMeaning, 'string', `${context}.${modeName}.coreMeaning mismatch.`);
    assert.equal(typeof mode.fullDefinition, 'string', `${context}.${modeName}.fullDefinition mismatch.`);
  }

  assert.equal(registers.standard.shortDefinition, answer.shortDefinition, `${context}.standard.shortDefinition mismatch.`);
  assert.equal(registers.standard.coreMeaning, answer.coreMeaning, `${context}.standard.coreMeaning mismatch.`);
  assert.equal(registers.standard.fullDefinition, answer.fullDefinition, `${context}.standard.fullDefinition mismatch.`);
}

function assertGovernanceStateShell(governanceState, expectedConceptId, context) {
  assert.notEqual(governanceState, null, `${context} is missing.`);
  assert.equal(governanceState.trace.conceptId, expectedConceptId, `${context}.trace.conceptId mismatch.`);
  assert.equal(typeof governanceState.available, 'boolean', `${context}.available mismatch.`);
  assert.equal(typeof governanceState.isBlocked, 'boolean', `${context}.isBlocked mismatch.`);
  assert.equal(
    typeof governanceState.isStructurallyIncomplete,
    'boolean',
    `${context}.isStructurallyIncomplete mismatch.`,
  );
  assert.equal(typeof governanceState.isFullyValidated, 'boolean', `${context}.isFullyValidated mismatch.`);
  assert.equal(typeof governanceState.isActionable, 'boolean', `${context}.isActionable mismatch.`);

  const expectedGovernanceState = getConceptRuntimeGovernanceState(expectedConceptId);
  assert.deepEqual(
    governanceState,
    expectedGovernanceState,
    `${context} mismatch against validator-derived runtime governance state.`,
  );
}

function verifyReservedOverlayFieldsAreRejected() {
  const authority = loadConceptFixture('authority');
  const withDerivedExplanationOverlays = {
    ...authority,
    derivedExplanationOverlays: {},
  };
  const withDerivedExplanationOverlayContract = {
    ...authority,
    derivedExplanationOverlayContract: {},
  };

  assert.throws(
    () => validateConceptShape(withDerivedExplanationOverlays, authority.conceptId),
    /must not declare "derivedExplanationOverlays"/,
    'authored packets must reject derivedExplanationOverlays.',
  );

  assert.throws(
    () => validateConceptShape(withDerivedExplanationOverlayContract, authority.conceptId),
    /must not declare "derivedExplanationOverlayContract"/,
    'authored packets must reject derivedExplanationOverlayContract.',
  );

  process.stdout.write('PASS legacy_overlay_fields_rejected\n');
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
    assertReadingRegistersShell(
      firstResult.answer.registers,
      testCase.expectedConceptId,
      firstResult.resolution.conceptVersion,
      firstResult.answer,
      `${testCase.name} registers`,
    );
    assertGovernanceStateShell(
      firstResult.answer.governanceState,
      testCase.expectedConceptId,
      `${testCase.name} governanceState`,
    );
  }

  if (testCase.expectedType === 'ambiguous_match') {
    assert.deepEqual(
      firstResult.candidates.map((candidate) => candidate.conceptId),
      testCase.expectedCandidates,
      `${testCase.name} candidate ordering mismatch.`,
    );
  }

  if (testCase.expectedType === 'rejected_concept') {
    assert.equal(
      firstResult.resolution.conceptId,
      testCase.expectedConceptId,
      `${testCase.name} rejected conceptId mismatch.`,
    );
    assertSubset(firstResult.rejection, testCase.expectedRejection, `${testCase.name} rejection`);
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

  verifyReservedOverlayFieldsAreRejected();

  const cases = loadCases();
  cases.forEach(runCase);
  process.stdout.write(`ChatPDM runtime proof passed for ${cases.length + 1} cases.\n`);
}

main();
