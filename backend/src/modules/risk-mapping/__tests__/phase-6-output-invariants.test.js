'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveRiskMapQuery } = require('../resolve/resolveRiskMapQuery');
const { assertSortedUniqueStringArray } = require('../utils/assertSortedUniqueStringArray');

function loadSnapshot(snapshotName) {
  const snapshotPath = path.join(__dirname, 'fixtures', `${snapshotName}.snapshot.json`);
  return JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
}

test('final output arrays are sorted, unique, and string-only', () => {
  const snapshot = loadSnapshot('apple_decline_risk');
  const output = resolveRiskMapQuery(snapshot.input);

  for (const fieldName of [
    'supportedNodes',
    'supportedThreatVectors',
    'supportedCausalPaths',
    'unsupportedBridges',
    'assumptions',
    'unknowns',
    'falsifiers',
  ]) {
    assertSortedUniqueStringArray(output[fieldName], `output.${fieldName}`);
  }
});

test('final diagnostics remain bounded and do not leak internal structures', () => {
  const snapshot = loadSnapshot('apple_decline_risk');
  const output = resolveRiskMapQuery(snapshot.input);

  assert.deepEqual(Object.keys(output.diagnostics), [
    'hasBroadCollapseLanguage',
    'hasUnsupportedFraming',
    'admittedScopes',
    'narrowedFromScopes',
    'refusedScopes',
    'supportedNodeIds',
    'unsupportedNodeIds',
    'supportedThreatIds',
    'unsupportedThreatIds',
  ]);
  assert.equal(Object.prototype.hasOwnProperty.call(output.diagnostics, 'registryIndex'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(output.diagnostics, 'evidencePack'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(output.diagnostics, 'output'), false);
});
