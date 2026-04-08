'use strict';

const {
  ADMISSIBLE_QUERY,
  BROAD_COLLAPSE_FRAMING,
  INSUFFICIENT_EVIDENCE,
  PARTIAL_EVIDENCE_SUPPORT,
  UNSUPPORTED_DOMAIN,
  UNSUPPORTED_SCENARIO_TYPE,
  UNSUPPORTED_SCOPE,
} = require('../constants/rmgReasonCodes');
const { buildNarrowingDecision } = require('./buildNarrowingDecision');
const { buildRefusalDecision } = require('./buildRefusalDecision');
const { stableSort } = require('../utils/stableSort');

function buildDiagnostics(classification, evidenceCoverageReport) {
  return {
    hasBroadCollapseLanguage: classification.flags.hasBroadCollapseLanguage,
    hasUnsupportedFraming: classification.flags.hasUnsupportedFraming,
    supportedNodeIds: evidenceCoverageReport.supportedNodeIds,
    unsupportedNodeIds: evidenceCoverageReport.unsupportedNodeIds,
    supportedThreatIds: evidenceCoverageReport.supportedThreatIds,
    unsupportedThreatIds: evidenceCoverageReport.unsupportedThreatIds,
  };
}

function uniqueSorted(values) {
  return stableSort([...new Set(values)]);
}

function getRequestedSupportedScopes(normalizedQuery, domainManifest) {
  const domainSupportedScopeSet = new Set(domainManifest.supportedScopes);
  return normalizedQuery.scope.filter((scope) => domainSupportedScopeSet.has(scope));
}

function getRequestedUnsupportedScopes(normalizedQuery, domainManifest) {
  const domainSupportedScopeSet = new Set(domainManifest.supportedScopes);
  return normalizedQuery.scope.filter((scope) => !domainSupportedScopeSet.has(scope));
}

function buildScopeDetails(registryIndex, requestedSupportedScopes) {
  const scopeDetails = Object.create(null);

  for (const scope of requestedSupportedScopes) {
    const nodeIds = stableSort(
      registryIndex.nodeRegistry.entries
        .filter((node) => node.scope === scope)
        .map((node) => node.id),
    );

    const threatIds = uniqueSorted(
      nodeIds.flatMap((nodeId) => {
        const node = registryIndex.nodeById[nodeId];
        return node ? node.supportedThreatIds : [];
      }),
    );

    scopeDetails[scope] = {
      nodeIds,
      threatIds,
    };
  }

  return scopeDetails;
}

function collectThreatIdsForNodes(registryIndex, nodeIds) {
  const seen = new Set();
  const threatIds = [];

  for (const nodeId of nodeIds) {
    const node = registryIndex.nodeById[nodeId];

    if (!node) {
      continue;
    }

    for (const threatId of node.supportedThreatIds) {
      if (!seen.has(threatId)) {
        seen.add(threatId);
        threatIds.push(threatId);
      }
    }
  }

  return stableSort(threatIds);
}

/**
 * @param {{
 *   normalizedQuery: { entity: string, domain: string, scenarioType: string, scope: readonly string[], evidenceSetVersion: string },
 *   classification: { flags: { hasBroadCollapseLanguage: boolean, hasUnsupportedFraming: boolean } },
 *   domainManifest: { domainId: string, supportedScenarioTypes: readonly string[], supportedScopes: readonly string[] },
 *   registryIndex: {
 *     domainManifest: { domainId: string, supportedScopes: readonly string[] },
 *     nodeRegistry: { entries: readonly { id: string, scope: string, supportedThreatIds: readonly string[] }[] },
 *     threatRegistry: { entries: readonly { id: string }[] },
 *   },
 *   evidenceCoverageReport: {
 *     supportedNodeIds: readonly string[],
 *     unsupportedNodeIds: readonly string[],
 *     supportedThreatIds: readonly string[],
 *     unsupportedThreatIds: readonly string[],
 *   },
 * }} input
 * @returns {{
 *   status: 'admitted' | 'narrowed' | 'refused',
 *   reasonCode: string,
 *   reason: string,
 *   admittedScopes: readonly string[],
 *   narrowedFromScopes: readonly string[],
 *   refusedScopes: readonly string[],
 *   diagnostics: {
 *     hasBroadCollapseLanguage: boolean,
 *     hasUnsupportedFraming: boolean,
 *     supportedNodeIds: readonly string[],
 *     unsupportedNodeIds: readonly string[],
 *     supportedThreatIds: readonly string[],
 *     unsupportedThreatIds: readonly string[],
 *   },
 * }}
 */
