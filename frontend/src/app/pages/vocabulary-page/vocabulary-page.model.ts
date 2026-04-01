import type { VocabularyBoundaryBuckets } from '../../core/vocabulary/vocabulary-boundary.types';

export const VOCABULARY_BOUNDARY_HOME_NOTE =
  'Vocabulary is boundary-only and excluded from deterministic reasoning.';

export const VOCABULARY_BOUNDARY_LIST_NOTE =
  'You can use these terms for reference and idea generation. They are recognized by the system but not used for deterministic reasoning.';

export const VOCABULARY_BUCKET_LABELS: Record<keyof VocabularyBoundaryBuckets, string> = {
  unknown_structure: 'Unknown structure',
  derived: 'Derived',
  procedural: 'Procedural',
  carrier: 'Carrier',
  rejected_candidate: 'Rejected candidate',
};

export function filterVocabularyTerms(
  terms: readonly string[],
  rawQuery: string,
): readonly string[] {
  const query = rawQuery.trim().toLowerCase();

  if (query.length === 0) {
    return terms;
  }

  return terms.filter((term) => term.toLowerCase().includes(query));
}
