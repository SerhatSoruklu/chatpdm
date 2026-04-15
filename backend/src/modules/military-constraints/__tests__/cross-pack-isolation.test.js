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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function removeNonPack1Manifests(targetRoot) {
  const manifestPath = path.join(targetRoot, 'reference-pack-manifest.maritime-vbss.json');
  if (fs.existsSync(manifestPath)) {
    fs.rmSync(manifestPath, { force: true });
  }

  const medicalManifestPath = path.join(targetRoot, 'reference-pack-manifest.medical-protection.json');
  if (fs.existsSync(medicalManifestPath)) {
    fs.rmSync(medicalManifestPath, { force: true });
  }

  const civilianSchoolManifestPath = path.join(targetRoot, 'reference-pack-manifest.civilian-school-protection.json');
  if (fs.existsSync(civilianSchoolManifestPath)) {
    fs.rmSync(civilianSchoolManifestPath, { force: true });
  }

  const protectedPersonManifestPath = path.join(targetRoot, 'reference-pack-manifest.protected-person.json');
  if (fs.existsSync(protectedPersonManifestPath)) {
    fs.rmSync(protectedPersonManifestPath, { force: true });
  }
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

    assert.deepEqual(packs[0].dependsOn, []);
    assert.equal(packs[0].kind, 'foundation');
    assert.equal(packs[1].kind, 'foundation');
    assert.equal(packs[2].kind, 'domain');
    assert.equal(packs[3].kind, 'overlay');
    assert.equal(packs[4].kind, 'overlay');
    assert.equal(packs[7].kind, 'foundation');
    assert.equal(packs[8].kind, 'foundation');
    assert.equal(packs[9].kind, 'foundation');
    assert.equal(packs[10].kind, 'foundation');
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
  } finally {
    cleanupRoot(root);
  }
});

