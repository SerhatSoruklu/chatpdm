'use strict';

const mongoose = require('mongoose');
const { isHashedFeedbackSessionIdForAudit } = require('./lifecycle-contract');

const feedbackControlAuditSchema = new mongoose.Schema(
  {
    actionType: {
      type: String,
      required: true,
      enum: ['export', 'delete'],
      trim: true,
    },
    sessionIdHash: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isHashedFeedbackSessionIdForAudit,
        message: 'sessionIdHash must be minimized before persistence.',
      },
    },
    requestedAt: {
      type: Date,
      required: true,
    },
    affectedCount: {
      type: Number,
      required: true,
      min: 0,
    },
    outcome: {
      type: String,
      required: true,
      enum: ['exported', 'deleted', 'no_records'],
      trim: true,
    },
    context: {
      type: String,
      required: true,
      trim: true,
      default: 'feedback_session_control_api',
    },
  },
  {
    strict: 'throw',
    versionKey: false,
  },
);

module.exports = mongoose.models.ChatPdmFeedbackControlAudit
  || mongoose.model('ChatPdmFeedbackControlAudit', feedbackControlAuditSchema);
