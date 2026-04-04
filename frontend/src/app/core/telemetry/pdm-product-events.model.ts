import type { QueryType, ResolveProductResponse } from '../concepts/concept-resolver.types';
import type { VocabularyBoundaryBuckets } from '../vocabulary/vocabulary-boundary.types';

export type PdmProductEventValue = string | number | boolean | null;

export type PdmVocabularyFilterKey = 'all' | keyof VocabularyBoundaryBuckets;
export type PdmZeroglareDiagnosticStatus = 'clear' | 'pressure' | 'fail' | 'refused';
export type PdmZeroglarePrimaryActionType = 'review_analysis' | 'inspect_signals' | 'copy_response';
export type PdmZeroglareGuidancePattern =
  | 'ambiguity_uncertain_interpretation'
  | 'soft_pressure_expectation_frame';
export type PdmProductTelemetryErrorType = 'network' | 'server' | 'validation' | 'aborted';

export interface PdmProductTelemetryTarget {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
}

export interface PdmProductTelemetryPayloadMap {
  homepage_search_submitted: {
    queryLength: number;
    hasQuery: boolean;
    page: 'home';
  };
  homepage_search_completed: {
    responseType: ResolveProductResponse['type'];
    queryType: QueryType;
    hasDetail: boolean;
  };
  homepage_search_failed: {
    errorType: PdmProductTelemetryErrorType;
  };
  vocabulary_search_submitted: {
    queryLength: number;
    hasQuery: boolean;
    hasResults: boolean;
    resultCount: number;
    filter: PdmVocabularyFilterKey;
  };
  vocabulary_filter_changed: {
    filter: PdmVocabularyFilterKey;
  };
  vocabulary_page_changed: {
    page: number;
    pageSize: number;
    filter: PdmVocabularyFilterKey;
    hasQuery: boolean;
  };
  vocabulary_page_size_changed: {
    pageSize: number;
    filter: PdmVocabularyFilterKey;
    hasQuery: boolean;
  };
  zeroglare_input_submitted: {
    inputLength: number;
    hasText: boolean;
    page: 'zeroglare';
  };
  zeroglare_analysis_completed: {
    status: PdmZeroglareDiagnosticStatus;
    hasRefusal: boolean;
    refusalReasonCode: string | null;
    hasConversational: boolean;
    conversationalPattern: PdmZeroglareGuidancePattern | string | null;
  };
  zeroglare_analysis_failed: {
    errorType: PdmProductTelemetryErrorType;
  };
  zeroglare_primary_action_clicked: {
    status: PdmZeroglareDiagnosticStatus;
    action: PdmZeroglarePrimaryActionType;
  };
  zeroglare_response_copied: {
    status: 'refused' | 'pressure';
    reasonCode: string | null;
    pattern: PdmZeroglareGuidancePattern | string | null;
  };
  zeroglare_technical_details_viewed: {
    status: 'clear' | 'pressure' | 'fail';
    action: 'review_analysis' | 'inspect_signals';
  };
}

export type PdmProductTelemetryEventName = keyof PdmProductTelemetryPayloadMap;

export type PdmProductTelemetryPayload<Name extends PdmProductTelemetryEventName> =
  PdmProductTelemetryPayloadMap[Name];

export function sanitizePdmProductTelemetryPayload(
  payload: Record<string, PdmProductEventValue | undefined>,
): Record<string, PdmProductEventValue> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as Record<string, PdmProductEventValue>;
}

export function dispatchPdmProductTelemetryEvent(
  target: PdmProductTelemetryTarget | null | undefined,
  eventName: PdmProductTelemetryEventName,
  payload: Record<string, PdmProductEventValue | undefined> = {},
): void {
  if (!target) {
    return;
  }

  const sanitizedPayload = sanitizePdmProductTelemetryPayload(payload);

  if (typeof target.gtag === 'function') {
    target.gtag('event', eventName, sanitizedPayload);
    return;
  }

  if (Array.isArray(target.dataLayer)) {
    target.dataLayer.push({
      event: eventName,
      ...sanitizedPayload,
    });
  }
}
