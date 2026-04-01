'use strict';

const admissionState = require('../../../../data/concepts/concept-admission-state.json');

function freezeStringArray(values, label) {
  if (!Array.isArray(values)) {
    throw new Error(`Concept admission state "${label}" must be an array.`);
  }

  const normalizedValues = values.map((value) => {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Concept admission state "${label}" contains an invalid concept ID.`);
    }

    return value.trim();
  });

  if (new Set(normalizedValues).size !== normalizedValues.length) {
    throw new Error(`Concept admission state "${label}" contains duplicate concept IDs.`);
  }

  return Object.freeze(normalizedValues);
}

function ensureNoOverlap(left, right, leftLabel, rightLabel) {
  const rightSet = new Set(right);
  const overlap = left.filter((conceptId) => rightSet.has(conceptId));

  if (overlap.length > 0) {
    throw new Error(
      `Concept admission state overlap detected between "${leftLabel}" and "${rightLabel}": ${overlap.join(', ')}.`,
    );
  }
}

function ensureDetailBackedCoverage(detailBackedConceptIds, visibleOnlyConceptIds, rejectedConceptIds) {
  const expected = new Set([
    ...visibleOnlyConceptIds,
    ...rejectedConceptIds,
  ]);
  const actual = new Set(detailBackedConceptIds);

  if (expected.size !== actual.size) {
    throw new Error('Concept admission state "detailBackedConceptIds" must exactly cover visible-only and rejected concepts.');
  }

  for (const conceptId of expected) {
    if (!actual.has(conceptId)) {
      throw new Error(`Concept admission state "detailBackedConceptIds" is missing "${conceptId}".`);
    }
  }
}

const LIVE_CONCEPT_IDS = freezeStringArray(admissionState.liveConceptIds, 'liveConceptIds');
const VISIBLE_ONLY_PUBLIC_CONCEPT_IDS = freezeStringArray(
  admissionState.visibleOnlyPublicConceptIds,
  'visibleOnlyPublicConceptIds',
);
const REJECTED_CONCEPT_IDS = freezeStringArray(
  admissionState.rejectedConceptIds,
  'rejectedConceptIds',
);
const DETAIL_BACKED_CONCEPT_IDS = freezeStringArray(
  admissionState.detailBackedConceptIds,
  'detailBackedConceptIds',
);

ensureNoOverlap(LIVE_CONCEPT_IDS, VISIBLE_ONLY_PUBLIC_CONCEPT_IDS, 'liveConceptIds', 'visibleOnlyPublicConceptIds');
ensureNoOverlap(LIVE_CONCEPT_IDS, REJECTED_CONCEPT_IDS, 'liveConceptIds', 'rejectedConceptIds');
ensureNoOverlap(VISIBLE_ONLY_PUBLIC_CONCEPT_IDS, REJECTED_CONCEPT_IDS, 'visibleOnlyPublicConceptIds', 'rejectedConceptIds');
ensureDetailBackedCoverage(
  DETAIL_BACKED_CONCEPT_IDS,
  VISIBLE_ONLY_PUBLIC_CONCEPT_IDS,
  REJECTED_CONCEPT_IDS,
);

const LIVE_CONCEPT_ID_SET = new Set(LIVE_CONCEPT_IDS);
const VISIBLE_ONLY_PUBLIC_CONCEPT_ID_SET = new Set(VISIBLE_ONLY_PUBLIC_CONCEPT_IDS);
const REJECTED_CONCEPT_ID_SET = new Set(REJECTED_CONCEPT_IDS);
const DETAIL_BACKED_CONCEPT_ID_SET = new Set(DETAIL_BACKED_CONCEPT_IDS);

function normalizeConceptIdForAdmission(conceptId) {
  return typeof conceptId === 'string' ? conceptId.trim() : '';
}

function isLiveConceptId(conceptId) {
  return LIVE_CONCEPT_ID_SET.has(normalizeConceptIdForAdmission(conceptId));
}

function isVisibleOnlyConceptId(conceptId) {
  return VISIBLE_ONLY_PUBLIC_CONCEPT_ID_SET.has(normalizeConceptIdForAdmission(conceptId));
}

function isRejectedConceptId(conceptId) {
  return REJECTED_CONCEPT_ID_SET.has(normalizeConceptIdForAdmission(conceptId));
}

function isDetailBackedConceptId(conceptId) {
  return DETAIL_BACKED_CONCEPT_ID_SET.has(normalizeConceptIdForAdmission(conceptId));
}

module.exports = {
  DETAIL_BACKED_CONCEPT_IDS,
  LIVE_CONCEPT_IDS,
  REJECTED_CONCEPT_IDS,
  VISIBLE_ONLY_PUBLIC_CONCEPT_IDS,
  isDetailBackedConceptId,
  isLiveConceptId,
  isRejectedConceptId,
  isVisibleOnlyConceptId,
};
