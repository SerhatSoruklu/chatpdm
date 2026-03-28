'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadConceptSet } = require('../src/modules/concepts/concept-loader');
const {
  clearPackageRegistryCache,
  loadPackageRegistry,
  loadPackageRegistryFromDirectory,
} = require('../src/modules/concepts/package-loader');

const packagesRoot = path.resolve(__dirname, '../../data/packages');
const examplePackageRoot = path.join(packagesRoot, 'example-sovereign-domain-stub');
const exampleManifestPath = path.join(examplePackageRoot, 'manifest.json');
const exampleConceptPath = path.join(
  examplePackageRoot,
  'concepts',
  'jurisdictional_authority.json',
);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function buildValidFixtures() {
  return {
    manifest: clone(readJson(exampleManifestPath)),
    concept: clone(readJson(exampleConceptPath)),
  };
}

function createTempPackageRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'chatpdm-package-loader-'));
}

function writePackageFixture(packageRoot, folderName, manifest, concept) {
  const packageDirectory = path.join(packageRoot, folderName);
  const conceptsDirectory = path.join(packageDirectory, 'concepts');

  fs.mkdirSync(conceptsDirectory, { recursive: true });
  writeJson(path.join(packageDirectory, 'manifest.json'), manifest);
  writeJson(path.join(conceptsDirectory, `${concept.conceptId}.json`), concept);

  return {
    packageDirectory,
    conceptsDirectory,
  };
}

function assertPackageLoadFails(testName, messagePattern, packageRoot) {
  assert.throws(
    () => loadPackageRegistryFromDirectory(packageRoot),
    messagePattern,
    `${testName} should fail loudly.`,
  );
  process.stdout.write(`PASS ${testName}\n`);
}

function verifyValidRegistryLoads() {
  const registry = loadPackageRegistryFromDirectory(packagesRoot);

  assert.deepEqual(
    registry.packageIds,
    ['example-sovereign-domain-stub'],
    'valid package registry should load the example stub package.',
  );
  assert.equal(
    registry.packagesById['example-sovereign-domain-stub'].concepts.length,
    1,
    'example stub package should expose exactly one validated package concept.',
  );
  assert.deepEqual(
    registry.packagesById['example-sovereign-domain-stub'].coreEquivalentReferences,
    [
      {
        conceptId: 'jurisdictional_authority',
        coreEquivalent: 'authority',
      },
    ],
    'example stub package should preserve coreEquivalent references as data only.',
  );
  process.stdout.write('PASS valid_package_registry_loads\n');
}

function verifyDeepFreezePreventsMutation() {
  const registry = loadPackageRegistryFromDirectory(packagesRoot);
  const packageRecord = registry.packagesById['example-sovereign-domain-stub'];
  const concept = packageRecord.concepts[0];

  assert.equal(Object.isFrozen(registry), true, 'registry shell should be frozen.');
  assert.equal(Object.isFrozen(packageRecord.manifest.domainScope), true, 'manifest nested objects should be frozen.');
  assert.equal(Object.isFrozen(concept.packageScope.appliesWithin), true, 'concept nested arrays should be frozen.');
  assert.equal(Object.isFrozen(concept.sources[0]), true, 'concept nested source entries should be frozen.');
  assert.equal(Object.isFrozen(packageRecord.coreEquivalentReferences[0]), true, 'coreEquivalent references should be frozen.');

  assert.throws(
    () => {
      packageRecord.manifest.domainScope.domainId = 'mutated-domain';
    },
    TypeError,
    'manifest nested objects must not be mutable after load.',
  );
  assert.throws(
    () => {
      concept.packageScope.appliesWithin.push('mutated-scope');
    },
    TypeError,
    'concept nested arrays must not be mutable after load.',
  );
  assert.throws(
    () => {
      concept.sources[0].label = 'mutated-source';
    },
    TypeError,
    'concept nested objects must not be mutable after load.',
  );
  assert.throws(
    () => {
      packageRecord.coreEquivalentReferences[0].coreEquivalent = 'power';
    },
    TypeError,
    'coreEquivalent references must not be mutable after load.',
  );
  process.stdout.write('PASS deep_freeze_mutation_proof\n');
}

function verifyCoreConceptLoadingStaysStable() {
  const conceptIds = loadConceptSet().map((concept) => concept.conceptId);

  assert.deepEqual(
    conceptIds,
    ['authority', 'power', 'legitimacy', 'responsibility', 'duty'],
    'core concept loading must remain unchanged by package validation.',
  );
  process.stdout.write('PASS core_concept_loading_stable\n');
}

function verifyManifestPackageIdMismatchFails() {
  const packageRoot = createTempPackageRoot();

  try {
    const { manifest, concept } = buildValidFixtures();
    manifest.packageId = 'other-package';
    concept.packageId = 'other-package';
    writePackageFixture(packageRoot, 'mismatch-package', manifest, concept);
    assertPackageLoadFails(
      'manifest_package_id_mismatch_rejected',
      /Package manifest packageId mismatch/,
      packageRoot,
    );
  } finally {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }
}

