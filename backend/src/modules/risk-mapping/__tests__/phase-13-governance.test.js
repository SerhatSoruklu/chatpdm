'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../../../app');
const { loadGovernanceManifest } = require('../governance/loadGovernanceManifest');
const { loadGovernanceReleaseBundle } = require('../governance/loadGovernanceReleaseBundle');
const { validateGovernanceManifest } = require('../governance/validateGovernanceManifest');
const { validateArtifactCompatibility } = require('../governance/validateArtifactCompatibility');
const { evaluateReleaseAdmission } = require('../governance/evaluateReleaseAdmission');
const { buildGovernanceReport } = require('../governance/buildGovernanceReport');
const { inspectRiskMapGovernanceReport } = require('../inspect/inspectRiskMapGovernanceReport');
const { inspectRiskMapArtifactDiff } = require('../inspect/inspectRiskMapArtifactDiff');
const { buildRegistryHashFromArtifacts } = require('../utils/buildRegistryHash');
const { safeJsonRead } = require('../utils/safeJsonRead');
const validateGovernanceScript = require('../../../../scripts/risk-mapping/validate-risk-mapping-governance');
const diffGovernanceScript = require('../../../../scripts/risk-mapping/diff-risk-mapping-artifacts');
const freezeGovernanceScript = require('../../../../scripts/risk-mapping/freeze-risk-mapping-release');

const GOVERNANCE_REPLAY_FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../../data/risk-mapping/governance/seeded-replay-fixture.json',
);
const GOVERNANCE_REPORT_PATH = validateGovernanceScript.GOVERNANCE_REPORT_PATH;
const ARTIFACT_DIFF_REPORT_PATH = diffGovernanceScript.ARTIFACT_DIFF_REPORT_PATH;
const FROZEN_RELEASE_REPORT_PATH = freezeGovernanceScript.FROZEN_RELEASE_REPORT_PATH;

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  return {
    status: response.status,
    body: await response.json(),
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('governance manifest loads and validates successfully', () => {
  const manifest = loadGovernanceManifest();
  const validation = validateGovernanceManifest(manifest);

  assert.equal(validation.valid, true);
  assert.equal(manifest.currentReleaseId, 'organization_risk__apple__v1');
  assert.equal(manifest.activeRelease.releaseId, 'organization_risk__apple__v1');
  assert.equal(manifest.activeRelease.status, 'active');
  assert.deepEqual(Object.keys(manifest.activeRelease.artifactPaths), [
    'domainManifest',
    'nodeRegistry',
    'threatRegistry',
    'causalCompatibilityRegistry',
    'falsifierRegistry',
    'evidencePack',
  ]);
});

test('invalid governance manifest fails deterministically', () => {
  const invalid = {
    currentReleaseId: '',
    releases: [
      {
        releaseId: 'r1',
        domainId: 'organization_risk',
        entity: 'apple',
        evidenceSetVersion: 'v1',
        registryVersion: 'v1',
        status: 'active',
        frozenAt: '2026-04-08T16:04:19.099Z',
        registryHash: 'x',
        notes: 'x',
        artifactPaths: {
          domainManifest: 'a',
          nodeRegistry: 'b',
          threatRegistry: 'c',
          causalCompatibilityRegistry: 'd',
          falsifierRegistry: 'e',
          evidencePack: 'f',
        },
      },
      {
        releaseId: 'r1',
        domainId: 'organization_risk',
        entity: 'apple',
        evidenceSetVersion: 'v1',
        registryVersion: 'v1',
        status: 'candidate',
        frozenAt: '2026-04-08T16:04:19.099Z',
        registryHash: 'x',
        notes: 'x',
        artifactPaths: {
          domainManifest: 'a',
          nodeRegistry: 'b',
          threatRegistry: 'c',
          causalCompatibilityRegistry: 'd',
          falsifierRegistry: 'e',
          evidencePack: 'f',
        },
      },
    ],
  };

  const validation = validateGovernanceManifest(invalid);

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((entry) => entry.includes('releaseId must be unique')));
});

test('active release metadata matches current seeded system state', () => {
  const manifest = loadGovernanceManifest();
  const bundle = loadGovernanceReleaseBundle(manifest.activeRelease);
  const registryHash = buildRegistryHashFromArtifacts(bundle);

  assert.equal(manifest.activeRelease.domainId, 'organization_risk');
  assert.equal(manifest.activeRelease.entity, 'apple');
  assert.equal(manifest.activeRelease.evidenceSetVersion, 'v1');
  assert.equal(manifest.activeRelease.registryVersion, 'v1');
  assert.equal(registryHash.hash, manifest.activeRelease.registryHash);
});

test('inspectable governance surface is deterministic and bounded', () => {
  const first = inspectRiskMapGovernanceReport();
  const second = inspectRiskMapGovernanceReport();

  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(first), [
    'releaseId',
    'domainId',
    'entity',
    'registryVersion',
    'evidenceSetVersion',
    'registryHash',
    'validationPassed',
    'replayPassed',
    'compatibilityPassed',
    'notes',
  ]);
});

