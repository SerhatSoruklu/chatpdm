'use strict';

// INTEGRITY LAW:
// This module is governed by docs/INTERGRITY_RUNTIME_LAWS.md
// Violations of canonical truth, refusal boundary, or hashing determinism are forbidden.

const fs = require('node:fs/promises');
const path = require('node:path');

const {
  assertIntegrityLaw,
} = require('../../lib/assert-integrity-law');
const {
  normalizeRequestId,
} = require('./provisioning-evidence-chain.service');
const {
  verifyProvisioningEvidenceChain,
} = require('./provisioning-evidence-chain-verifier');
const {
  buildProvisioningEvidenceCheckpointPayload,
  canonicalizeProvisioningEvidenceCheckpointPayload,
  inspectProvisioningEvidenceSignedCheckpoint,
  validateProvisioningEvidenceCheckpointEnvelope,
  validateProvisioningEvidenceCheckpointPayload,
  verifyProvisioningEvidenceSignedCheckpointSignature,
} = require('./provisioning-evidence-checkpoint.service');

const PROVISIONING_EVIDENCE_BUNDLE_SCHEMA_VERSION = 1;
const PROVISIONING_EVIDENCE_BUNDLE_TYPE = 'managed_access_provisioning_evidence_bundle';
const PROVISIONING_EVIDENCE_BUNDLE_METADATA_SOURCE = 'chatpdm-runtime';
const PROVISIONING_EVIDENCE_BUNDLE_KEYS = Object.freeze([
  'bundleSchemaVersion',
  'bundleType',
  'checkpoint',
  'metadata',
  'payload',
]);
const PROVISIONING_EVIDENCE_BUNDLE_METADATA_KEYS = Object.freeze([
  'exportedAt',
  'source',
]);

function isPlainObject(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function hasOwnProperty(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function hasExactSortedKeys(value, expectedKeys) {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expectedKeys].sort());
}

function isStrictIsoTimestampString(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }

  const parsed = new Date(value);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeBundleRequestId(requestId) {
  return normalizeRequestId(requestId).toHexString();
}

function buildBundleResult({
  status,
  reason,
  requestId,
  bundle = null,
  verificationResult = null,
  checkpointReason = undefined,
  includeCheckpoint = false,
  checkpointPath = null,
  checkpoint = null,
}) {
  const result = {
    status,
    reason,
    requestId,
    bundle,
    verificationResult,
  };

  if (checkpointReason !== undefined) {
    result.checkpointReason = checkpointReason;
  }

  if (includeCheckpoint) {
    result.checkpointPath = checkpointPath;
    result.checkpoint = checkpoint;
  }

  return result;
}

function buildProvisioningEvidenceBundle({
  payload,
  checkpoint,
  metadata,
}) {
  return {
    bundleSchemaVersion: PROVISIONING_EVIDENCE_BUNDLE_SCHEMA_VERSION,
    bundleType: PROVISIONING_EVIDENCE_BUNDLE_TYPE,
    payload,
    checkpoint,
    metadata,
  };
}

