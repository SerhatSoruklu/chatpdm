'use strict';

const { freezePlainObject } = require('../utils/freezePlainObject');
const { validateCompactOutputFormats } = require('../utils/validateCompactOutputFormats');
const { buildConfidenceExplanation } = require('../confidence/buildConfidenceExplanation');

function hasBoundedDiagnostics(diagnostics) {
  if (!diagnostics || typeof diagnostics !== 'object' || Array.isArray(diagnostics)) {
    return false;
  }

  const allowedKeys = [
    'hasBroadCollapseLanguage',
    'hasUnsupportedFraming',
    'admittedScopes',
    'narrowedFromScopes',
    'refusedScopes',
    'supportedNodeIds',
    'unsupportedNodeIds',
    'supportedThreatIds',
    'unsupportedThreatIds',
  ];

  const keys = Object.keys(diagnostics);
  return keys.length === allowedKeys.length && allowedKeys.every((key) => Object.prototype.hasOwnProperty.call(diagnostics, key));
}

/**
 * @param {{
 *   normalizedQuery: { domain: string, entity: string, timeHorizon: string, scenarioType: string, scope: readonly string[], evidenceSetVersion: string },
 *   output: Record<string, unknown>,
 *   explanation: Record<string, unknown>,
 *   framing: Record<string, unknown>,
 *   confidenceAssessment: { boundedConfidenceClass: string, reasons: readonly string[] },
 *   registryHash: { domainId: string, entity: string, evidenceSetVersion: string, hash: string },
 * }} input
 * @returns {{
 *   input: Readonly<Record<string, unknown>>,
 *   output: Readonly<Record<string, unknown>>,
 *   explanation: Readonly<Record<string, unknown>>,
 *   framing: Readonly<Record<string, unknown>>,
 *   confidence: Readonly<Record<string, unknown>>,
 *   provenance: Readonly<Record<string, unknown>>,
 *   invariants: Readonly<Record<string, unknown>>,
 * }}
 */
function buildRiskMapAuditReport(input) {
  const compactValidation = validateCompactOutputFormats(input.output);

  return freezePlainObject({
    input: freezePlainObject({ ...input.normalizedQuery }),
    output: input.output,
    explanation: input.explanation,
    framing: freezePlainObject({
      confidenceMeaning: 'Bounded support confidence within authored constraints.',
      pathMeaning: 'Supported structural path within current admitted scope.',
      refusalMeaning: 'Outside current authored support boundary.',
    }),
    confidence: buildConfidenceExplanation(input.confidenceAssessment),
    provenance: freezePlainObject({
      domainId: input.registryHash.domainId,
      entity: input.registryHash.entity,
      evidenceSetVersion: input.registryHash.evidenceSetVersion,
      registryHash: input.registryHash.hash,
    }),
    invariants: freezePlainObject({
      outputArraysSorted: compactValidation.valid,
      outputArraysUnique: compactValidation.valid,
      diagnosticsBounded: hasBoundedDiagnostics(input.output.diagnostics),
      compactFormatsValid: compactValidation.valid,
    }),
  });
}

module.exports = Object.freeze({
  buildRiskMapAuditReport,
});
