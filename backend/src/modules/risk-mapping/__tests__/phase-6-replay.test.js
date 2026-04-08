'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveRiskMapQuery } = require('../resolve/resolveRiskMapQuery');
const { buildRegistryHash } = require('../utils/buildRegistryHash');

function loadSnapshot(snapshotName) {
  const snapshotPath = path.join(__dirname, 'fixtures', `${snapshotName}.snapshot.json`);
  return JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
}

test('deterministic replay produces identical output', () => {
  const snapshot = loadSnapshot('apple_decline_risk');

  const first = resolveRiskMapQuery(snapshot.input);
  const second = resolveRiskMapQuery(snapshot.input);

  assert.deepEqual(first, snapshot.expectedOutput);
  assert.deepEqual(second, snapshot.expectedOutput);
  assert.deepEqual(first, second);
});

test('multi-run stability holds across repeated replay runs', () => {
  const snapshot = loadSnapshot('apple_decline_risk');

  for (let index = 0; index < 100; index += 1) {
    const result = resolveRiskMapQuery(snapshot.input);
    assert.deepEqual(result, snapshot.expectedOutput);
  }
});

test('registry hash is deterministic for the same authored artifacts', () => {
  const snapshot = loadSnapshot('apple_decline_risk');
  const first = buildRegistryHash({
    domainId: snapshot.input.domain,
    entity: snapshot.input.entity,
    evidenceSetVersion: snapshot.input.evidenceSetVersion,
  });
  const second = buildRegistryHash({
    domainId: snapshot.input.domain,
    entity: snapshot.input.entity,
    evidenceSetVersion: snapshot.input.evidenceSetVersion,
  });

  assert.deepEqual(first, second);
  assert.equal(first.hash.length, 64);
});
