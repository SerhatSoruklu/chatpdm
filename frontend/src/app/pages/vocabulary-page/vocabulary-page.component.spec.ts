import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { buildRegistryTermInspectableItemRows } from '../../core/concepts/inspectable-item-disclosure/inspectable-item-disclosure.model';
import type { VocabularyBoundaryBuckets, VocabularyBoundaryEntry } from '../../core/vocabulary/vocabulary-boundary.types';
import {
  buildVocabularySearchIndex,
  buildVocabularyPaginationTokens,
  buildVocabularyRegistryFilterOptions,
  buildVocabularySearchSummary,
  clampVocabularyPage,
  displayVocabularyTerm,
  filterVocabularySearchIndex,
  filterVocabularyEntries,
  getVocabularyMeaningInLawCount,
  getVocabularyPageCount,
  hasVocabularyDisplayTermAlias,
  hasVocabularyMeaningInLaw,
  paginateVocabularyEntries,
  shouldRenderVocabularyBoundaryNote,
  sortVocabularyEntries,
  VOCABULARY_BOUNDARY_HOME_NOTE,
  VOCABULARY_BOUNDARY_LIST_NOTE,
  VOCABULARY_BUCKET_LABELS,
  VOCABULARY_PAGE_SIZE_DEFAULT,
  VOCABULARY_REGISTRY_SORT_OPTIONS,
} from './vocabulary-page.model';

const sampleEntries: readonly VocabularyBoundaryEntry[] = [
  {
    term: 'abandonment',
    family: 'META / STRESS / EDGE TERMS',
    familyLabel: 'Meta / Stress / Edge Terms',
    classification: 'unknown_structure',
    classificationLabel: 'Unknown Structure',
    sourceStatus: 'registry_only',
    sourceStatusLabel: 'Registry-only',
    meaningInLaw: 'Intentional relinquishment or surrender of a right, claim, interest, or property.',
    meaningSources: [
      {
        sourceId: 'blacks_1910',
        sourceTitle: "Black's Law Dictionary, 2nd Edition",
        year: 1910,
        page: 1,
        lineNumber: null,
        headword: null,
        citationDisplay: "Black's Law Dictionary, 2nd ed. (1910)",
        pageDisplay: 'p. 1',
        supportNoteDisplay: 'Defines "abandonment" as relinquishment.',
        snippetDisplay: null,
        showSnippet: false,
        qualityFlag: 'suppressed',
        referenceRole: 'supporting_lexicon_reference',
      },
    ],
    registryInterpretation: 'Source-attested legal vocabulary entry. Used for inspection and reference only.',
    whyRegistryOnly: 'Not admitted to runtime ontology because this entry has not been normalized into a bounded structural concept.',
    shortMeaning: 'Meta / Stress / Edge Terms registry term.',
    definition: 'Registry-only term.',
    example: null,
    nearMiss: null,
    nonGoal: 'No canon.',
    boundaryNote: 'Registry term classified as unknown structure.',
    relatedTerms: ['ab initio'],
  },
  {
    term: 'burden of proof',
    family: 'JURISPRUDENCE / PROCEDURE',
    familyLabel: 'Jurisprudence / Procedure',
    classification: 'derived',
    classificationLabel: 'Derived',
    sourceStatus: 'packet_backed',
    sourceStatusLabel: 'Packet-backed',
    meaningInLaw: 'The burden of proof is the obligation to establish a claim or defense in legal proceedings.',
    meaningSources: [],
    registryInterpretation: 'Recognized legal vocabulary interpreted as dependent on underlying concepts rather than as a primary concept.',
    whyRegistryOnly: 'This term is visible through an authored concept packet, but it remains outside runtime ontology on the registry surface.',
    shortMeaning: 'Derived procedural term.',
    definition: 'Derived procedural term.',
    example: 'The burden of proof remains on the claimant.',
    nearMiss: null,
    nonGoal: null,
    boundaryNote: 'Derived from packet structure.',
    relatedTerms: ['evidentiary burden'],
  },
  {
    term: 'carrier',
    family: 'META / STRESS / EDGE TERMS',
    familyLabel: 'Meta / Stress / Edge Terms',
    classification: 'carrier',
    classificationLabel: 'Carrier',
    sourceStatus: 'registry_only',
    sourceStatusLabel: 'Registry-only',
    meaningInLaw: null,
    meaningSources: [],
    registryInterpretation: 'Recognized legal vocabulary interpreted as context-bearing rather than standalone conceptual structure.',
    whyRegistryOnly: 'This term is visible in the registry only and is not backed by a published concept packet.',
    shortMeaning: 'Carrier registry term.',
    definition: 'Carrier registry term.',
    example: null,
    nearMiss: null,
    nonGoal: null,
    boundaryNote: 'Registry term classified as carrier.',
    relatedTerms: [],
  },
];

