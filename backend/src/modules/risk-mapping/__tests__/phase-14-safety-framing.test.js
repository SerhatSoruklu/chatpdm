'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../../app');
const { resolveRiskMapQuery } = require('../resolve/resolveRiskMapQuery');
const { inspectRiskMapExplanation } = require('../inspect/inspectRiskMapExplanation');
const { inspectRiskMapAuditReport } = require('../inspect/inspectRiskMapAuditReport');

const DOMAIN_ID = 'organization_risk';
const ENTITY = 'apple';
const EVIDENCE_SET_VERSION = 'v1';

const PROHIBITED_RUNTIME_FRAMING = /\b(predict|prediction|probability|probable|likely|odds|chance|forecast|future certainty|knows what will happen|hidden truth)\b/i;

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
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  };
}

test('public framing strings remain deterministic and structural', () => {
  const firstExplanation = inspectRiskMapExplanation(buildSeededInput());
  const secondExplanation = inspectRiskMapExplanation(buildSeededInput());
  const firstAudit = inspectRiskMapAuditReport(buildSeededInput());
  const secondAudit = inspectRiskMapAuditReport(buildSeededInput());

  assert.deepEqual(firstExplanation.explanation.framing, secondExplanation.explanation.framing);
  assert.deepEqual(firstAudit.framing, secondAudit.framing);
  assert.deepEqual(firstExplanation.explanation.framing, {
    confidenceMeaning: 'Bounded support confidence within authored constraints.',
    pathMeaning: 'Supported structural path within current admitted scope.',
    refusalMeaning: 'Outside current authored support boundary.',
  });
  assert.deepEqual(firstAudit.framing, firstExplanation.explanation.framing);
});

test('refusal explanation is boundary-based, not incapability-based', () => {
  const refusal = inspectRiskMapExplanation({
    entity: ENTITY,
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: DOMAIN_ID,
    scope: ['unknown_scope'],
    evidenceSetVersion: EVIDENCE_SET_VERSION,
  });

  assert.equal(refusal.explanation.admission.status, 'refused');
  assert.equal(refusal.explanation.meta.whyRefused, 'Requested scopes are outside the authored support boundary.');
  assert.equal(PROHIBITED_RUNTIME_FRAMING.test(refusal.explanation.meta.whyRefused), false);
});

test('supported path explanation is structural, not future-outcome language', () => {
  const explanation = inspectRiskMapExplanation(buildSeededInput());

  assert.equal(explanation.explanation.framing.pathMeaning, 'Supported structural path within current admitted scope.');
  assert.equal(PROHIBITED_RUNTIME_FRAMING.test(explanation.explanation.framing.pathMeaning), false);
  assert.ok(explanation.explanation.support.supportedPathIds.every((value) => typeof value === 'string'));
});

test('final resolve output field names remain unchanged', () => {
  const output = resolveRiskMapQuery(buildSeededInput());

  assert.deepEqual(Object.keys(output), [
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
});

test('route payloads contain no prohibited unsafe phrases', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const explain = await fetchJson(`${baseUrl}/api/v1/risk-mapping/explain?entity=apple&timeHorizon=5%20years&scenarioType=decline_risk&domain=organization_risk&scope=regulatory,supply_chain&evidenceSetVersion=v1`);
    const audit = await fetchJson(`${baseUrl}/api/v1/risk-mapping/audit?entity=apple&timeHorizon=5%20years&scenarioType=decline_risk&domain=organization_risk&scope=regulatory,supply_chain&evidenceSetVersion=v1`);
    const explainText = JSON.stringify(explain.body);
    const auditText = JSON.stringify(audit.body);

    assert.equal(explain.status, 200);
    assert.equal(audit.status, 200);
    assert.equal(PROHIBITED_RUNTIME_FRAMING.test(explainText), false);
    assert.equal(PROHIBITED_RUNTIME_FRAMING.test(auditText), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('docs contain the required public framing and safety review phrases', () => {
  const publicFraming = fs.readFileSync(path.resolve(__dirname, '../../../../docs/risk-mapping/public-framing.md'), 'utf8');
  const safetyReview = fs.readFileSync(path.resolve(__dirname, '../../../../docs/risk-mapping/safety-review.md'), 'utf8');

  assert.ok(publicFraming.includes('bounded risk mapping'));
  assert.ok(publicFraming.includes('supported structural paths'));
  assert.ok(publicFraming.includes('bounded support confidence'));
  assert.ok(publicFraming.includes('predicts collapse'));
  assert.ok(safetyReview.toLowerCase().includes('release checklist'));
  assert.ok(safetyReview.includes('bounded support confidence'));
  assert.ok(safetyReview.includes('supported structural paths'));
});
