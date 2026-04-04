export type ZeroglareDiagnosticStatus = 'clear' | 'pressure' | 'fail' | 'refused';

export type ZeroglarePrimaryActionType = 'review_analysis' | 'inspect_signals' | 'copy_response';
export type ZeroglareConversationalPattern =
  | 'ambiguity_uncertain_interpretation'
  | 'soft_pressure_expectation_frame';

export interface ZeroglareAnalysisRefusal {
  contract_name?: string;
  reason_code?: string;
  reason?: string;
}

export interface ZeroglareAnalysisConversational {
  pattern?: ZeroglareConversationalPattern | string;
  response?: string;
  strategy?: string;
  intent?: string;
  matched_features?: readonly string[];
  matched_disqualifiers?: readonly string[];
}

export interface ZeroglareDiagnosticSummary {
  state: ZeroglareDiagnosticStatus;
  clearCount: number;
  pressureCount: number;
  failCount: number;
  markerCount: number;
}

export interface ZeroglareAnalysisResult {
  status: ZeroglareDiagnosticStatus;
  summary: ZeroglareDiagnosticSummary;
  normalizedInputPreview?: string;
  normalizedInputLength?: number;
  normalizedInputTruncated: boolean;
  markers: readonly string[];
  refusal?: ZeroglareAnalysisRefusal | null;
  conversational?: ZeroglareAnalysisConversational | null;
}

export interface ZeroglareResultCard {
  headline: string;
  summary: string;
  explanation: string;
  suggestedResponse?: string;
  primaryActionLabel: string;
  primaryActionType: ZeroglarePrimaryActionType;
}

export interface ZeroglareGuidanceCard {
  label: string;
  summary: string;
  response: string;
  actionLabel: string;
  pattern: ZeroglareConversationalPattern | string;
}

const ZEROGLOARE_REFUSAL_RESPONSE_COPY = {
  self_sealing_validity_claim: 'What would count as evidence that this is false?',
  no_exit_contradictory_bind:
    'You are treating different responses as leading to the same conclusion. Why should they be equivalent?',
  unresolvable_recursive_closure: 'What is a valid way to step outside this frame?',
} as const;

const ZEROGLOARE_GUIDANCE_RESPONSE_COPY = {
  ambiguity_uncertain_interpretation: 'There’s no hidden implication. The claim is just this: [state claim clearly].',
  soft_pressure_expectation_frame: 'What is the actual claim, and what supports it?',
} as const;

const ZEROGLOARE_GUIDANCE_CARD_COPY = {
  ambiguity_uncertain_interpretation: {
    label: 'Clarification guidance',
    summary: 'Stabilize interpretation before evaluating the claim.',
  },
  soft_pressure_expectation_frame: {
    label: 'Evaluation guidance',
    summary: 'Reset the burden onto the claim and evidence.',
  },
} as const;

type ZeroglareRefusalReasonCode = keyof typeof ZEROGLOARE_REFUSAL_RESPONSE_COPY;
type ZeroglareGuidancePattern = keyof typeof ZEROGLOARE_GUIDANCE_RESPONSE_COPY;

export function resolveZeroglareSuggestedResponse(
  reasonCode?: string | null,
  conversationalResponse?: string | null,
): string | null {
  const response = conversationalResponse?.trim();

  if (response) {
    return response;
  }

  if (!reasonCode) {
    return null;
  }

  return ZEROGLOARE_REFUSAL_RESPONSE_COPY[reasonCode as ZeroglareRefusalReasonCode] ?? null;
}

export function resolveZeroglareGuidanceResponse(
  pattern?: string | null,
  conversationalResponse?: string | null,
): string | null {
  const response = conversationalResponse?.trim();

  if (response) {
    return response;
  }

  if (!pattern) {
    return null;
  }

  return ZEROGLOARE_GUIDANCE_RESPONSE_COPY[pattern as ZeroglareGuidancePattern] ?? null;
}

export function buildZeroglareResultCard(result: ZeroglareAnalysisResult): ZeroglareResultCard {
  switch (result.status) {
    case 'pressure':
      return {
        headline: 'Pressure detected',
        summary: 'Signal pressure is present, but no refusal contract matched.',
        explanation: 'Review the technical details below for markers and counts.',
        primaryActionLabel: 'Inspect signals',
        primaryActionType: 'inspect_signals',
      };
    case 'fail':
      return {
        headline: 'Fail boundary reached',
        summary: 'Signal pressure crossed the fail boundary, but no refusal contract matched.',
        explanation: 'Review the technical details below for the fail-state breakdown.',
        primaryActionLabel: 'Inspect signals',
        primaryActionType: 'inspect_signals',
      };
    case 'refused':
      return {
        headline: 'Refused',
        summary: 'ZeroGlare matched an explicit refusal contract.',
        explanation: result.refusal?.reason
          ?? 'Input converts challenge or doubt into self-confirming evidence without an independent validation path.',
        suggestedResponse: resolveZeroglareSuggestedResponse(
          result.refusal?.reason_code,
          result.conversational?.response,
        ) ?? undefined,
        primaryActionLabel: 'Copy response',
        primaryActionType: 'copy_response',
      };
    case 'clear':
    default:
      return {
        headline: 'Clear',
        summary: 'No refusal contract matched.',
        explanation: 'Review the technical details below for the full diagnostic breakdown.',
        primaryActionLabel: 'Review analysis',
        primaryActionType: 'review_analysis',
      };
  }
}

export function buildZeroglareGuidanceCard(
  result: ZeroglareAnalysisResult,
): ZeroglareGuidanceCard | null {
  if (result.status === 'refused') {
    return null;
  }

  const response = resolveZeroglareGuidanceResponse(
    result.conversational?.pattern,
    result.conversational?.response,
  );

  if (!response) {
    return null;
  }

  const pattern = result.conversational?.pattern ?? 'ambiguity_uncertain_interpretation';
  const cardCopy = ZEROGLOARE_GUIDANCE_CARD_COPY[pattern as ZeroglareGuidancePattern]
    ?? {
      label: 'Suggested response',
      summary: 'Use one stable reply to restore a valid evaluation path.',
    };

  return {
    pattern,
    label: cardCopy.label,
    summary: cardCopy.summary,
    response,
    actionLabel: 'Copy response',
  };
}
