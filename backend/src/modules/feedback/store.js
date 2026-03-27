'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const env = require('../../config/env');

let database;

function openFeedbackDatabase() {
  if (database) {
    return database;
  }

  fs.mkdirSync(path.dirname(env.feedbackDbPath), { recursive: true });
  database = new DatabaseSync(env.feedbackDbPath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS feedback_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      raw_query TEXT NOT NULL,
      normalized_query TEXT NOT NULL,
      response_type TEXT NOT NULL,
      feedback_type TEXT NOT NULL,
      resolved_concept_id TEXT,
      candidate_concept_ids_json TEXT NOT NULL,
      suggestion_concept_ids_json TEXT NOT NULL,
      contract_version TEXT NOT NULL,
      normalizer_version TEXT NOT NULL,
      matcher_version TEXT NOT NULL,
      concept_set_version TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  return database;
}

function insertFeedbackEvent(eventRecord) {
  const db = openFeedbackDatabase();
  const statement = db.prepare(`
    INSERT INTO feedback_events (
      session_id,
      raw_query,
      normalized_query,
      response_type,
      feedback_type,
      resolved_concept_id,
      candidate_concept_ids_json,
      suggestion_concept_ids_json,
      contract_version,
      normalizer_version,
      matcher_version,
      concept_set_version,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = statement.run(
    eventRecord.sessionId,
    eventRecord.rawQuery,
    eventRecord.normalizedQuery,
    eventRecord.responseType,
    eventRecord.feedbackType,
    eventRecord.resolvedConceptId,
    JSON.stringify(eventRecord.candidateConceptIds),
    JSON.stringify(eventRecord.suggestionConceptIds),
    eventRecord.contractVersion,
    eventRecord.normalizerVersion,
    eventRecord.matcherVersion,
    eventRecord.conceptSetVersion,
    eventRecord.createdAt,
  );

  return Number(result.lastInsertRowid);
}

function listFeedbackEvents() {
  const db = openFeedbackDatabase();
  const statement = db.prepare(`
    SELECT
      id,
      session_id,
      raw_query,
      normalized_query,
      response_type,
      feedback_type,
      resolved_concept_id,
      candidate_concept_ids_json,
      suggestion_concept_ids_json,
      contract_version,
      normalizer_version,
      matcher_version,
      concept_set_version,
      created_at
    FROM feedback_events
    ORDER BY id ASC
  `);

  return statement.all().map((row) => ({
    id: Number(row.id),
    sessionId: row.session_id,
    rawQuery: row.raw_query,
    normalizedQuery: row.normalized_query,
    responseType: row.response_type,
    feedbackType: row.feedback_type,
    resolvedConceptId: row.resolved_concept_id,
    candidateConceptIds: JSON.parse(row.candidate_concept_ids_json),
    suggestionConceptIds: JSON.parse(row.suggestion_concept_ids_json),
    contractVersion: row.contract_version,
    normalizerVersion: row.normalizer_version,
    matcherVersion: row.matcher_version,
    conceptSetVersion: row.concept_set_version,
    createdAt: row.created_at,
  }));
}

function closeFeedbackDatabase() {
  if (!database) {
    return;
  }

  database.close();
  database = undefined;
}

module.exports = {
  closeFeedbackDatabase,
  insertFeedbackEvent,
  listFeedbackEvents,
  openFeedbackDatabase,
};

