'use strict';

const assert = require('node:assert/strict');

const {
  ADMISSION_STATES,
  RESOLUTION_ENGINE_TYPES,
  resolveFromAdmissionState,
} = require('../src/modules/concepts/resolution-engine');

function verifyLiveResolution() {
  const result = resolveFromAdmissionState({
    admission_state: ADMISSION_STATES.LIVE,
    normalized_query: 'authority',
  });

  assert.equal(result.type, RESOLUTION_ENGINE_TYPES.LIVE_RESOLUTION, 'authority should resolve as LIVE_RESOLUTION.');
  assert.equal(result.payload.type, 'concept_match', 'authority payload should remain canonical concept resolution.');
  assert.equal(result.payload.resolution.conceptId, 'authority', 'authority conceptId mismatch.');

  process.stdout.write('PASS resolution_engine_live_resolution\n');
}

function verifyVisibleInspection() {
  const result = resolveFromAdmissionState({
    admission_state: ADMISSION_STATES.VISIBLE_ONLY,
    normalized_query: 'agreement',
  });

  assert.equal(result.type, RESOLUTION_ENGINE_TYPES.VISIBLE_INSPECTION, 'agreement should resolve as VISIBLE_INSPECTION.');
  assert.equal(result.payload.conceptId, 'agreement', 'agreement detail conceptId mismatch.');
  assert.equal(result.payload.title, 'Agreement', 'agreement detail title mismatch.');
  assert.equal(result.payload.rejection, null, 'agreement should not carry rejection payload.');

  process.stdout.write('PASS resolution_engine_visible_inspection\n');
}

function verifyStructuralRejection() {
  const result = resolveFromAdmissionState({
    admission_state: ADMISSION_STATES.REJECTED,
    normalized_query: 'defeasibility',
  });

  assert.equal(result.type, RESOLUTION_ENGINE_TYPES.STRUCTURAL_REJECTION, 'defeasibility should resolve as STRUCTURAL_REJECTION.');
  assert.equal(result.payload.type, 'rejected_concept', 'defeasibility payload should remain governed rejection.');
  assert.equal(result.payload.resolution.method, 'rejection_registry', 'defeasibility rejection method mismatch.');

  process.stdout.write('PASS resolution_engine_structural_rejection\n');
}

function verifyVocabClassification() {
  const result = resolveFromAdmissionState({
    admission_state: ADMISSION_STATES.NOT_A_CONCEPT,
    normalized_query: 'mens rea',
  });

  assert.equal(result.type, RESOLUTION_ENGINE_TYPES.VOCAB_CLASSIFICATION, 'mens rea should resolve as VOCAB_CLASSIFICATION.');
  assert.deepEqual(
    result.payload,
    {
      recognized: true,
      type: 'vocab',
      classification: 'derived',
    },
    'mens rea vocabulary payload mismatch.',
  );

  process.stdout.write('PASS resolution_engine_vocab_classification\n');
}

function verifyNoMatch() {
  const result = resolveFromAdmissionState({
    admission_state: ADMISSION_STATES.NOT_A_CONCEPT,
    normalized_query: 'invented legal moonword',
  });

  assert.equal(result.type, RESOLUTION_ENGINE_TYPES.NO_MATCH, 'unknown term should resolve as NO_MATCH.');
  assert.deepEqual(
    result.payload,
    {
      normalized_query: 'invented legal moonword',
    },
    'unknown no-match payload mismatch.',
  );

  process.stdout.write('PASS resolution_engine_no_match\n');
}

function verifyOutOfScopeInteractionBoundary() {
  const result = resolveFromAdmissionState({
    admission_state: ADMISSION_STATES.NOT_A_CONCEPT,
    normalized_query: 'commitment',
  });

  assert.equal(result.type, RESOLUTION_ENGINE_TYPES.NO_MATCH, 'commitment should refuse through NO_MATCH.');
  assert.deepEqual(
    result.payload,
    {
      normalized_query: 'commitment',
      reason: 'out_of_scope_interaction_construct',
    },
    'commitment NO_MATCH payload mismatch.',
  );

  process.stdout.write('PASS resolution_engine_out_of_scope_interaction_boundary\n');
}

function verifyAnchoredInteractionBoundary() {
  const result = resolveFromAdmissionState({
    admission_state: ADMISSION_STATES.NOT_A_CONCEPT,
    normalized_query: 'breach of duty',
  });

  assert.equal(result.type, RESOLUTION_ENGINE_TYPES.NO_MATCH, 'breach of duty should refuse through NO_MATCH.');
  assert.deepEqual(
    result.payload,
    {
      normalized_query: 'breach of duty',
      reason: 'anchored_interaction_construct_requires_governance_path',
    },
    'breach of duty NO_MATCH payload mismatch.',
  );

  process.stdout.write('PASS resolution_engine_anchored_interaction_boundary\n');
}

function verifyNoMixedOutputs() {
  assert.throws(
    () => resolveFromAdmissionState({
      admission_state: ADMISSION_STATES.LIVE,
      normalized_query: 'mens rea',
    }),
    /admission-state mismatch/,
    'recognized vocabulary must not be upgraded to LIVE.',
  );

  assert.throws(
    () => resolveFromAdmissionState({
      admission_state: ADMISSION_STATES.NOT_A_CONCEPT,
      normalized_query: 'liability',
    }),
    /admission-state mismatch/,
    'rejected concepts must not be softened into NOT_A_CONCEPT.',
  );

  process.stdout.write('PASS resolution_engine_no_mixed_outputs\n');
}

function verifyInputContract() {
  assert.throws(
    () => resolveFromAdmissionState({
      admission_state: ADMISSION_STATES.LIVE,
      normalized_query: 'What Is Authority',
    }),
    /already-normalized query value/,
    'resolution engine should reject unnormalized input.',
  );

  process.stdout.write('PASS resolution_engine_input_contract\n');
}

function main() {
  verifyLiveResolution();
  verifyVisibleInspection();
  verifyStructuralRejection();
  verifyVocabClassification();
  verifyNoMatch();
  verifyOutOfScopeInteractionBoundary();
  verifyAnchoredInteractionBoundary();
  verifyNoMixedOutputs();
  verifyInputContract();
  process.stdout.write('Resolution engine verification passed.\n');
}

main();
