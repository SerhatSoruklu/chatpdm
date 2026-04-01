export type VocabularyClassificationType =
  | 'legal_term'
  | 'informal_term'
  | 'ambiguous_term';

export interface VocabularyRelations {
  closestConcept?: string;
  contrastWith?: readonly string[];
  relatedConcepts?: readonly string[];
}

export interface VocabularySystemFlags {
  isCoreConcept: false;
  usableInResolver: false;
  reasoningAllowed: false;
}

export interface VocabularyClassificationResult {
  input: string;
  normalizedInput: string;
  matched: boolean;
  term: string | null;
  classification: VocabularyClassificationType | null;
  relations: VocabularyRelations | null;
  systemFlags: VocabularySystemFlags;
}

export interface VocabularyEntry {
  term: string;
  classification: VocabularyClassificationType;
  relations?: VocabularyRelations;
}
