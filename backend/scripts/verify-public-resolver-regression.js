'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { resolveConceptQuery } = require('../src/modules/concepts');

const fixturePath = path.resolve(
  __dirname,
  '../../tests/runtime/fixtures/phase-7-public-resolver-locks.json',
);

function loadLocks() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

// traceId and timestamp are request-specific transport metadata and are intentionally
// excluded from the public contract golden comparison.
function extractPublicContract(response) {
  const extracted = {
    normalizedQuery: response.normalizedQuery,
    type: response.type,
    queryType: response.queryType,
    finalState: response.finalState,
    reason: response.reason,
    failedLayer: response.failedLayer,
    deterministicKey: response.deterministicKey,
    registryVersion: response.registryVersion,
    policyVersion: response.policyVersion,
  };

  if (Object.prototype.hasOwnProperty.call(response, 'resolution')) {
    extracted.resolution = response.resolution;
  }

  if (Object.prototype.hasOwnProperty.call(response, 'interpretation')) {
    extracted.interpretation = response.interpretation;
  }

  if (typeof response.message === 'string') {
    extracted.message = response.message;
  }

  if (response.rejection) {
    extracted.rejection = response.rejection;
  }

  if (Array.isArray(response.suggestions)) {
    extracted.suggestions = response.suggestions;
  }

  if (Object.prototype.hasOwnProperty.call(response, 'vocabulary')) {
    extracted.vocabulary = response.vocabulary;
  }

  return extracted;
}

function main() {
  const locks = loadLocks();
  const failures = [];

  locks.forEach((entry) => {
    try {
      const first = extractPublicContract(resolveConceptQuery(entry.input));
      const second = extractPublicContract(resolveConceptQuery(entry.input));

      assert.deepEqual(second, first, `${entry.name} changed between repeated resolver calls.`);
      assert.deepEqual(first, entry.expected, `${entry.name} drifted from the locked public resolver contract.`);
      process.stdout.write(`PASS ${entry.name}\n`);
    } catch (error) {
      failures.push({
        name: entry.name,
        message: error.message,
      });
      process.stdout.write(`FAIL ${entry.name}\n`);
    }
  });

  if (failures.length > 0) {
    const summary = failures
      .map((failure) => `${failure.name}: ${failure.message}`)
      .join(' | ');
    throw new Error(`Public resolver regression lock failure: ${summary}`);
  }

  process.stdout.write('Public resolver regression lock verification passed.\n');
}

main();
