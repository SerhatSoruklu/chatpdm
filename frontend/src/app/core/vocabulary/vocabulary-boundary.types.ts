export interface VocabularyBoundaryBuckets {
  readonly unknown_structure: number;
  readonly derived: number;
  readonly procedural: number;
  readonly carrier: number;
  readonly rejected_candidate: number;
}

export interface VocabularyBoundarySurfaceCounts {
  readonly publishedConceptPackets: number;
  readonly liveRuntimeConcepts: number;
  readonly visibleOnlyConcepts: number;
  readonly rejectedConcepts: number;
}

export interface VocabularyBoundaryResponse {
  readonly total: number;
  readonly terms: readonly string[];
  readonly buckets: VocabularyBoundaryBuckets;
  readonly surfaceCounts: VocabularyBoundarySurfaceCounts;
}

export type VocabularyBoundaryState =
  | {
    readonly status: 'loading';
    readonly data: null;
  }
  | {
    readonly status: 'ready';
    readonly data: VocabularyBoundaryResponse;
  }
  | {
    readonly status: 'error';
    readonly data: null;
    readonly errorMessage: string;
  };

export type VocabularyBoundaryResolvedState =
  | {
    readonly status: 'ready';
    readonly data: VocabularyBoundaryResponse;
  }
  | {
    readonly status: 'error';
    readonly data: null;
    readonly errorMessage: string;
  };
