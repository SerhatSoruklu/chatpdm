export interface VocabularyBoundaryBuckets {
  readonly unknown_structure: number;
  readonly derived: number;
  readonly procedural: number;
  readonly carrier: number;
  readonly rejected_candidate: number;
}

export interface VocabularyBoundaryMeaningSource {
  readonly sourceId: string;
  readonly sourceTitle: string;
  readonly year: number;
  readonly page: number;
  readonly lineNumber: number | null;
  readonly headword: string | null;
  readonly citationDisplay: string;
  readonly pageDisplay: string;
  readonly supportNoteDisplay: string;
  readonly snippetDisplay: string | null;
  readonly showSnippet: boolean;
  readonly qualityFlag: 'clean' | 'suppressed' | 'suppressed_noisy';
  readonly referenceRole: 'supporting_lexicon_reference';
}

export interface VocabularyBoundaryEntry {
  readonly term: string;
  readonly family: string;
  readonly familyLabel: string;
  readonly classification: keyof VocabularyBoundaryBuckets;
  readonly classificationLabel: string;
  readonly sourceStatus: 'packet_backed' | 'registry_only';
  readonly sourceStatusLabel: string;
  readonly meaningInLaw: string | null;
  readonly meaningSources: readonly VocabularyBoundaryMeaningSource[];
  readonly registryInterpretation: string;
  readonly whyRegistryOnly: string;
  readonly shortMeaning: string;
  readonly definition: string;
  readonly example: string | null;
  readonly nearMiss: string | null;
  readonly nonGoal: string | null;
  readonly boundaryNote: string | null;
  readonly relatedTerms: readonly string[];
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
