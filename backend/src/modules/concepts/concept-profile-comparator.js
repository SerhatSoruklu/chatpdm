'use strict';

const { loadConceptSet } = require('./concept-loader');
const { normalizeConceptToProfile, validateConceptStructuralProfile } = require('./concept-structural-profile');

const COMPARISON_CLASSIFICATIONS = Object.freeze([
  'distinct',
  'adjacent',
  'requires_explicit_boundary_note',
  'conflicting',
  'duplicate_candidate',
  'compressed_synonym_risk',
]);

const COMPARISON_FIELD_ORDER = Object.freeze([
  'domain',
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

const ROLE_DIFFERENTIATION_FIELDS = Object.freeze([
  'enforcementRole',
  'answerabilityRole',
  'requiredConductRole',
  'outcomeAttributionRole',
]);

/**
 * @typedef {'distinct' | 'adjacent' | 'requires_explicit_boundary_note' | 'conflicting' | 'duplicate_candidate' | 'compressed_synonym_risk'} ComparisonClassification
 */

/**
 * @typedef {Object} ComparisonResult
 * @property {string} otherConceptId
 * @property {ComparisonClassification} classification
 * @property {readonly string[]} reasons
 * @property {readonly string[]} collidingFields
 * @property {boolean} requiredBoundaryProof
 * @property {readonly string[]} substitutionRiskExamples
 */

function hasExplicitBoundaryReference(profile, otherConceptId) {
  return profile.forbiddenEquivalences.includes(otherConceptId)
    || profile.boundaryNotes.some((note) => note.startsWith(`${otherConceptId}:`));
}

function collectEqualFields(left, right) {
  return COMPARISON_FIELD_ORDER.filter((fieldName) => left[fieldName] === right[fieldName]);
}

function collectRoleMatches(left, right) {
  return ROLE_DIFFERENTIATION_FIELDS.filter((fieldName) => left[fieldName] === right[fieldName]);
}

function freezeResult(result) {
  return Object.freeze({
    ...result,
    reasons: Object.freeze([...result.reasons]),
    collidingFields: Object.freeze([...result.collidingFields]),
    substitutionRiskExamples: Object.freeze([...result.substitutionRiskExamples]),
  });
}

function buildResult(otherConceptId, classification, reasons, collidingFields, requiredBoundaryProof, substitutionRiskExamples) {
  return freezeResult({
    otherConceptId,
    classification,
    reasons,
    collidingFields,
    requiredBoundaryProof,
    substitutionRiskExamples,
  });
}

function buildDuplicateResult(left, right, equalFields) {
  return buildResult(
    right.conceptId,
    'duplicate_candidate',
    [
      'function, object, and temporalRole are identical across both profiles.',
      'The candidate would not introduce a new structural position in the concept system.',
    ],
    ['function', 'object', 'temporalRole', ...equalFields.filter((fieldName) => !['function', 'object', 'temporalRole'].includes(fieldName))],
    false,
    [
      `Replacing "${left.conceptId}" with "${right.conceptId}" leaves function, object, and temporalRole unchanged.`,
      `Runtime distinction would collapse because the primary identity fields are the same.`,
    ],
  );
}

function buildAdjacentByTemporalResult(left, right, equalFields) {
  return buildResult(
    right.conceptId,
    'adjacent',
    [
      'function matches while temporalRole differs.',
      'The concepts occupy related structural work but at different temporal positions.',
    ],
    ['function', ...equalFields.filter((fieldName) => fieldName !== 'function')],
    true,
    [
      `Substituting "${left.conceptId}" for "${right.conceptId}" would blur a shared function across different temporal roles.`,
    ],
  );
}

function buildBoundaryRequiredResult(left, right, explicitBoundaryFields, roleMatches) {
  const collidingFields = [
    ...explicitBoundaryFields,
    ...roleMatches.filter((fieldName) => !explicitBoundaryFields.includes(fieldName)),
  ];

  return buildResult(
    right.conceptId,
    'requires_explicit_boundary_note',
    [
      'An explicit boundary is already declared between these concepts.',
      'The profiles remain structurally close enough that the boundary must be preserved as a proof requirement.',
    ],
    collidingFields,
    true,
    [
      `Substituting "${left.conceptId}" for "${right.conceptId}" would blur the declared boundary on ${collidingFields.join(', ')}.`,
    ],
  );
}

function buildConflictingResult(left, right) {
  return buildResult(
    right.conceptId,
    'conflicting',
    [
      'answerabilityRole and enforcementRole are identical across both profiles.',
      'The concepts would occupy the same accountability and enforcement posture.',
    ],
    ['answerabilityRole', 'enforcementRole'],
    false,
    [
      `Both profiles place answerability and enforcement in the same structural position.`,
    ],
  );
}

function buildCompressedSynonymRiskResult(left, right, collidingFields) {
  return buildResult(
    right.conceptId,
    'compressed_synonym_risk',
    [
      'Role-differentiation fields do not separate the concepts enough to justify separate admission.',
      'This pair risks becoming a compressed synonym family instead of a clean structural distinction.',
    ],
    collidingFields,
    false,
    [
      `Substituting "${left.conceptId}" for "${right.conceptId}" would preserve the same role posture across ${collidingFields.join(', ')}.`,
    ],
  );
}

function buildAdjacentBoundaryResult(left, right) {
  return buildResult(
    right.conceptId,
    'adjacent',
    [
      'Both concepts are in the same domain and explicitly preserve a boundary against each other.',
      'The authored boundary marks them as neighboring concepts rather than duplicates.',
    ],
    ['domain', 'forbiddenEquivalences', 'boundaryNotes'],
    true,
    [
      `Substituting "${left.conceptId}" for "${right.conceptId}" would erase an authored same-domain boundary.`,
    ],
  );
}

function buildDistinctResult(left, right, equalFields, roleMatches) {
  const reasons = [];

  if (equalFields.length === 1 && equalFields[0] === 'domain') {
    reasons.push('shared domain alone does not establish structural overlap.');
  } else {
    reasons.push('The core function/object/temporalRole identity fields remain differentiated.');
  }

  if (roleMatches.length === 0) {
    reasons.push('Role-differentiation fields remain cleanly separated.');
  } else {
    reasons.push(`The pair shares ${roleMatches.join(', ')}, but not enough to create structural collision.`);
  }

  return buildResult(
    right.conceptId,
    'distinct',
    reasons,
    [],
    false,
    [],
  );
}

function compareConceptProfiles(leftProfile, rightProfile) {
  const left = validateConceptStructuralProfile(leftProfile);
  const right = validateConceptStructuralProfile(rightProfile);
  const equalFields = collectEqualFields(left, right);
  const roleMatches = collectRoleMatches(left, right);
  const explicitBoundaryFromLeft = hasExplicitBoundaryReference(left, right.conceptId);
  const explicitBoundaryFromRight = hasExplicitBoundaryReference(right, left.conceptId);
  const sameDomain = left.domain === right.domain;
  const sameFunction = left.function === right.function;
  const sameObject = left.object === right.object;
  const sameTemporalRole = left.temporalRole === right.temporalRole;
  const sameAnswerabilityRole = left.answerabilityRole === right.answerabilityRole;
  const sameEnforcementRole = left.enforcementRole === right.enforcementRole;
  const compressedRoleFields = [
    'answerabilityRole',
    'requiredConductRole',
    'outcomeAttributionRole',
    'object',
    'sourceType',
  ].filter((fieldName) => left[fieldName] === right[fieldName]);

  if (sameFunction && sameObject && sameTemporalRole) {
    return buildDuplicateResult(left, right, equalFields);
  }

  if (sameFunction && !sameTemporalRole) {
    return buildAdjacentByTemporalResult(left, right, equalFields);
  }

  const explicitBoundaryFields = [
    ...(sameDomain ? ['domain'] : []),
    ...(sameObject ? ['object'] : []),
    ...(left.sourceType === right.sourceType ? ['sourceType'] : []),
    ...(left.actorRelation === right.actorRelation ? ['actorRelation'] : []),
    ...(left.enforcementRole === right.enforcementRole ? ['enforcementRole'] : []),
    ...(left.requiredConductRole === right.requiredConductRole ? ['requiredConductRole'] : []),
    ...(left.outcomeAttributionRole === right.outcomeAttributionRole ? ['outcomeAttributionRole'] : []),
    ...(explicitBoundaryFromLeft || explicitBoundaryFromRight ? ['forbiddenEquivalences'] : []),
    ...((explicitBoundaryFromLeft && explicitBoundaryFromRight) ? ['boundaryNotes'] : []),
  ];

  if ((explicitBoundaryFromLeft || explicitBoundaryFromRight) && sameDomain && explicitBoundaryFields.length > 3) {
    return buildBoundaryRequiredResult(left, right, explicitBoundaryFields, roleMatches);
  }

  if (sameAnswerabilityRole && sameEnforcementRole) {
    return buildConflictingResult(left, right);
  }

  if (compressedRoleFields.length >= 4) {
    return buildCompressedSynonymRiskResult(left, right, compressedRoleFields);
  }

  if (sameDomain && explicitBoundaryFromLeft && explicitBoundaryFromRight) {
    return buildAdjacentBoundaryResult(left, right);
  }

  return buildDistinctResult(left, right, equalFields, roleMatches);
}

function buildLiveConceptProfiles() {
  return Object.freeze(
    loadConceptSet().map((concept) => normalizeConceptToProfile(concept)),
  );
}

function compareProfileAgainstLiveConcepts(candidateProfile, liveConceptProfiles = buildLiveConceptProfiles()) {
  const candidate = validateConceptStructuralProfile(candidateProfile);

  return Object.freeze(
    liveConceptProfiles
      .filter((liveProfile) => liveProfile.conceptId !== candidate.conceptId)
      .map((liveProfile) => compareConceptProfiles(candidate, validateConceptStructuralProfile(liveProfile))),
  );
}

module.exports = {
  COMPARISON_CLASSIFICATIONS,
  COMPARISON_FIELD_ORDER,
  ROLE_DIFFERENTIATION_FIELDS,
  buildLiveConceptProfiles,
  compareConceptProfiles,
  compareProfileAgainstLiveConcepts,
};
