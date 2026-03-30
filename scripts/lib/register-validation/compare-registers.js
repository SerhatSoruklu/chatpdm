'use strict';

const { normalizeText, stripKnownPrefixes } = require('./normalize');
const { REASON_CODES } = require('./reason-codes');
const { collectTextStats, tokenizeWords } = require('./text-stats');
const { ZONE_NAMES, validateStructure } = require('./validate-structure');

const PAIRWISE_ZONE_THRESHOLDS = Object.freeze({
  shortDefinition: 0.82,
  coreMeaning: 0.86,
  fullDefinition: 0.90,
});

const PAIRWISE_ZONE_WARNING_THRESHOLDS = Object.freeze({
  shortDefinition: 0.72,
  coreMeaning: 0.76,
  fullDefinition: 0.80,
});

const REGISTER_PAIRS = Object.freeze([
  ['standard', 'simplified'],
  ['standard', 'formal'],
  ['simplified', 'formal'],
]);

function pushUniqueCode(target, code) {
  if (!target.includes(code)) {
    target.push(code);
  }
}

function getZoneThreshold(zoneName) {
  if (!Object.hasOwn(PAIRWISE_ZONE_THRESHOLDS, zoneName)) {
    throw new Error(`Unsupported register-validation zone "${zoneName}".`);
  }

  return PAIRWISE_ZONE_THRESHOLDS[zoneName];
}

function buildTokenSet(text) {
  return new Set(tokenizeWords(normalizeText(text)));
}

function computeJaccardSimilarity(leftText, rightText) {
  const leftTokens = buildTokenSet(leftText);
  const rightTokens = buildTokenSet(rightText);
  const union = new Set([...leftTokens, ...rightTokens]);

  if (union.size === 0) {
    return 1;
  }

  let intersectionCount = 0;

  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      intersectionCount += 1;
    }
  });

  return intersectionCount / union.size;
}

function getZoneWarningThreshold(zoneName) {
  if (!Object.hasOwn(PAIRWISE_ZONE_WARNING_THRESHOLDS, zoneName)) {
    throw new Error(`Unsupported register-validation warning zone "${zoneName}".`);
  }

  return PAIRWISE_ZONE_WARNING_THRESHOLDS[zoneName];
}

function compareZones(leftText, rightText, zoneName) {
  const threshold = getZoneThreshold(zoneName);
  const warningThreshold = getZoneWarningThreshold(zoneName);
  const leftValue = typeof leftText === 'string' ? leftText : '';
  const rightValue = typeof rightText === 'string' ? rightText : '';
  const errors = [];
  const warnings = [];
  const similarityScore = computeJaccardSimilarity(leftValue, rightValue);
  const strippedLeft = stripKnownPrefixes(leftValue);
  const strippedRight = stripKnownPrefixes(rightValue);
  const leftPrefixRemoved = strippedLeft !== leftValue.trimStart();
  const rightPrefixRemoved = strippedRight !== rightValue.trimStart();
  const leftStats = collectTextStats(leftValue);
  const rightStats = collectTextStats(rightValue);
  const averageSentenceLengthDelta = Math.abs(
    leftStats.averageSentenceLength - rightStats.averageSentenceLength,
  );
  const sentenceCountDelta = Math.abs(leftStats.sentenceCount - rightStats.sentenceCount);

  if (leftValue === rightValue) {
    pushUniqueCode(errors, REASON_CODES.EXACT_EQUAL);
  }

  if (normalizeText(leftValue) === normalizeText(rightValue)) {
    pushUniqueCode(errors, REASON_CODES.NORMALIZED_EQUAL);
  }

  if (
    (leftPrefixRemoved || rightPrefixRemoved)
    && normalizeText(strippedLeft) === normalizeText(strippedRight)
  ) {
    pushUniqueCode(errors, REASON_CODES.PREFIX_ONLY_MUTATION);
  }

  if (similarityScore > threshold) {
    pushUniqueCode(errors, REASON_CODES.TOO_CLOSE_TOKEN_OVERLAP);
  }

  if (
    similarityScore > warningThreshold
    && similarityScore <= threshold
  ) {
    pushUniqueCode(warnings, REASON_CODES.BORDERLINE_TOKEN_OVERLAP);
  }

  if (
    leftStats.sentenceCount === rightStats.sentenceCount
    && averageSentenceLengthDelta <= 2
    && similarityScore > 0.80
  ) {
    pushUniqueCode(errors, REASON_CODES.TOO_CLOSE_SENTENCE_SHAPE);
  }

  return {
    zone: zoneName,
    passed: errors.length === 0,
    errors,
    warnings,
    similarityScore,
    threshold,
    warningThreshold,
    leftStats,
    rightStats,
    deltas: {
      sentenceCountDelta,
      averageSentenceLengthDelta,
      longWordRatioDelta: Math.abs(leftStats.longWordRatio - rightStats.longWordRatio),
      abstractNounDensityDelta: Math.abs(leftStats.abstractNounDensity - rightStats.abstractNounDensity),
    },
  };
}

function zoneIsComparable(structureReport, registerName, zoneName) {
  const registerReport = structureReport.registers[registerName];

  if (!registerReport?.present) {
    return false;
  }

  const zoneReport = registerReport.zones?.[zoneName];
  return Boolean(zoneReport?.present && zoneReport.passed);
}

function pairKey(leftRegister, rightRegister) {
  return `${leftRegister}__${rightRegister}`;
}

function compareConceptRegisters(concept) {
  const structureReport = validateStructure(concept);
  const comparisons = [];
  const pairs = {};

  REGISTER_PAIRS.forEach(([leftRegister, rightRegister]) => {
    const pairReport = {
      left: leftRegister,
      right: rightRegister,
      passed: true,
      warnings: [],
      zones: {},
    };

    ZONE_NAMES.forEach((zoneName) => {
      if (
        !zoneIsComparable(structureReport, leftRegister, zoneName)
        || !zoneIsComparable(structureReport, rightRegister, zoneName)
      ) {
        return;
      }

      const result = compareZones(
        concept.registers[leftRegister][zoneName],
        concept.registers[rightRegister][zoneName],
        zoneName,
      );

      pairReport.zones[zoneName] = result;
      comparisons.push({
        left: leftRegister,
        right: rightRegister,
        ...result,
      });

      if (!result.passed) {
        pairReport.passed = false;
      }

      pairReport.warnings.push(...result.warnings);
    });

    pairReport.warnings = [...new Set(pairReport.warnings)];

    pairs[pairKey(leftRegister, rightRegister)] = pairReport;
  });

  return {
    conceptId: typeof concept?.conceptId === 'string' ? concept.conceptId : null,
    passed: structureReport.passed && comparisons.every((result) => result.passed),
    structure: structureReport,
    comparisons,
    pairs,
  };
}

module.exports = {
  PAIRWISE_ZONE_THRESHOLDS,
  compareConceptRegisters,
  compareZones,
  computeJaccardSimilarity,
  REGISTER_PAIRS,
};
