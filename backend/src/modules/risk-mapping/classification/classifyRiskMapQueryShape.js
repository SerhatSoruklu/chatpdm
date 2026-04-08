'use strict';

const { ORGANIZATION_RISK } = require('../constants/rmgDomains');
const { DECLINE_RISK, DISRUPTION_RISK, FRAGILITY_RISK } = require('../constants/rmgScenarioTypes');

const BROAD_COLLAPSE_PHRASES = Object.freeze([
  'collapse',
  'downfall',
  'implode',
  'implosion',
  'crash',
  'break down',
  'fall apart',
  'fail',
  'failure',
]);

const UNSUPPORTED_FRAMING_PHRASES = Object.freeze([
  'predict',
  'prediction',
  'forecast',
  'forecasting',
  'future',
  'what will happen',
  'will happen',
  'likely',
  'probability',
  'chance',
  'odds',
]);

function hasPhrase(text, phrases) {
  return phrases.some((phrase) => text.includes(phrase));
}

function buildDetectionText(query) {
  return [
    query.entity,
    query.timeHorizon,
    query.scenarioType,
    query.domain,
    ...query.scope,
    query.evidenceSetVersion,
  ]
    .join(' ')
    .toLowerCase();
}

/**
 * @typedef {import('../contracts/riskMapQueryContract').RiskMapQuery} RiskMapQuery
 */

/**
 * @param {RiskMapQuery} query
 * @returns {{
 *   isRiskMapQuery: boolean,
 *   detectedScenarioType: string | null,
 *   detectedDomain: string | null,
 *   flags: {
 *     hasBroadCollapseLanguage: boolean,
 *     hasUnsupportedFraming: boolean,
 *   },
 * }}
 */
function classifyRiskMapQueryShape(query) {
  const normalizedText = buildDetectionText(query);
  const detectedDomain = query.domain === ORGANIZATION_RISK ? ORGANIZATION_RISK : null;

  let detectedScenarioType = null;
  if ([DECLINE_RISK, DISRUPTION_RISK, FRAGILITY_RISK].includes(query.scenarioType)) {
    detectedScenarioType = query.scenarioType;
  }

  const flags = Object.freeze({
    hasBroadCollapseLanguage: hasPhrase(normalizedText, BROAD_COLLAPSE_PHRASES),
    hasUnsupportedFraming: hasPhrase(normalizedText, UNSUPPORTED_FRAMING_PHRASES),
  });

  return Object.freeze({
    isRiskMapQuery: Boolean(
      detectedDomain ||
        detectedScenarioType ||
        flags.hasBroadCollapseLanguage ||
        flags.hasUnsupportedFraming,
    ),
    detectedScenarioType,
    detectedDomain,
    flags,
  });
}

module.exports = Object.freeze({
  classifyRiskMapQueryShape,
});
