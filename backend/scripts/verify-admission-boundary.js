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
    ['authority', 'power', 'legitimacy', 'law', 'duty', 'responsibility'],
    'LIVE_CONCEPT_IDS mismatch.',
  );
  assert.deepEqual(
    VISIBLE_ONLY_PUBLIC_CONCEPT_IDS,
    ['violation', 'agreement'],
    'VISIBLE_ONLY_PUBLIC_CONCEPT_IDS mismatch.',
  );
  assert.deepEqual(
    REJECTED_CONCEPT_IDS,
    ['obligation', 'enforcement', 'claim', 'liability', 'jurisdiction', 'defeasibility'],
    'REJECTED_CONCEPT_IDS mismatch.',
  );
  assert.deepEqual(
    DETAIL_BACKED_CONCEPT_IDS,
    ['violation', 'agreement', 'obligation', 'enforcement', 'claim', 'liability', 'jurisdiction', 'defeasibility'],
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
    { query: 'violation', targetConceptId: 'violation' },
    { query: 'what is violation', targetConceptId: 'violation' },
    { query: 'agreement', targetConceptId: 'agreement' },
    { query: 'what is agreement', targetConceptId: 'agreement' },
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

function verifyOutOfScopeInteractionRuntimeRefusal() {
  const exactCases = [
    { query: 'commitment', targetConceptId: 'commitment', queryType: 'exact_concept_query' },
    { query: 'promise', targetConceptId: 'promise', queryType: 'exact_concept_query' },
    { query: 'undertaking', targetConceptId: 'undertaking', queryType: 'exact_concept_query' },
    { query: 'breach', targetConceptId: 'breach', queryType: 'exact_concept_query' },
    { query: 'breach of contract', targetConceptId: 'breach', queryType: 'unsupported_complex_query' },
  ];

  exactCases.forEach(({ query, targetConceptId, queryType }) => {
    const response = resolveConceptQuery(query);

    assert.equal(response.type, 'no_exact_match', `${query} should remain a refusal.`);
    assert.equal(response.queryType, queryType, `${query} queryType mismatch.`);
    assert.equal(response.resolution?.method, 'out_of_scope', `${query} resolution.method mismatch.`);
    assert.equal(response.interpretation?.interpretationType, 'out_of_scope', `${query} interpretationType mismatch.`);
    assert.equal(response.interpretation?.targetConceptId, targetConceptId, `${query} targetConceptId mismatch.`);
  });

  ['breach of duty', 'breach of law-bound duty'].forEach((query) => {
    const response = resolveConceptQuery(query);

    assert.equal(response.type, 'unsupported_query_type', `${query} should remain deterministic refusal.`);
    assert.equal(response.queryType, 'unsupported_complex_query', `${query} queryType mismatch.`);
    assert.equal(response.resolution?.method, 'unsupported_query_type', `${query} resolution.method mismatch.`);
  });

  ['commitment', 'breach'].forEach((conceptId) => {
    assert.equal(isVisibleOnlyConceptId(conceptId), false, `${conceptId} should not be visible-only.`);
    assert.equal(isDetailBackedConceptId(conceptId), false, `${conceptId} should not be detail-backed in public scope.`);
    assert.equal(isLiveConceptId(conceptId), false, `${conceptId} should not be live.`);
    assert.equal(isRejectedConceptId(conceptId), false, `${conceptId} should not be rejected.`);
  });

  process.stdout.write('PASS admission_boundary_out_of_scope_interaction_refusal\n');
}

function verifyRejectedConceptDetailAvailability() {
  REJECTED_CONCEPT_IDS.forEach((conceptId) => {
    assert.equal(isRejectedConceptId(conceptId), true, `${conceptId} should be rejected.`);
    assert.equal(isDetailBackedConceptId(conceptId), true, `${conceptId} should be detail-backed.`);
    assert.equal(isLiveConceptId(conceptId), false, `${conceptId} should not be live.`);
    assert.equal(isVisibleOnlyConceptId(conceptId), false, `${conceptId} should not be visible-only.`);

    const detail = buildConceptDetail(conceptId);
    assert.notEqual(detail, null, `${conceptId} detail should load.`);
    assert.equal(detail.conceptId, conceptId, `${conceptId} detail conceptId mismatch.`);
    assert.equal(detail.rejection?.status, 'REJECTED', `${conceptId} rejection status mismatch.`);
    assert.equal(
      detail.rejection?.decisionType,
      'STRUCTURAL_REJECTION',
      `${conceptId} rejection decisionType mismatch.`,
    );
  });

  process.stdout.write('PASS admission_boundary_rejected_detail_available\n');
}

function verifyVisibleOnlyComparisonRefusal() {
  const cases = [
    { query: 'agreement vs violation', expectedConcepts: ['violation', 'agreement'] },
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

function verifyOutOfScopeInteractionComparisonRefusal() {
  const cases = [
    { query: 'agreement vs commitment', targetConceptId: 'commitment' },
    { query: 'breach vs violation', targetConceptId: 'breach' },
  ];

  cases.forEach(({ query, targetConceptId }) => {
    const response = resolveConceptQuery(query);

    assert.equal(response.type, 'no_exact_match', `${query} should remain a refusal.`);
    assert.equal(response.queryType, 'comparison_query', `${query} queryType mismatch.`);
    assert.equal(response.resolution?.method, 'out_of_scope', `${query} resolution.method mismatch.`);
    assert.equal(response.interpretation?.interpretationType, 'out_of_scope', `${query} interpretationType mismatch.`);
    assert.equal(response.interpretation?.targetConceptId, targetConceptId, `${query} targetConceptId mismatch.`);
  });

  process.stdout.write('PASS admission_boundary_out_of_scope_interaction_comparison_refusal\n');
}

function verifyAnchoredInteractionComparisonRefusal() {
  const response = resolveConceptQuery('commitment vs duty');

  assert.equal(response.type, 'no_exact_match', 'commitment vs duty should remain a refusal.');
  assert.equal(response.queryType, 'comparison_query', 'commitment vs duty queryType mismatch.');
  assert.equal(response.resolution?.method, 'no_exact_match', 'commitment vs duty resolution.method mismatch.');
  assert.equal(
    response.interpretation?.interpretationType,
    'comparison_not_supported',
    'commitment vs duty interpretationType mismatch.',
  );
  assert.deepEqual(
    response.interpretation?.concepts,
    ['duty'],
    'commitment vs duty supported concept list mismatch.',
  );

  process.stdout.write('PASS admission_boundary_anchored_interaction_comparison_refusal\n');
}

function verifyLiveConceptsStillResolve() {
  ['law', 'duty', 'responsibility'].forEach((conceptId) => {
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
  verifyRejectedConceptDetailAvailability();
  verifyVisibleOnlyExactRuntimeRefusal();
  verifyOutOfScopeInteractionRuntimeRefusal();
  verifyVisibleOnlyComparisonRefusal();
  verifyOutOfScopeInteractionComparisonRefusal();
  verifyAnchoredInteractionComparisonRefusal();
  verifyLiveConceptsStillResolve();
  process.stdout.write('ChatPDM admission boundary verification passed.\n');
}

main();
