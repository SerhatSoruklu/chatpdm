'use strict';

const {
  readAuthorityStructureV3,
  readLegitimacyStructureV3,
  readPowerStructureV3,
} = require('../../../backend/src/modules/concepts/concept-structure-schema');
const { REASON_CODES } = require('./reason-codes');

const CANONICAL_ZONE_NAMES = Object.freeze([
  'shortDefinition',
  'coreMeaning',
  'fullDefinition',
]);

const LEGITIMACY_TO_AUTHORITY_PATTERNS = Object.freeze([
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
  'entitled to direct',
  'authorized to direct',
]);

const LEGITIMACY_TO_AUTHORITY_SHIELDS = Object.freeze([
  'legitimacy is not',
  'not the same as authority',
  'not authority',
  'authority concerns',
  'authority asks',
  'authority marks',
  'not who may direct',
  'without thereby conferring authority',
  'does not confer authority',
  'rather than',
]);

const LEGITIMACY_TO_POWER_PATTERNS = Object.freeze([
  'effective capacity',
  'ability to act',
  'ability to produce effects',
  'capacity to act',
  'produce outcomes',
  'make outcomes happen',
  'secure compliance',
  'alter conditions',
  'what can be made to happen',
  'what can actually be done',
  'operative effect',
  'coercive capacity',
  'resource control',
  'control over outcomes',
]);

const LEGITIMACY_TO_POWER_SHIELDS = Object.freeze([
  'legitimacy is not',
  'not the same as authority or power',
  'not power',
  'power concerns',
  'power asks',
  'power marks',
  'power may',
  'not who may direct or what can be made to happen',
  'not what can be made to happen',
  'without thereby generating power',
  'does not generate power',
  'rather than',
]);

const AUTHORITY_TO_LEGITIMACY_PATTERNS = Object.freeze([
  'accepted or justified validity',
  'accepted validity',
  'justified validity',
  'valid standing',
  'justified standing',
  'counts as proper',
  'counts as valid',
  'whether standing is valid',
]);

const AUTHORITY_TO_LEGITIMACY_SHIELDS = Object.freeze([
  'authority is not',
  'legitimacy concerns',
  'questions of whether',
  'while questions of',
  'distinct from legitimacy',
  'can exist while legitimacy is disputed',
  'not whether',
  'rather than',
]);

const POWER_TO_LEGITIMACY_PATTERNS = Object.freeze([
  'accepted or justified validity',
  'accepted validity',
  'justified validity',
  'valid standing',
  'justified standing',
  'counts as proper',
  'counts as valid',
  'whether standing is valid',
]);

const POWER_TO_LEGITIMACY_SHIELDS = Object.freeze([
  'power is not',
  'legitimacy asks',
  'legitimacy concerns',
  'legitimacy may',
  'does not depend on',
  'does not depend on legitimacy',
  'without legitimacy',
  'not who may rightfully direct or whether',
  'not whether',
  'rather than',
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

function collectLegitimacySignals(concept) {
  const signals = CANONICAL_ZONE_NAMES
    .map((zoneName) => createBoundarySignal(zoneName, concept?.[zoneName]))
    .filter(Boolean);
  const legitimacyStructure = readLegitimacyStructureV3(concept);

  if (!legitimacyStructure) {
    return signals;
  }

  return [
    ...signals,
    createBoundarySignal('structureV3.subject', legitimacyStructure.subject?.label),
    createBoundarySignal('structureV3.basis', legitimacyStructure.basis?.description),
    createBoundarySignal(
      'structureV3.scope',
      [legitimacyStructure.scope?.domain, legitimacyStructure.scope?.object]
        .filter(Boolean)
        .join('. '),
    ),
    createBoundarySignal('structureV3.evaluator', legitimacyStructure.evaluator?.identifier),
    createBoundarySignal(
      'structureV3.conditions',
      [
        ...(Array.isArray(legitimacyStructure.conditions?.when) ? legitimacyStructure.conditions.when : []),
        ...(Array.isArray(legitimacyStructure.conditions?.unless) ? legitimacyStructure.conditions.unless : []),
      ].join('. '),
    ),
  ].filter(Boolean);
}

function evaluateSignals(signals, code, collapsePatterns, shieldPatterns) {
  return signals
    .map((signal) => (
      signal.zone.startsWith('structureV3.')
        ? evaluateSchemaBoundary(signal, code, collapsePatterns, shieldPatterns)
        : evaluateZoneBoundary(signal.text, signal.zone, code, collapsePatterns, shieldPatterns)
    ))
    .filter(Boolean);
}

function validateLegitimacyBoundary(concept) {
  const conceptId = concept?.conceptId;

  if (!['authority', 'power', 'legitimacy'].includes(conceptId)) {
    return [];
  }

  if (conceptId === 'authority') {
    return evaluateSignals(
      collectAuthoritySignals(concept),
      REASON_CODES.AUTHORITY_COLLAPSES_TO_LEGITIMACY,
      AUTHORITY_TO_LEGITIMACY_PATTERNS,
      AUTHORITY_TO_LEGITIMACY_SHIELDS,
    );
  }

  if (conceptId === 'power') {
    return evaluateSignals(
      collectPowerSignals(concept),
      REASON_CODES.POWER_COLLAPSES_TO_LEGITIMACY,
      POWER_TO_LEGITIMACY_PATTERNS,
      POWER_TO_LEGITIMACY_SHIELDS,
    );
  }

  return [
    ...evaluateSignals(
      collectLegitimacySignals(concept),
      REASON_CODES.LEGITIMACY_COLLAPSES_TO_AUTHORITY,
      LEGITIMACY_TO_AUTHORITY_PATTERNS,
      LEGITIMACY_TO_AUTHORITY_SHIELDS,
    ),
    ...evaluateSignals(
      collectLegitimacySignals(concept),
      REASON_CODES.LEGITIMACY_COLLAPSES_TO_POWER,
      LEGITIMACY_TO_POWER_PATTERNS,
      LEGITIMACY_TO_POWER_SHIELDS,
    ),
  ];
}

module.exports = {
  validateLegitimacyBoundary,
};
