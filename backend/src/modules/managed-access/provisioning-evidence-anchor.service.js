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
  MANAGED_ACCESS_ASSURANCE_ANCHOR_DIRECTORY,
  MANAGED_ACCESS_ASSURANCE_ANCHOR_SNAPSHOT_SCHEMA_VERSION,
  MANAGED_ACCESS_ASSURANCE_CANONICALIZATION_VERSION,
  MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
} = require('./config/managed-access-assurance.config');
const ProvisioningEvidenceChainHead = require('./provisioning-evidence-chain-head.model');
const {
  normalizeRequestId,
} = require('./provisioning-evidence-chain.service');
const {
  verifyProvisioningEvidenceChain,
} = require('./provisioning-evidence-chain-verifier');

const PROVISIONING_EVIDENCE_ANCHOR_SNAPSHOT_FILE_PATTERN = /^sequence-(\d+)\.anchor\.json$/;
const PROVISIONING_EVIDENCE_ANCHOR_SNAPSHOT_TYPE = 'managed_access_provisioning_evidence_anchor';
const LOWERCASE_SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

function isPlainObject(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function isIsoTimestampString(value) {
  return typeof value === 'string'
    && !Number.isNaN(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isNullableLowercaseHash(value) {
  return value === null || (typeof value === 'string' && LOWERCASE_SHA256_HEX_PATTERN.test(value));
}

function normalizeAnchorRequestId(requestId) {
  return normalizeRequestId(requestId).toHexString();
}

function getProvisioningEvidenceAnchorDirectory(anchorDirectory = MANAGED_ACCESS_ASSURANCE_ANCHOR_DIRECTORY) {
  return path.resolve(anchorDirectory);
}

function getProvisioningEvidenceAnchorRequestDirectory(requestId, options = {}) {
  return path.join(
    getProvisioningEvidenceAnchorDirectory(options.anchorDirectory),
    normalizeAnchorRequestId(requestId),
  );
}

function buildProvisioningEvidenceAnchorSnapshotPath(requestId, snapshotSequence, options = {}) {
  return path.join(
    getProvisioningEvidenceAnchorRequestDirectory(requestId, options),
    `sequence-${snapshotSequence}.anchor.json`,
  );
}

function buildProvisioningEvidenceAnchorSnapshot({
  requestId,
  verificationResult,
  chainHead,
}) {
  assertIntegrityLaw(
    verificationResult && verificationResult.status === 'valid',
    'anchor snapshots may only be built from a valid replay result',
  );
  assertIntegrityLaw(
    verificationResult.requestId === requestId,
    'anchor snapshot requestId must match the replay result requestId',
  );
  assertIntegrityLaw(
    verificationResult.hashVersion === MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
    'anchor snapshots must use the locked assurance hashVersion',
  );

  const replayDerivedCreatedAt = chainHead && chainHead.lastRecordedAt instanceof Date
    ? chainHead.lastRecordedAt.toISOString()
    : null;

  return {
    snapshotSchemaVersion: MANAGED_ACCESS_ASSURANCE_ANCHOR_SNAPSHOT_SCHEMA_VERSION,
    snapshotType: PROVISIONING_EVIDENCE_ANCHOR_SNAPSHOT_TYPE,
    requestId,
    snapshotSequence: verificationResult.verifiedThroughSequence,
    chainHeadSequence: verificationResult.chainHeadSequence,
    chainHeadHash: verificationResult.chainHeadHash,
    lastAnchoredEventHash: verificationResult.chainHeadHash,
    hashVersion: verificationResult.hashVersion,
    canonicalizationVersion: MANAGED_ACCESS_ASSURANCE_CANONICALIZATION_VERSION,
    createdAt: replayDerivedCreatedAt,
  };
}

function validateProvisioningEvidenceAnchorSnapshot(snapshot, context = {}) {
  if (!isPlainObject(snapshot)) {
    return { valid: false, reason: 'snapshot_malformed' };
  }

  if (snapshot.snapshotSchemaVersion !== MANAGED_ACCESS_ASSURANCE_ANCHOR_SNAPSHOT_SCHEMA_VERSION) {
    return { valid: false, reason: 'snapshot_malformed' };
  }

  if (snapshot.snapshotType !== PROVISIONING_EVIDENCE_ANCHOR_SNAPSHOT_TYPE) {
    return { valid: false, reason: 'snapshot_malformed' };
  }

  if (typeof snapshot.requestId !== 'string' || !/^[a-f0-9]{24}$/i.test(snapshot.requestId)) {
    return { valid: false, reason: 'snapshot_malformed' };
  }

  if (!isNonNegativeInteger(snapshot.snapshotSequence) || !isNonNegativeInteger(snapshot.chainHeadSequence)) {
    return { valid: false, reason: 'snapshot_malformed' };
  }

  if (snapshot.snapshotSequence !== snapshot.chainHeadSequence) {
    return { valid: false, reason: 'snapshot_malformed' };
  }

  if (!isNullableLowercaseHash(snapshot.chainHeadHash) || !isNullableLowercaseHash(snapshot.lastAnchoredEventHash)) {
    return { valid: false, reason: 'snapshot_malformed' };
  }

  if (snapshot.chainHeadHash !== snapshot.lastAnchoredEventHash) {
    return { valid: false, reason: 'snapshot_malformed' };
  }

  if (snapshot.hashVersion !== MANAGED_ACCESS_ASSURANCE_HASH_VERSION) {
    return { valid: false, reason: 'snapshot_malformed' };
  }

  if (snapshot.canonicalizationVersion !== MANAGED_ACCESS_ASSURANCE_CANONICALIZATION_VERSION) {
    return { valid: false, reason: 'snapshot_malformed' };
  }

  if (snapshot.createdAt !== null && !isIsoTimestampString(snapshot.createdAt)) {
    return { valid: false, reason: 'snapshot_malformed' };
  }

  if (context.expectedRequestId && snapshot.requestId !== context.expectedRequestId) {
    return { valid: false, reason: 'snapshot_malformed' };
  }

  if (
    context.expectedSequence !== undefined
    && context.expectedSequence !== null
    && snapshot.snapshotSequence !== context.expectedSequence
  ) {
    return { valid: false, reason: 'snapshot_malformed' };
  }

  return { valid: true };
}

async function listProvisioningEvidenceAnchorSnapshotEntries(requestId, options = {}) {
  const requestDirectory = getProvisioningEvidenceAnchorRequestDirectory(requestId, options);

  try {
    const entryNames = await fs.readdir(requestDirectory);
    return entryNames
      .map((entryName) => {
        const match = entryName.match(PROVISIONING_EVIDENCE_ANCHOR_SNAPSHOT_FILE_PATTERN);

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

async function readLatestProvisioningEvidenceAnchorSnapshot(requestId, options = {}) {
  const normalizedRequestId = normalizeAnchorRequestId(requestId);
  const entries = await listProvisioningEvidenceAnchorSnapshotEntries(normalizedRequestId, options);

  if (entries.length === 0) {
    return {
      status: 'missing',
      reason: 'snapshot_missing',
      requestId: normalizedRequestId,
      snapshotPath: null,
      snapshot: null,
    };
  }

  const latestEntry = entries[0];

  try {
    const rawSnapshot = await fs.readFile(latestEntry.filePath, 'utf8');
    const parsedSnapshot = JSON.parse(rawSnapshot);
    const validation = validateProvisioningEvidenceAnchorSnapshot(parsedSnapshot, {
      expectedRequestId: normalizedRequestId,
      expectedSequence: latestEntry.sequence,
    });

    if (!validation.valid) {
      return {
        status: 'invalid',
        reason: validation.reason,
        requestId: normalizedRequestId,
        snapshotPath: latestEntry.filePath,
        snapshot: null,
      };
    }

    return {
      status: 'valid',
      reason: 'snapshot_readable',
      requestId: normalizedRequestId,
      snapshotPath: latestEntry.filePath,
      snapshot: parsedSnapshot,
    };
  } catch (error) {
    return {
      status: 'invalid',
      reason: 'snapshot_malformed',
      requestId: normalizedRequestId,
      snapshotPath: latestEntry.filePath,
      snapshot: null,
    };
  }
}

async function inspectProvisioningEvidenceAnchorSnapshot(requestId, options = {}) {
  const normalizedRequestId = normalizeAnchorRequestId(requestId);
  const verificationResult = await verifyProvisioningEvidenceChain(normalizedRequestId);
  const snapshotReadResult = await readLatestProvisioningEvidenceAnchorSnapshot(normalizedRequestId, options);

  if (verificationResult.status !== 'valid') {
    return {
      status: 'skipped',
      reason: 'verification_invalid',
      requestId: normalizedRequestId,
      snapshotPath: snapshotReadResult.snapshotPath,
      snapshot: snapshotReadResult.snapshot,
      verificationResult,
    };
  }

  if (snapshotReadResult.status !== 'valid') {
    return {
      status: snapshotReadResult.status,
      reason: snapshotReadResult.reason,
      requestId: normalizedRequestId,
      snapshotPath: snapshotReadResult.snapshotPath,
      snapshot: snapshotReadResult.snapshot,
      verificationResult,
    };
  }

  const snapshot = snapshotReadResult.snapshot;
  const snapshotMatchesReplay = snapshot.hashVersion === verificationResult.hashVersion
    && snapshot.chainHeadSequence === verificationResult.chainHeadSequence
    && snapshot.chainHeadHash === verificationResult.chainHeadHash
    && snapshot.lastAnchoredEventHash === verificationResult.chainHeadHash;

  if (!snapshotMatchesReplay) {
    return {
      status: 'stale',
      reason: 'snapshot_replay_mismatch',
      requestId: normalizedRequestId,
      snapshotPath: snapshotReadResult.snapshotPath,
      snapshot,
      verificationResult,
    };
  }

  return {
    status: 'valid',
    reason: 'snapshot_matches_replay',
    requestId: normalizedRequestId,
    snapshotPath: snapshotReadResult.snapshotPath,
    snapshot,
    verificationResult,
  };
}

async function removeProvisioningEvidenceAnchorSnapshots(requestId, options = {}) {
  const normalizedRequestId = normalizeAnchorRequestId(requestId);
  const entries = await listProvisioningEvidenceAnchorSnapshotEntries(normalizedRequestId, options);

  await Promise.all(entries.map((entry) => fs.unlink(entry.filePath)));
}

async function writeProvisioningEvidenceAnchorSnapshotFile(snapshotPath, snapshot) {
  await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
  const snapshotBody = `${JSON.stringify(snapshot, null, 2)}\n`;
  const temporaryPath = `${snapshotPath}.tmp`;

  await fs.writeFile(temporaryPath, snapshotBody, 'utf8');
  await fs.rename(temporaryPath, snapshotPath);
}

async function rebuildProvisioningEvidenceAnchorSnapshot(requestId, options = {}) {
  const normalizedRequestId = normalizeAnchorRequestId(requestId);
  const verificationResult = await verifyProvisioningEvidenceChain(normalizedRequestId);

  if (verificationResult.status !== 'valid') {
    return {
      status: 'skipped',
      reason: 'verification_invalid',
      requestId: normalizedRequestId,
      snapshotPath: null,
      snapshot: null,
      verificationResult,
    };
  }

  const chainHead = await ProvisioningEvidenceChainHead.findOne({
    requestId: normalizeRequestId(normalizedRequestId),
  }).lean();

  const snapshot = buildProvisioningEvidenceAnchorSnapshot({
    requestId: normalizedRequestId,
    verificationResult,
    chainHead,
  });
  const snapshotPath = buildProvisioningEvidenceAnchorSnapshotPath(
    normalizedRequestId,
    snapshot.snapshotSequence,
    options,
  );

  await removeProvisioningEvidenceAnchorSnapshots(normalizedRequestId, options);
  await writeProvisioningEvidenceAnchorSnapshotFile(snapshotPath, snapshot);

  return {
    status: 'written',
    reason: 'snapshot_written',
    requestId: normalizedRequestId,
    snapshotPath,
    snapshot,
    verificationResult,
  };
}

module.exports = {
  PROVISIONING_EVIDENCE_ANCHOR_SNAPSHOT_FILE_PATTERN,
  PROVISIONING_EVIDENCE_ANCHOR_SNAPSHOT_TYPE,
  buildProvisioningEvidenceAnchorSnapshot,
  buildProvisioningEvidenceAnchorSnapshotPath,
  getProvisioningEvidenceAnchorDirectory,
  getProvisioningEvidenceAnchorRequestDirectory,
  inspectProvisioningEvidenceAnchorSnapshot,
  readLatestProvisioningEvidenceAnchorSnapshot,
  rebuildProvisioningEvidenceAnchorSnapshot,
  validateProvisioningEvidenceAnchorSnapshot,
};
