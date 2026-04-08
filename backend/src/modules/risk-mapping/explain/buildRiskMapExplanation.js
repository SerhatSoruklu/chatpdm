'use strict';

const { freezePlainObject } = require('../utils/freezePlainObject');
const { stableUniqueStrings } = require('../utils/stableUniqueStrings');
const { buildReasonExplanation } = require('./buildReasonExplanation');
const { buildConfidenceExplanation } = require('../confidence/buildConfidenceExplanation');

function idsFrom(entries, selector) {
  return stableUniqueStrings(entries.map(selector));
}

/**
 * @param {{
 *   normalizedQuery: { domain: string, entity: string, evidenceSetVersion: string },
 *   admissibilityDecision: { status: string, reasonCode: string, reason: string, admittedScopes: readonly string[], narrowedFromScopes: readonly string[], refusedScopes: readonly string[] },
 *   evidenceCoverageReport: { supportedNodeIds: readonly string[], unsupportedNodeIds: readonly string[], supportedThreatIds: readonly string[], unsupportedThreatIds: readonly string[] },
 *   supportedPaths: readonly { id: string }[],
 *   unsupportedBridgeLedger: readonly { id: string }[],
 *   assumptionsLedger: readonly { id: string }[],
 *   unknownsLedger: readonly { id: string }[],
 *   falsifierLedger: readonly { id: string }[],
 *   confidenceAssessment: { boundedConfidenceClass: string, reasons: readonly string[] },
 * }} input
 * @returns {{
 *   admission: {
 *     status: string,
 *     reasonCode: string,
 *     reason: string,
 *     admittedScopes: readonly string[],
 *     narrowedFromScopes: readonly string[],
 *     refusedScopes: readonly string[],
 *   },
 *   support: {
 *     supportedNodeIds: readonly string[],
 *     unsupportedNodeIds: readonly string[],
 *     supportedThreatIds: readonly string[],
 *     unsupportedThreatIds: readonly string[],
 *     supportedPathIds: readonly string[],
 *   },
 *   bridges: {
 *     unsupportedBridgeIds: readonly string[],
 *   },
 *   ledgers: {
 *     assumptionIds: readonly string[],
 *     unknownIds: readonly string[],
 *     falsifierIds: readonly string[],
 *   },
 *   confidence: {
 *     boundedConfidenceClass: string,
 *     reasonIds: readonly string[],
 *     explanation: string,
 *   },
 *   framing: {
 *     confidenceMeaning: string,
 *     pathMeaning: string,
 *     refusalMeaning: string,
 *   },
 *   evidence: {
 *     domainId: string,
 *     entity: string,
 *     evidenceSetVersion: string,
 *   },
 *   meta: {
 *     whyNarrowed: string | null,
 *     whyRefused: string | null,
 *   },
 * }}
 */
function buildRiskMapExplanation(input) {
  const reasonExplanation = buildReasonExplanation({
    status: input.admissibilityDecision.status,
    reasonCode: input.admissibilityDecision.reasonCode,
  });
  const framing = freezePlainObject({
    confidenceMeaning: 'Bounded support confidence within authored constraints.',
    pathMeaning: 'Supported structural path within current admitted scope.',
    refusalMeaning: 'Outside current authored support boundary.',
  });

  return freezePlainObject({
    admission: freezePlainObject({
      status: input.admissibilityDecision.status,
      reasonCode: input.admissibilityDecision.reasonCode,
      reason: input.admissibilityDecision.reason,
      admittedScopes: stableUniqueStrings(input.admissibilityDecision.admittedScopes),
      narrowedFromScopes: stableUniqueStrings(input.admissibilityDecision.narrowedFromScopes),
      refusedScopes: stableUniqueStrings(input.admissibilityDecision.refusedScopes),
    }),
    support: freezePlainObject({
      supportedNodeIds: stableUniqueStrings(input.evidenceCoverageReport.supportedNodeIds),
      unsupportedNodeIds: stableUniqueStrings(input.evidenceCoverageReport.unsupportedNodeIds),
      supportedThreatIds: stableUniqueStrings(input.evidenceCoverageReport.supportedThreatIds),
      unsupportedThreatIds: stableUniqueStrings(input.evidenceCoverageReport.unsupportedThreatIds),
      supportedPathIds: idsFrom(input.supportedPaths, (path) => path.id),
    }),
    bridges: freezePlainObject({
      unsupportedBridgeIds: idsFrom(input.unsupportedBridgeLedger, (entry) => entry.id),
    }),
    ledgers: freezePlainObject({
      assumptionIds: idsFrom(input.assumptionsLedger, (entry) => entry.id),
      unknownIds: idsFrom(input.unknownsLedger, (entry) => entry.id),
      falsifierIds: idsFrom(input.falsifierLedger, (entry) => entry.id),
    }),
    confidence: buildConfidenceExplanation(input.confidenceAssessment),
    framing,
    evidence: freezePlainObject({
      domainId: input.normalizedQuery.domain,
      entity: input.normalizedQuery.entity,
      evidenceSetVersion: input.normalizedQuery.evidenceSetVersion,
    }),
    meta: freezePlainObject({
      whyNarrowed: reasonExplanation.whyNarrowed,
      whyRefused: reasonExplanation.whyRefused,
    }),
  });
}

module.exports = Object.freeze({
  buildRiskMapExplanation,
});
