import { describe, expect, it } from 'vitest';

import {
  ZEROGLARE_MARKER_CODES,
  ZEROGLARE_MARKER_CONTRACT,
  ZEROGLARE_PUBLIC_MARKERS,
  getZeroGlareMarkerDetails,
} from './zeroglare-marker-contract';

describe('ZeroGlare marker contract', () => {
  it('stays canonical, ordered, and public', () => {
    expect(ZEROGLARE_MARKER_CONTRACT.resource).toBe('zeroglare');
    expect(ZEROGLARE_MARKER_CONTRACT.taxonomyVersion).toBe('v1');
    expect(ZEROGLARE_MARKER_CONTRACT.markers).toHaveLength(16);
    expect(ZEROGLARE_MARKER_CONTRACT.markers.map((marker) => marker.code)).toEqual(ZEROGLARE_MARKER_CODES);
    expect(ZEROGLARE_PUBLIC_MARKERS.map((marker) => marker.code)).toEqual(ZEROGLARE_MARKER_CODES);
    expect(ZEROGLARE_MARKER_CONTRACT.markers.map((marker) => marker.displayOrder)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
      9, 10, 11, 12, 13, 14, 15, 16,
    ]);
    expect(ZEROGLARE_MARKER_CONTRACT.markers.every((marker) => marker.public)).toBe(true);
    expect(ZEROGLARE_MARKER_CONTRACT.markers.every((marker) => marker.label.length > 0)).toBe(true);
    expect(ZEROGLARE_MARKER_CONTRACT.markers.every((marker) => marker.description.length > 0)).toBe(true);
  });

  it('exposes stable lookup details for known marker codes', () => {
    expect(getZeroGlareMarkerDetails('scope_pressure')).toMatchObject({
      code: 'scope_pressure',
      label: 'Scope pressure',
      severity: 'moderate',
      displayOrder: 4,
      public: true,
    });
    expect(getZeroGlareMarkerDetails('missing-marker')).toBeNull();
  });
});
