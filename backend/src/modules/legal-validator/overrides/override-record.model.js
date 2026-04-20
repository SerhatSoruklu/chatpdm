'use strict';

const mongoose = require('mongoose');
const legalValidatorSchemas = require('../shared/legal-validator.schemas');

function buildOverrideBlocker(reason) {
  return {
    failureCode: 'UNAPPROVED_OVERRIDE_RECORD',
    reason,
  };
}

const overrideRecordSchema = new mongoose.Schema(
  {
    overrideId: {
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
    argumentUnitId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    mappingId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    overrideType: {
      type: String,
      enum: ['mapping_override', 'authority_override', 'admissibility_override'],
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
    },
    reviewStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      required: true,
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: String,
      default: null,
      trim: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'overrideRecords',
    strict: 'throw',
    timestamps: true,
    versionKey: false,
  },
);

overrideRecordSchema.pre('validate', function validateOverrideRecord() {
  const hasReviewedBy = legalValidatorSchemas.isNonEmptyTrimmedString(this.reviewedBy);
  const hasReviewedAt = this.reviewedAt instanceof Date && !Number.isNaN(this.reviewedAt.getTime());

  if (this.reviewStatus === 'pending') {
    if (hasReviewedBy || hasReviewedAt) {
      this.invalidate('reviewStatus', 'Pending OverrideRecords cannot carry review metadata.');
    }

    return;
  }

  if (!hasReviewedBy || !hasReviewedAt) {
    this.invalidate('reviewStatus', 'Approved and rejected OverrideRecords require reviewedBy and reviewedAt.');
  }
});

overrideRecordSchema.statics.getMappingOverrideBlocker = function getMappingOverrideBlocker(overrideRecord, expected = {}) {
  if (!overrideRecord) {
    return buildOverrideBlocker('Manual override mappings require an approved OverrideRecord.');
  }

  if (overrideRecord.overrideType !== 'mapping_override') {
    return buildOverrideBlocker(
      `OverrideRecord ${overrideRecord.overrideId} is not a mapping override.`,
    );
  }

  if (overrideRecord.reviewStatus !== 'approved') {
    return buildOverrideBlocker(
      `OverrideRecord ${overrideRecord.overrideId} is not approved.`,
    );
  }

  if (expected.matterId && overrideRecord.matterId !== expected.matterId) {
    return buildOverrideBlocker(
      `OverrideRecord ${overrideRecord.overrideId} does not belong to matterId=${expected.matterId}.`,
    );
  }

  if (expected.argumentUnitId && overrideRecord.argumentUnitId !== expected.argumentUnitId) {
    return buildOverrideBlocker(
      `OverrideRecord ${overrideRecord.overrideId} does not belong to argumentUnitId=${expected.argumentUnitId}.`,
    );
  }

  if (expected.mappingId && overrideRecord.mappingId !== expected.mappingId) {
    return buildOverrideBlocker(
      `OverrideRecord ${overrideRecord.overrideId} does not belong to mappingId=${expected.mappingId}.`,
    );
  }

  return null;
};

overrideRecordSchema.statics.findApprovedMappingOverride = async function findApprovedMappingOverride(overrideId, expected = {}) {
  if (!legalValidatorSchemas.isNonEmptyTrimmedString(overrideId)) {
    return {
      overrideRecord: null,
      blocker: buildOverrideBlocker('Manual override mappings require an explicit overrideId.'),
    };
  }

  const overrideRecord = await this.findOne({ overrideId }).lean().exec();
  const blocker = this.getMappingOverrideBlocker(overrideRecord, expected);

  return {
    overrideRecord,
    blocker,
  };
};

module.exports = mongoose.models.ChatPdmLegalValidatorOverrideRecord
  || mongoose.model('ChatPdmLegalValidatorOverrideRecord', overrideRecordSchema);