test('Pack 1 outputs stay unchanged when Pack 2, Pack 3, Pack 4, and Pack 5 are present', () => {
  const pack1Root = makeTempRoot();
  const packBothRoot = makeTempRoot();
  const pack1ArtifactRoot = makeArtifactRoot();
  const packBothArtifactRoot = makeArtifactRoot();

  try {
    copyModuleRoot(pack1Root);
    copyModuleRoot(packBothRoot);
    removeNonPack1Manifests(pack1Root);

    const pack1OnlyRelease = releaseReferencePack({
      rootDir: pack1Root,
      manifestPath: path.join(pack1Root, 'reference-pack-manifest.json'),
      artifactRoot: pack1ArtifactRoot,
    });
    const pack1WithPack2Release = releaseReferencePack({
      rootDir: packBothRoot,
      manifestPath: path.join(packBothRoot, 'reference-pack-manifest.json'),
      artifactRoot: packBothArtifactRoot,
    });

    assert.equal(pack1OnlyRelease.valid, true, pack1OnlyRelease.errors.join('\n'));
    assert.equal(pack1WithPack2Release.valid, true, pack1WithPack2Release.errors.join('\n'));
    assert.equal(pack1OnlyRelease.summary.release.bundleHash, pack1WithPack2Release.summary.release.bundleHash);
    assert.deepEqual(
      pack1OnlyRelease.summary.release.regressionSummary.caseResults,
      pack1WithPack2Release.summary.release.regressionSummary.caseResults,
    );
  } finally {
    cleanupRoot(pack1Root);
    cleanupRoot(packBothRoot);
    cleanupRoot(pack1ArtifactRoot);
    cleanupRoot(packBothArtifactRoot);
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
    assert.equal(heartbeat.summary.packCount, 31);
    assert.equal(heartbeat.summary.packSummaries.length, 31);
    assert.deepEqual(heartbeat.summary.packSummaries.map((entry) => entry.packId), [
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

    const release = releaseAllReferencePacks({
      rootDir: root,
      artifactRoot,
    });
    assert.equal(release.valid, true, release.errors.join('\n'));
    assert.equal(release.summary.packCount, 31);
    assert.equal(release.summary.packSummaries.length, 31);
    assert.deepEqual(release.summary.packSummaries.map((entry) => entry.packId), [
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

    const pack2Manifest = path.join(artifactRoot, 'mil-us-maritime-vbss-core-v0.1.0', '0.1.0', 'manifest.json');
    const pack2Bundle = path.join(artifactRoot, 'mil-us-maritime-vbss-core-v0.1.0', '0.1.0', 'bundle.json');
    const pack2ReleaseFile = path.join(artifactRoot, 'mil-us-maritime-vbss-core-v0.1.0', '0.1.0', 'release.json');
    const pack2RegressionSummary = path.join(artifactRoot, 'mil-us-maritime-vbss-core-v0.1.0', '0.1.0', 'regression-summary.json');
    const pack3Manifest = path.join(artifactRoot, 'mil-us-medical-protection-core-v0.1.0', '0.1.0', 'manifest.json');
    const pack3Bundle = path.join(artifactRoot, 'mil-us-medical-protection-core-v0.1.0', '0.1.0', 'bundle.json');
    const pack3ReleaseFile = path.join(artifactRoot, 'mil-us-medical-protection-core-v0.1.0', '0.1.0', 'release.json');
    const pack3RegressionSummary = path.join(artifactRoot, 'mil-us-medical-protection-core-v0.1.0', '0.1.0', 'regression-summary.json');
    const pack4Manifest = path.join(artifactRoot, 'mil-us-civilian-school-protection-core-v0.1.0', '0.1.0', 'manifest.json');
    const pack4Bundle = path.join(artifactRoot, 'mil-us-civilian-school-protection-core-v0.1.0', '0.1.0', 'bundle.json');
    const pack4ReleaseFile = path.join(artifactRoot, 'mil-us-civilian-school-protection-core-v0.1.0', '0.1.0', 'release.json');
    const pack4RegressionSummary = path.join(artifactRoot, 'mil-us-civilian-school-protection-core-v0.1.0', '0.1.0', 'regression-summary.json');
    const pack5Manifest = path.join(artifactRoot, 'mil-us-protected-person-state-core-v0.1.0', '0.1.0', 'manifest.json');
    const pack5Bundle = path.join(artifactRoot, 'mil-us-protected-person-state-core-v0.1.0', '0.1.0', 'bundle.json');
    const pack5ReleaseFile = path.join(artifactRoot, 'mil-us-protected-person-state-core-v0.1.0', '0.1.0', 'release.json');
    const pack5RegressionSummary = path.join(artifactRoot, 'mil-us-protected-person-state-core-v0.1.0', '0.1.0', 'regression-summary.json');
    const pack6Manifest = path.join(artifactRoot, 'US_RULES_OF_ENGAGEMENT_BASE_V1', '0.1.0', 'manifest.json');
    const pack6Bundle = path.join(artifactRoot, 'US_RULES_OF_ENGAGEMENT_BASE_V1', '0.1.0', 'bundle.json');
    const pack6ReleaseFile = path.join(artifactRoot, 'US_RULES_OF_ENGAGEMENT_BASE_V1', '0.1.0', 'release.json');
    const pack6RegressionSummary = path.join(artifactRoot, 'US_RULES_OF_ENGAGEMENT_BASE_V1', '0.1.0', 'regression-summary.json');
    const pack7Manifest = path.join(artifactRoot, 'US_LOAC_COMPLIANCE_V1', '0.1.0', 'manifest.json');
    const pack7Bundle = path.join(artifactRoot, 'US_LOAC_COMPLIANCE_V1', '0.1.0', 'bundle.json');
    const pack7ReleaseFile = path.join(artifactRoot, 'US_LOAC_COMPLIANCE_V1', '0.1.0', 'release.json');
    const pack7RegressionSummary = path.join(artifactRoot, 'US_LOAC_COMPLIANCE_V1', '0.1.0', 'regression-summary.json');
    const pack8Manifest = path.join(artifactRoot, 'US_COMMAND_AUTHORITY_V1', '0.1.0', 'manifest.json');
    const pack8Bundle = path.join(artifactRoot, 'US_COMMAND_AUTHORITY_V1', '0.1.0', 'bundle.json');
    const pack8ReleaseFile = path.join(artifactRoot, 'US_COMMAND_AUTHORITY_V1', '0.1.0', 'release.json');
    const pack8RegressionSummary = path.join(artifactRoot, 'US_COMMAND_AUTHORITY_V1', '0.1.0', 'regression-summary.json');
    const pack9Manifest = path.join(artifactRoot, 'US_DELEGATION_CHAIN_V1', '0.1.0', 'manifest.json');
    const pack9Bundle = path.join(artifactRoot, 'US_DELEGATION_CHAIN_V1', '0.1.0', 'bundle.json');
    const pack9ReleaseFile = path.join(artifactRoot, 'US_DELEGATION_CHAIN_V1', '0.1.0', 'release.json');
    const pack9RegressionSummary = path.join(artifactRoot, 'US_DELEGATION_CHAIN_V1', '0.1.0', 'regression-summary.json');
    const pack10Manifest = path.join(artifactRoot, 'US_PROTECTED_SITE_V1', '0.1.0', 'manifest.json');
    const pack10Bundle = path.join(artifactRoot, 'US_PROTECTED_SITE_V1', '0.1.0', 'bundle.json');
    const pack10ReleaseFile = path.join(artifactRoot, 'US_PROTECTED_SITE_V1', '0.1.0', 'release.json');
    const pack10RegressionSummary = path.join(artifactRoot, 'US_PROTECTED_SITE_V1', '0.1.0', 'regression-summary.json');
    const pack11Manifest = path.join(artifactRoot, 'US_COALITION_INTEROP_V1', '0.1.0', 'manifest.json');
    const pack11Bundle = path.join(artifactRoot, 'US_COALITION_INTEROP_V1', '0.1.0', 'bundle.json');
    const pack11ReleaseFile = path.join(artifactRoot, 'US_COALITION_INTEROP_V1', '0.1.0', 'release.json');
    const pack11RegressionSummary = path.join(artifactRoot, 'US_COALITION_INTEROP_V1', '0.1.0', 'regression-summary.json');
    const pack12Manifest = path.join(artifactRoot, 'US_AIRSPACE_CONTROL_V1', '0.1.0', 'manifest.json');
    const pack12Bundle = path.join(artifactRoot, 'US_AIRSPACE_CONTROL_V1', '0.1.0', 'bundle.json');
    const pack12ReleaseFile = path.join(artifactRoot, 'US_AIRSPACE_CONTROL_V1', '0.1.0', 'release.json');
    const pack12RegressionSummary = path.join(artifactRoot, 'US_AIRSPACE_CONTROL_V1', '0.1.0', 'regression-summary.json');
    const pack13Manifest = path.join(artifactRoot, 'US_GROUND_MANEUVER_V1', '0.1.0', 'manifest.json');
    const pack13Bundle = path.join(artifactRoot, 'US_GROUND_MANEUVER_V1', '0.1.0', 'bundle.json');
    const pack13ReleaseFile = path.join(artifactRoot, 'US_GROUND_MANEUVER_V1', '0.1.0', 'release.json');
    const pack13RegressionSummary = path.join(artifactRoot, 'US_GROUND_MANEUVER_V1', '0.1.0', 'regression-summary.json');
    const pack14Manifest = path.join(artifactRoot, 'US_CHECKPOINT_ADMISSIBILITY_V1', '0.1.0', 'manifest.json');
    const pack14Bundle = path.join(artifactRoot, 'US_CHECKPOINT_ADMISSIBILITY_V1', '0.1.0', 'bundle.json');
    const pack14ReleaseFile = path.join(artifactRoot, 'US_CHECKPOINT_ADMISSIBILITY_V1', '0.1.0', 'release.json');
    const pack14RegressionSummary = path.join(artifactRoot, 'US_CHECKPOINT_ADMISSIBILITY_V1', '0.1.0', 'regression-summary.json');
    const pack15Manifest = path.join(artifactRoot, 'US_SEARCH_AND_SEIZURE_V1', '0.1.0', 'manifest.json');
    const pack15Bundle = path.join(artifactRoot, 'US_SEARCH_AND_SEIZURE_V1', '0.1.0', 'bundle.json');
    const pack15ReleaseFile = path.join(artifactRoot, 'US_SEARCH_AND_SEIZURE_V1', '0.1.0', 'release.json');
    const pack15RegressionSummary = path.join(artifactRoot, 'US_SEARCH_AND_SEIZURE_V1', '0.1.0', 'regression-summary.json');
    const pack16Manifest = path.join(artifactRoot, 'US_DETENTION_HANDLING_V1', '0.1.0', 'manifest.json');
    const pack16Bundle = path.join(artifactRoot, 'US_DETENTION_HANDLING_V1', '0.1.0', 'bundle.json');
    const pack16ReleaseFile = path.join(artifactRoot, 'US_DETENTION_HANDLING_V1', '0.1.0', 'release.json');
    const pack16RegressionSummary = path.join(artifactRoot, 'US_DETENTION_HANDLING_V1', '0.1.0', 'regression-summary.json');
    const pack17Manifest = path.join(artifactRoot, 'US_NO_FLY_ZONE_V1', '0.1.0', 'manifest.json');
    const pack17Bundle = path.join(artifactRoot, 'US_NO_FLY_ZONE_V1', '0.1.0', 'bundle.json');
    const pack17ReleaseFile = path.join(artifactRoot, 'US_NO_FLY_ZONE_V1', '0.1.0', 'release.json');
    const pack17RegressionSummary = path.join(artifactRoot, 'US_NO_FLY_ZONE_V1', '0.1.0', 'regression-summary.json');
    const pack18Manifest = path.join(artifactRoot, 'US_TARGET_APPROVAL_V1', '0.1.0', 'manifest.json');
    const pack18Bundle = path.join(artifactRoot, 'US_TARGET_APPROVAL_V1', '0.1.0', 'bundle.json');
    const pack18ReleaseFile = path.join(artifactRoot, 'US_TARGET_APPROVAL_V1', '0.1.0', 'release.json');
    const pack18RegressionSummary = path.join(artifactRoot, 'US_TARGET_APPROVAL_V1', '0.1.0', 'regression-summary.json');
    const pack19Manifest = path.join(artifactRoot, 'US_COLLATERAL_DAMAGE_ASSESSMENT_V1', '0.1.0', 'manifest.json');
    const pack19Bundle = path.join(artifactRoot, 'US_COLLATERAL_DAMAGE_ASSESSMENT_V1', '0.1.0', 'bundle.json');
    const pack19ReleaseFile = path.join(artifactRoot, 'US_COLLATERAL_DAMAGE_ASSESSMENT_V1', '0.1.0', 'release.json');
    const pack19RegressionSummary = path.join(artifactRoot, 'US_COLLATERAL_DAMAGE_ASSESSMENT_V1', '0.1.0', 'regression-summary.json');

    assert.ok(fs.existsSync(pack2Manifest), 'Expected Pack 2 manifest artifact.');
    assert.ok(fs.existsSync(pack2Bundle), 'Expected Pack 2 bundle artifact.');
    assert.ok(fs.existsSync(pack2ReleaseFile), 'Expected Pack 2 release artifact.');
    assert.ok(fs.existsSync(pack2RegressionSummary), 'Expected Pack 2 regression summary artifact.');
    assert.ok(fs.existsSync(pack3Manifest), 'Expected Pack 3 manifest artifact.');
    assert.ok(fs.existsSync(pack3Bundle), 'Expected Pack 3 bundle artifact.');
    assert.ok(fs.existsSync(pack3ReleaseFile), 'Expected Pack 3 release artifact.');
    assert.ok(fs.existsSync(pack3RegressionSummary), 'Expected Pack 3 regression summary artifact.');
    assert.ok(fs.existsSync(pack4Manifest), 'Expected Pack 4 manifest artifact.');
    assert.ok(fs.existsSync(pack4Bundle), 'Expected Pack 4 bundle artifact.');
    assert.ok(fs.existsSync(pack4ReleaseFile), 'Expected Pack 4 release artifact.');
    assert.ok(fs.existsSync(pack4RegressionSummary), 'Expected Pack 4 regression summary artifact.');
    assert.ok(fs.existsSync(pack5Manifest), 'Expected Pack 5 manifest artifact.');
    assert.ok(fs.existsSync(pack5Bundle), 'Expected Pack 5 bundle artifact.');
    assert.ok(fs.existsSync(pack5ReleaseFile), 'Expected Pack 5 release artifact.');
    assert.ok(fs.existsSync(pack5RegressionSummary), 'Expected Pack 5 regression summary artifact.');
    assert.ok(fs.existsSync(pack6Manifest), 'Expected Pack 6 manifest artifact.');
    assert.ok(fs.existsSync(pack6Bundle), 'Expected Pack 6 bundle artifact.');
    assert.ok(fs.existsSync(pack6ReleaseFile), 'Expected Pack 6 release artifact.');
    assert.ok(fs.existsSync(pack6RegressionSummary), 'Expected Pack 6 regression summary artifact.');
    assert.ok(fs.existsSync(pack7Manifest), 'Expected Pack 7 manifest artifact.');
    assert.ok(fs.existsSync(pack7Bundle), 'Expected Pack 7 bundle artifact.');
    assert.ok(fs.existsSync(pack7ReleaseFile), 'Expected Pack 7 release artifact.');
    assert.ok(fs.existsSync(pack7RegressionSummary), 'Expected Pack 7 regression summary artifact.');
    assert.ok(fs.existsSync(pack8Manifest), 'Expected Pack 8 manifest artifact.');
    assert.ok(fs.existsSync(pack8Bundle), 'Expected Pack 8 bundle artifact.');
    assert.ok(fs.existsSync(pack8ReleaseFile), 'Expected Pack 8 release artifact.');
    assert.ok(fs.existsSync(pack8RegressionSummary), 'Expected Pack 8 regression summary artifact.');
    assert.ok(fs.existsSync(pack9Manifest), 'Expected Pack 9 manifest artifact.');
    assert.ok(fs.existsSync(pack9Bundle), 'Expected Pack 9 bundle artifact.');
    assert.ok(fs.existsSync(pack9ReleaseFile), 'Expected Pack 9 release artifact.');
    assert.ok(fs.existsSync(pack9RegressionSummary), 'Expected Pack 9 regression summary artifact.');
    assert.ok(fs.existsSync(pack10Manifest), 'Expected Pack 10 manifest artifact.');
    assert.ok(fs.existsSync(pack10Bundle), 'Expected Pack 10 bundle artifact.');
    assert.ok(fs.existsSync(pack10ReleaseFile), 'Expected Pack 10 release artifact.');
    assert.ok(fs.existsSync(pack10RegressionSummary), 'Expected Pack 10 regression summary artifact.');
    assert.ok(fs.existsSync(pack11Manifest), 'Expected Pack 11 manifest artifact.');
    assert.ok(fs.existsSync(pack11Bundle), 'Expected Pack 11 bundle artifact.');
    assert.ok(fs.existsSync(pack11ReleaseFile), 'Expected Pack 11 release artifact.');
    assert.ok(fs.existsSync(pack11RegressionSummary), 'Expected Pack 11 regression summary artifact.');
    assert.ok(fs.existsSync(pack12Manifest), 'Expected Pack 12 manifest artifact.');
    assert.ok(fs.existsSync(pack12Bundle), 'Expected Pack 12 bundle artifact.');
    assert.ok(fs.existsSync(pack12ReleaseFile), 'Expected Pack 12 release artifact.');
    assert.ok(fs.existsSync(pack12RegressionSummary), 'Expected Pack 12 regression summary artifact.');
    assert.ok(fs.existsSync(pack13Manifest), 'Expected Pack 13 manifest artifact.');
    assert.ok(fs.existsSync(pack13Bundle), 'Expected Pack 13 bundle artifact.');
    assert.ok(fs.existsSync(pack13ReleaseFile), 'Expected Pack 13 release artifact.');
    assert.ok(fs.existsSync(pack13RegressionSummary), 'Expected Pack 13 regression summary artifact.');
    assert.ok(fs.existsSync(pack14Manifest), 'Expected Pack 14 manifest artifact.');
    assert.ok(fs.existsSync(pack14Bundle), 'Expected Pack 14 bundle artifact.');
    assert.ok(fs.existsSync(pack14ReleaseFile), 'Expected Pack 14 release artifact.');
    assert.ok(fs.existsSync(pack14RegressionSummary), 'Expected Pack 14 regression summary artifact.');
    assert.ok(fs.existsSync(pack15Manifest), 'Expected Pack 15 manifest artifact.');
    assert.ok(fs.existsSync(pack15Bundle), 'Expected Pack 15 bundle artifact.');
    assert.ok(fs.existsSync(pack15ReleaseFile), 'Expected Pack 15 release artifact.');
    assert.ok(fs.existsSync(pack15RegressionSummary), 'Expected Pack 15 regression summary artifact.');
    assert.ok(fs.existsSync(pack16Manifest), 'Expected Pack 16 manifest artifact.');
    assert.ok(fs.existsSync(pack16Bundle), 'Expected Pack 16 bundle artifact.');
    assert.ok(fs.existsSync(pack16ReleaseFile), 'Expected Pack 16 release artifact.');
    assert.ok(fs.existsSync(pack16RegressionSummary), 'Expected Pack 16 regression summary artifact.');
    assert.ok(fs.existsSync(pack17Manifest), 'Expected Pack 17 manifest artifact.');
    assert.ok(fs.existsSync(pack17Bundle), 'Expected Pack 17 bundle artifact.');
    assert.ok(fs.existsSync(pack17ReleaseFile), 'Expected Pack 17 release artifact.');
    assert.ok(fs.existsSync(pack17RegressionSummary), 'Expected Pack 17 regression summary artifact.');
    assert.ok(fs.existsSync(pack18Manifest), 'Expected Pack 18 manifest artifact.');
    assert.ok(fs.existsSync(pack18Bundle), 'Expected Pack 18 bundle artifact.');
    assert.ok(fs.existsSync(pack18ReleaseFile), 'Expected Pack 18 release artifact.');
    assert.ok(fs.existsSync(pack18RegressionSummary), 'Expected Pack 18 regression summary artifact.');
    assert.ok(fs.existsSync(pack19Manifest), 'Expected Pack 19 manifest artifact.');
    assert.ok(fs.existsSync(pack19Bundle), 'Expected Pack 19 bundle artifact.');
    assert.ok(fs.existsSync(pack19ReleaseFile), 'Expected Pack 19 release artifact.');
    assert.ok(fs.existsSync(pack19RegressionSummary), 'Expected Pack 19 regression summary artifact.');

    const overlayWaveBArtifactPackIds = [
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
    ];

    overlayWaveBArtifactPackIds.forEach((packId) => {
      const manifestPath = path.join(artifactRoot, packId, '0.1.0', 'manifest.json');
      const bundlePath = path.join(artifactRoot, packId, '0.1.0', 'bundle.json');
      const releasePath = path.join(artifactRoot, packId, '0.1.0', 'release.json');
      const regressionPath = path.join(artifactRoot, packId, '0.1.0', 'regression-summary.json');

      assert.ok(fs.existsSync(manifestPath), `Expected ${packId} manifest artifact.`);
      assert.ok(fs.existsSync(bundlePath), `Expected ${packId} bundle artifact.`);
      assert.ok(fs.existsSync(releasePath), `Expected ${packId} release artifact.`);
      assert.ok(fs.existsSync(regressionPath), `Expected ${packId} regression summary artifact.`);
    });

    const bundle = readJson(pack2Bundle);
    assert.equal(bundle.bundleHash, pack2Release.release.summary.release.bundleHash);

    const regressionSummary = readJson(pack2RegressionSummary);
    assert.equal(regressionSummary.totalCases, 2);
    assert.equal(regressionSummary.passedCases, 2);
    assert.equal(regressionSummary.failedCases, 0);

    const pack3RegressionSummaryData = readJson(pack3RegressionSummary);
    assert.equal(pack3RegressionSummaryData.totalCases, 4);
    assert.equal(pack3RegressionSummaryData.passedCases, 4);
    assert.equal(pack3RegressionSummaryData.failedCases, 0);

    const pack4RegressionSummaryData = readJson(pack4RegressionSummary);
    assert.equal(pack4RegressionSummaryData.totalCases, 4);
    assert.equal(pack4RegressionSummaryData.passedCases, 4);
    assert.equal(pack4RegressionSummaryData.failedCases, 0);

    const pack5RegressionSummaryData = readJson(pack5RegressionSummary);
    assert.equal(pack5RegressionSummaryData.totalCases, 6);
    assert.equal(pack5RegressionSummaryData.passedCases, 6);
    assert.equal(pack5RegressionSummaryData.failedCases, 0);

    const pack6Release = release.summary.packSummaries.find((entry) => entry.packId === 'US_RULES_OF_ENGAGEMENT_BASE_V1');
    const pack7Release = release.summary.packSummaries.find((entry) => entry.packId === 'US_LOAC_COMPLIANCE_V1');
    const pack8Release = release.summary.packSummaries.find((entry) => entry.packId === 'US_COMMAND_AUTHORITY_V1');
    const pack9Release = release.summary.packSummaries.find((entry) => entry.packId === 'US_DELEGATION_CHAIN_V1');
    const pack10Release = release.summary.packSummaries.find((entry) => entry.packId === 'US_PROTECTED_SITE_V1');
    const pack11Release = release.summary.packSummaries.find((entry) => entry.packId === 'US_COALITION_INTEROP_V1');
    const pack12Release = release.summary.packSummaries.find((entry) => entry.packId === 'US_AIRSPACE_CONTROL_V1');
    const pack13Release = release.summary.packSummaries.find((entry) => entry.packId === 'US_GROUND_MANEUVER_V1');
    const pack14Release = release.summary.packSummaries.find((entry) => entry.packId === 'US_CHECKPOINT_ADMISSIBILITY_V1');
    const pack15Release = release.summary.packSummaries.find((entry) => entry.packId === 'US_SEARCH_AND_SEIZURE_V1');
    const pack16Release = release.summary.packSummaries.find((entry) => entry.packId === 'US_DETENTION_HANDLING_V1');
    const pack17Release = release.summary.packSummaries.find((entry) => entry.packId === 'US_NO_FLY_ZONE_V1');
    const pack18Release = release.summary.packSummaries.find((entry) => entry.packId === 'US_TARGET_APPROVAL_V1');
    const pack19Release = release.summary.packSummaries.find((entry) => entry.packId === 'US_COLLATERAL_DAMAGE_ASSESSMENT_V1');
    assert.ok(pack6Release, 'Expected Pack 6 release summary.');
    assert.ok(pack7Release, 'Expected Pack 7 release summary.');
    assert.ok(pack8Release, 'Expected Pack 8 release summary.');
    assert.ok(pack9Release, 'Expected Pack 9 release summary.');
    assert.ok(pack10Release, 'Expected Pack 10 release summary.');
    assert.ok(pack11Release, 'Expected Pack 11 release summary.');
    assert.ok(pack12Release, 'Expected Pack 12 release summary.');
    assert.ok(pack13Release, 'Expected Pack 13 release summary.');
    assert.ok(pack14Release, 'Expected Pack 14 release summary.');
    assert.ok(pack15Release, 'Expected Pack 15 release summary.');
    assert.ok(pack16Release, 'Expected Pack 16 release summary.');
    assert.ok(pack17Release, 'Expected Pack 17 release summary.');
    assert.ok(pack18Release, 'Expected Pack 18 release summary.');
    assert.ok(pack19Release, 'Expected Pack 19 release summary.');

    const overlayWaveBReleasePackIds = [
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
    ];

    overlayWaveBReleasePackIds.forEach((packId) => {
      const releaseEntry = release.summary.packSummaries.find((entry) => entry.packId === packId);
      assert.ok(releaseEntry, `Expected ${packId} release summary.`);
      assert.equal(releaseEntry.release.summary.release.regressionSummary.totalCases, 3);
      assert.equal(releaseEntry.release.summary.release.regressionSummary.passedCases, 3);
      assert.equal(releaseEntry.release.summary.release.regressionSummary.failedCases, 0);
    });

    assert.equal(pack6Release.release.summary.release.regressionSummary.totalCases, 3);
    assert.equal(pack6Release.release.summary.release.regressionSummary.passedCases, 3);
    assert.equal(pack6Release.release.summary.release.regressionSummary.failedCases, 0);
    assert.equal(pack7Release.release.summary.release.regressionSummary.totalCases, 3);
    assert.equal(pack7Release.release.summary.release.regressionSummary.passedCases, 3);
    assert.equal(pack7Release.release.summary.release.regressionSummary.failedCases, 0);
    assert.equal(pack8Release.release.summary.release.regressionSummary.totalCases, 3);
    assert.equal(pack8Release.release.summary.release.regressionSummary.passedCases, 3);
    assert.equal(pack8Release.release.summary.release.regressionSummary.failedCases, 0);
    assert.equal(pack9Release.release.summary.release.regressionSummary.totalCases, 3);
    assert.equal(pack9Release.release.summary.release.regressionSummary.passedCases, 3);
    assert.equal(pack9Release.release.summary.release.regressionSummary.failedCases, 0);
    assert.equal(pack10Release.release.summary.release.regressionSummary.totalCases, 3);
    assert.equal(pack10Release.release.summary.release.regressionSummary.passedCases, 3);
    assert.equal(pack10Release.release.summary.release.regressionSummary.failedCases, 0);
    assert.equal(pack11Release.release.summary.release.regressionSummary.totalCases, 3);
    assert.equal(pack11Release.release.summary.release.regressionSummary.passedCases, 3);
    assert.equal(pack11Release.release.summary.release.regressionSummary.failedCases, 0);
    assert.equal(pack12Release.release.summary.release.regressionSummary.totalCases, 3);
    assert.equal(pack12Release.release.summary.release.regressionSummary.passedCases, 3);
    assert.equal(pack12Release.release.summary.release.regressionSummary.failedCases, 0);
    assert.equal(pack13Release.release.summary.release.regressionSummary.totalCases, 3);
    assert.equal(pack13Release.release.summary.release.regressionSummary.passedCases, 3);
    assert.equal(pack13Release.release.summary.release.regressionSummary.failedCases, 0);
    assert.equal(pack14Release.release.summary.release.regressionSummary.totalCases, 3);
    assert.equal(pack14Release.release.summary.release.regressionSummary.passedCases, 3);
    assert.equal(pack14Release.release.summary.release.regressionSummary.failedCases, 0);
    assert.equal(pack15Release.release.summary.release.regressionSummary.totalCases, 3);
    assert.equal(pack15Release.release.summary.release.regressionSummary.passedCases, 3);
    assert.equal(pack15Release.release.summary.release.regressionSummary.failedCases, 0);
    assert.equal(pack16Release.release.summary.release.regressionSummary.totalCases, 3);
    assert.equal(pack16Release.release.summary.release.regressionSummary.passedCases, 3);
    assert.equal(pack16Release.release.summary.release.regressionSummary.failedCases, 0);
    assert.equal(pack17Release.release.summary.release.regressionSummary.totalCases, 3);
    assert.equal(pack17Release.release.summary.release.regressionSummary.passedCases, 3);
    assert.equal(pack17Release.release.summary.release.regressionSummary.failedCases, 0);
    assert.equal(pack18Release.release.summary.release.regressionSummary.totalCases, 3);
    assert.equal(pack18Release.release.summary.release.regressionSummary.passedCases, 3);
    assert.equal(pack18Release.release.summary.release.regressionSummary.failedCases, 0);
    assert.equal(pack19Release.release.summary.release.regressionSummary.totalCases, 3);
    assert.equal(pack19Release.release.summary.release.regressionSummary.passedCases, 3);
    assert.equal(pack19Release.release.summary.release.regressionSummary.failedCases, 0);
  } finally {
    cleanupRoot(root);
    cleanupRoot(artifactRoot);
  }
});
