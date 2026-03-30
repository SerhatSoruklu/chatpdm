'use strict';

const { createHash } = require('node:crypto');
const mongoose = require('mongoose');

function normalizeDocumentContent(content) {
  return typeof content === 'string' ? content.replace(/\r\n?/g, '\n') : '';
}

const sourceDocumentSchema = new mongoose.Schema(
  {
    sourceDocumentId: {
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
    contentFormat: {
      type: String,
      enum: ['plain_text', 'markdown'],
      default: 'plain_text',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    contentHash: {
      type: String,
      required: true,
      trim: true,
    },
    segmentationVersion: {
      type: String,
      required: true,
      default: 'structural-v1',
      trim: true,
    },
  },
  {
    collection: 'legalValidatorSourceDocuments',
    strict: 'throw',
    timestamps: true,
    versionKey: false,
  },
);

sourceDocumentSchema.index({ matterId: 1, documentId: 1 }, { unique: true });

sourceDocumentSchema.pre('validate', function validateSourceDocument() {
  const normalizedContent = normalizeDocumentContent(this.content);

  if (!normalizedContent.trim()) {
    this.invalidate('content', 'SourceDocument content is required.');
    return;
  }

  this.content = normalizedContent;
  this.contentHash = createHash('sha256').update(normalizedContent, 'utf8').digest('hex');
});

module.exports = mongoose.models.ChatPdmLegalValidatorSourceDocument
  || mongoose.model('ChatPdmLegalValidatorSourceDocument', sourceDocumentSchema);
