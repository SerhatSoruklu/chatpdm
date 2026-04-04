'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildZeroglareAnalysis,
} = require('../../src/modules/concepts/zeroglare-diagnostics');

const CASES = [
  {
    name: 'clean input stays clear',
    input: 'A contract requires mutual agreement between two parties.',
    expected: {
      status: 'clear',
      markers: [],
      markerCount: 0,
    },
  },
  {
    name: 'ambiguity surface wording currently stays clear',
    input: 'Authority can be valid depending on how you interpret legitimacy.',
    expected: {
      status: 'clear',
      markers: [],
      markerCount: 0,
    },
  },
  {
    name: 'scope pressure hits rhetorical noise and scope pressure',
    input: 'Who decides what is legitimate for all cases everywhere?',
    expected: {
      status: 'pressure',
      markers: ['rhetorical_noise', 'scope_pressure'],
      markerCount: 2,
    },
  },
  {
    name: 'unsupported semantic bridge is detected on its own',
    input: 'Authority is the same as moral truth in all systems.',
    expected: {
      status: 'pressure',
      markers: ['unsupported_semantic_bridge'],
      markerCount: 1,
    },
  },
  {
    name: 'rhetorical noise is detected',
    input: "Isn't it obvious that authority is basically whatever people feel it is anyway?",
    expected: {
      status: 'pressure',
      markers: ['rhetorical_noise'],
      markerCount: 1,
    },
  },
  {
    name: 'multi-pressure input fails with four markers',
    input: 'If authority is just a social construct, then who decides what is legitimate for all cases, or maybe it counts as everything in practice?',
    expected: {
      status: 'fail',
      markers: [
        'rhetorical_noise',
        'ambiguity_surface',
        'unsupported_semantic_bridge',
        'scope_pressure',
      ],
      markerCount: 4,
    },
  },
  {
    name: 'short nonsense stays clear',
    input: 'dfgdfg',
    expected: {
      status: 'clear',
      markers: [],
      markerCount: 0,
    },
  },
  {
    name: 'repetition spam stays clear today',
    input: 'authority authority authority authority authority authority authority',
    expected: {
      status: 'clear',
      markers: [],
      markerCount: 0,
    },
  },
  {
    name: 'contradiction pressure wording stays clear today',
    input: 'Authority is always valid, but it is also never valid.',
    expected: {
      status: 'clear',
      markers: [],
      markerCount: 0,
    },
  },
  {
    name: 'false universal claim stays clear today',
    input: 'All systems must accept one single authority definition.',
    expected: {
      status: 'clear',
      markers: [],
      markerCount: 0,
    },
  },
  {
    name: 'question forcing resolution triggers rhetorical noise',
    input: 'So which authority is actually correct then?',
    expected: {
      status: 'pressure',
      markers: ['rhetorical_noise'],
      markerCount: 1,
    },
  },
  {
    name: 'attempted answer bait triggers rhetorical noise',
    input: 'Tell me which authority is valid and why.',
    expected: {
      status: 'pressure',
      markers: ['rhetorical_noise'],
      markerCount: 1,
    },
  },
  {
    name: 'mixed real and noise input triggers rhetorical noise',
    input: 'Authority exists in structured governance, but honestly it is kind of just vibes in real life.',
    expected: {
      status: 'pressure',
      markers: ['rhetorical_noise'],
      markerCount: 1,
    },
  },
];

for (const testCase of CASES) {
  test(`Zeroglare analysis: ${testCase.name}`, () => {
    const result = buildZeroglareAnalysis(testCase.input);

    assert.equal(result.status, testCase.expected.status);
    assert.equal(result.summary.state, testCase.expected.status);
    assert.equal(result.summary.marker_count, testCase.expected.markerCount);
    assert.deepEqual(result.markers, testCase.expected.markers);
    assert.equal(result.summary.clear_count, testCase.expected.status === 'clear' ? 1 : 0);
    assert.equal(
      result.summary.pressure_count,
      testCase.expected.status === 'pressure' ? testCase.expected.markerCount : 0,
    );
    assert.equal(
      result.summary.fail_count,
      testCase.expected.status === 'fail' ? testCase.expected.markerCount : 0,
    );
  });
}

test('Zeroglare analysis truncates long normalized input previews', () => {
  const longInput = 'agreement '.repeat(2500);
  const result = buildZeroglareAnalysis(longInput);

  assert.equal(result.status, 'clear');
  assert.equal(result.summary.state, 'clear');
  assert.equal(result.summary.marker_count, 0);
  assert.equal(result.markers.length, 0);
  assert.equal(result.normalized_input_truncated, true);
  assert.equal(result.normalized_input_preview.length, 2000);
  assert.equal(result.normalized_input_length > 2000, true);
});

test('Zeroglare analysis returns a clean empty payload for empty input', () => {
  const result = buildZeroglareAnalysis('');

  assert.equal(result.status, 'clear');
  assert.equal(result.summary.state, 'clear');
  assert.equal(result.summary.marker_count, 0);
  assert.equal(result.summary.clear_count, 1);
  assert.equal(result.summary.pressure_count, 0);
  assert.equal(result.summary.fail_count, 0);
  assert.deepEqual(result.markers, []);
  assert.equal(result.normalized_input_preview, null);
  assert.equal(result.normalized_input_length, 0);
  assert.equal(result.normalized_input_truncated, false);
});