function verifyConceptsPathEscapeFails() {
  const packageRoot = createTempPackageRoot();

  try {
    const { manifest, concept } = buildValidFixtures();
    manifest.packageId = 'escaping-package';
    concept.packageId = 'escaping-package';
    manifest.conceptsPath = '../core-concepts';
    writePackageFixture(packageRoot, 'escaping-package', manifest, concept);
    assertPackageLoadFails(
      'concepts_path_escape_rejected',
      /conceptsPath/,
      packageRoot,
    );
  } finally {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }
}

function verifyForceReloadRebuildsCache() {
  const packageId = 'force-reload-proof-package';
  const conceptId = 'force_reload_package_authority';
  const packageDirectory = path.join(packagesRoot, packageId);

  clearPackageRegistryCache();

  try {
    const cachedRegistry = loadPackageRegistry();

    assert.equal(
      cachedRegistry.packageIds.includes(packageId),
      false,
      'new package should not appear in cache before it exists.',
    );

    const { manifest, concept } = buildValidFixtures();
    manifest.packageId = packageId;
    concept.packageId = packageId;
    concept.conceptId = conceptId;
    concept.title = 'Force Reload Package Authority';
    writePackageFixture(packagesRoot, packageId, manifest, concept);

    const staleRegistry = loadPackageRegistry();
    assert.equal(
      staleRegistry.packageIds.includes(packageId),
      false,
      'cached package registry should remain unchanged without forceReload.',
    );

    const reloadedRegistry = loadPackageRegistry(undefined, true);
    assert.equal(
      reloadedRegistry.packageIds.includes(packageId),
      true,
      'forceReload should rebuild the package registry from disk.',
    );
    assert.equal(
      reloadedRegistry.packagesById[packageId].conceptsById[conceptId].conceptId,
      conceptId,
      'forceReload should surface the newly written package concept.',
    );
    process.stdout.write('PASS force_reload_cache_rebuild_proof\n');
  } finally {
    fs.rmSync(packageDirectory, { recursive: true, force: true });
    clearPackageRegistryCache();
    loadPackageRegistry(undefined, true);
  }
}

function verifyDoctrineTypePairingFails() {
  const packageRoot = createTempPackageRoot();

  try {
    const { manifest, concept } = buildValidFixtures();
    manifest.packageId = 'invalid-doctrine-pairing';
    concept.packageId = 'invalid-doctrine-pairing';
    concept.doctrineType = 'package-local-doctrine';
    concept.coreEquivalent = 'authority';
    writePackageFixture(packageRoot, 'invalid-doctrine-pairing', manifest, concept);
    assertPackageLoadFails(
      'doctrine_type_core_equivalent_pairing_rejected',
      /Invalid doctrineType\/coreEquivalent pairing/,
      packageRoot,
    );
  } finally {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }
}

function verifyCrossPackageDuplicateConceptIdFails() {
  const packageRoot = createTempPackageRoot();

  try {
    const first = buildValidFixtures();
    first.manifest.packageId = 'duplicate-concept-owner-a';
    first.concept.packageId = 'duplicate-concept-owner-a';
    first.concept.conceptId = 'shared_package_concept';

    const second = buildValidFixtures();
    second.manifest.packageId = 'duplicate-concept-owner-b';
    second.concept.packageId = 'duplicate-concept-owner-b';
    second.concept.conceptId = 'shared_package_concept';
    second.concept.title = 'Shared Package Concept B';

    writePackageFixture(packageRoot, 'duplicate-concept-owner-a', first.manifest, first.concept);
    writePackageFixture(packageRoot, 'duplicate-concept-owner-b', second.manifest, second.concept);

    assertPackageLoadFails(
      'cross_package_duplicate_concept_id_rejected',
      /Duplicate package conceptId across packages/,
      packageRoot,
    );
  } finally {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }
}

function verifyForbiddenCoreMutationFails() {
  const packageRoot = createTempPackageRoot();

  try {
    const { manifest, concept } = buildValidFixtures();
    manifest.packageId = 'forbidden-core-mutation';
    concept.packageId = 'forbidden-core-mutation';
    concept.canAffectCore = true;
    writePackageFixture(packageRoot, 'forbidden-core-mutation', manifest, concept);
    assertPackageLoadFails(
      'forbidden_core_mutation_rejected',
      /attempted forbidden core mutation/,
      packageRoot,
    );
  } finally {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }
}

function verifyConceptPackageIdMismatchFails() {
  const packageRoot = createTempPackageRoot();

  try {
    const { manifest, concept } = buildValidFixtures();
    manifest.packageId = 'concept-packageid-mismatch';
    concept.packageId = 'different-package';
    writePackageFixture(packageRoot, 'concept-packageid-mismatch', manifest, concept);
    assertPackageLoadFails(
      'concept_package_id_mismatch_rejected',
      /packageId mismatch/,
      packageRoot,
    );
  } finally {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }
}

function main() {
  verifyValidRegistryLoads();
  verifyDeepFreezePreventsMutation();
  verifyCoreConceptLoadingStaysStable();
  verifyForceReloadRebuildsCache();
  verifyManifestPackageIdMismatchFails();
  verifyConceptsPathEscapeFails();
  verifyDoctrineTypePairingFails();
  verifyCrossPackageDuplicateConceptIdFails();
  verifyForbiddenCoreMutationFails();
  verifyConceptPackageIdMismatchFails();
  process.stdout.write('ChatPDM package loader enforcement proof passed.\n');
}

main();
