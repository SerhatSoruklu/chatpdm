'use strict';

const http = require('node:http');
const assert = require('node:assert/strict');
const test = require('node:test');

const app = require('../src/app');

function requestRoot(port) {
  return new Promise((resolve, reject) => {
    const request = http.get({
      hostname: '127.0.0.1',
      port,
      path: '/',
      headers: {
        accept: 'application/json',
      },
    }, (response) => {
      let body = '';

      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        resolve({ response, body });
      });
    });

    request.on('error', reject);
  });
}

test('app uses Helmet defaults on the root response', async (t) => {
  const server = app.listen(0, '127.0.0.1');

  t.after(() => {
    server.close();
  });

  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const address = server.address();

  assert.ok(address && typeof address === 'object', 'Expected the test server to bind to a port.');

  const { response, body } = await requestRoot(address.port);

  assert.equal(response.statusCode, 200);
  assert.match(body, /ChatPDM backend/);
  assert.ok(response.headers['content-security-policy'], 'Expected Helmet to emit a content security policy.');
  assert.equal(
    response.headers['cross-origin-opener-policy'],
    'same-origin',
    'Expected Helmet default cross-origin opener policy to remain enabled.',
  );
  assert.equal(response.headers['x-powered-by'], undefined);
});