const sampleBuckets: VocabularyBoundaryBuckets = {
  unknown_structure: 1200,
  derived: 900,
  procedural: 600,
  carrier: 350,
  rejected_candidate: 535,
};

const duplicateBoundaryNoteEntry: VocabularyBoundaryEntry = {
  ...sampleEntries[0],
  boundaryNote: '  Not admitted to runtime ontology because this entry has not been normalized into a bounded structural concept.  ',
};

const distinctBoundaryNoteEntry: VocabularyBoundaryEntry = {
  ...sampleEntries[0],
  boundaryNote: 'Registry term classified as unknown structure.',
};

describe('VocabularyPage helpers', () => {
  it('filters registry entries by search text across metadata', () => {
    expect(filterVocabularyEntries(sampleEntries, 'burden', 'all').map((entry) => entry.term)).toEqual([
      'burden of proof',
    ]);
    expect(filterVocabularyEntries(sampleEntries, 'procedure', 'all').map((entry) => entry.term)).toEqual([
      'burden of proof',
    ]);
    expect(filterVocabularyEntries(sampleEntries, 'validator', 'all')).toEqual([]);
  });

  it('filters from a cached vocabulary search index', () => {
    const index = buildVocabularySearchIndex(sampleEntries);

    expect(index.map(({ searchText }) => searchText).every((searchText) => searchText.length > 0)).toBe(true);
    expect(filterVocabularySearchIndex(index, 'black', 'all').map((entry) => entry.term)).toEqual([
      'abandonment',
    ]);
    expect(filterVocabularySearchIndex(index, '', 'carrier').map((entry) => entry.term)).toEqual([
      'carrier',
    ]);
  });

  it('displays underscore terms with spaces without mutating the canonical term', () => {
    const entry: VocabularyBoundaryEntry = {
      ...sampleEntries[0],
      term: 'effective_control',
    };

    expect(displayVocabularyTerm(entry.term)).toBe('effective control');
    expect(hasVocabularyDisplayTermAlias(entry.term)).toBe(true);
    expect(entry.term).toBe('effective_control');
    expect(displayVocabularyTerm('Effective_Control')).toBe('Effective Control');
  });

  it('matches underscore terms by canonical and display-space forms', () => {
    const entries: readonly VocabularyBoundaryEntry[] = [
      {
        ...sampleEntries[0],
        term: 'effective_control',
      },
    ];

    expect(filterVocabularyEntries(entries, 'effective_control', 'all').map((entry) => entry.term)).toEqual([
      'effective_control',
    ]);
    expect(filterVocabularyEntries(entries, 'effective control', 'all').map((entry) => entry.term)).toEqual([
      'effective_control',
    ]);
  });

  it('filters registry entries by bucket before search text', () => {
    expect(filterVocabularyEntries(sampleEntries, '', 'derived').map((entry) => entry.term)).toEqual([
      'burden of proof',
    ]);
    expect(filterVocabularyEntries(sampleEntries, 'carrier', 'derived')).toEqual([]);
  });

  it('filters registry entries by semantic disclosure text', () => {
    expect(filterVocabularyEntries(sampleEntries, 'bounded structural', 'all').map((entry) => entry.term)).toEqual([
      'abandonment',
    ]);
  });

  it('filters registry entries by supporting lexicon provenance', () => {
    expect(filterVocabularyEntries(sampleEntries, "black's law", 'all').map((entry) => entry.term)).toEqual([
      'abandonment',
    ]);
  });

  it('sorts registry entries without changing the source array', () => {
    expect(sortVocabularyEntries(sampleEntries, 'term_az').map((entry) => entry.term)).toEqual([
      'abandonment',
      'burden of proof',
      'carrier',
    ]);
    expect(sortVocabularyEntries(sampleEntries, 'term_za').map((entry) => entry.term)).toEqual([
      'carrier',
      'burden of proof',
      'abandonment',
    ]);
    expect(sortVocabularyEntries(sampleEntries, 'meaning_first').map((entry) => entry.term)).toEqual([
      'abandonment',
      'burden of proof',
      'carrier',
    ]);
    expect(sortVocabularyEntries(sampleEntries, 'without_meaning_first').map((entry) => entry.term)).toEqual([
      'carrier',
      'abandonment',
      'burden of proof',
    ]);
    expect(sortVocabularyEntries(sampleEntries, 'packet_backed_first').map((entry) => entry.term)).toEqual([
      'burden of proof',
      'abandonment',
      'carrier',
    ]);
    expect(sampleEntries.map((entry) => entry.term)).toEqual([
      'abandonment',
      'burden of proof',
      'carrier',
    ]);
  });

  it('hides the lower boundary note when it duplicates why registry-only text', () => {
    expect(shouldRenderVocabularyBoundaryNote(duplicateBoundaryNoteEntry)).toBe(false);
  });

  it('renders the lower boundary note when it differs from why registry-only text', () => {
    expect(shouldRenderVocabularyBoundaryNote(distinctBoundaryNoteEntry)).toBe(true);
  });

  it('keeps meaning in law available to the registry disclosure rows', () => {
    expect(buildRegistryTermInspectableItemRows(sampleEntries[0])[0]).toEqual({
      label: 'Meaning in law',
      value: 'Intentional relinquishment or surrender of a right, claim, interest, or property.',
    });
  });

  it('counts boundary entries with non-empty meaning in law text', () => {
    expect(getVocabularyMeaningInLawCount(sampleEntries)).toBe(2);
    expect(getVocabularyMeaningInLawCount([
      {
        ...sampleEntries[0],
        meaningInLaw: '   ',
      },
    ])).toBe(0);
    expect(hasVocabularyMeaningInLaw(sampleEntries[0])).toBe(true);
    expect(hasVocabularyMeaningInLaw(sampleEntries[2])).toBe(false);
  });

  it('keeps supporting lexicon references available for display', () => {
    expect(sampleEntries[0].meaningSources[0]).toMatchObject({
      citationDisplay: "Black's Law Dictionary, 2nd ed. (1910)",
      pageDisplay: 'p. 1',
      supportNoteDisplay: 'Defines "abandonment" as relinquishment.',
      referenceRole: 'supporting_lexicon_reference',
    });
  });

  it('builds public filter options from the boundary buckets', () => {
    const options = buildVocabularyRegistryFilterOptions(3585, sampleBuckets);

    expect(options[0]).toEqual({
      key: 'all',
      label: 'All terms',
      count: 3585,
    });
    expect(options[1]).toEqual({
      key: 'unknown_structure',
      label: VOCABULARY_BUCKET_LABELS.unknown_structure,
      count: 1200,
    });
    expect(options[options.length - 1]).toEqual({
      key: 'rejected_candidate',
      label: VOCABULARY_BUCKET_LABELS.rejected_candidate,
      count: 535,
    });
  });

  it('builds compact page tokens with ellipsis for large result sets', () => {
    expect(buildVocabularyPaginationTokens(1, 150).map((token) => token.label)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '…',
      '150',
    ]);
    expect(buildVocabularyPaginationTokens(75, 150).map((token) => token.label)).toEqual([
      '1',
      '…',
      '74',
      '75',
      '76',
      '…',
      '150',
    ]);
  });

  it('pages registry entries deterministically', () => {
    expect(paginateVocabularyEntries(sampleEntries, 1, 2).map((entry) => entry.term)).toEqual([
      'abandonment',
      'burden of proof',
    ]);
    expect(paginateVocabularyEntries(sampleEntries, 2, 2).map((entry) => entry.term)).toEqual([
      'carrier',
    ]);
    expect(clampVocabularyPage(9, 2)).toBe(2);
    expect(getVocabularyPageCount(0, VOCABULARY_PAGE_SIZE_DEFAULT)).toBe(0);
  });

  it('builds compact search summaries', () => {
    expect(buildVocabularySearchSummary(3585)).toBe(
      'Virtualized list over 3,585 matched terms',
    );
    expect(buildVocabularySearchSummary(0)).toBe(
      'No terms matched the current search and filter.',
    );
  });

  it('keeps the homepage boundary note stable', () => {
    expect(VOCABULARY_BOUNDARY_HOME_NOTE).toBe(
      'Vocabulary is boundary-only and excluded from deterministic reasoning.',
    );
  });

  it('keeps the vocabulary list note aligned with boundary-console semantics', () => {
    expect(VOCABULARY_BOUNDARY_LIST_NOTE).toBe(
      'Recognized vocabulary remains visible here for search and inspection, but it is not admitted to runtime ontology.',
    );
  });

  it('keeps registry sort options available for the top selector', () => {
    expect(VOCABULARY_REGISTRY_SORT_OPTIONS.map((option) => option.key)).toEqual([
      'term_az',
      'term_za',
      'meaning_first',
      'without_meaning_first',
      'registry_only_first',
      'packet_backed_first',
    ]);
  });
});


