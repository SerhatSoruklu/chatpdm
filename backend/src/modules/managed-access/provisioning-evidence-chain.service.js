'use strict';

// INTEGRITY LAW:
// This module is governed by docs/INTERGRITY_RUNTIME_LAWS.md
// Violations of canonical truth, refusal boundary, or hashing determinism are forbidden.

const crypto = require('node:crypto');
const mongoose = require('mongoose');
const {
  assertIntegrityLaw,
} = require('../../lib/assert-integrity-law');

const {
  MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
} = require('./config/managed-access-assurance.config');
const {
  canonicalizeEvent,
} = require('./provisioning-evidence-canonicalization');
const ProvisioningEvidenceChainHead = require('./provisioning-evidence-chain-head.model');
const ProvisioningEvidenceEvent = require('./provisioning-evidence-event.model');

const DEFAULT_INFLIGHT_RESERVATION_TTL_MS = 5 * 60 * 1000;
const PROHIBITED_APPEND_CANDIDATE_FIELDS = Object.freeze([
  'sequence',
  'previousHash',
  'eventHash',
  'hashVersion',
  'recordedAt',
]);

const OBJECT_ID_STRING_PATTERN = /^[a-f0-9]{24}$/i;

const ALLOWED_APPEND_CANDIDATE_FIELDS = Object.freeze([
  'requestId',
  'actorIdentity',
  'reviewDecisionId',
  'deploymentAssignmentId',
  'provisioningJobId',
  'institutionWorkspaceId',
  'eventType',
  'reviewerIdentity',
  'decisionTimestamp',
  'decisionOutcome',
  'deploymentMode',
  'tenantSubdomain',
  'pm2AppName',
  'nginxBinding',
  'packageVersion',
  'healthCheckResult',
  'activationTimestamp',
  'provisioningEvidenceHash',
  'context',
]);

const CLEARED_INFLIGHT_APPEND_STATE = Object.freeze({
  inFlightAppendToken: null,
  inFlightSequence: null,
  inFlightPreviousHash: null,
  inFlightRecordedAt: null,
  inFlightExpiresAt: null,
});

const PROVISIONING_EVIDENCE_HASH_PAYLOAD_KEYS = Object.freeze([
  'reviewDecisionId',
  'deploymentAssignmentId',
  'provisioningJobId',
  'institutionWorkspaceId',
  'reviewerIdentity',
  'decisionTimestamp',
  'decisionOutcome',
  'deploymentMode',
  'tenantSubdomain',
  'pm2AppName',
  'nginxBinding',
  'packageVersion',
  'healthCheckResult',
  'activationTimestamp',
  'provisioningEvidenceHash',
  'context',
]);

const LOWERCASE_SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

class ProvisioningEvidenceChainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ProvisioningEvidenceChainError';
    this.code = code;
  }
}

function assertPlainObject(value, fieldName) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ProvisioningEvidenceChainError(
      'invalid_append_candidate',
      `${fieldName} must be a plain object.`,
    );
  }
}

function normalizeRequestId(value) {
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (typeof value !== 'string' || !OBJECT_ID_STRING_PATTERN.test(value)) {
    throw new ProvisioningEvidenceChainError(
      'invalid_append_candidate',
      'requestId must be a valid Mongo ObjectId value.',
    );
  }

  return new mongoose.Types.ObjectId(value);
}

function buildAllowedAppendCandidate(candidate) {
  const normalizedCandidate = {
    requestId: normalizeRequestId(candidate.requestId),
  };

  for (const fieldName of ALLOWED_APPEND_CANDIDATE_FIELDS) {
    if (fieldName === 'requestId') {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(candidate, fieldName)) {
      normalizedCandidate[fieldName] = candidate[fieldName];
    }
  }

  return normalizedCandidate;
}

