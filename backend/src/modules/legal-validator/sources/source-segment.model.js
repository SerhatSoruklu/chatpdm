'use strict';

const mongoose = require('mongoose');

const sourceSegmentSchema = new mongoose.Schema(
  {
    sourceSegmentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    sourceDocumentId: {
      type: String,
      required: true,
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
    sourceContentHash: {
      type: String,
      required: true,
      trim: true,
    },
    segmentationVersion: {
      type: String,
      required: true,
      trim: true,
    },
    sequence: {
      type: Number,
      required: true,
      index: true,
    },
    pageNumber: {
      type: Number,
      required: true,
      index: true,
      min: 1,
    },
    segmentType: {
      type: String,
      enum: ['section_heading', 'paragraph'],
      required: true,
      index: true,
    },
    sourceAnchor: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    sectionLabel: {
      type: String,
      default: null,
      trim: true,
    },
    charStart: {
      type: Number,
      required: true,
      min: 0,
    },
    charEnd: {
      type: Number,
      required: true,
      min: 1,
    },
    text: {
      type: String,
      required: true,
    },
  },
  {
    collection: 'legalValidatorSourceSegments',
    strict: 'throw',
    timestamps: true,
    versionKey: false,
  },
);

sourceSegmentSchema.index({ sourceDocumentId: 1, sequence: 1 }, { unique: true });

module.exports = mongoose.models.ChatPdmLegalValidatorSourceSegment
  || mongoose.model('ChatPdmLegalValidatorSourceSegment', sourceSegmentSchema);
