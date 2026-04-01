'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { normalizeQuery } = require('./normalizer');
const { OVERLAP_ADMISSION_VALUES } = require('./concept-overlap-admission-gate');
const { assertCanonicalStoreFreeOfAiMarkers } = require('../../lib/ai-governance-guard');

const reviewStateDirectoryPath = path.resolve(__dirname, '../../../../data/concepts/review-states');
const ALLOWED_ADMISSION_VALUES = Object.freeze([
  'blocked',
  'visible_only_derived',
  'phase1_passed',
  'phase2_stable',
  ...OVERLAP_ADMISSION_VALUES,
]);
const ALLOWED_VALIDATION_SOURCES = Object.freeze(['system', 'manual_review']);
const ISO_8601_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;

let cachedSignature = null;
let cachedRegistry = null;

function isValidIso8601Timestamp(value) {
  return typeof value === 'string'
    && ISO_8601_TIMESTAMP_PATTERN.test(value)
    && !Number.isNaN(Date.parse(value));
}

function assertNonEmptyString(value, fieldName, fileName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fileName} has invalid ${fieldName}.`);
  }
}

function validateConceptReviewStateRecord(record, fileName = 'review-state-record') {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(`${fileName} must be a JSON object.`);
  }

  assertCanonicalStoreFreeOfAiMarkers(record, fileName);
  assertNonEmptyString(record.conceptId, 'conceptId', fileName);
  assertNonEmptyString(record.admission, 'admission', fileName);
  assertNonEmptyString(record.lastValidatedAt, 'lastValidatedAt', fileName);
  assertNonEmptyString(record.validationSource, 'validationSource', fileName);

  const normalizedConceptId = normalizeQuery(record.conceptId);

  if (normalizedConceptId !== record.conceptId) {
    throw new Error(`${fileName} conceptId must already be stored in normalized form.`);
  }

  if (!ALLOWED_ADMISSION_VALUES.includes(record.admission)) {
    throw new Error(`${fileName} has unsupported admission "${record.admission}".`);
  }

  if (!ALLOWED_VALIDATION_SOURCES.includes(record.validationSource)) {
    throw new Error(`${fileName} has unsupported validationSource "${record.validationSource}".`);
  }

  if (!isValidIso8601Timestamp(record.lastValidatedAt)) {
    throw new Error(`${fileName} has invalid lastValidatedAt.`);
  }

  return Object.freeze({
    conceptId: record.conceptId,
    admission: record.admission,
    lastValidatedAt: record.lastValidatedAt,
    validationSource: record.validationSource,
  });
}

function computeDirectorySignature(directoryPath, fileNames) {
  return fileNames
    .map((fileName) => {
      const stat = fs.statSync(path.join(directoryPath, fileName));
      return `${fileName}:${stat.size}:${stat.mtimeMs}`;
    })
    .join('|');
}

function loadConceptReviewStateRegistry(directoryPath = reviewStateDirectoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return {
      available: false,
      recordsByConceptId: new Map(),
    };
  }

  const fileNames = fs.readdirSync(directoryPath)
    .filter((fileName) => fileName.endsWith('.review-state.json'))
    .sort();
  const signature = computeDirectorySignature(directoryPath, fileNames);
  const canUseCache = directoryPath === reviewStateDirectoryPath;

  if (canUseCache && cachedRegistry && cachedSignature === signature) {
    return cachedRegistry;
  }

  const recordsByConceptId = new Map();

  fileNames.forEach((fileName) => {
    const filePath = path.join(directoryPath, fileName);
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const record = validateConceptReviewStateRecord(parsed, fileName);
    recordsByConceptId.set(record.conceptId, record);
  });

  const registry = {
    available: true,
    recordsByConceptId,
  };

  if (canUseCache) {
    cachedSignature = signature;
    cachedRegistry = registry;
  }

  return registry;
}

function getConceptReviewState(conceptId, directoryPath = reviewStateDirectoryPath) {
  if (typeof conceptId !== 'string' || conceptId.trim() === '') {
    return null;
  }

  return loadConceptReviewStateRegistry(directoryPath).recordsByConceptId.get(normalizeQuery(conceptId)) ?? null;
}

function clearConceptReviewStateCache() {
  cachedSignature = null;
  cachedRegistry = null;
}

module.exports = {
  ALLOWED_ADMISSION_VALUES,
  ALLOWED_VALIDATION_SOURCES,
  clearConceptReviewStateCache,
  getConceptReviewState,
  isValidIso8601Timestamp,
  loadConceptReviewStateRegistry,
  reviewStateDirectoryPath,
  validateConceptReviewStateRecord,
};
