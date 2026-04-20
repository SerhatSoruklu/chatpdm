'use strict';

const mongoose = require('mongoose');

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isNonEmptyTrimmedString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

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

sourceSegmentSchema.pre('validate', function validateSourceSegment() {
  if (!isNonEmptyTrimmedString(this.sourceSegmentId)) {
    this.invalidate('sourceSegmentId', 'SourceSegment sourceSegmentId is required.');
  } else if (!/^.+:[a-f0-9]{12}:p\d+:s\d+$/.test(this.sourceSegmentId)) {
    this.invalidate('sourceSegmentId', 'SourceSegment sourceSegmentId has an invalid structural format.');
  }

  if (!isNonEmptyTrimmedString(this.sourceDocumentId)) {
    this.invalidate('sourceDocumentId', 'SourceSegment sourceDocumentId is required.');
  }

  if (!isNonEmptyTrimmedString(this.matterId)) {
    this.invalidate('matterId', 'SourceSegment matterId is required.');
  }

  if (!isNonEmptyTrimmedString(this.documentId)) {
    this.invalidate('documentId', 'SourceSegment documentId is required.');
  }

  if (!isNonEmptyTrimmedString(this.sourceContentHash)) {
    this.invalidate('sourceContentHash', 'SourceSegment sourceContentHash is required.');
  } else if (!/^[a-f0-9]{64}$/.test(this.sourceContentHash)) {
    this.invalidate('sourceContentHash', 'SourceSegment sourceContentHash must be a sha256 hex digest.');
  }

  if (!isNonEmptyTrimmedString(this.segmentationVersion)) {
    this.invalidate('segmentationVersion', 'SourceSegment segmentationVersion is required.');
  } else if (this.segmentationVersion !== 'structural-v1') {
    this.invalidate('segmentationVersion', 'SourceSegment segmentationVersion is unsupported.');
  }

  if (!isPositiveInteger(this.sequence)) {
    this.invalidate('sequence', 'SourceSegment sequence must be a positive integer.');
  }

  if (!isPositiveInteger(this.pageNumber)) {
    this.invalidate('pageNumber', 'SourceSegment pageNumber must be a positive integer.');
  }

  if (!['section_heading', 'paragraph'].includes(this.segmentType)) {
    this.invalidate('segmentType', 'SourceSegment segmentType is invalid.');
  }

  if (!isNonEmptyTrimmedString(this.sourceAnchor)) {
    this.invalidate('sourceAnchor', 'SourceSegment sourceAnchor is required.');
  } else if (!/^.+@[a-f0-9]{12}#p\d+\.s\d+$/.test(this.sourceAnchor)) {
    this.invalidate('sourceAnchor', 'SourceSegment sourceAnchor has an invalid structural format.');
  }

  if (this.sectionLabel != null && !isNonEmptyTrimmedString(this.sectionLabel)) {
    this.invalidate('sectionLabel', 'SourceSegment sectionLabel must be a non-empty string when present.');
  }

  if (!isNonNegativeInteger(this.charStart)) {
    this.invalidate('charStart', 'SourceSegment charStart must be a non-negative integer.');
  }

  if (!isPositiveInteger(this.charEnd)) {
    this.invalidate('charEnd', 'SourceSegment charEnd must be a positive integer.');
  } else if (Number.isInteger(this.charStart) && this.charEnd <= this.charStart) {
    this.invalidate('charEnd', 'SourceSegment charEnd must be greater than charStart.');
  }

  if (!isNonEmptyTrimmedString(this.text)) {
    this.invalidate('text', 'SourceSegment text is required.');
  }
});

module.exports = mongoose.models.ChatPdmLegalValidatorSourceSegment
  || mongoose.model('ChatPdmLegalValidatorSourceSegment', sourceSegmentSchema);
