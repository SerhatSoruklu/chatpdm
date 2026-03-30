'use strict';

const mongoose = require('mongoose');

const successEligibleReviewStates = new Set(['accepted', 'auto_accepted']);

const argumentUnitSchema = new mongoose.Schema(
  {
    argumentUnitId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    matterId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    documentId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    sourceSegmentIds: {
      type: [String],
      default: [],
      index: true,
    },
    unitType: {
      type: String,
      enum: [
        'issue_statement',
        'factual_assertion',
        'legal_rule',
        'application_step',
        'conclusion',
        'exception_claim',
        'rebuttal',
      ],
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
    },
    normalizedText: {
      type: String,
      required: true,
    },
    speakerRole: {
      type: String,
      enum: ['claimant', 'defendant', 'court', 'unknown'],
      default: 'unknown',
    },
    positionSide: {
      type: String,
      enum: ['claimant', 'defendant', 'neutral', 'unknown'],
      default: 'unknown',
    },
    sequence: {
      type: Number,
      required: true,
      index: true,
    },
    extractionMethod: {
      type: String,
      enum: ['manual', 'machine_assisted', 'imported'],
      required: true,
    },
    reviewState: {
      type: String,
      enum: ['pending_review', 'accepted', 'rejected', 'auto_accepted'],
      required: true,
      index: true,
    },
    admissibility: {
      type: String,
      enum: ['admissible', 'blocked'],
      required: true,
      index: true,
    },
    unresolvedReason: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    collection: 'argumentUnits',
    strict: 'throw',
    timestamps: true,
    versionKey: false,
  },
);

argumentUnitSchema.index({ matterId: 1, documentId: 1, sequence: 1 }, { unique: true });

argumentUnitSchema.statics.getDeterministicSuccessPathBlocker = function getDeterministicSuccessPathBlocker(argumentUnit) {
  if (!argumentUnit) {
    return 'Successful deterministic mappings require a persisted ArgumentUnit.';
  }

  if (!successEligibleReviewStates.has(argumentUnit.reviewState)) {
    return `ArgumentUnit reviewState=${argumentUnit.reviewState} cannot enter successful deterministic mapping.`;
  }

  if (argumentUnit.admissibility !== 'admissible') {
    return `ArgumentUnit admissibility=${argumentUnit.admissibility} cannot enter successful deterministic mapping.`;
  }

  return null;
};

argumentUnitSchema.statics.canEnterDeterministicSuccessPath = function canEnterDeterministicSuccessPath(argumentUnit) {
  return this.getDeterministicSuccessPathBlocker(argumentUnit) == null;
};

argumentUnitSchema.statics.assertDeterministicSuccessPath = function assertDeterministicSuccessPath(argumentUnit) {
  const blocker = this.getDeterministicSuccessPathBlocker(argumentUnit);

  if (blocker) {
    throw new Error(blocker);
  }
};

module.exports = mongoose.models.ChatPdmLegalValidatorArgumentUnit
  || mongoose.model('ChatPdmLegalValidatorArgumentUnit', argumentUnitSchema);
