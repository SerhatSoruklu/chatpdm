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
const { validatePackRegistry } = require('../reference-pack-utils');

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
  fs.copyFileSync(
    path.join(MODULE_DIR, '__tests__', 'fixtures', 'authority-graph-intl.json'),
    path.join(targetRoot, '__tests__', 'fixtures', 'authority-graph-intl.json'),
  );
  fs.copyFileSync(
    path.join(MODULE_DIR, '__tests__', 'fixtures', 'authority-graph-uk.json'),
    path.join(targetRoot, '__tests__', 'fixtures', 'authority-graph-uk.json'),
  );
  fs.copyFileSync(
    path.join(MODULE_DIR, '__tests__', 'fixtures', 'authority-graph-nato.json'),
    path.join(targetRoot, '__tests__', 'fixtures', 'authority-graph-nato.json'),
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

function duplicateRegistryEntry(registry, matcher, mutate) {
  const entry = registry.find(matcher);
  assert.ok(entry, 'Expected registry entry to duplicate.');
  const duplicated = cloneJson(entry);
  mutate(duplicated);
  registry.push(duplicated);
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
      'INTL_LOAC_BASE_V1',
      'INTL_PROTECTED_PERSON_BASE_V1',
      'INTL_PROTECTED_SITE_BASE_V1',
      'UK_NATIONAL_BASE_V1',
      'UK_ROE_BASE_V1',
      'UK_COMMAND_AUTHORITY_V1',
      'UK_DELEGATION_CHAIN_V1',
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
      'NATO_INTEROP_BASE_V1',
      'ALLIED_AUTHORITY_MERGE_V1',
      'NATO_ROE_COMPAT_V1',
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
      'UK_AIRSPACE_CONTROL_V1',
      'UK_GROUND_MANEUVER_V1',
      'CA_NATIONAL_BASE_V1',
      'CA_ROE_BASE_V1',
      'CA_COMMAND_AUTHORITY_V1',
      'CA_DELEGATION_CHAIN_V1',
      'CA_AIRSPACE_CONTROL_V1',
      'AU_NATIONAL_BASE_V1',
      'AU_ROE_BASE_V1',
      'AU_COMMAND_AUTHORITY_V1',
      'AU_DELEGATION_CHAIN_V1',
      'AU_AIRSPACE_CONTROL_V1',
      'NL_NATIONAL_BASE_V1',
      'NL_ROE_BASE_V1',
      'NL_COMMAND_AUTHORITY_V1',
      'NL_DELEGATION_CHAIN_V1',
      'NL_AIRSPACE_CONTROL_V1',
      'TR_NATIONAL_BASE_V1',
      'TR_ROE_BASE_V1',
      'TR_COMMAND_AUTHORITY_V1',
      'TR_DELEGATION_CHAIN_V1',
      'TR_AIRSPACE_CONTROL_V1',
    ]);
    assert.equal(packs.length, 63);

    const byId = new Map(packs.map((entry) => [entry.packId, entry]));
    const expect = (packId, kind, status, dependsOn, overlayFamily = null, overlayBoundary = null, overlayScope = null) => {
      const entry = byId.get(packId);
      assert.ok(entry, `Missing pack entry for ${packId}`);
      assert.equal(entry.kind, kind, `${packId} kind`);
      assert.equal(entry.status, status, `${packId} status`);
      assert.deepEqual(entry.dependsOn, dependsOn, `${packId} dependsOn`);
      assert.equal(entry.overlayFamily, overlayFamily, `${packId} overlayFamily`);
      assert.equal(entry.overlayBoundary, overlayBoundary, `${packId} overlayBoundary`);
      assert.equal(entry.overlayScope, overlayScope, `${packId} overlayScope`);
      assert.equal(entry.registryPresent, true, `${packId} registryPresent`);
      assert.equal(Number.isInteger(entry.registryOrder), true, `${packId} registryOrder`);
    };

    expect('INTL_LOAC_BASE_V1', 'foundation', 'admitted', []);
    expect('INTL_PROTECTED_PERSON_BASE_V1', 'foundation', 'admitted', ['INTL_LOAC_BASE_V1']);
    expect('INTL_PROTECTED_SITE_BASE_V1', 'foundation', 'admitted', ['INTL_LOAC_BASE_V1']);
    expect('UK_NATIONAL_BASE_V1', 'foundation', 'admitted', ['INTL_LOAC_BASE_V1']);
    expect('UK_ROE_BASE_V1', 'foundation', 'admitted', ['UK_NATIONAL_BASE_V1']);
    expect('UK_COMMAND_AUTHORITY_V1', 'foundation', 'admitted', ['UK_ROE_BASE_V1']);
    expect('UK_DELEGATION_CHAIN_V1', 'foundation', 'admitted', ['UK_COMMAND_AUTHORITY_V1']);
    expect('mil-us-core-reference', 'foundation', 'baseline', []);
    expect('mil-us-protected-person-state-core-v0.1.0', 'foundation', 'baseline', ['INTL_PROTECTED_PERSON_BASE_V1']);
    expect('mil-us-maritime-vbss-core-v0.1.0', 'domain', 'baseline', []);
    expect(
      'mil-us-medical-protection-core-v0.1.0',
      'overlay',
      'baseline',
      ['INTL_PROTECTED_SITE_BASE_V1', 'US_PROTECTED_PERSON_STATE_V1'],
      'protection',
      'person_site_bridge',
      'jurisdictional',
    );
    expect(
      'mil-us-civilian-school-protection-core-v0.1.0',
      'overlay',
      'baseline',
      ['INTL_PROTECTED_SITE_BASE_V1', 'US_PROTECTED_PERSON_STATE_V1'],
      'protection',
      'site',
      'jurisdictional',
    );
    expect('US_RULES_OF_ENGAGEMENT_BASE_V1', 'foundation', 'admitted', ['US_CORE_V1']);
    expect('US_LOAC_COMPLIANCE_V1', 'foundation', 'admitted', ['US_RULES_OF_ENGAGEMENT_BASE_V1', 'INTL_LOAC_BASE_V1']);
    expect('US_COMMAND_AUTHORITY_V1', 'foundation', 'admitted', ['US_CORE_V1', 'US_PROTECTED_PERSON_STATE_V1']);
    expect('US_DELEGATION_CHAIN_V1', 'foundation', 'admitted', ['US_COMMAND_AUTHORITY_V1']);
    expect(
      'US_PROTECTED_SITE_V1',
      'foundation',
      'admitted',
      ['US_LOAC_COMPLIANCE_V1', 'US_PROTECTED_PERSON_STATE_V1', 'INTL_PROTECTED_SITE_BASE_V1'],
    );
    expect('NATO_INTEROP_BASE_V1', 'foundation', 'admitted', ['INTL_LOAC_BASE_V1']);
    expect('ALLIED_AUTHORITY_MERGE_V1', 'overlay', 'admitted', ['NATO_INTEROP_BASE_V1'], 'coalition_merge', 'coalition', 'coalition');
    expect('NATO_ROE_COMPAT_V1', 'overlay', 'admitted', ['NATO_INTEROP_BASE_V1'], 'coalition_merge', 'coalition', 'coalition');
    expect('US_COALITION_INTEROP_V1', 'foundation', 'admitted', ['NATO_INTEROP_BASE_V1']);
    expect(
      'US_AIRSPACE_CONTROL_V1',
      'domain',
      'admitted',
      [
        'US_RULES_OF_ENGAGEMENT_BASE_V1',
        'US_LOAC_COMPLIANCE_V1',
        'US_COMMAND_AUTHORITY_V1',
        'US_DELEGATION_CHAIN_V1',
        'US_PROTECTED_SITE_V1',
      ],
    );
    expect(
      'US_GROUND_MANEUVER_V1',
      'domain',
      'admitted',
      ['US_LOAC_COMPLIANCE_V1', 'US_COMMAND_AUTHORITY_V1', 'US_DELEGATION_CHAIN_V1'],
    );
    expect('US_CHECKPOINT_ADMISSIBILITY_V1', 'domain', 'admitted', ['US_LOAC_COMPLIANCE_V1', 'US_COMMAND_AUTHORITY_V1']);
    expect('US_SEARCH_AND_SEIZURE_V1', 'domain', 'admitted', ['US_LOAC_COMPLIANCE_V1', 'US_COMMAND_AUTHORITY_V1']);
    expect('US_DETENTION_HANDLING_V1', 'domain', 'admitted', ['US_LOAC_COMPLIANCE_V1', 'US_PROTECTED_PERSON_STATE_V1']);
    expect('US_NO_FLY_ZONE_V1', 'overlay', 'admitted', ['US_AIRSPACE_CONTROL_V1'], 'targeting_refinement', 'airspace', 'jurisdictional');
    expect('US_TARGET_APPROVAL_V1', 'overlay', 'admitted', ['US_AIRSPACE_CONTROL_V1', 'US_LOAC_COMPLIANCE_V1'], 'targeting_refinement', 'authority', 'jurisdictional');
    expect('US_COLLATERAL_DAMAGE_ASSESSMENT_V1', 'overlay', 'admitted', ['US_LOAC_COMPLIANCE_V1', 'US_PROTECTED_SITE_V1'], 'targeting_refinement', 'civilian_harm', 'jurisdictional');
    expect('US_HOSPITAL_PROTECTION_V1', 'overlay', 'admitted', ['US_PROTECTED_SITE_V1', 'US_MEDICAL_PROTECTION_V1'], 'protection', 'site', 'jurisdictional');
    expect('US_SCHOOL_ZONE_RESTRICTION_V1', 'overlay', 'admitted', ['US_PROTECTED_SITE_V1', 'US_CIVILIAN_SCHOOL_PROTECTION_V1'], 'protection', 'site', 'jurisdictional');
    expect('US_RELIGIOUS_SITE_PROTECTION_V1', 'overlay', 'admitted', ['US_PROTECTED_SITE_V1'], 'protection', 'site', 'jurisdictional');
    expect('US_CULTURAL_PROPERTY_PROTECTION_V1', 'overlay', 'admitted', ['US_PROTECTED_SITE_V1'], 'protection', 'site', 'jurisdictional');
    expect('US_AID_DELIVERY_SECURITY_V1', 'overlay', 'admitted', ['US_LOAC_COMPLIANCE_V1', 'US_PROTECTED_SITE_V1'], 'operational_condition', 'mission_route', 'jurisdictional');
    expect('US_EVACUATION_ROUTE_V1', 'overlay', 'admitted', ['US_LOAC_COMPLIANCE_V1', 'US_PROTECTED_SITE_V1'], 'operational_condition', 'mission_route', 'jurisdictional');
    expect('US_NIGHT_OPERATION_V1', 'overlay', 'admitted', ['US_LOAC_COMPLIANCE_V1'], 'operational_condition', 'environment', 'jurisdictional');
    expect('US_WEATHER_LIMITATION_V1', 'overlay', 'admitted', ['US_AIRSPACE_CONTROL_V1', 'US_GROUND_MANEUVER_V1', 'US_MARITIME_VBSS_V1'], 'operational_condition', 'environment', 'jurisdictional');
    expect('US_SIGNAL_INTERFERENCE_V1', 'overlay', 'admitted', ['US_LOAC_COMPLIANCE_V1', 'US_COMMAND_AUTHORITY_V1'], 'operational_condition', 'environment', 'jurisdictional');
    expect('US_ISR_RETENTION_V1', 'overlay', 'admitted', ['US_COALITION_INTEROP_V1', 'US_COMMAND_AUTHORITY_V1'], 'retention', 'surveillance_retention', 'jurisdictional');
    expect('US_WEAPON_STATUS_V1', 'overlay', 'admitted', ['US_LOAC_COMPLIANCE_V1', 'US_COMMAND_AUTHORITY_V1'], 'operational_condition', 'equipment_state', 'jurisdictional');
    expect('US_ALLIED_ROE_MERGE_V1', 'overlay', 'admitted', ['US_COALITION_INTEROP_V1'], 'coalition_merge', 'coalition', 'jurisdictional');
    expect('UK_AIRSPACE_CONTROL_V1', 'domain', 'admitted', [
      'UK_ROE_BASE_V1',
      'UK_COMMAND_AUTHORITY_V1',
      'UK_DELEGATION_CHAIN_V1',
    ]);
    expect('UK_GROUND_MANEUVER_V1', 'domain', 'admitted', [
      'UK_ROE_BASE_V1',
      'UK_COMMAND_AUTHORITY_V1',
      'UK_DELEGATION_CHAIN_V1',
    ]);
    expect('CA_NATIONAL_BASE_V1', 'foundation', 'admitted', ['INTL_LOAC_BASE_V1']);
    expect('CA_ROE_BASE_V1', 'foundation', 'admitted', ['CA_NATIONAL_BASE_V1']);
    expect('CA_COMMAND_AUTHORITY_V1', 'foundation', 'admitted', ['CA_ROE_BASE_V1']);
    expect('CA_DELEGATION_CHAIN_V1', 'foundation', 'admitted', ['CA_COMMAND_AUTHORITY_V1']);
    expect('CA_AIRSPACE_CONTROL_V1', 'domain', 'admitted', [
      'CA_ROE_BASE_V1',
      'CA_COMMAND_AUTHORITY_V1',
      'CA_DELEGATION_CHAIN_V1',
    ]);
    expect('AU_NATIONAL_BASE_V1', 'foundation', 'admitted', ['INTL_LOAC_BASE_V1']);
    expect('AU_ROE_BASE_V1', 'foundation', 'admitted', ['AU_NATIONAL_BASE_V1']);
    expect('AU_COMMAND_AUTHORITY_V1', 'foundation', 'admitted', ['AU_ROE_BASE_V1']);
    expect('AU_DELEGATION_CHAIN_V1', 'foundation', 'admitted', ['AU_COMMAND_AUTHORITY_V1']);
    expect('AU_AIRSPACE_CONTROL_V1', 'domain', 'admitted', [
      'AU_ROE_BASE_V1',
      'AU_COMMAND_AUTHORITY_V1',
      'AU_DELEGATION_CHAIN_V1',
    ]);
    expect('NL_NATIONAL_BASE_V1', 'foundation', 'admitted', ['INTL_LOAC_BASE_V1']);
    expect('NL_ROE_BASE_V1', 'foundation', 'admitted', ['NL_NATIONAL_BASE_V1']);
    expect('NL_COMMAND_AUTHORITY_V1', 'foundation', 'admitted', ['NL_ROE_BASE_V1']);
    expect('NL_DELEGATION_CHAIN_V1', 'foundation', 'admitted', ['NL_COMMAND_AUTHORITY_V1']);
    expect('NL_AIRSPACE_CONTROL_V1', 'domain', 'admitted', [
      'NL_ROE_BASE_V1',
      'NL_COMMAND_AUTHORITY_V1',
      'NL_DELEGATION_CHAIN_V1',
    ]);
    expect('TR_NATIONAL_BASE_V1', 'foundation', 'admitted', ['INTL_LOAC_BASE_V1']);
    expect('TR_ROE_BASE_V1', 'foundation', 'admitted', ['TR_NATIONAL_BASE_V1']);
    expect('TR_COMMAND_AUTHORITY_V1', 'foundation', 'admitted', ['TR_ROE_BASE_V1']);
    expect('TR_DELEGATION_CHAIN_V1', 'foundation', 'admitted', ['TR_COMMAND_AUTHORITY_V1']);
    expect('TR_AIRSPACE_CONTROL_V1', 'domain', 'admitted', [
      'TR_ROE_BASE_V1',
      'TR_COMMAND_AUTHORITY_V1',
      'TR_DELEGATION_CHAIN_V1',
    ]);
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

