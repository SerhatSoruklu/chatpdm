'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  runFullPipeline,
} = require('../src/modules/concepts/pipeline-runner');

const snapshotPath = path.resolve(
  __dirname,
  '../../tests/runtime/fixtures/phase-7-regression-lock-snapshots.json',
);

function loadSnapshots() {
  return JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
}

function main() {
  const snapshots = loadSnapshots();
  const failures = [];

  snapshots.forEach((snapshot) => {
    try {
      const actual = runFullPipeline(snapshot.input);
      assert.deepEqual(
        actual,
        snapshot.expected,
        `${snapshot.name} drifted from locked snapshot.`,
      );
      process.stdout.write(`PASS ${snapshot.name}\n`);
    } catch (error) {
      failures.push({
        name: snapshot.name,
        message: error.message,
      });
      process.stdout.write(`FAIL ${snapshot.name}\n`);
    }
  });

  if (failures.length > 0) {
    const summary = failures
      .map((failure) => `${failure.name}: ${failure.message}`)
      .join(' | ');
    throw new Error(`Regression lock failure: ${summary}`);
  }

  process.stdout.write('Regression lock verification passed.\n');
}

main();
