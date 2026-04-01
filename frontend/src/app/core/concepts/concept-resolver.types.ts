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
  | 'invalid_query';

export interface QueryInterpretation {
  interpretationType:
    | 'narrower_subtype'
    | 'broader_topic'
    | 'comparison_not_supported'
    | 'relation_not_supported'
    | 'role_or_actor_not_supported'
    | 'ambiguous_selection'
    | 'validation_blocked'
    | 'scoped_clarification'
    | 'out_of_scope'
    | 'unsupported_complex'
    | 'canonical_lookup_not_found'
    | 'exact_concept_not_found'
    | 'visible_only_public_concept'
    | 'explicitly_rejected_concept'
    | 'invalid_query';
  message: string;
  baseConcept?: string;
  modifier?: string;
  concepts?: string[];
  relationTerm?: string;
  actorTerm?: string;
  targetConceptId?: string;
  concept?: string;
  domain?: string;
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

export interface ReadingRegisterCanonicalBinding {
  conceptId: string;
  conceptVersion: number;
  canonicalHash: string;
}

export interface ReadingRegisterFields {
  shortDefinition: string;
  coreMeaning: string;
  fullDefinition: string;
}

export type ReadingRegisterMode = 'standard' | 'simplified' | 'formal';

export interface ReadingRegisterValidationReason {
  code: string;
  field?: string;
  detail?: string;
}

export interface ReadingRegisterModeValidation {
  status: 'available' | 'rejected';
  reasons: ReadingRegisterValidationReason[];
}

export interface ReadingRegisterValidation {
  availableModes: ReadingRegisterMode[];
  modes: {
    standard: ReadingRegisterModeValidation;
    simplified: ReadingRegisterModeValidation;
    formal: ReadingRegisterModeValidation;
  };
}

export interface ReadingRegisters {
  readOnly: true;
  canonicalBinding: ReadingRegisterCanonicalBinding;
  validation: ReadingRegisterValidation;
  standard: ReadingRegisterFields;
  simplified: ReadingRegisterFields;
  formal: ReadingRegisterFields;
}

export interface GovernanceStateTrace {
  conceptId: string;
  validatorSource: 'validator_artifact' | 'unavailable';
  unavailableReason: 'artifact_missing' | 'artifact_invalid' | 'concept_state_missing' | null;
  relationSource: 'authored' | 'fallback' | 'none' | null;
  lawSource: 'authored' | 'fallback' | 'none' | null;
  relationDataPresent: boolean;
  dataSource: 'authored_relation_packets' | 'default_seed_relations' | 'none' | null;
}

export interface GovernanceState {
  source: 'validator_artifact' | 'unavailable';
  available: boolean;
  validationState: 'language_invalid' | 'language_valid' | 'structurally_incomplete' | 'fully_validated' | null;
  v3Status: 'not_applicable' | 'incomplete' | 'passing' | null;
  relationStatus: 'not_applicable' | 'incomplete' | 'passing' | null;
  lawStatus: 'not_applicable' | 'failing' | 'warning_only' | 'passing' | null;
  enforcementStatus: 'not_applicable' | 'passing' | 'warning_only' | 'blocked' | null;
  systemValidationState:
    | 'language_invalid'
    | 'language_valid'
    | 'structurally_incomplete'
    | 'law_warning_only'
    | 'law_blocked'
    | 'law_validated'
    | null;
  isBlocked: boolean;
  isStructurallyIncomplete: boolean;
  isFullyValidated: boolean;
  isActionable: boolean;
  trace: GovernanceStateTrace;
}

export interface ReviewState {
  admission:
    | 'blocked'
    | 'phase1_passed'
    | 'phase2_stable'
    | 'pending_overlap_scan'
    | 'overlap_scan_passed'
    | 'overlap_scan_failed_conflict'
    | 'overlap_scan_failed_duplicate'
    | 'overlap_scan_failed_compression'
    | 'overlap_scan_boundary_required';
  lastValidatedAt: string;
  validationSource: 'system' | 'manual_review';
}

export interface RejectionState {
  status: 'REJECTED';
  decisionType: 'STRUCTURAL_REJECTION';
  finality: boolean;
}

export interface ConceptDetailResponse {
  conceptId: string;
  title: string | null;
  shortDefinition: string | null;
  coreMeaning: string | null;
  fullDefinition: string | null;
  governanceState: GovernanceState;
  reviewState: ReviewState | null;
  rejection: RejectionState | null;
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
    governanceState: GovernanceState;
    registers: ReadingRegisters;
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

export interface InvalidQueryResponse {
  type: 'invalid_query';
  query: string;
  normalizedQuery: string;
  contractVersion: string;
  normalizerVersion: string;
  matcherVersion: string;
  conceptSetVersion: string;
  queryType: 'invalid_query';
  interpretation: QueryInterpretation;
  resolution: {
    method: 'invalid_query';
  };
  message: string;
}

export interface UnsupportedQueryTypeResponse {
  type: 'unsupported_query_type';
  query: string;
  normalizedQuery: string;
  contractVersion: string;
  normalizerVersion: string;
  matcherVersion: string;
  conceptSetVersion: string;
  queryType: 'relation_query' | 'role_or_actor_query' | 'unsupported_complex_query';
  interpretation: QueryInterpretation;
  resolution: {
    method: 'unsupported_query_type';
  };
  message: string;
}

export type RefusalResponse =
  | NoExactMatchResponse
  | InvalidQueryResponse
  | UnsupportedQueryTypeResponse;

export interface RejectedConceptResponse {
  type: 'rejected_concept';
  query: string;
  normalizedQuery: string;
  contractVersion: string;
  normalizerVersion: string;
  matcherVersion: string;
  conceptSetVersion: string;
  queryType: 'exact_concept_query' | 'canonical_id_query';
  interpretation: QueryInterpretation & {
    interpretationType: 'explicitly_rejected_concept';
    targetConceptId: string;
    concepts: string[];
  };
  resolution: {
    method: 'rejection_registry';
    conceptId: string;
  };
  message: string;
  rejection: RejectionState;
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
  | RejectedConceptResponse
  | RefusalResponse
  | AmbiguousMatchResponse
  | ComparisonResponse;
