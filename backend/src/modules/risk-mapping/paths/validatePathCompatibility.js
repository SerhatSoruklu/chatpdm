'use strict';

const {
  UNKNOWN_NODE_ID,
  UNKNOWN_THREAT_ID,
  MISSING_COMPATIBILITY_RULE,
  UNSUPPORTED_THREAT_EVIDENCE,
  UNSUPPORTED_NODE_EVIDENCE,
  SCOPE_NOT_ADMITTED,
} = require('../constants/rmgReasonCodes');

function isSupportedEvidence(evidenceCoverageReport, targetId, targetType) {
  if (targetType === 'node') {
    return evidenceCoverageReport.supportedNodeIds.includes(targetId);
  }

  return evidenceCoverageReport.supportedThreatIds.includes(targetId);
}

/**
 * @param {{
 *   threatId: string,
 *   targetNodeId: string,
 *   admittedScopes: readonly string[],
 *   registryIndex: {
 *     domainManifest: { domainId: string },
 *     nodeById: Readonly<Record<string, { id: string, scope: string, supportedThreatIds: readonly string[] }>>,
 *     threatById: Readonly<Record<string, { id: string, targetScopes: readonly string[] }>>,
 *     causalCompatibilityRegistry: { entries: readonly { id: string, threatId: string, targetNodeId: string }[] },
 *   },
 *   evidenceCoverageReport: {
 *     supportedNodeIds: readonly string[],
 *     supportedThreatIds: readonly string[],
 *   },
 * }} input
 * @returns {{
 *   compatible: boolean,
 *   reasonCode: string | null,
 *   reason: string | null,
 *   compatibilityRuleId: string | null,
 * }}
 */
function validatePathCompatibility(input) {
  const { threatId, targetNodeId, admittedScopes, registryIndex, evidenceCoverageReport } = input;
  const node = registryIndex.nodeById[targetNodeId];

  if (!node) {
    return Object.freeze({
      compatible: false,
      reasonCode: UNKNOWN_NODE_ID,
      reason: 'The target node is not registered for the domain.',
      compatibilityRuleId: null,
    });
  }

  const threat = registryIndex.threatById[threatId];

  if (!threat) {
    return Object.freeze({
      compatible: false,
      reasonCode: UNKNOWN_THREAT_ID,
      reason: 'The threat is not registered for the domain.',
      compatibilityRuleId: null,
    });
  }

  if (!admittedScopes.includes(node.scope)) {
    return Object.freeze({
      compatible: false,
      reasonCode: SCOPE_NOT_ADMITTED,
      reason: 'The target node scope is not admitted for this query.',
      compatibilityRuleId: null,
    });
  }

  if (!node.supportedThreatIds.includes(threatId)) {
    return Object.freeze({
      compatible: false,
      reasonCode: MISSING_COMPATIBILITY_RULE,
      reason: 'The node does not author a supported bridge to this threat.',
      compatibilityRuleId: null,
    });
  }

  if (!isSupportedEvidence(evidenceCoverageReport, targetNodeId, 'node')) {
    return Object.freeze({
      compatible: false,
      reasonCode: UNSUPPORTED_NODE_EVIDENCE,
      reason: 'The target node does not have authored evidence support.',
      compatibilityRuleId: null,
    });
  }

  if (!isSupportedEvidence(evidenceCoverageReport, threatId, 'threat')) {
    return Object.freeze({
      compatible: false,
      reasonCode: UNSUPPORTED_THREAT_EVIDENCE,
      reason: 'The threat does not have authored evidence support.',
      compatibilityRuleId: null,
    });
  }

  const compatibilityRule = registryIndex.causalCompatibilityRegistry.entries.find(
    (entry) => entry.threatId === threatId && entry.targetNodeId === targetNodeId,
  );

  if (!compatibilityRule) {
    return Object.freeze({
      compatible: false,
      reasonCode: MISSING_COMPATIBILITY_RULE,
      reason: 'No authored compatibility rule exists for this threat and node pair.',
      compatibilityRuleId: null,
    });
  }

  return Object.freeze({
    compatible: true,
    reasonCode: null,
    reason: null,
    compatibilityRuleId: compatibilityRule.id,
  });
}

module.exports = Object.freeze({
  validatePathCompatibility,
});
