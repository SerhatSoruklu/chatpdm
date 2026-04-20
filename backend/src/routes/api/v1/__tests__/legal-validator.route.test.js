'use strict';

const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../../../app');

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

test('legal-validator route advertises a strict scope-lock front door', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const { status, headers, body } = await fetchJson(`${baseUrl}/api/v1/legal-validator`);

    assert.equal(status, 200);
    assert.equal(headers.get('cache-control'), 'no-store, private, max-age=0');
    assert.equal(body.operationalControls.singleTenant, true);
    assert.equal(body.operationalControls.authzRequired, false);
    assert.equal(body.operationalControls.cachePolicy, 'no-store');
    assert.equal(body.operationalControls.auditableSurfaces[0], 'governance');
    assert.equal(body.operationalControls.auditableSurfaces.includes('report'), true);
    assert.equal(body.operationalControls.auditableSurfaces.includes('export'), true);
    assert.equal(body.operationalControls.auditableSurfaces.includes('replay'), true);
    assert.equal(body.operationalControls.auditableSurfaces.includes('runs'), true);
    assert.equal(body.operationalControls.auditableSurfaces.length, 5);
    assert.deepEqual(body, {
      resource: 'legal-validator',
      status: 'active',
      contractVersion: 'pre-a-scope-lock-v1',
      boundary: {
        product: 'legal-argument-validator',
        scope: 'bounded-legal-validation',
      },
      allowedOperations: ['scope-lock', 'intake', 'orchestrate', 'replay', 'inspect-run', 'governance'],
      allowedOutcomes: ['valid', 'invalid', 'unresolved'],
      operationalControls: {
        singleTenant: true,
        authzRequired: false,
        cachePolicy: 'no-store',
        auditableSurfaces: ['governance', 'runs', 'report', 'export', 'replay'],
      },
      requiredInputShape: {
        topLevel: ['input'],
        inputFields: ['product', 'scope', 'matterId', 'jurisdiction', 'practiceArea'],
      },
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('legal-validator route rejects tenant-scoping headers at the front door', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const { status, body } = await fetchJson(`${baseUrl}/api/v1/legal-validator`, {
      headers: {
        'x-tenant-id': 'tenant-1',
      },
    });

    assert.equal(status, 400);
    assert.deepEqual(body, {
      error: {
        code: 'tenant_scope_not_supported',
        message: 'Legal Argument Validator is single-tenant and does not accept tenant-scoping headers.',
      },
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('legal-validator route accepts only explicit scope-lock envelopes', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const accepted = await fetchJson(`${baseUrl}/api/v1/legal-validator`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: {
          product: 'legal-argument-validator',
          scope: 'bounded-legal-validation',
          matterId: 'matter-1',
          jurisdiction: 'UK',
          practiceArea: 'negligence',
        },
      }),
    });

    assert.equal(accepted.status, 200);
    assert.deepEqual(accepted.body, {
      resource: 'legal-validator',
      status: 'active',
      contractVersion: 'pre-a-scope-lock-v1',
      selectedSurface: 'scope-lock',
      inputType: 'validator_boundary_envelope',
      boundary: {
        product: 'legal-argument-validator',
        scope: 'bounded-legal-validation',
        matterId: 'matter-1',
        jurisdiction: 'UK',
        practiceArea: 'negligence',
      },
      allowedOutcomes: ['valid', 'invalid', 'unresolved'],
      runtimeOperations: ['scope-lock', 'intake', 'orchestrate'],
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('legal-validator route refuses malformed and out-of-scope inputs without falling back', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const malformed = await fetchJson(`${baseUrl}/api/v1/legal-validator`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: 'authority',
      }),
    });

    assert.equal(malformed.status, 400);
    assert.deepEqual(malformed.body, {
      error: {
        code: 'invalid_legal_validator_input',
        message: 'Legal Argument Validator scope-lock input must be a plain object.',
      },
    });

    const outOfScope = await fetchJson(`${baseUrl}/api/v1/legal-validator`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: {
          product: 'concepts',
          scope: 'bounded-legal-validation',
          matterId: 'matter-1',
          jurisdiction: 'UK',
          practiceArea: 'negligence',
        },
      }),
    });

    assert.equal(outOfScope.status, 422);
    assert.deepEqual(outOfScope.body, {
      error: {
        code: 'legal_validator_scope_lock_violation',
        message: 'Legal Argument Validator requests must declare product="legal-argument-validator".',
      },
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('legal-validator replay route advertises the replay surface', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const { status, body } = await fetchJson(`${baseUrl}/api/v1/legal-validator/replay`);

    assert.equal(status, 200);
    assert.deepEqual(body, {
      resource: 'legal-validator-replay',
      status: 'active',
      contractVersion: 'replay-v1',
      boundary: {
        product: 'legal-argument-validator',
        scope: 'bounded-legal-validation',
      },
      allowedOperations: ['replay-validation-run'],
      requestShape: {
        topLevel: ['input'],
        inputFields: ['validationRunId'],
      },
      allowedOutcomes: ['valid', 'invalid', 'unresolved'],
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
