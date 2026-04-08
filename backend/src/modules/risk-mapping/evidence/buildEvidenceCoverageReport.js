'use strict';

const { stableSort } = require('../utils/stableSort');
const { checkNodeEvidenceSupport } = require('./checkNodeEvidenceSupport');
const { checkThreatEvidenceSupport } = require('./checkThreatEvidenceSupport');

function freezeCoverageMap(source) {
  const target = Object.create(null);

  for (const [key, value] of Object.entries(source)) {
    target[key] = Object.freeze({ ...value });
  }

  return Object.freeze(target);
}

function ensureEvidenceTargetsExist(registryIndex, evidencePack) {
  for (const record of evidencePack.records) {
    if (record.targetType === 'node') {
      if (!Object.prototype.hasOwnProperty.call(registryIndex.nodeById, record.targetId)) {
        throw new Error(`Missing node target in registries: ${record.targetId}`);
      }
    } else if (record.targetType === 'threat') {
      if (!Object.prototype.hasOwnProperty.call(registryIndex.threatById, record.targetId)) {
        throw new Error(`Missing threat target in registries: ${record.targetId}`);
      }
    }
  }
}

/**
 * @param {{
 *   normalizedQuery: { entity: string, domain: string, scope: readonly string[], evidenceSetVersion: string },
 *   registryIndex: {
 *     domainManifest: { domainId: string, supportedScopes: readonly string[] },
 *     nodeRegistry: { entries: readonly { id: string, scope: string, supportedThreatIds: readonly string[] }[] },
 *     threatRegistry: { entries: readonly { id: string }[] },
 *     nodeById: Readonly<Record<string, { id: string, scope: string, supportedThreatIds: readonly string[] }>>,
 *     threatById: Readonly<Record<string, { id: string }>>,
 *   },
 *   evidencePack: { domainId: string, entity: string, evidenceSetVersion: string, records: readonly { id: string, targetType: string, targetId: string, supportLevel: string }[] },
 * }} input
 * @returns {{
 *   entity: string,
 *   domainId: string,
 *   evidenceSetVersion: string,
 *   supportedNodeIds: readonly string[],
 *   unsupportedNodeIds: readonly string[],
 *   supportedThreatIds: readonly string[],
 *   unsupportedThreatIds: readonly string[],
 *   coverageByNodeId: Readonly<Record<string, { supported: boolean, evidenceRecordIds: readonly string[], directEvidenceRecordIds: readonly string[], contextualEvidenceRecordIds: readonly string[] }>>,
 *   coverageByThreatId: Readonly<Record<string, { supported: boolean, evidenceRecordIds: readonly string[], directEvidenceRecordIds: readonly string[], contextualEvidenceRecordIds: readonly string[] }>>,
 * }}
 */
function buildEvidenceCoverageReport(input) {
  const { normalizedQuery, registryIndex, evidencePack } = input;
  const requestedScopeSet = new Set(normalizedQuery.scope);
  const supportedScopeSet = new Set(registryIndex.domainManifest.supportedScopes);

  ensureEvidenceTargetsExist(registryIndex, evidencePack);

  const scopedNodes = stableSort(
    registryIndex.nodeRegistry.entries.filter(
      (node) => requestedScopeSet.has(node.scope) && supportedScopeSet.has(node.scope),
    ),
    (left, right) => left.id.localeCompare(right.id),
  );

  const threatIds = stableSort(
    [...new Set(scopedNodes.flatMap((node) => node.supportedThreatIds))],
    (left, right) => left.localeCompare(right),
  );

  const coverageByNodeId = Object.create(null);
  const coverageByThreatId = Object.create(null);
  const supportedNodeIds = [];
  const unsupportedNodeIds = [];
  const supportedThreatIds = [];
  const unsupportedThreatIds = [];

  for (const node of scopedNodes) {
    const support = checkNodeEvidenceSupport(node.id, evidencePack);
    coverageByNodeId[node.id] = support;
    if (support.supported) {
      supportedNodeIds.push(node.id);
    } else {
      unsupportedNodeIds.push(node.id);
    }
  }

  for (const threatId of threatIds) {
    const support = checkThreatEvidenceSupport(threatId, evidencePack);
    coverageByThreatId[threatId] = support;
    if (support.supported) {
      supportedThreatIds.push(threatId);
    } else {
      unsupportedThreatIds.push(threatId);
    }
  }

  return Object.freeze({
    entity: normalizedQuery.entity,
    domainId: registryIndex.domainManifest.domainId,
    evidenceSetVersion: normalizedQuery.evidenceSetVersion,
    supportedNodeIds: Object.freeze(stableSort(supportedNodeIds)),
    unsupportedNodeIds: Object.freeze(stableSort(unsupportedNodeIds)),
    supportedThreatIds: Object.freeze(stableSort(supportedThreatIds)),
    unsupportedThreatIds: Object.freeze(stableSort(unsupportedThreatIds)),
    coverageByNodeId: freezeCoverageMap(coverageByNodeId),
    coverageByThreatId: freezeCoverageMap(coverageByThreatId),
  });
}

module.exports = Object.freeze({
  buildEvidenceCoverageReport,
});