function validateProvisioningEvidenceBundle(bundle, context = {}) {
  if (!isPlainObject(bundle)) {
    return { valid: false, reason: 'bundle_malformed' };
  }

  if (!hasOwnProperty(bundle, 'checkpoint') || bundle.checkpoint === null) {
    return { valid: false, reason: 'bundle_checkpoint_missing' };
  }

  if (!hasExactSortedKeys(bundle, PROVISIONING_EVIDENCE_BUNDLE_KEYS)) {
    return { valid: false, reason: 'bundle_malformed' };
  }

  if (bundle.bundleSchemaVersion !== PROVISIONING_EVIDENCE_BUNDLE_SCHEMA_VERSION) {
    return { valid: false, reason: 'bundle_malformed' };
  }

  if (bundle.bundleType !== PROVISIONING_EVIDENCE_BUNDLE_TYPE) {
    return { valid: false, reason: 'bundle_malformed' };
  }

  const payloadValidation = validateProvisioningEvidenceCheckpointPayload(bundle.payload, {
    expectedRequestId: context.expectedRequestId,
  });

  if (!payloadValidation.valid) {
    return { valid: false, reason: 'bundle_malformed' };
  }

  if (!isPlainObject(bundle.metadata)) {
    return { valid: false, reason: 'bundle_malformed' };
  }

  if (!hasExactSortedKeys(bundle.metadata, PROVISIONING_EVIDENCE_BUNDLE_METADATA_KEYS)) {
    return { valid: false, reason: 'bundle_malformed' };
  }

  if (bundle.metadata.source !== PROVISIONING_EVIDENCE_BUNDLE_METADATA_SOURCE) {
    return { valid: false, reason: 'bundle_malformed' };
  }

  if (
    bundle.metadata.exportedAt !== null
    && !isStrictIsoTimestampString(bundle.metadata.exportedAt)
  ) {
    return { valid: false, reason: 'bundle_malformed' };
  }

  const checkpointValidation = validateProvisioningEvidenceCheckpointEnvelope(bundle.checkpoint, {
    expectedRequestId: context.expectedRequestId,
    expectedSequence: bundle.payload.chainHeadSequence,
  });

  if (!checkpointValidation.valid) {
    return {
      valid: false,
      reason: 'bundle_checkpoint_invalid',
      checkpointReason: checkpointValidation.reason,
    };
  }

  return { valid: true };
}

async function buildProvisioningEvidenceBundleFromReplay(requestId, options = {}) {
  const normalizedRequestId = normalizeBundleRequestId(requestId);
  const checkpointInspectionResult = await inspectProvisioningEvidenceSignedCheckpoint(
    normalizedRequestId,
    options,
  );

  if (checkpointInspectionResult.status === 'skipped') {
    return buildBundleResult({
      status: 'skipped',
      reason: checkpointInspectionResult.reason,
      requestId: normalizedRequestId,
      verificationResult: checkpointInspectionResult.verificationResult,
      includeCheckpoint: true,
      checkpointPath: checkpointInspectionResult.checkpointPath,
      checkpoint: checkpointInspectionResult.checkpoint,
    });
  }

  if (checkpointInspectionResult.status === 'missing') {
    return buildBundleResult({
      status: 'missing',
      reason: 'bundle_checkpoint_missing',
      requestId: normalizedRequestId,
      verificationResult: checkpointInspectionResult.verificationResult,
      includeCheckpoint: true,
      checkpointPath: checkpointInspectionResult.checkpointPath,
      checkpoint: checkpointInspectionResult.checkpoint,
    });
  }

  if (checkpointInspectionResult.status !== 'valid') {
    return buildBundleResult({
      status: 'invalid',
      reason: 'bundle_checkpoint_invalid',
      requestId: normalizedRequestId,
      verificationResult: checkpointInspectionResult.verificationResult,
      checkpointReason: checkpointInspectionResult.reason,
      includeCheckpoint: true,
      checkpointPath: checkpointInspectionResult.checkpointPath,
      checkpoint: checkpointInspectionResult.checkpoint,
    });
  }

  assertIntegrityLaw(
    checkpointInspectionResult.checkpoint
      && checkpointInspectionResult.checkpoint.payload
      && checkpointInspectionResult.checkpoint.signature,
    'bundle creation requires a valid signed checkpoint artifact after checkpoint inspection',
  );

  const checkpoint = cloneJsonValue(checkpointInspectionResult.checkpoint);
  const bundle = buildProvisioningEvidenceBundle({
    payload: cloneJsonValue(checkpoint.payload),
    checkpoint,
    metadata: {
      source: PROVISIONING_EVIDENCE_BUNDLE_METADATA_SOURCE,
      exportedAt: null,
    },
  });
  const bundleValidation = validateProvisioningEvidenceBundle(bundle, {
    expectedRequestId: normalizedRequestId,
  });

  assertIntegrityLaw(
    bundleValidation.valid,
    'service-generated evidence bundle must be valid before export',
  );

  return buildBundleResult({
    status: 'valid',
    reason: 'bundle_created',
    requestId: normalizedRequestId,
    bundle,
    verificationResult: checkpointInspectionResult.verificationResult,
    includeCheckpoint: true,
    checkpointPath: checkpointInspectionResult.checkpointPath,
    checkpoint,
  });
}

