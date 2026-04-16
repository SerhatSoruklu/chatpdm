'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Ajv2020 = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats');

const { buildReferenceBundle } = require('../build-reference-pack');
const { evaluateBundle } = require('../evaluate-bundle');
const { validateReviewedClauseCorpus } = require('../validate-reviewed-clause-corpus');
const { computeBundleHash } = require('../military-constraint-validator');
const { PACKS } = require('./intl-baseline.shared');

const BASE_DIR = path.resolve(__dirname);
const MODULE_DIR = path.resolve(BASE_DIR, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'fixtures', 'regression', relativePath), 'utf8'));
}

function readModuleJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(MODULE_DIR, relativePath), 'utf8'));
}

function readReviewedClause(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(MODULE_DIR, 'reviewed-clauses', relativePath), 'utf8'));
}

function buildAjv() {
  const ajv = new Ajv2020({ allErrors: true, allowUnionTypes: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(readModuleJson('military-source-registry.schema.json'));
  ajv.addSchema(readModuleJson('source-clause.schema.json'));
  ajv.addSchema(readModuleJson('military-constraint-predicate.schema.json'));
  ajv.addSchema(readModuleJson('military-constraint-rule.schema.json'));
  ajv.addSchema(readModuleJson('military-constraint-authority-graph.schema.json'));
  ajv.addSchema(readModuleJson('military-constraint-bundle.schema.json'));
  ajv.addSchema(readModuleJson('military-constraint-fact.schema.json'));
  ajv.addSchema(readModuleJson('runtime-decision.schema.json'));
  return ajv;
}

function assertValid(ajv, schemaId, value) {
  const validate = ajv.getSchema(schemaId);
  assert.ok(validate, `Missing schema: ${schemaId}`);
  const valid = validate(value);
  assert.equal(valid, true, JSON.stringify(validate.errors, null, 2));
}

function getExpectedDecision(expectedSnapshots, caseId) {
  const expected = expectedSnapshots.find((entry) => entry.caseId === caseId);
  assert.ok(expected, `Missing expected snapshot for ${caseId}`);
  return expected;
}

function assertDecisionMatchesSnapshot(actual, expected) {
  assert.equal(actual.decision, expected.decision, `decision mismatch for ${expected.caseId}`);
  assert.equal(actual.reasonCode, expected.reasonCode, `reasonCode mismatch for ${expected.caseId}`);
  assert.equal(actual.failedStage, expected.failedStage, `failedStage mismatch for ${expected.caseId}`);
  assert.deepEqual(actual.failingRuleIds, expected.failingRuleIds, `failingRuleIds mismatch for ${expected.caseId}`);
}

PACKS.forEach((pack) => {
  test(`${pack.packId} reference bundle regression snapshots stay stable`, () => {
    const ajv = buildAjv();
    const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
    const manifest = readModuleJson(pack.manifestFile);
    const corpus = readReviewedClause(pack.clauseFile);
    const snapshots = readJson(`reference-expected-decisions.${pack.manifestFile.replace('reference-pack-manifest.', '').replace('.json', '')}.json`);
    const packets = readJson(`reference-fact-packets.${pack.manifestFile.replace('reference-pack-manifest.', '').replace('.json', '')}.json`);

    assert.equal(manifest.packId, pack.packId);
    assert.equal(corpus.length, pack.expectedClauseCount);

    corpus.forEach((clause) => {
      assertValid(ajv, 'https://chatpdm.local/schemas/source-clause.schema.json', clause);
    });

    const corpusValidation = validateReviewedClauseCorpus({
      clauses: corpus,
      sourceRegistry,
    });
    assert.equal(corpusValidation.valid, true, corpusValidation.errors.join('\n'));

    const bundleResult = buildReferenceBundle({
      rootDir: MODULE_DIR,
      manifestPath: path.join(MODULE_DIR, pack.manifestFile),
    });

    assert.equal(bundleResult.valid, true, bundleResult.errors.join('\n'));
    assert.ok(bundleResult.bundle, `Expected ${pack.packId} bundle.`);
    assert.equal(bundleResult.bundle.bundleHash, computeBundleHash(bundleResult.bundle));

    packets.forEach((packet) => {
      const expected = getExpectedDecision(snapshots, packet.caseId);
      const facts = JSON.parse(JSON.stringify(packet.facts));
      facts.bundleId = bundleResult.bundle.bundleId;
      facts.bundleVersion = bundleResult.bundle.bundleVersion;
      facts.bundleHash = bundleResult.bundle.bundleHash;
      const actual = evaluateBundle({
        bundle: bundleResult.bundle,
        facts,
        factSchema: readModuleJson('military-constraint-fact.schema.json'),
      });

      assertDecisionMatchesSnapshot(actual, expected);
      assertValid(ajv, 'https://chatpdm.local/schemas/runtime-decision.schema.json', actual);
    });
  });
});
