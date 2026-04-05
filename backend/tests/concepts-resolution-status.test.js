'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildConceptDetail,
} = require('../src/modules/concepts/concept-detail-service');
const {
  computeCanonicalConceptHash,
  getConceptById,
  validateConceptShape,
} = require('../src/modules/concepts/concept-loader');

test('resolution status remains optional for existing concepts', () => {
  const concept = getConceptById('authority');

  assert.ok(concept, 'Expected authority concept to load.');
  assert.equal(Object.hasOwn(concept, 'resolutionStatus'), false);
  assert.equal(concept.resolutionStatus, undefined);

  const detail = buildConceptDetail('authority');

  assert.ok(detail, 'Expected authority detail to load.');
  assert.equal(detail.itemType, 'core_concept');
  assert.equal(Object.hasOwn(detail, 'resolutionStatus'), false);

  const baselineHash = computeCanonicalConceptHash(concept);
  const hashWithStatus = computeCanonicalConceptHash({
    ...concept,
    resolutionStatus: 'UNFALSIFIABLE',
  });

  assert.equal(hashWithStatus, baselineHash);
});

test('resolution status accepts only the explicit four values', () => {
  const concept = getConceptById('authority');
  const allowedStatuses = [
    'RESOLVED',
    'PARTIALLY_RESOLVED',
    'UNRESOLVED',
    'UNFALSIFIABLE',
  ];

  allowedStatuses.forEach((status) => {
    assert.doesNotThrow(() => validateConceptShape({
      ...concept,
      resolutionStatus: status,
    }, 'authority'));
  });

  assert.throws(
    () => validateConceptShape({
      ...concept,
      resolutionStatus: 'PENDING',
    }, 'authority'),
    /unsupported resolutionStatus/i,
  );
});

test('law and power remain definition-led core_concept detail payloads', () => {
  ['law', 'power'].forEach((conceptId) => {
    const concept = getConceptById(conceptId);
    assert.ok(concept, `Expected ${conceptId} concept to load.`);

    const detail = buildConceptDetail(conceptId);

    assert.ok(detail, `Expected ${conceptId} detail to load.`);
    assert.equal(detail.itemType, 'core_concept');
    assert.equal(detail.shortDefinition, concept.shortDefinition);
    assert.equal(detail.coreMeaning, concept.coreMeaning);
    assert.equal(detail.fullDefinition, concept.fullDefinition);
  });
});
