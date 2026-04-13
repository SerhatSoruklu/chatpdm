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

function removePack2Manifest(targetRoot) {
  const manifestPath = path.join(targetRoot, 'reference-pack-manifest.maritime-vbss.json');
  if (fs.existsSync(manifestPath)) {
    fs.rmSync(manifestPath, { force: true });
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

    assert.equal(pack1A.valid, true, pack1A.errors.join('\n'));
    assert.equal(pack2A.valid, true, pack2A.errors.join('\n'));
    assert.equal(pack1B.valid, true, pack1B.errors.join('\n'));
    assert.equal(pack2B.valid, true, pack2B.errors.join('\n'));
    assert.equal(pack1A.summary.release.bundleHash, pack1B.summary.release.bundleHash);
    assert.equal(pack2A.summary.release.bundleHash, pack2B.summary.release.bundleHash);
  } finally {
    cleanupRoot(rootA);
    cleanupRoot(rootB);
    cleanupRoot(artifactA);
    cleanupRoot(artifactB);
  }
});

test('Pack 1 outputs stay unchanged when Pack 2 is present', () => {
  const pack1Root = makeTempRoot();
  const packBothRoot = makeTempRoot();
  const pack1ArtifactRoot = makeArtifactRoot();
  const packBothArtifactRoot = makeArtifactRoot();

  try {
    copyModuleRoot(pack1Root);
    copyModuleRoot(packBothRoot);
    removePack2Manifest(pack1Root);

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

test('heartbeat and release-grade pack flow succeed for both packs', () => {
  const root = makeTempRoot();
  const artifactRoot = makeArtifactRoot();

  try {
    copyModuleRoot(root);

    const heartbeat = runAllMilitaryConstraintChecks({
      rootDir: root,
    });
    assert.equal(heartbeat.valid, true, heartbeat.errors.join('\n'));
    assert.equal(heartbeat.summary.packCount, 2);
    assert.equal(heartbeat.summary.packSummaries.length, 2);

    const release = releaseAllReferencePacks({
      rootDir: root,
      artifactRoot,
    });
    assert.equal(release.valid, true, release.errors.join('\n'));
    assert.equal(release.summary.packCount, 2);
    assert.equal(release.summary.packSummaries.length, 2);

    const pack1Release = release.summary.packSummaries.find((entry) => entry.packId === 'mil-us-core-reference');
    const pack2Release = release.summary.packSummaries.find((entry) => entry.packId === 'mil-us-maritime-vbss-core-v0.1.0');
    assert.ok(pack1Release, 'Expected Pack 1 release summary.');
    assert.ok(pack2Release, 'Expected Pack 2 release summary.');
    assert.equal(pack2Release.release.summary.release.regressionSummary.totalCases, 2);
    assert.equal(pack2Release.release.summary.release.regressionSummary.passedCases, 2);
    assert.equal(pack2Release.release.summary.release.regressionSummary.failedCases, 0);

    const pack2Manifest = path.join(artifactRoot, 'mil-us-maritime-vbss-core-v0.1.0', '0.1.0', 'manifest.json');
    const pack2Bundle = path.join(artifactRoot, 'mil-us-maritime-vbss-core-v0.1.0', '0.1.0', 'bundle.json');
    const pack2ReleaseFile = path.join(artifactRoot, 'mil-us-maritime-vbss-core-v0.1.0', '0.1.0', 'release.json');
    const pack2RegressionSummary = path.join(artifactRoot, 'mil-us-maritime-vbss-core-v0.1.0', '0.1.0', 'regression-summary.json');

    assert.ok(fs.existsSync(pack2Manifest), 'Expected Pack 2 manifest artifact.');
    assert.ok(fs.existsSync(pack2Bundle), 'Expected Pack 2 bundle artifact.');
    assert.ok(fs.existsSync(pack2ReleaseFile), 'Expected Pack 2 release artifact.');
    assert.ok(fs.existsSync(pack2RegressionSummary), 'Expected Pack 2 regression summary artifact.');

    const bundle = readJson(pack2Bundle);
    assert.equal(bundle.bundleHash, pack2Release.release.summary.release.bundleHash);

    const regressionSummary = readJson(pack2RegressionSummary);
    assert.equal(regressionSummary.totalCases, 2);
    assert.equal(regressionSummary.passedCases, 2);
    assert.equal(regressionSummary.failedCases, 0);
  } finally {
    cleanupRoot(root);
    cleanupRoot(artifactRoot);
  }
});
