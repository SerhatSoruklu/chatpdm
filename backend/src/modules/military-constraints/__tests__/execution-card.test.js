'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Ajv2020 = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats');

const { buildReferenceBundle } = require('../build-reference-pack');
const { evaluateBundle } = require('../evaluate-bundle');
const { projectExecutionCard } = require('../project-execution-card');
const { computeBundleHash } = require('../military-constraint-validator');

const BASE_DIR = path.resolve(__dirname);
const MODULE_DIR = path.resolve(BASE_DIR, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'fixtures', 'regression', relativePath), 'utf8'));
}

function readModuleJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(MODULE_DIR, relativePath), 'utf8'));
}

function buildAjv() {
  const ajv = new Ajv2020({ allErrors: true, allowUnionTypes: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(readModuleJson('runtime-decision.schema.json'));
  ajv.addSchema(readModuleJson('execution-card.schema.json'));
  return ajv;
}

function assertValid(ajv, schemaId, value) {
  const validate = ajv.getSchema(schemaId);
  assert.ok(validate, `Missing schema: ${schemaId}`);
  const valid = validate(value);
  assert.equal(valid, true, JSON.stringify(validate.errors, null, 2));
}

function buildFacts(bundle, packet) {
  const facts = JSON.parse(JSON.stringify(packet));
  facts.bundleId = bundle.bundleId;
  facts.bundleVersion = bundle.bundleVersion;
  facts.bundleHash = bundle.bundleHash;
  return facts;
}

function assertProjectionStable(input) {
  const first = projectExecutionCard(input);
  const second = projectExecutionCard(JSON.parse(JSON.stringify(input)));

  assert.equal(first.valid, true, first.errors.join('\n'));
  assert.equal(second.valid, true, second.errors.join('\n'));
  assert.deepEqual(first.card, second.card);
  assert.ok(first.card.cardId.startsWith('sha256:'), 'Expected hashed cardId.');
  return first.card;
}

test('execution cards are deterministic projections of Pack 5 runtime output', () => {
  const ajv = buildAjv();
  const manifestPath = path.join(MODULE_DIR, 'reference-pack-manifest.protected-person.json');
  const bundleResult = buildReferenceBundle({
    rootDir: MODULE_DIR,
    manifestPath,
  });

  assert.equal(bundleResult.valid, true, bundleResult.errors.join('\n'));
  assert.ok(bundleResult.bundle, 'Expected Pack 5 bundle.');
  assert.equal(bundleResult.metadata.packId, 'mil-us-protected-person-state-core-v0.1.0');

  const bundle = bundleResult.bundle;
  const packets = readJson('reference-fact-packets.protected-person.json');
  const expectedSnapshots = readJson('reference-expected-decisions.protected-person.json');

  packets.forEach((packet) => {
    const expected = expectedSnapshots.find((entry) => entry.caseId === packet.caseId);
    assert.ok(expected, `Missing expected snapshot for ${packet.caseId}`);

    const runtimeDecision = evaluateBundle({
      bundle,
      facts: buildFacts(bundle, packet.facts),
      factSchema: readModuleJson('military-constraint-fact.schema.json'),
    });

    assert.equal(runtimeDecision.decision, expected.decision);

    const projected = assertProjectionStable({
      packMetadata: bundleResult.metadata,
      bundle,
      runtimeDecision,
      sourceText: 'ignored',
      reviewedClauseText: 'ignored',
      compilerNotes: 'ignored',
    });

    assertValid(ajv, 'https://chatpdm.local/schemas/execution-card.schema.json', projected);
    assert.equal(projected.cardId.length, 71);
    assert.equal(projected.packId, bundleResult.metadata.packId);
    assert.equal(projected.bundleId, bundle.bundleId);
    assert.equal(projected.bundleVersion, bundle.bundleVersion);
    assert.equal(projected.bundleHash, bundle.bundleHash);
    assert.equal(projected.jurisdiction, bundle.jurisdiction);
    assert.equal(projected.decision, runtimeDecision.decision);
    assert.equal(projected.reasonCode, runtimeDecision.reasonCode);
    assert.equal(projected.failedStage, runtimeDecision.failedStage);
    assert.deepEqual(projected.failingRuleIds, runtimeDecision.failingRuleIds);
    assert.deepEqual(projected.missingFactIds, runtimeDecision.missingFactIds);
    assert.deepEqual(projected.authorityTrace, runtimeDecision.authorityTrace);
    assert.deepEqual(projected.ruleTrace, runtimeDecision.ruleTrace);
    assert.ok(!Object.prototype.hasOwnProperty.call(projected, 'generatedAt'));
    assert.ok(!Object.prototype.hasOwnProperty.call(projected, 'explanation'));
    assert.ok(!Object.prototype.hasOwnProperty.call(projected, 'recommendation'));
  });
});

test('projection preserves REFUSED_INCOMPLETE explicitly and ignores source-like noise', () => {
  const bundleResult = buildReferenceBundle({
    rootDir: MODULE_DIR,
    manifestPath: path.join(MODULE_DIR, 'reference-pack-manifest.protected-person.json'),
  });

  assert.equal(bundleResult.valid, true, bundleResult.errors.join('\n'));
  const bundle = bundleResult.bundle;
  const packet = readJson('reference-fact-packets.protected-person.json').find((entry) => entry.caseId === 'protected-missing-direct-participation');
  assert.ok(packet, 'Expected missing direct-participation packet.');

  const runtimeDecision = evaluateBundle({
    bundle,
    facts: buildFacts(bundle, packet.facts),
    factSchema: readModuleJson('military-constraint-fact.schema.json'),
  });

  assert.equal(runtimeDecision.decision, 'REFUSED_INCOMPLETE');
  assert.equal(runtimeDecision.reasonCode, 'MISSING_REQUIRED_FACT');

  const base = projectExecutionCard({
    packMetadata: bundleResult.metadata,
    bundle,
    runtimeDecision,
  });

  const noisy = projectExecutionCard({
    packMetadata: bundleResult.metadata,
    bundle,
    runtimeDecision,
    sourceText: 'different source text',
    reviewedClauseText: 'different reviewed clause text',
    compilerNotes: 'different notes',
  });

  assert.equal(base.valid, true, base.errors.join('\n'));
  assert.equal(noisy.valid, true, noisy.errors.join('\n'));
  assert.deepEqual(base.card, noisy.card);
  assert.equal(base.card.decision, 'REFUSED_INCOMPLETE');
  assert.equal(base.card.reasonCode, 'MISSING_REQUIRED_FACT');
});
