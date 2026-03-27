export interface ConceptContext {
  label: string;
  appliesTo: string[];
}

export type QueryType =
  | 'exact_concept_query'
  | 'canonical_id_query'
  | 'ambiguity_query'
  | 'broader_topic_query'
  | 'subtype_query'
  | 'comparison_query'
  | 'relation_query'
  | 'role_or_actor_query'
  | 'unsupported_complex_query'
  | 'invalid_input';

export interface QueryInterpretation {
  interpretationType:
    | 'narrower_subtype'
    | 'broader_topic'
    | 'comparison_not_supported'
    | 'relation_not_supported'
    | 'role_or_actor_not_supported'
    | 'ambiguous_selection'
    | 'unsupported_complex'
    | 'canonical_lookup_not_found';
  message: string;
  baseConcept?: string;
  modifier?: string;
  concepts?: string[];
  relationTerm?: string;
  actorTerm?: string;
  targetConceptId?: string;
}

export interface ConceptSource {
  id: string;
  label: string;
  type: 'dictionary' | 'book' | 'paper' | 'law' | 'article' | 'internal';
  usedFor: string;
}

export interface RelatedConcept {
  conceptId: string;
  title: string;
  relationType: 'see_also' | 'prerequisite' | 'extension' | 'contrast';
}

export interface ConceptMatchResponse {
  type: 'concept_match';
  query: string;
  normalizedQuery: string;
  contractVersion: string;
  normalizerVersion: string;
  matcherVersion: string;
  conceptSetVersion: string;
  queryType: QueryType;
  interpretation: null;
  resolution: {
    method: 'exact_alias' | 'normalized_alias' | 'canonical_id';
    conceptId: string;
    conceptVersion: number;
  };
  answer: {
    title: string;
    shortDefinition: string;
    coreMeaning: string;
    fullDefinition: string;
    contexts: ConceptContext[];
    sources: ConceptSource[];
    relatedConcepts: RelatedConcept[];
  };
}

export interface Suggestion {
  conceptId: string;
  title: string;
  reason: 'similar_term' | 'broader_topic' | 'related_concept';
}

export interface NoExactMatchResponse {
  type: 'no_exact_match';
  query: string;
  normalizedQuery: string;
  contractVersion: string;
  normalizerVersion: string;
  matcherVersion: string;
  conceptSetVersion: string;
  queryType: QueryType;
  interpretation: QueryInterpretation;
  resolution: {
    method: 'no_exact_match';
  };
  message: string;
  suggestions: Suggestion[];
}

export interface AmbiguousCandidate {
  conceptId: string;
  title: string;
  shortDefinition: string;
  basis: 'shared_alias' | 'normalized_overlap' | 'author_defined_disambiguation';
}

export interface AmbiguousMatchResponse {
  type: 'ambiguous_match';
  query: string;
  normalizedQuery: string;
  contractVersion: string;
  normalizerVersion: string;
  matcherVersion: string;
  conceptSetVersion: string;
  queryType: QueryType;
  interpretation: QueryInterpretation;
  resolution: {
    method:
      | 'ambiguous_alias'
      | 'ambiguous_normalized_alias'
      | 'author_defined_disambiguation';
  };
  message: string;
  candidates: AmbiguousCandidate[];
}

export type ResolveProductResponse =
  | ConceptMatchResponse
  | NoExactMatchResponse
  | AmbiguousMatchResponse;
