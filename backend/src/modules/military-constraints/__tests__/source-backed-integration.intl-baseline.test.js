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

function evaluateCase(pack, bundle, ajv, buildFacts, caseSpec) {
  const facts = buildFacts(bundle);
  caseSpec.mutate(facts);

  const decision = evaluateBundle({
    bundle,
    facts,
    factSchema: readModuleJson('military-constraint-fact.schema.json'),
  });

  assert.equal(decision.decision, caseSpec.expected.decision, `${pack.packId} ${caseSpec.caseId} decision`);
  assert.equal(decision.reasonCode, caseSpec.expected.reasonCode, `${pack.packId} ${caseSpec.caseId} reasonCode`);
  assert.equal(decision.failedStage, caseSpec.expected.failedStage, `${pack.packId} ${caseSpec.caseId} failedStage`);
  assert.ok(decision.failingRuleIds.includes(caseSpec.expected.failingRuleIds[0]), `${pack.packId} ${caseSpec.caseId} ruleId`);
  assertValid(ajv, 'https://chatpdm.local/schemas/runtime-decision.schema.json', decision);
}

PACKS.forEach((pack) => {
  test(`${pack.packId} reviewed clauses compile into a reference bundle and evaluate deterministically`, () => {
    const ajv = buildAjv();
    const sourceRegistry = readModuleJson('fixtures/military-source-registry.json');
    const corpus = [
      ...readReviewedClause(pack.clauseFile),
    ];
    const manifestPath = path.join(MODULE_DIR, pack.manifestFile);

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
      manifestPath,
    });

    assert.equal(bundleResult.valid, true, bundleResult.errors.join('\n'));
    assert.ok(bundleResult.bundle, `Expected ${pack.packId} bundle.`);
    assert.equal(bundleResult.metadata.packId, pack.packId);
    assert.equal(bundleResult.metadata.bundleId, pack.expectedBundleId);
    assert.equal(bundleResult.metadata.reviewedClauseSetIds.length, 1);
    assert.equal(bundleResult.metadata.compiledClauseIds.length, pack.expectedClauseCount);

    const bundle = bundleResult.bundle;
    assertValid(ajv, 'https://chatpdm.local/schemas/military-constraint-bundle.schema.json', bundle);
    assert.equal(bundle.bundleHash, computeBundleHash(bundle));

    const allowedFacts = pack.buildFacts(bundle);
    const allowedDecision = evaluateBundle({
      bundle,
      facts: allowedFacts,
      factSchema: readModuleJson('military-constraint-fact.schema.json'),
    });

    assert.equal(allowedDecision.decision, 'ALLOWED');
    assert.equal(allowedDecision.reasonCode, null);
    assert.equal(allowedDecision.failedStage, null);
    assertValid(ajv, 'https://chatpdm.local/schemas/runtime-decision.schema.json', allowedDecision);

    evaluateCase(pack, bundle, ajv, pack.buildFacts, {
      caseId: `${pack.packId.toLowerCase()}-refusal`,
      mutate: pack.mutateRefusal,
      expected: pack.expectedRefusal,
    });

    evaluateCase(pack, bundle, ajv, pack.buildFacts, {
      caseId: `${pack.packId.toLowerCase()}-missing-fact`,
      mutate: pack.mutateIncomplete,
      expected: pack.expectedIncomplete,
    });

    if (Array.isArray(pack.extraCases)) {
      pack.extraCases.forEach((caseSpec) => {
        evaluateCase(pack, bundle, ajv, pack.buildFacts, caseSpec);
      });
    }
  });
});
