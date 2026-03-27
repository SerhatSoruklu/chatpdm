'use strict';

const mongoose = require('mongoose');

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
    },
    normalizedQuery: {
      type: String,
      required: true,
      trim: true,
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
  },
  {
    versionKey: false,
  },
);

module.exports = mongoose.models.ChatPdmFeedbackEvent
  || mongoose.model('ChatPdmFeedbackEvent', feedbackEventSchema);
