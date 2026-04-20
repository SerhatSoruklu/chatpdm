'use strict';

const mongoose = require('mongoose');
const legalValidatorSchemas = require('../shared/legal-validator.schemas');

const matterSchema = new mongoose.Schema(
  {
    matterId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    jurisdiction: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    practiceArea: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'closed'],
      required: true,
      default: 'active',
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    collection: 'legalValidatorMatters',
    strict: 'throw',
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  },
);

matterSchema.virtual('sourceDocuments', {
  ref: 'ChatPdmLegalValidatorSourceDocument',
  localField: 'matterId',
  foreignField: 'matterId',
  justOne: false,
});

matterSchema.index({ jurisdiction: 1, practiceArea: 1, status: 1 });

matterSchema.methods.isValidationOpen = function isValidationOpen() {
  return this.status !== 'closed';
};

matterSchema.methods.assertValidationOpen = function assertValidationOpen() {
  if (!this.isValidationOpen()) {
    throw new Error('Closed Matter records are not eligible for validator intake or orchestration.');
  }
};

matterSchema.pre('validate', function validateMatter() {
  const requiredFields = ['matterId', 'title', 'jurisdiction', 'practiceArea', 'status', 'createdBy'];

  for (const field of requiredFields) {
    if (!legalValidatorSchemas.isNonEmptyTrimmedString(this[field])) {
      this.invalidate(field, `Matter ${field} is required.`);
    }
  }

  if (!['draft', 'active', 'closed'].includes(this.status)) {
    this.invalidate('status', 'Matter status is invalid.');
  }
});

module.exports = mongoose.models.ChatPdmLegalValidatorMatter
  || mongoose.model('ChatPdmLegalValidatorMatter', matterSchema);
