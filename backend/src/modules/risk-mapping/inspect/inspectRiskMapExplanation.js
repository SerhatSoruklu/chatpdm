'use strict';

const { buildRiskMapPipeline } = require('../resolve/buildRiskMapPipeline');
const { buildRiskMapExplanation } = require('../explain/buildRiskMapExplanation');
const { freezePlainObject } = require('../utils/freezePlainObject');

/**
 * @param {unknown} input
 * @returns {{
 *   input: Record<string, unknown>,
 *   output: Record<string, unknown>,
 *   explanation: Record<string, unknown>,
 * }}
 */
function inspectRiskMapExplanation(input) {
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

  return freezePlainObject({
    input: pipeline.normalizedQuery,
    output: pipeline.output,
    explanation,
  });
}

module.exports = Object.freeze({
  inspectRiskMapExplanation,
});
