'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  listReferencePacks,
} = require('../list-reference-packs');
const {
  releaseAllReferencePacks,
  releaseReferencePack,
  runAllMilitaryConstraintChecks,
} = require('../reference-pack-lifecycle');

const BASE_DIR = path.resolve(__dirname);
const MODULE_DIR = path.resolve(BASE_DIR, '..');

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'chatpdm-mc-cross-pack-'));
}

function cleanupRoot(rootDir) {
  fs.rmSync(rootDir, { recursive: true, force: true });
}

function copyModuleRoot(targetRoot) {
  fs.cpSync(MODULE_DIR, targetRoot, { recursive: true });
}

function makeArtifactRoot() {
  return makeTempRoot();
}

test('pack release order does not change bundle outputs', () => {
  const rootA = makeTempRoot();
  const rootB = makeTempRoot();
  const artifactA = makeArtifactRoot();
  const artifactB = makeArtifactRoot();

  try {
    copyModuleRoot(rootA);
    copyModuleRoot(rootB);
    const listA = listReferencePacks({ rootDir: rootA });
    const listB = listReferencePacks({ rootDir: rootB });

    assert.deepEqual(listA.map((entry) => entry.packId), listB.map((entry) => entry.packId));

    const pack1A = releaseReferencePack({
      rootDir: rootA,
      manifestPath: path.join(rootA, 'reference-pack-manifest.json'),
      artifactRoot: artifactA,
    });
    const pack2A = releaseReferencePack({
      rootDir: rootA,
      manifestPath: path.join(rootA, 'reference-pack-manifest.maritime-vbss.json'),
      artifactRoot: artifactA,
    });
    const pack3A = releaseReferencePack({
      rootDir: rootA,
      manifestPath: path.join(rootA, 'reference-pack-manifest.medical-protection.json'),
      artifactRoot: artifactA,
    });
    const pack4A = releaseReferencePack({
      rootDir: rootA,
      manifestPath: path.join(rootA, 'reference-pack-manifest.civilian-school-protection.json'),
      artifactRoot: artifactA,
    });
    const pack5A = releaseReferencePack({
      rootDir: rootA,
      manifestPath: path.join(rootA, 'reference-pack-manifest.protected-person.json'),
      artifactRoot: artifactA,
    });

    const pack3B = releaseReferencePack({
      rootDir: rootB,
      manifestPath: path.join(rootB, 'reference-pack-manifest.medical-protection.json'),
      artifactRoot: artifactB,
    });
    const pack4B = releaseReferencePack({
      rootDir: rootB,
      manifestPath: path.join(rootB, 'reference-pack-manifest.civilian-school-protection.json'),
      artifactRoot: artifactB,
    });
    const pack2B = releaseReferencePack({
      rootDir: rootB,
      manifestPath: path.join(rootB, 'reference-pack-manifest.maritime-vbss.json'),
      artifactRoot: artifactB,
    });
    const pack1B = releaseReferencePack({
      rootDir: rootB,
      manifestPath: path.join(rootB, 'reference-pack-manifest.json'),
      artifactRoot: artifactB,
    });
    const pack5B = releaseReferencePack({
      rootDir: rootB,
      manifestPath: path.join(rootB, 'reference-pack-manifest.protected-person.json'),
      artifactRoot: artifactB,
    });

    assert.equal(pack1A.valid, true, pack1A.errors.join('\n'));
    assert.equal(pack2A.valid, true, pack2A.errors.join('\n'));
    assert.equal(pack3A.valid, true, pack3A.errors.join('\n'));
    assert.equal(pack4A.valid, true, pack4A.errors.join('\n'));
    assert.equal(pack5A.valid, true, pack5A.errors.join('\n'));
    assert.equal(pack1B.valid, true, pack1B.errors.join('\n'));
    assert.equal(pack2B.valid, true, pack2B.errors.join('\n'));
    assert.equal(pack3B.valid, true, pack3B.errors.join('\n'));
    assert.equal(pack4B.valid, true, pack4B.errors.join('\n'));
    assert.equal(pack5B.valid, true, pack5B.errors.join('\n'));
    assert.equal(pack1A.summary.release.bundleHash, pack1B.summary.release.bundleHash);
    assert.equal(pack2A.summary.release.bundleHash, pack2B.summary.release.bundleHash);
    assert.equal(pack3A.summary.release.bundleHash, pack3B.summary.release.bundleHash);
    assert.equal(pack4A.summary.release.bundleHash, pack4B.summary.release.bundleHash);
    assert.equal(pack5A.summary.release.bundleHash, pack5B.summary.release.bundleHash);
    assert.deepEqual(pack1A.summary.release.provenance, pack1B.summary.release.provenance);
  } finally {
    cleanupRoot(rootA);
    cleanupRoot(rootB);
    cleanupRoot(artifactA);
    cleanupRoot(artifactB);
  }
});

