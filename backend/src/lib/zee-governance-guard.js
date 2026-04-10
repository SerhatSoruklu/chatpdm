'use strict';

const {
  ZEE_ARTIFACT_CONTRACT_MARKER,
  ZEE_ARTIFACT_TYPE,
  hasZeeArtifactMarker,
} = require('../modules/zeroglare-evidence-engine/artifact-markers');

const ZEE_GOVERNANCE_ERROR_CODES = Object.freeze({
  ARTIFACT_CONSUMPTION_BLOCKED: 'ZEE_ARTIFACT_CONSUMPTION_BLOCKED',
});

class ZeeGovernanceBoundaryError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ZeeGovernanceBoundaryError';
    this.code = code;
    this.details = details;
  }
}

function buildPath(basePath, nextSegment) {
  if (typeof nextSegment === 'number') {
    return `${basePath}[${nextSegment}]`;
  }

  return `${basePath}.${nextSegment}`;
}

function hasOwnKeys(value, keys) {
  return keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isZeeScaffoldSurface(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && value.resource === 'zee'
    && value.status === 'non_operational_scaffold';
}

function detectZeeArtifactMarker(value, currentPath = 'root', seen = new WeakSet()) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const nestedViolation = detectZeeArtifactMarker(value[index], buildPath(currentPath, index), seen);

      if (nestedViolation) {
        return nestedViolation;
      }
    }

    return null;
  }

  if (Buffer.isBuffer(value)) {
    return null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  if (seen.has(value)) {
    return null;
  }

  seen.add(value);

  if (hasZeeArtifactMarker(value)) {
    return {
      marker: {
        contractMarker: value.contractMarker ?? ZEE_ARTIFACT_CONTRACT_MARKER,
        type: value.type ?? value.artifactType ?? ZEE_ARTIFACT_TYPE,
      },
      path: currentPath,
      reason: 'matches the explicit ZEE artifact marker',
    };
  }

  if (isZeeScaffoldSurface(value)) {
    return {
      path: currentPath,
      reason: 'matches the isolated ZEE scaffold surface',
    };
  }

  if (hasOwnKeys(value, ['engine', 'frames', 'observedSummary', 'measurementLayer', 'inferenceGate', 'signalStability'])) {
    return {
      path: currentPath,
      reason: 'matches the canonical ZEE observed trace shape',
    };
  }

  if (hasOwnKeys(value, ['layer', 'stableSignals', 'discardedSignals', 'summary']) && value.layer === 'Signal Stability') {
    return {
      path: currentPath,
      reason: 'matches the canonical ZEE signal stability shape',
    };
  }

  if (hasOwnKeys(value, ['layer', 'measurements', 'discardedMeasurements', 'summary']) && value.layer === 'Measured') {
    return {
      path: currentPath,
      reason: 'matches the canonical ZEE measurement shape',
    };
  }

  if (hasOwnKeys(value, ['layer', 'supported_inferences', 'rejected_claims', 'unknowns']) && value.layer === 'Inference Gate') {
    return {
      path: currentPath,
      reason: 'matches the canonical ZEE inference shape',
    };
  }

  if (hasOwnKeys(value, ['kind', 'observed', 'measured', 'stable', 'summary']) && value.layer === 'Inspector') {
    return {
      path: currentPath,
      reason: 'matches the canonical ZEE inspector shape',
    };
  }

  if (hasOwnKeys(value, ['frameId', 'frameMetadata', 'observedFeatures']) && value.frameMetadata && value.observedFeatures) {
    return {
      path: currentPath,
      reason: 'matches the canonical ZEE frame artifact shape',
    };
  }

  for (const [key, entry] of Object.entries(value)) {
    const nestedViolation = detectZeeArtifactMarker(entry, buildPath(currentPath, key), seen);

    if (nestedViolation) {
      return nestedViolation;
    }
  }

  return null;
}

function assertNotZeeArtifact(value, context) {
  const violation = detectZeeArtifactMarker(value);

  if (!violation) {
    return value;
  }

  throw new ZeeGovernanceBoundaryError(
    ZEE_GOVERNANCE_ERROR_CODES.ARTIFACT_CONSUMPTION_BLOCKED,
    `${context} crossed the ZEE non-consumption boundary at ${violation.path}: ${violation.reason}.`,
    {
      context,
      marker: violation.marker ?? null,
      path: violation.path,
      reason: violation.reason,
    },
  );
}

const assertRuntimeBoundaryFreeOfZeeArtifacts = assertNotZeeArtifact;

module.exports = {
  ZEE_GOVERNANCE_ERROR_CODES,
  ZeeGovernanceBoundaryError,
  assertNotZeeArtifact,
  assertRuntimeBoundaryFreeOfZeeArtifacts,
  detectZeeArtifactMarker,
};
