import { describe, expect, it } from 'vitest';

import {
  buildVocabularyRegistryFilterOptions,
  buildVocabularyRegistryItems,
  buildVocabularyRegistryPageTokens,
  filterVocabularyRegistryEntries,
  filterVocabularyTerms,
  formatVocabularyRegistryTerm,
  paginateVocabularyRegistryEntries,
  VOCABULARY_BOUNDARY_HOME_NOTE,
  VOCABULARY_BOUNDARY_LIST_NOTE,
  VOCABULARY_BUCKET_LABELS,
  VOCABULARY_REGISTRY_PAGE_SIZE_DEFAULT,
  VOCABULARY_REGISTRY_PAGE_SIZE_OPTIONS,
} from './vocabulary-page.model';

import type { VocabularyBoundaryEntry } from '../../core/vocabulary/vocabulary-boundary.types';

function createBoundaryEntry(
  overrides: Partial<VocabularyBoundaryEntry> = {},
): VocabularyBoundaryEntry {
  return {
    term: 'carrier',
    family: 'registry',
    familyLabel: 'Registry',
    classification: 'carrier',
    classificationLabel: 'Carrier',
    sourceStatus: 'recognized',
    sourceStatusLabel: 'Recognized',
    shortMeaning: 'Short meaning',
    example: null,
    nearMiss: null,
    nonGoal: null,
    boundaryNote: null,
    relatedTerms: [],
    ...overrides,
  };
}

