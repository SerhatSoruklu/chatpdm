'use strict';

let cachedAiViolationLogger = undefined;

const REQUIRED_AI_LABEL = 'AI (Advisory, Non-Canonical)';
const EXPLICIT_AI_STATUS_PATTERN = /^(advisory|non-canonical|untrusted)$/i;
const AI_PROVIDER_PATTERN = /\b(openai|chatgpt|llm|anthropic|claude|gpt(?:[-_a-z0-9]*)?)\b/i;
const BLOCKED_METADATA_KEYS = new Set([
  'advisory',
  'noncanonical',
  'untrusted',
  'aigenerated',
  'aiorigin',
  'advisorylabel',
  'llmresponse',
  'airesponse',
]);
const AI_PROVENANCE_KEYS = new Set([
  'origin',
  'provenance',
  'provider',
  'model',
  'modelprovider',
  'sourcetype',
  'sourceorigin',
]);
const AI_PROMPT_METADATA_KEYS = new Set([
  'aiprompt',
  'promptid',
  'promptversion',
  'prompttemplate',
  'prompttext',
  'systemprompt',
  'userprompt',
  'modelprompt',
  'promptmetadata',
]);

const AI_GOVERNANCE_ERROR_CODES = Object.freeze({
  CANONICAL_STORE_REJECTED: 'AI_CANONICAL_STORE_REJECTED',
  CANONICAL_WRITE_BLOCKED: 'AI_CANONICAL_WRITE_BLOCKED',
  DETERMINISTIC_PATH_CONTAMINATED: 'AI_DETERMINISTIC_PATH_CONTAMINATED',
});

class AiGovernanceBoundaryError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'AiGovernanceBoundaryError';
    this.code = code;
    this.details = details;
  }
}

function getAiViolationLogger() {
  if (cachedAiViolationLogger !== undefined) {
    return cachedAiViolationLogger;
  }

  try {
    ({ logAiViolation: cachedAiViolationLogger } = require('../modules/ai/service'));
  } catch (error) {
    if (error?.code !== 'MODULE_NOT_FOUND') {
      throw error;
    }

    cachedAiViolationLogger = null;
  }

  return cachedAiViolationLogger;
}

function logAiViolationFallback(eventType, surface, details = {}) {
  const createdAt = new Date().toISOString();
  process.stderr.write(`[chatpdm-backend] ai-violation ${JSON.stringify({
    eventType,
    surface,
    createdAt,
    details,
    persistence: 'skipped',
  })}\n`);
}

function emitAiViolation(eventType, surface, details = {}) {
  const logger = getAiViolationLogger();

  if (logger) {
    return logger(eventType, surface, details);
  }

  return logAiViolationFallback(eventType, surface, details);
}

function buildPath(basePath, nextSegment) {
  if (typeof nextSegment === 'number') {
    return `${basePath}[${nextSegment}]`;
  }

  return `${basePath}.${nextSegment}`;
}

function matchesAiProvider(value) {
  return typeof value === 'string' && AI_PROVIDER_PATTERN.test(value);
}

function detectAiBoundaryMarker(value, currentPath = 'root', seen = new WeakSet()) {
  if (typeof value === 'string') {
    if (value.includes(REQUIRED_AI_LABEL)) {
      return {
        path: currentPath,
        reason: `contains the advisory label "${REQUIRED_AI_LABEL}"`,
      };
    }

    if (EXPLICIT_AI_STATUS_PATTERN.test(value.trim())) {
      return {
        path: currentPath,
        reason: `contains the explicit AI status marker "${value.trim()}"`,
      };
    }

    return null;
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const nestedViolation = detectAiBoundaryMarker(value[index], buildPath(currentPath, index), seen);

      if (nestedViolation) {
        return nestedViolation;
      }
    }

    return null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  if (seen.has(value)) {
    return null;
  }

  seen.add(value);

  for (const [key, entry] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    const nextPath = buildPath(currentPath, key);

    if (BLOCKED_METADATA_KEYS.has(normalizedKey)) {
      return {
        path: nextPath,
        reason: `uses prohibited AI metadata field "${key}"`,
      };
    }

    if (AI_PROMPT_METADATA_KEYS.has(normalizedKey)) {
      return {
        path: nextPath,
        reason: `uses prohibited prompt metadata field "${key}"`,
      };
    }

    if (AI_PROVENANCE_KEYS.has(normalizedKey) && matchesAiProvider(entry)) {
      return {
        path: nextPath,
        reason: `declares AI provenance through "${key}=${entry}"`,
      };
    }

    const nestedViolation = detectAiBoundaryMarker(entry, nextPath, seen);

    if (nestedViolation) {
      return nestedViolation;
    }
  }

  return null;
}

function assertAiBoundaryClean(value, context, errorCode, violationEventType) {
  const violation = detectAiBoundaryMarker(value);

  if (!violation) {
    return value;
  }

  emitAiViolation(violationEventType, context, {
    errorCode,
    path: violation.path,
    reason: violation.reason,
  });

  throw new AiGovernanceBoundaryError(
    errorCode,
    `${context} crossed an AI governance boundary at ${violation.path}: ${violation.reason}.`,
    {
      context,
      path: violation.path,
      reason: violation.reason,
    },
  );
}

function assertCanonicalStoreFreeOfAiMarkers(value, context) {
  return assertAiBoundaryClean(
    value,
    context,
    AI_GOVERNANCE_ERROR_CODES.CANONICAL_STORE_REJECTED,
    'AI_BOUNDARY_VIOLATION',
  );
}

function assertCanonicalWriteInputFreeOfAiMarkers(value, context) {
  return assertAiBoundaryClean(
    value,
    context,
    AI_GOVERNANCE_ERROR_CODES.CANONICAL_WRITE_BLOCKED,
    'SILENT_WRITEBACK_ATTEMPT',
  );
}

function assertDeterministicPathFreeOfAiMarkers(value, context) {
  return assertAiBoundaryClean(
    value,
    context,
    AI_GOVERNANCE_ERROR_CODES.DETERMINISTIC_PATH_CONTAMINATED,
    'AI_BOUNDARY_VIOLATION',
  );
}

module.exports = {
  AI_GOVERNANCE_ERROR_CODES,
  AiGovernanceBoundaryError,
  assertCanonicalStoreFreeOfAiMarkers,
  assertCanonicalWriteInputFreeOfAiMarkers,
  assertDeterministicPathFreeOfAiMarkers,
};
