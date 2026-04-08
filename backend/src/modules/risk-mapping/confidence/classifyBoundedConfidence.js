'use strict';

const { LOW_BOUNDED_SUPPORT, MEDIUM_BOUNDED_SUPPORT, HIGH_BOUNDED_SUPPORT } = require('../constants/rmgConfidenceClasses');
const {
  REFUSED_QUERY,
  NO_SUPPORTED_PATHS,
  SUPPORTED_PATHS_PRESENT,
  ADMITTED_FULL_DIRECT_SUPPORT,
  NARROWED_DUE_TO_BROAD_COLLAPSE,
  UNSUPPORTED_BRIDGES_PRESENT,
  UNKNOWNS_CAP_CONFIDENCE,
  FALSIFIER_PRESSURE_VISIBLE,
} = require('../constants/rmgConfidenceReasonIds');
const { stableUniqueStrings } = require('../utils/stableUniqueStrings');

function hasOnlyBroadCollapseOverreach(unsupportedBridgeLedger) {
  return unsupportedBridgeLedger.length > 0 && unsupportedBridgeLedger.every((entry) => entry.type === 'broad_collapse_overreach');
}

function collectReasonIds(input) {
  const reasonIds = [];

  if (input.admissibilityDecision.status === 'refused') {
    reasonIds.push(REFUSED_QUERY);
    return stableUniqueStrings(reasonIds);
  }

  if (input.supportedPaths.length === 0) {
    reasonIds.push(NO_SUPPORTED_PATHS);
  } else {
    reasonIds.push(SUPPORTED_PATHS_PRESENT);
  }

  if (input.admissibilityDecision.status === 'narrowed') {
    reasonIds.push(NARROWED_DUE_TO_BROAD_COLLAPSE);
  }

  const hasUnsupportedBridges = input.unsupportedBridgeLedger.length > 0;
  const hasUnknowns = input.unknownsLedger.length > 0;
  const hasFalsifiers = input.falsifierLedger.length > 0;
  const hasOnlyBroadCollapse = hasOnlyBroadCollapseOverreach(input.unsupportedBridgeLedger);

  if (input.admissibilityDecision.status === 'admitted' && input.supportedPaths.length > 0 && !hasUnsupportedBridges && !hasUnknowns) {
    reasonIds.push(ADMITTED_FULL_DIRECT_SUPPORT);
  } else {
    if (hasUnsupportedBridges && !hasOnlyBroadCollapse) {
      reasonIds.push(UNSUPPORTED_BRIDGES_PRESENT);
    }

    if (hasUnknowns) {
      reasonIds.push(UNKNOWNS_CAP_CONFIDENCE);
    }
  }

  if (hasFalsifiers) {
    reasonIds.push(FALSIFIER_PRESSURE_VISIBLE);
  }

  return stableUniqueStrings(reasonIds);
}

/**
 * @param {{
 *   admissibilityDecision: { status: string },
 *   evidenceCoverageReport: { supportedNodeIds: readonly string[], supportedThreatIds: readonly string[] },
 *   supportedPaths: readonly { id: string }[],
 *   unsupportedBridgeLedger: readonly { type: string }[],
 *   assumptionsLedger: readonly { id: string }[],
 *   unknownsLedger: readonly { id: string }[],
 *   falsifierLedger: readonly { id: string }[],
 * }} input
 * @returns {{
 *   boundedConfidenceClass: string,
 *   reasons: readonly string[],
 * }}
 */
function classifyBoundedConfidence(input) {
  const reasons = collectReasonIds(input);
  const hasDirectEvidenceCoverage =
    input.evidenceCoverageReport.supportedNodeIds.length > 0 &&
    input.evidenceCoverageReport.supportedThreatIds.length > 0;

  if (input.admissibilityDecision.status === 'refused' || input.supportedPaths.length === 0 || !hasDirectEvidenceCoverage) {
    return Object.freeze({
      boundedConfidenceClass: LOW_BOUNDED_SUPPORT,
      reasons: Object.freeze(reasons),
    });
  }

  if (input.admissibilityDecision.status === 'admitted' && !input.unsupportedBridgeLedger.length && !input.unknownsLedger.length) {
    return Object.freeze({
      boundedConfidenceClass: HIGH_BOUNDED_SUPPORT,
      reasons: Object.freeze(reasons),
    });
  }

  return Object.freeze({
    boundedConfidenceClass: MEDIUM_BOUNDED_SUPPORT,
    reasons: Object.freeze(reasons),
  });
}

module.exports = Object.freeze({
  classifyBoundedConfidence,
});
