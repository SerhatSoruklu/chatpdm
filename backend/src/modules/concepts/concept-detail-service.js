'use strict';

const { EMPTY_NORMALIZED_QUERY } = require('./constants');
const { getConceptById } = require('./concept-loader');
const { getConceptRuntimeGovernanceState } = require('./concept-validation-state-loader');
const { getConceptReviewState } = require('./concept-review-state-loader');
const { deriveRoutingText, normalizeQuery } = require('./normalizer');
const { getRejectedConceptRecord } = require('./rejection-registry-loader');

function buildRejectionPayload(rejectionRecord) {
  if (!rejectionRecord) {
    return null;
  }

  return {
    status: rejectionRecord.status,
    decisionType: rejectionRecord.decisionType,
    finality: rejectionRecord.finality,
  };
}

function buildConceptDetail(conceptId) {
  if (typeof conceptId !== 'string' || conceptId.trim() === '') {
    throw new TypeError('Expected conceptId to be a non-empty string.');
  }

  const normalizedConceptId = normalizeQuery(conceptId);
  const routingConceptId = deriveRoutingText(normalizedConceptId);

  if (routingConceptId === EMPTY_NORMALIZED_QUERY) {
    throw new TypeError('Expected conceptId to normalize to a non-empty concept key.');
  }

  const concept = getConceptById(routingConceptId);
  const reviewState = getConceptReviewState(routingConceptId);
  const rejectionRecord = getRejectedConceptRecord(routingConceptId);

  if (!concept && !reviewState && !rejectionRecord) {
    return null;
  }

  const detail = {
    conceptId: routingConceptId,
    title: concept?.title ?? null,
    shortDefinition: concept?.shortDefinition ?? null,
    coreMeaning: concept?.coreMeaning ?? null,
    fullDefinition: concept?.fullDefinition ?? null,
    governanceState: getConceptRuntimeGovernanceState(routingConceptId),
    reviewState,
    rejection: buildRejectionPayload(rejectionRecord),
  };

  if (Object.hasOwn(concept ?? {}, 'resolutionStatus')) {
    detail.resolutionStatus = concept.resolutionStatus;
  }

  return detail;
}

module.exports = {
  buildConceptDetail,
};
