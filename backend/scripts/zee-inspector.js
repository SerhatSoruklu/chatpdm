'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { inspectZeeReplayCase, inspectZeeReplaySuite } = require('../src/modules/zeroglare-evidence-engine/inspector');

function readJsonInput(inputPath) {
  const rawJson = inputPath === '-'
    ? fs.readFileSync(0, 'utf8')
    : fs.readFileSync(path.resolve(inputPath), 'utf8');

  return JSON.parse(rawJson);
}

function printUsage() {
  process.stderr.write('Usage: node scripts/zee-inspector.js <case-or-suite.json | ->\n');
}

function inspectInput(input) {
  if (input && typeof input === 'object' && Array.isArray(input.cases)) {
    return inspectZeeReplaySuite(input);
  }

  if (input && typeof input === 'object' && Array.isArray(input.frames)) {
    return inspectZeeReplayCase(input);
  }

  throw new Error('ZEE inspector input must be a replay case object with frames or a replay suite object with cases.');
}

function main(argv) {
  const inputPath = argv[2];

  if (!inputPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const input = readJsonInput(inputPath);
  const output = inspectInput(input);

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main(process.argv);
