'use strict';

function filterTargetRecords(evidencePack, targetType, targetId) {
  return evidencePack.records.filter(
    (record) => record.targetType === targetType && record.targetId === targetId,
  );
}

/**
 * @param {string} threatId
 * @param {{ records: readonly { targetType: string, targetId: string, supportLevel: string, evidenceClass: string }[] }} evidencePack
 * @returns {{
 *   targetId: string,
 *   supported: boolean,
 *   evidenceRecordIds: string[],
 *   directEvidenceRecordIds: string[],
 *   contextualEvidenceRecordIds: string[],
 * }}
 */
function checkThreatEvidenceSupport(threatId, evidencePack) {
  const records = filterTargetRecords(evidencePack, 'threat', threatId);
  const evidenceRecordIds = records.map((record) => record.id);
  const directEvidenceRecordIds = records.filter((record) => record.supportLevel === 'direct').map((record) => record.id);
  const contextualEvidenceRecordIds = records.filter((record) => record.supportLevel === 'contextual').map((record) => record.id);

  return Object.freeze({
    targetId: threatId,
    supported: records.length > 0,
    evidenceRecordIds: Object.freeze([...evidenceRecordIds]),
    directEvidenceRecordIds: Object.freeze([...directEvidenceRecordIds]),
    contextualEvidenceRecordIds: Object.freeze([...contextualEvidenceRecordIds]),
  });
}

module.exports = Object.freeze({
  checkThreatEvidenceSupport,
});

