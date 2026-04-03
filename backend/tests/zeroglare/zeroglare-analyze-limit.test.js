'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../src/app');

test('zeroglare analyze rejects inputs above the logical cap with 413', async (t) => {
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/zeroglare/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: 'a'.repeat(1_000_001),
    }),
  });

  assert.equal(response.status, 413);

  const body = await response.json();
  assert.equal(body.error, 'INPUT_TOO_LARGE');
  assert.equal(body.message, 'Input exceeds maximum allowed length (1,000,000 characters).');
});
