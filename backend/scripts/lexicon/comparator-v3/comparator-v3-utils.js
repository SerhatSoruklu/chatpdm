'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { repoRoot } = require('./comparator-v3-config');

const datasetPath = path.join(repoRoot, 'data/legal-vocabulary/legal-vocabulary-dataset.txt');
const meaningSourcesPath = path.join(
  repoRoot,
  'backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json',
);
const {
  buildVocabularyBoundaryResponse,
} = require(path.join(repoRoot, 'backend/src/modules/legal-vocabulary/vocabulary-boundary'));

function normalizeForComparison(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[.,;:()\\[\\]{}'"]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, value, 'utf8');
}

function jsonLine(record) {
  return JSON.stringify(record, Object.keys(record).sort());
}

function readNdjson(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function writeNdjson(filePath, records) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(
    filePath,
    records.map((record) => JSON.stringify(record, null, 0)).join('\n') + (records.length ? '\n' : ''),
    'utf8',
  );
}

function parseBoundaryRegistry() {
  return buildVocabularyBoundaryResponse().entries.map((entry, index) => ({
    term: entry.term,
    normalizedTerm: normalizeForComparison(entry.term),
    family: entry.family,
    classification: entry.classification,
    lineNumber: index + 1,
    isAliasSurface: entry.term.includes('_'),
    sourceStatus: entry.sourceStatus,
  }));
}

function boundaryRegistryIndex() {
  const records = parseBoundaryRegistry();
  const byNormalized = new Map();
  records.forEach((record) => {
    if (!byNormalized.has(record.normalizedTerm)) {
      byNormalized.set(record.normalizedTerm, []);
    }
    byNormalized.get(record.normalizedTerm).push(record);
  });
  return {
    records,
    byNormalized,
  };
}

function loadMeaningSourceStatus() {
  const payload = readJson(meaningSourcesPath);
  const byTerm = new Map();
  Object.entries(payload.terms ?? {}).forEach(([term, sources]) => {
    byTerm.set(normalizeForComparison(term), {
      term,
      hasAnySource: Array.isArray(sources) && sources.length > 0,
      hasBlackPrimary: Array.isArray(sources)
        && sources.some((source) => /^black/i.test(String(source.sourceId ?? ''))),
    });
  });
  return {
    sourceTermCount: byTerm.size,
    byTerm,
  };
}

function markdownCell(value) {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replace(/\s+/g, ' ')
    .trim();
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
}

module.exports = {
  datasetPath,
  meaningSourcesPath,
  normalizeForComparison,
  ensureDir,
  readJson,
  writeJson,
  writeText,
  readNdjson,
  writeNdjson,
  parseBoundaryRegistry,
  boundaryRegistryIndex,
  loadMeaningSourceStatus,
  markdownTable,
};