test('registry-backed discovery keeps admitted packs in dependency order', () => {
  const root = makeTempRoot();

  try {
    copyModuleRoot(root);

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

    const byId = new Map(packs.map((entry) => [entry.packId, entry]));
    const expect = (packId, kind, status, dependsOn) => {
      const entry = byId.get(packId);
      assert.ok(entry, `Missing pack entry for ${packId}`);
      assert.equal(entry.kind, kind, `${packId} kind`);
      assert.equal(entry.status, status, `${packId} status`);
      assert.deepEqual(entry.dependsOn, dependsOn, `${packId} dependsOn`);
    };

    expect('INTL_LOAC_BASE_V1', 'foundation', 'admitted', []);
    expect('INTL_PROTECTED_PERSON_BASE_V1', 'foundation', 'admitted', ['INTL_LOAC_BASE_V1']);
    expect('INTL_PROTECTED_SITE_BASE_V1', 'foundation', 'admitted', ['INTL_LOAC_BASE_V1']);
    expect('UK_NATIONAL_BASE_V1', 'foundation', 'admitted', ['INTL_LOAC_BASE_V1']);
    expect('UK_ROE_BASE_V1', 'foundation', 'admitted', ['UK_NATIONAL_BASE_V1']);
    expect('UK_COMMAND_AUTHORITY_V1', 'foundation', 'admitted', ['UK_ROE_BASE_V1']);
    expect('UK_DELEGATION_CHAIN_V1', 'foundation', 'admitted', ['UK_COMMAND_AUTHORITY_V1']);
    expect('US_AIRSPACE_CONTROL_V1', 'domain', 'admitted', [
      'US_RULES_OF_ENGAGEMENT_BASE_V1',
      'US_LOAC_COMPLIANCE_V1',
      'US_COMMAND_AUTHORITY_V1',
      'US_DELEGATION_CHAIN_V1',
      'US_PROTECTED_SITE_V1',
    ]);
    expect('US_NO_FLY_ZONE_V1', 'overlay', 'admitted', ['US_AIRSPACE_CONTROL_V1']);
    expect('US_ALLIED_ROE_MERGE_V1', 'overlay', 'admitted', ['US_COALITION_INTEROP_V1']);
  } finally {
    cleanupRoot(root);
  }
});

test('heartbeat and release-grade pack flow succeed for all packs', () => {
  const root = makeTempRoot();
  const artifactRoot = makeArtifactRoot();

  try {
    copyModuleRoot(root);

    const heartbeat = runAllMilitaryConstraintChecks({
      rootDir: root,
    });
    assert.equal(heartbeat.valid, true, heartbeat.errors.join('\n'));
    assert.equal(heartbeat.summary.packCount, 63);
    assert.equal(heartbeat.summary.packSummaries.length, 63);
    assert.deepEqual(heartbeat.summary.packSummaries.map((entry) => entry.packId), [
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

    const release = releaseAllReferencePacks({
      rootDir: root,
      artifactRoot,
    });
    assert.equal(release.valid, true, release.errors.join('\n'));
    assert.equal(release.summary.packCount, 63);
    assert.equal(release.summary.packSummaries.length, 63);
    assert.deepEqual(release.summary.packSummaries.map((entry) => entry.packId), [
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

    release.summary.packSummaries.forEach((entry) => {
      const artifactDir = path.join(artifactRoot, entry.packId, entry.bundleVersion);
      assert.ok(fs.existsSync(path.join(artifactDir, 'manifest.json')), `Expected ${entry.packId} manifest artifact.`);
      assert.ok(fs.existsSync(path.join(artifactDir, 'bundle.json')), `Expected ${entry.packId} bundle artifact.`);
      assert.ok(fs.existsSync(path.join(artifactDir, 'release.json')), `Expected ${entry.packId} release artifact.`);
      assert.ok(fs.existsSync(path.join(artifactDir, 'regression-summary.json')), `Expected ${entry.packId} regression summary artifact.`);
    });

    const pack1Release = release.summary.packSummaries.find((entry) => entry.packId === 'mil-us-core-reference');
    const pack2Release = release.summary.packSummaries.find((entry) => entry.packId === 'mil-us-maritime-vbss-core-v0.1.0');
    const pack3Release = release.summary.packSummaries.find((entry) => entry.packId === 'mil-us-medical-protection-core-v0.1.0');
    const pack4Release = release.summary.packSummaries.find((entry) => entry.packId === 'mil-us-civilian-school-protection-core-v0.1.0');
    const pack5Release = release.summary.packSummaries.find((entry) => entry.packId === 'mil-us-protected-person-state-core-v0.1.0');
    assert.ok(pack1Release, 'Expected Pack 1 release summary.');
    assert.ok(pack2Release, 'Expected Pack 2 release summary.');
    assert.ok(pack3Release, 'Expected Pack 3 release summary.');
    assert.ok(pack4Release, 'Expected Pack 4 release summary.');
    assert.ok(pack5Release, 'Expected Pack 5 release summary.');
    assert.equal(pack2Release.release.summary.release.regressionSummary.totalCases, 2);
    assert.equal(pack2Release.release.summary.release.regressionSummary.passedCases, 2);
    assert.equal(pack2Release.release.summary.release.regressionSummary.failedCases, 0);
    assert.equal(pack3Release.release.summary.release.regressionSummary.totalCases, 4);
    assert.equal(pack3Release.release.summary.release.regressionSummary.passedCases, 4);
    assert.equal(pack3Release.release.summary.release.regressionSummary.failedCases, 0);
    assert.equal(pack4Release.release.summary.release.regressionSummary.totalCases, 4);
    assert.equal(pack4Release.release.summary.release.regressionSummary.passedCases, 4);
    assert.equal(pack4Release.release.summary.release.regressionSummary.failedCases, 0);
    assert.equal(pack5Release.release.summary.release.regressionSummary.totalCases, 6);
    assert.equal(pack5Release.release.summary.release.regressionSummary.passedCases, 6);
    assert.equal(pack5Release.release.summary.release.regressionSummary.failedCases, 0);
  } finally {
    cleanupRoot(root);
    cleanupRoot(artifactRoot);
  }
});
