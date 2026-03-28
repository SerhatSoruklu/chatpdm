'use strict';

const FeedbackControlAudit = require('./feedback-control-audit.model');
const FeedbackEvent = require('./feedback-event.model');
const {
  isHashedFeedbackSessionIdForAudit,
  isMinimizedNormalizedQuery,
  isMinimizedRawQuery,
} = require('./lifecycle-contract');
const ALLOWED_FEEDBACK_CONTROL_AUDIT_KEYS = new Set([
  'actionType',
  'sessionIdHash',
  'requestedAt',
  'affectedCount',
  'outcome',
  'context',
]);

function assertPersistableFeedbackEventRecord(eventRecord) {
  if (!eventRecord || typeof eventRecord !== 'object' || Array.isArray(eventRecord)) {
    throw new TypeError('Feedback event record must be an object.');
  }

  if (!isMinimizedRawQuery(eventRecord.rawQuery)) {
    throw new TypeError('Feedback event rawQuery must be minimized before persistence.');
  }

  if (!isMinimizedNormalizedQuery(eventRecord.normalizedQuery)) {
    throw new TypeError('Feedback event normalizedQuery must be minimized before persistence.');
  }

  if (!(eventRecord.expiresAt instanceof Date) || Number.isNaN(eventRecord.expiresAt.getTime())) {
    throw new TypeError('Feedback event expiresAt retention boundary must be a valid Date.');
  }

  const createdAtDate = new Date(eventRecord.createdAt);

  if (Number.isNaN(createdAtDate.getTime())) {
    throw new TypeError('Feedback event createdAt must be a valid ISO-8601 timestamp.');
  }

  if (eventRecord.expiresAt.getTime() <= createdAtDate.getTime()) {
    throw new TypeError('Feedback event expiresAt must be later than createdAt.');
  }
}

async function insertFeedbackEvent(eventRecord) {
  assertPersistableFeedbackEventRecord(eventRecord);
  await FeedbackEvent.init();

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
    expiresAt: eventRecord.expiresAt,
  });

  return String(created._id);
}

async function listFeedbackEvents() {
  const rows = await FeedbackEvent.find({})
    .sort({ _id: 1 })
    .lean()
    .exec();

  return rows.map(mapFeedbackEventRow);
}

async function listFeedbackEventsBySessionId(sessionId) {
  const rows = await FeedbackEvent.find({ sessionId })
    .sort({ _id: 1 })
    .lean()
    .exec();

  return rows.map(mapFeedbackEventRow);
}

async function deleteFeedbackEventsBySessionId(sessionId) {
  const { deletedCount } = await FeedbackEvent.deleteMany({ sessionId });
  return deletedCount ?? 0;
}

async function clearFeedbackEvents() {
  await FeedbackEvent.deleteMany({});
}

function assertPersistableFeedbackControlAudit(auditRecord) {
  if (!auditRecord || typeof auditRecord !== 'object' || Array.isArray(auditRecord)) {
    throw new TypeError('Feedback control audit record must be an object.');
  }

  const unexpectedKeys = Object.keys(auditRecord)
    .filter((key) => !ALLOWED_FEEDBACK_CONTROL_AUDIT_KEYS.has(key))
    .sort();

  if (unexpectedKeys.length > 0) {
    throw new TypeError(
      `Feedback control audit records must not include extra fields: ${unexpectedKeys.join(', ')}.`,
    );
  }

  if (!['export', 'delete'].includes(auditRecord.actionType)) {
    throw new TypeError('Feedback control audit actionType must be export or delete.');
  }

  if (!isHashedFeedbackSessionIdForAudit(auditRecord.sessionIdHash)) {
    throw new TypeError('Feedback control audit sessionIdHash must be minimized before persistence.');
  }

  if (!(auditRecord.requestedAt instanceof Date) || Number.isNaN(auditRecord.requestedAt.getTime())) {
    throw new TypeError('Feedback control audit requestedAt must be a valid Date.');
  }

  if (!Number.isInteger(auditRecord.affectedCount) || auditRecord.affectedCount < 0) {
    throw new TypeError('Feedback control audit affectedCount must be a non-negative integer.');
  }

  if (!['exported', 'deleted', 'no_records'].includes(auditRecord.outcome)) {
    throw new TypeError('Feedback control audit outcome must be exported, deleted, or no_records.');
  }

  if (typeof auditRecord.context !== 'string' || auditRecord.context.trim().length === 0) {
    throw new TypeError('Feedback control audit context must be a non-empty string.');
  }
}

async function insertFeedbackControlAudit(auditRecord) {
  assertPersistableFeedbackControlAudit(auditRecord);

  const created = await FeedbackControlAudit.create({
    actionType: auditRecord.actionType,
    sessionIdHash: auditRecord.sessionIdHash,
    requestedAt: auditRecord.requestedAt,
    affectedCount: auditRecord.affectedCount,
    outcome: auditRecord.outcome,
    context: auditRecord.context,
  });

  return String(created._id);
}

async function listFeedbackControlAudits() {
  const rows = await FeedbackControlAudit.find({})
    .sort({ _id: 1 })
    .lean()
    .exec();

  return rows.map((row) => ({
    id: String(row._id),
    actionType: row.actionType,
    sessionIdHash: row.sessionIdHash,
    requestedAt: row.requestedAt instanceof Date ? row.requestedAt.toISOString() : row.requestedAt,
    affectedCount: row.affectedCount,
    outcome: row.outcome,
    context: row.context,
  }));
}

async function clearFeedbackControlAudits() {
  await FeedbackControlAudit.deleteMany({});
}

function mapFeedbackEventRow(row) {
  return {
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
    expiresAt: row.expiresAt instanceof Date ? row.expiresAt.toISOString() : row.expiresAt,
  };
}

module.exports = {
  assertPersistableFeedbackEventRecord,
  assertPersistableFeedbackControlAudit,
  clearFeedbackControlAudits,
  clearFeedbackEvents,
  deleteFeedbackEventsBySessionId,
  insertFeedbackEvent,
  insertFeedbackControlAudit,
  listFeedbackControlAudits,
  listFeedbackEvents,
  listFeedbackEventsBySessionId,
};
