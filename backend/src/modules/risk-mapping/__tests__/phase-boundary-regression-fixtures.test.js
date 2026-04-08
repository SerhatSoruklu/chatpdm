'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveRiskMapQuery } = require('../resolve/resolveRiskMapQuery');

const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/rmg_boundary_regression_v1.json');

function loadFixtureSuite() {
  return JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
}

function assertArrayContainsAll(haystack, needles, label) {
  assert.ok(Array.isArray(haystack), `${label} must be an array.`);
  for (const needle of needles) {
    assert.ok(
      haystack.includes(needle),
      `${label} must include ${JSON.stringify(needle)}.`,
    );
  }
}

function assertExactlyEmptyArray(value, label) {
  assert.deepEqual(value, [], `${label} must be an empty array.`);
}

function assertStringArray(value, label) {
  assert.ok(Array.isArray(value), `${label} must be an array.`);
  for (const [index, entry] of value.entries()) {
    assert.equal(typeof entry, 'string', `${label}[${index}] must be a string.`);
  }
}

test('boundary regression fixture suite matches the current bounded RMG pipeline', () => {
  const suite = loadFixtureSuite();

  assert.equal(suite.suiteName, 'rmg_boundary_regression_v1');
  assert.ok(Array.isArray(suite.cases));
  assert.equal(suite.cases.length, 5);

  for (const testCase of suite.cases) {
    const output = resolveRiskMapQuery(testCase.query);
    const expected = testCase.expected;
    const requiredInclusions = testCase.requiredInclusions || {};
    const mustBeEmpty = testCase.mustBeEmpty || [];

    assert.equal(output.status, expected.status, `${testCase.name}: status mismatch.`);
    assert.equal(output.reasonCode, expected.reasonCode, `${testCase.name}: reasonCode mismatch.`);
    assert.equal(output.entity, expected.entity, `${testCase.name}: entity mismatch.`);
    assert.equal(
      output.boundedConfidenceClass,
      expected.boundedConfidenceClass,
      `${testCase.name}: boundedConfidenceClass mismatch.`,
    );

    assert.deepEqual(
      {
        hasBroadCollapseLanguage: output.diagnostics.hasBroadCollapseLanguage,
        hasUnsupportedFraming: output.diagnostics.hasUnsupportedFraming,
      },
      expected.diagnostics && {
        hasBroadCollapseLanguage: expected.diagnostics.hasBroadCollapseLanguage,
        hasUnsupportedFraming: expected.diagnostics.hasUnsupportedFraming,
      },
      `${testCase.name}: diagnostics flags mismatch.`,
    );

    assert.deepEqual(
      output.diagnostics.admittedScopes,
      expected.diagnostics ? expected.diagnostics.admittedScopes : [],
      `${testCase.name}: admittedScopes mismatch.`,
    );

    for (const fieldName of [
      'supportedNodes',
      'supportedThreatVectors',
      'supportedCausalPaths',
      'unsupportedBridges',
      'assumptions',
      'unknowns',
      'falsifiers',
    ]) {
      if (requiredInclusions[fieldName]) {
        assertArrayContainsAll(
          output[fieldName],
          requiredInclusions[fieldName],
          `${testCase.name}.${fieldName}`,
        );
        assertStringArray(output[fieldName], `${testCase.name}.${fieldName}`);
      }
    }

    for (const fieldName of mustBeEmpty) {
      assertExactlyEmptyArray(output[fieldName], `${testCase.name}.${fieldName}`);
    }
  }
});
