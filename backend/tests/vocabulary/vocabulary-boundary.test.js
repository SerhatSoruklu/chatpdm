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
  assert.equal(breach.meaningSources.length > 0, true);
  assert.equal(breach.meaningSources[0].referenceRole, 'supporting_lexicon_reference');
  assert.match(breach.meaningSources[0].supportNoteDisplay, /breaking or violating/i);
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
  assert.equal(abandonment.meaningSources.length > 0, true);
  assert.equal(abandonment.meaningSources[0].referenceRole, 'supporting_lexicon_reference');
  assert.match(abandonment.meaningSources[0].supportNoteDisplay, /surrender/i);
  assert.equal(abandonment.meaningSources[0].citationDisplay, 'Black, A Dictionary of Law (1891)');
  assert.equal(abandonment.meaningSources[0].pageDisplay, 'p. 16');
  assert.equal(typeof abandonment.meaningSources[0].showSnippet, 'boolean');
  assert.equal(
    abandonment.registryInterpretation,
    'Source-attested legal vocabulary entry. Used for inspection and reference only.',
  );
  assert.equal(
    abandonment.whyRegistryOnly,
    'Not admitted to runtime ontology because this entry has not been normalized into a bounded structural concept.',
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
  assert.equal(abInitio.meaningSources.length > 0, true);
  assert.equal(abInitio.meaningSources[0].referenceRole, 'supporting_lexicon_reference');
  assert.equal(
    abInitio.meaningSources[0].supportNoteDisplay,
    'Defines "ab initio" as from the beginning or from the first act.',
  );
  assert.equal(
    abInitio.registryInterpretation,
    'Source-attested legal vocabulary entry. Used for inspection and reference only.',
  );
  assert.equal(
    abInitio.whyRegistryOnly,
    'Not admitted to runtime ontology because this entry has not been normalized into a bounded structural concept.',
  );
  assert.match(abInitio.definition, /registry-only term/i);
  assert.equal(abInitio.example, null);
  assert.equal(abInitio.nearMiss, null);
  assert.ok(abInitio.nonGoal && abInitio.nonGoal.length > 0);

  const account = response.entries.find((entry) => entry.term === 'account');
  assert.ok(account, 'Expected account to be present in the boundary registry.');
  assert.equal(account.sourceStatus, 'registry_only');
  assert.equal(account.meaningSources.length > 0, true);
  assert.equal(account.meaningSources[0].referenceRole, 'supporting_lexicon_reference');
  assert.equal(typeof account.meaningSources[0].supportNoteDisplay, 'string');

  const heir = response.entries.find((entry) => entry.term === 'heir');
  assert.ok(heir, 'Expected heir to be present in the boundary registry.');
  const andersonHeirSource = heir.meaningSources.find((source) => source.sourceId === 'anderson_1889');
  assert.ok(andersonHeirSource, 'Expected heir to retain exact Anderson provenance.');
  assert.equal(andersonHeirSource.citationDisplay, "Anderson's Law Dictionary (1889)");
  assert.equal(andersonHeirSource.supportNoteDisplay, 'Provides exact-term support for "heir".');
  assert.equal(andersonHeirSource.showSnippet, false);
  assert.equal(andersonHeirSource.snippetDisplay, null);
  assert.doesNotMatch(JSON.stringify(andersonHeirSource), /comparator support|HEIR 508 HEIR HEIR|H\^kes|tlie/i);

  const probation = response.entries.find((entry) => entry.term === 'probation');
  assert.ok(probation, 'Expected probation to be present in the boundary registry.');
  const probationSupportNotes = probation.meaningSources.map((source) => source.supportNoteDisplay);
  assert.ok(probationSupportNotes.includes('Provides exact-term support for "probation".'));
  assert.ok(probation.meaningSources.some((source) => source.citationDisplay === 'Black, A Dictionary of Law (1891)'));
  assert.ok(probation.meaningSources.some((source) => source.citationDisplay === "Black's Law Dictionary, 2nd ed. (1910)"));
  assert.ok(probation.meaningSources.some((source) => source.citationDisplay === 'Osborn, A Concise Law Dictionary (1927)'));
  assert.equal(
    probationSupportNotes.some((note) => /^(?:Black|Lexicon) reference for the displayed legal meaning\.$/.test(note)),
    false,
  );
});
