'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { resolveConcept, resolveConceptQuery } = require('../src/modules/concepts');
const { validateConceptShape } = require('../src/modules/concepts/concept-loader');
const { clearPackageRegistryCache, loadPackageRegistry } = require('../src/modules/concepts/package-loader');

const fixturePath = path.resolve(
  __dirname,
  '../../tests/runtime/fixtures/phase-7-5-cases.json',
);
const comparisonFixturePath = path.resolve(
  __dirname,
  '../../tests/runtime/fixtures/phase-11-comparison-cases.json',
);
const packagesRoot = path.resolve(__dirname, '../../data/packages');
const examplePackageRoot = path.join(packagesRoot, 'example-sovereign-domain-stub');
const exampleManifestPath = path.join(examplePackageRoot, 'manifest.json');
const exampleConceptPath = path.join(
  examplePackageRoot,
  'concepts',
  'jurisdictional_authority.json',
);

function loadCases() {
  return [
    ...JSON.parse(fs.readFileSync(fixturePath, 'utf8')),
    ...JSON.parse(fs.readFileSync(comparisonFixturePath, 'utf8')),
  ];
}

function loadConceptFixture(conceptId) {
  return JSON.parse(
    fs.readFileSync(path.resolve(__dirname, `../../data/concepts/${conceptId}.json`), 'utf8'),
  );
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function buildValidPackageFixtures() {
  return {
    manifest: clone(loadJson(exampleManifestPath)),
    concept: clone(loadJson(exampleConceptPath)),
  };
}

function writePackageFixture(packageRoot, folderName, manifest, concept) {
  const packageDirectory = path.join(packageRoot, folderName);
  const conceptsDirectory = path.join(packageDirectory, 'concepts');

  fs.mkdirSync(conceptsDirectory, { recursive: true });
  writeJson(path.join(packageDirectory, 'manifest.json'), manifest);
  writeJson(path.join(conceptsDirectory, `${concept.conceptId}.json`), concept);

  return packageDirectory;
}

function assertDerivedExplanationOverlayShell(contract, expectedConceptId, expectedConceptVersion, context) {
  assert.notEqual(contract, null, `${context} is missing.`);
  assert.equal(contract.readOnly, true, `${context}.readOnly mismatch.`);
  assert.equal(contract.status, 'generated', `${context}.status mismatch.`);
  assert.equal(contract.canonicalBinding.conceptId, expectedConceptId, `${context}.canonicalBinding.conceptId mismatch.`);
  assert.equal(
    contract.canonicalBinding.conceptVersion,
    expectedConceptVersion,
    `${context}.canonicalBinding.conceptVersion mismatch.`,
  );
  assert.match(contract.canonicalBinding.canonicalHash, /^[a-f0-9]{64}$/, `${context}.canonicalBinding.canonicalHash mismatch.`);

  for (const modeName of ['standard', 'simplified', 'formal']) {
    const mode = contract.modes[modeName];

    assert.notEqual(mode, null, `${context}.modes.${modeName} is missing.`);
    assert.equal(mode.status, 'generated', `${context}.modes.${modeName}.status mismatch.`);
    assert.equal(typeof mode.fields.shortDefinition, 'string', `${context}.modes.${modeName}.fields.shortDefinition mismatch.`);
    assert.equal(typeof mode.fields.coreMeaning, 'string', `${context}.modes.${modeName}.fields.coreMeaning mismatch.`);
    assert.equal(typeof mode.fields.fullDefinition, 'string', `${context}.modes.${modeName}.fields.fullDefinition mismatch.`);
    assert.notEqual(mode.equivalenceCertificate, null, `${context}.modes.${modeName}.equivalenceCertificate mismatch.`);
    assert.equal(mode.equivalenceCertificate.status, 'certified', `${context}.modes.${modeName}.equivalenceCertificate.status mismatch.`);
    assert.equal(
      mode.equivalenceCertificate.canonicalHash,
      contract.canonicalBinding.canonicalHash,
      `${context}.modes.${modeName}.equivalenceCertificate.canonicalHash mismatch.`,
    );
  }
}

function verifyReservedOverlayFieldsAreRejected() {
  const authority = loadConceptFixture('authority');
  const withDerivedExplanationOverlays = {
    ...authority,
    derivedExplanationOverlays: {},
  };
  const withDerivedExplanationOverlayContract = {
    ...authority,
    derivedExplanationOverlayContract: {},
  };

  assert.throws(
    () => validateConceptShape(withDerivedExplanationOverlays, authority.conceptId),
    /must not declare "derivedExplanationOverlays"/,
    'authored packets must reject derivedExplanationOverlays.',
  );

  assert.throws(
    () => validateConceptShape(withDerivedExplanationOverlayContract, authority.conceptId),
    /must not declare "derivedExplanationOverlayContract"/,
    'authored packets must reject derivedExplanationOverlayContract.',
  );

  process.stdout.write('PASS overlay_authored_fields_rejected\n');
}

function verifyPackageConceptRequiresExplicitContext() {
  const withoutContext = resolveConcept({
    conceptId: 'jurisdictional_authority',
    packageContext: null,
  });
  const withContext = resolveConcept({
    conceptId: 'jurisdictional_authority',
    packageContext: 'example-sovereign-domain-stub',
  });

  assert.equal(withoutContext.type, 'no_exact_match', 'package concept must not resolve outside explicit packageContext.');
  assert.equal(withContext.type, 'concept_match', 'package concept must resolve inside explicit packageContext.');
  assert.equal(withContext.resolution.conceptId, 'jurisdictional_authority', 'package concept resolution mismatch.');
  process.stdout.write('PASS package_concept_requires_explicit_context\n');
}

function verifyPackageAliasBlockedOutsideContext() {
  const withoutContext = resolveConcept({
    query: 'local authority',
    packageContext: null,
  });
  const withContext = resolveConcept({
    query: 'local authority',
    packageContext: 'example-sovereign-domain-stub',
  });

  assert.equal(withoutContext.type, 'no_exact_match', 'package-local alias must not participate outside packageContext.');
  assert.equal(withContext.type, 'concept_match', 'package-local alias should resolve inside packageContext.');
  assert.equal(withContext.resolution.conceptId, 'jurisdictional_authority', 'package-local alias resolved the wrong concept.');
  process.stdout.write('PASS package_local_alias_blocked_outside_context\n');
}

function verifyNormalizedAliasBlockedOutsideContext() {
  const packageId = 'normalized-alias-proof-package';
  const conceptId = 'normalized_alias_proof_concept';
  const packageDirectory = path.join(packagesRoot, packageId);

  clearPackageRegistryCache();

  try {
    const { manifest, concept } = buildValidPackageFixtures();
    manifest.packageId = packageId;
    concept.packageId = packageId;
    concept.conceptId = conceptId;
    concept.title = 'Normalized Alias Proof Concept';
    concept.aliases = ['raw alias proof'];
    concept.normalizedAliases = ['normalized alias proof'];
    writePackageFixture(packagesRoot, packageId, manifest, concept);

    clearPackageRegistryCache();

    const withoutContext = resolveConcept({
      query: 'normalized alias proof',
      packageContext: null,
    });
    const withContext = resolveConcept({
      query: 'normalized alias proof',
      packageContext: packageId,
    });

    assert.equal(withoutContext.type, 'no_exact_match', 'package normalizedAliases must not participate outside packageContext.');
    assert.equal(withContext.type, 'concept_match', 'package normalizedAliases should resolve inside packageContext.');
    assert.equal(withContext.resolution.conceptId, conceptId, 'normalized alias resolved the wrong package concept.');
    process.stdout.write('PASS normalized_alias_blocked_outside_context\n');
  } finally {
    fs.rmSync(packageDirectory, { recursive: true, force: true });
    clearPackageRegistryCache();
    loadPackageRegistry(undefined, true);
  }
}

function verifyUnknownPackageContextFailsLoud() {
  assert.throws(
    () => resolveConcept({
      query: 'authority',
      packageContext: 'missing-package-context',
    }),
    /Unknown packageContext .*undefined_in_system/,
    'unknown packageContext should fail loudly.',
  );
  process.stdout.write('PASS unknown_package_context_fails_loud\n');
}

function verifyCoreResolutionUnchangedWithPackageContext() {
  const coreOnly = resolveConceptQuery('authority');
  const packageScoped = resolveConcept({
    query: 'authority',
    packageContext: 'example-sovereign-domain-stub',
  });

  assert.equal(coreOnly.type, 'concept_match', 'core-only resolution should still resolve authority.');
  assert.equal(packageScoped.type, 'concept_match', 'package-scoped resolution should still resolve authority.');
  assert.equal(packageScoped.resolution.conceptId, 'authority', 'core concept should remain authoritative inside packageContext.');
  assert.deepEqual(packageScoped.answer, coreOnly.answer, 'packageContext must not mutate core concept payloads.');
  process.stdout.write('PASS core_resolution_unchanged_with_package_context\n');
}

function verifyPackageAdjacencyRemainsLocal() {
  const authority = loadConceptFixture('authority');
  const response = resolveConcept({
    query: 'local authority',
    packageContext: 'example-sovereign-domain-stub',
  });

  assert.deepEqual(
    response.answer.relatedConcepts,
    [
      {
        conceptId: 'authority',
        title: authority.title,
        relationType: 'extension',
      },
    ],
    'package-local adjacency should only expose active-boundary relations.',
  );
  assert.equal(
    response.answer.coreMeaning,
    authority.coreMeaning,
    'package-local extension must preserve core meaning identity read-only.',
  );
  process.stdout.write('PASS package_adjacency_remains_local\n');
}

function verifySiblingPackageTraversalImpossible() {
  const siblingPackageId = 'resolver-sibling-package-proof';
  const siblingConceptId = 'resolver_sibling_authority';
  const siblingPackageDirectory = path.join(packagesRoot, siblingPackageId);

  clearPackageRegistryCache();

  try {
    const { manifest, concept } = buildValidPackageFixtures();
    manifest.packageId = siblingPackageId;
    concept.packageId = siblingPackageId;
    concept.conceptId = siblingConceptId;
    concept.title = 'Resolver Sibling Authority';
    concept.shortDefinition = 'A sibling package authority concept used only for namespace isolation proof.';
    concept.fullDefinition = 'A sibling package-local authority concept that must not bleed into other active package boundaries.';
    concept.aliases = ['sibling authority'];
    concept.normalizedAliases = ['sibling authority'];
    concept.contexts = [
      {
        label: 'sibling package doctrine',
        explanation: 'Used only inside the sibling package proof boundary.',
      },
    ];
    writePackageFixture(packagesRoot, siblingPackageId, manifest, concept);

    clearPackageRegistryCache();

    assert.throws(
      () => resolveConcept({
        query: 'sibling authority',
        packageContext: 'example-sovereign-domain-stub',
      }),
      /No canonical concept resolved in active package boundary/,
      'active package context must not search sibling packages.',
    );
    assert.throws(
      () => resolveConcept({
        conceptId: siblingConceptId,
        packageContext: 'example-sovereign-domain-stub',
      }),
      /No canonical concept resolved in active package boundary/,
      'direct conceptId lookup must not escape the active package boundary.',
    );

    const siblingScoped = resolveConcept({
      query: 'sibling authority',
      packageContext: siblingPackageId,
    });
    assert.equal(siblingScoped.type, 'concept_match', 'sibling package should resolve only inside its own boundary.');
    assert.equal(siblingScoped.resolution.conceptId, siblingConceptId, 'sibling package resolved the wrong concept.');
    process.stdout.write('PASS sibling_package_traversal_impossible\n');
  } finally {
    fs.rmSync(siblingPackageDirectory, { recursive: true, force: true });
    clearPackageRegistryCache();
    loadPackageRegistry(undefined, true);
  }
}

function verifyInvalidRelatedConceptOutsideBoundaryFailsClosed() {
  const packageAId = 'cross-boundary-related-owner-a';
  const packageBId = 'cross-boundary-related-owner-b';
  const packageADirectory = path.join(packagesRoot, packageAId);
  const packageBDirectory = path.join(packagesRoot, packageBId);

  clearPackageRegistryCache();

  try {
    const first = buildValidPackageFixtures();
    first.manifest.packageId = packageAId;
    first.concept.packageId = packageAId;
    first.concept.conceptId = 'boundary_local_authority_a';
    first.concept.title = 'Boundary Local Authority A';
    first.concept.aliases = ['boundary local authority a'];
    first.concept.normalizedAliases = ['boundary local authority a'];
    first.concept.relatedConcepts = [
      {
        conceptId: 'boundary_local_authority_b',
        relationType: 'extends-core-concept',
      },
    ];

    const second = buildValidPackageFixtures();
    second.manifest.packageId = packageBId;
    second.concept.packageId = packageBId;
    second.concept.conceptId = 'boundary_local_authority_b';
    second.concept.title = 'Boundary Local Authority B';
    second.concept.aliases = ['boundary local authority b'];
    second.concept.normalizedAliases = ['boundary local authority b'];

    writePackageFixture(packagesRoot, packageAId, first.manifest, first.concept);
    writePackageFixture(packagesRoot, packageBId, second.manifest, second.concept);

    clearPackageRegistryCache();

    assert.throws(
      () => resolveConcept({
        query: 'boundary local authority a',
        packageContext: packageAId,
      }),
      /Unknown related concept "boundary_local_authority_b" in active package boundary/,
      'cross-boundary relatedConcept should fail closed inside the active package boundary.',
    );
    process.stdout.write('PASS invalid_related_concept_outside_boundary_fails_closed\n');
  } finally {
    fs.rmSync(packageADirectory, { recursive: true, force: true });
    fs.rmSync(packageBDirectory, { recursive: true, force: true });
    clearPackageRegistryCache();
    loadPackageRegistry(undefined, true);
  }
}

function verifyResolverDoesNotMutateFrozenPackageRegistry() {
  clearPackageRegistryCache();
  const before = JSON.stringify(loadPackageRegistry(undefined, true).packagesById['example-sovereign-domain-stub']);

  resolveConcept({
    query: 'local authority',
    packageContext: 'example-sovereign-domain-stub',
  });

  const after = JSON.stringify(loadPackageRegistry().packagesById['example-sovereign-domain-stub']);
  assert.equal(after, before, 'resolver must not mutate the frozen package registry.');
  process.stdout.write('PASS resolver_does_not_mutate_frozen_registry\n');
}

function verifyCorePathDoesNotMutateFrozenPackageRegistry() {
  clearPackageRegistryCache();
  const before = JSON.stringify(loadPackageRegistry(undefined, true).packagesById['example-sovereign-domain-stub']);

  resolveConceptQuery('authority');

  const after = JSON.stringify(loadPackageRegistry().packagesById['example-sovereign-domain-stub']);
  assert.equal(after, before, 'core-only resolver path must not mutate the frozen package registry.');
  process.stdout.write('PASS core_path_does_not_mutate_frozen_registry\n');
}

function verifyComparisonPathDoesNotMutateFrozenPackageRegistry() {
  clearPackageRegistryCache();
  const before = JSON.stringify(loadPackageRegistry(undefined, true).packagesById['example-sovereign-domain-stub']);

  resolveConceptQuery('authority vs power');

  const after = JSON.stringify(loadPackageRegistry().packagesById['example-sovereign-domain-stub']);
  assert.equal(after, before, 'comparison resolver path must not mutate the frozen package registry.');
  process.stdout.write('PASS comparison_path_does_not_mutate_frozen_registry\n');
}

function assertSubset(actualValue, expectedValue, context) {
  assert.notEqual(actualValue, null, `${context} is missing.`);

  for (const [key, value] of Object.entries(expectedValue)) {
    const actualField = actualValue[key];

    if (Array.isArray(value)) {
      assert.ok(Array.isArray(actualField), `${context}.${key} should be an array.`);
      assert.equal(actualField.length, value.length, `${context}.${key} length mismatch.`);
      value.forEach((expectedItem, index) => {
        if (expectedItem && typeof expectedItem === 'object' && !Array.isArray(expectedItem)) {
          assertSubset(actualField[index], expectedItem, `${context}.${key}[${index}]`);
          return;
        }

        assert.deepEqual(actualField[index], expectedItem, `${context}.${key}[${index}] mismatch.`);
      });
      continue;
    }

    if (value && typeof value === 'object') {
      assertSubset(actualField, value, `${context}.${key}`);
      continue;
    }

    assert.equal(actualField, value, `${context}.${key} mismatch.`);
  }
}

function runCase(testCase) {
  const firstResult = resolveConceptQuery(testCase.input);
  const secondResult = resolveConceptQuery(testCase.input);
  const thirdResult = resolveConceptQuery(testCase.input);

  assert.deepEqual(secondResult, firstResult, `${testCase.name} changed between run 1 and run 2.`);
  assert.deepEqual(thirdResult, firstResult, `${testCase.name} changed between run 1 and run 3.`);

  assert.equal(firstResult.normalizedQuery, testCase.expectedNormalizedQuery, `${testCase.name} normalizedQuery mismatch.`);
  assert.equal(firstResult.type, testCase.expectedType, `${testCase.name} response type mismatch.`);
  if (typeof testCase.expectedMethod === 'string') {
    assert.equal(firstResult.resolution.method, testCase.expectedMethod, `${testCase.name} resolution.method mismatch.`);
  }

  if (typeof testCase.expectedQueryType === 'string') {
    assert.equal(firstResult.queryType, testCase.expectedQueryType, `${testCase.name} queryType mismatch.`);
  }

  if (testCase.expectedInterpretation === null) {
    assert.equal(firstResult.interpretation, null, `${testCase.name} interpretation should be null.`);
  } else if (testCase.expectedInterpretation) {
    assertSubset(firstResult.interpretation, testCase.expectedInterpretation, `${testCase.name} interpretation`);
  }

  if (testCase.expectedType === 'concept_match') {
    assert.equal(
      firstResult.resolution.conceptId,
      testCase.expectedConceptId,
      `${testCase.name} conceptId mismatch.`,
    );
    assertDerivedExplanationOverlayShell(
      firstResult.answer.derivedExplanationOverlays,
      testCase.expectedConceptId,
      firstResult.resolution.conceptVersion,
      `${testCase.name} derivedExplanationOverlays`,
    );
  }

  if (testCase.expectedType === 'ambiguous_match') {
    assert.deepEqual(
      firstResult.candidates.map((candidate) => candidate.conceptId),
      testCase.expectedCandidates,
      `${testCase.name} candidate ordering mismatch.`,
    );
  }

  if (testCase.expectedType === 'no_exact_match') {
    const actualSuggestions = firstResult.suggestions.map((suggestion) => ({
      conceptId: suggestion.conceptId,
      reason: suggestion.reason,
    }));

    assert.deepEqual(
      actualSuggestions,
      testCase.expectedSuggestions,
      `${testCase.name} suggestions mismatch.`,
    );
  }

  if (testCase.expectedType === 'comparison') {
    assertSubset(firstResult.comparison, testCase.expectedComparison, `${testCase.name} comparison`);
  }

  process.stdout.write(`PASS ${testCase.name}\n`);
}

function main() {
  assert.throws(
    () => resolveConceptQuery(''),
    /non-empty string/,
    'empty string input should be rejected before product response generation.',
  );
  process.stdout.write('PASS empty_string_invalid_input\n');

  verifyReservedOverlayFieldsAreRejected();
  verifyPackageConceptRequiresExplicitContext();
  verifyPackageAliasBlockedOutsideContext();
  verifyNormalizedAliasBlockedOutsideContext();
  verifyUnknownPackageContextFailsLoud();
  verifyCoreResolutionUnchangedWithPackageContext();
  verifyPackageAdjacencyRemainsLocal();
  verifySiblingPackageTraversalImpossible();
  verifyInvalidRelatedConceptOutsideBoundaryFailsClosed();
  verifyResolverDoesNotMutateFrozenPackageRegistry();
  verifyCorePathDoesNotMutateFrozenPackageRegistry();
  verifyComparisonPathDoesNotMutateFrozenPackageRegistry();

  const cases = loadCases();
  cases.forEach(runCase);
  process.stdout.write(`ChatPDM runtime proof passed for ${cases.length + 1} cases.\n`);
}

main();
