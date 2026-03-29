'use strict';

// INTEGRITY LAW:
// This module is governed by docs/INTERGRITY_RUNTIME_LAWS.md
// Violations of canonical truth, refusal boundary, or hashing determinism are forbidden.

const {
  MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
} = require('./config/managed-access-assurance.config');
const {
  assertIntegrityLaw,
} = require('../../lib/assert-integrity-law');
const ProvisioningEvidenceChainHead = require('./provisioning-evidence-chain-head.model');
const ProvisioningEvidenceEvent = require('./provisioning-evidence-event.model');
const {
  buildProvisioningEvidenceCanonicalEnvelope,
  computeProvisioningEvidenceEventHash,
  normalizeRequestId,
} = require('./provisioning-evidence-chain.service');

function buildVerifierResult({
  requestId,
  status,
  verifiedThroughSequence,
  chainHeadSequence,
  chainHeadHash,
  brokenAtSequence,
  expectedHash,
  actualHash,
  reason,
}) {
  return {
    requestId,
    hashVersion: MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
    status,
    verifiedThroughSequence,
    chainHeadSequence,
    chainHeadHash,
    brokenAtSequence,
    expectedHash,
    actualHash,
    reason,
  };
}

function buildInvalidVerifierResult(baseResult, overrides) {
  return buildVerifierResult({
    ...baseResult,
    status: 'invalid',
    ...overrides,
  });
}

function buildValidVerifierResult(baseResult, overrides = {}) {
  return buildVerifierResult({
    ...baseResult,
    status: 'valid',
    brokenAtSequence: null,
    expectedHash: null,
    actualHash: null,
    ...overrides,
  });
}

function buildBaseVerifierResult(normalizedRequestId, chainHead) {
  return {
    requestId: normalizedRequestId.toHexString(),
    verifiedThroughSequence: 0,
    chainHeadSequence: chainHead ? chainHead.lastSequence : 0,
    chainHeadHash: chainHead ? chainHead.lastEventHash : null,
    brokenAtSequence: null,
    expectedHash: null,
    actualHash: null,
    reason: 'no_events',
  };
}

async function verifyProvisioningEvidenceChain(requestId) {
  const normalizedRequestId = normalizeRequestId(requestId);
  const [chainHead, events] = await Promise.all([
    ProvisioningEvidenceChainHead.findOne({ requestId: normalizedRequestId }).lean(),
    ProvisioningEvidenceEvent.find({ requestId: normalizedRequestId })
      .sort({ sequence: 1, _id: 1 })
      .lean(),
  ]);

  const baseResult = buildBaseVerifierResult(normalizedRequestId, chainHead);

  if (chainHead && chainHead.hashVersion !== MANAGED_ACCESS_ASSURANCE_HASH_VERSION) {
    return buildInvalidVerifierResult(baseResult, {
      reason: 'hash_version_mismatch',
      actualHash: chainHead.lastEventHash,
    });
  }

  if (events.length === 0) {
    if (baseResult.chainHeadSequence !== 0) {
      return buildInvalidVerifierResult(baseResult, {
        reason: 'chain_head_sequence_mismatch',
        expectedHash: null,
        actualHash: null,
      });
    }

    if (baseResult.chainHeadHash !== null) {
      return buildInvalidVerifierResult(baseResult, {
        reason: 'chain_head_hash_mismatch',
        actualHash: baseResult.chainHeadHash,
      });
    }

    return buildValidVerifierResult(baseResult, {
      reason: 'no_events',
    });
  }

  const firstEvent = events[0];

  if (firstEvent.sequence !== 1 || firstEvent.previousHash !== null) {
    return buildInvalidVerifierResult(baseResult, {
      brokenAtSequence: firstEvent.sequence,
      actualHash: firstEvent.eventHash,
      reason: 'first_event_invalid',
    });
  }

  let priorEvent = null;
  let verifiedThroughSequence = 0;

  for (const event of events) {
    if (event.hashVersion !== MANAGED_ACCESS_ASSURANCE_HASH_VERSION) {
      return buildInvalidVerifierResult(baseResult, {
        verifiedThroughSequence,
        brokenAtSequence: event.sequence,
        actualHash: event.eventHash,
        reason: 'hash_version_mismatch',
      });
    }

    if (priorEvent && event.sequence !== priorEvent.sequence + 1) {
      return buildInvalidVerifierResult(baseResult, {
        verifiedThroughSequence,
        brokenAtSequence: event.sequence,
        actualHash: event.eventHash,
        reason: 'sequence_gap',
      });
    }

    if (priorEvent && event.previousHash !== priorEvent.eventHash) {
      return buildInvalidVerifierResult(baseResult, {
        verifiedThroughSequence,
        brokenAtSequence: event.sequence,
        expectedHash: priorEvent.eventHash,
        actualHash: event.previousHash,
        reason: 'previous_hash_mismatch',
      });
    }

    let expectedHash;

    try {
      expectedHash = computeProvisioningEvidenceEventHash(
        buildProvisioningEvidenceCanonicalEnvelope(event, event),
      );

      assertIntegrityLaw(
        typeof expectedHash === 'string' && /^[a-f0-9]{64}$/.test(expectedHash),
        'verifier must recompute a lowercase 64-character expected hash for each replayed event',
      );
    } catch (error) {
      if (error && error.code === 'canonicalization_contract_violation') {
        return buildInvalidVerifierResult(baseResult, {
          verifiedThroughSequence,
          brokenAtSequence: event.sequence,
          actualHash: event.eventHash,
          reason: 'canonicalization_contract_violation',
        });
      }

      throw error;
    }

    if (event.eventHash !== expectedHash) {
      return buildInvalidVerifierResult(baseResult, {
        verifiedThroughSequence,
        brokenAtSequence: event.sequence,
        expectedHash,
        actualHash: event.eventHash,
        reason: 'event_hash_mismatch',
      });
    }

    verifiedThroughSequence = event.sequence;
    priorEvent = event;
  }

  if (baseResult.chainHeadSequence !== priorEvent.sequence) {
    return buildInvalidVerifierResult(baseResult, {
      verifiedThroughSequence,
      reason: 'chain_head_sequence_mismatch',
      expectedHash: null,
      actualHash: null,
    });
  }

  if (baseResult.chainHeadHash !== priorEvent.eventHash) {
    return buildInvalidVerifierResult(baseResult, {
      verifiedThroughSequence,
      expectedHash: priorEvent.eventHash,
      actualHash: baseResult.chainHeadHash,
      reason: 'chain_head_hash_mismatch',
    });
  }

  return buildValidVerifierResult(baseResult, {
    verifiedThroughSequence,
    chainHeadSequence: priorEvent.sequence,
    chainHeadHash: priorEvent.eventHash,
    reason: 'chain_valid',
  });
}

module.exports = {
  verifyProvisioningEvidenceChain,
};
