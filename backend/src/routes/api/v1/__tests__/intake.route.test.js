'use strict';

const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../../../app');
const { resolveConceptQuery } = require('../../../../modules/concepts');
const { resolveRiskMapQuery } = require('../../../../modules/risk-mapping/resolve/resolveRiskMapQuery');

const STRUCTURED_RISK_MAP_QUERY = Object.freeze({
  entity: 'Apple',
  timeHorizon: '5 years',
  scenarioType: 'decline_risk',
  domain: 'organization_risk',
  scope: Object.freeze(['regulatory', 'supply_chain']),
  evidenceSetVersion: 'v1',
});

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

test('intake route advertises a shared dispatch surface', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const { status, body } = await fetchJson(`${baseUrl}/api/v1/intake`);

    assert.equal(status, 200);
    assert.deepEqual(body, {
      resource: 'intake',
      status: 'active',
      availableOperations: ['dispatch'],
      availableTargets: ['concepts', 'risk-mapping'],
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('intake route dispatches raw text to concepts and structured queries to risk mapping', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const conceptDispatch = await fetchJson(`${baseUrl}/api/v1/intake`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: 'authority',
      }),
    });

    assert.equal(conceptDispatch.status, 200);
    assert.equal(conceptDispatch.body.resource, 'intake');
    assert.equal(conceptDispatch.body.status, 'active');
    assert.equal(conceptDispatch.body.selectedSurface, 'concepts');
    assert.equal(conceptDispatch.body.inputType, 'raw_text');
    assert.deepEqual(conceptDispatch.body.output, resolveConceptQuery('authority'));

    const riskMapDispatch = await fetchJson(`${baseUrl}/api/v1/intake`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: STRUCTURED_RISK_MAP_QUERY,
      }),
    });

    assert.equal(riskMapDispatch.status, 200);
    assert.equal(riskMapDispatch.body.resource, 'intake');
    assert.equal(riskMapDispatch.body.status, 'active');
    assert.equal(riskMapDispatch.body.selectedSurface, 'risk-mapping');
    assert.equal(riskMapDispatch.body.inputType, 'structured_query');
    assert.deepEqual(riskMapDispatch.body.output, resolveRiskMapQuery(STRUCTURED_RISK_MAP_QUERY));

    const invalidDispatch = await fetchJson(`${baseUrl}/api/v1/intake`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        input: '',
      }),
    });

    assert.equal(invalidDispatch.status, 400);
    assert.deepEqual(invalidDispatch.body, {
      error: {
        code: 'invalid_intake_input',
        message: 'Shared intake input must be a non-empty string or a structured RiskMapQuery object.',
      },
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
