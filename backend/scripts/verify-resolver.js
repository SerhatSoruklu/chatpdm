'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { resolveConceptQuery } = require('../src/modules/concepts');
const { buildPublicResolverResponse } = require('../src/modules/concepts/public-response-normalizer');
const {
  CONCEPT_SET_VERSION,
  CONTRACT_VERSION,
} = require('../src/modules/concepts/constants');
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
const ISO_8601_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})Z$/;

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

function verifyPublicResolverContextIsRequired() {
  const resolvedAuthority = resolveConceptQuery('authority');

  assert.throws(
    () => buildPublicResolverResponse(resolvedAuthority, {
      source: 'concepts.resolve',
      timestamp: resolvedAuthority.timestamp,
    }),
    /Public resolver response context\.traceId must be a non-empty string\./,
    'public resolver responses must require an explicit traceId context field.',
  );

  assert.throws(
    () => buildPublicResolverResponse(resolvedAuthority, {
      source: 'concepts.resolve',
      traceId: resolvedAuthority.traceId,
    }),
    /Public resolver response context\.timestamp must be a non-empty string\./,
    'public resolver responses must require an explicit timestamp context field.',
  );

  const rebuiltAuthority = buildPublicResolverResponse(resolvedAuthority, {
    source: 'concepts.resolve',
    traceId: resolvedAuthority.traceId,
    timestamp: resolvedAuthority.timestamp,
  });

  assert.equal(
    rebuiltAuthority.traceId,
    resolvedAuthority.traceId,
    'explicit traceId should be preserved by the public response builder.',
  );
  assert.equal(
    rebuiltAuthority.timestamp,
    resolvedAuthority.timestamp,
    'explicit timestamp should be preserved by the public response builder.',
  );
  process.stdout.write('PASS public_resolver_context_required\n');
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

function stripTransportMetadata(response) {
  // The Day 11 contract adds request/response metadata that may vary between calls.
  // Keep the resolver determinism proof focused on the contract-bearing payload.
  const stableResponse = { ...response };

  delete stableResponse.traceId;
  delete stableResponse.timestamp;

  return stableResponse;
}

function runCase(testCase) {
  const firstResult = resolveConceptQuery(testCase.input);
  const secondResult = resolveConceptQuery(testCase.input);
  const thirdResult = resolveConceptQuery(testCase.input);

  assert.equal(typeof firstResult.traceId, 'string', `${testCase.name} traceId must be a string.`);
  assert.ok(firstResult.traceId.length > 0, `${testCase.name} traceId must be non-empty.`);
  assert.match(firstResult.timestamp, ISO_8601_TIMESTAMP_PATTERN, `${testCase.name} timestamp format mismatch.`);
  assert.equal(typeof firstResult.deterministicKey, 'string', `${testCase.name} deterministicKey must be a string.`);
  assert.ok(firstResult.deterministicKey.length > 0, `${testCase.name} deterministicKey must be non-empty.`);
  assert.equal(firstResult.registryVersion, CONCEPT_SET_VERSION, `${testCase.name} registryVersion mismatch.`);
  assert.equal(firstResult.policyVersion, CONTRACT_VERSION, `${testCase.name} policyVersion mismatch.`);

  assert.equal(typeof secondResult.traceId, 'string', `${testCase.name} traceId must be a string on run 2.`);
  assert.ok(secondResult.traceId.length > 0, `${testCase.name} traceId must be non-empty on run 2.`);
  assert.match(secondResult.timestamp, ISO_8601_TIMESTAMP_PATTERN, `${testCase.name} timestamp format mismatch on run 2.`);
  assert.equal(typeof secondResult.deterministicKey, 'string', `${testCase.name} deterministicKey must be a string on run 2.`);
  assert.ok(secondResult.deterministicKey.length > 0, `${testCase.name} deterministicKey must be non-empty on run 2.`);
  assert.equal(secondResult.registryVersion, CONCEPT_SET_VERSION, `${testCase.name} registryVersion mismatch on run 2.`);
  assert.equal(secondResult.policyVersion, CONTRACT_VERSION, `${testCase.name} policyVersion mismatch on run 2.`);

  assert.equal(typeof thirdResult.traceId, 'string', `${testCase.name} traceId must be a string on run 3.`);
  assert.ok(thirdResult.traceId.length > 0, `${testCase.name} traceId must be non-empty on run 3.`);
  assert.match(thirdResult.timestamp, ISO_8601_TIMESTAMP_PATTERN, `${testCase.name} timestamp format mismatch on run 3.`);
  assert.equal(typeof thirdResult.deterministicKey, 'string', `${testCase.name} deterministicKey must be a string on run 3.`);
  assert.ok(thirdResult.deterministicKey.length > 0, `${testCase.name} deterministicKey must be non-empty on run 3.`);
  assert.equal(thirdResult.registryVersion, CONCEPT_SET_VERSION, `${testCase.name} registryVersion mismatch on run 3.`);
  assert.equal(thirdResult.policyVersion, CONTRACT_VERSION, `${testCase.name} policyVersion mismatch on run 3.`);

  assert.deepEqual(
    stripTransportMetadata(secondResult),
    stripTransportMetadata(firstResult),
    `${testCase.name} changed between run 1 and run 2.`,
  );
  assert.deepEqual(
    stripTransportMetadata(thirdResult),
    stripTransportMetadata(firstResult),
    `${testCase.name} changed between run 1 and run 3.`,
  );

  assert.equal(firstResult.normalizedQuery, testCase.expectedNormalizedQuery, `${testCase.name} normalizedQuery mismatch.`);
  assert.equal(firstResult.type, testCase.expectedType, `${testCase.name} response type mismatch.`);
  if (typeof testCase.expectedMethod === 'string') {
    assert.equal(firstResult.resolution.method, testCase.expectedMethod, `${testCase.name} resolution.method mismatch.`);
  }

  if (typeof testCase.expectedQueryType === 'string') {
    assert.equal(firstResult.queryType, testCase.expectedQueryType, `${testCase.name} queryType mismatch.`);
  }

  if (testCase.expectedType === 'VOCABULARY_DETECTED') {
    assert.equal(
      firstResult.finalState,
      testCase.expectedFinalState ?? 'refused',
      `${testCase.name} finalState mismatch.`,
    );
    assertSubset(firstResult.vocabulary, testCase.expectedVocabulary, `${testCase.name} vocabulary`);
    assert.equal(
      Object.prototype.hasOwnProperty.call(firstResult, 'answer'),
      false,
      `${testCase.name} must not expose a concept answer payload.`,
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(firstResult, 'rejection'),
      false,
      `${testCase.name} must not expose rejection registry payload.`,
    );
  } else {
    assert.equal(
      Object.prototype.hasOwnProperty.call(firstResult, 'vocabulary'),
      false,
      `${testCase.name} must not expose a vocabulary payload.`,
    );
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
  process.stdout.write('PASS empty_string_rejected_before_product_response\n');

  verifyReservedOverlayFieldsAreRejected();
  verifyPublicResolverContextIsRequired();

  const cases = loadCases();
  cases.forEach(runCase);
  process.stdout.write(`ChatPDM runtime proof passed for ${cases.length + 1} cases.\n`);
}

main();
