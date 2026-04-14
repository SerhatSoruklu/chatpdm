'use strict';

const path = require('node:path');
const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../../app');
const { resolveRiskMapQuery } = require('../resolve/resolveRiskMapQuery');
const { inspectRiskMapExplanation } = require('../inspect/inspectRiskMapExplanation');
const { inspectRiskMapAuditReport } = require('../inspect/inspectRiskMapAuditReport');
const { validateRmgFreezeInvariants } = require('../freeze/validateRmgFreezeInvariants');
const { safeJsonRead } = require('../utils/safeJsonRead');

const SNAPSHOT_PATH = path.resolve(__dirname, '../../../../artifacts/risk-mapping/audit-report.json');

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

function buildSeededInput() {
  return {
    entity: 'apple',
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: 'organization_risk',
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: 'v1',
  };
}

test('frozen snapshot matches the current resolve, explanation, and audit surfaces', () => {
  const snapshot = safeJsonRead(SNAPSHOT_PATH);
  const input = buildSeededInput();
  const output = resolveRiskMapQuery(input);
  const explanation = inspectRiskMapExplanation(input).explanation;
  const auditReport = inspectRiskMapAuditReport(input);

  validateRmgFreezeInvariants(output);

  assert.deepEqual(output, snapshot.output);
  assert.deepEqual(explanation, snapshot.explanation);
  assert.deepEqual(auditReport, snapshot);
});

test('freeze surface route shapes remain exact and bounded', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const resolveResponse = await fetchJson(`${baseUrl}/api/v1/risk-mapping/resolve?entity=apple&timeHorizon=5%20years&scenarioType=decline_risk&domain=organization_risk&scope=regulatory,supply_chain&evidenceSetVersion=v1`);
    const auditResponse = await fetchJson(`${baseUrl}/api/v1/risk-mapping/audit?entity=apple&timeHorizon=5%20years&scenarioType=decline_risk&domain=organization_risk&scope=regulatory,supply_chain&evidenceSetVersion=v1`);
    const explainResponse = await fetchJson(`${baseUrl}/api/v1/risk-mapping/explain?entity=apple&timeHorizon=5%20years&scenarioType=decline_risk&domain=organization_risk&scope=regulatory,supply_chain&evidenceSetVersion=v1`);
    const nodesResponse = await fetchJson(`${baseUrl}/api/v1/risk-mapping/registries/nodes?domain=organization_risk`);

    assert.equal(resolveResponse.status, 200);
    assert.equal(auditResponse.status, 200);
    assert.equal(explainResponse.status, 200);
    assert.equal(nodesResponse.status, 200);

    assert.deepEqual(Object.keys(resolveResponse.body), [
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
    assert.deepEqual(Object.keys(auditResponse.body), ['input', 'output', 'explanation', 'framing', 'confidence', 'provenance', 'invariants']);
    assert.deepEqual(Object.keys(explainResponse.body), ['input', 'output', 'explanation']);
    assert.deepEqual(Object.keys(nodesResponse.body), ['domainId', 'version', 'entries']);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
