'use strict';

const WORD_PATTERN = /[a-z0-9]+(?:'[a-z0-9]+)?/gi;

const BOUNDARY_PROOF_FIELDS = Object.freeze([
  'notIdenticalTo',
  'boundaryStatement',
  'nonSubstitutionRule',
  'failureIfCollapsed',
  'validSeparationExample',
  'invalidCollapseExample',
]);

const BOUNDARY_PROOF_TEXT_FIELDS = Object.freeze(
  BOUNDARY_PROOF_FIELDS.filter((fieldName) => fieldName !== 'notIdenticalTo'),
);

const BOUNDARY_PROOF_REQUIRED_CLASSIFICATIONS = Object.freeze([
  'adjacent',
  'requires_explicit_boundary_note',
]);

const GENERIC_BOUNDARY_PROOF_TEXT = Object.freeze([
  'different',
  'distinct',
  'n a',
  'na',
  'none',
  'not identical',
  'not the same',
  'pending',
  'same',
  'same as above',
  'see above',
  'see note',
  'tbd',
  'todo',
  'unknown',
]);

/**
 * @typedef {Object} BoundaryProof
 * @property {string} notIdenticalTo
 * @property {string} boundaryStatement
 * @property {string} nonSubstitutionRule
 * @property {string} failureIfCollapsed
 * @property {string} validSeparationExample
 * @property {string} invalidCollapseExample
 */

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertNonEmptyString(value, fieldName, conceptId) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Concept "${conceptId}" has invalid ${fieldName}.`);
  }
}

function countWords(text) {
  return (String(text ?? '').match(WORD_PATTERN) || []).length;
}

function normalizeProofText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function assertExplicitBoundaryNarrative(value, fieldName, conceptId) {
  assertNonEmptyString(value, fieldName, conceptId);

  const normalized = normalizeProofText(value);

  if (GENERIC_BOUNDARY_PROOF_TEXT.includes(normalized)) {
    throw new Error(`Concept "${conceptId}" has generic ${fieldName}; expected explicit authored differentiation.`);
  }

  if (countWords(value) < 6) {
    throw new Error(`Concept "${conceptId}" has generic ${fieldName}; expected at least 6 words of explicit differentiation.`);
  }
}

function validateBoundaryProof(proof, conceptId, otherConceptId) {
  if (!isPlainObject(proof)) {
    throw new Error(`Concept "${conceptId}" has invalid boundaryProofs.${otherConceptId}; expected an object.`);
  }

  const unexpectedFields = Object.keys(proof)
    .filter((fieldName) => !BOUNDARY_PROOF_FIELDS.includes(fieldName));

  if (unexpectedFields.length > 0) {
    throw new Error(
      `Concept "${conceptId}" has unsupported boundaryProofs.${otherConceptId} field(s): ${unexpectedFields.join(', ')}.`,
    );
  }

  assertNonEmptyString(proof.notIdenticalTo, `boundaryProofs.${otherConceptId}.notIdenticalTo`, conceptId);

  if (proof.notIdenticalTo !== otherConceptId) {
    throw new Error(
      `Concept "${conceptId}" boundaryProofs.${otherConceptId}.notIdenticalTo must equal "${otherConceptId}".`,
    );
  }

  if (proof.notIdenticalTo === conceptId) {
    throw new Error(`Concept "${conceptId}" boundaryProofs.${otherConceptId} must not reference the concept itself.`);
  }

  BOUNDARY_PROOF_TEXT_FIELDS.forEach((fieldName) => {
    assertExplicitBoundaryNarrative(
      proof[fieldName],
      `boundaryProofs.${otherConceptId}.${fieldName}`,
      conceptId,
    );
  });

  return Object.freeze({
    notIdenticalTo: proof.notIdenticalTo,
    boundaryStatement: proof.boundaryStatement,
    nonSubstitutionRule: proof.nonSubstitutionRule,
    failureIfCollapsed: proof.failureIfCollapsed,
    validSeparationExample: proof.validSeparationExample,
    invalidCollapseExample: proof.invalidCollapseExample,
  });
}

function validateBoundaryProofCatalog(boundaryProofs, conceptId) {
  if (boundaryProofs === undefined) {
    return Object.freeze({});
  }

  if (!isPlainObject(boundaryProofs)) {
    throw new Error(`Concept "${conceptId}" has invalid boundaryProofs; expected an object.`);
  }

  const validatedEntries = {};

  Object.entries(boundaryProofs).forEach(([otherConceptId, proof]) => {
    assertNonEmptyString(otherConceptId, 'boundaryProofs key', conceptId);

    if (otherConceptId === conceptId) {
      throw new Error(`Concept "${conceptId}" boundaryProofs must not include the concept itself.`);
    }

    validatedEntries[otherConceptId] = validateBoundaryProof(proof, conceptId, otherConceptId);
  });

  return Object.freeze(validatedEntries);
}

function getRequiredBoundaryProofComparisons(concept, liveConceptProfiles = null) {
  if (!isPlainObject(concept)) {
    throw new Error('Boundary proof comparison requires a concept object.');
  }

  const { buildLiveConceptProfiles, compareProfileAgainstLiveConcepts } = require('./concept-profile-comparator');
  const { normalizeConceptToProfile } = require('./concept-structural-profile');

  const comparisonResults = compareProfileAgainstLiveConcepts(
    normalizeConceptToProfile(concept),
    liveConceptProfiles ?? buildLiveConceptProfiles(),
  );

  const requiredComparisons = comparisonResults.filter(
    (result) => BOUNDARY_PROOF_REQUIRED_CLASSIFICATIONS.includes(result.classification),
  );

  requiredComparisons.forEach((result) => {
    if (result.requiredBoundaryProof !== true) {
      throw new Error(
        `Concept "${concept.conceptId}" comparison to "${result.otherConceptId}" must set requiredBoundaryProof for classification "${result.classification}".`,
      );
    }
  });

  return Object.freeze([...requiredComparisons]);
}

function validateBoundaryProofRequirements(concept, liveConceptProfiles = null) {
  if (!isPlainObject(concept)) {
    throw new Error('Boundary proof requirement validation requires a concept object.');
  }

  const conceptId = typeof concept.conceptId === 'string' && concept.conceptId.trim() !== ''
    ? concept.conceptId
    : 'unknown';

  assertNonEmptyString(concept.conceptId, 'conceptId', conceptId);

  const boundaryProofs = validateBoundaryProofCatalog(concept.boundaryProofs, conceptId);
  const requiredComparisons = getRequiredBoundaryProofComparisons(concept, liveConceptProfiles);

  requiredComparisons.forEach((result) => {
    if (!boundaryProofs[result.otherConceptId]) {
      throw new Error(
        `Concept "${conceptId}" missing boundaryProofs.${result.otherConceptId} for comparison classification "${result.classification}".`,
      );
    }
  });

  return Object.freeze({
    conceptId,
    boundaryProofs,
    requiredComparisons,
  });
}

module.exports = {
  BOUNDARY_PROOF_FIELDS,
  BOUNDARY_PROOF_REQUIRED_CLASSIFICATIONS,
  validateBoundaryProof,
  validateBoundaryProofCatalog,
  validateBoundaryProofRequirements,
  getRequiredBoundaryProofComparisons,
};
