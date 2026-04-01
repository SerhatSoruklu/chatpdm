'use strict';

const STRUCTURAL_PROFILE_SEED_FIELDS = Object.freeze([
  'function',
  'object',
  'sourceType',
  'actorRelation',
  'temporalRole',
  'enforcementRole',
  'answerabilityRole',
  'requiredConductRole',
  'outcomeAttributionRole',
]);

const STRUCTURAL_PROFILE_FIELDS = Object.freeze([
  'conceptId',
  'domain',
  'coreMeaning',
  ...STRUCTURAL_PROFILE_SEED_FIELDS,
  'forbiddenEquivalences',
  'boundaryNotes',
]);

/**
 * @typedef {Object} ConceptStructuralProfile
 * @property {string} conceptId
 * @property {string} domain
 * @property {string} coreMeaning
 * @property {string} function
 * @property {string} object
 * @property {string} sourceType
 * @property {string} actorRelation
 * @property {string} temporalRole
 * @property {string} enforcementRole
 * @property {string} answerabilityRole
 * @property {string} requiredConductRole
 * @property {string} outcomeAttributionRole
 * @property {readonly string[]} forbiddenEquivalences
 * @property {readonly string[]} boundaryNotes
 */

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertNonEmptyString(value, fieldName, conceptId) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Concept "${conceptId}" has invalid ${fieldName}.`);
  }
}

function assertStringArray(value, fieldName, conceptId, minimumLength = 0) {
  if (!Array.isArray(value)) {
    throw new Error(`Concept "${conceptId}" has invalid ${fieldName}; expected an array.`);
  }

  if (value.length < minimumLength) {
    throw new Error(`Concept "${conceptId}" has invalid ${fieldName}; expected at least ${minimumLength} item(s).`);
  }

  value.forEach((entry, index) => {
    assertNonEmptyString(entry, `${fieldName}[${index}]`, conceptId);
  });

  if (new Set(value).size !== value.length) {
    throw new Error(`Concept "${conceptId}" has duplicate entries in ${fieldName}.`);
  }
}

function validateCanonicalAdjacent(concept, conceptId) {
  if (!isPlainObject(concept.canonical)) {
    throw new Error(`Concept "${conceptId}" has invalid canonical; expected an object.`);
  }

  if (!isPlainObject(concept.canonical.adjacent)) {
    throw new Error(`Concept "${conceptId}" has invalid canonical.adjacent; expected an object.`);
  }

  const adjacentEntries = Object.entries(concept.canonical.adjacent);

  if (adjacentEntries.length === 0) {
    throw new Error(`Concept "${conceptId}" has invalid canonical.adjacent; expected at least 1 boundary note.`);
  }

  adjacentEntries.forEach(([otherConceptId, note]) => {
    assertNonEmptyString(otherConceptId, 'canonical.adjacent key', conceptId);
    assertNonEmptyString(note, `canonical.adjacent.${otherConceptId}`, conceptId);
  });

  return adjacentEntries;
}

function validateForbiddenEquivalenceSource(concept, conceptId) {
  if (!isPlainObject(concept.reviewMetadata)) {
    throw new Error(`Concept "${conceptId}" has invalid reviewMetadata; expected an object.`);
  }

  assertStringArray(
    concept.reviewMetadata.must_not_collapse_into,
    'reviewMetadata.must_not_collapse_into',
    conceptId,
    1,
  );
}

function validateConceptStructuralProfileSeed(structuralProfile, conceptId) {
  if (!isPlainObject(structuralProfile)) {
    throw new Error(`Concept "${conceptId}" has invalid structuralProfile; expected an object.`);
  }

  const unexpectedFields = Object.keys(structuralProfile)
    .filter((fieldName) => !STRUCTURAL_PROFILE_SEED_FIELDS.includes(fieldName));

  if (unexpectedFields.length > 0) {
    throw new Error(
      `Concept "${conceptId}" has unsupported structuralProfile field(s): ${unexpectedFields.join(', ')}.`,
    );
  }

  STRUCTURAL_PROFILE_SEED_FIELDS.forEach((fieldName) => {
    assertNonEmptyString(structuralProfile[fieldName], `structuralProfile.${fieldName}`, conceptId);
  });
}

function buildForbiddenEquivalences(concept, conceptId) {
  validateForbiddenEquivalenceSource(concept, conceptId);

  const forbiddenEquivalences = [...concept.reviewMetadata.must_not_collapse_into];

  if (forbiddenEquivalences.includes(conceptId)) {
    throw new Error(`Concept "${conceptId}" structuralProfile.forbiddenEquivalences must not include the concept itself.`);
  }

  return Object.freeze(forbiddenEquivalences);
}

function buildBoundaryNotes(concept, conceptId) {
  const adjacentEntries = validateCanonicalAdjacent(concept, conceptId);

  return Object.freeze(
    adjacentEntries.map(([otherConceptId, note]) => `${otherConceptId}: ${note}`),
  );
}

function validateConceptStructuralProfile(profile, expectedConceptId = null) {
  if (!isPlainObject(profile)) {
    throw new Error('Concept structural profile must be an object.');
  }

  const conceptId = typeof profile.conceptId === 'string' && profile.conceptId.trim() !== ''
    ? profile.conceptId
    : expectedConceptId ?? 'unknown';

  const unexpectedFields = Object.keys(profile)
    .filter((fieldName) => !STRUCTURAL_PROFILE_FIELDS.includes(fieldName));

  if (unexpectedFields.length > 0) {
    throw new Error(
      `Concept "${conceptId}" structural profile has unsupported field(s): ${unexpectedFields.join(', ')}.`,
    );
  }

  if (expectedConceptId && profile.conceptId !== expectedConceptId) {
    throw new Error(`Concept "${expectedConceptId}" structural profile conceptId mismatch.`);
  }

  [
    'conceptId',
    'domain',
    'coreMeaning',
    ...STRUCTURAL_PROFILE_SEED_FIELDS,
  ].forEach((fieldName) => {
    assertNonEmptyString(profile[fieldName], fieldName, conceptId);
  });

  assertStringArray(profile.forbiddenEquivalences, 'forbiddenEquivalences', conceptId, 1);
  assertStringArray(profile.boundaryNotes, 'boundaryNotes', conceptId, 1);

  if (profile.forbiddenEquivalences.includes(profile.conceptId)) {
    throw new Error(`Concept "${conceptId}" structuralProfile.forbiddenEquivalences must not include the concept itself.`);
  }

  return Object.freeze({
    ...profile,
    forbiddenEquivalences: Object.freeze([...profile.forbiddenEquivalences]),
    boundaryNotes: Object.freeze([...profile.boundaryNotes]),
  });
}

function normalizeConceptToProfile(concept) {
  if (!isPlainObject(concept)) {
    throw new Error('Concept structural profile normalization requires a concept object.');
  }

  const conceptId = typeof concept.conceptId === 'string' && concept.conceptId.trim() !== ''
    ? concept.conceptId
    : 'unknown';

  assertNonEmptyString(concept.conceptId, 'conceptId', conceptId);
  assertNonEmptyString(concept.domain, 'domain', conceptId);
  assertNonEmptyString(concept.coreMeaning, 'coreMeaning', conceptId);
  validateConceptStructuralProfileSeed(concept.structuralProfile, conceptId);

  return validateConceptStructuralProfile({
    conceptId: concept.conceptId,
    domain: concept.domain,
    coreMeaning: concept.coreMeaning,
    function: concept.structuralProfile.function,
    object: concept.structuralProfile.object,
    sourceType: concept.structuralProfile.sourceType,
    actorRelation: concept.structuralProfile.actorRelation,
    temporalRole: concept.structuralProfile.temporalRole,
    enforcementRole: concept.structuralProfile.enforcementRole,
    answerabilityRole: concept.structuralProfile.answerabilityRole,
    requiredConductRole: concept.structuralProfile.requiredConductRole,
    outcomeAttributionRole: concept.structuralProfile.outcomeAttributionRole,
    forbiddenEquivalences: buildForbiddenEquivalences(concept, conceptId),
    boundaryNotes: buildBoundaryNotes(concept, conceptId),
  }, conceptId);
}

module.exports = {
  STRUCTURAL_PROFILE_FIELDS,
  STRUCTURAL_PROFILE_SEED_FIELDS,
  normalizeConceptToProfile,
  validateConceptStructuralProfile,
  validateConceptStructuralProfileSeed,
};
