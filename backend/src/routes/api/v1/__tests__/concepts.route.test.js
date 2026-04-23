'use strict';

const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../../../app');
const {
  CONCEPT_SET_VERSION,
  CONTRACT_VERSION,
} = require('../../../../modules/concepts/constants');

const ISO_8601_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})Z$/;
const HEX_64_PATTERN = /^[a-f0-9]{64}$/;

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
    body: await response.json(),
  };
}

async function fetchRaw(url, options) {
  const response = await fetch(url, options);

  return {
    status: response.status,
    contentType: response.headers.get('content-type') || '',
    body: await response.text(),
  };
}

function assertResolverContractShape(body, context) {
  assert.equal(typeof body, 'object', `${context} body should be an object.`);
  assert.notEqual(body, null, `${context} body should not be null.`);
  assert.equal(typeof body.type, 'string', `${context}.type should be a string.`);
  assert.ok(body.type.length > 0, `${context}.type should be non-empty.`);
  assert.ok(Object.prototype.hasOwnProperty.call(body, 'finalState'), `${context}.finalState is missing.`);
  assert.ok(Object.prototype.hasOwnProperty.call(body, 'reason'), `${context}.reason is missing.`);
  assert.ok(Object.prototype.hasOwnProperty.call(body, 'failedLayer'), `${context}.failedLayer is missing.`);
  assert.equal(typeof body.traceId, 'string', `${context}.traceId should be a string.`);
  assert.ok(body.traceId.length > 0, `${context}.traceId should be non-empty.`);
  assert.match(body.timestamp, ISO_8601_TIMESTAMP_PATTERN, `${context}.timestamp format mismatch.`);
  assert.equal(typeof body.deterministicKey, 'string', `${context}.deterministicKey should be a string.`);
  assert.match(body.deterministicKey, HEX_64_PATTERN, `${context}.deterministicKey format mismatch.`);
  assert.equal(body.registryVersion, CONCEPT_SET_VERSION, `${context}.registryVersion mismatch.`);
  assert.equal(body.policyVersion, CONTRACT_VERSION, `${context}.policyVersion mismatch.`);
}

function assertNoExactMatchCase(body, context, expectedInterpretationType, expectedTargetConceptId) {
  assert.equal(body.type, 'no_exact_match', `${context}.type mismatch.`);
  assert.equal(body.finalState, 'refused', `${context}.finalState mismatch.`);
  assert.equal(body.reason, 'semantic_no_exact_match', `${context}.reason mismatch.`);
  assert.equal(body.failedLayer, 'semantic', `${context}.failedLayer mismatch.`);
  assert.equal(body.resolution.method, 'out_of_scope', `${context}.resolution.method mismatch.`);
  assert.equal(
    body.interpretation.interpretationType,
    expectedInterpretationType,
    `${context}.interpretation.interpretationType mismatch.`,
  );
  assert.equal(
    body.interpretation.targetConceptId,
    expectedTargetConceptId,
    `${context}.interpretation.targetConceptId mismatch.`,
  );
}

function assertFailureEnvelope(body, context, expectedCode, expectedMessage) {
  assert.equal(typeof body, 'object', `${context} body should be an object.`);
  assert.notEqual(body, null, `${context} body should not be null.`);
  assert.ok(Object.prototype.hasOwnProperty.call(body, 'error'), `${context}.error is missing.`);
  assert.equal(typeof body.error, 'object', `${context}.error should be an object.`);
  assert.notEqual(body.error, null, `${context}.error should not be null.`);
  assert.equal(body.error.code, expectedCode, `${context}.error.code mismatch.`);
  assert.equal(body.error.message, expectedMessage, `${context}.error.message mismatch.`);
}

