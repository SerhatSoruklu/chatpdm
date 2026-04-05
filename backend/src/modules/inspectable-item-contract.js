'use strict';

const CORE_CONCEPT_ITEM_TYPE = 'core_concept';
const REGISTRY_TERM_ITEM_TYPE = 'registry_term';

const CORE_CONCEPT_REQUIRED_FIELDS = Object.freeze([
  'shortDefinition',
  'coreMeaning',
  'fullDefinition',
]);

const REGISTRY_INTERPRETATION_FALLBACKS = Object.freeze({
  unknown_structure: 'Recognized legal vocabulary, but its structure is not yet resolved into a stable runtime-safe concept pattern.',
  derived: 'Recognized legal vocabulary interpreted as dependent on underlying concepts rather than as a primary concept.',
  procedural: 'Recognized legal vocabulary interpreted as part of legal process, sequence, filing, adjudication, or operational procedure.',
  carrier: 'Recognized legal vocabulary interpreted as context-bearing rather than standalone conceptual structure.',
  rejected_candidate: 'Recognized legal vocabulary that was considered for admission but rejected for structure, scope, clarity, or runtime-safety reasons.',
});

const WHY_REGISTRY_ONLY_FALLBACKS = Object.freeze({
  packet_backed: 'This term is visible through an authored concept packet, but it remains outside runtime ontology on the registry surface.',
  registry_only: 'This term is visible in the registry only and is not backed by a published concept packet.',
});

const NO_TERM_SPECIFIC_MEANING_IN_LAW = 'No term-specific meaning in law has been authored yet.';

function assertNonEmptyString(value, fieldName, itemId) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Inspectable item "${itemId}" has invalid ${fieldName}.`);
  }
}

function assertCoreConceptResponseFields(concept, conceptId) {
  CORE_CONCEPT_REQUIRED_FIELDS.forEach((fieldName) => {
    assertNonEmptyString(concept[fieldName], fieldName, conceptId);
  });
}

function buildCoreConceptResponsePayload(concept, conceptId) {
  if (!concept || typeof concept !== 'object' || Array.isArray(concept)) {
    throw new TypeError('Expected concept to be a non-null object.');
  }

  const resolvedConceptId = typeof conceptId === 'string' && conceptId.trim() !== ''
    ? conceptId
    : concept.conceptId ?? 'unknown';

  assertCoreConceptResponseFields(concept, resolvedConceptId);

  return {
    itemType: CORE_CONCEPT_ITEM_TYPE,
    title: concept.title ?? null,
    shortDefinition: concept.shortDefinition,
    coreMeaning: concept.coreMeaning,
    fullDefinition: concept.fullDefinition,
  };
}

function getRegistryInterpretationFallback(classification) {
  return REGISTRY_INTERPRETATION_FALLBACKS[classification] ?? REGISTRY_INTERPRETATION_FALLBACKS.unknown_structure;
}

function getWhyRegistryOnlyFallback(sourceStatus) {
  return WHY_REGISTRY_ONLY_FALLBACKS[sourceStatus] ?? WHY_REGISTRY_ONLY_FALLBACKS.registry_only;
}

module.exports = {
  CORE_CONCEPT_ITEM_TYPE,
  CORE_CONCEPT_REQUIRED_FIELDS,
  NO_TERM_SPECIFIC_MEANING_IN_LAW,
  REGISTRY_INTERPRETATION_FALLBACKS,
  REGISTRY_TERM_ITEM_TYPE,
  WHY_REGISTRY_ONLY_FALLBACKS,
  buildCoreConceptResponsePayload,
  getRegistryInterpretationFallback,
  getWhyRegistryOnlyFallback,
};
