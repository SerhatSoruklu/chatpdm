'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { safeJsonRead } = require('../../src/modules/risk-mapping/utils/safeJsonRead');
const { loadGovernanceManifest } = require('../../src/modules/risk-mapping/governance/loadGovernanceManifest');
const { loadGovernanceReleaseBundle } = require('../../src/modules/risk-mapping/governance/loadGovernanceReleaseBundle');
const { buildArtifactDiffReport } = require('../../src/modules/risk-mapping/governance/buildArtifactDiffReport');

const BACKEND_ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIFF_REPORT_PATH = path.resolve(BACKEND_ROOT, 'artifacts/risk-mapping/artifact-diff-report.json');

function writeReport(report) {
  fs.mkdirSync(path.dirname(ARTIFACT_DIFF_REPORT_PATH), { recursive: true });
  fs.writeFileSync(ARTIFACT_DIFF_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function parseCandidatePath(argv) {
  const candidateIndex = argv.indexOf('--candidate');
  if (candidateIndex >= 0 && typeof argv[candidateIndex + 1] === 'string') {
    return path.resolve(process.cwd(), argv[candidateIndex + 1]);
  }

  return null;
}

function loadCandidateRelease(candidatePath) {
  if (!candidatePath) {
    return null;
  }

  const candidate = safeJsonRead(candidatePath);
  return candidate && typeof candidate === 'object' && !Array.isArray(candidate) && candidate.release ? candidate.release : candidate;
}

function main(argv = process.argv.slice(2)) {
  try {
    const manifest = loadGovernanceManifest();
    const baselineRelease = loadGovernanceReleaseBundle(manifest.activeRelease);
    const candidatePath = parseCandidatePath(argv);
    const candidateRelease = candidatePath ? loadGovernanceReleaseBundle(loadCandidateRelease(candidatePath)) : baselineRelease;
    const report = buildArtifactDiffReport({
      releaseFrom: baselineRelease,
      releaseTo: candidateRelease,
    });

    writeReport(report);
    console.log('RMG artifact diff generation passed.');
    console.log(`releaseFrom=${report.releaseFrom} releaseTo=${report.releaseTo}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeReport({
      status: 'fail',
      error: message,
    });
    console.error('RMG artifact diff generation failed.');
    console.error(message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = Object.freeze({
  main,
  ARTIFACT_DIFF_REPORT_PATH,
});
