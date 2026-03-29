'use strict';

// INTEGRITY LAW:
// This module is governed by docs/INTERGRITY_RUNTIME_LAWS.md
// Violations of canonical truth, refusal boundary, or hashing determinism are forbidden.

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const {
  assertIntegrityLaw,
} = require('../../lib/assert-integrity-law');
const {
  MANAGED_ACCESS_ASSURANCE_CANONICALIZATION_VERSION,
  MANAGED_ACCESS_ASSURANCE_CHECKPOINT_DIRECTORY,
  MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PAYLOAD_SCHEMA_VERSION,
  MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PUBLIC_KEYS,
  MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PUBLIC_KEYS_REASON,
  MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PUBLIC_KEYS_STATUS,
  MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNATURE_ALGORITHM,
  MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNATURE_SCHEMA_VERSION,
  MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNING_KEY_ID,
  MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNING_PRIVATE_KEY_PEM,
  MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
} = require('./config/managed-access-assurance.config');
const {
  canonicalizeValue,
} = require('./provisioning-evidence-canonicalization');
const {
  normalizeRequestId,
} = require('./provisioning-evidence-chain.service');
const {
  verifyProvisioningEvidenceChain,
} = require('./provisioning-evidence-chain-verifier');

const PROVISIONING_EVIDENCE_CHECKPOINT_FILE_PATTERN = /^sequence-(\d+)\.checkpoint\.json$/;
const PROVISIONING_EVIDENCE_CHECKPOINT_TYPE = 'managed_access_provisioning_evidence_checkpoint';
const BASE64_SIGNATURE_PATTERN = /^[A-Za-z0-9+/]+=*$/;
const LOWERCASE_SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;
const PROVISIONING_EVIDENCE_CHECKPOINT_PAYLOAD_KEYS = Object.freeze([
  'canonicalizationVersion',
  'chainHeadHash',
  'chainHeadSequence',
  'checkpointPayloadSchemaVersion',
  'checkpointType',
  'hashVersion',
  'requestId',
]);
const PROVISIONING_EVIDENCE_CHECKPOINT_SIGNATURE_KEYS = Object.freeze([
  'algorithm',
  'checkpointSignatureSchemaVersion',
  'keyId',
  'signature',
]);
const PROVISIONING_EVIDENCE_SIGNED_CHECKPOINT_ENVELOPE_KEYS = Object.freeze([
  'payload',
  'signature',
]);

