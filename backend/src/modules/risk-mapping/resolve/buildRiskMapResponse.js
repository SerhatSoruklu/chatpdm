'use strict';

const { freezePlainObject } = require('../utils/freezePlainObject');
const { stableUniqueStrings } = require('../utils/stableUniqueStrings');
const { formatSupportedPath, formatUnsupportedBridge, formatFalsifier } = require('../constants/rmgOutputFormats');
const { validateRmgFreezeInvariants } = require('../freeze/validateRmgFreezeInvariants');

function buildDiagnostics(input) {
  const shouldEmitSupportIds = input.admissibilityDecision.status !== 'refused';
  return freezePlainObject({
    hasBroadCollapseLanguage: Boolean(input.classification.flags.hasBroadCollapseLanguage),
    hasUnsupportedFraming: Boolean(input.classification.flags.hasUnsupportedFraming),
    admittedScopes: stableUniqueStrings(input.admissibilityDecision.admittedScopes),
    narrowedFromScopes: stableUniqueStrings(input.admissibilityDecision.narrowedFromScopes),
    refusedScopes: stableUniqueStrings(input.admissibilityDecision.refusedScopes),
    supportedNodeIds: shouldEmitSupportIds
      ? stableUniqueStrings(input.evidenceCoverageReport.supportedNodeIds)
      : Object.freeze([]),
    unsupportedNodeIds: shouldEmitSupportIds
      ? stableUniqueStrings(input.evidenceCoverageReport.unsupportedNodeIds)
      : Object.freeze([]),
    supportedThreatIds: shouldEmitSupportIds
      ? stableUniqueStrings(input.evidenceCoverageReport.supportedThreatIds)
      : Object.freeze([]),
    unsupportedThreatIds: shouldEmitSupportIds
      ? stableUniqueStrings(input.evidenceCoverageReport.unsupportedThreatIds)
      : Object.freeze([]),
  });
}

function formatUnsupportedBridgeEntry(entry, normalizedQuery) {
  if (entry.type === 'broad_collapse_overreach') {
    return formatUnsupportedBridge(entry.type, normalizedQuery.entity);
  }

  if (entry.targetNodeId && entry.threatId) {
    return formatUnsupportedBridge(entry.type, `${entry.threatId}->${entry.targetNodeId}`);
  }

  if (entry.scope) {
    return formatUnsupportedBridge(entry.type, entry.scope);
  }

  return formatUnsupportedBridge(entry.type, normalizedQuery.entity);
}

/**
 * @param {{
 *   normalizedQuery: { domain: string, scenarioType: string, entity: string },
 *   admissibilityDecision: { status: string, reasonCode: string, reason: string, admittedScopes: readonly string[], narrowedFromScopes: readonly string[], refusedScopes: readonly string[] },
 *   classification: { flags: { hasBroadCollapseLanguage: boolean, hasUnsupportedFraming: boolean } },
 *   evidenceCoverageReport: { supportedNodeIds: readonly string[], unsupportedNodeIds: readonly string[], supportedThreatIds: readonly string[], unsupportedThreatIds: readonly string[] },
 *   supportedPaths: readonly { id: string, threatId: string, targetNodeId: string }[],
 *   unsupportedBridgeLedger: readonly { id: string, type: string, threatId: string | null, targetNodeId: string | null, scope: string | null }[],
 *   assumptionsLedger: readonly { id: string }[],
 *   unknownsLedger: readonly { id: string }[],
 *   falsifierLedger: readonly { id: string, falsifierId: string, targetNodeId: string }[],
 *   confidenceAssessment: { boundedConfidenceClass: string, reasons: readonly string[] },
 * }} input
 * @returns {{
 *   status: string,
 *   reasonCode: string,
 *   reason: string,
 *   domain: string,
 *   scenarioType: string,
 *   entity: string,
 *   supportedNodes: readonly string[],
 *   supportedThreatVectors: readonly string[],
 *   supportedCausalPaths: readonly string[],
 *   unsupportedBridges: readonly string[],
 *   assumptions: readonly string[],
 *   unknowns: readonly string[],
 *   falsifiers: readonly string[],
 *   boundedConfidenceClass: string,
 *   diagnostics: Readonly<Record<string, unknown>>,
 * }}
 */
function buildRiskMapResponse(input) {
  const shouldEmitStructuralSupport = input.admissibilityDecision.status !== 'refused';
  const supportedNodes = shouldEmitStructuralSupport
    ? stableUniqueStrings(input.evidenceCoverageReport.supportedNodeIds)
    : Object.freeze([]);
  const supportedThreatVectors = shouldEmitStructuralSupport
    ? stableUniqueStrings(input.evidenceCoverageReport.supportedThreatIds)
    : Object.freeze([]);
  const supportedCausalPaths = shouldEmitStructuralSupport
    ? stableUniqueStrings(
        input.supportedPaths.map((path) => formatSupportedPath(path.threatId, path.targetNodeId)),
      )
    : Object.freeze([]);
  const unsupportedBridges = shouldEmitStructuralSupport
    ? stableUniqueStrings(
        input.unsupportedBridgeLedger.map((entry) => formatUnsupportedBridgeEntry(entry, input.normalizedQuery)),
      )
    : Object.freeze([]);
  const assumptions = shouldEmitStructuralSupport
    ? stableUniqueStrings(input.assumptionsLedger.map((entry) => entry.id))
    : Object.freeze([]);
  const unknowns = shouldEmitStructuralSupport
    ? stableUniqueStrings(input.unknownsLedger.map((entry) => entry.id))
    : Object.freeze([]);
  const falsifiers = shouldEmitStructuralSupport
    ? stableUniqueStrings(
        input.falsifierLedger.map((entry) => formatFalsifier(entry.falsifierId, entry.targetNodeId)),
      )
    : Object.freeze([]);

  const output = freezePlainObject({
    status: input.admissibilityDecision.status,
    reasonCode: input.admissibilityDecision.reasonCode,
    reason: input.admissibilityDecision.reason,
    domain: input.normalizedQuery.domain,
    scenarioType: input.normalizedQuery.scenarioType,
    entity: input.normalizedQuery.entity,
    supportedNodes,
    supportedThreatVectors,
    supportedCausalPaths,
    unsupportedBridges,
    assumptions,
    unknowns,
    falsifiers,
    boundedConfidenceClass: input.confidenceAssessment.boundedConfidenceClass,
    diagnostics: buildDiagnostics(input),
  });

  validateRmgFreezeInvariants(output);

  return output;
}

module.exports = Object.freeze({
  buildRiskMapResponse,
});
