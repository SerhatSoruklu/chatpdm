'use strict';

const { INVALID_INPUT_CONTRACT } = require('../constants/rmgReasonCodes');

const ALLOWED_RELEASE_STATUSES = Object.freeze(['active', 'superseded', 'rejected', 'candidate']);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateArtifactPaths(artifactPaths, errors, label) {
  if (!artifactPaths || typeof artifactPaths !== 'object' || Array.isArray(artifactPaths)) {
    errors.push(`${label} must be a plain object.`);
    return;
  }

  [
    'domainManifest',
    'nodeRegistry',
    'threatRegistry',
    'causalCompatibilityRegistry',
    'falsifierRegistry',
    'evidencePack',
  ].forEach((fieldName) => {
    if (!isNonEmptyString(artifactPaths[fieldName])) {
      errors.push(`${label}.${fieldName} must be a non-empty string.`);
    }
  });
}

function validateReleaseRecord(release, index, errors) {
  if (!release || typeof release !== 'object' || Array.isArray(release)) {
    errors.push(`releases[${index}] must be a plain object.`);
    return;
  }

  const label = `releases[${index}]`;

  ['releaseId', 'domainId', 'entity', 'evidenceSetVersion', 'registryVersion', 'status', 'frozenAt', 'registryHash', 'notes'].forEach(
    (fieldName) => {
      if (!isNonEmptyString(release[fieldName])) {
        errors.push(`${label}.${fieldName} must be a non-empty string.`);
      }
    },
  );

  if (!ALLOWED_RELEASE_STATUSES.includes(release.status)) {
    errors.push(`${label}.status must be one of ${ALLOWED_RELEASE_STATUSES.join(', ')}.`);
  }

  validateArtifactPaths(release.artifactPaths, errors, `${label}.artifactPaths`);
}

/**
 * @param {unknown} value
 * @returns {{ valid: boolean, errors: string[], reasonCode: string | null }}
 */
function validateGovernanceManifest(value) {
  const errors = [];

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push('Governance manifest must be a plain object.');
    return { valid: false, errors, reasonCode: INVALID_INPUT_CONTRACT };
  }

  const manifest = /** @type {Record<string, unknown>} */ (value);

  if (!isNonEmptyString(manifest.currentReleaseId)) {
    errors.push('currentReleaseId must be a non-empty string.');
  }

  if (!Array.isArray(manifest.releases) || manifest.releases.length === 0) {
    errors.push('releases must be a non-empty array.');
  } else {
    const seenReleaseIds = new Set();
    const activeTupleCounts = new Map();

    manifest.releases.forEach((release, index) => {
      validateReleaseRecord(release, index, errors);

      if (!release || typeof release !== 'object' || Array.isArray(release)) {
        return;
      }

      const record = /** @type {Record<string, unknown>} */ (release);

      if (isNonEmptyString(record.releaseId)) {
        if (seenReleaseIds.has(record.releaseId)) {
          errors.push(`releases[${index}].releaseId must be unique.`);
        } else {
          seenReleaseIds.add(record.releaseId);
        }
      }

      if (record.status === 'active') {
        const tuple = `${record.domainId}::${record.entity}::${record.evidenceSetVersion}`;
        activeTupleCounts.set(tuple, (activeTupleCounts.get(tuple) || 0) + 1);
      }
    });

    for (const [tuple, count] of activeTupleCounts.entries()) {
      if (count !== 1) {
        errors.push(`Exactly one active release must exist for ${tuple}.`);
      }
    }

    if (isNonEmptyString(manifest.currentReleaseId)) {
      const currentRelease = manifest.releases.find(
        (release) => release && typeof release === 'object' && !Array.isArray(release) && release.releaseId === manifest.currentReleaseId,
      );

      if (!currentRelease) {
        errors.push('currentReleaseId must reference one of the releases.');
      } else if (currentRelease.status !== 'active') {
        errors.push('currentReleaseId must reference an active release.');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    reasonCode: errors.length === 0 ? null : INVALID_INPUT_CONTRACT,
  };
}

module.exports = Object.freeze({
  ALLOWED_RELEASE_STATUSES,
  validateGovernanceManifest,
});
