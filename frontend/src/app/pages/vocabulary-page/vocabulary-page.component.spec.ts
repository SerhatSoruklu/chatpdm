import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import type { VocabularyBoundaryBuckets, VocabularyBoundaryEntry } from '../../core/vocabulary/vocabulary-boundary.types';
import {
  buildVocabularyPaginationTokens,
  buildVocabularyRegistryFilterOptions,
  buildVocabularySearchSummary,
  clampVocabularyPage,
  filterVocabularyEntries,
  getVocabularyPageCount,
  paginateVocabularyEntries,
  VOCABULARY_BOUNDARY_HOME_NOTE,
  VOCABULARY_BOUNDARY_LIST_NOTE,
  VOCABULARY_BUCKET_LABELS,
  VOCABULARY_PAGE_SIZE_DEFAULT,
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

const sampleBoundaryResponse = {
  total: 3,
  terms: sampleEntries.map((entry) => entry.term),
  entries: sampleEntries,
  buckets: sampleBuckets,
  surfaceCounts: {
    publishedConceptPackets: 99,
    liveRuntimeConcepts: 12,
    visibleOnlyConcepts: 6,
    rejectedConcepts: 3,
  },
} as const;

const sampleBoundaryState = {
  status: 'ready',
  data: sampleBoundaryResponse,
} as const;

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

  it('filters registry entries by bucket before search text', () => {
    expect(filterVocabularyEntries(sampleEntries, '', 'derived').map((entry) => entry.term)).toEqual([
      'burden of proof',
    ]);
    expect(filterVocabularyEntries(sampleEntries, 'carrier', 'derived')).toEqual([]);
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
    expect(buildVocabularySearchSummary(24, 3585, 1, 150)).toBe(
      'Showing 24 of 3,585 matched terms · page 1 of 150',
    );
    expect(buildVocabularySearchSummary(0, 0, 1, 0)).toBe(
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
});


describe('VocabularyPage component', () => {
  it('keeps the registry console template and styles free of plain-list leftovers', () => {
    const template = readFileSync(new URL('./vocabulary-page.component.html', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('./vocabulary-page.component.css', import.meta.url), 'utf8');

    expect(template).toContain('Registry console');
    expect(template).toContain('Search registry');
    expect(template).toContain('pdm-vocabulary-page__term-grid');
    expect(template).toContain('pdm-vocabulary-page__pager-shell');
    expect(template).not.toContain('term-list');
    expect(template).not.toContain('Search vocabulary terms');
    expect(styles).not.toContain('.pdm-vocabulary-page__term {');
    expect(styles).not.toContain('.pdm-vocabulary-page__term-list');
  });
});
