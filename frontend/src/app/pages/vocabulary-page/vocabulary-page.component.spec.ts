import { describe, expect, it } from 'vitest';

import {
  filterVocabularyTerms,
  VOCABULARY_BOUNDARY_HOME_NOTE,
  VOCABULARY_BOUNDARY_LIST_NOTE,
  VOCABULARY_BUCKET_LABELS,
} from './vocabulary-page.model';

describe('VocabularyPage helpers', () => {
  it('filters vocabulary terms case-insensitively', () => {
    expect(
      filterVocabularyTerms(['abandonment', 'burden of proof', 'carrier'], 'BURDEN'),
    ).toEqual(['burden of proof']);
  });

  it('returns the full list when the search query is empty', () => {
    const terms = ['abandonment', 'burden of proof', 'carrier'];

    expect(filterVocabularyTerms(terms, '   ')).toEqual(terms);
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
