'use strict';

const mongoose = require('mongoose');

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

module.exports = mongoose.models.ChatPdmLegalValidatorOverrideRecord
  || mongoose.model('ChatPdmLegalValidatorOverrideRecord', overrideRecordSchema);
