'use strict';

const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const { connectMongo, disconnectMongo } = require('../src/config/mongoose');
const AiEvent = require('../src/modules/ai/ai-event.model');
const {
  AiGovernanceBoundaryError,
  assertCanonicalWriteInputFreeOfAiMarkers,
  assertDeterministicPathFreeOfAiMarkers,
} = require('../src/lib/ai-governance-guard');

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

async function listAiEvents() {
  const rows = await AiEvent.find({})
    .sort({ createdAt: 1, _id: 1 })
    .lean()
    .exec();

  return rows.map((row) => ({
    eventType: row.eventType,
    eventClass: row.eventClass,
    source: row.source,
    surface: row.surface,
  }));
}

async function waitForAsyncPersistence() {
  await new Promise((resolve) => {
    setTimeout(resolve, 25);
  });
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
    const usageReceipt = await postJson(`${baseUrl}/api/ai-events`, {
      sessionId: 'verify-ai-session',
      eventType: 'AI_VIEWED',
      surface: 'landing_runtime_ai_advisory',
      conceptId: 'duty',
      query: 'Duty',
      details: {
        queryType: 'exact_concept_query',
      },
    });

    assert.equal(usageReceipt.status, 201, 'AI usage event was not accepted.');
    process.stdout.write('PASS ai_usage_event_submission\n');

    let events = await listAiEvents();
    assert.deepEqual(
      events.map((event) => event.eventType),
      ['AI_VIEWED'],
      'AI usage event was not persisted.',
    );
    process.stdout.write('PASS ai_usage_event_persisted\n');

    try {
      assertCanonicalWriteInputFreeOfAiMarkers(
        {
          advisoryLabel: 'AI (Advisory, Non-Canonical)',
        },
        'verify-ai-writeback',
      );
      assert.fail('Expected canonical write input AI marker to be rejected.');
    } catch (error) {
      assert(error instanceof AiGovernanceBoundaryError, 'Expected AiGovernanceBoundaryError for writeback attempt.');
      assert.equal(error.code, 'AI_CANONICAL_WRITE_BLOCKED');
    }

    await waitForAsyncPersistence();

    try {
      assertDeterministicPathFreeOfAiMarkers(
        {
          provider: 'openai',
        },
        'verify-ai-deterministic-path',
      );
      assert.fail('Expected deterministic path AI marker to be rejected.');
    } catch (error) {
      assert(error instanceof AiGovernanceBoundaryError, 'Expected AiGovernanceBoundaryError for deterministic path contamination.');
      assert.equal(error.code, 'AI_DETERMINISTIC_PATH_CONTAMINATED');
    }

    await waitForAsyncPersistence();

    events = await listAiEvents();
    assert.deepEqual(
      events.map((event) => event.eventType),
      ['AI_VIEWED', 'SILENT_WRITEBACK_ATTEMPT', 'AI_BOUNDARY_VIOLATION'],
      'AI violation events were not logged in the expected order.',
    );
    assert.deepEqual(
      events.map((event) => event.eventClass),
      ['usage', 'violation', 'violation'],
      'AI event classes do not distinguish usage from violation.',
    );
    process.stdout.write('PASS ai_violation_events_logged\n');
  } finally {
    server.close();
    await disconnectMongo();
    await mongoServer.stop();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