function normalizeAppendCandidate(candidate) {
  assertPlainObject(candidate, 'Append candidate');

  for (const prohibitedField of PROHIBITED_APPEND_CANDIDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(candidate, prohibitedField)) {
      throw new ProvisioningEvidenceChainError(
        'invalid_append_candidate',
        `${prohibitedField} is owned by the append flow and must not be supplied by callers.`,
      );
    }
  }

  for (const fieldName of Object.keys(candidate)) {
    if (
      !ALLOWED_APPEND_CANDIDATE_FIELDS.includes(fieldName)
      && !PROHIBITED_APPEND_CANDIDATE_FIELDS.includes(fieldName)
    ) {
      throw new ProvisioningEvidenceChainError(
        'invalid_append_candidate',
        `${fieldName} is not an allowed provisioning evidence append field.`,
      );
    }
  }

  return buildAllowedAppendCandidate(candidate);
}

function buildInitialChainHeadState(requestId) {
  return {
    requestId,
    hashVersion: MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
    lastSequence: 0,
    lastEventHash: null,
    lastRecordedAt: null,
    inFlightAppendToken: null,
    inFlightSequence: null,
    inFlightPreviousHash: null,
    inFlightRecordedAt: null,
    inFlightExpiresAt: null,
    lastVerifiedSequence: null,
    lastVerifiedAt: null,
    lastVerificationStatus: null,
    lastVerificationReason: null,
    lastAnchoredSequence: null,
    lastAnchoredAt: null,
    lastAnchorStatus: null,
    lastAnchorPath: null,
    lastSignedSequence: null,
    lastSignedAt: null,
    lastCheckpointKeyId: null,
    lastCheckpointSignature: null,
  };
}

function buildProvisioningEvidenceHashPayload(candidate) {
  const payload = PROVISIONING_EVIDENCE_HASH_PAYLOAD_KEYS.reduce((payloadAccumulator, key) => {
    payloadAccumulator[key] = candidate[key] === undefined ? null : candidate[key];
    return payloadAccumulator;
  }, {});

  assertIntegrityLaw(
    PROVISIONING_EVIDENCE_HASH_PAYLOAD_KEYS.every((key) => Object.prototype.hasOwnProperty.call(payload, key)),
    'Provisioning evidence hash payload must include every whitelisted key before canonicalization',
  );

  return payload;
}

function assertPersistableProvisioningEvidencePreviousHash(reservation) {
  const previousHashIsValid = reservation.sequence === 1
    ? reservation.previousHash === null
    : typeof reservation.previousHash === 'string' && LOWERCASE_SHA256_HEX_PATTERN.test(reservation.previousHash);

  assertIntegrityLaw(
    previousHashIsValid,
    'previousHash must satisfy sequence law before provisioning evidence persistence',
  );
}

function assertPersistableProvisioningEvidenceEventHash(eventHash) {
  assertIntegrityLaw(
    typeof eventHash === 'string' && LOWERCASE_SHA256_HEX_PATTERN.test(eventHash),
    'eventHash must exist as a lowercase 64-character hash before persistence',
  );
}

function assertProvisioningEvidenceCanonicalEnvelopeInputs(candidate, reservation) {
  const requestIdValue = reservation.requestId;
  const requestIdIsValid = requestIdValue instanceof mongoose.Types.ObjectId
    || (typeof requestIdValue === 'string' && OBJECT_ID_STRING_PATTERN.test(requestIdValue));

  assertIntegrityLaw(
    requestIdIsValid,
    'canonical provisioning evidence envelope must include a valid requestId',
  );

  assertIntegrityLaw(
    Number.isInteger(reservation.sequence) && reservation.sequence >= 1,
    'canonical provisioning evidence envelope must include a positive integer sequence',
  );

  assertIntegrityLaw(
    reservation.hashVersion === MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
    'canonical provisioning evidence envelope must use the locked hashVersion',
  );

  assertIntegrityLaw(
    typeof candidate.eventType === 'string' && candidate.eventType.length > 0,
    'canonical provisioning evidence envelope must include eventType',
  );

  assertIntegrityLaw(
    typeof candidate.actorIdentity === 'string' && candidate.actorIdentity.length > 0,
    'canonical provisioning evidence envelope must include actorIdentity',
  );

  assertIntegrityLaw(
    reservation.recordedAt instanceof Date && !Number.isNaN(reservation.recordedAt.getTime()),
    'canonical provisioning evidence envelope must include a valid recordedAt',
  );
}

