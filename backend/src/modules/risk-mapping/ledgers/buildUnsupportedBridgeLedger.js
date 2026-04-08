'use strict';

const { stableSort } = require('../utils/stableSort');
const {
  MISSING_COMPATIBILITY_RULE,
  UNSUPPORTED_THREAT_EVIDENCE,
  UNSUPPORTED_NODE_EVIDENCE,
  SCOPE_NOT_ADMITTED,
  BROAD_COLLAPSE_OVERREACH,
} = require('../constants/rmgReasonCodes');

function makeBridgeId(type, threatId, targetNodeId, scope, entity) {
  if (type === 'broad_collapse_overreach') {
    return `${type}:${entity}_downfall`;
  }

  if (type === 'scope_not_admitted') {
    return `${type}:${scope}`;
  }

  return `${type}:${threatId}->${targetNodeId}`;
}

function freezeBridge(entry) {
  return Object.freeze({
    id: entry.id,
    type: entry.type,
    threatId: entry.threatId,
    targetNodeId: entry.targetNodeId,
    scope: entry.scope,
    reasonCode: entry.reasonCode,
    reason: entry.reason,
  });
}

/**
 * @param {{
 *   normalizedQuery: { entity: string, scope: readonly string[] },
 *   classification: { flags: { hasBroadCollapseLanguage: boolean } },
 *   admissibilityDecision: { status: string, admittedScopes: readonly string[], narrowedFromScopes: readonly string[], refusedScopes: readonly string[] },
 *   registryIndex: {
 *     nodeRegistry: { entries: readonly { id: string, scope: string, supportedThreatIds: readonly string[] }[] },
 *   },
 *   evidenceCoverageReport: {
 *     supportedNodeIds: readonly string[],
 *     supportedThreatIds: readonly string[],
 *   },
 * }} input
 * @returns {readonly {
 *   id: string,
 *   type: string,
 *   threatId: string | null,
 *   targetNodeId: string | null,
 *   scope: string | null,
 *   reasonCode: string,
 *   reason: string,
 * }[]}
 */
function buildUnsupportedBridgeLedger(input) {
  if (input.admissibilityDecision.status === 'refused') {
    return Object.freeze([]);
  }

  const supportedNodeSet = new Set(input.evidenceCoverageReport.supportedNodeIds);
  const supportedThreatSet = new Set(input.evidenceCoverageReport.supportedThreatIds);
  const admittedScopeSet = new Set(input.admissibilityDecision.admittedScopes);
  const ledger = [];
  const seen = new Set();

  for (const scope of input.normalizedQuery.scope) {
    if (admittedScopeSet.has(scope)) {
      continue;
    }

    const id = makeBridgeId('scope_not_admitted', null, null, scope, input.normalizedQuery.entity);
    if (!seen.has(id)) {
      seen.add(id);
      ledger.push(
        freezeBridge({
          id,
          type: 'scope_not_admitted',
          threatId: null,
          targetNodeId: null,
          scope,
          reasonCode: SCOPE_NOT_ADMITTED,
          reason: 'The scope is not admitted for this query.',
        }),
      );
    }
  }

  for (const node of input.registryIndex.nodeRegistry.entries) {
    if (!admittedScopeSet.has(node.scope)) {
      continue;
    }

    if (!supportedNodeSet.has(node.id)) {
      const id = makeBridgeId('unsupported_node_evidence', null, node.id, node.scope, input.normalizedQuery.entity);
      if (!seen.has(id)) {
        seen.add(id);
        ledger.push(
          freezeBridge({
            id,
            type: 'unsupported_node_evidence',
            threatId: null,
            targetNodeId: node.id,
            scope: node.scope,
            reasonCode: UNSUPPORTED_NODE_EVIDENCE,
            reason: 'The node has no authored evidence support.',
          }),
        );
      }
    }

    for (const threatId of node.supportedThreatIds) {
      const hasEvidenceForThreat = supportedThreatSet.has(threatId);
      const compatibility = input.registryIndex.causalCompatibilityRegistry.entries.find(
        (entry) => entry.threatId === threatId && entry.targetNodeId === node.id,
      );

      if (!hasEvidenceForThreat) {
        const id = makeBridgeId('unsupported_threat_evidence', threatId, node.id, node.scope, input.normalizedQuery.entity);
        if (!seen.has(id)) {
          seen.add(id);
          ledger.push(
            freezeBridge({
              id,
              type: 'unsupported_threat_evidence',
              threatId,
              targetNodeId: node.id,
              scope: node.scope,
              reasonCode: UNSUPPORTED_THREAT_EVIDENCE,
              reason: 'The threat has no authored evidence support.',
            }),
          );
        }
        continue;
      }

      if (!compatibility) {
        const id = makeBridgeId('missing_compatibility_rule', threatId, node.id, node.scope, input.normalizedQuery.entity);
        if (!seen.has(id)) {
          seen.add(id);
          ledger.push(
            freezeBridge({
              id,
              type: 'missing_compatibility_rule',
              threatId,
              targetNodeId: node.id,
              scope: node.scope,
              reasonCode: MISSING_COMPATIBILITY_RULE,
              reason: 'No authored compatibility rule exists for this threat and node pair.',
            }),
          );
        }
      }
    }
  }

  if (input.classification.flags.hasBroadCollapseLanguage) {
    const id = makeBridgeId('broad_collapse_overreach', null, null, null, input.normalizedQuery.entity);
    ledger.push(
      freezeBridge({
        id,
        type: 'broad_collapse_overreach',
        threatId: null,
        targetNodeId: null,
        scope: null,
        reasonCode: BROAD_COLLAPSE_OVERREACH,
        reason: 'Broad collapse framing exceeds the direct-path evidence boundary.',
      }),
    );
  }

  return Object.freeze(stableSort(ledger, (left, right) => left.id.localeCompare(right.id)));
}

module.exports = Object.freeze({
  buildUnsupportedBridgeLedger,
});
