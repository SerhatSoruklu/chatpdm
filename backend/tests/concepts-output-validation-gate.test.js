'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ADMISSION_STATES,
} = require('../src/modules/concepts/admission-gate');
const {
  resolveFromAdmissionState,
} = require('../src/modules/concepts/resolution-engine');
const {
  validateAndExposeOutput,
} = require('../src/modules/concepts/output-validation-gate');

function validateOutcome(resolutionOutput, expectedState, expectedType, context) {
  const finalOutput = validateAndExposeOutput(resolutionOutput);

  assert.equal(finalOutput.state, expectedState, `${context}.state mismatch.`);
  assert.equal(finalOutput.type, expectedType, `${context}.type mismatch.`);

  return finalOutput;
}

test('live resolution validates as valid', () => {
  const resolutionOutput = resolveFromAdmissionState({
    admission_state: ADMISSION_STATES.LIVE,
    normalized_query: 'authority',
  });

  const finalOutput = validateOutcome(
    resolutionOutput,
    'valid',
    'LIVE_RESOLUTION',
    'live resolution output',
  );

  assert.equal(finalOutput.payload.type, 'concept_match');
  assert.equal(finalOutput.payload.answer.itemType, 'core_concept');
});

test('visible inspection validates as partial', () => {
  const resolutionOutput = resolveFromAdmissionState({
    admission_state: ADMISSION_STATES.VISIBLE_ONLY,
    normalized_query: 'agreement',
  });

  const finalOutput = validateOutcome(
    resolutionOutput,
    'partial',
    'VISIBLE_INSPECTION',
    'visible inspection output',
  );

  assert.equal(finalOutput.payload.conceptId, 'agreement');
  assert.equal(finalOutput.payload.itemType, 'core_concept');
});

test('vocabulary classification validates as degraded', () => {
  const resolutionOutput = resolveFromAdmissionState({
    admission_state: ADMISSION_STATES.NOT_A_CONCEPT,
    normalized_query: 'mens rea',
  });

  const finalOutput = validateOutcome(
    resolutionOutput,
    'degraded',
    'VOCAB_CLASSIFICATION',
    'vocabulary classification output',
  );

  assert.equal(finalOutput.payload.recognized, true);
  assert.equal(finalOutput.payload.type, 'vocab');
});

test('refusal outputs stay refused', () => {
  const resolutionOutput = resolveFromAdmissionState({
    admission_state: ADMISSION_STATES.REJECTED,
    normalized_query: 'defeasibility',
  });

  const finalOutput = validateOutcome(
    resolutionOutput,
    'refused',
    'STRUCTURAL_REJECTION',
    'structural rejection output',
  );

  assert.equal(finalOutput.payload.type, 'rejected_concept');
  assert.equal(finalOutput.payload.resolution.method, 'rejection_registry');
});
