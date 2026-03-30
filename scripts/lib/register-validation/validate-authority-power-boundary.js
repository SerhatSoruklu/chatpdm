'use strict';

const {
  readAuthorityStructureV3,
  readPowerStructureV3,
} = require('../../../backend/src/modules/concepts/concept-structure-schema');
const { REASON_CODES } = require('./reason-codes');

const CANONICAL_ZONE_NAMES = Object.freeze([
  'shortDefinition',
  'coreMeaning',
  'fullDefinition',
]);

const AUTHORITY_COLLAPSE_PATTERNS = Object.freeze([
  'effective capacity',
  'ability to act',
  'ability to produce effects',
  'capacity to act',
  'produce outcomes',
  'make outcomes happen',
  'secure compliance',
  'alter conditions',
  'what can actually be done',
  'what can be made to happen',
  'operative effect',
  'resource control',
  'coercive capacity',
  'control over outcomes',
]);

const AUTHORITY_CONTRAST_SHIELDS = Object.freeze([
  'authority is not',
  'not any ability',
  'not power',
  'not force',
  'power concerns',
  'power asks',
  'belong to power',
  'distinct from power',
  'rather than',
]);

const POWER_COLLAPSE_PATTERNS = Object.freeze([
  'recognized standing',
  'standing to act',
  'right to direct',
  'right to act',
  'directive right',
  'who may direct',
  'who may decide',
  'permission to act',
  'permission to direct',
  'entitlement to act',
  'rightfully direct',
  'entitled to direct',
  'authorized to direct',
  'recognized role',
  'recognized right',
  'valid claim to rule',
]);

const POWER_CONTRAST_SHIELDS = Object.freeze([
  'power is not',
  'not the same as authority',
  'does not require',
  'does not depend on',
  'authority asks',
  'authority concerns',
  'not who may rightfully direct',
  'without authority',
  'authority may',
  'rather than recognized right',
]);

function normalizeSentence(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function splitSentences(text) {
  return String(text)
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => normalizeSentence(sentence))
    .filter(Boolean);
}

function sentenceHasPattern(sentence, patterns) {
  return patterns.some((pattern) => sentence.includes(pattern));
}

function createBoundaryEntry(code, zone, matchedSentence) {
  return {
    code,
    zone,
    matchedSentence,
  };
}

function createBoundarySignal(zone, text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return null;
  }

  return {
    zone,
    text,
  };
}

function evaluateZoneBoundary(text, zoneName, code, collapsePatterns, shieldPatterns) {
  const sentences = splitSentences(text);

  for (const sentence of sentences) {
    if (!sentenceHasPattern(sentence, collapsePatterns)) {
      continue;
    }

    if (sentenceHasPattern(sentence, shieldPatterns)) {
      continue;
    }

    return createBoundaryEntry(code, zoneName, sentence);
  }

  return null;
}

function evaluateSchemaBoundary(signal, code, collapsePatterns, shieldPatterns) {
  if (!signal) {
    return null;
  }

  const normalized = normalizeSentence(signal.text);

  if (!normalized) {
    return null;
  }

  if (!sentenceHasPattern(normalized, collapsePatterns)) {
    return null;
  }

  if (sentenceHasPattern(normalized, shieldPatterns)) {
    return null;
  }

  return createBoundaryEntry(code, signal.zone, normalized);
}

function collectAuthoritySignals(concept) {
  const signals = CANONICAL_ZONE_NAMES
    .map((zoneName) => createBoundarySignal(zoneName, concept?.[zoneName]))
    .filter(Boolean);
  const authorityStructure = readAuthorityStructureV3(concept);

  if (!authorityStructure) {
    return signals;
  }

  return [
    ...signals,
    createBoundarySignal('structureV3.holder', authorityStructure.holder?.label),
    createBoundarySignal(
      'structureV3.scope',
      [
        authorityStructure.scope?.domain,
        ...(Array.isArray(authorityStructure.scope?.actions) ? authorityStructure.scope.actions : []),
      ]
        .filter(Boolean)
        .join('. '),
    ),
    createBoundarySignal(
      'structureV3.limits',
      Array.isArray(authorityStructure.limits?.boundaries)
        ? authorityStructure.limits.boundaries.join('. ')
        : null,
    ),
  ].filter(Boolean);
}

function collectPowerSignals(concept) {
  const signals = CANONICAL_ZONE_NAMES
    .map((zoneName) => createBoundarySignal(zoneName, concept?.[zoneName]))
    .filter(Boolean);
  const powerStructure = readPowerStructureV3(concept);

  if (!powerStructure) {
    return signals;
  }

  return [
    ...signals,
    createBoundarySignal('structureV3.holder', powerStructure.holder?.label),
    createBoundarySignal('structureV3.capability', powerStructure.capability?.description),
    createBoundarySignal(
      'structureV3.scope',
      [
        powerStructure.scope?.domain,
        ...(Array.isArray(powerStructure.scope?.actions) ? powerStructure.scope.actions : []),
      ]
        .filter(Boolean)
        .join('. '),
    ),
    createBoundarySignal(
      'structureV3.constraints',
      Array.isArray(powerStructure.constraints?.limitedBy)
        ? powerStructure.constraints.limitedBy.join('. ')
        : null,
    ),
    createBoundarySignal(
      'structureV3.effects',
      [
        powerStructure.effects?.type,
        ...(Array.isArray(powerStructure.effects?.targets) ? powerStructure.effects.targets : []),
      ]
        .filter(Boolean)
        .join('. '),
    ),
  ].filter(Boolean);
}

function validateAuthorityPowerBoundary(concept) {
  const conceptId = concept?.conceptId;

  if (conceptId !== 'authority' && conceptId !== 'power') {
    return [];
  }

  const code = conceptId === 'authority'
    ? REASON_CODES.AUTHORITY_COLLAPSES_TO_POWER
    : REASON_CODES.POWER_COLLAPSES_TO_AUTHORITY;
  const collapsePatterns = conceptId === 'authority'
    ? AUTHORITY_COLLAPSE_PATTERNS
    : POWER_COLLAPSE_PATTERNS;
  const shieldPatterns = conceptId === 'authority'
    ? AUTHORITY_CONTRAST_SHIELDS
    : POWER_CONTRAST_SHIELDS;
  const signals = conceptId === 'authority'
    ? collectAuthoritySignals(concept)
    : collectPowerSignals(concept);

  return signals
    .map((signal) => (
      signal.zone.startsWith('structureV3.')
        ? evaluateSchemaBoundary(signal, code, collapsePatterns, shieldPatterns)
        : evaluateZoneBoundary(signal.text, signal.zone, code, collapsePatterns, shieldPatterns)
    ))
    .filter(Boolean);
}

module.exports = {
  validateAuthorityPowerBoundary,
};
