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

export interface VocabularyTermDefinition {
  readonly short?: string;
  readonly core?: string;
  readonly full?: string;
}

export interface VocabularyBoundaryEntry {
  readonly term: string;
  readonly family: string;
  readonly familyLabel: string;
  readonly classification: string;
  readonly classificationLabel: string;
  readonly sourceStatus: string;
  readonly sourceStatusLabel: string;
  readonly shortMeaning: string;
  readonly example: string | null;
  readonly nearMiss: string | null;
  readonly nonGoal: string | null;
  readonly boundaryNote: string | null;
  readonly relatedTerms: readonly string[];
  readonly definition?: VocabularyTermDefinition;
}

export interface VocabularyBoundaryResponse {
  readonly total: number;
  readonly terms: readonly string[];
  readonly entries: readonly VocabularyBoundaryEntry[];
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
