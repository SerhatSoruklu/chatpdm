'use strict';

const mongoose = require('mongoose');
const {
  PHASE_E_DECISION_OUTCOMES,
  PHASE_E_REVIEW_STATUSES,
  PHASE_E_TRUST_TIERS,
} = require('./phase-e.constants');
const {
  assertPersistableTrustReviewDecisionRecord,
} = require('./phase-e.validation');

function buildValidationSnapshot(document) {
  return {
    requestId: document.requestId,
    reviewStatus: document.reviewStatus,
    decisionOutcome: document.decisionOutcome,
    reviewerIdentity: document.reviewerIdentity,
    decisionTimestamp: document.decisionTimestamp,
    internalNotes: document.internalNotes,
    sectorPackageRecommendation: document.sectorPackageRecommendation,
    riskFlags: document.riskFlags,
    trustTier: document.trustTier,
    reviewReminderAt: document.reviewReminderAt,
  };
}

const trustReviewDecisionSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: 'ChatPdmManagedAccessRequest',
    },
    reviewStatus: {
      type: String,
      required: true,
      enum: PHASE_E_REVIEW_STATUSES,
      trim: true,
      default: 'queued',
    },
    decisionOutcome: {
      type: String,
      default: null,
      enum: [...PHASE_E_DECISION_OUTCOMES, null],
      trim: true,
    },
    reviewerIdentity: {
      type: String,
      default: null,
      trim: true,
    },
    decisionTimestamp: {
      type: Date,
      default: null,
    },
    internalNotes: {
      type: String,
      trim: true,
      default: '',
    },
    sectorPackageRecommendation: {
      type: String,
      default: null,
      trim: true,
    },
    riskFlags: {
      type: [String],
      default: [],
    },
    trustTier: {
      type: String,
      required: true,
      enum: PHASE_E_TRUST_TIERS,
      trim: true,
      default: 'pending_review',
    },
    reviewReminderAt: {
      type: Date,
      default: null,
    },
  },
  {
    strict: 'throw',
    timestamps: true,
    versionKey: false,
  },
);

trustReviewDecisionSchema.pre('validate', function validateTrustReviewDecision() {
  assertPersistableTrustReviewDecisionRecord(buildValidationSnapshot(this));
});

trustReviewDecisionSchema.index(
  { reviewStatus: 1, updatedAt: -1, _id: 1 },
  {
    name: 'trust_review_decision_status_updated_at',
  },
);

trustReviewDecisionSchema.index(
  { reviewStatus: 1, trustTier: 1, updatedAt: -1, _id: 1 },
  {
    name: 'trust_review_decision_status_tier_updated_at',
  },
);

trustReviewDecisionSchema.index(
  { decisionOutcome: 1, decisionTimestamp: -1, _id: 1 },
  {
    name: 'trust_review_decision_outcome_timestamp',
    partialFilterExpression: {
      decisionOutcome: { $type: 'string' },
    },
  },
);

trustReviewDecisionSchema.index(
  { trustTier: 1, updatedAt: -1, _id: 1 },
  {
    name: 'trust_review_decision_tier_updated_at',
  },
);

module.exports = mongoose.models.ChatPdmTrustReviewDecision
  || mongoose.model('ChatPdmTrustReviewDecision', trustReviewDecisionSchema);
