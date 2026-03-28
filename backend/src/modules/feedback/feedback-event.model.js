'use strict';

const mongoose = require('mongoose');
const { isMinimizedNormalizedQuery, isMinimizedRawQuery } = require('./lifecycle-contract');

const feedbackEventSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      default: null,
      trim: true,
    },
    rawQuery: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isMinimizedRawQuery,
        message: 'rawQuery must be minimized before persistence.',
      },
    },
    normalizedQuery: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isMinimizedNormalizedQuery,
        message: 'normalizedQuery must be minimized before persistence.',
      },
    },
    responseType: {
      type: String,
      required: true,
      trim: true,
    },
    feedbackType: {
      type: String,
      required: true,
      trim: true,
    },
    resolvedConceptId: {
      type: String,
      default: null,
      trim: true,
    },
    candidateConceptIds: {
      type: [String],
      default: [],
    },
    suggestionConceptIds: {
      type: [String],
      default: [],
    },
    contractVersion: {
      type: String,
      required: true,
      trim: true,
    },
    normalizerVersion: {
      type: String,
      required: true,
      trim: true,
    },
    matcherVersion: {
      type: String,
      required: true,
      trim: true,
    },
    conceptSetVersion: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: String,
      required: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    versionKey: false,
  },
);

feedbackEventSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    name: 'feedback_event_expiry',
  },
);

module.exports = mongoose.models.ChatPdmFeedbackEvent
  || mongoose.model('ChatPdmFeedbackEvent', feedbackEventSchema);