test('concepts route returns the public concept_match contract for authority', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const { status, body } = await fetchJson(`${baseUrl}/api/v1/concepts/resolve?q=authority`);

    assert.equal(status, 200);
    assertResolverContractShape(body, 'authority response');
    assert.equal(body.type, 'concept_match');
    assert.equal(body.finalState, 'valid');
    assert.equal(body.reason, null);
    assert.equal(body.failedLayer, null);
    assert.equal(body.resolution.method, 'exact_alias');
    assert.equal(body.resolution.conceptId, 'authority');
    assert.equal(body.queryType, 'exact_concept_query');
    assert.equal(Object.prototype.hasOwnProperty.call(body, 'vocabulary'), false);
    assert.equal(body.interpretation, null);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('concepts route returns the visible-only public concept refusal contract for violation', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const { status, body } = await fetchJson(`${baseUrl}/api/v1/concepts/resolve?q=violation`);

    assert.equal(status, 200);
    assertResolverContractShape(body, 'violation response');
    assertNoExactMatchCase(body, 'violation response', 'visible_only_public_concept', 'violation');
    assert.equal(Object.prototype.hasOwnProperty.call(body, 'vocabulary'), false);
    assert.equal(Array.isArray(body.suggestions), true);
    assert.equal(body.suggestions.length, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('concepts route returns the rejected_concept contract for defeasibility', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const { status, body } = await fetchJson(`${baseUrl}/api/v1/concepts/resolve?q=defeasibility`);

    assert.equal(status, 200);
    assertResolverContractShape(body, 'defeasibility response');
    assert.equal(body.type, 'rejected_concept');
    assert.equal(body.finalState, 'refused');
    assert.equal(body.reason, 'registry_rejection');
    assert.equal(body.failedLayer, 'registry');
    assert.equal(body.resolution.method, 'rejection_registry');
    assert.equal(body.resolution.conceptId, 'defeasibility');
    assert.equal(body.interpretation.interpretationType, 'explicitly_rejected_concept');
    assert.equal(body.rejection.decisionType, 'STRUCTURAL_REJECTION');
    assert.equal(Object.prototype.hasOwnProperty.call(body, 'vocabulary'), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('concepts route returns the vocabulary boundary contract for obligation', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const { status, body } = await fetchJson(`${baseUrl}/api/v1/concepts/resolve?q=obligation`);

    assert.equal(status, 200);
    assertResolverContractShape(body, 'obligation response');
    assert.equal(body.type, 'VOCABULARY_DETECTED');
    assert.equal(body.finalState, 'refused');
    assert.equal(body.reason, 'exposure_boundary');
    assert.equal(body.failedLayer, 'exposure');
    assert.equal(body.resolution.method, 'vocabulary_guard');
    assert.equal(body.vocabulary.term, 'obligation');
    assert.equal(body.vocabulary.matched, true);
    assert.equal(Object.prototype.hasOwnProperty.call(body, 'answer'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(body, 'rejection'), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('concepts route returns the out-of-scope no_exact_match contract for commitment', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const { status, body } = await fetchJson(`${baseUrl}/api/v1/concepts/resolve?q=commitment`);

    assert.equal(status, 200);
    assertResolverContractShape(body, 'commitment response');
    assertNoExactMatchCase(body, 'commitment response', 'out_of_scope', 'commitment');
    assert.equal(Array.isArray(body.suggestions), true);
    assert.equal(body.suggestions.length, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('concepts route refuses missing q with the route failure envelope', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const { status, body } = await fetchJson(`${baseUrl}/api/v1/concepts/resolve`);

    assert.equal(status, 400);
    assertFailureEnvelope(
      body,
      'missing q response',
      'invalid_query',
      'Query parameter q must be a non-empty string.',
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('concepts route refuses malformed POST input with the route failure envelope', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const emptyInput = await fetchJson(`${baseUrl}/api/v1/concepts/resolve`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ input: '' }),
    });

    assert.equal(emptyInput.status, 400);
    assertFailureEnvelope(
      emptyInput.body,
      'empty input response',
      'invalid_query',
      'Request body field "input" must be a non-empty string.',
    );

    const numericInput = await fetchJson(`${baseUrl}/api/v1/concepts/resolve`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ input: 123 }),
    });

    assert.equal(numericInput.status, 400);
    assertFailureEnvelope(
      numericInput.body,
      'numeric input response',
      'invalid_query',
      'Request body field "input" must be a non-empty string.',
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('concepts route fails closed on malformed JSON request bodies', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const { status, contentType, body } = await fetchRaw(`${baseUrl}/api/v1/concepts/resolve`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: '{',
    });

    assert.equal(status, 400);
    assert.equal(contentType.startsWith('text/html'), true);
    assert.equal(body.includes('SyntaxError:'), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('concepts route still normalizes unsupported query type responses over HTTP', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const { status, body } = await fetchJson(
      `${baseUrl}/api/v1/concepts/resolve?q=${encodeURIComponent('unknown term')}`,
    );

    assert.equal(status, 200);
    assertResolverContractShape(body, 'unsupported query response');
    assert.equal(body.type, 'unsupported_query_type');
    assert.equal(body.finalState, 'refused');
    assert.equal(body.reason, 'structure_unsupported_query_type');
    assert.equal(body.failedLayer, 'structure');
    assert.equal(body.resolution.method, 'unsupported_query_type');
    assert.equal(body.interpretation.interpretationType, 'unsupported_complex');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
