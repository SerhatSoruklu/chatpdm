'use strict';

const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const { connectMongo, disconnectMongo } = require('../src/config/mongoose');
const {
  CONCEPT_SET_VERSION,
  CONTRACT_VERSION,
  MATCHER_VERSION,
  NORMALIZER_VERSION,
} = require('../src/modules/concepts/constants');
const FeedbackEvent = require('../src/modules/feedback/feedback-event.model');
const {
  buildFeedbackEventExpiresAt,
  getFeedbackEventLifecycleContract,
  hashFeedbackSessionIdForAudit,
  minimizeNormalizedQuery,
  minimizeRawQuery,
} = require('../src/modules/feedback/lifecycle-contract');
const {
  clearFeedbackControlAudits,
  clearFeedbackEvents,
  insertFeedbackControlAudit,
  insertFeedbackEvent,
  listFeedbackControlAudits,
  listFeedbackEvents,
} = require('../src/modules/feedback/store');

async function requestJson(method, url, payload) {
  const response = await fetch(url, {
    method,
    headers: payload ? {
      'content-type': 'application/json',
    } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

async function postJson(url, payload) {
  return requestJson('POST', url, payload);
}

async function getJson(url) {
  return requestJson('GET', url);
}

async function deleteJson(url) {
  return requestJson('DELETE', url);
}

async function main() {
  const mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await connectMongo(process.env.MONGODB_URI);

  const server = app.listen(0);

  await new Promise((resolve) => {
    server.once('listening', resolve);
  });

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const { ttlDays } = getFeedbackEventLifecycleContract();

  try {
    const conceptMatchReceipt = await postJson(`${baseUrl}/api/v1/feedback`, {
      sessionId: 'verify-session',
      rawQuery: 'authority',
      normalizedQuery: 'authority',
      responseType: 'concept_match',
      feedbackType: 'clear',
      resolvedConceptId: 'authority',
      contractVersion: CONTRACT_VERSION,
      normalizerVersion: NORMALIZER_VERSION,
      matcherVersion: MATCHER_VERSION,
      conceptSetVersion: CONCEPT_SET_VERSION,
    });

    assert.equal(conceptMatchReceipt.status, 201, 'concept_match feedback was not accepted.');
    process.stdout.write('PASS concept_match_feedback_submission\n');

    const ambiguousReceipt = await postJson(`${baseUrl}/api/v1/feedback`, {
      sessionId: 'verify-session',
      rawQuery: 'obligation',
      normalizedQuery: 'obligation',
      responseType: 'ambiguous_match',
      feedbackType: 'found_right_one',
      resolvedConceptId: 'duty',
      candidateConceptIds: ['duty', 'responsibility'],
      contractVersion: CONTRACT_VERSION,
      normalizerVersion: NORMALIZER_VERSION,
      matcherVersion: MATCHER_VERSION,
      conceptSetVersion: CONCEPT_SET_VERSION,
    });

    assert.equal(ambiguousReceipt.status, 201, 'ambiguous_match feedback was not accepted.');
    process.stdout.write('PASS ambiguous_match_feedback_submission\n');

    const noExactReceipt = await postJson(`${baseUrl}/api/v1/feedback`, {
      sessionId: 'verify-session',
      rawQuery: 'civic duty',
      normalizedQuery: 'civic duty',
      responseType: 'no_exact_match',
      feedbackType: 'should_exist',
      suggestionConceptIds: ['duty'],
      contractVersion: CONTRACT_VERSION,
      normalizerVersion: NORMALIZER_VERSION,
      matcherVersion: MATCHER_VERSION,
      conceptSetVersion: CONCEPT_SET_VERSION,
    });

    assert.equal(noExactReceipt.status, 201, 'no_exact_match feedback was not accepted.');
    process.stdout.write('PASS no_exact_match_feedback_submission\n');

    const invalidReceipt = await postJson(`${baseUrl}/api/v1/feedback`, {
      sessionId: 'verify-session',
      rawQuery: 'authority',
      normalizedQuery: 'authority',
      responseType: 'concept_match',
      feedbackType: 'expected',
      resolvedConceptId: 'authority',
      contractVersion: CONTRACT_VERSION,
      normalizerVersion: NORMALIZER_VERSION,
      matcherVersion: MATCHER_VERSION,
      conceptSetVersion: CONCEPT_SET_VERSION,
    });

    assert.equal(invalidReceipt.status, 400, 'invalid feedback value should be rejected.');
    process.stdout.write('PASS invalid_feedback_rejected\n');

    const events = await listFeedbackEvents();
    assert.equal(events.length, 3, 'feedback events were not stored in the database.');
    assert.deepEqual(
      events.map((event) => event.feedbackType),
      ['clear', 'found_right_one', 'should_exist'],
      'stored feedback types do not match the accepted submissions.',
    );
    assert.deepEqual(
      events.map((event) => ({
        contractVersion: event.contractVersion,
        normalizerVersion: event.normalizerVersion,
        matcherVersion: event.matcherVersion,
        conceptSetVersion: event.conceptSetVersion,
      })),
      [
        {
          contractVersion: CONTRACT_VERSION,
          normalizerVersion: NORMALIZER_VERSION,
          matcherVersion: MATCHER_VERSION,
          conceptSetVersion: CONCEPT_SET_VERSION,
        },
        {
          contractVersion: CONTRACT_VERSION,
          normalizerVersion: NORMALIZER_VERSION,
          matcherVersion: MATCHER_VERSION,
          conceptSetVersion: CONCEPT_SET_VERSION,
        },
        {
          contractVersion: CONTRACT_VERSION,
          normalizerVersion: NORMALIZER_VERSION,
          matcherVersion: MATCHER_VERSION,
          conceptSetVersion: CONCEPT_SET_VERSION,
        },
      ],
      'stored version fields do not match the current runtime contract.',
    );
    process.stdout.write('PASS feedback_events_stored\n');

    assert.deepEqual(
      events.map((event) => event.rawQuery),
      [
        minimizeRawQuery('authority'),
        minimizeRawQuery('obligation'),
        minimizeRawQuery('civic duty'),
      ],
      'stored feedback rawQuery values were not minimized before persistence.',
    );
    assert(events.every((event) => !['authority', 'obligation', 'civic duty'].includes(event.rawQuery)),
      'stored feedback rawQuery values must not keep the original submitted query text.');
    process.stdout.write('PASS feedback_raw_query_minimized\n');

    assert.deepEqual(
      events.map((event) => event.normalizedQuery),
      [
        minimizeNormalizedQuery('authority'),
        minimizeNormalizedQuery('obligation'),
        minimizeNormalizedQuery('civic duty'),
      ],
      'stored feedback normalizedQuery values were not minimized before persistence.',
    );
    assert(events.every((event) => !['authority', 'obligation', 'civic duty'].includes(event.normalizedQuery)),
      'stored feedback normalizedQuery values must not keep the submitted normalized query text.');
    process.stdout.write('PASS feedback_normalized_query_minimized\n');

    const firstEvent = events[0];
    assert.equal(
      firstEvent.expiresAt,
      buildFeedbackEventExpiresAt(firstEvent.createdAt).toISOString(),
      'stored feedback event does not carry the expected retention boundary.',
    );
    process.stdout.write('PASS feedback_event_retention_boundary_present\n');

    await FeedbackEvent.init();
    const indexes = await FeedbackEvent.collection.indexes();
    const expiryIndex = indexes.find((index) => index.name === 'feedback_event_expiry');

    assert(expiryIndex, 'feedback event expiry index was not created.');
    assert.deepEqual(expiryIndex.key, { expiresAt: 1 }, 'feedback event expiry index key is incorrect.');
    assert.equal(
      expiryIndex.expireAfterSeconds,
      0,
      'feedback event expiry index must expire records at the expiresAt boundary.',
    );
    assert.equal(
      new Date(firstEvent.expiresAt).getTime() - new Date(firstEvent.createdAt).getTime(),
      ttlDays * 24 * 60 * 60 * 1000,
      'feedback event retention boundary does not match the lifecycle contract ttlDays.',
    );
    process.stdout.write('PASS feedback_event_expiry_path_configured\n');

    await assert.rejects(
      insertFeedbackEvent({
        sessionId: 'verify-session',
        rawQuery: 'authority',
        normalizedQuery: 'authority',
        responseType: 'concept_match',
        feedbackType: 'clear',
        resolvedConceptId: 'authority',
        candidateConceptIds: [],
        suggestionConceptIds: [],
        contractVersion: CONTRACT_VERSION,
        normalizerVersion: NORMALIZER_VERSION,
        matcherVersion: MATCHER_VERSION,
        conceptSetVersion: CONCEPT_SET_VERSION,
        createdAt: new Date().toISOString(),
        expiresAt: buildFeedbackEventExpiresAt(new Date().toISOString()),
      }),
      {
        name: 'TypeError',
        message: 'Feedback event rawQuery must be minimized before persistence.',
      },
      'feedback store should fail closed when rawQuery minimization is bypassed.',
    );

    await assert.rejects(
      insertFeedbackEvent({
        sessionId: 'verify-session',
        rawQuery: minimizeRawQuery('authority'),
        normalizedQuery: 'authority',
        responseType: 'concept_match',
        feedbackType: 'clear',
        resolvedConceptId: 'authority',
        candidateConceptIds: [],
        suggestionConceptIds: [],
        contractVersion: CONTRACT_VERSION,
        normalizerVersion: NORMALIZER_VERSION,
        matcherVersion: MATCHER_VERSION,
        conceptSetVersion: CONCEPT_SET_VERSION,
        createdAt: new Date().toISOString(),
        expiresAt: buildFeedbackEventExpiresAt(new Date().toISOString()),
      }),
      {
        name: 'TypeError',
        message: 'Feedback event normalizedQuery must be minimized before persistence.',
      },
      'feedback store should fail closed when normalizedQuery minimization is bypassed.',
    );

    await assert.rejects(
      insertFeedbackEvent({
        sessionId: 'verify-session',
        rawQuery: minimizeRawQuery('authority'),
        normalizedQuery: minimizeNormalizedQuery('authority'),
        responseType: 'concept_match',
        feedbackType: 'clear',
        resolvedConceptId: 'authority',
        candidateConceptIds: [],
        suggestionConceptIds: [],
        contractVersion: CONTRACT_VERSION,
        normalizerVersion: NORMALIZER_VERSION,
        matcherVersion: MATCHER_VERSION,
        conceptSetVersion: CONCEPT_SET_VERSION,
        createdAt: new Date().toISOString(),
      }),
      {
        name: 'TypeError',
        message: 'Feedback event expiresAt retention boundary must be a valid Date.',
      },
      'feedback store should fail closed when the retention boundary is missing.',
    );
    process.stdout.write('PASS feedback_store_fail_closed\n');

    const otherSessionReceipt = await postJson(`${baseUrl}/api/v1/feedback`, {
      sessionId: 'other-session',
      rawQuery: 'power',
      normalizedQuery: 'power',
      responseType: 'concept_match',
      feedbackType: 'clear',
      resolvedConceptId: 'power',
      contractVersion: CONTRACT_VERSION,
      normalizerVersion: NORMALIZER_VERSION,
      matcherVersion: MATCHER_VERSION,
      conceptSetVersion: CONCEPT_SET_VERSION,
    });

    assert.equal(otherSessionReceipt.status, 201, 'other-session feedback was not accepted.');

    const exportReceipt = await getJson(`${baseUrl}/api/v1/feedback/session/verify-session/export`);

    assert.equal(exportReceipt.status, 200, 'feedback export by sessionId was not accepted.');
    assert.equal(exportReceipt.body.sessionId, 'verify-session', 'export should echo the requested sessionId.');
    assert.equal(exportReceipt.body.recordCount, 3, 'export should return only verify-session feedback events.');
    assert.equal(exportReceipt.body.records.length, 3, 'export should return the expected number of records.');
    assert(exportReceipt.body.records.every((record) => record.sessionId === 'verify-session'),
      'export should exclude feedback events from unrelated sessionIds.');
    assert(exportReceipt.body.records.every((record) => record.rawQuery.startsWith('sha256:')),
      'exported feedback rows must retain minimized rawQuery values.');
    assert(exportReceipt.body.records.every((record) => record.normalizedQuery.startsWith('sha256:')),
      'exported feedback rows must retain minimized normalizedQuery values.');
    process.stdout.write('PASS feedback_export_by_session\n');

    const deleteReceipt = await deleteJson(`${baseUrl}/api/v1/feedback/session/verify-session`);

    assert.equal(deleteReceipt.status, 200, 'feedback delete by sessionId was not accepted.');
    assert.equal(deleteReceipt.body.sessionId, 'verify-session', 'delete should echo the requested sessionId.');
    assert.equal(deleteReceipt.body.deletedCount, 3, 'delete should remove all verify-session feedback events.');
    assert.equal(deleteReceipt.body.status, 'deleted', 'delete should report deleted when rows were removed.');

    const postDeleteExport = await getJson(`${baseUrl}/api/v1/feedback/session/verify-session/export`);

    assert.equal(postDeleteExport.status, 200, 'post-delete export should remain valid.');
    assert.equal(postDeleteExport.body.recordCount, 0, 'post-delete export should return zero rows.');
    assert.deepEqual(postDeleteExport.body.records, [], 'post-delete export should return an empty record list.');

    const secondDeleteReceipt = await deleteJson(`${baseUrl}/api/v1/feedback/session/verify-session`);

    assert.equal(secondDeleteReceipt.status, 200, 'repeated delete should remain valid.');
    assert.equal(secondDeleteReceipt.body.deletedCount, 0, 'repeated delete should report zero deleted rows.');
    assert.equal(secondDeleteReceipt.body.status, 'no_records', 'repeated delete should be idempotent.');

    const remainingEvents = await listFeedbackEvents();
    assert.equal(remainingEvents.length, 1, 'delete should not remove feedback events from unrelated sessions.');
    assert.equal(remainingEvents[0].sessionId, 'other-session', 'only the targeted session should be deleted.');
    process.stdout.write('PASS feedback_delete_by_session\n');

    const audits = await listFeedbackControlAudits();
    assert.equal(audits.length, 4, 'export/delete actions should create one audit row per operation.');
    assert.deepEqual(
      audits.map((audit) => audit.actionType),
      ['export', 'delete', 'export', 'delete'],
      'audit trail actionType sequence is incorrect.',
    );
    assert.deepEqual(
      audits.map((audit) => audit.outcome),
      ['exported', 'deleted', 'no_records', 'no_records'],
      'audit trail outcomes are incorrect.',
    );
    assert.deepEqual(
      audits.map((audit) => audit.affectedCount),
      [3, 3, 0, 0],
      'audit trail affectedCount values are incorrect.',
    );
    assert(audits.every((audit) => audit.sessionIdHash === hashFeedbackSessionIdForAudit('verify-session')),
      'audit trail must store only the minimized sessionId reference for session-controlled actions.');
    assert(audits.every((audit) => {
      const keys = Object.keys(audit).sort();
      return JSON.stringify(keys) === JSON.stringify([
        'actionType',
        'affectedCount',
        'context',
        'id',
        'outcome',
        'requestedAt',
        'sessionIdHash',
      ]);
    }), 'audit trail must remain whitelist-only operational metadata.');
    assert(audits.every((audit) =>
      !Object.hasOwn(audit, 'rawQuery')
      && !Object.hasOwn(audit, 'normalizedQuery')
      && !Object.hasOwn(audit, 'records')
      && !Object.hasOwn(audit, 'deletedRecords')
      && !Object.hasOwn(audit, 'responsePayload')
      && !Object.hasOwn(audit, 'documentSnapshot')
      && !Object.hasOwn(audit, 'metadata')),
    'audit trail must not recreate prohibited content or generic metadata fields.');

    await assert.rejects(
      insertFeedbackControlAudit({
        actionType: 'export',
        sessionIdHash: hashFeedbackSessionIdForAudit('verify-session'),
        requestedAt: new Date(),
        affectedCount: 3,
        outcome: 'exported',
        context: 'feedback_session_control_api',
        records: [{ rawQuery: 'authority' }],
        responsePayload: { recordCount: 3 },
        documentSnapshot: { normalizedQuery: 'authority' },
        metadata: { anything: true },
      }),
      {
        name: 'TypeError',
        message: 'Feedback control audit records must not include extra fields: documentSnapshot, metadata, records, responsePayload.',
      },
      'feedback control audit persistence should fail closed when prohibited content fields are supplied.',
    );
    process.stdout.write('PASS feedback_control_audit_trail\n');

    process.stdout.write('ChatPDM feedback verification passed.\n');
  } finally {
    await clearFeedbackControlAudits();
    await clearFeedbackEvents();
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
    await disconnectMongo();
    await mongoServer.stop();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