async function inspectProvisioningEvidenceBundle(requestId, bundle, options = {}) {
  const normalizedRequestId = normalizeBundleRequestId(requestId);
  const verificationResult = await verifyProvisioningEvidenceChain(normalizedRequestId);

  if (verificationResult.status !== 'valid') {
    return buildBundleResult({
      status: 'skipped',
      reason: 'verification_invalid',
      requestId: normalizedRequestId,
      bundle,
      verificationResult,
    });
  }

  if (!isPlainObject(bundle)) {
    return buildBundleResult({
      status: 'invalid',
      reason: 'bundle_malformed',
      requestId: normalizedRequestId,
      bundle,
      verificationResult,
    });
  }

  if (!hasOwnProperty(bundle, 'checkpoint') || bundle.checkpoint === null) {
    return buildBundleResult({
      status: 'invalid',
      reason: 'bundle_checkpoint_missing',
      requestId: normalizedRequestId,
      bundle,
      verificationResult,
    });
  }

  const bundleValidation = validateProvisioningEvidenceBundle(bundle, {
    expectedRequestId: normalizedRequestId,
  });

  if (!bundleValidation.valid) {
    return buildBundleResult({
      status: 'invalid',
      reason: bundleValidation.reason,
      requestId: normalizedRequestId,
      bundle,
      verificationResult,
      checkpointReason: bundleValidation.checkpointReason,
    });
  }

  const signatureVerificationResult = verifyProvisioningEvidenceSignedCheckpointSignature(
    bundle.checkpoint,
    options,
  );

  if (!signatureVerificationResult.valid) {
    return buildBundleResult({
      status: 'invalid',
      reason: 'bundle_signature_invalid',
      requestId: normalizedRequestId,
      bundle,
      verificationResult,
      checkpointReason: signatureVerificationResult.reason,
    });
  }

  const canonicalBundlePayload = canonicalizeProvisioningEvidenceCheckpointPayload(bundle.payload);
  const canonicalCheckpointPayload = canonicalizeProvisioningEvidenceCheckpointPayload(
    bundle.checkpoint.payload,
  );

  if (canonicalBundlePayload !== canonicalCheckpointPayload) {
    return buildBundleResult({
      status: 'invalid',
      reason: 'bundle_payload_mismatch',
      requestId: normalizedRequestId,
      bundle,
      verificationResult,
    });
  }

  const expectedPayload = buildProvisioningEvidenceCheckpointPayload({
    requestId: normalizedRequestId,
    verificationResult,
  });

  if (
    canonicalBundlePayload
    !== canonicalizeProvisioningEvidenceCheckpointPayload(expectedPayload)
  ) {
    return buildBundleResult({
      status: 'invalid',
      reason: 'bundle_payload_mismatch',
      requestId: normalizedRequestId,
      bundle,
      verificationResult,
    });
  }

  return buildBundleResult({
    status: 'valid',
    reason: 'bundle_valid',
    requestId: normalizedRequestId,
    bundle,
    verificationResult,
  });
}

async function writeProvisioningEvidenceBundleFile(bundlePath, bundle) {
  await fs.mkdir(path.dirname(bundlePath), { recursive: true });
  const bundleBody = `${JSON.stringify(bundle, null, 2)}\n`;
  const temporaryPath = `${bundlePath}.tmp`;

  await fs.writeFile(temporaryPath, bundleBody, 'utf8');
  await fs.rename(temporaryPath, bundlePath);
}

module.exports = {
  PROVISIONING_EVIDENCE_BUNDLE_METADATA_SOURCE,
  PROVISIONING_EVIDENCE_BUNDLE_SCHEMA_VERSION,
  PROVISIONING_EVIDENCE_BUNDLE_TYPE,
  buildProvisioningEvidenceBundle: buildProvisioningEvidenceBundleFromReplay,
  inspectProvisioningEvidenceBundle,
  validateProvisioningEvidenceBundle,
  writeProvisioningEvidenceBundleFile,
};
