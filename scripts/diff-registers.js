'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const conceptsDirectory = path.resolve(__dirname, '../data/concepts');
const REGISTER_NAMES = Object.freeze(['standard', 'simplified', 'formal']);
const ZONE_NAMES = Object.freeze(['shortDefinition', 'coreMeaning', 'fullDefinition']);
const WITHIN_CURRENT_PAIRS = Object.freeze([
  ['standard', 'simplified'],
  ['standard', 'formal'],
]);

function parseArguments(argv) {
  const conceptIds = [];
  let ref = 'HEAD^';

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--ref') {
      ref = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument === '--all') {
      conceptIds.push(...loadPublishedConceptIds());
      continue;
    }

    conceptIds.push(argument);
  }

  return {
    conceptIds: [...new Set(conceptIds.filter(Boolean))],
    ref,
  };
}

function loadPublishedConceptIds() {
  return fs.readdirSync(conceptsDirectory)
    .filter((fileName) => fileName.endsWith('.json'))
    .filter((fileName) => ![
      'concept-admission-state.json',
      'overlap-boundary-change-approvals.json',
      'overlap-classification-snapshot.json',
      'resolve-rules.json',
    ].includes(fileName))
    .map((fileName) => path.basename(fileName, '.json'))
    .sort();
}

function loadCurrentConcept(conceptId) {
  const filePath = path.join(conceptsDirectory, `${conceptId}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Unknown concept "${conceptId}".`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadConceptAtRef(conceptId, ref) {
  const gitPath = `data/concepts/${conceptId}.json`;
  const result = spawnSync('git', ['show', `${ref}:${gitPath}`], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    return null;
  }

  return JSON.parse(result.stdout);
}

function formatTextBlock(text, indent = '      ') {
  return text
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n');
}

function printPreviousVsCurrent(conceptId, previousConcept, currentConcept, ref) {
  process.stdout.write(`[${conceptId}] previous vs current @ ${ref}\n`);

  if (!previousConcept) {
    process.stdout.write('  previous snapshot: missing at ref\n');
    return;
  }

  REGISTER_NAMES.forEach((registerName) => {
    process.stdout.write(`  ${registerName}\n`);

    ZONE_NAMES.forEach((zoneName) => {
      const previousText = previousConcept.registers?.[registerName]?.[zoneName] ?? '';
      const currentText = currentConcept.registers?.[registerName]?.[zoneName] ?? '';

      if (previousText === currentText) {
        return;
      }

      process.stdout.write(`    ${zoneName}: CHANGED\n`);
      process.stdout.write('      previous:\n');
      process.stdout.write(`${formatTextBlock(previousText)}\n`);
      process.stdout.write('      current:\n');
      process.stdout.write(`${formatTextBlock(currentText)}\n`);
    });
  });
}

function printWithinCurrent(conceptId, currentConcept) {
  process.stdout.write(`[${conceptId}] within current registers\n`);

  WITHIN_CURRENT_PAIRS.forEach(([left, right]) => {
    process.stdout.write(`  ${left} vs ${right}\n`);

    ZONE_NAMES.forEach((zoneName) => {
      process.stdout.write(`    ${zoneName}\n`);
      process.stdout.write(`      ${left}:\n`);
      process.stdout.write(`${formatTextBlock(currentConcept.registers[left][zoneName])}\n`);
      process.stdout.write(`      ${right}:\n`);
      process.stdout.write(`${formatTextBlock(currentConcept.registers[right][zoneName])}\n`);
    });
  });
}

function main() {
  const { conceptIds, ref } = parseArguments(process.argv.slice(2));

  if (conceptIds.length === 0) {
    process.stderr.write('Usage: node scripts/diff-registers.js <conceptId> [moreConceptIds...] [--ref <gitRef>] [--all]\n');
    process.exitCode = 1;
    return;
  }

  conceptIds.forEach((conceptId, index) => {
    const currentConcept = loadCurrentConcept(conceptId);
    const previousConcept = loadConceptAtRef(conceptId, ref);

    printPreviousVsCurrent(conceptId, previousConcept, currentConcept, ref);
    process.stdout.write('\n');
    printWithinCurrent(conceptId, currentConcept);

    if (index < conceptIds.length - 1) {
      process.stdout.write('\n---\n\n');
    } else {
      process.stdout.write('\n');
    }
  });
}

main();
