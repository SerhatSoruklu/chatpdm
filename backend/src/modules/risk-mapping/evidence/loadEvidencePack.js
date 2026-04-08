'use strict';

const path = require('node:path');
const { safeJsonRead } = require('../utils/safeJsonRead');
const { stableSort } = require('../utils/stableSort');
const { validateEvidencePack } = require('./validateEvidencePack');

const BACKEND_ROOT = path.resolve(__dirname, '../../../../');

function getEvidencePackPath(domainId, entity, evidenceSetVersion) {
  return path.resolve(
    BACKEND_ROOT,
    'data/risk-mapping/evidence-packs',
    domainId,
    entity,
    `${evidenceSetVersion}.json`,
  );
}

function freezeRecord(record) {
  return Object.freeze({
    id: record.id,
    domainId: record.domainId,
    entity: record.entity,
    evidenceClass: record.evidenceClass,
    targetType: record.targetType,
    targetId: record.targetId,
    summary: record.summary,
    sourceLabel: record.sourceLabel,
    supportLevel: record.supportLevel,
  });
}

function freezePack(pack) {
  return Object.freeze({
    domainId: pack.domainId,
    version: pack.version,
    entity: pack.entity,
    evidenceSetVersion: pack.evidenceSetVersion,
    records: Object.freeze(pack.records.map(freezeRecord)),
  });
}

/**
 * @param {{ domainId: string, entity: string, evidenceSetVersion: string }} request
 * @returns {{ domainId: string, version: string, entity: string, evidenceSetVersion: string, records: readonly object[] }}
 */
function loadEvidencePack(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw new TypeError('loadEvidencePack requires a request object.');
  }

  if (
    typeof request.domainId !== 'string' ||
    request.domainId.trim().length === 0 ||
    typeof request.entity !== 'string' ||
    request.entity.trim().length === 0 ||
    typeof request.evidenceSetVersion !== 'string' ||
    request.evidenceSetVersion.trim().length === 0
  ) {
    throw new TypeError('loadEvidencePack requires non-empty domainId, entity, and evidenceSetVersion strings.');
  }

  const filePath = getEvidencePackPath(request.domainId, request.entity, request.evidenceSetVersion);
  const pack = safeJsonRead(filePath);
  const validation = validateEvidencePack(pack);

  if (!validation.valid) {
    throw new Error(`Invalid evidence pack for ${request.domainId}/${request.entity}/${request.evidenceSetVersion}: ${validation.errors.join(' | ')}`);
  }

  const normalizedPack = freezePack({
    domainId: pack.domainId,
    version: pack.version,
    entity: pack.entity,
    evidenceSetVersion: pack.evidenceSetVersion,
    records: stableSort(pack.records, (left, right) => left.id.localeCompare(right.id)),
  });

  return normalizedPack;
}

module.exports = Object.freeze({
  getEvidencePackPath,
  loadEvidencePack,
});