function buildProvisioningEvidenceCanonicalEnvelope(candidate, reservation) {
  assertProvisioningEvidenceCanonicalEnvelopeInputs(candidate, reservation);
  const payload = buildProvisioningEvidenceHashPayload(candidate);

  return {
    hashVersion: reservation.hashVersion,
    requestId: reservation.requestId,
    sequence: reservation.sequence,
    eventType: candidate.eventType,
    actorIdentity: candidate.actorIdentity,
    recordedAt: reservation.recordedAt,
    payload,
    previousHash: reservation.previousHash,
  };
}

function buildProvisioningEvidenceEventDocument(candidate, reservation, eventHash) {
  assertPersistableProvisioningEvidencePreviousHash(reservation);
  assertPersistableProvisioningEvidenceEventHash(eventHash);

  assertIntegrityLaw(
    candidate.requestId instanceof mongoose.Types.ObjectId,
    'Provisioning evidence persistence requires a normalized ObjectId requestId',
  );

  assertIntegrityLaw(
    typeof candidate.actorIdentity === 'string' && candidate.actorIdentity.length > 0,
    'Provisioning evidence persistence requires actorIdentity',
  );

  assertIntegrityLaw(
    reservation.recordedAt instanceof Date && !Number.isNaN(reservation.recordedAt.getTime()),
    'Provisioning evidence persistence requires a valid recordedAt',
  );

  return {
    requestId: candidate.requestId,
    sequence: reservation.sequence,
    hashVersion: reservation.hashVersion,
    actorIdentity: candidate.actorIdentity,
    previousHash: reservation.previousHash,
    eventHash,
    reviewDecisionId: candidate.reviewDecisionId,
    deploymentAssignmentId: candidate.deploymentAssignmentId,
    provisioningJobId: candidate.provisioningJobId,
    institutionWorkspaceId: candidate.institutionWorkspaceId,
    eventType: candidate.eventType,
    reviewerIdentity: candidate.reviewerIdentity,
    decisionTimestamp: candidate.decisionTimestamp,
    decisionOutcome: candidate.decisionOutcome,
    deploymentMode: candidate.deploymentMode,
    tenantSubdomain: candidate.tenantSubdomain,
    pm2AppName: candidate.pm2AppName,
    nginxBinding: candidate.nginxBinding,
    packageVersion: candidate.packageVersion,
    healthCheckResult: candidate.healthCheckResult,
    activationTimestamp: candidate.activationTimestamp,
    provisioningEvidenceHash: candidate.provisioningEvidenceHash,
    recordedAt: reservation.recordedAt,
    context: candidate.context,
  };
}

function computeProvisioningEvidenceEventHash(envelope) {
  return crypto
    .createHash('sha256')
    .update(canonicalizeEvent(envelope), 'utf8')
    .digest('hex');
}

async function assertReservedPreviousHashConsistency(requestId, reservation) {
  if (reservation.sequence === 1) {
    if (reservation.previousHash !== null) {
      throw new ProvisioningEvidenceChainError(
        'previous_hash_mismatch',
        'Sequence 1 provisioning evidence events must reserve previousHash as null.',
      );
    }

    return;
  }

  if (typeof reservation.previousHash !== 'string' || !/^[a-f0-9]{64}$/.test(reservation.previousHash)) {
    throw new ProvisioningEvidenceChainError(
      'previous_hash_mismatch',
      'Reserved previousHash must be a lowercase 64-character hexadecimal hash after sequence 1.',
    );
  }

  const priorEvent = await ProvisioningEvidenceEvent.findOne({
    requestId,
    sequence: reservation.sequence - 1,
    hashVersion: reservation.hashVersion,
  })
    .select({ eventHash: 1 })
    .sort({ _id: 1 })
    .lean();

  if (!priorEvent || priorEvent.eventHash !== reservation.previousHash) {
    throw new ProvisioningEvidenceChainError(
      'previous_hash_mismatch',
      'Reserved previousHash does not match the prior persisted provisioning evidence event hash.',
    );
  }
}

