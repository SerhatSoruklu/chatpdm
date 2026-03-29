'use strict';

const mongoose = require('mongoose');
const {
  MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
} = require('./config/managed-access-assurance.config');
const {
  assertPersistableProvisioningEvidenceChainHeadRecord,
} = require('./phase-e.validation');

const PROVISIONING_EVIDENCE_CHAIN_HEAD_SOURCE_OF_TRUTH_FIELDS = Object.freeze([
  'requestId',
  'hashVersion',
  'lastSequence',
  'lastEventHash',
  'lastRecordedAt',
  'inFlightAppendToken',
  'inFlightSequence',
  'inFlightPreviousHash',
  'inFlightRecordedAt',
  'inFlightExpiresAt',
]);

const PROVISIONING_EVIDENCE_CHAIN_HEAD_CACHED_ASSURANCE_FIELDS = Object.freeze([
  'lastVerifiedSequence',
  'lastVerifiedAt',
  'lastVerificationStatus',
  'lastVerificationReason',
  'lastAnchoredSequence',
  'lastAnchoredAt',
  'lastAnchorStatus',
  'lastAnchorPath',
  'lastSignedSequence',
  'lastSignedAt',
  'lastCheckpointKeyId',
  'lastCheckpointSignature',
]);

function buildValidationSnapshot(document) {
  return {
    requestId: document.requestId,
    hashVersion: document.hashVersion,
    lastSequence: document.lastSequence,
    lastEventHash: document.lastEventHash,
    lastRecordedAt: document.lastRecordedAt,
    inFlightAppendToken: document.inFlightAppendToken,
    inFlightSequence: document.inFlightSequence,
    inFlightPreviousHash: document.inFlightPreviousHash,
    inFlightRecordedAt: document.inFlightRecordedAt,
    inFlightExpiresAt: document.inFlightExpiresAt,
    lastVerifiedSequence: document.lastVerifiedSequence,
    lastVerifiedAt: document.lastVerifiedAt,
    lastVerificationStatus: document.lastVerificationStatus,
    lastVerificationReason: document.lastVerificationReason,
    lastAnchoredSequence: document.lastAnchoredSequence,
    lastAnchoredAt: document.lastAnchoredAt,
    lastAnchorStatus: document.lastAnchorStatus,
    lastAnchorPath: document.lastAnchorPath,
    lastSignedSequence: document.lastSignedSequence,
    lastSignedAt: document.lastSignedAt,
    lastCheckpointKeyId: document.lastCheckpointKeyId,
    lastCheckpointSignature: document.lastCheckpointSignature,
  };
}

const provisioningEvidenceChainHeadSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'ChatPdmManagedAccessRequest',
    },
    hashVersion: {
      type: Number,
      required: true,
      default: MANAGED_ACCESS_ASSURANCE_HASH_VERSION,
    },
    lastSequence: {
      type: Number,
      required: true,
      default: 0,
    },
    lastEventHash: {
      type: String,
      default: null,
      trim: true,
    },
    lastRecordedAt: {
      type: Date,
      default: null,
    },
    inFlightAppendToken: {
      type: String,
      default: null,
      trim: true,
    },
    inFlightSequence: {
      type: Number,
      default: null,
    },
    inFlightPreviousHash: {
      type: String,
      default: null,
      trim: true,
    },
    inFlightRecordedAt: {
      type: Date,
      default: null,
    },
    inFlightExpiresAt: {
      type: Date,
      default: null,
    },
    lastVerifiedSequence: {
      type: Number,
      default: null,
    },
    lastVerifiedAt: {
      type: Date,
      default: null,
    },
    lastVerificationStatus: {
      type: String,
      default: null,
      trim: true,
    },
    lastVerificationReason: {
      type: String,
      default: null,
      trim: true,
    },
    lastAnchoredSequence: {
      type: Number,
      default: null,
    },
    lastAnchoredAt: {
      type: Date,
      default: null,
    },
    lastAnchorStatus: {
      type: String,
      default: null,
      trim: true,
    },
    lastAnchorPath: {
      type: String,
      default: null,
      trim: true,
    },
    lastSignedSequence: {
      type: Number,
      default: null,
    },
    lastSignedAt: {
      type: Date,
      default: null,
    },
    lastCheckpointKeyId: {
      type: String,
      default: null,
      trim: true,
    },
    lastCheckpointSignature: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    strict: 'throw',
    versionKey: false,
  },
);

provisioningEvidenceChainHeadSchema.pre('validate', function validateProvisioningEvidenceChainHead() {
  assertPersistableProvisioningEvidenceChainHeadRecord(buildValidationSnapshot(this));
});

provisioningEvidenceChainHeadSchema.index(
  { requestId: 1 },
  {
    name: 'provisioning_evidence_chain_head_request_unique',
    unique: true,
  },
);

const ProvisioningEvidenceChainHead = mongoose.models.ChatPdmProvisioningEvidenceChainHead
  || mongoose.model('ChatPdmProvisioningEvidenceChainHead', provisioningEvidenceChainHeadSchema);

ProvisioningEvidenceChainHead.PROVISIONING_EVIDENCE_CHAIN_HEAD_SOURCE_OF_TRUTH_FIELDS =
  PROVISIONING_EVIDENCE_CHAIN_HEAD_SOURCE_OF_TRUTH_FIELDS;
ProvisioningEvidenceChainHead.PROVISIONING_EVIDENCE_CHAIN_HEAD_CACHED_ASSURANCE_FIELDS =
  PROVISIONING_EVIDENCE_CHAIN_HEAD_CACHED_ASSURANCE_FIELDS;

module.exports = ProvisioningEvidenceChainHead;
