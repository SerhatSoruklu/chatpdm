'use strict';

const assert = require('node:assert/strict');

const {
  LIVE_CONCEPT_IDS,
  VISIBLE_ONLY_PUBLIC_CONCEPT_IDS,
} = require('../src/modules/concepts/admission-state');
const {
  ADMISSION_STATES,
  resolveAdmissionState,
} = require('../src/modules/concepts/admission-gate');
const {
  getRejectedConceptRecord,
} = require('../src/modules/concepts/rejection-registry-loader');
const {
  resolveConceptQuery,
} = require('../src/modules/concepts');
const {
  loadLegalVocabularyRegistry,
  recognizeLegalVocabulary,
} = require('../src/modules/legal-vocabulary');

const ALLOWED_VOCABULARY_CLASSIFICATIONS = new Set([
  'unknown_structure',
  'derived',
  'procedural',
  'carrier',
  'rejected_candidate',
]);

const ALLOWED_NON_CONCEPT_RESPONSE_TYPES = new Set([
  'VOCABULARY_DETECTED',
  'no_exact_match',
  'invalid_query',
  'unsupported_query_type',
  'rejected_concept',
]);

function verifyRegistryBoundarySeparation() {
  const registry = loadLegalVocabularyRegistry();

  assert.equal(registry.available, true, 'vocabulary registry should be available.');
  assert.equal(registry.totalTerms > 0, true, 'vocabulary registry should contain at least one recognized term.');

  for (const [term, record] of registry.recordsByTerm.entries()) {
    assert.equal(
      LIVE_CONCEPT_IDS.includes(term),
      false,
      `recognized vocabulary term "${term}" must not overlap the live concept set.`,
    );
    assert.equal(
      VISIBLE_ONLY_PUBLIC_CONCEPT_IDS.includes(term),
      false,
      `recognized vocabulary term "${term}" must not overlap the visible-only concept set.`,
    );
    assert.equal(
      ALLOWED_VOCABULARY_CLASSIFICATIONS.has(record.classification),
      true,
      `recognized vocabulary term "${term}" has unsupported classification "${record.classification}".`,
    );
  }

  process.stdout.write('PASS vocabulary_boundary_registry_separation\n');
}

function verifyAdmissionBoundary() {
  const registry = loadLegalVocabularyRegistry();

  for (const [term, record] of registry.recordsByTerm.entries()) {
    const recognition = recognizeLegalVocabulary(term);

    assert.deepEqual(
      recognition,
      {
        recognized: true,
        type: 'vocab',
        classification: record.classification,
      },
      `recognized vocabulary term "${term}" must remain recognized with its stored classification.`,
    );

    const actualAdmission = resolveAdmissionState(term, recognition);
    const hasRejectedPrecedence = getRejectedConceptRecord(term) !== null;
    const expectedAdmission = hasRejectedPrecedence
      ? ADMISSION_STATES.REJECTED
      : ADMISSION_STATES.NOT_A_CONCEPT;

    assert.deepEqual(
      actualAdmission,
      { admission_state: expectedAdmission },
      `recognized vocabulary term "${term}" drifted at the admission boundary.`,
    );
    assert.notEqual(
      actualAdmission.admission_state,
      ADMISSION_STATES.LIVE,
      `recognized vocabulary term "${term}" must never resolve to LIVE in admission.`,
    );
    assert.notEqual(
      actualAdmission.admission_state,
      ADMISSION_STATES.VISIBLE_ONLY,
      `recognized vocabulary term "${term}" must never resolve to VISIBLE_ONLY in admission.`,
    );
  }

  process.stdout.write('PASS vocabulary_boundary_admission_contract\n');
}

function verifyResolverBoundary() {
  const registry = loadLegalVocabularyRegistry();

  for (const term of registry.recordsByTerm.keys()) {
    const response = resolveConceptQuery(term);

    assert.equal(
      ALLOWED_NON_CONCEPT_RESPONSE_TYPES.has(response.type),
      true,
      `recognized vocabulary term "${term}" produced unsupported resolver type "${response.type}".`,
    );
    assert.notEqual(
      response.type,
      'concept_match',
      `recognized vocabulary term "${term}" must never produce concept_match output.`,
    );
    assert.notEqual(
      response.type,
      'comparison',
      `recognized vocabulary term "${term}" must never produce comparison output.`,
    );
    assert.notEqual(
      response.type,
      'ambiguous_match',
      `recognized vocabulary term "${term}" must never produce ambiguous_match output.`,
    );

    const rejectedRecord = getRejectedConceptRecord(term);

    if (rejectedRecord) {
      assert.equal(
        response.type,
        'rejected_concept',
        `rejected vocabulary term "${term}" must retain rejected_concept precedence.`,
      );
      assert.equal(
        response.resolution.method,
        'rejection_registry',
        `rejected vocabulary term "${term}" must resolve through rejection_registry.`,
      );
      continue;
    }

    if (response.type === 'VOCABULARY_DETECTED') {
      assert.equal(
        response.resolution.method,
        'vocabulary_guard',
        `recognized vocabulary term "${term}" must resolve through vocabulary_guard when exposed as vocabulary.`,
      );
      assert.equal(
        response.vocabulary.systemFlags.isCoreConcept,
        false,
        `recognized vocabulary term "${term}" must stay outside the core concept set.`,
      );
    }
  }

  process.stdout.write('PASS vocabulary_boundary_resolver_contract\n');
}

function verifyRepresentativeCases() {
  const exactVocabularyCases = ['obligation', 'liability', 'jurisdiction'];

  exactVocabularyCases.forEach((term) => {
    const response = resolveConceptQuery(term);
    assert.equal(response.type, 'VOCABULARY_DETECTED', `${term} should remain a vocabulary-only response.`);
    assert.equal(response.resolution.method, 'vocabulary_guard', `${term} should remain guarded by vocabulary_guard.`);
  });

  const rejectedCases = ['defeasibility', 'enforcement'];

  rejectedCases.forEach((term) => {
    const response = resolveConceptQuery(term);
    assert.equal(response.type, 'rejected_concept', `${term} should remain rejected in the public resolver.`);
    assert.equal(response.resolution.method, 'rejection_registry', `${term} should remain governed by rejection_registry.`);
  });

  const unsupportedVocabulary = resolveConceptQuery('mens rea');
  assert.equal(
    unsupportedVocabulary.type,
    'unsupported_query_type',
    'recognized multi-word vocabulary should remain boundary-only even when query shape is unsupported.',
  );

  process.stdout.write('PASS vocabulary_boundary_representative_cases\n');
}

function main() {
  verifyRegistryBoundarySeparation();
  verifyAdmissionBoundary();
  verifyResolverBoundary();
  verifyRepresentativeCases();
  process.stdout.write('Vocabulary boundary contract verification passed.\n');
}

main();
