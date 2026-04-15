'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { listReferencePacks } = require('../list-reference-packs');
const { validateReferencePack } = require('../validate-reference-pack');
const { buildReferencePack } = require('../build-reference-pack');
const { runReferencePackRegression } = require('../run-reference-pack-regression');

const BASE_DIR = path.resolve(__dirname);
const MODULE_DIR = path.resolve(BASE_DIR, '..');

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'chatpdm-mc-pack-'));
}

function removeIfExists(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function copyPackArtifacts(targetRoot) {
  fs.mkdirSync(targetRoot, { recursive: true });
  fs.copyFileSync(
    path.join(MODULE_DIR, 'reference-pack-manifest.json'),
    path.join(targetRoot, 'reference-pack-manifest.json'),
  );
  fs.cpSync(path.join(MODULE_DIR, 'reviewed-clauses'), path.join(targetRoot, 'reviewed-clauses'), { recursive: true });
  fs.mkdirSync(path.join(targetRoot, 'fixtures'), { recursive: true });
  fs.copyFileSync(
    path.join(MODULE_DIR, 'fixtures', 'military-source-registry.json'),
    path.join(targetRoot, 'fixtures', 'military-source-registry.json'),
  );
  fs.mkdirSync(path.join(targetRoot, '__tests__', 'fixtures', 'regression'), { recursive: true });
  fs.copyFileSync(
    path.join(MODULE_DIR, '__tests__', 'fixtures', 'authority-graph.json'),
    path.join(targetRoot, '__tests__', 'fixtures', 'authority-graph.json'),
  );
  fs.cpSync(
    path.join(MODULE_DIR, '__tests__', 'fixtures', 'regression'),
    path.join(targetRoot, '__tests__', 'fixtures', 'regression'),
    { recursive: true },
  );
}

function copyPackArtifactsWithRegistry(targetRoot) {
  copyPackArtifacts(targetRoot);
  fs.copyFileSync(
    path.join(MODULE_DIR, 'pack-registry.json'),
    path.join(targetRoot, 'pack-registry.json'),
  );
}

function makePackRoot() {
  const root = makeTempRoot();
  copyPackArtifacts(root);
  return root;
}

function cleanupRoot(root) {
  removeIfExists(root);
}

test('pack list ordering is stable', () => {
  const root = makeTempRoot();
  try {
    const alpha = cloneJson(readJson(path.join(MODULE_DIR, 'reference-pack-manifest.json')));
    alpha.packId = 'aaa-pack';
    alpha.bundleId = 'aaa-bundle';
    fs.writeFileSync(path.join(root, 'reference-pack-manifest.alpha.json'), `${JSON.stringify(alpha, null, 2)}\n`);

    const beta = cloneJson(readJson(path.join(MODULE_DIR, 'reference-pack-manifest.json')));
    beta.packId = 'zzz-pack';
    beta.bundleId = 'zzz-bundle';
    fs.writeFileSync(path.join(root, 'reference-pack-manifest.zzz.json'), `${JSON.stringify(beta, null, 2)}\n`);

    const first = listReferencePacks({ rootDir: root });
    const second = listReferencePacks({ rootDir: root });

    assert.deepEqual(first, second);
    assert.deepEqual(first.map((entry) => entry.packId), ['aaa-pack', 'zzz-pack']);
  } finally {
    cleanupRoot(root);
  }
});

test('pack list ordering follows the registry when present', () => {
  const root = makeTempRoot();
  try {
    fs.cpSync(MODULE_DIR, root, { recursive: true });

    const packs = listReferencePacks({ rootDir: root });

    assert.deepEqual(packs.map((entry) => entry.packId), [
      'mil-us-core-reference',
      'mil-us-protected-person-state-core-v0.1.0',
      'mil-us-maritime-vbss-core-v0.1.0',
      'mil-us-medical-protection-core-v0.1.0',
      'mil-us-civilian-school-protection-core-v0.1.0',
      'US_RULES_OF_ENGAGEMENT_BASE_V1',
      'US_LOAC_COMPLIANCE_V1',
      'US_COMMAND_AUTHORITY_V1',
      'US_DELEGATION_CHAIN_V1',
      'US_PROTECTED_SITE_V1',
      'US_COALITION_INTEROP_V1',
      'US_AIRSPACE_CONTROL_V1',
      'US_GROUND_MANEUVER_V1',
      'US_CHECKPOINT_ADMISSIBILITY_V1',
      'US_SEARCH_AND_SEIZURE_V1',
      'US_DETENTION_HANDLING_V1',
      'US_NO_FLY_ZONE_V1',
      'US_TARGET_APPROVAL_V1',
      'US_COLLATERAL_DAMAGE_ASSESSMENT_V1',
      'US_HOSPITAL_PROTECTION_V1',
      'US_SCHOOL_ZONE_RESTRICTION_V1',
      'US_RELIGIOUS_SITE_PROTECTION_V1',
      'US_CULTURAL_PROPERTY_PROTECTION_V1',
      'US_AID_DELIVERY_SECURITY_V1',
      'US_EVACUATION_ROUTE_V1',
      'US_NIGHT_OPERATION_V1',
      'US_WEATHER_LIMITATION_V1',
      'US_SIGNAL_INTERFERENCE_V1',
      'US_ISR_RETENTION_V1',
      'US_WEAPON_STATUS_V1',
      'US_ALLIED_ROE_MERGE_V1',
    ]);
    assert.equal(packs.length, 31);

    assert.equal(packs[0].kind, 'foundation');
    assert.equal(packs[0].status, 'baseline');
    assert.deepEqual(packs[0].dependsOn, []);
    assert.equal(packs[0].registryPresent, true);
    assert.equal(Number.isInteger(packs[0].registryOrder), true);
    assert.equal(packs[5].kind, 'foundation');
    assert.equal(packs[5].status, 'admitted');
    assert.deepEqual(packs[5].dependsOn, ['US_CORE_V1']);
    assert.equal(packs[6].kind, 'foundation');
    assert.equal(packs[6].status, 'admitted');
    assert.deepEqual(packs[6].dependsOn, ['US_RULES_OF_ENGAGEMENT_BASE_V1']);
    assert.equal(packs[7].kind, 'foundation');
    assert.equal(packs[7].status, 'admitted');
    assert.deepEqual(packs[7].dependsOn, ['US_CORE_V1', 'US_PROTECTED_PERSON_STATE_V1']);
    assert.equal(packs[8].kind, 'foundation');
    assert.equal(packs[8].status, 'admitted');
    assert.deepEqual(packs[8].dependsOn, ['US_COMMAND_AUTHORITY_V1']);
    assert.equal(packs[9].kind, 'foundation');
    assert.equal(packs[9].status, 'admitted');
    assert.deepEqual(packs[9].dependsOn, ['US_LOAC_COMPLIANCE_V1', 'US_PROTECTED_PERSON_STATE_V1']);
    assert.equal(packs[10].kind, 'foundation');
    assert.equal(packs[10].status, 'admitted');
    assert.deepEqual(packs[10].dependsOn, ['US_RULES_OF_ENGAGEMENT_BASE_V1']);
    assert.equal(packs[11].kind, 'domain');
    assert.equal(packs[11].status, 'admitted');
    assert.deepEqual(packs[11].dependsOn, [
      'US_RULES_OF_ENGAGEMENT_BASE_V1',
      'US_LOAC_COMPLIANCE_V1',
      'US_COMMAND_AUTHORITY_V1',
      'US_DELEGATION_CHAIN_V1',
      'US_PROTECTED_SITE_V1',
    ]);
    assert.equal(packs[12].kind, 'domain');
    assert.equal(packs[12].status, 'admitted');
    assert.deepEqual(packs[12].dependsOn, [
      'US_LOAC_COMPLIANCE_V1',
      'US_COMMAND_AUTHORITY_V1',
      'US_DELEGATION_CHAIN_V1',
    ]);
    assert.equal(packs[13].kind, 'domain');
    assert.equal(packs[13].status, 'admitted');
    assert.deepEqual(packs[13].dependsOn, [
      'US_LOAC_COMPLIANCE_V1',
      'US_COMMAND_AUTHORITY_V1',
    ]);
    assert.equal(packs[14].kind, 'domain');
    assert.equal(packs[14].status, 'admitted');
    assert.deepEqual(packs[14].dependsOn, [
      'US_LOAC_COMPLIANCE_V1',
      'US_COMMAND_AUTHORITY_V1',
    ]);
    assert.equal(packs[15].kind, 'domain');
    assert.equal(packs[15].status, 'admitted');
    assert.deepEqual(packs[15].dependsOn, [
      'US_LOAC_COMPLIANCE_V1',
      'US_PROTECTED_PERSON_STATE_V1',
    ]);
    assert.equal(packs[16].kind, 'overlay');
    assert.equal(packs[16].status, 'admitted');
    assert.deepEqual(packs[16].dependsOn, ['US_AIRSPACE_CONTROL_V1']);
    assert.equal(packs[17].kind, 'overlay');
    assert.equal(packs[17].status, 'admitted');
    assert.deepEqual(packs[17].dependsOn, [
      'US_AIRSPACE_CONTROL_V1',
      'US_LOAC_COMPLIANCE_V1',
    ]);
    assert.equal(packs[18].kind, 'overlay');
    assert.equal(packs[18].status, 'admitted');
    assert.deepEqual(packs[18].dependsOn, [
      'US_LOAC_COMPLIANCE_V1',
      'US_PROTECTED_SITE_V1',
    ]);
    assert.equal(packs[19].kind, 'overlay');
    assert.equal(packs[19].status, 'admitted');
    assert.deepEqual(packs[19].dependsOn, [
      'US_PROTECTED_SITE_V1',
      'US_MEDICAL_PROTECTION_V1',
    ]);
    assert.equal(packs[20].kind, 'overlay');
    assert.equal(packs[20].status, 'admitted');
    assert.deepEqual(packs[20].dependsOn, [
      'US_PROTECTED_SITE_V1',
      'US_CIVILIAN_SCHOOL_PROTECTION_V1',
    ]);
    assert.equal(packs[21].kind, 'overlay');
    assert.equal(packs[21].status, 'admitted');
    assert.deepEqual(packs[21].dependsOn, ['US_PROTECTED_SITE_V1']);
    assert.equal(packs[22].kind, 'overlay');
    assert.equal(packs[22].status, 'admitted');
    assert.deepEqual(packs[22].dependsOn, ['US_PROTECTED_SITE_V1']);
    assert.equal(packs[23].kind, 'overlay');
    assert.equal(packs[23].status, 'admitted');
    assert.deepEqual(packs[23].dependsOn, [
      'US_LOAC_COMPLIANCE_V1',
      'US_PROTECTED_SITE_V1',
    ]);
    assert.equal(packs[24].kind, 'overlay');
    assert.equal(packs[24].status, 'admitted');
    assert.deepEqual(packs[24].dependsOn, [
      'US_LOAC_COMPLIANCE_V1',
      'US_PROTECTED_SITE_V1',
    ]);
    assert.equal(packs[25].kind, 'overlay');
    assert.equal(packs[25].status, 'admitted');
    assert.deepEqual(packs[25].dependsOn, ['US_LOAC_COMPLIANCE_V1']);
    assert.equal(packs[26].kind, 'overlay');
    assert.equal(packs[26].status, 'admitted');
    assert.deepEqual(packs[26].dependsOn, [
      'US_AIRSPACE_CONTROL_V1',
      'US_GROUND_MANEUVER_V1',
      'US_MARITIME_VBSS_V1',
    ]);
    assert.equal(packs[27].kind, 'overlay');
    assert.equal(packs[27].status, 'admitted');
    assert.deepEqual(packs[27].dependsOn, [
      'US_LOAC_COMPLIANCE_V1',
      'US_COMMAND_AUTHORITY_V1',
    ]);
    assert.equal(packs[28].kind, 'overlay');
    assert.equal(packs[28].status, 'admitted');
    assert.deepEqual(packs[28].dependsOn, [
      'US_COALITION_INTEROP_V1',
      'US_COMMAND_AUTHORITY_V1',
    ]);
    assert.equal(packs[29].kind, 'overlay');
    assert.equal(packs[29].status, 'admitted');
    assert.deepEqual(packs[29].dependsOn, [
      'US_LOAC_COMPLIANCE_V1',
      'US_COMMAND_AUTHORITY_V1',
    ]);
    assert.equal(packs[30].kind, 'overlay');
    assert.equal(packs[30].status, 'admitted');
    assert.deepEqual(packs[30].dependsOn, ['US_COALITION_INTEROP_V1']);
  } finally {
    cleanupRoot(root);
  }
});

test('registry-planned packs are not releasable', () => {
  const root = makeTempRoot();
  try {
    copyPackArtifactsWithRegistry(root);

    const registryPath = path.join(root, 'pack-registry.json');
    const registry = readJson(registryPath);
    const coreEntry = registry.find((entry) => entry.packId === 'US_CORE_V1');
    assert.ok(coreEntry, 'Expected core registry entry.');
    coreEntry.status = 'planned';
    fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

    const validation = validateReferencePack({
      rootDir: root,
      manifestPath: path.join(root, 'reference-pack-manifest.json'),
    });

    assert.equal(validation.valid, true, validation.errors.join('\n'));

    const release = buildReferencePack({
      rootDir: root,
      manifestPath: path.join(root, 'reference-pack-manifest.json'),
    });

    assert.equal(release.valid, true, release.errors.join('\n'));

    const { releaseReferencePack } = require('../reference-pack-lifecycle');
    const admitted = releaseReferencePack({
      rootDir: root,
      manifestPath: path.join(root, 'reference-pack-manifest.json'),
    });

    assert.equal(admitted.valid, false);
    assert.equal(admitted.reasonCode, 'POLICY_BUNDLE_INVALID');
    assert.match(admitted.errors.join('\n'), /planned/i);
  } finally {
    cleanupRoot(root);
  }
});

test('missing manifest fails validation', () => {
  const root = makePackRoot();
  try {
    const validation = validateReferencePack({
      rootDir: root,
      manifestPath: path.join(root, 'reference-pack-manifest.missing.json'),
    });

    assert.equal(validation.valid, false);
    assert.equal(validation.reasonCode, 'POLICY_BUNDLE_INVALID');
    assert.match(validation.errors.join('\n'), /manifest is missing/i);
  } finally {
    cleanupRoot(root);
  }
});

test('missing reviewed clause file fails validation', () => {
  const root = makePackRoot();
  try {
    removeIfExists(path.join(root, 'reviewed-clauses', 'policy-overlay-core.json'));

    const validation = validateReferencePack({
      rootDir: root,
      manifestPath: path.join(root, 'reference-pack-manifest.json'),
    });

    assert.equal(validation.valid, false);
    assert.equal(validation.reasonCode, 'POLICY_BUNDLE_INVALID');
    assert.match(validation.errors.join('\n'), /reviewed clause set/i);
  } finally {
    cleanupRoot(root);
  }
});

test('missing authority graph fails validation', () => {
  const root = makePackRoot();
  try {
    removeIfExists(path.join(root, '__tests__', 'fixtures', 'authority-graph.json'));

    const validation = validateReferencePack({
      rootDir: root,
      manifestPath: path.join(root, 'reference-pack-manifest.json'),
    });

    assert.equal(validation.valid, false);
    assert.equal(validation.reasonCode, 'POLICY_BUNDLE_INVALID');
    assert.match(validation.errors.join('\n'), /authority graph/i);
  } finally {
    cleanupRoot(root);
  }
});

test('build output is stable for the same inputs', () => {
  const root = makePackRoot();
  try {
    const first = buildReferencePack({
      rootDir: root,
      manifestPath: path.join(root, 'reference-pack-manifest.json'),
    });
    const second = buildReferencePack({
      rootDir: root,
      manifestPath: path.join(root, 'reference-pack-manifest.json'),
    });

    assert.equal(first.valid, true, first.errors.join('\n'));
    assert.equal(second.valid, true, second.errors.join('\n'));
    assert.deepEqual(first, second);
    assert.equal(first.metadata.bundleHash, second.metadata.bundleHash);
  } finally {
    cleanupRoot(root);
  }
});

test('regression runner passes for the frozen reference pack', () => {
  const root = makePackRoot();
  try {
    const regression = runReferencePackRegression({
      rootDir: root,
      manifestPath: path.join(root, 'reference-pack-manifest.json'),
    });

    assert.equal(regression.valid, true, regression.errors.join('\n'));
    assert.ok(regression.summary, 'Expected regression summary.');
    assert.equal(regression.summary.totalCases, 4);
    assert.equal(regression.summary.passedCases, 4);
    assert.equal(regression.summary.failedCases, 0);
  } finally {
    cleanupRoot(root);
  }
});
