export type NormalizationTransformKind =
  | 'surface_cleanup'
  | 'unicode_nfc'
  | 'percent_decode'
  | 'base64_decode'
  | 'hex_decode'
  | 'reverse_then_base64_decode'
  | 'reverse_then_hex_decode';

export type NormalizationRefusalCode =
  | 'NORMALIZATION_TOO_DEEP'
  | 'NORMALIZATION_TOO_LARGE'
  | 'NORMALIZATION_INVALID_ENCODING'
  | 'NORMALIZATION_AMBIGUOUS'
  | 'NORMALIZATION_NON_TEXT_OUTPUT'
  | 'NORMALIZATION_POLICY_BLOCKED';

export type NormalizationStatus = 'unchanged' | 'normalized' | 'refused';

export type NormalizationDetectionState = 'candidate' | 'not_applicable';

export interface NormalizationDetection {
  transform: NormalizationTransformKind;
  state: NormalizationDetectionState;
}

export interface NormalizationTransformSuccess {
  ok: true;
  text: string;
}

export interface NormalizationTransformFailure {
  ok: false;
  code: NormalizationRefusalCode;
  message: string;
  details: Record<string, unknown>;
}

export type NormalizationTransformResult =
  | NormalizationTransformSuccess
  | NormalizationTransformFailure;

export interface NormalizationAuditStep {
  stepIndex: number;
  transform: NormalizationTransformKind;
  attempted: boolean;
  applied: boolean;
  changed: boolean;
  inputBytes: number;
  outputBytes: number;
  inputPreview: string;
  outputPreview: string;
  refusalCode: NormalizationRefusalCode | null;
}

export interface NormalizationAuditTrail {
  rawBytes: number;
  canonicalBytes: number | null;
  depthUsed: number;
  steps: readonly NormalizationAuditStep[];
}

export interface NormalizationBoundaryMetrics {
  inputBytes: number;
  outputBytes: number | null;
  expansionRatio: number | null;
  changed: boolean;
  appliedTransformKinds: readonly NormalizationTransformKind[];
}

export interface NormalizationUnchangedResult {
  status: 'unchanged';
  rawText: string;
  canonicalText: string;
  rawBytes: number;
  canonicalBytes: number;
  depthUsed: number;
  inputBytes: number;
  outputBytes: number;
  expansionRatio: number;
  changed: false;
  appliedTransformKinds: readonly NormalizationTransformKind[];
  audit: NormalizationAuditTrail;
}

export interface NormalizationNormalizedResult {
  status: 'normalized';
  rawText: string;
  canonicalText: string;
  rawBytes: number;
  canonicalBytes: number;
  depthUsed: number;
  inputBytes: number;
  outputBytes: number;
  expansionRatio: number;
  changed: true;
  appliedTransformKinds: readonly NormalizationTransformKind[];
  audit: NormalizationAuditTrail;
}

export interface NormalizationRefusedResult {
  status: 'refused';
  rawText: string;
  canonicalText: null;
  rawBytes: number;
  canonicalBytes: null;
  depthUsed: number;
  inputBytes: number;
  outputBytes: number | null;
  expansionRatio: number | null;
  changed: boolean;
  appliedTransformKinds: readonly NormalizationTransformKind[];
  refusalCode: NormalizationRefusalCode;
  refusalMessage: string;
  audit: NormalizationAuditTrail;
}

export type NormalizationResult =
  | NormalizationUnchangedResult
  | NormalizationNormalizedResult
  | NormalizationRefusedResult;
