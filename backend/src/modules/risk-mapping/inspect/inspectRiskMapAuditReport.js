'use strict';

const { buildRiskMapPipeline } = require('../resolve/buildRiskMapPipeline');
const { buildRiskMapExplanation } = require('../explain/buildRiskMapExplanation');
const { buildRiskMapAuditReport } = require('./buildRiskMapAuditReport');
const { buildRegistryHash } = require('../utils/buildRegistryHash');

/**
 * @param {unknown} input
 * @returns {{
 *   input: Record<string, unknown>,
 *   output: Record<string, unknown>,
 *   explanation: Record<string, unknown>,
 *   confidence: Record<string, unknown>,
 *   provenance: Record<string, unknown>,
 *   invariants: Record<string, unknown>,
 * }}
 */
function inspectRiskMapAuditReport(input) {
  const pipeline = buildRiskMapPipeline(input);
  const explanation = buildRiskMapExplanation({
    normalizedQuery: pipeline.normalizedQuery,
    admissibilityDecision: pipeline.admissibilityDecision,
    evidenceCoverageReport: pipeline.evidenceCoverageReport,
    supportedPaths: pipeline.supportedPaths,
    unsupportedBridgeLedger: pipeline.unsupportedBridgeLedger,
    assumptionsLedger: pipeline.assumptionsLedger,
    unknownsLedger: pipeline.unknownsLedger,
    falsifierLedger: pipeline.falsifierLedger,
    confidenceAssessment: pipeline.confidenceAssessment,
  });
  const registryHash = buildRegistryHash({
    domainId: pipeline.normalizedQuery.domain,
    entity: pipeline.normalizedQuery.entity,
    evidenceSetVersion: pipeline.normalizedQuery.evidenceSetVersion,
  });

  return buildRiskMapAuditReport({
    normalizedQuery: pipeline.normalizedQuery,
    output: pipeline.output,
    explanation,
    confidenceAssessment: pipeline.confidenceAssessment,
    registryHash,
  });
}

module.exports = Object.freeze({
  inspectRiskMapAuditReport,
});
