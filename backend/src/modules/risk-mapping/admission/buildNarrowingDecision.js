'use strict';

const { PARTIAL_EVIDENCE_SUPPORT, BROAD_COLLAPSE_FRAMING } = require('../constants/rmgReasonCodes');

function freezeDecision(decision) {
  return Object.freeze({
    status: decision.status,
    reasonCode: decision.reasonCode,
    reason: decision.reason,
    admittedScopes: Object.freeze([...decision.admittedScopes]),
    narrowedFromScopes: Object.freeze([...decision.narrowedFromScopes]),
    refusedScopes: Object.freeze([...decision.refusedScopes]),
    diagnostics: Object.freeze({
      hasBroadCollapseLanguage: decision.diagnostics.hasBroadCollapseLanguage,
      hasUnsupportedFraming: decision.diagnostics.hasUnsupportedFraming,
      supportedNodeIds: Object.freeze([...decision.diagnostics.supportedNodeIds]),
      unsupportedNodeIds: Object.freeze([...decision.diagnostics.unsupportedNodeIds]),
      supportedThreatIds: Object.freeze([...decision.diagnostics.supportedThreatIds]),
      unsupportedThreatIds: Object.freeze([...decision.diagnostics.unsupportedThreatIds]),
    }),
  });
}

/**
 * @param {{
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
 *   hasBroadCollapseLanguage?: boolean,
 * }} input
 * @returns {{
 *   status: 'narrowed',
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
function buildNarrowingDecision(input) {
  const reasonCode = input.hasBroadCollapseLanguage
    ? BROAD_COLLAPSE_FRAMING
    : PARTIAL_EVIDENCE_SUPPORT;

  const reason = input.hasBroadCollapseLanguage
    ? 'Broad collapse framing was narrowed to the supported structural scope.'
    : 'Only part of the requested scope has authored support.';

  return freezeDecision({
    status: 'narrowed',
    reasonCode,
    reason,
    admittedScopes: input.admittedScopes,
    narrowedFromScopes: input.narrowedFromScopes,
    refusedScopes: input.refusedScopes,
    diagnostics: input.diagnostics,
  });
}

module.exports = Object.freeze({
  buildNarrowingDecision,
});
