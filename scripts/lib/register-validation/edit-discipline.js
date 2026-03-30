'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { REASON_CODES } = require('./reason-codes');
const { REGISTER_NAMES, ZONE_NAMES } = require('./validate-structure');

const DEFAULT_MODE = 'warn';
const conceptDirectory = path.resolve(__dirname, '../../../data/concepts');
const NON_CONCEPT_PACKET_FILES = new Set(['resolve-rules.json']);

function runGit(args) {
  try {
    return execFileSync('git', args, {
      cwd: path.resolve(__dirname, '../../..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function resolveComparisonRef(explicitRef) {
  if (typeof explicitRef === 'string' && explicitRef.trim() !== '') {
    return explicitRef.trim();
  }

  if (typeof process.env.REGISTER_EDIT_DISCIPLINE_REF === 'string' && process.env.REGISTER_EDIT_DISCIPLINE_REF.trim() !== '') {
    return process.env.REGISTER_EDIT_DISCIPLINE_REF.trim();
  }

  const githubBaseRef = typeof process.env.GITHUB_BASE_REF === 'string'
    ? process.env.GITHUB_BASE_REF.trim()
    : '';

  if (githubBaseRef) {
    const remoteBaseRef = `origin/${githubBaseRef}`;
    const remoteExists = runGit(['rev-parse', '--verify', remoteBaseRef]);

    if (remoteExists) {
      const mergeBase = runGit(['merge-base', 'HEAD', remoteBaseRef]);

      if (mergeBase) {
        return mergeBase;
      }
    }
  }

  return 'HEAD';
}

function resolveMode(explicitMode) {
  if (explicitMode === 'fail' || explicitMode === 'warn') {
    return explicitMode;
  }

  if (process.env.REGISTER_EDIT_DISCIPLINE_MODE === 'fail') {
    return 'fail';
  }

  return DEFAULT_MODE;
}

function relativeConceptPaths(baseRef) {
  const diffOutput = runGit(['diff', '--name-only', baseRef, '--', 'data/concepts']);

  if (!diffOutput) {
    return [];
  }

  return diffOutput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((relativePath) => relativePath.endsWith('.json'))
    .filter((relativePath) => !relativePath.includes('/templates/'))
    .filter((relativePath) => !NON_CONCEPT_PACKET_FILES.has(path.basename(relativePath)))
    .sort();
}

function loadJsonAtRef(baseRef, relativePath) {
  const content = runGit(['show', `${baseRef}:${relativePath}`]);

  if (!content) {
    return null;
  }

  return JSON.parse(content);
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function collectRegisterZoneChanges(previousConcept, currentConcept) {
  const registerChanges = {};

  REGISTER_NAMES.forEach((registerName) => {
    const changedZones = ZONE_NAMES.filter((zoneName) => (
      stableStringify(previousConcept?.registers?.[registerName]?.[zoneName])
      !== stableStringify(currentConcept?.registers?.[registerName]?.[zoneName])
    ));

    if (changedZones.length > 0) {
      registerChanges[registerName] = changedZones;
    }
  });

  return registerChanges;
}

function evaluateEditDiscipline(options = {}) {
  const mode = resolveMode(options.mode);
  const baseRef = resolveComparisonRef(options.ref);
  const relativePaths = relativeConceptPaths(baseRef);
  const conceptReports = [];
  const warnings = [];

  relativePaths.forEach((relativePath) => {
    const absolutePath = path.resolve(__dirname, '../../../', relativePath);

    if (!fs.existsSync(absolutePath)) {
      return;
    }

    const currentConcept = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    const previousConcept = loadJsonAtRef(baseRef, relativePath);

    if (!previousConcept) {
      conceptReports.push({
        conceptId: currentConcept?.conceptId ?? path.basename(relativePath, '.json'),
        filePath: relativePath,
        kind: 'new-concept',
        changedRegisters: {},
        changedRegisterCount: 0,
        warnings: [],
      });
      return;
    }

    const changedRegisters = collectRegisterZoneChanges(previousConcept, currentConcept);
    const changedRegisterNames = Object.keys(changedRegisters);
    const conceptWarnings = [];

    if (changedRegisterNames.length === 1) {
      conceptWarnings.push(REASON_CODES.SINGLE_REGISTER_EDIT_ONLY);
      warnings.push({
        code: REASON_CODES.SINGLE_REGISTER_EDIT_ONLY,
        conceptId: currentConcept?.conceptId ?? path.basename(relativePath, '.json'),
        detail: `${changedRegisterNames[0]}:${changedRegisters[changedRegisterNames[0]].join(',')}`,
      });
    }

    conceptReports.push({
      conceptId: currentConcept?.conceptId ?? path.basename(relativePath, '.json'),
      filePath: relativePath,
      kind: 'modified-concept',
      changedRegisters,
      changedRegisterCount: changedRegisterNames.length,
      warnings: conceptWarnings,
    });
  });

  return {
    checked: true,
    mode,
    baseRef,
    passed: !(mode === 'fail' && warnings.length > 0),
    warningCount: warnings.length,
    warnings,
    concepts: conceptReports,
  };
}

module.exports = {
  evaluateEditDiscipline,
  resolveComparisonRef,
};
