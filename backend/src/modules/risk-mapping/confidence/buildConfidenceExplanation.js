'use strict';

const { LOW_BOUNDED_SUPPORT, MEDIUM_BOUNDED_SUPPORT, HIGH_BOUNDED_SUPPORT } = require('../constants/rmgConfidenceClasses');
const { stableUniqueStrings } = require('../utils/stableUniqueStrings');

function buildExplanationSentence(boundedConfidenceClass, reasonIds) {
  if (boundedConfidenceClass === HIGH_BOUNDED_SUPPORT) {
    return 'Bounded support confidence is complete within the admitted scope.';
  }

  if (boundedConfidenceClass === MEDIUM_BOUNDED_SUPPORT) {
    if (reasonIds.includes('narrowed_due_to_broad_collapse')) {
      return 'Bounded support confidence was narrowed and remains capped by the admitted scope.';
    }

    return 'Bounded support confidence exists, but current structural limits keep the class capped.';
  }

  if (boundedConfidenceClass === LOW_BOUNDED_SUPPORT) {
    return 'Bounded support confidence is insufficient for a higher class.';
  }

  return 'Bounded support class could not be derived.';
}

/**
 * @param {{ boundedConfidenceClass: string, reasons: readonly string[] }} input
 * @returns {{
 *   boundedConfidenceClass: string,
 *   reasonIds: readonly string[],
 *   explanation: string,
 * }}
 */
function buildConfidenceExplanation(input) {
  const reasonIds = stableUniqueStrings(input.reasons);

  return Object.freeze({
    boundedConfidenceClass: input.boundedConfidenceClass,
    reasonIds,
    explanation: buildExplanationSentence(input.boundedConfidenceClass, reasonIds),
  });
}

module.exports = Object.freeze({
  buildConfidenceExplanation,
});
