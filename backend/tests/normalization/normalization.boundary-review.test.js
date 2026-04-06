'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');

const scriptPath = path.resolve(__dirname, '../../scripts/review-normalization-boundary.js');

function runScript(args = []) {
  return childProcess.execFileSync(process.execPath, [scriptPath, ...args], {
    encoding: 'utf8',
  });
}

test('normalization boundary review script emits the locked report sections', () => {
  const output = runScript();
  const sections = [
    'Attempts',
    'Changed vs unchanged',
    'Transform frequency',
    'Refusals by code',
    'Depth distribution',
    'Expansion outliers',
    'Repeated boundary signatures',
    'Evidence source',
  ];

  let lastIndex = -1;

  for (const section of sections) {
    const index = output.indexOf(section);

    assert.notEqual(index, -1, `Missing section heading: ${section}`);
    assert.ok(index > lastIndex, `Section heading out of order: ${section}`);
    lastIndex = index;
  }

  assert.equal(output.includes('Evidence source\n  surrogate'), true);
});

test('normalization boundary review script groups repeated structural signatures from artifacts', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatpdm-normalization-boundary-'));

  try {
    const artifactPath = path.join(tempDir, 'artifact.json');
    const duplicateObservation = {
      rawText: 'c3VydmV5LXByb2Jl',
      status: 'refused',
      refusalCode: 'NORMALIZATION_INVALID_ENCODING',
      appliedTransformKinds: ['percent_decode'],
      depthUsed: 1,
      inputBytes: 16,
      outputBytes: null,
      expansionRatio: null,
      changed: true,
    };

    fs.writeFileSync(
      artifactPath,
      JSON.stringify({
        observations: [
          duplicateObservation,
          duplicateObservation,
          {
            rawText: 'c3VydmV5LW9r',
            status: 'unchanged',
            appliedTransformKinds: [],
            depthUsed: 0,
            inputBytes: 12,
            outputBytes: 12,
            expansionRatio: 1,
            changed: false,
          },
        ],
      }, null, 2),
    );

    const output = runScript(['--source', 'live', '--artifact', artifactPath]);
    const repeatedSection = output.split('Repeated boundary signatures\n')[1].split('\n\nEvidence source\n')[0];

    assert.equal(output.includes('Evidence source\n  live'), true);
    assert.equal(repeatedSection.includes('  2x raw='), true);
    assert.equal(repeatedSection.includes('code=NORMALIZATION_INVALID_ENCODING'), true);
    assert.equal(repeatedSection.includes('path=percent_decode'), true);
    assert.equal(repeatedSection.includes('shape=repeated_signature'), true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('normalization stability review packet emits the locked c3 sections and hold recommendation', () => {
  const output = runScript(['--packet', 'c3']);
  const sections = [
    'Evidence source',
    'Attempts',
    'Changed vs unchanged',
    'Transform frequency',
    'Refusals by code',
    'Latency summary',
    'Depth distribution',
    'Expansion outliers',
    'Repeated boundary signatures',
    'Recommendation',
  ];

  let lastIndex = -1;

  for (const section of sections) {
    const index = output.indexOf(section);

    assert.notEqual(index, -1, `Missing section heading: ${section}`);
    assert.ok(index > lastIndex, `Section heading out of order: ${section}`);
    lastIndex = index;
  }

  assert.equal(output.includes('Evidence source\n  surrogate'), true);
  assert.equal(output.includes('Recommendation\n  hold\n  rationale: '), true);
});
