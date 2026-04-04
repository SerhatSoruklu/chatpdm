import { describe, expect, it, vi } from 'vitest';

import { dispatchPdmProductTelemetryEvent, sanitizePdmProductTelemetryPayload } from './pdm-product-events.model';

describe('PdmProductTelemetry helpers', () => {
  it('sanitizes undefined payload values without touching explicit nulls', () => {
    expect(
      sanitizePdmProductTelemetryPayload({
        keep: 'value',
        omit: undefined,
        explicitNull: null,
      }),
    ).toEqual({
      keep: 'value',
      explicitNull: null,
    });
  });

  it('prefers gtag when it exists', () => {
    const gtag = vi.fn();
    dispatchPdmProductTelemetryEvent(
      { gtag, dataLayer: [] },
      'vocabulary_filter_changed',
      { filter: 'derived' },
    );

    expect(gtag).toHaveBeenCalledWith('event', 'vocabulary_filter_changed', { filter: 'derived' });
  });

  it('falls back to dataLayer when gtag is unavailable', () => {
    const dataLayer: unknown[] = [];

    dispatchPdmProductTelemetryEvent(
      { dataLayer },
      'zeroglare_input_submitted',
      { inputLength: 13, hasText: true, page: 'zeroglare' },
    );

    expect(dataLayer).toEqual([
      {
        event: 'zeroglare_input_submitted',
        inputLength: 13,
        hasText: true,
        page: 'zeroglare',
      },
    ]);
  });

  it('keeps homepage search telemetry compact and non-raw', () => {
    const dataLayer: unknown[] = [];

    dispatchPdmProductTelemetryEvent(
      { dataLayer },
      'homepage_search_submitted',
      {
        queryLength: 9,
        hasQuery: true,
        page: 'home',
      },
    );

    expect(dataLayer).toEqual([
      {
        event: 'homepage_search_submitted',
        queryLength: 9,
        hasQuery: true,
        page: 'home',
      },
    ]);
  });

  it('keeps homepage search completion telemetry compact', () => {
    const gtag = vi.fn();

    dispatchPdmProductTelemetryEvent(
      { gtag },
      'homepage_search_completed',
      {
        responseType: 'match',
        queryType: 'standard',
        hasDetail: true,
      },
    );

    expect(gtag).toHaveBeenCalledWith('event', 'homepage_search_completed', {
      responseType: 'match',
      queryType: 'standard',
      hasDetail: true,
    });
  });

  it('keeps homepage search failure telemetry compact', () => {
    const dataLayer: unknown[] = [];

    dispatchPdmProductTelemetryEvent(
      { dataLayer },
      'homepage_search_failed',
      {
        errorType: 'server',
      },
    );

    expect(dataLayer).toEqual([
      {
        event: 'homepage_search_failed',
        errorType: 'server',
      },
    ]);
  });

  it('keeps vocabulary search telemetry compact and filter-aware', () => {
    const dataLayer: unknown[] = [];

    dispatchPdmProductTelemetryEvent(
      { dataLayer },
      'vocabulary_search_submitted',
      {
        queryLength: 9,
        hasQuery: true,
        hasResults: true,
        resultCount: 14,
        filter: 'all',
      },
    );

    expect(dataLayer).toEqual([
      {
        event: 'vocabulary_search_submitted',
        queryLength: 9,
        hasQuery: true,
        hasResults: true,
        resultCount: 14,
        filter: 'all',
      },
    ]);
  });

  it('keeps vocabulary navigation telemetry compact and deterministic', () => {
    const gtag = vi.fn();

    dispatchPdmProductTelemetryEvent(
      { gtag },
      'vocabulary_page_changed',
      {
        page: 3,
        pageSize: 24,
        filter: 'all',
        hasQuery: true,
      },
    );

    expect(gtag).toHaveBeenCalledWith('event', 'vocabulary_page_changed', {
      page: 3,
      pageSize: 24,
      filter: 'all',
      hasQuery: true,
    });
  });

  it('keeps vocabulary page-size telemetry compact and deterministic', () => {
    const gtag = vi.fn();

    dispatchPdmProductTelemetryEvent(
      { gtag },
      'vocabulary_page_size_changed',
      {
        pageSize: 48,
        filter: 'derived',
        hasQuery: false,
      },
    );

    expect(gtag).toHaveBeenCalledWith('event', 'vocabulary_page_size_changed', {
      pageSize: 48,
      filter: 'derived',
      hasQuery: false,
    });
  });

  it('keeps Zeroglare completion telemetry compact and structured', () => {
    const gtag = vi.fn();

    dispatchPdmProductTelemetryEvent(
      { gtag },
      'zeroglare_analysis_completed',
      {
        status: 'refused',
        hasRefusal: true,
        refusalReasonCode: 'self_sealing_validity_claim',
        hasConversational: true,
        conversationalPattern: 'ambiguity_uncertain_interpretation',
      },
    );

    expect(gtag).toHaveBeenCalledWith('event', 'zeroglare_analysis_completed', {
      status: 'refused',
      hasRefusal: true,
      refusalReasonCode: 'self_sealing_validity_claim',
      hasConversational: true,
      conversationalPattern: 'ambiguity_uncertain_interpretation',
    });
  });

  it('keeps Zeroglare submission telemetry compact and non-raw', () => {
    const dataLayer: unknown[] = [];

    dispatchPdmProductTelemetryEvent(
      { dataLayer },
      'zeroglare_input_submitted',
      {
        inputLength: 183,
        hasText: true,
        page: 'zeroglare',
      },
    );

    expect(dataLayer).toEqual([
      {
        event: 'zeroglare_input_submitted',
        inputLength: 183,
        hasText: true,
        page: 'zeroglare',
      },
    ]);
  });

  it('keeps Zeroglare primary actions explicit and compact', () => {
    const gtag = vi.fn();

    dispatchPdmProductTelemetryEvent(
      { gtag },
      'zeroglare_primary_action_clicked',
      {
        status: 'refused',
        action: 'copy_response',
      },
    );

    expect(gtag).toHaveBeenCalledWith('event', 'zeroglare_primary_action_clicked', {
      status: 'refused',
      action: 'copy_response',
    });
  });

  it('keeps Zeroglare copied-response telemetry pattern-aware', () => {
    const dataLayer: unknown[] = [];

    dispatchPdmProductTelemetryEvent(
      { dataLayer },
      'zeroglare_response_copied',
      {
        status: 'pressure',
        reasonCode: null,
        pattern: 'soft_pressure_expectation_frame',
      },
    );

    expect(dataLayer).toEqual([
      {
        event: 'zeroglare_response_copied',
        status: 'pressure',
        reasonCode: null,
        pattern: 'soft_pressure_expectation_frame',
      },
    ]);
  });

  it('keeps Zeroglare failure telemetry compact', () => {
    const gtag = vi.fn();

    dispatchPdmProductTelemetryEvent(
      { gtag },
      'zeroglare_analysis_failed',
      {
        errorType: 'network',
      },
    );

    expect(gtag).toHaveBeenCalledWith('event', 'zeroglare_analysis_failed', {
      errorType: 'network',
    });
  });

  it('keeps Zeroglare technical-details telemetry compact', () => {
    const dataLayer: unknown[] = [];

    dispatchPdmProductTelemetryEvent(
      { dataLayer },
      'zeroglare_technical_details_viewed',
      {
        status: 'pressure',
        action: 'inspect_signals',
      },
    );

    expect(dataLayer).toEqual([
      {
        event: 'zeroglare_technical_details_viewed',
        status: 'pressure',
        action: 'inspect_signals',
      },
    ]);
  });
});
