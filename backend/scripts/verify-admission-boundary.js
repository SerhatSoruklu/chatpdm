'use strict';

const assert = require('node:assert/strict');
const { buildConceptDetail, resolveConceptQuery } = require('../src/modules/concepts');
const {
  DETAIL_BACKED_CONCEPT_IDS,
  LIVE_CONCEPT_IDS,
  REJECTED_CONCEPT_IDS,
  VISIBLE_ONLY_PUBLIC_CONCEPT_IDS,
  isDetailBackedConceptId,
  isLiveConceptId,
  isRejectedConceptId,
  isVisibleOnlyConceptId,
} = require('../src/modules/concepts/admission-state');
const { loadConceptSet } = require('../src/modules/concepts/concept-loader');

function verifyAdmissionAuthorityPartitions() {
  assert.deepEqual(
    LIVE_CONCEPT_IDS,
    ['authority', 'power', 'legitimacy', 'law', 'duty', 'violation', 'responsibility'],
    'LIVE_CONCEPT_IDS mismatch.',
  );
  assert.deepEqual(
    VISIBLE_ONLY_PUBLIC_CONCEPT_IDS,
    ['agreement', 'commitment', 'breach'],
    'VISIBLE_ONLY_PUBLIC_CONCEPT_IDS mismatch.',
  );
  assert.deepEqual(
    REJECTED_CONCEPT_IDS,
    ['obligation', 'enforcement'],
    'REJECTED_CONCEPT_IDS mismatch.',
  );
  assert.deepEqual(
    DETAIL_BACKED_CONCEPT_IDS,
    ['agreement', 'commitment', 'breach', 'obligation', 'enforcement'],
    'DETAIL_BACKED_CONCEPT_IDS mismatch.',
  );

  process.stdout.write('PASS admission_boundary_authority_partitions\n');
}

function verifyLiveConceptSetUsesLiveOnlyAdmission() {
  const liveConceptSetIds = loadConceptSet().map((concept) => concept.conceptId);

  assert.deepEqual(liveConceptSetIds, LIVE_CONCEPT_IDS, 'loadConceptSet() must load live concepts only.');
  VISIBLE_ONLY_PUBLIC_CONCEPT_IDS.forEach((conceptId) => {
    assert.equal(isLiveConceptId(conceptId), false, `${conceptId} must not be marked live.`);
  });

  process.stdout.write('PASS admission_boundary_live_loader_is_live_only\n');
}

function verifyVisibleOnlyDetailAvailability() {
  VISIBLE_ONLY_PUBLIC_CONCEPT_IDS.forEach((conceptId) => {
    assert.equal(isVisibleOnlyConceptId(conceptId), true, `${conceptId} should be visible-only.`);
    assert.equal(isDetailBackedConceptId(conceptId), true, `${conceptId} should be detail-backed.`);
    assert.equal(isRejectedConceptId(conceptId), false, `${conceptId} should not be rejected.`);

    const detail = buildConceptDetail(conceptId);
    assert.notEqual(detail, null, `${conceptId} detail should load.`);
    assert.equal(detail.conceptId, conceptId, `${conceptId} detail conceptId mismatch.`);
    assert.equal(typeof detail.title, 'string', `${conceptId} detail title mismatch.`);
    assert.equal(typeof detail.shortDefinition, 'string', `${conceptId} detail shortDefinition mismatch.`);
    assert.equal(detail.rejection, null, `${conceptId} should not surface rejection metadata.`);
  });

  process.stdout.write('PASS admission_boundary_visible_only_detail_available\n');
}

function verifyVisibleOnlyExactRuntimeRefusal() {
  const cases = [
    { query: 'agreement', targetConceptId: 'agreement' },
    { query: 'what is agreement?', targetConceptId: 'agreement' },
    { query: 'commitment', targetConceptId: 'commitment' },
    { query: 'breach', targetConceptId: 'breach' },
  ];

  cases.forEach(({ query, targetConceptId }) => {
    const response = resolveConceptQuery(query);

    assert.equal(response.type, 'no_exact_match', `${query} should remain a refusal.`);
    assert.equal(response.queryType, 'exact_concept_query', `${query} queryType mismatch.`);
    assert.equal(
      response.interpretation?.interpretationType,
      'visible_only_public_concept',
      `${query} interpretationType mismatch.`,
    );
    assert.equal(
      response.interpretation?.targetConceptId,
      targetConceptId,
      `${query} targetConceptId mismatch.`,
    );
  });

  process.stdout.write('PASS admission_boundary_visible_only_exact_runtime_refusal\n');
}

function verifyVisibleOnlyComparisonRefusal() {
  const cases = [
    { query: 'agreement vs commitment', expectedConcepts: ['agreement', 'commitment'] },
    { query: 'commitment vs duty', expectedConcepts: ['commitment'] },
    { query: 'breach vs violation', expectedConcepts: ['breach'] },
  ];

  cases.forEach(({ query, expectedConcepts }) => {
    const response = resolveConceptQuery(query);

    assert.equal(response.type, 'no_exact_match', `${query} should remain a refusal.`);
    assert.equal(response.queryType, 'comparison_query', `${query} queryType mismatch.`);
    assert.equal(
      response.interpretation?.interpretationType,
      'visible_only_public_concept',
      `${query} interpretationType mismatch.`,
    );
    assert.deepEqual(
      response.interpretation?.concepts,
      expectedConcepts,
      `${query} visible-only concept list mismatch.`,
    );
  });

  process.stdout.write('PASS admission_boundary_visible_only_comparison_refusal\n');
}

function verifyLiveConceptsStillResolve() {
  ['law', 'violation', 'responsibility'].forEach((conceptId) => {
    const response = resolveConceptQuery(conceptId);

    assert.equal(isLiveConceptId(conceptId), true, `${conceptId} should be marked live.`);
    assert.equal(response.type, 'concept_match', `${conceptId} should still resolve live.`);
    assert.equal(response.resolution.conceptId, conceptId, `${conceptId} resolved conceptId mismatch.`);
  });

  process.stdout.write('PASS admission_boundary_live_concepts_still_resolve\n');
}

function main() {
  verifyAdmissionAuthorityPartitions();
  verifyLiveConceptSetUsesLiveOnlyAdmission();
  verifyVisibleOnlyDetailAvailability();
  verifyVisibleOnlyExactRuntimeRefusal();
  verifyVisibleOnlyComparisonRefusal();
  verifyLiveConceptsStillResolve();
  process.stdout.write('ChatPDM admission boundary verification passed.\n');
}

main();
