'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ZEROGLARE_MARKER_BY_CODE,
  ZEROGLARE_MARKER_CODES,
  ZEROGLARE_MARKER_CONTRACT,
  ZEROGLARE_PUBLIC_MARKER_CODES,
  getZeroGlareMarkerContractEntry,
} = require('../../src/modules/concepts/zeroglare-marker-contract');

test('ZeroGlare marker contract stays canonical and stable', () => {
  assert.equal(ZEROGLARE_MARKER_CONTRACT.resource, 'zeroglare');
  assert.equal(ZEROGLARE_MARKER_CONTRACT.taxonomyVersion, 'v1');
  assert.equal(ZEROGLARE_MARKER_CONTRACT.markers.length, 16);
  assert.equal(new Set(ZEROGLARE_MARKER_CODES).size, ZEROGLARE_MARKER_CODES.length);
  assert.deepEqual(ZEROGLARE_MARKER_CONTRACT.markers.map((marker) => marker.code), ZEROGLARE_MARKER_CODES);
  assert.deepEqual(ZEROGLARE_PUBLIC_MARKER_CODES, ZEROGLARE_MARKER_CODES);
  assert.deepEqual(
    ZEROGLARE_MARKER_CONTRACT.markers.map((marker) => marker.displayOrder),
    Array.from({ length: 16 }, (_value, index) => index + 1),
  );
  assert.ok(ZEROGLARE_MARKER_CONTRACT.markers.every((marker) => marker.public === true));
  assert.ok(ZEROGLARE_MARKER_CONTRACT.markers.every((marker) => typeof marker.label === 'string' && marker.label.length > 0));
  assert.ok(ZEROGLARE_MARKER_CONTRACT.markers.every((marker) => typeof marker.description === 'string' && marker.description.length > 0));
  assert.equal(getZeroGlareMarkerContractEntry('scope_pressure')?.label, 'Scope pressure');
  assert.equal(getZeroGlareMarkerContractEntry('scope_pressure')?.severity, 'moderate');
  assert.equal(ZEROGLARE_MARKER_BY_CODE.get('scope_pressure')?.displayOrder, 4);
  assert.equal(getZeroGlareMarkerContractEntry('missing-marker'), null);
});
