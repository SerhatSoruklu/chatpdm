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
export type VocabularyRegistrySortKey =
  | 'term_az'
  | 'term_za'
  | 'meaning_first'
  | 'without_meaning_first'
  | 'registry_only_first'
  | 'packet_backed_first';

export interface VocabularyRegistryFilterOption {
  readonly key: VocabularyRegistryFilterKey;
  readonly label: string;
  readonly count: number;
}

export interface VocabularyRegistrySortOption {
  readonly key: VocabularyRegistrySortKey;
  readonly label: string;
}

export const VOCABULARY_REGISTRY_SORT_OPTIONS: readonly VocabularyRegistrySortOption[] = [
  {
    key: 'term_az',
    label: 'A-Z',
  },
  {
    key: 'term_za',
    label: 'Z-A',
  },
  {
    key: 'meaning_first',
    label: 'Meanings first',
  },
  {
    key: 'without_meaning_first',
    label: 'Without meanings first',
  },
  {
    key: 'registry_only_first',
    label: 'Registry-only first',
  },
  {
    key: 'packet_backed_first',
    label: 'Packet-backed first',
  },
];

export interface VocabularyPaginationToken {
  readonly kind: 'page' | 'ellipsis';
  readonly page?: number;
  readonly label: string;
  readonly active: boolean;
}

export interface VocabularySearchIndexEntry {
  readonly entry: VocabularyBoundaryEntry;
  readonly searchText: string;
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

export function getVocabularyMeaningInLawCount(entries: readonly VocabularyBoundaryEntry[]): number {
  return entries.filter(hasVocabularyMeaningInLaw).length;
}

export function hasVocabularyMeaningInLaw(entry: VocabularyBoundaryEntry): boolean {
  return (entry.meaningInLaw ?? '').trim().length > 0;
}

export function displayVocabularyTerm(term: string): string {
  return term.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

export function hasVocabularyDisplayTermAlias(term: string): boolean {
  return displayVocabularyTerm(term) !== term;
}

export function buildVocabularySearchIndex(
  entries: readonly VocabularyBoundaryEntry[],
): readonly VocabularySearchIndexEntry[] {
  return entries.map((entry) => ({
    entry,
    searchText: buildVocabularySearchText(entry),
  }));
}

export function filterVocabularySearchIndex(
  indexedEntries: readonly VocabularySearchIndexEntry[],
  rawQuery: string,
  filterKey: VocabularyRegistryFilterKey,
): readonly VocabularyBoundaryEntry[] {
  const query = rawQuery.trim().toLowerCase();
  const bucketFiltered = filterKey === 'all'
    ? indexedEntries
    : indexedEntries.filter(({ entry }) => entry.classification === filterKey);

  if (query.length === 0) {
    return bucketFiltered.map(({ entry }) => entry);
  }

  return bucketFiltered
    .filter(({ searchText }) => searchText.includes(query))
    .map(({ entry }) => entry);
}

export function filterVocabularyEntries(
  entries: readonly VocabularyBoundaryEntry[],
  rawQuery: string,
  filterKey: VocabularyRegistryFilterKey,
): readonly VocabularyBoundaryEntry[] {
  return filterVocabularySearchIndex(buildVocabularySearchIndex(entries), rawQuery, filterKey);
}

export function sortVocabularyEntries(
  entries: readonly VocabularyBoundaryEntry[],
  sortKey: VocabularyRegistrySortKey,
): readonly VocabularyBoundaryEntry[] {
  const sortedEntries = [...entries];

  switch (sortKey) {
    case 'term_za':
      return sortedEntries.sort((a, b) => compareVocabularyTerms(b, a));
    case 'meaning_first':
      return sortedEntries.sort((a, b) => (
        compareBooleanRank(hasVocabularyMeaningInLaw(a), hasVocabularyMeaningInLaw(b))
        || compareVocabularyTerms(a, b)
      ));
    case 'without_meaning_first':
      return sortedEntries.sort((a, b) => (
        compareBooleanRank(!hasVocabularyMeaningInLaw(a), !hasVocabularyMeaningInLaw(b))
        || compareVocabularyTerms(a, b)
      ));
    case 'registry_only_first':
      return sortedEntries.sort((a, b) => (
        compareBooleanRank(a.sourceStatus === 'registry_only', b.sourceStatus === 'registry_only')
        || compareVocabularyTerms(a, b)
      ));
    case 'packet_backed_first':
      return sortedEntries.sort((a, b) => (
        compareBooleanRank(a.sourceStatus === 'packet_backed', b.sourceStatus === 'packet_backed')
        || compareVocabularyTerms(a, b)
      ));
    case 'term_az':
    default:
      return sortedEntries.sort(compareVocabularyTerms);
  }
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
  filteredCount: number,
): string {
  if (filteredCount === 0) {
    return 'No terms matched the current search and filter.';
  }

  const formatter = new Intl.NumberFormat('en-US');

  return `Virtualized list over ${formatter.format(filteredCount)} matched terms`;
}

export function normalizeVocabularyDisplayText(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ');
}

export function shouldRenderVocabularyBoundaryNote(entry: VocabularyBoundaryEntry): boolean {
  const boundaryNote = normalizeVocabularyDisplayText(entry.boundaryNote);

  return boundaryNote.length > 0
    && boundaryNote !== normalizeVocabularyDisplayText(entry.whyRegistryOnly);
}

function buildVocabularySearchText(entry: VocabularyBoundaryEntry): string {
  // Legacy registry payload fields remain searchable here for compatibility only.
  // The canonical semantic contract now lives in the disclosure fields.
  return [
    entry.term,
    displayVocabularyTerm(entry.term),
    entry.familyLabel,
    entry.classificationLabel,
    entry.sourceStatusLabel,
    entry.meaningInLaw ?? '',
    ...entry.meaningSources.flatMap((source) => [
      source.sourceTitle,
      source.sourceId,
      source.supportNoteDisplay,
      source.snippetDisplay ?? '',
      source.page.toString(),
      source.year.toString(),
    ]),
    entry.registryInterpretation,
    entry.whyRegistryOnly,
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

function compareVocabularyTerms(a: VocabularyBoundaryEntry, b: VocabularyBoundaryEntry): number {
  return a.term.localeCompare(b.term, 'en', { sensitivity: 'base' });
}

function compareBooleanRank(a: boolean, b: boolean): number {
  return Number(b) - Number(a);
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
