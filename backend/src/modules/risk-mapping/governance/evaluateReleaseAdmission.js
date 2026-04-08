'use strict';

const {
  GOVERNANCE_RELEASE_ADMITTED,
  GOVERNANCE_RELEASE_FROZEN,
  GOVERNANCE_RELEASE_REJECTED,
  GOVERNANCE_STRUCTURAL_VALIDATION_FAILED,
  GOVERNANCE_REPLAY_VALIDATION_FAILED,
  GOVERNANCE_COMPATIBILITY_REVIEW_REQUIRED,
} = require('../constants/rmgReasonCodes');
const { freezePlainObject } = require('../utils/freezePlainObject');

/**
 * @param {{
 *   validationPassed: boolean,
 *   replayPassed: boolean,
 *   compatibilityPassed: boolean,
 * }} input
 * @returns {{
 *   decision: 'admit' | 'freeze' | 'reject',
 *   reasonCode: string,
 *   reason: string,
 * }}
 */
function evaluateReleaseAdmission(input) {
  if (!input.validationPassed) {
    return freezePlainObject({
      decision: 'reject',
      reasonCode: GOVERNANCE_STRUCTURAL_VALIDATION_FAILED,
      reason: 'Structural validation failed for the candidate release.',
    });
  }

  if (input.replayPassed && input.compatibilityPassed) {
    return freezePlainObject({
      decision: 'admit',
      reasonCode: GOVERNANCE_RELEASE_ADMITTED,
      reason: 'The candidate release passed structural validation, replay validation, and compatibility checks.',
    });
  }

  if (!input.replayPassed) {
    return freezePlainObject({
      decision: 'freeze',
      reasonCode: GOVERNANCE_REPLAY_VALIDATION_FAILED,
      reason: 'Replay validation requires review before admission.',
    });
  }

  return freezePlainObject({
    decision: 'freeze',
    reasonCode: GOVERNANCE_COMPATIBILITY_REVIEW_REQUIRED,
    reason: 'Compatibility review is required before admission.',
  });
}

module.exports = Object.freeze({
  evaluateReleaseAdmission,
  GOVERNANCE_RELEASE_ADMITTED,
  GOVERNANCE_RELEASE_FROZEN,
  GOVERNANCE_RELEASE_REJECTED,
});
