'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../src/app');

test('zeroglare analyze returns a compact summary payload', async (t) => {
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
      input: 'Basically, authority vs legitimacy means the same thing for all cases.',
    }),
  });

  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.resource, 'zeroglare');
  assert.equal(body.taxonomy_version, 'v1');
  assert.equal(body.status, 'fail');
  assert.equal(body.summary.state, 'fail');
  assert.equal(body.summary.marker_count, 4);
  assert.equal(body.summary.clear_count, 0);
  assert.equal(body.summary.pressure_count, 0);
  assert.equal(body.summary.fail_count, 4);
  assert.deepEqual(body.markers, [
    'rhetorical_noise',
    'ambiguity_surface',
    'unsupported_semantic_bridge',
    'scope_pressure',
  ]);
  assert.ok(typeof body.normalized_input_preview === 'string');
  assert.equal(body.normalized_input_truncated, false);
  assert.equal(Object.prototype.hasOwnProperty.call(body, 'diagnostics'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(body, 'input'), false);
});
