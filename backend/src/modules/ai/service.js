'use strict';

const mongoose = require('mongoose');
const AiEvent = require('./ai-event.model');

const AI_USAGE_EVENT_TYPES = Object.freeze(['AI_VIEWED', 'AI_FOLLOWED', 'CANONICAL_USED']);
const AI_VIOLATION_EVENT_TYPES = Object.freeze(['SILENT_WRITEBACK_ATTEMPT', 'AI_BOUNDARY_VIOLATION']);
const ALLOWED_USAGE_KEYS = new Set(['eventType', 'sessionId', 'surface', 'query', 'conceptId', 'details']);

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  }
}

function normalizeOptionalString(value, fieldName) {
  if (value == null) {
    return null;
  }

  assertNonEmptyString(value, fieldName);
  return value.trim();
}

function normalizeDetails(details) {
  if (details == null) {
    return null;
  }

  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    throw new TypeError('details must be an object when provided.');
  }

  return JSON.parse(JSON.stringify(details));
}

function normalizeAiUsagePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('AI event payload must be an object.');
  }

  Object.keys(payload).forEach((key) => {
    if (!ALLOWED_USAGE_KEYS.has(key)) {
      throw new TypeError(`Unsupported AI event field "${key}".`);
    }
  });

  assertNonEmptyString(payload.eventType, 'eventType');
  assertNonEmptyString(payload.surface, 'surface');

  if (!AI_USAGE_EVENT_TYPES.includes(payload.eventType)) {
    throw new TypeError(`Unsupported AI usage eventType "${payload.eventType}".`);
  }

  return {
    eventType: payload.eventType,
    eventClass: 'usage',
    source: 'frontend',
    sessionId: normalizeOptionalString(payload.sessionId, 'sessionId'),
    surface: payload.surface.trim(),
    query: normalizeOptionalString(payload.query, 'query'),
    conceptId: normalizeOptionalString(payload.conceptId, 'conceptId'),
    details: normalizeDetails(payload.details),
    createdAt: new Date(),
  };
}

function buildAiEventReceipt(eventDocument) {
  return {
    status: 'recorded',
    eventId: String(eventDocument._id),
    createdAt: eventDocument.createdAt.toISOString(),
  };
}

async function recordAiUsageEvent(payload) {
  const normalizedPayload = normalizeAiUsagePayload(payload);
  const created = await AiEvent.create(normalizedPayload);
  return buildAiEventReceipt(created);
}

function logAiViolation(eventType, surface, details = {}) {
  if (!AI_VIOLATION_EVENT_TYPES.includes(eventType)) {
    throw new TypeError(`Unsupported AI violation eventType "${eventType}".`);
  }

  assertNonEmptyString(surface, 'surface');

  const createdAt = new Date();
  const normalizedDetails = normalizeDetails(details);
  const logRecord = {
    eventType,
    eventClass: 'violation',
    source: 'backend_guard',
    sessionId: null,
    surface: surface.trim(),
    query: null,
    conceptId: null,
    details: normalizedDetails,
    createdAt,
  };

  process.stderr.write(`[chatpdm-backend] ai-violation ${JSON.stringify({
    eventType,
    surface: logRecord.surface,
    createdAt: createdAt.toISOString(),
    details: normalizedDetails,
  })}\n`);

  if (mongoose.connection.readyState === 1) {
    void AiEvent.create(logRecord).catch((error) => {
      process.stderr.write(
        `[chatpdm-backend] ai-violation persistence failed: ${error.stack || error.message}\n`,
      );
    });
  }

  return {
    status: 'logged',
    eventType,
    createdAt: createdAt.toISOString(),
  };
}

module.exports = {
  AI_USAGE_EVENT_TYPES,
  AI_VIOLATION_EVENT_TYPES,
  logAiViolation,
  recordAiUsageEvent,
};
