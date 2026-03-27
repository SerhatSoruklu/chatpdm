'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDbPath = path.join(os.tmpdir(), `chatpdm-feedback-${process.pid}-${Date.now()}.sqlite`);
process.env.CHATPDM_FEEDBACK_DB_PATH = tempDbPath;

const app = require('../src/app');
const { closeFeedbackDatabase, listFeedbackEvents } = require('../src/modules/feedback/store');

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
      contractVersion: 'v1.1',
      normalizerVersion: '2026-03-27.v1',
      matcherVersion: '2026-03-27.v2',
      conceptSetVersion: '20260327.2',
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
      contractVersion: 'v1.1',
      normalizerVersion: '2026-03-27.v1',
      matcherVersion: '2026-03-27.v2',
      conceptSetVersion: '20260327.2',
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
      contractVersion: 'v1.1',
      normalizerVersion: '2026-03-27.v1',
      matcherVersion: '2026-03-27.v2',
      conceptSetVersion: '20260327.2',
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
      contractVersion: 'v1.1',
      normalizerVersion: '2026-03-27.v1',
      matcherVersion: '2026-03-27.v2',
      conceptSetVersion: '20260327.2',
    });

    assert.equal(invalidReceipt.status, 400, 'invalid feedback value should be rejected.');
    process.stdout.write('PASS invalid_feedback_rejected\n');

    const events = listFeedbackEvents();
    assert.equal(events.length, 3, 'feedback events were not stored in the database.');
    assert.deepEqual(
      events.map((event) => event.feedbackType),
      ['clear', 'found_right_one', 'should_exist'],
      'stored feedback types do not match the accepted submissions.',
    );
    process.stdout.write('PASS feedback_events_stored\n');

    process.stdout.write('ChatPDM feedback verification passed.\n');
  } finally {
    server.close();
    closeFeedbackDatabase();
    fs.rmSync(tempDbPath, { force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
