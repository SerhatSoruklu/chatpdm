'use strict';

const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../../../app');
const {
  CANONICAL_SIGNATURE_ALGORITHM,
  CANONICAL_SIGNATURE_IMAGE_PATH,
  CANONICAL_SIGNATURE_KEY_ID,
  verifyCanonicalSignatureEnvelope,
} = require('../../../../modules/canonical-signature/canonical-signature.service');
const env = require('../../../../config/env');

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address !== 'object') {
        reject(new Error('Expected the backend server to bind to a port.'));
        return;
      }

      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });

    server.once('error', reject);
  });
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);

  return {
    status: response.status,
    headers: response.headers,
    body: await response.json(),
  };
}

test('vision signature route returns a signed canonical envelope that verifies', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const { status, body } = await fetchJson(`${baseUrl}/api/v1/vision/signature`);

    assert.equal(status, 200);
    assert.equal(body.resource, 'vision-signature');
    assert.equal(body.status, 'signed');
    assert.equal(body.signedEnvelope.envelope.signatureImagePath, CANONICAL_SIGNATURE_IMAGE_PATH);
    assert.equal(body.signedEnvelope.signature.alg, CANONICAL_SIGNATURE_ALGORITHM);
    assert.equal(body.signedEnvelope.signature.kid, CANONICAL_SIGNATURE_KEY_ID);
    assert.equal(typeof body.signedEnvelope.envelope.issuedAt, 'string');
    assert.equal(body.signedEnvelope.envelope.signatureImageHash.startsWith('sha512:'), true);
    assert.equal(body.signedEnvelope.envelope.payloadHash.startsWith('sha256:'), true);
    assert.equal(verifyCanonicalSignatureEnvelope(body.signedEnvelope), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('vision signature route fails closed when the private key cannot be loaded', async () => {
  const { server, baseUrl } = await startServer();
  const originalPrivateKeyFile = env.signaturePrivateKeyFile;

  env.signaturePrivateKeyFile = 'backend/tests/fixtures/nonexistent-private-key.pem';

  try {
    const { status, body } = await fetchJson(`${baseUrl}/api/v1/vision/signature`);

    assert.equal(status, 500);
    assert.equal(body.error.code, 'vision_signature_failed');
    assert.equal(body.error.message, 'The canonical signature envelope could not be produced.');
  } finally {
    env.signaturePrivateKeyFile = originalPrivateKeyFile;
    await new Promise((resolve) => server.close(resolve));
  }
});
