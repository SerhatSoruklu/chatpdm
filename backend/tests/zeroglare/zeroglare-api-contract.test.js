'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../src/app');
const {
  ZEROGLARE_API_ERROR_CODES,
  ZEROGLARE_API_ERROR_MESSAGES,
  buildZeroGlareErrorResponse,
} = require('../../src/modules/concepts/zeroglare-api-contract');

async function readJson(response) {
  return response.json();
}

test('zeroglare analyze returns the same success payload for GET and POST', async (t) => {
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const input = 'Basically, authority vs legitimacy means the same thing for all cases.';

  const [getResponse, postResponse] = await Promise.all([
    fetch(`http://127.0.0.1:${port}/api/v1/zeroglare/analyze?q=${encodeURIComponent(input)}`),
    fetch(`http://127.0.0.1:${port}/api/v1/zeroglare/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input,
      }),
    }),
  ]);

  assert.equal(getResponse.status, 200);
  assert.equal(postResponse.status, 200);

  const [getBody, postBody] = await Promise.all([
    readJson(getResponse),
    readJson(postResponse),
  ]);

  assert.deepEqual(getBody, postBody);
});

test('zeroglare analyze returns a normalized error envelope for invalid input on GET and POST', async (t) => {
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  const [getResponse, postResponse] = await Promise.all([
    fetch(`http://127.0.0.1:${port}/api/v1/zeroglare/analyze`),
    fetch(`http://127.0.0.1:${port}/api/v1/zeroglare/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }),
  ]);

  assert.equal(getResponse.status, 400);
  assert.equal(postResponse.status, 400);

  const [getBody, postBody] = await Promise.all([
    readJson(getResponse),
    readJson(postResponse),
  ]);

  assert.deepEqual(Object.keys(getBody), ['error']);
  assert.deepEqual(Object.keys(postBody), ['error']);
  assert.equal(getBody.error.code, ZEROGLARE_API_ERROR_CODES.invalidInput);
  assert.equal(postBody.error.code, ZEROGLARE_API_ERROR_CODES.invalidInput);
  assert.equal(getBody.error.message, ZEROGLARE_API_ERROR_MESSAGES.invalidQuery);
  assert.equal(postBody.error.message, ZEROGLARE_API_ERROR_MESSAGES.invalidBody);
});

test('zeroglare analyze rejects oversized input with a normalized error envelope', async (t) => {
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const oversizedInput = 'a'.repeat(1_000_001);

  const response = await fetch(`http://127.0.0.1:${port}/api/v1/zeroglare/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: oversizedInput,
    }),
  });

  assert.equal(response.status, 413);

  const postBody = await readJson(response);

  const expectedError = buildZeroGlareErrorResponse(
    ZEROGLARE_API_ERROR_CODES.inputTooLarge,
    ZEROGLARE_API_ERROR_MESSAGES.inputTooLarge,
  );

  assert.deepEqual(postBody, expectedError);
});

test('zeroglare error envelopes stay uniform for internal failure responses', () => {
  assert.deepEqual(
    buildZeroGlareErrorResponse(
      ZEROGLARE_API_ERROR_CODES.analysisFailed,
      ZEROGLARE_API_ERROR_MESSAGES.analysisFailed,
    ),
    {
      error: {
        code: ZEROGLARE_API_ERROR_CODES.analysisFailed,
        message: ZEROGLARE_API_ERROR_MESSAGES.analysisFailed,
      },
    },
  );
});
