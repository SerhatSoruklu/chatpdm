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
    | 'scoped_clarification'
    | 'out_of_scope'
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

export type DerivedExplanationOverlayStatus =
  | 'absent'
  | 'pending_generation'
  | 'generated'
  | 'invalid';

export interface DerivedExplanationOverlayCanonicalBinding {
  conceptId: string;
  conceptVersion: number;
  canonicalHash: string;
}

export interface DerivedExplanationOverlayFieldCheck {
  strategy: 'identity' | 'prefixed_copy';
  prefix: string;
  canonicalSuffixMatch: true;
}

export interface DerivedExplanationEquivalenceCertificate {
  status: 'certified';
  certificateVersion: string;
  templateVersion: string;
  canonicalHash: string;
  mode: 'standard' | 'simplified' | 'formal';
  fieldChecks: {
    shortDefinition: DerivedExplanationOverlayFieldCheck;
    coreMeaning: DerivedExplanationOverlayFieldCheck;
    fullDefinition: DerivedExplanationOverlayFieldCheck;
  };
}

export interface DerivedExplanationOverlayFields {
  shortDefinition: string | null;
  coreMeaning: string | null;
  fullDefinition: string | null;
}

export interface DerivedExplanationOverlayModeShell {
  status: DerivedExplanationOverlayStatus;
  fields: DerivedExplanationOverlayFields;
  equivalenceCertificate: DerivedExplanationEquivalenceCertificate | null;
}

export interface DerivedExplanationOverlays {
  readOnly: true;
  status: DerivedExplanationOverlayStatus;
  canonicalBinding: DerivedExplanationOverlayCanonicalBinding;
  modes: {
    standard: DerivedExplanationOverlayModeShell;
    simplified: DerivedExplanationOverlayModeShell;
    formal: DerivedExplanationOverlayModeShell;
  };
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
    derivedExplanationOverlays: DerivedExplanationOverlays;
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

export interface ComparisonAxisValue {
  axis: string;
  A: string;
  B: string;
}

export interface ComparisonAxisStatement {
  axis: string;
  statement: string;
}

export type ComparisonAxis = ComparisonAxisValue | ComparisonAxisStatement;

export interface ComparisonResponse {
  type: 'comparison';
  mode: 'comparison';
  query: string;
  normalizedQuery: string;
  contractVersion: string;
  normalizerVersion: string;
  matcherVersion: string;
  conceptSetVersion: string;
  queryType: 'comparison_query';
  interpretation: null;
  comparison: {
    conceptA: string;
    conceptB: string;
    axes: ComparisonAxis[];
  };
}

export type ResolveProductResponse =
  | ConceptMatchResponse
  | NoExactMatchResponse
  | AmbiguousMatchResponse
  | ComparisonResponse;
