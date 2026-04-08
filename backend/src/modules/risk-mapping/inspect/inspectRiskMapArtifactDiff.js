'use strict';

const path = require('node:path');
const { safeJsonRead } = require('../utils/safeJsonRead');
const { freezePlainObject } = require('../utils/freezePlainObject');
const { loadGovernanceManifest } = require('../governance/loadGovernanceManifest');
const { loadGovernanceReleaseBundle } = require('../governance/loadGovernanceReleaseBundle');
const { buildArtifactDiffReport } = require('../governance/buildArtifactDiffReport');

const BACKEND_ROOT = path.resolve(__dirname, '../../../../');
const ARTIFACT_DIFF_REPORT_PATH = path.resolve(BACKEND_ROOT, 'artifacts/risk-mapping/artifact-diff-report.json');

/**
 * @param {unknown} [candidateRelease]
 * @returns {Readonly<Record<string, unknown>>}
 */
function inspectRiskMapArtifactDiff(candidateRelease) {
  if (candidateRelease && typeof candidateRelease === 'object' && !Array.isArray(candidateRelease)) {
    const manifest = loadGovernanceManifest();
    const activeRelease = manifest.activeRelease;
    const baselineRelease = loadGovernanceReleaseBundle(activeRelease);
    const candidateBundle = loadGovernanceReleaseBundle(
      /** @type {Record<string, unknown>} */ (candidateRelease).release
        ? /** @type {Record<string, unknown>} */ (candidateRelease).release
        : /** @type {Record<string, unknown>} */ (candidateRelease),
    );

    return buildArtifactDiffReport({
      releaseFrom: baselineRelease,
      releaseTo: candidateBundle,
    });
  }

  return freezePlainObject(/** @type {Record<string, unknown>} */ (safeJsonRead(ARTIFACT_DIFF_REPORT_PATH)));
}

module.exports = Object.freeze({
  inspectRiskMapArtifactDiff,
  ARTIFACT_DIFF_REPORT_PATH,
});
