'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { safeJsonRead } = require('../../src/modules/risk-mapping/utils/safeJsonRead');
const { loadGovernanceManifest } = require('../../src/modules/risk-mapping/governance/loadGovernanceManifest');
const { loadGovernanceReleaseBundle } = require('../../src/modules/risk-mapping/governance/loadGovernanceReleaseBundle');
const { validateArtifactCompatibility } = require('../../src/modules/risk-mapping/governance/validateArtifactCompatibility');
const { evaluateReleaseAdmission } = require('../../src/modules/risk-mapping/governance/evaluateReleaseAdmission');
const { buildGovernanceReport } = require('../../src/modules/risk-mapping/governance/buildGovernanceReport');
const { buildRegistryHashFromArtifacts } = require('../../src/modules/risk-mapping/utils/buildRegistryHash');
const { stableSort } = require('../../src/modules/risk-mapping/utils/stableSort');

const BACKEND_ROOT = path.resolve(__dirname, '../..');
const FROZEN_RELEASE_REPORT_PATH = path.resolve(BACKEND_ROOT, 'artifacts/risk-mapping/frozen-release-report.json');
const GOVERNANCE_REPLAY_FIXTURE_PATH = path.resolve(
  BACKEND_ROOT,
  'data/risk-mapping/governance/seeded-replay-fixture.json',
);
const GOVERNANCE_RELEASE_HISTORY_PATH = path.resolve(BACKEND_ROOT, 'data/risk-mapping/governance/release-history.json');

function writeReport(report) {
  fs.mkdirSync(path.dirname(FROZEN_RELEASE_REPORT_PATH), { recursive: true });
  fs.writeFileSync(FROZEN_RELEASE_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function parseCandidatePath(argv) {
  const candidateIndex = argv.indexOf('--candidate');
  if (candidateIndex >= 0 && typeof argv[candidateIndex + 1] === 'string') {
    return path.resolve(process.cwd(), argv[candidateIndex + 1]);
  }

  return null;
}

function parseHistoryPath(argv) {
  const historyIndex = argv.indexOf('--history');
  if (historyIndex >= 0 && typeof argv[historyIndex + 1] === 'string') {
    return path.resolve(process.cwd(), argv[historyIndex + 1]);
  }

  return GOVERNANCE_RELEASE_HISTORY_PATH;
}

function loadCandidateRelease(candidatePath) {
  const candidate = safeJsonRead(candidatePath);
  return candidate && typeof candidate === 'object' && !Array.isArray(candidate) && candidate.release ? candidate.release : candidate;
}

function main(argv = process.argv.slice(2)) {
  try {
    const candidatePath = parseCandidatePath(argv);
    if (!candidatePath) {
      throw new Error('freeze-risk-mapping-release requires a --candidate path.');
    }

    const historyPath = parseHistoryPath(argv);
    const manifest = loadGovernanceManifest();
    const activeBundle = loadGovernanceReleaseBundle(manifest.activeRelease);
    const candidateBundle = loadGovernanceReleaseBundle(loadCandidateRelease(candidatePath));
    const replayFixture = safeJsonRead(GOVERNANCE_REPLAY_FIXTURE_PATH);
    const compatibility = validateArtifactCompatibility({
      baselineRelease: activeBundle,
      candidateRelease: candidateBundle,
      replayFixture,
    });

    if (!compatibility.compatible) {
      throw new Error(`Governance freeze rejected: ${compatibility.errors.join(' | ')}`);
    }

    const admission = evaluateReleaseAdmission({
      validationPassed: true,
      replayPassed: true,
      compatibilityPassed: true,
    });

    if (admission.decision !== 'admit') {
      throw new Error(`Governance freeze requires admit-eligible release: ${admission.reasonCode}`);
    }

    const registryHash = buildRegistryHashFromArtifacts(candidateBundle);
    const report = buildGovernanceReport({
      releaseId: candidateBundle.releaseId,
      domainId: candidateBundle.domainId,
      entity: candidateBundle.entity,
      registryVersion: candidateBundle.registryVersion,
      evidenceSetVersion: candidateBundle.evidenceSetVersion,
      registryHash: registryHash.hash,
      validationPassed: true,
      replayPassed: true,
      compatibilityPassed: true,
      notes: candidateBundle.notes || 'Frozen release recorded in governance history.',
    });

    const history = safeJsonRead(historyPath);
    const freezeEventId = `${candidateBundle.releaseId}_frozen`;
    const existingEvents = Array.isArray(history.events) ? history.events : [];
    const frozenEvent = {
      eventId: freezeEventId,
      releaseId: candidateBundle.releaseId,
      eventType: 'frozen',
      status: 'candidate',
      changedAt: candidateBundle.frozenAt,
      notes: 'Candidate release frozen after governance admission.',
    };
    const frozenEvents = stableSort(
      existingEvents.some((event) => event && typeof event === 'object' && event.eventId === freezeEventId)
        ? existingEvents
        : [...existingEvents, frozenEvent],
      (left, right) => left.eventId.localeCompare(right.eventId),
    );

    fs.writeFileSync(
      historyPath,
      `${JSON.stringify({
        domainId: history.domainId,
        currentReleaseId: history.currentReleaseId,
        events: frozenEvents,
      }, null, 2)}\n`,
      'utf8',
    );

    writeReport({
      status: 'pass',
      decision: admission.decision,
      reasonCode: admission.reasonCode,
      reason: admission.reason,
      releaseId: report.releaseId,
      domainId: report.domainId,
      entity: report.entity,
      frozenAt: candidateBundle.frozenAt,
      notes: report.notes,
      historyPath,
    });

    console.log('RMG freeze operation passed.');
    console.log(`releaseId=${report.releaseId} historyPath=${historyPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeReport({
      status: 'fail',
      error: message,
    });
    console.error('RMG freeze operation failed.');
    console.error(message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = Object.freeze({
  main,
  FROZEN_RELEASE_REPORT_PATH,
});
