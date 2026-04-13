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
