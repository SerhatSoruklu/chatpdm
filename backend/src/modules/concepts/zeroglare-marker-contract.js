'use strict';

const markerContract = require('../../../../data/zeroglare/zeroglare-marker-contract.json');

function freezeMarker(marker) {
  return Object.freeze({
    code: marker.code,
    label: marker.label,
    description: marker.description,
    severity: marker.severity,
    displayOrder: marker.displayOrder,
    public: marker.public,
  });
}

const ZEROGLARE_MARKER_CONTRACT = Object.freeze({
  resource: markerContract.resource,
  taxonomyVersion: markerContract.taxonomyVersion,
  markers: Object.freeze(markerContract.markers.map(freezeMarker)),
});

const ZEROGLARE_MARKER_BY_CODE = new Map(
  ZEROGLARE_MARKER_CONTRACT.markers.map((marker) => [marker.code, marker]),
);

const ZEROGLARE_MARKER_CODES = Object.freeze(
  ZEROGLARE_MARKER_CONTRACT.markers.map((marker) => marker.code),
);

const ZEROGLARE_PUBLIC_MARKER_CODES = Object.freeze(
  ZEROGLARE_MARKER_CONTRACT.markers
    .filter((marker) => marker.public)
    .map((marker) => marker.code),
);

function getZeroGlareMarkerContractEntry(code) {
  return ZEROGLARE_MARKER_BY_CODE.get(code) ?? null;
}

module.exports = Object.freeze({
  ZEROGLARE_MARKER_BY_CODE,
  ZEROGLARE_MARKER_CODES,
  ZEROGLARE_MARKER_CONTRACT,
  ZEROGLARE_PUBLIC_MARKER_CODES,
  getZeroGlareMarkerContractEntry,
});
