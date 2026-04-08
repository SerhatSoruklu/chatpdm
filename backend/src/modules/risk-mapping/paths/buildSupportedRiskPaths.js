'use strict';

const { stableSort } = require('../utils/stableSort');
const { validatePathCompatibility } = require('./validatePathCompatibility');

function freezePath(path) {
  return Object.freeze({
    id: path.id,
    domainId: path.domainId,
    entity: path.entity,
    scope: path.scope,
    threatId: path.threatId,
    targetNodeId: path.targetNodeId,
    compatibilityRuleId: path.compatibilityRuleId,
    support: Object.freeze({
      threatSupported: path.support.threatSupported,
      nodeSupported: path.support.nodeSupported,
    }),
  });
}

function collectPathCandidates(registryIndex, admittedScopes) {
  const admittedScopeSet = new Set(admittedScopes);
  const candidates = [];

  for (const node of registryIndex.nodeRegistry.entries) {
    if (!admittedScopeSet.has(node.scope)) {
      continue;
    }

    for (const threatId of node.supportedThreatIds) {
      candidates.push({
        threatId,
        targetNodeId: node.id,
        scope: node.scope,
      });
    }
  }

  return candidates;
}

/**
 * @param {{
 *   normalizedQuery: { domain: string, entity: string },
 *   admissibilityDecision: { admittedScopes: readonly string[], status: string },
 *   registryIndex: {
 *     domainManifest: { domainId: string },
 *     nodeRegistry: { entries: readonly { id: string, scope: string, supportedThreatIds: readonly string[] }[] },
 *     nodeById: Readonly<Record<string, { id: string, scope: string, supportedThreatIds: readonly string[] }>>,
 *     threatById: Readonly<Record<string, object>>,
 *     causalCompatibilityRegistry: { entries: readonly { id: string, threatId: string, targetNodeId: string }[] },
 *   },
 *   evidenceCoverageReport: {
 *     supportedNodeIds: readonly string[],
 *     supportedThreatIds: readonly string[],
 *   },
 * }} input
 * @returns {readonly {
 *   id: string,
 *   domainId: string,
 *   entity: string,
 *   scope: string,
 *   threatId: string,
 *   targetNodeId: string,
 *   compatibilityRuleId: string,
 *   support: { threatSupported: boolean, nodeSupported: boolean },
 * }[]}
 */
function buildSupportedRiskPaths(input) {
  if (input.admissibilityDecision.status === 'refused') {
    return Object.freeze([]);
  }

  const supportedNodeSet = new Set(input.evidenceCoverageReport.supportedNodeIds);
  const supportedThreatSet = new Set(input.evidenceCoverageReport.supportedThreatIds);
  const candidates = collectPathCandidates(input.registryIndex, input.admissibilityDecision.admittedScopes);
  const paths = [];

  for (const candidate of candidates) {
    const compatibility = validatePathCompatibility({
      threatId: candidate.threatId,
      targetNodeId: candidate.targetNodeId,
      admittedScopes: input.admissibilityDecision.admittedScopes,
      registryIndex: input.registryIndex,
      evidenceCoverageReport: input.evidenceCoverageReport,
    });

    if (!compatibility.compatible) {
      continue;
    }

    paths.push(
      freezePath({
        id: `${candidate.threatId}->${candidate.targetNodeId}`,
        domainId: input.registryIndex.domainManifest.domainId,
        entity: input.normalizedQuery.entity,
        scope: candidate.scope,
        threatId: candidate.threatId,
        targetNodeId: candidate.targetNodeId,
        compatibilityRuleId: compatibility.compatibilityRuleId,
        support: {
          threatSupported: supportedThreatSet.has(candidate.threatId),
          nodeSupported: supportedNodeSet.has(candidate.targetNodeId),
        },
      }),
    );
  }

  return Object.freeze(stableSort(paths, (left, right) => left.id.localeCompare(right.id)));
}

module.exports = Object.freeze({
  buildSupportedRiskPaths,
});
