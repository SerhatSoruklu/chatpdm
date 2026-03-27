'use strict';

const FeedbackEvent = require('./feedback-event.model');

async function insertFeedbackEvent(eventRecord) {
  const created = await FeedbackEvent.create({
    sessionId: eventRecord.sessionId,
    rawQuery: eventRecord.rawQuery,
    normalizedQuery: eventRecord.normalizedQuery,
    responseType: eventRecord.responseType,
    feedbackType: eventRecord.feedbackType,
    resolvedConceptId: eventRecord.resolvedConceptId,
    candidateConceptIds: eventRecord.candidateConceptIds,
    suggestionConceptIds: eventRecord.suggestionConceptIds,
    contractVersion: eventRecord.contractVersion,
    normalizerVersion: eventRecord.normalizerVersion,
    matcherVersion: eventRecord.matcherVersion,
    conceptSetVersion: eventRecord.conceptSetVersion,
    createdAt: eventRecord.createdAt,
  });

  return String(created._id);
}

async function listFeedbackEvents() {
  const rows = await FeedbackEvent.find({})
    .sort({ _id: 1 })
    .lean()
    .exec();

  return rows.map((row) => ({
    id: String(row._id),
    sessionId: row.sessionId,
    rawQuery: row.rawQuery,
    normalizedQuery: row.normalizedQuery,
    responseType: row.responseType,
    feedbackType: row.feedbackType,
    resolvedConceptId: row.resolvedConceptId,
    candidateConceptIds: row.candidateConceptIds,
    suggestionConceptIds: row.suggestionConceptIds,
    contractVersion: row.contractVersion,
    normalizerVersion: row.normalizerVersion,
    matcherVersion: row.matcherVersion,
    conceptSetVersion: row.conceptSetVersion,
    createdAt: row.createdAt,
  }));
}

async function clearFeedbackEvents() {
  await FeedbackEvent.deleteMany({});
}

module.exports = {
  clearFeedbackEvents,
  insertFeedbackEvent,
  listFeedbackEvents,
};
