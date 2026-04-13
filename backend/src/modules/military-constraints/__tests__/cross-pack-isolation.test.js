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
  buildReferencePack,
} = require('../build-reference-pack');
const {
  releaseAllReferencePacks,
  releaseReferencePack,
  runAllMilitaryConstraintChecks,
} = require('../reference-pack-lifecycle');
const {
  runReferencePackRegression,
} = require('../run-reference-pack-regression');

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

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
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
    assert.equal(heartbeat.summary.packCount, 5);
    assert.equal(heartbeat.summary.packSummaries.length, 5);

    const release = releaseAllReferencePacks({
      rootDir: root,
      artifactRoot,
    });
    assert.equal(release.valid, true, release.errors.join('\n'));
    assert.equal(release.summary.packCount, 5);
    assert.equal(release.summary.packSummaries.length, 5);

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
  } finally {
    cleanupRoot(root);
    cleanupRoot(artifactRoot);
  }
});
