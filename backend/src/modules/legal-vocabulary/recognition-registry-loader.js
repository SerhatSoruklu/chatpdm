'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  LIVE_CONCEPT_IDS,
  VISIBLE_ONLY_PUBLIC_CONCEPT_IDS,
} = require('../concepts/admission-state');
const {
  EMPTY_NORMALIZED_QUERY,
} = require('../concepts/constants');
const {
  normalizeQuery,
} = require('../concepts/normalizer');

const datasetPath = path.resolve(
  __dirname,
  '../../../../data/legal-vocabulary/legal-vocabulary-dataset.txt',
);

const HEADER_TO_CLASSIFICATION = Object.freeze({
  'CORE / GOVERNANCE': 'unknown_structure',
  'AUTHORITY / VALIDITY / INSTITUTIONAL STATUS': 'derived',
  'POWER / FORCE / CONTROL': 'derived',
  'DUTY / OBLIGATION / CONSTRAINT': 'derived',
  'FAILURE / BREACH / NONCOMPLIANCE': 'derived',
  'RESPONSIBILITY / ATTRIBUTION / LIABILITY': 'derived',
  'LAW / RULE / SOURCES': 'derived',
  'PROCEDURE / ADJUDICATION': 'procedural',
  'REMEDIES / RESPONSES / OUTCOMES': 'procedural',
  'CONTRACT / AGREEMENT / CONSENSUS': 'derived',
  'PROPERTY / TITLE / POSSESSION': 'carrier',
  'COMMERCE / FINANCE / ALLOCATION': 'carrier',
  'CRIMINAL / PUBLIC ORDER': 'derived',
  'DEFENCES / JUSTIFICATIONS / EXCUSES': 'derived',
  'EVIDENCE / PROOF / EPISTEMIC': 'procedural',
  'STATUS / PERSON / RELATION': 'carrier',
  'LABOR / ORGANIZATIONAL / ASSOCIATIONAL': 'carrier',
  'CONSTITUTIONAL / POLITICAL': 'derived',
  'META / STRESS / EDGE TERMS': 'unknown_structure',
});

const EXPLICIT_CLASSIFICATION_OVERRIDES = Object.freeze({
  claim: 'rejected_candidate',
  defeasibility: 'rejected_candidate',
  enforcement: 'rejected_candidate',
  jurisdiction: 'rejected_candidate',
  liability: 'rejected_candidate',
  obligation: 'rejected_candidate',
});

const EXCLUDED_CONCEPT_IDS = new Set([
  ...LIVE_CONCEPT_IDS,
  ...VISIBLE_ONLY_PUBLIC_CONCEPT_IDS,
]);

let cachedSignature = null;
let cachedRegistry = null;

function buildDatasetSignature() {
  const stat = fs.statSync(datasetPath);
  return `${stat.size}:${stat.mtimeMs}`;
}

function parseHeader(line) {
  const match = /^\[(.+)\]$/.exec(line);
  return match ? match[1] : null;
}

function assertClassification(value, lineNumber) {
  if (!value) {
    throw new Error(`Unknown legal vocabulary dataset header at line ${lineNumber}.`);
  }
}

function registerTerm(recordsByTerm, countsByClassification, term, classification) {
  if (EXCLUDED_CONCEPT_IDS.has(term) || recordsByTerm.has(term)) {
    return;
  }

  recordsByTerm.set(term, {
    term,
    classification,
  });
  countsByClassification.set(
    classification,
    (countsByClassification.get(classification) ?? 0) + 1,
  );
}

function buildRecognizedSurfaceForms(rawTerm) {
  const surfaceForms = new Set();
  const normalizedTerm = normalizeQuery(rawTerm);

  if (normalizedTerm !== EMPTY_NORMALIZED_QUERY) {
    surfaceForms.add(normalizedTerm);
  }

  if (rawTerm.includes('_')) {
    const spacedVariant = normalizeQuery(rawTerm.replaceAll('_', ' '));
    if (spacedVariant !== EMPTY_NORMALIZED_QUERY) {
      surfaceForms.add(spacedVariant);
    }
  }

  return surfaceForms;
}

function buildRegistry() {
  const lines = fs.readFileSync(datasetPath, 'utf8').split(/\r?\n/);
  const recordsByTerm = new Map();
  const countsByClassification = new Map([
    ['derived', 0],
    ['procedural', 0],
    ['carrier', 0],
    ['rejected_candidate', 0],
    ['unknown_structure', 0],
  ]);

  let activeClassification = null;

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = rawLine.trim();

    if (line === '') {
      return;
    }

    const header = parseHeader(line);
    if (header) {
      activeClassification = HEADER_TO_CLASSIFICATION[header] ?? null;
      assertClassification(activeClassification, lineNumber);
      return;
    }

    if (!activeClassification) {
      throw new Error(`Legal vocabulary dataset term appears before any header at line ${lineNumber}.`);
    }

    const surfaceForms = buildRecognizedSurfaceForms(line);
    if (surfaceForms.size === 0) {
      throw new Error(`Legal vocabulary dataset contains an empty normalized term at line ${lineNumber}.`);
    }

    const canonicalSurface = normalizeQuery(line);
    const classification = EXPLICIT_CLASSIFICATION_OVERRIDES[canonicalSurface] ?? activeClassification;

    surfaceForms.forEach((term) => {
      registerTerm(recordsByTerm, countsByClassification, term, classification);
    });
  });

  return {
    available: true,
    datasetPath,
    recordsByTerm,
    countsByClassification: Object.freeze(Object.fromEntries(countsByClassification)),
    totalTerms: recordsByTerm.size,
  };
}

function loadLegalVocabularyRegistry() {
  if (!fs.existsSync(datasetPath)) {
    return {
      available: false,
      datasetPath,
      recordsByTerm: new Map(),
      countsByClassification: Object.freeze({}),
      totalTerms: 0,
    };
  }

  const signature = buildDatasetSignature();
  if (cachedRegistry && cachedSignature === signature) {
    return cachedRegistry;
  }

  cachedRegistry = buildRegistry();
  cachedSignature = signature;
  return cachedRegistry;
}

module.exports = {
  datasetPath,
  HEADER_TO_CLASSIFICATION,
  EXPLICIT_CLASSIFICATION_OVERRIDES,
  loadLegalVocabularyRegistry,
};
