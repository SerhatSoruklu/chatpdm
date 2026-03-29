export type PolicySurfaceKey = 'privacy' | 'terms' | 'cookies' | 'data-retention';

export type PolicyTraceStatus = 'mapped' | 'unmapped' | 'unclear' | 'conflicts_with_system';

export type PolicyClaimLifecycleClass =
  | 'short_lived'
  | 'session_bound'
  | 'transport_only'
  | 'persistent'
  | 'not_applicable';

export type PolicyClaimDeletionTrigger =
  | 'ttl_expiry'
  | 'browser_clear'
  | 'request_complete'
  | 'manual_delete'
  | 'not_stored';

export type PolicyClaimLifecycleEnforcementStatus = 'declared_only';

export type PolicyClaimStorageForm = 'plaintext' | 'sha256';

export type PolicyClaimControlKey = 'sessionId';

export type PolicyClaimControlAuditTrail = 'whitelist_only_operational_metadata';

export interface PolicyTraceMapping {
  source: string;
  path: string;
  lines: string;
}

export type PolicyCookiesTruthFlowType =
  | 'request_forward'
  | 'request_omit'
  | 'response_forward'
  | 'response_omit';

export type PolicyCookiesTruthMechanism = 'cookie_header' | 'set_cookie_header';

export type PolicyCookiesTruthEssentiality = 'essential' | 'optional';

export type PolicyCookiesTruthSsrRelevance = 'direct' | 'not_applicable';

export type PolicyCookiesTruthBrowserRelevance =
  | 'request_origin'
  | 'response_target'
  | 'not_applicable';

export type PolicyCookiesTruthTransportPlacement =
  | 'browser_to_upstream_via_ssr'
  | 'upstream_to_browser_via_ssr';

export type PolicyCookiesTruthTransportRole = 'request_transport' | 'response_transport';

export type PolicyCookiesTruthBrowserNoteRelevance = 'direct' | 'not_applicable';

export type PolicyTermsEndpointMethod = 'GET' | 'POST';

export type PolicyTermsEndpointOperation = 'concept_resolution' | 'feedback_submission';

export interface PolicyTermsEndpointContract {
  claimId: string;
  operation: PolicyTermsEndpointOperation;
  method: PolicyTermsEndpointMethod;
  path: string;
  requiredQueryParam?: string;
  evidence: readonly PolicyTraceMapping[];
}

export type PolicyTermsFieldContractType =
  | 'request_field'
  | 'enum_value'
  | 'conditional_option';

export type PolicyTermsFieldScope = 'feedback_submission';

export interface PolicyTermsFieldContract {
  claimId: string;
  fieldContractType: PolicyTermsFieldContractType;
  scope: PolicyTermsFieldScope;
  fieldName: string;
  allowedValue?: string;
  conditionField?: string;
  conditionValue?: string;
  evidence: readonly PolicyTraceMapping[];
}

export type PolicyTermsPlatformRuleType = 'cors_origin_allowlist';

export interface PolicyTermsPlatformRule {
  claimId: string;
  ruleType: PolicyTermsPlatformRuleType;
  subject: 'cross_origin_request';
  effect: 'reject_outside_normalized_allowed_origin_set';
  evidence: readonly PolicyTraceMapping[];
}

export type PolicyTermsRuntimeBoundaryType = 'comparison_output_allowlist';

export interface PolicyTermsRuntimeBoundary {
  claimId: string;
  boundaryType: PolicyTermsRuntimeBoundaryType;
  subject: 'comparison_output';
  effect: 'blocked';
  condition: 'non_allowlisted_concept_pairs';
  evidence: readonly PolicyTraceMapping[];
}

export type PolicyTermsRefusalBoundaryType =
  | 'payload_keys_outside_approved_field_set'
  | 'unsupported_response_type'
  | 'invalid_feedback_type_response_type_combination'
  | 'disallowed_candidate_ids'
  | 'disallowed_suggestion_ids'
  | 'minimum_candidate_ids';

export type PolicyTermsRefusalScope = 'feedback_submission';

export interface PolicyTermsRefusalBoundary {
  claimId: string;
  boundaryType: PolicyTermsRefusalBoundaryType;
  scope: PolicyTermsRefusalScope;
  fieldName?: string;
  relatedFields?: readonly string[];
  conditionField?: string;
  conditionValue?: string;
  minimumCount?: number;
  evidence: readonly PolicyTraceMapping[];
}

export interface PolicyTermsTruth {
  endpointContracts: readonly PolicyTermsEndpointContract[];
  fieldContracts: readonly PolicyTermsFieldContract[];
  platformRules: readonly PolicyTermsPlatformRule[];
  runtimeBoundaries: readonly PolicyTermsRuntimeBoundary[];
  refusalBoundaries: readonly PolicyTermsRefusalBoundary[];
}

export interface PolicyClaimLifecycleControls {
  exportBy?: PolicyClaimControlKey;
  deleteBy?: PolicyClaimControlKey;
  auditTrail?: PolicyClaimControlAuditTrail;
}

export interface PolicyClaimLifecycle {
  lifecycleClass: PolicyClaimLifecycleClass;
  ttlDays?: number;
  retentionReason?: string;
  deletionTrigger: PolicyClaimDeletionTrigger;
  enforcementStatus: PolicyClaimLifecycleEnforcementStatus;
  storageForm?: PolicyClaimStorageForm;
  controls?: PolicyClaimLifecycleControls;
}

export interface PolicyClaim {
  id: string;
  policyFile: string;
  section: string;
  policySentence: string;
  canonicalClaim: string;
  claimClass: string;
  systemMapping: string;
  status: PolicyTraceStatus;
  notes: string;
  specialNotes: readonly string[];
  hasInternalTransportNote: boolean;
  lifecycle: PolicyClaimLifecycle;
  traces: readonly PolicyTraceMapping[];
}

export interface PolicyCookiesTruthFact {
  claimId: string;
  flowType: PolicyCookiesTruthFlowType;
  mechanism: PolicyCookiesTruthMechanism;
  essentiality: PolicyCookiesTruthEssentiality;
  ssrRelevance: PolicyCookiesTruthSsrRelevance;
  browserRelevance: PolicyCookiesTruthBrowserRelevance;
  transportPlacement: PolicyCookiesTruthTransportPlacement;
  transportRole: PolicyCookiesTruthTransportRole;
  browserNoteRelevance: PolicyCookiesTruthBrowserNoteRelevance;
  evidence: readonly PolicyTraceMapping[];
}

export interface PolicySummary {
  totalClaims: number;
  mappedClaims: number;
  claimClasses: readonly string[];
  internalTransportNoteCount: number;
}

export interface PolicySurfaceDefinition {
  key: PolicySurfaceKey;
  route: string;
  title: string;
  subtitle: string;
  intro: string;
  sourceTitle: string;
  scopeBullets: readonly string[];
  claims: readonly PolicyClaim[];
  cookiesTruth?: readonly PolicyCookiesTruthFact[];
  termsTruth?: PolicyTermsTruth;
  summary: PolicySummary;
}

export type PolicySurfaceRegistry = Record<PolicySurfaceKey, PolicySurfaceDefinition>;