test('duplicate registry packId fails validation and discovery fails closed', () => {
  const root = makeTempRoot();
  try {
    copyPackArtifactsWithRegistry(root);

    const registryPath = path.join(root, 'pack-registry.json');
    const registry = readJson(registryPath);
    duplicateRegistryEntry(registry, (entry) => entry.packId === 'US_CORE_V1', (entry) => {
      entry.kind = 'overlay';
      entry.status = 'planned';
      entry.notes = 'duplicate packId should not be discoverable';
    });
    fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

    const validation = validatePackRegistry(registry);
    assert.equal(validation.valid, false);
    assert.equal(validation.reasonCode, 'POLICY_BUNDLE_INVALID');
    assert.match(validation.errors.join('\n'), /duplicate registry packId/i);

    const packs = listReferencePacks({ rootDir: root });
    assert.deepEqual(packs, []);
  } finally {
    cleanupRoot(root);
  }
});

test('duplicate manifestPackId fails validation and discovery fails closed', () => {
  const root = makeTempRoot();
  try {
    copyPackArtifactsWithRegistry(root);

    const registryPath = path.join(root, 'pack-registry.json');
    const registry = readJson(registryPath);
    duplicateRegistryEntry(registry, (entry) => entry.packId === 'US_CORE_V1', (entry) => {
      entry.packId = 'US_CORE_V1_DUPLICATE';
      entry.kind = 'overlay';
      entry.status = 'planned';
      entry.notes = 'duplicate manifestPackId should not be discoverable';
    });
    fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

    const validation = validatePackRegistry(registry);
    assert.equal(validation.valid, false);
    assert.equal(validation.reasonCode, 'POLICY_BUNDLE_INVALID');
    assert.match(validation.errors.join('\n'), /duplicate registry manifestPackId/i);

    const packs = listReferencePacks({ rootDir: root });
    assert.deepEqual(packs, []);
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

test('explicit authorityGraphId does not fall back to a jurisdiction graph', () => {
  const root = makePackRoot();
  try {
    const manifestPath = path.join(root, 'reference-pack-manifest.json');
    const manifest = readJson(manifestPath);
    manifest.authorityGraphId = 'AUTH-GRAPH-DOES-NOT-EXIST';
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    const validation = validateReferencePack({
      rootDir: root,
      manifestPath,
    });

    assert.equal(validation.valid, false);
    assert.equal(validation.reasonCode, 'POLICY_BUNDLE_INVALID');
    assert.match(validation.errors.join('\n'), /authority graph could not be resolved/i);
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
