import type {
  VocabularyBoundaryBuckets,
  VocabularyBoundaryEntry,
  VocabularyBoundaryResponse,
  VocabularyTermDefinition,
} from '../../core/vocabulary/vocabulary-boundary.types';

export interface VocabularyRegistrySourceEntry {
  readonly term: string;
  readonly definition?: VocabularyTermDefinition | null;
}

export type VocabularyRegistryFilterKey = 'all' | keyof VocabularyBoundaryBuckets;

export interface VocabularyRegistryFilterOption {
  readonly key: VocabularyRegistryFilterKey;
  readonly label: string;
  readonly count: number;
}

export const VOCABULARY_REGISTRY_PAGE_SIZE_DEFAULT = 24;
export const VOCABULARY_REGISTRY_PAGE_SIZE_OPTIONS = [12, 24, 48, 96] as const;
export type VocabularyRegistryPageSize =
  typeof VOCABULARY_REGISTRY_PAGE_SIZE_OPTIONS[number];

export interface VocabularyRegistryItem {
  readonly term: string;
  readonly normalizedVariant: string | null;
  readonly definition: VocabularyTermDefinition | null;
  readonly shortDefinitionPreview: string | null;
  readonly badges: readonly string[];
  readonly detailsAvailable: boolean;
}

export type VocabularyRegistryPageToken =
  | {
    readonly kind: 'page';
    readonly page: number;
    readonly active: boolean;
  }
  | {
    readonly kind: 'ellipsis';
    readonly id: string;
  };

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

export function buildVocabularyRegistryFilterOptions(
  boundaryData: Pick<VocabularyBoundaryResponse, 'total' | 'buckets'> | null,
): readonly VocabularyRegistryFilterOption[] {
  if (!boundaryData) {
    return [];
  }

  return [
    {
      key: 'all',
      label: 'All',
      count: boundaryData.total,
    },
    ...(Object.keys(VOCABULARY_BUCKET_LABELS) as Array<keyof VocabularyBoundaryBuckets>).map((key) => ({
      key,
      label: VOCABULARY_BUCKET_LABELS[key],
      count: boundaryData.buckets[key],
    })),
  ];
}

export function buildVocabularyRegistryItems(
  entries: readonly VocabularyRegistrySourceEntry[],
): readonly VocabularyRegistryItem[] {
  return entries.map((entry) => {
    const definition = entry.definition ?? null;

    return {
      term: entry.term,
      normalizedVariant: null,
      definition,
      shortDefinitionPreview: definition?.short?.trim() ?? null,
      badges: ['Recognized', 'Boundary-only'],
      detailsAvailable: false,
    };
  });
}

export function formatVocabularyRegistryTerm(term: string): string {
  return term.replace(/_/g, '_<wbr>');
}

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

export function filterVocabularyRegistryEntries(
  entries: readonly VocabularyBoundaryEntry[],
  rawQuery: string,
  categoryFilter: VocabularyRegistryFilterKey,
): readonly VocabularyBoundaryEntry[] {
  const query = rawQuery.trim().toLowerCase();

  return entries.filter((entry) => {
    if (categoryFilter !== 'all' && entry.classification !== categoryFilter) {
      return false;
    }

    if (query.length === 0) {
      return true;
    }

    return entry.term.toLowerCase().includes(query);
  });
}

export function paginateVocabularyRegistryEntries(
  entries: readonly VocabularyBoundaryEntry[],
  currentPage: number,
  pageSize: number,
): readonly VocabularyBoundaryEntry[] {
  if (entries.length === 0) {
    return [];
  }

  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : VOCABULARY_REGISTRY_PAGE_SIZE_DEFAULT;
  const totalPages = Math.max(1, Math.ceil(entries.length / safePageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * safePageSize;

  return entries.slice(startIndex, startIndex + safePageSize);
}

export function clampVocabularyRegistryPage(
  currentPage: number,
  totalPages: number,
): number {
  if (!Number.isInteger(currentPage)) {
    return 1;
  }

  if (totalPages <= 0) {
    return 1;
  }

  return Math.min(Math.max(1, currentPage), totalPages);
}

export function buildVocabularyRegistryPageTokens(
  currentPage: number,
  totalPages: number,
): readonly VocabularyRegistryPageToken[] {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = clampVocabularyRegistryPage(currentPage, safeTotalPages);

  if (safeTotalPages <= 7) {
    return Array.from({ length: safeTotalPages }, (_value, index) => {
      const page = index + 1;
      return {
        kind: 'page',
        page,
        active: page === safeCurrentPage,
      } as const;
    });
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(safeTotalPages);

  if (safeCurrentPage <= 4) {
    for (let page = 2; page <= 5; page += 1) {
      pages.add(page);
    }
  } else if (safeCurrentPage >= safeTotalPages - 3) {
    for (let page = safeTotalPages - 4; page < safeTotalPages; page += 1) {
      pages.add(page);
    }
  } else {
    pages.add(safeCurrentPage - 1);
    pages.add(safeCurrentPage);
    pages.add(safeCurrentPage + 1);
  }

  const orderedPages = [...pages].sort((left, right) => left - right);
  const tokens: VocabularyRegistryPageToken[] = [];

  orderedPages.forEach((page, index) => {
    if (index > 0 && page - orderedPages[index - 1] > 1) {
      tokens.push({
        kind: 'ellipsis',
        id: `ellipsis-${orderedPages[index - 1]}-${page}`,
      });
    }

    tokens.push({
      kind: 'page',
      page,
      active: page === safeCurrentPage,
    });
  });

  return tokens;
}
