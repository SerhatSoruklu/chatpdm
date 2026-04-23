'use strict';

const assert = require('node:assert/strict');

const {
  ADMISSION_STATES,
  resolveFromAdmissionState,
  RESOLUTION_ENGINE_TYPES,
} = require('../src/modules/concepts/resolution-engine');
const {
  FINAL_OUTPUT_STATES,
  validateAndExposeOutput,
} = require('../src/modules/concepts/output-validation-gate');

function verifyValidStateMapping() {
  const liveResult = resolveFromAdmissionState({
    admission_state: ADMISSION_STATES.LIVE,
    normalized_query: 'authority',
  });
  const liveExposure = validateAndExposeOutput(liveResult);

  assert.equal(liveExposure.state, FINAL_OUTPUT_STATES.valid, 'LIVE_RESOLUTION should expose as valid.');
  assert.equal(liveExposure.type, RESOLUTION_ENGINE_TYPES.LIVE_RESOLUTION, 'LIVE_RESOLUTION type mismatch.');
  assert.equal(liveExposure.payload, liveResult.payload, 'LIVE_RESOLUTION payload must remain unchanged.');

  const visibleResult = resolveFromAdmissionState({
    admission_state: ADMISSION_STATES.VISIBLE_ONLY,
    normalized_query: 'agreement',
  });
  const visibleExposure = validateAndExposeOutput(visibleResult);

  assert.equal(visibleExposure.state, FINAL_OUTPUT_STATES.partial, 'VISIBLE_INSPECTION should expose as partial.');
  assert.equal(visibleExposure.type, RESOLUTION_ENGINE_TYPES.VISIBLE_INSPECTION, 'VISIBLE_INSPECTION type mismatch.');
  assert.equal(visibleExposure.payload, visibleResult.payload, 'VISIBLE_INSPECTION payload must remain unchanged.');

  process.stdout.write('PASS output_validation_gate_valid_state_mapping\n');
}

function verifyRefusedStateMapping() {
  const rejectionResult = resolveFromAdmissionState({
    admission_state: ADMISSION_STATES.REJECTED,
    normalized_query: 'defeasibility',
  });
  const rejectionExposure = validateAndExposeOutput(rejectionResult);

  assert.equal(rejectionExposure.state, FINAL_OUTPUT_STATES.refused, 'STRUCTURAL_REJECTION should expose as refused.');
  assert.equal(rejectionExposure.type, RESOLUTION_ENGINE_TYPES.STRUCTURAL_REJECTION, 'STRUCTURAL_REJECTION type mismatch.');
  assert.equal(rejectionExposure.payload, rejectionResult.payload, 'STRUCTURAL_REJECTION payload must remain unchanged.');

  const noMatchResult = resolveFromAdmissionState({
    admission_state: ADMISSION_STATES.NOT_A_CONCEPT,
    normalized_query: 'invented legal moonword',
  });
  const noMatchExposure = validateAndExposeOutput(noMatchResult);

  assert.equal(noMatchExposure.state, FINAL_OUTPUT_STATES.refused, 'NO_MATCH should expose as refused.');
  assert.equal(noMatchExposure.type, RESOLUTION_ENGINE_TYPES.NO_MATCH, 'NO_MATCH type mismatch.');
  assert.equal(noMatchExposure.payload, noMatchResult.payload, 'NO_MATCH payload must remain unchanged.');

  const outOfScopeInteractionResult = resolveFromAdmissionState({
    admission_state: ADMISSION_STATES.NOT_A_CONCEPT,
    normalized_query: 'commitment',
  });
  const outOfScopeInteractionExposure = validateAndExposeOutput(outOfScopeInteractionResult);

  assert.equal(
    outOfScopeInteractionExposure.state,
    FINAL_OUTPUT_STATES.refused,
    'out-of-scope interaction constructs should expose as refused.',
  );
  assert.equal(
    outOfScopeInteractionExposure.type,
    RESOLUTION_ENGINE_TYPES.NO_MATCH,
    'out-of-scope interaction constructs should remain NO_MATCH outputs.',
  );
  assert.equal(
    outOfScopeInteractionExposure.payload,
    outOfScopeInteractionResult.payload,
    'out-of-scope interaction NO_MATCH payload must remain unchanged.',
  );

  const anchoredInteractionResult = resolveFromAdmissionState({
    admission_state: ADMISSION_STATES.NOT_A_CONCEPT,
    normalized_query: 'breach of duty',
  });
  const anchoredInteractionExposure = validateAndExposeOutput(anchoredInteractionResult);

  assert.equal(
    anchoredInteractionExposure.state,
    FINAL_OUTPUT_STATES.refused,
    'anchored interaction constructs should expose as refused when no governance path exists.',
  );
  assert.equal(
    anchoredInteractionExposure.type,
    RESOLUTION_ENGINE_TYPES.NO_MATCH,
    'anchored interaction constructs should remain NO_MATCH outputs.',
  );
  assert.equal(
    anchoredInteractionExposure.payload,
    anchoredInteractionResult.payload,
    'anchored interaction NO_MATCH payload must remain unchanged.',
  );

  process.stdout.write('PASS output_validation_gate_refused_state_mapping\n');
}

function verifyClassifiedStateMapping() {
  const vocabResult = resolveFromAdmissionState({
    admission_state: ADMISSION_STATES.NOT_A_CONCEPT,
    normalized_query: 'mens rea',
  });
  const vocabExposure = validateAndExposeOutput(vocabResult);

  assert.equal(vocabExposure.state, FINAL_OUTPUT_STATES.degraded, 'VOCAB_CLASSIFICATION should expose as degraded.');
  assert.equal(vocabExposure.type, RESOLUTION_ENGINE_TYPES.VOCAB_CLASSIFICATION, 'VOCAB_CLASSIFICATION type mismatch.');
  assert.equal(vocabExposure.payload, vocabResult.payload, 'VOCAB_CLASSIFICATION payload must remain unchanged.');

  process.stdout.write('PASS output_validation_gate_classified_state_mapping\n');
}

function verifyInvalidOutputFailure() {
  const invalidTypeExposure = validateAndExposeOutput({
    type: 'MIXED_RESULT',
    payload: {},
  });

  assert.deepEqual(
    invalidTypeExposure,
    {
      state: FINAL_OUTPUT_STATES.refused,
      reason: 'output_validation_failed',
    },
    'invalid type should fail closed.',
  );

  const leakingVocabExposure = validateAndExposeOutput({
    type: RESOLUTION_ENGINE_TYPES.VOCAB_CLASSIFICATION,
    payload: {
      recognized: true,
      type: 'vocab',
      classification: 'derived',
      conceptId: 'authority',
    },
  });

  assert.deepEqual(
    leakingVocabExposure,
    {
      state: FINAL_OUTPUT_STATES.refused,
      reason: 'output_validation_failed',
    },
    'vocabulary concept leakage should fail closed.',
  );

  const softenedRejectionExposure = validateAndExposeOutput({
    type: RESOLUTION_ENGINE_TYPES.STRUCTURAL_REJECTION,
    payload: {
      type: 'no_exact_match',
    },
  });

  assert.deepEqual(
    softenedRejectionExposure,
    {
      state: FINAL_OUTPUT_STATES.refused,
      reason: 'output_validation_failed',
    },
    'softened structural rejection should fail closed.',
  );

  process.stdout.write('PASS output_validation_gate_failure_handling\n');
}

function main() {
  verifyValidStateMapping();
  verifyRefusedStateMapping();
  verifyClassifiedStateMapping();
  verifyInvalidOutputFailure();
  process.stdout.write('Output validation gate verification passed.\n');
}

main();
