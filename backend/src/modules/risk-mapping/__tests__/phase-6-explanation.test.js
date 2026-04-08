'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveRiskMapQuery } = require('../resolve/resolveRiskMapQuery');
const { inspectRiskMapExplanation } = require('../inspect/inspectRiskMapExplanation');
const { inspectNodeRegistry } = require('../inspect/inspectNodeRegistry');
const { inspectThreatRegistry } = require('../inspect/inspectThreatRegistry');
const { inspectCompatibilityRegistry } = require('../inspect/inspectCompatibilityRegistry');
const { inspectFalsifierRegistry } = require('../inspect/inspectFalsifierRegistry');
const { buildRiskMapExplanation } = require('../explain/buildRiskMapExplanation');
const { buildReasonExplanation } = require('../explain/buildReasonExplanation');
const { assertSortedUniqueStringArray } = require('../utils/assertSortedUniqueStringArray');

function loadSnapshot(snapshotName) {
  const snapshotPath = path.join(__dirname, 'fixtures', `${snapshotName}.snapshot.json`);
  return JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
}

function buildExplanationBundle(input) {
  const payload = inspectRiskMapExplanation(input);
  return {
    pipelineInput: payload.input,
    output: payload.output,
    explanation: payload.explanation,
  };
}

test('buildRiskMapExplanation is deterministic', () => {
  const snapshot = loadSnapshot('apple_decline_risk');
  const first = buildExplanationBundle(snapshot.input);
  const second = buildExplanationBundle(snapshot.input);

  assert.deepEqual(first, second);
});

test('explanation matches current resolve output', () => {
  const snapshot = loadSnapshot('apple_decline_risk');
  const resolvedOutput = resolveRiskMapQuery(snapshot.input);
  const payload = inspectRiskMapExplanation(snapshot.input);

  assert.deepEqual(payload.output, resolvedOutput);
  assert.deepEqual(payload.output, snapshot.expectedOutput);
  assert.equal(payload.explanation.admission.status, resolvedOutput.status);
  assert.equal(payload.explanation.admission.reasonCode, resolvedOutput.reasonCode);
  assert.equal(payload.explanation.admission.reason, resolvedOutput.reason);
});

test('explanation does not include raw evidence records or registry entries', () => {
  const snapshot = loadSnapshot('apple_decline_risk');
  const payload = inspectRiskMapExplanation(snapshot.input);

  assert.equal(Object.prototype.hasOwnProperty.call(payload.explanation, 'records'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(payload.explanation, 'entries'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(payload.explanation.evidence, 'records'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(payload.explanation.evidence, 'entries'), false);
});

test('whyNarrowed and whyRefused are deterministic and mapped from reasonCode', () => {
  const narrowed = inspectRiskMapExplanation({
    entity: 'apple',
    timeHorizon: 'collapse horizon',
    scenarioType: 'decline_risk',
    domain: 'organization_risk',
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: 'v1',
  });
  const refused = inspectRiskMapExplanation({
    entity: 'apple',
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: 'organization_risk',
    scope: ['unknown_scope'],
    evidenceSetVersion: 'v1',
  });
  const reasonExplanation = buildReasonExplanation({ status: 'narrowed', reasonCode: narrowed.explanation.admission.reasonCode });
  const refusalReasonExplanation = buildReasonExplanation({ status: 'refused', reasonCode: refused.explanation.admission.reasonCode });

  assert.equal(narrowed.explanation.meta.whyNarrowed, 'Broad collapse framing exceeded the authored support boundary and was narrowed.');
  assert.equal(refused.explanation.meta.whyRefused, 'Requested scopes are outside the authored support boundary.');
  assert.deepEqual(reasonExplanation, {
    whyNarrowed: 'Broad collapse framing exceeded the authored support boundary and was narrowed.',
    whyRefused: null,
  });
  assert.deepEqual(refusalReasonExplanation, {
    whyNarrowed: null,
    whyRefused: 'Requested scopes are outside the authored support boundary.',
  });
});

test('inspectable registry surfaces return deterministic sorted outputs', () => {
  const first = {
    nodes: inspectNodeRegistry(),
    threats: inspectThreatRegistry(),
    compatibility: inspectCompatibilityRegistry(),
    falsifiers: inspectFalsifierRegistry(),
  };
  const second = {
    nodes: inspectNodeRegistry(),
    threats: inspectThreatRegistry(),
    compatibility: inspectCompatibilityRegistry(),
    falsifiers: inspectFalsifierRegistry(),
  };

  assert.deepEqual(first, second);
  assertSortedUniqueStringArray(first.nodes.entries.map((entry) => entry.id), 'nodes.entries.ids');
  assertSortedUniqueStringArray(first.threats.entries.map((entry) => entry.id), 'threats.entries.ids');
  assertSortedUniqueStringArray(first.compatibility.entries.map((entry) => entry.id), 'compatibility.entries.ids');
  assertSortedUniqueStringArray(first.falsifiers.entries.map((entry) => entry.id), 'falsifiers.entries.ids');
});

test('explanation endpoint payload shape is deterministic', () => {
  const snapshot = loadSnapshot('apple_decline_risk');
  const first = inspectRiskMapExplanation(snapshot.input);
  const second = inspectRiskMapExplanation(snapshot.input);

  assert.deepEqual(Object.keys(first), ['input', 'output', 'explanation']);
  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(first.explanation.framing), [
    'confidenceMeaning',
    'pathMeaning',
    'refusalMeaning',
  ]);
});

test('no mutation occurs across repeated runs of resolve and explain', () => {
  const snapshot = loadSnapshot('apple_decline_risk');
  const firstResolve = resolveRiskMapQuery(snapshot.input);
  const firstExplain = inspectRiskMapExplanation(snapshot.input);
  const secondResolve = resolveRiskMapQuery(snapshot.input);
  const secondExplain = inspectRiskMapExplanation(snapshot.input);

  assert.deepEqual(firstResolve, secondResolve);
  assert.deepEqual(firstExplain, secondExplain);
});