test('validateArtifactCompatibility passes for the seeded active release', () => {
  const manifest = loadGovernanceManifest();
  const bundle = loadGovernanceReleaseBundle(manifest.activeRelease);
  const replayFixture = safeJsonRead(GOVERNANCE_REPLAY_FIXTURE_PATH);
  const compatibility = validateArtifactCompatibility({
    baselineRelease: bundle,
    candidateRelease: bundle,
    replayFixture,
  });

  assert.equal(compatibility.compatible, true);
  assert.deepEqual(compatibility.errors, []);
});

test('evaluateReleaseAdmission returns admit freeze and reject deterministically', () => {
  assert.deepEqual(
    evaluateReleaseAdmission({
      validationPassed: true,
      replayPassed: true,
      compatibilityPassed: true,
    }),
    {
      decision: 'admit',
      reasonCode: 'GOVERNANCE_RELEASE_ADMITTED',
      reason: 'The candidate release passed structural validation, replay validation, and compatibility checks.',
    },
  );

  assert.equal(
    evaluateReleaseAdmission({
      validationPassed: true,
      replayPassed: false,
      compatibilityPassed: true,
    }).decision,
    'freeze',
  );

  assert.equal(
    evaluateReleaseAdmission({
      validationPassed: false,
      replayPassed: true,
      compatibilityPassed: true,
    }).decision,
    'reject',
  );
});

test('governance report is deterministic', () => {
  const report = inspectRiskMapGovernanceReport();
  const first = buildGovernanceReport(report);
  const second = buildGovernanceReport(report);

  assert.deepEqual(first, second);
});

test('governance scripts write expected report shapes', async () => {
  const manifest = loadGovernanceManifest();
  validateGovernanceScript.main();
  const governanceReport = safeJsonRead(GOVERNANCE_REPORT_PATH);

  assert.deepEqual(Object.keys(governanceReport), [
    'releaseId',
    'domainId',
    'entity',
    'registryVersion',
    'evidenceSetVersion',
    'registryHash',
    'validationPassed',
    'replayPassed',
    'compatibilityPassed',
    'notes',
  ]);
  assert.equal(governanceReport.releaseId, 'organization_risk__apple__v1');
  assert.equal(governanceReport.registryHash, manifest.activeRelease.registryHash);

  diffGovernanceScript.main([]);
  const diffReport = safeJsonRead(ARTIFACT_DIFF_REPORT_PATH);
  assert.deepEqual(Object.keys(diffReport), ['releaseFrom', 'releaseTo', 'changedFiles', 'changedIds', 'hashFrom', 'hashTo']);
});

test('freeze operation does not silently mutate unrelated release entries', async () => {
  const manifest = loadGovernanceManifest();
  const bundle = loadGovernanceReleaseBundle(manifest.activeRelease);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatpdm-rmg-governance-'));
  const candidatePath = path.join(tempDir, 'candidate-release.json');
  const historyPath = path.join(tempDir, 'release-history.json');

  fs.writeFileSync(candidatePath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  fs.copyFileSync(
    path.resolve(__dirname, '../../../../data/risk-mapping/governance/release-history.json'),
    historyPath,
  );

  freezeGovernanceScript.main(['--candidate', candidatePath, '--history', historyPath]);

  const history = safeJsonRead(historyPath);
  const frozenEvent = history.events.find((entry) => entry.eventId === 'organization_risk__apple__v1_frozen');

  assert.equal(history.domainId, 'organization_risk');
  assert.equal(history.currentReleaseId, 'organization_risk__apple__v1');
  assert.ok(history.events.some((entry) => entry.eventId === 'organization_risk__apple__v1_activated'));
  assert.ok(frozenEvent);
  assert.equal(frozenEvent.status, 'candidate');
});

test('governance route surfaces remain bounded and deterministic', async () => {
  validateGovernanceScript.main();
  diffGovernanceScript.main([]);

  const { server, baseUrl } = await startServer();

  try {
    const governanceFirst = await fetchJson(`${baseUrl}/api/v1/risk-mapping/governance`);
    const governanceSecond = await fetchJson(`${baseUrl}/api/v1/risk-mapping/governance`);
    const diffFirst = await fetchJson(`${baseUrl}/api/v1/risk-mapping/diff`);

    assert.equal(governanceFirst.status, 200);
    assert.deepEqual(governanceFirst.body, governanceSecond.body);
    assert.deepEqual(Object.keys(governanceFirst.body), [
      'releaseId',
      'domainId',
      'entity',
      'registryVersion',
      'evidenceSetVersion',
      'registryHash',
      'validationPassed',
      'replayPassed',
      'compatibilityPassed',
      'notes',
    ]);
    assert.equal(diffFirst.status, 200);
    assert.deepEqual(Object.keys(diffFirst.body), ['releaseFrom', 'releaseTo', 'changedFiles', 'changedIds', 'hashFrom', 'hashTo']);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
