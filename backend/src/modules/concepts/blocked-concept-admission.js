'use strict';

const { normalizeQuery } = require('./normalizer');
const {
  OVERRIDABLE_CONCEPT_ID,
  applyOverride,
} = require('./concept-unlock-override');

function buildBlockedConceptAdmissionResponse(conceptId) {
  return Object.freeze({
    status: 'concept_blocked',
    reason: 'override_required',
    conceptId,
  });
}

function evaluateBlockedConceptAdmission(conceptId, override = null) {
  if (typeof conceptId !== 'string' || conceptId.trim() === '') {
    throw new TypeError('Expected conceptId to be a non-empty string.');
  }

  const normalizedConceptId = normalizeQuery(conceptId);

  if (normalizedConceptId !== OVERRIDABLE_CONCEPT_ID) {
    throw new TypeError(
      `Blocked concept admission override is only supported for "${OVERRIDABLE_CONCEPT_ID}".`,
    );
  }

  if (override === null || override === undefined) {
    return buildBlockedConceptAdmissionResponse(OVERRIDABLE_CONCEPT_ID);
  }

  return applyOverride(override);
}

module.exports = {
  evaluateBlockedConceptAdmission,
};
