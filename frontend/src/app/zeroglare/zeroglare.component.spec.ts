import '@angular/compiler';

import { describe, expect, it } from 'vitest';

import {
  ZEROGLARE_PUBLIC_MARKER_CODES,
} from './zeroglare-marker-contract';
import {
  ZEROGLARE_PAGE_COPY,
  normalizeZeroGlareMarkerCodes,
  getZeroGlareStatusCopy,
  getZeroGlareStatusLabel,
  resolveZeroGlareMarkerDescription,
  resolveZeroGlareMarkerTitle,
  resolveZeroGlareMarkers,
} from './zeroglare.component';

describe('ZeroglareComponent marker rendering helpers', () => {
  it('keeps every public backend marker renderable without filtering', () => {
    const markers = resolveZeroGlareMarkers({
      markers: [...ZEROGLARE_PUBLIC_MARKER_CODES],
    });

    expect(markers).toEqual(ZEROGLARE_PUBLIC_MARKER_CODES);
    expect(markers.every((marker) => resolveZeroGlareMarkerTitle(marker).length > 0)).toBe(true);
    expect(markers.every((marker) => resolveZeroGlareMarkerDescription(marker).length > 0)).toBe(true);
  });

  it('preserves marker codes from compact or diagnostic responses in order', () => {
    expect(
      resolveZeroGlareMarkers({
        markers: ['scope_pressure', 'context_drift_pressure', 'scope_pressure'],
      }),
    ).toEqual(['scope_pressure', 'context_drift_pressure']);

    expect(
      resolveZeroGlareMarkers({
        diagnostics: {
          summary: {
            active_signals: ['scope_pressure', 'future_marker'],
          },
        },
      }),
    ).toEqual(['scope_pressure', 'future_marker']);

    expect(
      normalizeZeroGlareMarkerCodes([
        'scope_pressure',
        '',
        'context_drift_pressure',
        'context_drift_pressure',
        null,
        undefined,
      ]),
    ).toEqual(['scope_pressure', 'context_drift_pressure']);
  });

  it('falls back safely when contract metadata is missing', () => {
    expect(resolveZeroGlareMarkerTitle('future_marker')).toBe('future_marker');
    expect(resolveZeroGlareMarkerDescription('future_marker')).toBe(
      'Diagnostic marker detected by Zeroglare.',
    );
  });

  it('keeps public copy bounded to diagnostic truth', () => {
    expect(ZEROGLARE_PAGE_COPY.subtitle).toBe('Diagnostic pressure only.');
    expect(ZEROGLARE_PAGE_COPY.definition).toContain('does not resolve, decide, or change ChatPDM runtime outcome.');
    expect(ZEROGLARE_PAGE_COPY.coreSectionTitle).toBe('From input to diagnostic signal.');
    expect(ZEROGLARE_PAGE_COPY.coreCaption).toBe('Input enters the system. Zeroglare reports diagnostic pressure markers.');
    expect(ZEROGLARE_PAGE_COPY.demoCopy).toContain('reports markers only');
    expect(ZEROGLARE_PAGE_COPY.inputPlaceholder).toContain('inspect diagnostic pressure');
    expect(ZEROGLARE_PAGE_COPY.invariantNote).toBe('These markers are diagnostic only. They do not change ChatPDM resolution state.');
    expect(ZEROGLARE_PAGE_COPY.loadingCopy).toBe('Analyzing diagnostic pressure...');
    expect(ZEROGLARE_PAGE_COPY.statusMicroLabel).toBe('Diagnostic status');
    expect(getZeroGlareStatusLabel('clear')).toBe('Clear');
    expect(getZeroGlareStatusCopy('pressure')).toBe(
      'Diagnostic pressure is present, but the fail boundary was not crossed.',
    );
    expect(ZEROGLARE_PAGE_COPY.emptyState).toBe('Enter a phrase or query to inspect diagnostic pressure.');
    expect(ZEROGLARE_PAGE_COPY.noMarkersState).toBe('No diagnostic pressure markers were detected for this input.');
    expect(ZEROGLARE_PAGE_COPY.analogyTitle).toBe('A diagnostic filter for meaning.');
    expect(ZEROGLARE_PAGE_COPY.analogyCopy).toBe('Zeroglare reports diagnostic pressure signals. It does not clean, infer, or decide.');
    expect(ZEROGLARE_PAGE_COPY.markerFallbackDescription).toBe('Diagnostic marker detected by Zeroglare.');
  });
});
