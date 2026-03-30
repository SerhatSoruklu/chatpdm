'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { REASON_CODES } = require('../register-validation/reason-codes');

const auditLogDirectory = path.resolve(__dirname, '../../../data/concept-audit-log');
const VALIDATOR_STAGE_STATUS = Object.freeze({
  PASS: 'pass',
  FAIL: 'fail',
  SKIP: 'skip',
  NOT_RUN: 'not-run',
});

const V1_FAILURE_CODES = new Set([
  REASON_CODES.MISSING_REGISTER,
  REASON_CODES.MISSING_ZONE,
  REASON_CODES.EMPTY_TEXT,
  REASON_CODES.MISSING_CANONICAL_ANCHOR,
  REASON_CODES.EMPTY_CANONICAL_INVARIANT,
  REASON_CODES.INVALID_CANONICAL_EXCLUDES,
  REASON_CODES.INVALID_CANONICAL_ADJACENT,
  REASON_CODES.EXACT_EQUAL,
  REASON_CODES.NORMALIZED_EQUAL,
  REASON_CODES.PREFIX_ONLY_MUTATION,
  REASON_CODES.TOO_CLOSE_TOKEN_OVERLAP,
  REASON_CODES.STANDARD_TOO_SIMPLE,
  REASON_CODES.STANDARD_TOO_FORMAL,
  REASON_CODES.STANDARD_COLLAPSES_WITH_OTHER_REGISTERS,
  REASON_CODES.STANDARD_REQUIRED_FOR_EXPOSURE,
  REASON_CODES.SIMPLIFIED_TOO_LONG,
  REASON_CODES.SIMPLIFIED_BANNED_TERM,
  REASON_CODES.SIMPLIFIED_TOO_CLOSE_TO_STANDARD,
  REASON_CODES.FORMAL_TOO_SHORT,
  REASON_CODES.FORMAL_TOO_CASUAL,
  REASON_CODES.FORMAL_MISSING_SCOPE_LANGUAGE,
  REASON_CODES.FORMAL_MISSING_BOUNDARY_LANGUAGE,
  REASON_CODES.FORMAL_TOO_CLOSE_TO_STANDARD,
]);

const V2_FAILURE_CODES = new Set([
  REASON_CODES.TOO_CLOSE_SENTENCE_SHAPE,
  REASON_CODES.STANDARD_PROFILE_NOT_INTERMEDIATE,
  REASON_CODES.SIMPLIFIED_PROFILE_NOT_SIMPLER,
  REASON_CODES.FORMAL_PROFILE_NOT_MORE_FORMAL,
]);

const V3_FAILURE_CODES = new Set([
  REASON_CODES.MISSING_REQUIRED_ANCHOR,
  REASON_CODES.MISSING_REQUIRED_BOUNDARY,
  REASON_CODES.FORBIDDEN_SEMANTIC_DRIFT,
  REASON_CODES.ANCHOR_PARITY_FAILURE,
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertNonEmptyString(value, context) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${context} must be a non-empty string.`);
  }
}

function assertStringArray(values, context) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`${context} must be a non-empty string array.`);
  }

  values.forEach((value, index) => {
    assertNonEmptyString(value, `${context}[${index}]`);
  });
}

function ensureIsoTimestamp(value, context) {
  assertNonEmptyString(value, context);

  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${context} must be a valid ISO 8601 timestamp.`);
  }
}

function collectValidatorErrorCodes(validationReport) {
  if (!isPlainObject(validationReport)) {
    return [];
  }

  const codes = new Set();

  Object.values(validationReport.registers || {}).forEach((registerReport) => {
    (registerReport?.errors || []).forEach((code) => codes.add(code));
  });

  (validationReport.comparisons || []).forEach((comparisonReport) => {
    (comparisonReport?.errors || []).forEach((code) => codes.add(code));
  });

  return [...codes];
}

function deriveStageStatus(validationReport, failureCodes, fallback = VALIDATOR_STAGE_STATUS.PASS) {
  const errorCodes = collectValidatorErrorCodes(validationReport);

  if (errorCodes.some((code) => failureCodes.has(code))) {
    return VALIDATOR_STAGE_STATUS.FAIL;
  }

  return fallback;
}

function buildValidatorSnapshot(validationReport) {
  if (!isPlainObject(validationReport)) {
    return {
      v1: VALIDATOR_STAGE_STATUS.NOT_RUN,
      v2: VALIDATOR_STAGE_STATUS.NOT_RUN,
      v3: VALIDATOR_STAGE_STATUS.NOT_RUN,
    };
  }

  const semanticFound = Boolean(validationReport.semantic?.profileFound);

  return {
    v1: deriveStageStatus(validationReport, V1_FAILURE_CODES),
    v2: deriveStageStatus(validationReport, V2_FAILURE_CODES),
    v3: semanticFound
      ? deriveStageStatus(validationReport, V3_FAILURE_CODES)
      : VALIDATOR_STAGE_STATUS.SKIP,
  };
}

