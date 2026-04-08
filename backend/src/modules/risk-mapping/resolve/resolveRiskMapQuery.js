'use strict';

const { buildRiskMapPipeline } = require('./buildRiskMapPipeline');

/**
 * @param {unknown} input
 * @returns {import('../contracts/riskMapOutputContract').RiskMapOutput}
 */
function resolveRiskMapQuery(input) {
  return buildRiskMapPipeline(input).output;
}

module.exports = Object.freeze({
  resolveRiskMapQuery,
});
