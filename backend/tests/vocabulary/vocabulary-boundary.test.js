'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildVocabularyBoundaryResponse,
} = require('../../src/modules/legal-vocabulary/vocabulary-boundary');

test('vocabulary boundary response exposes expandable row metadata', () => {
  const response = buildVocabularyBoundaryResponse();

  assert.equal(response.terms.length, response.entries.length);
  assert.equal(response.entries.length > 0, true);

  const breach = response.entries.find((entry) => entry.term === 'breach');
  assert.ok(breach, 'Expected breach to be present in the boundary registry.');
  assert.equal(breach.sourceStatus, 'packet_backed');
  assert.equal(breach.sourceStatusLabel, 'Packet-backed');
  assert.equal(breach.familyLabel, 'Failure / Breach / Noncompliance');
  assert.equal(breach.classificationLabel, 'Derived');
  assert.match(breach.shortMeaning, /commitment is not carried forward/i);
  assert.ok(breach.example && breach.example.length > 0);
  assert.ok(breach.nearMiss && breach.nearMiss.length > 0);
  assert.ok(breach.nonGoal && breach.nonGoal.length > 0);

  const abandonment = response.entries.find((entry) => entry.term === 'abandonment');
  assert.ok(abandonment, 'Expected abandonment to be present in the boundary registry.');
  assert.equal(abandonment.sourceStatus, 'registry_only');
  assert.equal(abandonment.sourceStatusLabel, 'Registry-only');
  assert.equal(abandonment.familyLabel, 'Meta / Stress / Edge Terms');
  assert.equal(abandonment.example, null);
  assert.equal(abandonment.nearMiss, null);
  assert.ok(abandonment.nonGoal && abandonment.nonGoal.length > 0);

  const abInitio = response.entries.find((entry) => entry.term === 'ab initio');
  assert.ok(abInitio, 'Expected ab initio to be present in the boundary registry.');
  assert.deepEqual(abInitio.definition, {
    short: 'From the beginning; treated as existing from the initial state without prior conditions.',
  });

  const abandonmentDefinition = response.entries.find((entry) => entry.term === 'abandonment');
  assert.ok(abandonmentDefinition, 'Expected abandonment to be present in the boundary registry.');
  assert.deepEqual(abandonmentDefinition.definition, {
    short: 'The voluntary relinquishment of a right, claim, or property without intention to reclaim it.',
  });

  const abatementDefinition = response.entries.find((entry) => entry.term === 'abatement');
  assert.ok(abatementDefinition, 'Expected abatement to be present in the boundary registry.');
  assert.deepEqual(abatementDefinition.definition, {
    short: 'The reduction, suspension, or termination of a legal claim, obligation, or proceeding under specific conditions.',
  });

  const entriesWithDefinitions = response.entries.filter((entry) => entry.definition);
  assert.deepEqual(entriesWithDefinitions.map((entry) => entry.term), ['ab initio', 'abandonment', 'abatement']);
});