async function ensureProvisioningEvidenceChainHead(requestId) {
  return ProvisioningEvidenceChainHead.findOneAndUpdate(
    { requestId },
    {
      $setOnInsert: buildInitialChainHeadState(requestId),
    },
    {
      returnDocument: 'after',
      upsert: true,
    },
  );
}

async function reserveProvisioningEvidenceAppend(requestId, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const ttlMs = Number.isInteger(options.ttlMs) && options.ttlMs > 0
    ? options.ttlMs
    : DEFAULT_INFLIGHT_RESERVATION_TTL_MS;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const currentHead = await ensureProvisioningEvidenceChainHead(requestId);

    if (currentHead.inFlightAppendToken) {
      if (
        currentHead.inFlightExpiresAt instanceof Date
        && currentHead.inFlightExpiresAt.getTime() <= now.getTime()
      ) {
        throw new ProvisioningEvidenceChainError(
          'stale_inflight_append',
          'A stale provisioning evidence append reservation is blocking this request and must be repaired explicitly.',
        );
      }

      throw new ProvisioningEvidenceChainError(
        'evidence_chain_append_blocked',
        'A provisioning evidence append is already in flight for this request.',
      );
    }

    const reservationToken = new mongoose.Types.ObjectId().toHexString();
    const reservedHead = await ProvisioningEvidenceChainHead.findOneAndUpdate(
      {
        requestId: currentHead.requestId,
        inFlightAppendToken: null,
        lastSequence: currentHead.lastSequence,
      },
      {
        $set: {
          inFlightAppendToken: reservationToken,
          inFlightSequence: currentHead.lastSequence + 1,
          inFlightPreviousHash: currentHead.lastEventHash,
          inFlightRecordedAt: now,
          inFlightExpiresAt: new Date(now.getTime() + ttlMs),
        },
      },
      {
        returnDocument: 'after',
      },
    );

    if (reservedHead) {
      return {
        requestId: reservedHead.requestId,
        hashVersion: reservedHead.hashVersion,
        reservationToken,
        sequence: reservedHead.inFlightSequence,
        previousHash: reservedHead.inFlightPreviousHash,
        recordedAt: reservedHead.inFlightRecordedAt,
        expiresAt: reservedHead.inFlightExpiresAt,
      };
    }
  }

  throw new ProvisioningEvidenceChainError(
    'evidence_chain_reservation_conflict',
    'Unable to reserve the next provisioning evidence sequence after multiple attempts.',
  );
}

async function appendProvisioningEvidenceEvent(candidate, options = {}) {
  const normalizedCandidate = normalizeAppendCandidate(candidate);
  const reservation = await reserveProvisioningEvidenceAppend(
    normalizedCandidate.requestId,
    options,
  );
  await assertReservedPreviousHashConsistency(normalizedCandidate.requestId, reservation);
  const canonicalEnvelope = buildProvisioningEvidenceCanonicalEnvelope(
    normalizedCandidate,
    reservation,
  );
  const eventHash = computeProvisioningEvidenceEventHash(canonicalEnvelope);
  assertPersistableProvisioningEvidenceEventHash(eventHash);

  const provisioningEvidenceEvent = new ProvisioningEvidenceEvent(
    buildProvisioningEvidenceEventDocument(normalizedCandidate, reservation, eventHash),
  );

  provisioningEvidenceEvent.$locals.provisioningEvidenceAppendAuthorized = true;

  await provisioningEvidenceEvent.save();

  const finalizedHead = await ProvisioningEvidenceChainHead.findOneAndUpdate(
    {
      requestId: reservation.requestId,
      inFlightAppendToken: reservation.reservationToken,
      inFlightSequence: reservation.sequence,
    },
    {
      $set: {
        lastSequence: reservation.sequence,
        lastEventHash: eventHash,
        lastRecordedAt: reservation.recordedAt,
        ...CLEARED_INFLIGHT_APPEND_STATE,
      },
    },
    {
      returnDocument: 'after',
    },
  );

  if (!finalizedHead) {
    throw new ProvisioningEvidenceChainError(
      'evidence_chain_finalize_failed',
      'Provisioning evidence event was persisted but the chain head could not be finalized. Explicit repair is required.',
    );
  }

  return provisioningEvidenceEvent;
}

