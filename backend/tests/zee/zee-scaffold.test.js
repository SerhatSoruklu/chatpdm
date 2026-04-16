'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const app = require('../../src/app');
const { resolveConceptQuery } = require('../../src/modules/concepts/resolver');
const { runFullPipeline } = require('../../src/modules/concepts/pipeline-runner');

function listenOnLoopback() {
  const server = app.listen(0, '127.0.0.1');

  return new Promise((resolve, reject) => {
    server.once('listening', () => {
      const address = server.address();

      if (!address || typeof address !== 'object') {
        reject(new Error('Expected the backend server to bind to a port.'));
        return;
      }

      resolve({ server, port: address.port });
    });

    server.once('error', reject);
  });
}

async function requestJson(port, pathname) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    headers: {
      accept: 'application/json',
    },
  });

  const body = await response.json();
  return { response, body };
}

function captureRuntimeWrites(callback) {
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  const chunks = [];

  process.stdout.write = function captureStdout(chunk, encoding, callbackFn) {
    const text = typeof chunk === 'string'
      ? chunk
      : Buffer.from(chunk).toString(typeof encoding === 'string' ? encoding : 'utf8');
    chunks.push(text);

    const callback = typeof encoding === 'function' ? encoding : callbackFn;

    if (typeof callback === 'function') {
      callback();
    }

    return true;
  };

  process.stderr.write = function captureStderr(chunk, encoding, callbackFn) {
    const text = typeof chunk === 'string'
      ? chunk
      : Buffer.from(chunk).toString(typeof encoding === 'string' ? encoding : 'utf8');
    chunks.push(text);

    const callback = typeof encoding === 'function' ? encoding : callbackFn;

    if (typeof callback === 'function') {
      callback();
    }

    return true;
  };

  try {
    callback();
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }

  return chunks.join('');
}

test('api/v1 advertises zee as an isolated scaffold resource', async () => {
  const { server, port } = await listenOnLoopback();
  try {
    const { response, body } = await requestJson(port, '/api/v1');

    assert.equal(response.status, 200);
    assert.equal(body.namespace, 'api/v1');
    assert.equal(body.stage, 'scaffold');
    assert.equal(body.availableResources.includes('zee'), true);
    assert.equal(body.availableResources.includes('intake'), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('zee read-only endpoints return non-operational scaffold payloads', async () => {
  const { server, port } = await listenOnLoopback();
  try {
    for (const operation of ['contract', 'explain', 'audit']) {
      const { response, body } = await requestJson(port, `/api/v1/zee/${operation}`);

      assert.equal(response.status, 200);
      assert.equal(body.resource, 'zee');
      assert.equal(body.operation, operation);
      assert.equal(body.status, 'non_operational_scaffold');
      assert.equal(body.liveAnalysis, false);
      assert.match(body.message, /non-operational scaffold/i);
      assert.match(body.message, /not a live analysis output/i);

      if (operation === 'contract') {
        assert.equal(body.contract.canonicalRoute, '/zeroglare-evidence-engine');
        assert.equal(
          body.contract.boundary,
          'ZEE outputs are non-authoritative and cannot be consumed as inputs by any other system surface.',
        );
      }

      if (operation === 'explain') {
        assert.equal(body.explanation.pipeline.length, 6);
        assert.deepEqual(body.explanation.pipeline, [
          'Frame Isolation',
          'Signal Extraction',
          'Signal Stability',
          'Measurement Layer',
          'Inference Gate',
          'Bounded Output',
        ]);
      }

      if (operation === 'audit') {
        assert.ok(body.audit.reviewScope.includes('boundary'));
        assert.ok(body.audit.reviewScope.includes('metadata'));
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('runtime outputs and logs stay free of zee scaffold language', () => {
  const capturedWrites = captureRuntimeWrites(() => {
    resolveConceptQuery('authority');
    resolveConceptQuery('what is consciousness');
    runFullPipeline('authority');
    runFullPipeline('what is consciousness');
  });

  const runtimeOutputs = [
    JSON.stringify(resolveConceptQuery('authority')),
    JSON.stringify(resolveConceptQuery('what is consciousness')),
    JSON.stringify(runFullPipeline('authority')),
    JSON.stringify(runFullPipeline('what is consciousness')),
    capturedWrites,
  ].join('\n');

  for (const token of [
    'ZeroGlare Evidence Engine',
    '/api/v1/zee',
    'non-operational scaffold',
    'not a live analysis output',
    'ZEE outputs are non-authoritative',
  ]) {
    assert.equal(
      runtimeOutputs.includes(token),
      false,
      `Runtime leakage detected for token: ${token}`,
    );
  }
});
