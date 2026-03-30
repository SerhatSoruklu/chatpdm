'use strict';

const mongoose = require('mongoose');

const AI_EVENT_TYPES = Object.freeze([
  'AI_VIEWED',
  'AI_FOLLOWED',
  'CANONICAL_USED',
  'SILENT_WRITEBACK_ATTEMPT',
  'AI_BOUNDARY_VIOLATION',
]);
const AI_EVENT_CLASSES = Object.freeze(['usage', 'violation']);
const AI_EVENT_SOURCES = Object.freeze(['frontend', 'backend_guard']);

const aiEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      trim: true,
      enum: AI_EVENT_TYPES,
    },
    eventClass: {
      type: String,
      required: true,
      trim: true,
      enum: AI_EVENT_CLASSES,
    },
    source: {
      type: String,
      required: true,
      trim: true,
      enum: AI_EVENT_SOURCES,
    },
    sessionId: {
      type: String,
      default: null,
      trim: true,
    },
    surface: {
      type: String,
      required: true,
      trim: true,
    },
    query: {
      type: String,
      default: null,
      trim: true,
    },
    conceptId: {
      type: String,
      default: null,
      trim: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    createdAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  {
    versionKey: false,
  },
);

aiEventSchema.index({ createdAt: -1 }, { name: 'ai_event_created_at_desc' });

module.exports = mongoose.models.ChatPdmAiEvent
  || mongoose.model('ChatPdmAiEvent', aiEventSchema);
