import markerContract from '../../../../data/zeroglare/zeroglare-marker-contract.json';

export interface ZeroglareMarkerContractEntry {
  code: string;
  label: string;
  description: string;
  severity: 'low' | 'moderate' | 'high';
  displayOrder: number;
  public: boolean;
}

export interface ZeroglareMarkerContract {
  resource: string;
  taxonomyVersion: string;
  markers: readonly ZeroglareMarkerContractEntry[];
}

const ZEROGLARE_MARKER_CONTRACT_DATA = markerContract as ZeroglareMarkerContract;

export const ZEROGLARE_MARKER_CONTRACT: ZeroglareMarkerContract = Object.freeze({
  resource: ZEROGLARE_MARKER_CONTRACT_DATA.resource,
  taxonomyVersion: ZEROGLARE_MARKER_CONTRACT_DATA.taxonomyVersion,
  markers: Object.freeze(
    [...ZEROGLARE_MARKER_CONTRACT_DATA.markers]
      .map((marker) => Object.freeze({ ...marker }))
      .sort((left, right) => left.displayOrder - right.displayOrder),
  ),
});

export const ZEROGLARE_MARKER_CODES = Object.freeze(
  ZEROGLARE_MARKER_CONTRACT.markers.map((marker) => marker.code),
);

export const ZEROGLARE_PUBLIC_MARKERS = Object.freeze(
  ZEROGLARE_MARKER_CONTRACT.markers.filter((marker) => marker.public),
);

export const ZEROGLARE_PUBLIC_MARKER_CODES = Object.freeze(
  ZEROGLARE_PUBLIC_MARKERS.map((marker) => marker.code),
);

const ZEROGLARE_MARKER_BY_CODE = new Map(
  ZEROGLARE_MARKER_CONTRACT.markers.map((marker) => [marker.code, marker]),
);

export function getZeroGlareMarkerDetails(code: string): ZeroglareMarkerContractEntry | null {
  return ZEROGLARE_MARKER_BY_CODE.get(code) ?? null;
}

export function isZeroGlarePublicMarkerCode(code: string): boolean {
  return ZEROGLARE_MARKER_BY_CODE.get(code)?.public === true;
}
