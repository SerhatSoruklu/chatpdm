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
const { clearFeedbackEvents, listFeedbackEvents } = require('../src/modules/feedback/store');

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return {
    status: response.status,
    body: await response.json(),
  };
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

    process.stdout.write('ChatPDM feedback verification passed.\n');
  } finally {
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
