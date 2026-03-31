'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { EMPTY_NORMALIZED_QUERY } = require('./constants');
const { normalizeQuery } = require('./normalizer');
const { assertCanonicalStoreFreeOfAiMarkers } = require('../../lib/ai-governance-guard');

const rejectionDirectoryPath = path.resolve(__dirname, '../../../../data/concepts/rejections');

let cachedSignature = null;
let cachedRegistry = null;

function assertNonEmptyString(value, fieldName, fileName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fileName} has invalid ${fieldName}.`);
  }
}

function validateRejectionRecord(record, fileName) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(`${fileName} must be a JSON object.`);
  }

  assertCanonicalStoreFreeOfAiMarkers(record, fileName);
  assertNonEmptyString(record.conceptId, 'conceptId', fileName);
  assertNonEmptyString(record.status, 'status', fileName);
  assertNonEmptyString(record.decisionType, 'decisionType', fileName);

  if (record.status !== 'REJECTED') {
    throw new Error(`${fileName} must declare status "REJECTED".`);
  }

  const normalizedConceptId = normalizeQuery(record.conceptId);
  if (normalizedConceptId === EMPTY_NORMALIZED_QUERY) {
    throw new Error(`${fileName} cannot target ${EMPTY_NORMALIZED_QUERY}.`);
  }

  if (normalizedConceptId !== record.conceptId) {
    throw new Error(`${fileName} conceptId must already be stored in normalized form.`);
  }

  if (typeof record.finality !== 'boolean') {
    throw new Error(`${fileName} must declare boolean finality.`);
  }
}

function computeDirectorySignature(fileNames) {
  return fileNames
    .map((fileName) => {
      const stat = fs.statSync(path.join(rejectionDirectoryPath, fileName));
      return `${fileName}:${stat.size}:${stat.mtimeMs}`;
    })
    .join('|');
}

function loadRejectionRegistry() {
  if (!fs.existsSync(rejectionDirectoryPath)) {
    return {
      available: false,
      recordsByConceptId: new Map(),
    };
  }

  const fileNames = fs.readdirSync(rejectionDirectoryPath)
    .filter((fileName) => fileName.endsWith('.rejection.json'))
    .sort();
  const signature = computeDirectorySignature(fileNames);

  if (cachedRegistry && cachedSignature === signature) {
    return cachedRegistry;
  }

  const recordsByConceptId = new Map();

  fileNames.forEach((fileName) => {
    const filePath = path.join(rejectionDirectoryPath, fileName);
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    validateRejectionRecord(parsed, fileName);
    recordsByConceptId.set(parsed.conceptId, parsed);
  });

  cachedSignature = signature;
  cachedRegistry = {
    available: true,
    recordsByConceptId,
  };

  return cachedRegistry;
}

function getRejectedConceptRecord(conceptId) {
  if (typeof conceptId !== 'string' || conceptId.trim() === '') {
    return null;
  }

  return loadRejectionRegistry().recordsByConceptId.get(normalizeQuery(conceptId)) ?? null;
}

module.exports = {
  getRejectedConceptRecord,
  loadRejectionRegistry,
  rejectionDirectoryPath,
};