function isPlainObject(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isNullableLowercaseHash(value) {
  return value === null || (typeof value === 'string' && LOWERCASE_SHA256_HEX_PATTERN.test(value));
}

function normalizeCheckpointRequestId(requestId) {
  return normalizeRequestId(requestId).toHexString();
}

function getProvisioningEvidenceCheckpointDirectory(checkpointDirectory = MANAGED_ACCESS_ASSURANCE_CHECKPOINT_DIRECTORY) {
  return path.resolve(checkpointDirectory);
}

function getProvisioningEvidenceCheckpointRequestDirectory(requestId, options = {}) {
  return path.join(
    getProvisioningEvidenceCheckpointDirectory(options.checkpointDirectory),
    normalizeCheckpointRequestId(requestId),
  );
}

function buildProvisioningEvidenceCheckpointPath(requestId, checkpointSequence, options = {}) {
  return path.join(
    getProvisioningEvidenceCheckpointRequestDirectory(requestId, options),
    `sequence-${checkpointSequence}.checkpoint.json`,
  );
}

function buildProvisioningEvidenceCheckpointPayload({
  requestId,
  verificationResult,
}) {
  assertIntegrityLaw(
    verificationResult && verificationResult.status === 'valid',
    'signed checkpoints may only be built from a valid replay result',
  );
  assertIntegrityLaw(
    verificationResult.requestId === requestId,
    'signed checkpoint requestId must match the replay result requestId',
  );
  assertIntegrityLaw(
    verificationResult.hashVersion === MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
    'signed checkpoints must use the locked assurance hashVersion',
  );

  return {
    checkpointPayloadSchemaVersion: MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PAYLOAD_SCHEMA_VERSION,
    checkpointType: PROVISIONING_EVIDENCE_CHECKPOINT_TYPE,
    requestId,
    chainHeadSequence: verificationResult.chainHeadSequence,
    chainHeadHash: verificationResult.chainHeadHash,
    hashVersion: verificationResult.hashVersion,
    canonicalizationVersion: MANAGED_ACCESS_ASSURANCE_CANONICALIZATION_VERSION,
  };
}

function validateProvisioningEvidenceCheckpointPayload(payload, context = {}) {
  if (!isPlainObject(payload)) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  if (
    JSON.stringify(Object.keys(payload).sort())
    !== JSON.stringify(PROVISIONING_EVIDENCE_CHECKPOINT_PAYLOAD_KEYS)
  ) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  if (payload.checkpointPayloadSchemaVersion !== MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PAYLOAD_SCHEMA_VERSION) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  if (payload.checkpointType !== PROVISIONING_EVIDENCE_CHECKPOINT_TYPE) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  if (typeof payload.requestId !== 'string' || !/^[a-f0-9]{24}$/i.test(payload.requestId)) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  if (!isNonNegativeInteger(payload.chainHeadSequence)) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  if (!isNullableLowercaseHash(payload.chainHeadHash)) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  if (payload.chainHeadSequence === 0 && payload.chainHeadHash !== null) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  if (payload.chainHeadSequence > 0 && payload.chainHeadHash === null) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  if (payload.hashVersion !== MANAGED_ACCESS_ASSURANCE_HASH_VERSION) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  if (payload.canonicalizationVersion !== MANAGED_ACCESS_ASSURANCE_CANONICALIZATION_VERSION) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  if (context.expectedRequestId && payload.requestId !== context.expectedRequestId) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  if (
    context.expectedSequence !== undefined
    && context.expectedSequence !== null
    && payload.chainHeadSequence !== context.expectedSequence
  ) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  return { valid: true };
}

function canonicalizeProvisioningEvidenceCheckpointPayload(payload) {
  const validation = validateProvisioningEvidenceCheckpointPayload(payload);

  assertIntegrityLaw(
    validation.valid,
    'checkpoint payload must be valid before canonical checkpoint serialization',
  );

  return canonicalizeValue(payload);
}

function buildProvisioningEvidenceCheckpointSignatureEnvelope({
  keyId,
  signature,
}) {
  assertIntegrityLaw(
    typeof keyId === 'string' && keyId.length > 0,
    'checkpoint signing requires an explicit keyId',
  );
  assertIntegrityLaw(
    typeof signature === 'string' && signature.length > 0,
    'checkpoint signing requires a base64 signature value',
  );

  return {
    checkpointSignatureSchemaVersion: MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNATURE_SCHEMA_VERSION,
    algorithm: MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNATURE_ALGORITHM,
    keyId,
    signature,
  };
}

function validateProvisioningEvidenceCheckpointEnvelope(envelope, context = {}) {
  if (!isPlainObject(envelope)) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  if (
    JSON.stringify(Object.keys(envelope).sort())
    !== JSON.stringify(PROVISIONING_EVIDENCE_SIGNED_CHECKPOINT_ENVELOPE_KEYS)
  ) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  if (!isPlainObject(envelope.payload) || !isPlainObject(envelope.signature)) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  const payloadValidation = validateProvisioningEvidenceCheckpointPayload(envelope.payload, context);

  if (!payloadValidation.valid) {
    return payloadValidation;
  }

  const { signature } = envelope;

  if (
    JSON.stringify(Object.keys(signature).sort())
    !== JSON.stringify(PROVISIONING_EVIDENCE_CHECKPOINT_SIGNATURE_KEYS)
  ) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  if (signature.checkpointSignatureSchemaVersion !== MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNATURE_SCHEMA_VERSION) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  if (signature.algorithm !== MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNATURE_ALGORITHM) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  if (typeof signature.keyId !== 'string' || signature.keyId.length === 0) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  if (typeof signature.signature !== 'string' || !BASE64_SIGNATURE_PATTERN.test(signature.signature)) {
    return { valid: false, reason: 'checkpoint_malformed' };
  }

  return { valid: true };
}

function buildProvisioningEvidenceCheckpointSigningResult({
  ok,
  reason,
  signature = null,
}) {
  return {
    ok,
    reason,
    signature,
  };
}

function signProvisioningEvidenceCheckpointPayload(payload, options = {}) {
  const keyId = options.keyId || MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNING_KEY_ID;
  const privateKeyPem = options.privateKeyPem || MANAGED_ACCESS_ASSURANCE_CHECKPOINT_SIGNING_PRIVATE_KEY_PEM;

  if (!keyId || !privateKeyPem) {
    return buildProvisioningEvidenceCheckpointSigningResult({
      ok: false,
      reason: 'checkpoint_signing_unconfigured',
    });
  }

  try {
    const canonicalPayload = canonicalizeProvisioningEvidenceCheckpointPayload(payload);
    const signature = crypto.sign(
      null,
      Buffer.from(canonicalPayload, 'utf8'),
      privateKeyPem,
    ).toString('base64');

    return buildProvisioningEvidenceCheckpointSigningResult({
      ok: true,
      reason: 'checkpoint_signed',
      signature: buildProvisioningEvidenceCheckpointSignatureEnvelope({
        keyId,
        signature,
      }),
    });
  } catch (error) {
    return buildProvisioningEvidenceCheckpointSigningResult({
      ok: false,
      reason: 'checkpoint_signing_key_invalid',
    });
  }
}

function buildProvisioningEvidenceSignedCheckpoint({
  payload,
  signature,
}) {
  return {
    payload,
    signature,
  };
}

async function listProvisioningEvidenceCheckpointEntries(requestId, options = {}) {
  const requestDirectory = getProvisioningEvidenceCheckpointRequestDirectory(requestId, options);

  try {
    const entryNames = await fs.readdir(requestDirectory);
    return entryNames
      .map((entryName) => {
        const match = entryName.match(PROVISIONING_EVIDENCE_CHECKPOINT_FILE_PATTERN);

        if (!match) {
          return null;
        }

        return {
          sequence: Number(match[1]),
          fileName: entryName,
          filePath: path.join(requestDirectory, entryName),
        };
      })
      .filter(Boolean)
      .sort((left, right) => right.sequence - left.sequence);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function readLatestProvisioningEvidenceSignedCheckpoint(requestId, options = {}) {
  const normalizedRequestId = normalizeCheckpointRequestId(requestId);
  const entries = await listProvisioningEvidenceCheckpointEntries(normalizedRequestId, options);

  if (entries.length === 0) {
    return {
      status: 'missing',
      reason: 'checkpoint_missing',
      requestId: normalizedRequestId,
      checkpointPath: null,
      checkpoint: null,
    };
  }

  const latestEntry = entries[0];

  try {
    const rawCheckpoint = await fs.readFile(latestEntry.filePath, 'utf8');
    const parsedCheckpoint = JSON.parse(rawCheckpoint);
    const validation = validateProvisioningEvidenceCheckpointEnvelope(parsedCheckpoint, {
      expectedRequestId: normalizedRequestId,
      expectedSequence: latestEntry.sequence,
    });

    if (!validation.valid) {
      return {
        status: 'invalid',
        reason: validation.reason,
        requestId: normalizedRequestId,
        checkpointPath: latestEntry.filePath,
        checkpoint: null,
      };
    }

    return {
      status: 'valid',
      reason: 'checkpoint_readable',
      requestId: normalizedRequestId,
      checkpointPath: latestEntry.filePath,
      checkpoint: parsedCheckpoint,
    };
  } catch (error) {
    return {
      status: 'invalid',
      reason: 'checkpoint_malformed',
      requestId: normalizedRequestId,
      checkpointPath: latestEntry.filePath,
      checkpoint: null,
    };
  }
}

function verifyProvisioningEvidenceSignedCheckpointSignature(checkpoint, options = {}) {
  const publicKeysStatus = options.publicKeysStatus || MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PUBLIC_KEYS_STATUS;
  const publicKeysReason = options.publicKeysReason || MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PUBLIC_KEYS_REASON;
  const publicKeys = options.publicKeys || MANAGED_ACCESS_ASSURANCE_CHECKPOINT_PUBLIC_KEYS;

  if (publicKeysStatus === 'invalid') {
    return {
      valid: false,
      reason: publicKeysReason || 'checkpoint_key_registry_config_invalid',
    };
  }

  const publicKeyPem = publicKeys[checkpoint.signature.keyId];

  if (!publicKeyPem) {
    return {
      valid: false,
      reason: 'checkpoint_key_unknown',
    };
  }

  let signatureIsValid;

  try {
    const canonicalPayload = canonicalizeProvisioningEvidenceCheckpointPayload(checkpoint.payload);
    signatureIsValid = crypto.verify(
      null,
      Buffer.from(canonicalPayload, 'utf8'),
      publicKeyPem,
      Buffer.from(checkpoint.signature.signature, 'base64'),
    );
  } catch (error) {
    return {
      valid: false,
      reason: 'checkpoint_verification_key_invalid',
    };
  }

  if (!signatureIsValid) {
    return {
      valid: false,
      reason: 'checkpoint_signature_invalid',
    };
  }

  return {
    valid: true,
    reason: 'checkpoint_signature_valid',
  };
}

function doesProvisioningEvidenceCheckpointPayloadMatchReplay(payload, verificationResult) {
  const expectedPayload = buildProvisioningEvidenceCheckpointPayload({
    requestId: verificationResult.requestId,
    verificationResult,
  });

  return canonicalizeProvisioningEvidenceCheckpointPayload(payload)
    === canonicalizeProvisioningEvidenceCheckpointPayload(expectedPayload);
}

async function inspectProvisioningEvidenceSignedCheckpoint(requestId, options = {}) {
  const normalizedRequestId = normalizeCheckpointRequestId(requestId);
  const verificationResult = await verifyProvisioningEvidenceChain(normalizedRequestId);
  const checkpointReadResult = await readLatestProvisioningEvidenceSignedCheckpoint(
    normalizedRequestId,
    options,
  );

  if (verificationResult.status !== 'valid') {
    return {
      status: 'skipped',
      reason: 'verification_invalid',
      requestId: normalizedRequestId,
      checkpointPath: checkpointReadResult.checkpointPath,
      checkpoint: checkpointReadResult.checkpoint,
      verificationResult,
    };
  }

  if (checkpointReadResult.status !== 'valid') {
    return {
      status: checkpointReadResult.status,
      reason: checkpointReadResult.reason,
      requestId: normalizedRequestId,
      checkpointPath: checkpointReadResult.checkpointPath,
      checkpoint: checkpointReadResult.checkpoint,
      verificationResult,
    };
  }

  const checkpoint = checkpointReadResult.checkpoint;
  const signatureVerificationResult = verifyProvisioningEvidenceSignedCheckpointSignature(
    checkpoint,
    options,
  );

  if (!signatureVerificationResult.valid) {
    return {
      status: 'invalid',
      reason: signatureVerificationResult.reason,
      requestId: normalizedRequestId,
      checkpointPath: checkpointReadResult.checkpointPath,
      checkpoint,
      verificationResult,
    };
  }

  if (!doesProvisioningEvidenceCheckpointPayloadMatchReplay(checkpoint.payload, verificationResult)) {
    return {
      status: 'invalid',
      reason: 'checkpoint_payload_mismatch',
      requestId: normalizedRequestId,
      checkpointPath: checkpointReadResult.checkpointPath,
      checkpoint,
      verificationResult,
    };
  }

  return {
    status: 'valid',
    reason: 'checkpoint_valid',
    requestId: normalizedRequestId,
    checkpointPath: checkpointReadResult.checkpointPath,
    checkpoint,
    verificationResult,
  };
}

async function removeProvisioningEvidenceSignedCheckpoints(requestId, options = {}) {
  const normalizedRequestId = normalizeCheckpointRequestId(requestId);
  const entries = await listProvisioningEvidenceCheckpointEntries(normalizedRequestId, options);

  await Promise.all(entries.map((entry) => fs.unlink(entry.filePath)));
}

async function writeProvisioningEvidenceSignedCheckpointFile(checkpointPath, checkpoint) {
  await fs.mkdir(path.dirname(checkpointPath), { recursive: true });
  const checkpointBody = `${JSON.stringify(checkpoint, null, 2)}\n`;
  const temporaryPath = `${checkpointPath}.tmp`;

  await fs.writeFile(temporaryPath, checkpointBody, 'utf8');
  await fs.rename(temporaryPath, checkpointPath);
}

async function rebuildProvisioningEvidenceSignedCheckpoint(requestId, options = {}) {
  const normalizedRequestId = normalizeCheckpointRequestId(requestId);
  const verificationResult = await verifyProvisioningEvidenceChain(normalizedRequestId);

  if (verificationResult.status !== 'valid') {
    return {
      status: 'skipped',
      reason: 'verification_invalid',
      requestId: normalizedRequestId,
      checkpointPath: null,
      checkpoint: null,
      verificationResult,
    };
  }

  const payload = buildProvisioningEvidenceCheckpointPayload({
    requestId: normalizedRequestId,
    verificationResult,
  });
  const signingResult = signProvisioningEvidenceCheckpointPayload(payload, options);

  if (!signingResult.ok) {
    return {
      status: 'skipped',
      reason: signingResult.reason,
      requestId: normalizedRequestId,
      checkpointPath: null,
      checkpoint: null,
      verificationResult,
    };
  }

  const checkpoint = buildProvisioningEvidenceSignedCheckpoint({
    payload,
    signature: signingResult.signature,
  });
  const checkpointPath = buildProvisioningEvidenceCheckpointPath(
    normalizedRequestId,
    payload.chainHeadSequence,
    options,
  );

  await removeProvisioningEvidenceSignedCheckpoints(normalizedRequestId, options);
  await writeProvisioningEvidenceSignedCheckpointFile(checkpointPath, checkpoint);

  return {
    status: 'written',
    reason: 'checkpoint_written',
    requestId: normalizedRequestId,
    checkpointPath,
    checkpoint,
    verificationResult,
  };
}

module.exports = {
  PROVISIONING_EVIDENCE_CHECKPOINT_FILE_PATTERN,
  PROVISIONING_EVIDENCE_CHECKPOINT_PAYLOAD_KEYS,
  PROVISIONING_EVIDENCE_CHECKPOINT_SIGNATURE_KEYS,
  PROVISIONING_EVIDENCE_CHECKPOINT_TYPE,
  PROVISIONING_EVIDENCE_SIGNED_CHECKPOINT_ENVELOPE_KEYS,
  buildProvisioningEvidenceCheckpointPath,
  buildProvisioningEvidenceCheckpointPayload,
  buildProvisioningEvidenceSignedCheckpoint,
  canonicalizeProvisioningEvidenceCheckpointPayload,
  getProvisioningEvidenceCheckpointDirectory,
  getProvisioningEvidenceCheckpointRequestDirectory,
  inspectProvisioningEvidenceSignedCheckpoint,
  readLatestProvisioningEvidenceSignedCheckpoint,
  rebuildProvisioningEvidenceSignedCheckpoint,
  signProvisioningEvidenceCheckpointPayload,
  validateProvisioningEvidenceCheckpointEnvelope,
  validateProvisioningEvidenceCheckpointPayload,
  verifyProvisioningEvidenceSignedCheckpointSignature,
  writeProvisioningEvidenceSignedCheckpointFile,
};