describe('VocabularyPage component', () => {
  it('keeps the registry console template and styles free of plain-list leftovers', () => {
    const template = readFileSync(new URL('./vocabulary-page.component.html', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('./vocabulary-page.component.css', import.meta.url), 'utf8');

    expect(template).toContain('Registry console');
    expect(template).toContain('Search registry');
    expect(template).toContain('type="text"');
    expect(template).not.toContain('type="search"');
    expect(template).not.toContain('matIconButton');
    expect(template).toContain('Clear registry search');
    expect(template).toContain('(click)="clearSearch(vocabularySearchInput)"');
    expect(template).toContain('Sort view');
    expect(template).toContain('pdm-vocabulary-page__sort-trigger');
    expect(template).toContain('pdm-vocabulary-page__sort-options');
    expect(template).toContain('pdm-vocabulary-page__sort-caret');
    expect(template).toContain('(click)="toggleSortMenu()"');
    expect(template).toContain('(click)="selectSort(sortOption.key)"');
    expect(template).not.toContain('<select');
    expect(template).not.toContain('cdk-virtual-scroll-viewport');
    expect(template).not.toContain('cdkVirtualFor');
    expect(template).toContain('*ngFor="let entry of virtualEntries(); trackBy: trackVocabularyEntry"');
    expect(template).toContain('virtualTopPadding()');
    expect(template).toContain('virtualBottomPadding()');
    expect(template).toContain('(scroll)="onVirtualScroll($event)"');
    expect(template).toContain('pdm-vocabulary-page__term-viewport');
    expect(template).toContain('data-vocabulary-selected-detail="true"');
    expect(template).toContain('{{ displayTerm(entry.term) }}');
    expect(template).toContain('Canonical term: {{ entry.term }}');
    expect(template).toContain('hasDisplayTermAlias(entry.term)');
    expect(template).not.toContain('@for (entry of filteredEntries()');
    expect(template).not.toContain('pdm-vocabulary-page__pager-shell');
    expect(template).toContain('app-inspectable-item-disclosure');
    expect(template).toContain('[semanticData]="entry"');
    expect(template.indexOf('pdm-vocabulary-page__selected-detail')).toBeLessThan(
      template.indexOf('app-inspectable-item-disclosure'),
    );
    expect(template).toContain('entry.meaningSources');
    expect(template).toContain('Vocabulary meanings');
    expect(template).toContain('meaningInLawCount()');
    expect(template).toContain('Entries with meaningInLaw');
    expect(template).toContain('hasMeaningInLaw(entry)');
    expect(template).toContain('pdm-vocabulary-page__term-badge--meaning');
    expect(template).toContain('This vocabulary entry has meaningInLaw');
    expect(styles).toContain('.pdm-vocabulary-page__meaning-dot');
    expect(styles).toContain('.pdm-vocabulary-page__term-viewport');
    expect(styles).toContain('height: min(68vh, 760px)');
    expect(template).toContain('source.supportNoteDisplay');
    expect(template).not.toContain('{{ source.supportNote }}');
    expect(template).toContain('more supporting references');
    expect(template).toContain('Supporting lexicon references');
    expect(template).toContain('source.citationDisplay');
    expect(template).toContain('source.pageDisplay');
    expect(template).toContain('Reference status: Reference-only. Not runtime ontology admission.');
    expect(template).toContain('shouldRenderBoundaryNote(entry)');
    expect(template).toContain('{{ entry.boundaryNote }}');
    expect(template).not.toContain('<dd>{{ entry.whyRegistryOnly }}</dd>');
    expect(template).not.toContain('entry.boundaryNote ??');
    expect(template).not.toContain('term-list');
    expect(template).not.toContain('Search vocabulary terms');
    expect(styles).not.toContain('.pdm-vocabulary-page__term {');
    expect(styles).not.toContain('.pdm-vocabulary-page__term-list');
  });
});
