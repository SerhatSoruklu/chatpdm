'use strict';

const { INVALID_EVIDENCE_PACK } = require('../constants/rmgReasonCodes');

const ALLOWED_TARGET_TYPES = Object.freeze(['node', 'threat']);
const ALLOWED_SUPPORT_LEVELS = Object.freeze(['direct', 'contextual']);
const ALLOWED_EVIDENCE_CLASSES = Object.freeze([
  'public_filing',
  'regulatory_action',
  'market_report',
  'company_statement',
  'supply_chain_report',
]);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function buildValidationResult(errors) {
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze([...errors]),
    reasonCode: errors.length === 0 ? null : INVALID_EVIDENCE_PACK,
  });
}

/**
 * @param {unknown} value
 * @returns {{ valid: boolean, errors: string[], reasonCode: string | null }}
 */
function validateEvidencePack(value) {
  const errors = [];

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push('Evidence pack must be a plain object.');
    return buildValidationResult(errors);
  }

  const pack = /** @type {Record<string, unknown>} */ (value);

  ['domainId', 'version', 'entity', 'evidenceSetVersion'].forEach((fieldName) => {
    if (!isNonEmptyString(pack[fieldName])) {
      errors.push(`${fieldName} must be a non-empty string.`);
    }
  });

  if (!Array.isArray(pack.records) || pack.records.length === 0) {
    errors.push('records must be a non-empty array.');
    return buildValidationResult(errors);
  }

  const recordIds = new Set();

  pack.records.forEach((record, index) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      errors.push(`records[${index}] must be a plain object.`);
      return;
    }

    const entry = /** @type {Record<string, unknown>} */ (record);

    ['id', 'domainId', 'entity', 'evidenceClass', 'targetType', 'targetId', 'summary', 'sourceLabel', 'supportLevel'].forEach((fieldName) => {
      if (!isNonEmptyString(entry[fieldName])) {
        errors.push(`records[${index}].${fieldName} must be a non-empty string.`);
      }
    });

    if (isNonEmptyString(entry.targetType) && !ALLOWED_TARGET_TYPES.includes(entry.targetType)) {
      errors.push(`records[${index}].targetType must be one of: ${ALLOWED_TARGET_TYPES.join(', ')}.`);
    }

    if (isNonEmptyString(entry.supportLevel) && !ALLOWED_SUPPORT_LEVELS.includes(entry.supportLevel)) {
      errors.push(`records[${index}].supportLevel must be one of: ${ALLOWED_SUPPORT_LEVELS.join(', ')}.`);
    }

    if (isNonEmptyString(entry.evidenceClass) && !ALLOWED_EVIDENCE_CLASSES.includes(entry.evidenceClass)) {
      errors.push(`records[${index}].evidenceClass must be one of: ${ALLOWED_EVIDENCE_CLASSES.join(', ')}.`);
    }

    if (entry.domainId !== pack.domainId) {
      errors.push(`records[${index}].domainId must match pack.domainId.`);
    }

    if (entry.entity !== pack.entity) {
      errors.push(`records[${index}].entity must match pack.entity.`);
    }

    if (isNonEmptyString(entry.id)) {
      if (recordIds.has(entry.id)) {
        errors.push(`records[${index}].id must be unique.`);
      }
      recordIds.add(entry.id);
    }
  });

  return buildValidationResult(errors);
}

module.exports = Object.freeze({
  ALLOWED_EVIDENCE_CLASSES,
  ALLOWED_SUPPORT_LEVELS,
  ALLOWED_TARGET_TYPES,
  validateEvidencePack,
});
