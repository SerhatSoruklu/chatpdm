'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { loadGovernanceManifest } = require('../../src/modules/risk-mapping/governance/loadGovernanceManifest');
const { loadGovernanceReleaseBundle } = require('../../src/modules/risk-mapping/governance/loadGovernanceReleaseBundle');
const { validateArtifactCompatibility } = require('../../src/modules/risk-mapping/governance/validateArtifactCompatibility');
const { evaluateReleaseAdmission } = require('../../src/modules/risk-mapping/governance/evaluateReleaseAdmission');
const { buildGovernanceReport } = require('../../src/modules/risk-mapping/governance/buildGovernanceReport');
const { buildRegistryHashFromArtifacts } = require('../../src/modules/risk-mapping/utils/buildRegistryHash');
const { safeJsonRead } = require('../../src/modules/risk-mapping/utils/safeJsonRead');

const BACKEND_ROOT = path.resolve(__dirname, '../..');
const GOVERNANCE_REPORT_PATH = path.resolve(BACKEND_ROOT, 'artifacts/risk-mapping/governance-report.json');
const REGISTRY_HASH_REPORT_PATH = path.resolve(BACKEND_ROOT, 'artifacts/risk-mapping/registry-hash-report.json');
const AUDIT_REPORT_PATH = path.resolve(BACKEND_ROOT, 'artifacts/risk-mapping/audit-report.json');
const GOVERNANCE_REPLAY_FIXTURE_PATH = path.resolve(
  BACKEND_ROOT,
  'data/risk-mapping/governance/seeded-replay-fixture.json',
);
const EXPECTED_RELEASE_ID = 'organization_risk__apple__v1';
const EXPECTED_DOMAIN_ID = 'organization_risk';
const EXPECTED_ENTITY = 'apple';
const EXPECTED_EVIDENCE_SET_VERSION = 'v1';
const EXPECTED_REGISTRY_VERSION = 'v1';

function writeReport(report) {
  fs.mkdirSync(path.dirname(GOVERNANCE_REPORT_PATH), { recursive: true });
  fs.writeFileSync(GOVERNANCE_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function assertArtifactExists(artifactPath, label) {
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Missing required governance artifact: ${label}`);
  }
}

function main() {
  try {
    const manifest = loadGovernanceManifest();
    const activeRelease = manifest.activeRelease;

    if (manifest.currentReleaseId !== EXPECTED_RELEASE_ID) {
      throw new Error(`Unexpected active release id: expected ${EXPECTED_RELEASE_ID}, received ${manifest.currentReleaseId}.`);
    }

    if (
      activeRelease.releaseId !== EXPECTED_RELEASE_ID ||
      activeRelease.domainId !== EXPECTED_DOMAIN_ID ||
      activeRelease.entity !== EXPECTED_ENTITY ||
      activeRelease.evidenceSetVersion !== EXPECTED_EVIDENCE_SET_VERSION ||
      activeRelease.registryVersion !== EXPECTED_REGISTRY_VERSION
    ) {
      throw new Error('Active release metadata does not match the frozen seeded baseline.');
    }

    if (
      typeof activeRelease.evidenceSetVersion !== 'string' ||
      activeRelease.evidenceSetVersion.trim().length === 0 ||
      typeof activeRelease.registryVersion !== 'string' ||
      activeRelease.registryVersion.trim().length === 0
    ) {
      throw new Error('Active release contains unversioned governance metadata.');
    }

    const activeBundle = loadGovernanceReleaseBundle(activeRelease);
    const replayFixture = safeJsonRead(GOVERNANCE_REPLAY_FIXTURE_PATH);

    assertArtifactExists(AUDIT_REPORT_PATH, 'audit-report.json');
    assertArtifactExists(REGISTRY_HASH_REPORT_PATH, 'registry-hash-report.json');

    const compatibility = validateArtifactCompatibility({
      baselineRelease: activeBundle,
      candidateRelease: activeBundle,
      replayFixture,
    });

    if (!compatibility.compatible) {
      throw new Error(`Governance compatibility failed: ${compatibility.errors.join(' | ')}`);
    }

    const registryHash = buildRegistryHashFromArtifacts(activeBundle);

    if (registryHash.hash !== activeRelease.registryHash) {
      throw new Error(`Governance registry hash mismatch: expected ${activeRelease.registryHash}, received ${registryHash.hash}.`);
    }

    if (registryHash.hash !== safeJsonRead(REGISTRY_HASH_REPORT_PATH).hash) {
      throw new Error('Governance registry hash report does not match the active release hash.');
    }

    const admission = evaluateReleaseAdmission({
      validationPassed: true,
      replayPassed: true,
      compatibilityPassed: true,
    });

    if (admission.decision !== 'admit') {
      throw new Error(`Governance release admission failed: ${admission.reasonCode}`);
    }

    const report = buildGovernanceReport({
      releaseId: activeRelease.releaseId,
      domainId: activeRelease.domainId,
      entity: activeRelease.entity,
      registryVersion: activeRelease.registryVersion,
      evidenceSetVersion: activeRelease.evidenceSetVersion,
      registryHash: registryHash.hash,
      validationPassed: true,
      replayPassed: true,
      compatibilityPassed: true,
      notes: activeRelease.notes,
    });

    writeReport(report);
    console.log('RMG governance validation passed.');
    console.log(`releaseId=${report.releaseId} domainId=${report.domainId} entity=${report.entity}`);
    console.log(`registryVersion=${report.registryVersion} evidenceSetVersion=${report.evidenceSetVersion}`);
    console.log(`registryHash=${report.registryHash}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeReport({
      status: 'fail',
      error: message,
    });
    console.error('RMG governance validation failed.');
    console.error(message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = Object.freeze({
  main,
  GOVERNANCE_REPORT_PATH,
});
