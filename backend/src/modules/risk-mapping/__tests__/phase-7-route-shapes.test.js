'use strict';

const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../../app');

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  return {
    status: response.status,
    body: await response.json(),
  };
}

test('risk mapping route surfaces deterministic audit and registry payloads', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const auditFirst = await fetchJson(`${baseUrl}/api/v1/risk-mapping/audit?entity=apple&timeHorizon=5%20years&scenarioType=decline_risk&domain=organization_risk&scope=regulatory,supply_chain&evidenceSetVersion=v1`);
    const auditSecond = await fetchJson(`${baseUrl}/api/v1/risk-mapping/audit?entity=apple&timeHorizon=5%20years&scenarioType=decline_risk&domain=organization_risk&scope=regulatory,supply_chain&evidenceSetVersion=v1`);
    const resolveFirst = await fetchJson(`${baseUrl}/api/v1/risk-mapping/resolve?entity=apple&timeHorizon=5%20years&scenarioType=decline_risk&domain=organization_risk&scope=regulatory,supply_chain&evidenceSetVersion=v1`);
    const resolveSecond = await fetchJson(`${baseUrl}/api/v1/risk-mapping/resolve?entity=apple&timeHorizon=5%20years&scenarioType=decline_risk&domain=organization_risk&scope=regulatory,supply_chain&evidenceSetVersion=v1`);

    assert.equal(auditFirst.status, 200);
    assert.equal(resolveFirst.status, 200);
    assert.deepEqual(auditFirst.body, auditSecond.body);
    assert.deepEqual(resolveFirst.body, resolveSecond.body);
    assert.deepEqual(Object.keys(auditFirst.body), ['input', 'output', 'explanation', 'framing', 'confidence', 'provenance', 'invariants']);
    assert.deepEqual(Object.keys(resolveFirst.body), [
      'status',
      'reasonCode',
      'reason',
      'domain',
      'scenarioType',
      'entity',
      'supportedNodes',
      'supportedThreatVectors',
      'supportedCausalPaths',
      'unsupportedBridges',
      'assumptions',
      'unknowns',
      'falsifiers',
      'boundedConfidenceClass',
      'diagnostics',
    ]);
    assert.deepEqual(Object.keys(auditFirst.body.output), [
      'status',
      'reasonCode',
      'reason',
      'domain',
      'scenarioType',
      'entity',
      'supportedNodes',
      'supportedThreatVectors',
      'supportedCausalPaths',
      'unsupportedBridges',
      'assumptions',
      'unknowns',
      'falsifiers',
      'boundedConfidenceClass',
      'diagnostics',
    ]);

    const nodes = await fetchJson(`${baseUrl}/api/v1/risk-mapping/registries/nodes?domain=organization_risk`);
    const threats = await fetchJson(`${baseUrl}/api/v1/risk-mapping/registries/threats?domain=organization_risk`);
    const compatibility = await fetchJson(`${baseUrl}/api/v1/risk-mapping/registries/compatibility?domain=organization_risk`);
    const falsifiers = await fetchJson(`${baseUrl}/api/v1/risk-mapping/registries/falsifiers?domain=organization_risk`);

    assert.equal(nodes.status, 200);
    assert.equal(threats.status, 200);
    assert.equal(compatibility.status, 200);
    assert.equal(falsifiers.status, 200);
    assert.equal(auditFirst.body.confidence.boundedConfidenceClass, 'MEDIUM_BOUNDED_SUPPORT');
    assert.deepEqual(Object.keys(auditFirst.body.confidence), ['boundedConfidenceClass', 'reasonIds', 'explanation']);
    assert.deepEqual(Object.keys(nodes.body), ['domainId', 'version', 'entries']);
    assert.deepEqual(Object.keys(threats.body), ['domainId', 'version', 'entries']);
    assert.deepEqual(Object.keys(compatibility.body), ['domainId', 'version', 'entries']);
    assert.deepEqual(Object.keys(falsifiers.body), ['domainId', 'version', 'entries']);
    assert.ok(nodes.body.entries.every((entry, index, array) => index === 0 || array[index - 1].id < entry.id));
    assert.ok(threats.body.entries.every((entry, index, array) => index === 0 || array[index - 1].id < entry.id));
    assert.ok(compatibility.body.entries.every((entry, index, array) => index === 0 || array[index - 1].id < entry.id));
    assert.ok(falsifiers.body.entries.every((entry, index, array) => index === 0 || array[index - 1].id < entry.id));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('risk mapping route refuses missing domain instead of defaulting scope', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const audit = await fetchJson(`${baseUrl}/api/v1/risk-mapping/audit?entity=apple&timeHorizon=5%20years&scenarioType=decline_risk&scope=regulatory,supply_chain&evidenceSetVersion=v1`);
    const registry = await fetchJson(`${baseUrl}/api/v1/risk-mapping/registries/nodes`);

    assert.equal(audit.status, 400);
    assert.equal(audit.body.error.code, 'invalid_risk_map_query');
    assert.match(audit.body.error.message, /domain must be a non-empty string/i);

    assert.equal(registry.status, 400);
    assert.equal(registry.body.error.code, 'invalid_risk_map_query');
    assert.match(registry.body.error.message, /domain must be a non-empty string/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('explain route remains bounded and does not expose raw internal structures', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetchJson(`${baseUrl}/api/v1/risk-mapping/explain?entity=apple&timeHorizon=5%20years&scenarioType=decline_risk&domain=organization_risk&scope=regulatory,supply_chain&evidenceSetVersion=v1`);

    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(response.body), ['input', 'output', 'explanation']);
    assert.equal(Object.prototype.hasOwnProperty.call(response.body, 'registryIndex'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(response.body, 'evidencePack'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(response.body.explanation, 'records'), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
