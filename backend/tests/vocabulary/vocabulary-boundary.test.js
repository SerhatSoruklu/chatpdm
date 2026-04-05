'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildVocabularyBoundaryResponse,
} = require('../../src/modules/legal-vocabulary/vocabulary-boundary');
const {
  REGISTRY_TERM_ITEM_TYPE,
  getRegistryInterpretationFallback,
  getWhyRegistryOnlyFallback,
} = require('../../src/modules/inspectable-item-contract');

test('vocabulary boundary response exposes expandable row metadata', () => {
  const response = buildVocabularyBoundaryResponse();

  assert.equal(response.terms.length, response.entries.length);
  assert.equal(response.entries.length > 0, true);

  const breach = response.entries.find((entry) => entry.term === 'breach');
  assert.ok(breach, 'Expected breach to be present in the boundary registry.');
  assert.equal(breach.itemType, REGISTRY_TERM_ITEM_TYPE);
  assert.equal(breach.sourceStatus, 'packet_backed');
  assert.equal(breach.sourceStatusLabel, 'Packet-backed');
  assert.equal(breach.familyLabel, 'Failure / Breach / Noncompliance');
  assert.equal(breach.classificationLabel, 'Derived');
  assert.equal(breach.meaningInLaw.length > 0, true);
  assert.equal(breach.registryInterpretation, getRegistryInterpretationFallback('derived'));
  assert.equal(breach.whyRegistryOnly, getWhyRegistryOnlyFallback('packet_backed'));
  assert.match(breach.shortMeaning, /commitment is not carried forward/i);
  assert.ok(breach.example && breach.example.length > 0);
  assert.ok(breach.nearMiss && breach.nearMiss.length > 0);
  assert.ok(breach.nonGoal && breach.nonGoal.length > 0);

  const abandonment = response.entries.find((entry) => entry.term === 'abandonment');
  assert.ok(abandonment, 'Expected abandonment to be present in the boundary registry.');
  assert.equal(abandonment.itemType, REGISTRY_TERM_ITEM_TYPE);
  assert.equal(abandonment.sourceStatus, 'registry_only');
  assert.equal(abandonment.sourceStatusLabel, 'Registry-only');
  assert.equal(abandonment.familyLabel, 'Meta / Stress / Edge Terms');
  assert.equal(
    abandonment.meaningInLaw,
    'Intentional relinquishment or surrender of a right, claim, interest, or property.',
  );
  assert.equal(
    abandonment.registryInterpretation,
    'Recognized legal vocabulary with broad contextual usage, but not normalized here into a single runtime-safe structural concept.',
  );
  assert.equal(
    abandonment.whyRegistryOnly,
    'This term remains registry-only because its legal usage is contextual and it is not admitted to runtime ontology.',
  );
  assert.match(abandonment.definition, /registry-only term/i);
  assert.equal(abandonment.example, null);
  assert.equal(abandonment.nearMiss, null);
  assert.ok(abandonment.nonGoal && abandonment.nonGoal.length > 0);

  const abInitio = response.entries.find((entry) => entry.term === 'ab initio');
  assert.ok(abInitio, 'Expected ab initio to be present in the boundary registry.');
  assert.equal(abInitio.itemType, REGISTRY_TERM_ITEM_TYPE);
  assert.equal(abInitio.sourceStatus, 'registry_only');
  assert.equal(abInitio.sourceStatusLabel, 'Registry-only');
  assert.equal(abInitio.familyLabel, 'Meta / Stress / Edge Terms');
  assert.equal(
    abInitio.meaningInLaw,
    'From the beginning; in law, treated as starting at the outset.',
  );
  assert.equal(
    abInitio.registryInterpretation,
    'Recognized legal vocabulary with fixed Latin usage, but not normalized here into a single runtime-safe structural concept.',
  );
  assert.equal(
    abInitio.whyRegistryOnly,
    'This term remains registry-only because its legal usage is inspectable but it is not admitted to runtime ontology.',
  );
  assert.match(abInitio.definition, /registry-only term/i);
  assert.equal(abInitio.example, null);
  assert.equal(abInitio.nearMiss, null);
  assert.ok(abInitio.nonGoal && abInitio.nonGoal.length > 0);
});