async function repairProvisioningEvidenceChainHead(requestId, options = {}) {
  const normalizedRequestId = normalizeRequestId(requestId);
  const now = options.now instanceof Date ? options.now : new Date();
  const chainHead = await ProvisioningEvidenceChainHead.findOne({ requestId: normalizedRequestId });

  if (!chainHead || !chainHead.inFlightAppendToken) {
    return {
      status: 'noop',
      reason: 'no_inflight_append',
      requestId: normalizedRequestId.toHexString(),
    };
  }

  if (
    !(chainHead.inFlightExpiresAt instanceof Date)
    || chainHead.inFlightExpiresAt.getTime() > now.getTime()
  ) {
    return {
      status: 'noop',
      reason: 'reservation_not_stale',
      requestId: normalizedRequestId.toHexString(),
      sequence: chainHead.inFlightSequence,
    };
  }

  const persistedEvent = await ProvisioningEvidenceEvent.findOne({
    requestId: normalizedRequestId,
    sequence: chainHead.inFlightSequence,
    hashVersion: chainHead.hashVersion,
    recordedAt: chainHead.inFlightRecordedAt,
    previousHash: chainHead.inFlightPreviousHash,
  }).sort({ _id: 1 });

  if (persistedEvent) {
    assertPersistableProvisioningEvidenceEventHash(persistedEvent.eventHash);

    const finalizedHead = await ProvisioningEvidenceChainHead.findOneAndUpdate(
      {
        _id: chainHead._id,
        inFlightAppendToken: chainHead.inFlightAppendToken,
        inFlightSequence: chainHead.inFlightSequence,
      },
      {
        $set: {
          lastSequence: persistedEvent.sequence,
          lastEventHash: persistedEvent.eventHash,
          lastRecordedAt: persistedEvent.recordedAt,
          ...CLEARED_INFLIGHT_APPEND_STATE,
        },
      },
      {
        returnDocument: 'after',
      },
    );

    if (!finalizedHead) {
      throw new ProvisioningEvidenceChainError(
        'evidence_chain_repair_conflict',
        'The stale provisioning evidence reservation changed during repair finalization.',
      );
    }

    return {
      status: 'finalized_persisted_event',
      requestId: normalizedRequestId.toHexString(),
      sequence: persistedEvent.sequence,
    };
  }

  const clearedHead = await ProvisioningEvidenceChainHead.findOneAndUpdate(
    {
      _id: chainHead._id,
      inFlightAppendToken: chainHead.inFlightAppendToken,
      inFlightSequence: chainHead.inFlightSequence,
    },
    {
      $set: {
        ...CLEARED_INFLIGHT_APPEND_STATE,
      },
    },
    {
      returnDocument: 'after',
    },
  );

  if (!clearedHead) {
    throw new ProvisioningEvidenceChainError(
      'evidence_chain_repair_conflict',
      'The stale provisioning evidence reservation changed during repair clearing.',
    );
  }

  return {
    status: 'cleared_stale_reservation',
    requestId: normalizedRequestId.toHexString(),
    sequence: chainHead.inFlightSequence,
  };
}

module.exports = {
  DEFAULT_INFLIGHT_RESERVATION_TTL_MS,
  PROHIBITED_APPEND_CANDIDATE_FIELDS,
  PROVISIONING_EVIDENCE_HASH_PAYLOAD_KEYS,
  ProvisioningEvidenceChainError,
  appendProvisioningEvidenceEvent,
  assertReservedPreviousHashConsistency,
  buildProvisioningEvidenceCanonicalEnvelope,
  buildProvisioningEvidenceHashPayload,
  computeProvisioningEvidenceEventHash,
  ensureProvisioningEvidenceChainHead,
  normalizeRequestId,
  repairProvisioningEvidenceChainHead,
  reserveProvisioningEvidenceAppend,
};
