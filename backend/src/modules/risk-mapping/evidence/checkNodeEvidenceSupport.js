'use strict';

function filterTargetRecords(evidencePack, targetType, targetId) {
  return evidencePack.records.filter(
    (record) => record.targetType === targetType && record.targetId === targetId,
  );
}

/**
 * @param {string} nodeId
 * @param {{ records: readonly { targetType: string, targetId: string, supportLevel: string, evidenceClass: string }[] }} evidencePack
 * @returns {{
 *   targetId: string,
 *   supported: boolean,
 *   evidenceRecordIds: string[],
 *   directEvidenceRecordIds: string[],
 *   contextualEvidenceRecordIds: string[],
 * }}
 */
function checkNodeEvidenceSupport(nodeId, evidencePack) {
  const records = filterTargetRecords(evidencePack, 'node', nodeId);
  const evidenceRecordIds = records.map((record) => record.id);
  const directEvidenceRecordIds = records.filter((record) => record.supportLevel === 'direct').map((record) => record.id);
  const contextualEvidenceRecordIds = records.filter((record) => record.supportLevel === 'contextual').map((record) => record.id);

  return Object.freeze({
    targetId: nodeId,
    supported: records.length > 0,
    evidenceRecordIds: Object.freeze([...evidenceRecordIds]),
    directEvidenceRecordIds: Object.freeze([...directEvidenceRecordIds]),
    contextualEvidenceRecordIds: Object.freeze([...contextualEvidenceRecordIds]),
  });
}

module.exports = Object.freeze({
  checkNodeEvidenceSupport,
});