describe('VocabularyPage helpers', () => {
  it('inserts semantic break opportunities into snake_case terms', () => {
    expect(formatVocabularyRegistryTerm('actual_notice')).toBe('actual_<wbr>notice');
  });

  it('filters vocabulary terms case-insensitively', () => {
    expect(
      filterVocabularyTerms(['abandonment', 'burden of proof', 'carrier'], 'BURDEN'),
    ).toEqual(['burden of proof']);
  });

  it('returns the full list when the search query is empty', () => {
    const terms = ['abandonment', 'burden of proof', 'carrier'];

    expect(filterVocabularyTerms(terms, '   ')).toEqual(terms);
  });

  it('builds filter options from the public boundary buckets', () => {
    expect(
      buildVocabularyRegistryFilterOptions({
        total: 12,
        buckets: {
          unknown_structure: 3,
          derived: 4,
          procedural: 2,
          carrier: 2,
          rejected_candidate: 1,
        },
      }),
    ).toEqual([
      { key: 'all', label: 'All', count: 12 },
      { key: 'unknown_structure', label: 'Unknown structure', count: 3 },
      { key: 'derived', label: 'Derived', count: 4 },
      { key: 'procedural', label: 'Procedural', count: 2 },
      { key: 'carrier', label: 'Carrier', count: 2 },
      { key: 'rejected_candidate', label: 'Rejected candidate', count: 1 },
    ]);
  });

  it('builds future-safe registry items with reserved definition and detail slots', () => {
    expect(buildVocabularyRegistryItems([{ term: 'carrier' }])).toEqual([
      {
        term: 'carrier',
        normalizedVariant: null,
        definition: null,
        shortDefinitionPreview: null,
        badges: ['Recognized', 'Boundary-only'],
        detailsAvailable: false,
      },
    ]);
  });

  it('filters entries by search query and category in a single pass', () => {
    const entries = [
      createBoundaryEntry({ term: 'ab initio', classification: 'derived' }),
      createBoundaryEntry({ term: 'abandonment', classification: 'carrier' }),
      createBoundaryEntry({ term: 'abatement', classification: 'carrier' }),
      createBoundaryEntry({ term: 'burden of proof', classification: 'rejected_candidate' }),
    ];

    expect(filterVocabularyRegistryEntries(entries, 'ab', 'all').map((entry) => entry.term)).toEqual([
      'ab initio',
      'abandonment',
      'abatement',
    ]);

    expect(filterVocabularyRegistryEntries(entries, '', 'carrier').map((entry) => entry.term)).toEqual([
      'abandonment',
      'abatement',
    ]);

    expect(filterVocabularyRegistryEntries(entries, 'ab', 'carrier').map((entry) => entry.term)).toEqual([
      'abandonment',
      'abatement',
    ]);
  });

  it('paginates the filtered registry entries without rendering the full set', () => {
    const entries = Array.from({ length: 61 }, (_value, index) =>
      createBoundaryEntry({ term: `term-${index + 1}` }),
    );

    expect(paginateVocabularyRegistryEntries(entries, 1, VOCABULARY_REGISTRY_PAGE_SIZE_DEFAULT)).toHaveLength(24);
    expect(paginateVocabularyRegistryEntries(entries, 3, VOCABULARY_REGISTRY_PAGE_SIZE_DEFAULT).map((entry) => entry.term)).toEqual([
      'term-49',
      'term-50',
      'term-51',
      'term-52',
      'term-53',
      'term-54',
      'term-55',
      'term-56',
      'term-57',
      'term-58',
      'term-59',
      'term-60',
      'term-61',
    ]);
    expect(paginateVocabularyRegistryEntries(entries, 99, VOCABULARY_REGISTRY_PAGE_SIZE_DEFAULT).map((entry) => entry.term)).toEqual([
      'term-49',
      'term-50',
      'term-51',
      'term-52',
      'term-53',
      'term-54',
      'term-55',
      'term-56',
      'term-57',
      'term-58',
      'term-59',
      'term-60',
      'term-61',
    ]);
  });

  it('builds compact page tokens with ellipses for large result sets', () => {
    expect(buildVocabularyRegistryPageTokens(8, 20)).toEqual([
      { kind: 'page', page: 1, active: false },
      { kind: 'ellipsis', id: 'ellipsis-1-7' },
      { kind: 'page', page: 7, active: false },
      { kind: 'page', page: 8, active: true },
      { kind: 'page', page: 9, active: false },
      { kind: 'ellipsis', id: 'ellipsis-9-20' },
      { kind: 'page', page: 20, active: false },
    ]);
  });

  it('includes short definition previews when the source entry provides them', () => {
    expect(
      buildVocabularyRegistryItems([
        {
          term: 'ab initio',
          definition: {
            short: 'From the beginning; treated as existing from the initial state without prior conditions.',
          },
        },
        {
          term: 'abandonment',
          definition: {
            short: 'The voluntary relinquishment of a right, claim, or property without intention to reclaim it.',
          },
        },
        {
          term: 'abatement',
          definition: {
            short: 'The reduction, suspension, or termination of a legal claim, obligation, or proceeding under specific conditions.',
          },
        },
      ]),
    ).toEqual([
      {
        term: 'ab initio',
        normalizedVariant: null,
        definition: {
          short: 'From the beginning; treated as existing from the initial state without prior conditions.',
        },
        shortDefinitionPreview: 'From the beginning; treated as existing from the initial state without prior conditions.',
        badges: ['Recognized', 'Boundary-only'],
        detailsAvailable: false,
      },
      {
        term: 'abandonment',
        normalizedVariant: null,
        definition: {
          short: 'The voluntary relinquishment of a right, claim, or property without intention to reclaim it.',
        },
        shortDefinitionPreview: 'The voluntary relinquishment of a right, claim, or property without intention to reclaim it.',
        badges: ['Recognized', 'Boundary-only'],
        detailsAvailable: false,
      },
      {
        term: 'abatement',
        normalizedVariant: null,
        definition: {
          short: 'The reduction, suspension, or termination of a legal claim, obligation, or proceeding under specific conditions.',
        },
        shortDefinitionPreview: 'The reduction, suspension, or termination of a legal claim, obligation, or proceeding under specific conditions.',
        badges: ['Recognized', 'Boundary-only'],
        detailsAvailable: false,
      },
    ]);
  });

  it('keeps the page-size options fixed for the registry browser', () => {
    expect(VOCABULARY_REGISTRY_PAGE_SIZE_OPTIONS).toEqual([12, 24, 48, 96]);
  });

  it('exposes fixed bucket labels for the public boundary page', () => {
    expect(VOCABULARY_BUCKET_LABELS.unknown_structure).toBe('Unknown structure');
    expect(VOCABULARY_BUCKET_LABELS.rejected_candidate).toBe('Rejected candidate');
  });

  it('keeps the homepage boundary note stable', () => {
    expect(VOCABULARY_BOUNDARY_HOME_NOTE).toBe(
      'Vocabulary is boundary-only and excluded from deterministic reasoning.',
    );
  });

  it('keeps the vocabulary list note stable', () => {
    expect(VOCABULARY_BOUNDARY_LIST_NOTE).toBe(
      'You can use these terms for reference and idea generation. They are recognized by the system but not used for deterministic reasoning.',
    );
  });
});
