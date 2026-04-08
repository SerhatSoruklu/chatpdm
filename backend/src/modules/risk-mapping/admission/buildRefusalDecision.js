'use strict';

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
 * }} input
 * @returns {{
 *   status: 'refused',
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
function buildRefusalDecision(input) {
  return freezeDecision({
    status: 'refused',
    reasonCode: input.reasonCode,
    reason: input.reason,
    admittedScopes: input.admittedScopes,
    narrowedFromScopes: input.narrowedFromScopes,
    refusedScopes: input.refusedScopes,
    diagnostics: input.diagnostics,
  });
}

module.exports = Object.freeze({
  buildRefusalDecision,
});

