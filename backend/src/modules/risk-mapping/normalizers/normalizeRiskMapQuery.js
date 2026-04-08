'use strict';

const { validateRiskMapQueryContract } = require('../contracts/riskMapQueryContract');

function normalizeString(value) {
  return value.trim();
}

function normalizeLowercaseString(value) {
  return value.trim().toLowerCase();
}

function normalizeScopeList(scope) {
  return Object.freeze(
    [...new Set(scope.map((entry) => normalizeLowercaseString(entry)))].sort(),
  );
}

/**
 * @param {unknown} value
 * @returns {import('../contracts/riskMapQueryContract').RiskMapQuery}
 */
function normalizeRiskMapQuery(value) {
  const validation = validateRiskMapQueryContract(value);

  if (!validation.valid) {
    throw new TypeError(`Invalid RiskMapQuery contract: ${validation.errors.join(' | ')}`);
  }

  const query = /** @type {Record<string, string | string[]>} */ (value);

  return Object.freeze({
    entity: normalizeLowercaseString(query.entity),
    timeHorizon: normalizeString(query.timeHorizon),
    scenarioType: normalizeLowercaseString(query.scenarioType),
    domain: normalizeLowercaseString(query.domain),
    scope: normalizeScopeList(/** @type {string[]} */ (query.scope)),
    evidenceSetVersion: normalizeString(query.evidenceSetVersion),
  });
}

module.exports = Object.freeze({
  normalizeRiskMapQuery,
});