function validateAuditRecord(record) {
  if (!isPlainObject(record)) {
    throw new Error('audit record must be an object.');
  }

  assertNonEmptyString(record.concept, 'audit record concept');

  if (!Number.isInteger(record.version) || record.version < 1) {
    throw new Error('audit record version must be a positive integer.');
  }

  assertNonEmptyString(record.changeType, 'audit record changeType');
  assertNonEmptyString(record.summary, 'audit record summary');

  if (!isPlainObject(record.validatorSnapshot)) {
    throw new Error('audit record validatorSnapshot must be an object.');
  }

  ['v1', 'v2', 'v3'].forEach((stageName) => {
    const status = record.validatorSnapshot[stageName];

    if (!Object.values(VALIDATOR_STAGE_STATUS).includes(status)) {
      throw new Error(`audit record validatorSnapshot.${stageName} must be one of: ${Object.values(VALIDATOR_STAGE_STATUS).join(', ')}.`);
    }
  });

  assertNonEmptyString(record.approvedBy, 'audit record approvedBy');
  ensureIsoTimestamp(record.approvedAt, 'audit record approvedAt');
  assertStringArray(record.stateTransitions, 'audit record stateTransitions');

  return record;
}

function sanitizeTimestampForFileName(timestamp) {
  return timestamp.replace(/:/g, '-');
}

function buildStateTransitionSlug(stateTransitions) {
  return stateTransitions
    .join('__')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_\-().>]/g, '-')
    .replace(/->/g, '-to-');
}

function auditRecordPath(record) {
  const safeTimestamp = sanitizeTimestampForFileName(record.approvedAt);
  const transitionSlug = buildStateTransitionSlug(record.stateTransitions);
  const fileName = `${safeTimestamp}-v${record.version}-${record.changeType}-${transitionSlug}.json`;

  return path.join(auditLogDirectory, record.concept, fileName);
}

function buildDefaultSummary(changeType, stateTransitions) {
  return `${changeType} recorded through ${stateTransitions.join(', ')}.`;
}

function buildAuditRecord(options) {
  const record = {
    concept: options.concept,
    version: options.version,
    changeType: options.changeType || 'structural-change',
    summary: options.summary || buildDefaultSummary(options.changeType || 'structural-change', options.stateTransitions),
    validatorSnapshot: options.validatorSnapshot || buildValidatorSnapshot(options.validationReport),
    approvedBy: options.approvedBy || 'unassigned',
    approvedAt: options.approvedAt || new Date().toISOString(),
    stateTransitions: options.stateTransitions,
  };

  return validateAuditRecord(record);
}

function appendAuditRecord(record) {
  const validatedRecord = validateAuditRecord(record);
  const filePath = auditRecordPath(validatedRecord);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(validatedRecord, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });

  return filePath;
}

function readAuditRecord(filePath) {
  const record = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return validateAuditRecord(record);
}

function sortAuditRecords(records) {
  return [...records].sort((left, right) => {
    const leftTime = Date.parse(left.approvedAt);
    const rightTime = Date.parse(right.approvedAt);

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    if (left.version !== right.version) {
      return left.version - right.version;
    }

    return `${left.changeType}:${left.summary}`.localeCompare(`${right.changeType}:${right.summary}`);
  });
}

function listAuditRecordFiles(concept) {
  if (!fs.existsSync(auditLogDirectory)) {
    return [];
  }

  if (typeof concept === 'string' && concept.trim() !== '') {
    const conceptDirectory = path.join(auditLogDirectory, concept);

    if (!fs.existsSync(conceptDirectory)) {
      return [];
    }

    return fs.readdirSync(conceptDirectory)
      .filter((fileName) => fileName.endsWith('.json'))
      .sort()
      .map((fileName) => path.join(conceptDirectory, fileName));
  }

  return fs.readdirSync(auditLogDirectory)
    .map((entryName) => path.join(auditLogDirectory, entryName))
    .filter((entryPath) => fs.statSync(entryPath).isDirectory())
    .sort()
    .flatMap((conceptDirectory) => fs.readdirSync(conceptDirectory)
      .filter((fileName) => fileName.endsWith('.json'))
      .sort()
      .map((fileName) => path.join(conceptDirectory, fileName)));
}

function getAuditTrail(concept) {
  return sortAuditRecords(
    listAuditRecordFiles(concept).map(readAuditRecord),
  );
}

function getConceptHistory(concept) {
  return getAuditTrail(concept).map((record) => ({
    concept: record.concept,
    version: record.version,
    changeType: record.changeType,
    summary: record.summary,
    approvedBy: record.approvedBy,
    approvedAt: record.approvedAt,
    stateTransitions: [...record.stateTransitions],
    validatorSnapshot: { ...record.validatorSnapshot },
  }));
}

function getLatestPublished(concept) {
  const trail = getAuditTrail(concept);

  const publishedRecords = trail.filter((record) => record.stateTransitions.includes('approved->published'));

  return publishedRecords.length > 0 ? publishedRecords[publishedRecords.length - 1] : null;
}

module.exports = {
  VALIDATOR_STAGE_STATUS,
  appendAuditRecord,
  auditLogDirectory,
  auditRecordPath,
  buildAuditRecord,
  buildValidatorSnapshot,
  getAuditTrail,
  getConceptHistory,
  getLatestPublished,
  validateAuditRecord,
};
