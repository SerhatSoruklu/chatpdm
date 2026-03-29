'use strict';

const mongoose = require('mongoose');
const {
  MANAGED_ACCESS_EVIDENCE_EVENT_TYPES,
  MANAGED_ACCESS_STATUSES,
  MANAGED_ACCESS_TRUST_LEVELS,
  MANAGED_ACCESS_VERIFICATION_METHODS,
  MANAGED_ACCESS_VERIFICATION_STATES,
} = require('./constants');

const managedAccessEvidenceEventSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'ChatPdmManagedAccessRequest',
    },
    verificationMethod: {
      type: String,
      required: true,
      enum: MANAGED_ACCESS_VERIFICATION_METHODS,
      trim: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: MANAGED_ACCESS_EVIDENCE_EVENT_TYPES,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(MANAGED_ACCESS_STATUSES),
      trim: true,
    },
    verificationState: {
      type: String,
      required: true,
      enum: MANAGED_ACCESS_VERIFICATION_STATES,
      trim: true,
    },
    trustLevel: {
      type: String,
      required: true,
      enum: MANAGED_ACCESS_TRUST_LEVELS,
      trim: true,
    },
    challengeLocator: {
      type: String,
      default: null,
      trim: true,
    },
    challengeFingerprint: {
      type: String,
      default: null,
      trim: true,
    },
    detailCode: {
      type: String,
      default: null,
      trim: true,
    },
    recordedAt: {
      type: Date,
      required: true,
    },
    context: {
      type: String,
      required: true,
      trim: true,
      default: 'managed_access_evidence_ledger',
    },
  },
  {
    strict: 'throw',
    versionKey: false,
  },
);

managedAccessEvidenceEventSchema.index(
  { requestId: 1, recordedAt: 1, _id: 1 },
  { name: 'managed_access_evidence_request_recorded_at' },
);

module.exports = mongoose.models.ChatPdmManagedAccessEvidenceEvent
  || mongoose.model('ChatPdmManagedAccessEvidenceEvent', managedAccessEvidenceEventSchema);