function assessRiskMapAdmissibility(input) {
  const { normalizedQuery, classification, domainManifest, registryIndex, evidenceCoverageReport } = input;
  const diagnostics = buildDiagnostics(classification, evidenceCoverageReport);

  if (normalizedQuery.domain !== domainManifest.domainId) {
    return buildRefusalDecision({
      reasonCode: UNSUPPORTED_DOMAIN,
      reason: 'Requested domain is outside the authored support boundary.',
      admittedScopes: [],
      narrowedFromScopes: normalizedQuery.scope,
      refusedScopes: normalizedQuery.scope,
      diagnostics,
    });
  }

  if (!domainManifest.supportedScenarioTypes.includes(normalizedQuery.scenarioType)) {
    return buildRefusalDecision({
      reasonCode: UNSUPPORTED_SCENARIO_TYPE,
      reason: 'Requested scenario type is outside the authored support boundary.',
      admittedScopes: [],
      narrowedFromScopes: normalizedQuery.scope,
      refusedScopes: normalizedQuery.scope,
      diagnostics,
    });
  }

  const requestedSupportedScopes = getRequestedSupportedScopes(normalizedQuery, domainManifest);
  const requestedUnsupportedScopes = getRequestedUnsupportedScopes(normalizedQuery, domainManifest);

  if (requestedSupportedScopes.length === 0) {
    return buildRefusalDecision({
      reasonCode: UNSUPPORTED_SCOPE,
      reason: 'Requested scopes are outside the authored support boundary.',
      admittedScopes: [],
      narrowedFromScopes: normalizedQuery.scope,
      refusedScopes: normalizedQuery.scope,
      diagnostics,
    });
  }

  const scopeDetails = buildScopeDetails(registryIndex, requestedSupportedScopes);
  const scopedNodeIds = stableSort(requestedSupportedScopes.flatMap((scope) => scopeDetails[scope].nodeIds));
  const scopedThreatIds = collectThreatIdsForNodes(registryIndex, scopedNodeIds);
  const supportedNodeSet = new Set(evidenceCoverageReport.supportedNodeIds);
  const supportedThreatSet = new Set(evidenceCoverageReport.supportedThreatIds);

  const supportedScopedNodeIds = scopedNodeIds.filter((nodeId) => supportedNodeSet.has(nodeId));
  const unsupportedScopedNodeIds = scopedNodeIds.filter((nodeId) => !supportedNodeSet.has(nodeId));
  const supportedScopedThreatIds = scopedThreatIds.filter((threatId) => supportedThreatSet.has(threatId));
  const unsupportedScopedThreatIds = scopedThreatIds.filter((threatId) => !supportedThreatSet.has(threatId));

  const hasAnyEvidenceSupport =
    supportedScopedNodeIds.length > 0 || supportedScopedThreatIds.length > 0;

  if (!hasAnyEvidenceSupport) {
    return buildRefusalDecision({
      reasonCode: INSUFFICIENT_EVIDENCE,
      reason: 'No requested scoped nodes or linked threats have authored evidence support.',
      admittedScopes: [],
      narrowedFromScopes: normalizedQuery.scope,
      refusedScopes: normalizedQuery.scope,
      diagnostics,
    });
  }

  const allRequestedEvidenceSupported =
    unsupportedScopedNodeIds.length === 0 && unsupportedScopedThreatIds.length === 0;

  const admittedScopes = allRequestedEvidenceSupported
    ? stableSort(requestedSupportedScopes)
    : stableSort(requestedSupportedScopes.filter((scope) => {
        const details = scopeDetails[scope];
        const nodesSupported = details.nodeIds.every((nodeId) => supportedNodeSet.has(nodeId));
        const threatsSupported = details.threatIds.every((threatId) => supportedThreatSet.has(threatId));
        return nodesSupported && threatsSupported;
      }));

  const narrowedFromScopes = stableSort([
    ...requestedUnsupportedScopes,
    ...requestedSupportedScopes.filter((scope) => !admittedScopes.includes(scope)),
  ]);
  const refusedScopes = allRequestedEvidenceSupported ? [] : narrowedFromScopes;

  if (classification.flags.hasBroadCollapseLanguage) {
    return buildNarrowingDecision({
      admittedScopes,
      narrowedFromScopes,
      refusedScopes,
      hasBroadCollapseLanguage: true,
      diagnostics,
    });
  }

  if (allRequestedEvidenceSupported) {
    return Object.freeze({
      status: 'admitted',
      reasonCode: ADMISSIBLE_QUERY,
      reason: 'The query is admissible under authored evidence support.',
      admittedScopes: Object.freeze([...admittedScopes]),
      narrowedFromScopes: Object.freeze([]),
      refusedScopes: Object.freeze([]),
      diagnostics: Object.freeze({
        hasBroadCollapseLanguage: diagnostics.hasBroadCollapseLanguage,
        hasUnsupportedFraming: diagnostics.hasUnsupportedFraming,
        supportedNodeIds: Object.freeze([...diagnostics.supportedNodeIds]),
        unsupportedNodeIds: Object.freeze([...diagnostics.unsupportedNodeIds]),
        supportedThreatIds: Object.freeze([...diagnostics.supportedThreatIds]),
        unsupportedThreatIds: Object.freeze([...diagnostics.unsupportedThreatIds]),
      }),
    });
  }

  return buildNarrowingDecision({
    admittedScopes,
    narrowedFromScopes,
    refusedScopes,
    hasBroadCollapseLanguage: false,
    diagnostics,
  });
}

module.exports = Object.freeze({
  assessRiskMapAdmissibility,
});
