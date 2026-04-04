import type {
  VocabularyBoundaryBuckets,
  VocabularyBoundaryEntry,
} from '../../core/vocabulary/vocabulary-boundary.types';

export const VOCABULARY_BOUNDARY_HOME_NOTE =
  'Vocabulary is boundary-only and excluded from deterministic reasoning.';

export const VOCABULARY_BOUNDARY_LIST_NOTE =
  'Recognized vocabulary remains visible here for search and inspection, but it is not admitted to runtime ontology.';

export const VOCABULARY_BUCKET_LABELS: Record<keyof VocabularyBoundaryBuckets, string> = {
  unknown_structure: 'Unknown structure',
  derived: 'Derived',
  procedural: 'Procedural',
  carrier: 'Carrier',
  rejected_candidate: 'Rejected candidate',
};

export const VOCABULARY_PAGE_SIZE_OPTIONS = [12, 24, 48, 96] as const;
export const VOCABULARY_PAGE_SIZE_DEFAULT = 24;

export type VocabularyRegistryFilterKey = 'all' | keyof VocabularyBoundaryBuckets;

export interface VocabularyRegistryFilterOption {
  readonly key: VocabularyRegistryFilterKey;
  readonly label: string;
  readonly count: number;
}

export interface VocabularyPaginationToken {
  readonly kind: 'page' | 'ellipsis';
  readonly page?: number;
  readonly label: string;
  readonly active: boolean;
}

export function buildVocabularyRegistryFilterOptions(
  total: number,
  buckets: VocabularyBoundaryBuckets,
): readonly VocabularyRegistryFilterOption[] {
  return [
    {
      key: 'all',
      label: 'All terms',
      count: total,
    },
    ...((Object.keys(VOCABULARY_BUCKET_LABELS) as Array<keyof VocabularyBoundaryBuckets>).map((key) => ({
      key,
      label: VOCABULARY_BUCKET_LABELS[key],
      count: buckets[key],
    }))),
  ];
}

export function filterVocabularyEntries(
  entries: readonly VocabularyBoundaryEntry[],
  rawQuery: string,
  filterKey: VocabularyRegistryFilterKey,
): readonly VocabularyBoundaryEntry[] {
  const query = rawQuery.trim().toLowerCase();
  const bucketFiltered = filterKey === 'all'
    ? entries
    : entries.filter((entry) => entry.classification === filterKey);

  if (query.length === 0) {
    return bucketFiltered;
  }

  return bucketFiltered.filter((entry) => buildVocabularySearchText(entry).includes(query));
}

export function getVocabularyPageCount(totalEntries: number, pageSize: number): number {
  if (totalEntries <= 0 || pageSize <= 0) {
    return 0;
  }

  return Math.ceil(totalEntries / pageSize);
}

export function clampVocabularyPage(page: number, pageCount: number): number {
  if (pageCount <= 0) {
    return 1;
  }

  return Math.min(Math.max(page, 1), pageCount);
}

export function paginateVocabularyEntries(
  entries: readonly VocabularyBoundaryEntry[],
  page: number,
  pageSize: number,
): readonly VocabularyBoundaryEntry[] {
  if (entries.length === 0 || pageSize <= 0) {
    return [];
  }

  const start = (page - 1) * pageSize;
  return entries.slice(start, start + pageSize);
}

export function buildVocabularyPaginationTokens(
  page: number,
  pageCount: number,
): readonly VocabularyPaginationToken[] {
  if (pageCount <= 0) {
    return [];
  }

  const activePage = clampVocabularyPage(page, pageCount);

  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => pageToken(index + 1, activePage));
  }

  if (activePage <= 4) {
    const tokens: VocabularyPaginationToken[] = [
      pageToken(1, activePage),
      pageToken(2, activePage),
      pageToken(3, activePage),
      pageToken(4, activePage),
      pageToken(5, activePage),
    ];

    if (pageCount > 6) {
      tokens.push(ellipsisToken());
    }

    tokens.push(pageToken(pageCount, activePage));
    return tokens;
  }

  if (activePage >= pageCount - 3) {
    const tokens: VocabularyPaginationToken[] = [pageToken(1, activePage)];

    if (pageCount > 6) {
      tokens.push(ellipsisToken());
    }

    const start = Math.max(2, pageCount - 4);
    for (let current = start; current <= pageCount; current += 1) {
      tokens.push(pageToken(current, activePage));
    }

    return tokens;
  }

  return [
    pageToken(1, activePage),
    ellipsisToken(),
    pageToken(activePage - 1, activePage),
    pageToken(activePage, activePage),
    pageToken(activePage + 1, activePage),
    ellipsisToken(),
    pageToken(pageCount, activePage),
  ];
}

export function buildVocabularySearchSummary(
  visibleCount: number,
  filteredCount: number,
  currentPage: number,
  pageCount: number,
): string {
  if (filteredCount === 0) {
    return 'No terms matched the current search and filter.';
  }

  const formatter = new Intl.NumberFormat('en-US');

  return `Showing ${formatter.format(visibleCount)} of ${formatter.format(filteredCount)} matched terms · page ${formatter.format(currentPage)} of ${formatter.format(pageCount)}`;
}

function buildVocabularySearchText(entry: VocabularyBoundaryEntry): string {
  return [
    entry.term,
    entry.familyLabel,
    entry.classificationLabel,
    entry.sourceStatusLabel,
    entry.shortMeaning,
    entry.boundaryNote ?? '',
    entry.example ?? '',
    entry.nearMiss ?? '',
    entry.nonGoal ?? '',
    ...entry.relatedTerms,
  ]
    .join(' ')
    .toLowerCase();
}

function pageToken(page: number, activePage: number): VocabularyPaginationToken {
  return {
    kind: 'page',
    page,
    label: page.toString(),
    active: page === activePage,
  };
}

function ellipsisToken(): VocabularyPaginationToken {
  return {
    kind: 'ellipsis',
    label: '…',
    active: false,
  };
}
