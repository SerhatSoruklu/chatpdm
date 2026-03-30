'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { diffConcepts, formatDiffReport } = require('./lib/governance/diff-concepts');

const repoRoot = path.resolve(__dirname, '..');
const conceptsDirectory = path.join(repoRoot, 'data/concepts');
const semanticProfilesDirectory = path.join(repoRoot, 'data/concept-semantic-profiles');

function parseArguments(argv) {
  const conceptIds = [];
  let ref = 'HEAD^';
  let asJson = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--ref') {
      ref = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument === '--json') {
      asJson = true;
      continue;
    }

    conceptIds.push(argument);
  }

  return {
    conceptIds,
    ref,
    asJson,
  };
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadCurrentConcept(conceptId) {
  const filePath = path.join(conceptsDirectory, `${conceptId}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Unknown concept "${conceptId}".`);
  }

  return readJsonFile(filePath);
}

function loadCurrentSemanticProfile(conceptId) {
  const filePath = path.join(semanticProfilesDirectory, `${conceptId}.json`);
  return fs.existsSync(filePath) ? readJsonFile(filePath) : null;
}

function loadJsonAtRef(gitPath, ref) {
  const result = spawnSync('git', ['show', `${ref}:${gitPath}`], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    return null;
  }

  return JSON.parse(result.stdout);
}

function main() {
  const { conceptIds, ref, asJson } = parseArguments(process.argv.slice(2));

  if (conceptIds.length === 0) {
    process.stderr.write('Usage: node scripts/diff-concepts.js <conceptId> [moreConceptIds...] [--ref <gitRef>] [--json]\n');
    process.exitCode = 1;
    return;
  }

  const reports = conceptIds.map((conceptId) => {
    const currentConcept = loadCurrentConcept(conceptId);
    const previousConcept = loadJsonAtRef(`data/concepts/${conceptId}.json`, ref);
    const currentSemanticProfile = loadCurrentSemanticProfile(conceptId);
    const previousSemanticProfile = loadJsonAtRef(
      `data/concept-semantic-profiles/${conceptId}.json`,
      ref,
    );

    return diffConcepts(previousConcept, currentConcept, {
      previousSemanticProfile,
      nextSemanticProfile: currentSemanticProfile,
    });
  });

  if (asJson) {
    process.stdout.write(`${JSON.stringify(reports, null, 2)}\n`);
    return;
  }

  reports.forEach((report, index) => {
    process.stdout.write(`${formatDiffReport(report)}\n`);

    if (index < reports.length - 1) {
      process.stdout.write('\n---\n\n');
    }
  });
}

main();
