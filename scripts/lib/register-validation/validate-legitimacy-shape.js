'use strict';

const {
  LEGITIMACY_BASIS_TYPES,
  LEGITIMACY_EVALUATOR_TYPES,
  LEGITIMACY_SUBJECT_TYPES,
  readLegitimacyStructureV3,
  readOptionalStructureV3Envelope,
} = require('../../../backend/src/modules/concepts/concept-structure-schema');
const { REASON_CODES } = require('./reason-codes');

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isNonEmptyStringArray(value) {
  return (
    Array.isArray(value)
    && value.length > 0
    && value.every((entry) => isNonEmptyString(entry))
  );
}

function createEntry(code, slot) {
  return { code, slot };
}

function validateLegitimacySubject(value) {
  return (
    isPlainObject(value)
    && LEGITIMACY_SUBJECT_TYPES.includes(value.type)
    && isNonEmptyString(value.id)
    && (value.label === undefined || isNonEmptyString(value.label))
  );
}

function validateLegitimacyBasis(value) {
  return (
    isPlainObject(value)
    && LEGITIMACY_BASIS_TYPES.includes(value.type)
    && isNonEmptyString(value.description)
  );
}

function validateLegitimacyScope(value) {
  return (
    isPlainObject(value)
    && isNonEmptyString(value.domain)
    && (value.object === undefined || isNonEmptyString(value.object))
  );
}

function validateLegitimacyStatus(value) {
  return (
    isPlainObject(value)
    && typeof value.recognised === 'boolean'
    && (value.justified === undefined || typeof value.justified === 'boolean')
  );
}

function validateLegitimacyEvaluator(value) {
  return (
    isPlainObject(value)
    && LEGITIMACY_EVALUATOR_TYPES.includes(value.type)
    && (value.identifier === undefined || isNonEmptyString(value.identifier))
  );
}

function validateLegitimacyConditions(value) {
  return (
    isPlainObject(value)
    && (
      isNonEmptyStringArray(value.when)
      || isNonEmptyStringArray(value.unless)
    )
  );
}

function validateLegitimacyShape(concept) {
  const report = {
    applicable: concept?.conceptId === 'legitimacy',
    skipped: concept?.conceptId !== 'legitimacy',
    passed: true,
    v3Status: 'not_applicable',
    failures: [],
    warnings: [],
    requiredSlots: {
      subject: false,
      basis: false,
      scope: false,
      status: false,
    },
    recommendedSlots: {
      evaluator: false,
      conditions: false,
    },
    boundaryChecks: [],
    schemaVersion: null,
    conceptFamily: null,
  };

  if (!report.applicable) {
    return report;
  }

  report.v3Status = 'passing';

  const structureV3 = readOptionalStructureV3Envelope(concept);
  report.schemaVersion = structureV3?.schemaVersion ?? null;
  report.conceptFamily = structureV3?.conceptFamily ?? null;
  const legitimacyStructure = readLegitimacyStructureV3(concept);

  if (validateLegitimacySubject(legitimacyStructure?.subject)) {
    report.requiredSlots.subject = true;
  } else {
    report.failures.push(createEntry(REASON_CODES.LEGITIMACY_MISSING_SUBJECT, 'subject'));
  }

  if (validateLegitimacyBasis(legitimacyStructure?.basis)) {
    report.requiredSlots.basis = true;
  } else {
    report.failures.push(createEntry(REASON_CODES.LEGITIMACY_MISSING_BASIS, 'basis'));
  }

  if (validateLegitimacyScope(legitimacyStructure?.scope)) {
    report.requiredSlots.scope = true;
  } else {
    report.failures.push(createEntry(REASON_CODES.LEGITIMACY_MISSING_SCOPE, 'scope'));
  }

  if (validateLegitimacyStatus(legitimacyStructure?.status)) {
    report.requiredSlots.status = true;
  } else {
    report.failures.push(createEntry(REASON_CODES.LEGITIMACY_MISSING_STATUS, 'status'));
  }

  if (validateLegitimacyEvaluator(legitimacyStructure?.evaluator)) {
    report.recommendedSlots.evaluator = true;
  } else {
    report.warnings.push(createEntry(REASON_CODES.MISSING_RECOMMENDED_SLOT, 'evaluator'));
  }

  if (validateLegitimacyConditions(legitimacyStructure?.conditions)) {
    report.recommendedSlots.conditions = true;
  } else {
    report.warnings.push(createEntry(REASON_CODES.MISSING_RECOMMENDED_SLOT, 'conditions'));
  }

  if (report.failures.length > 0) {
    report.failures.push(createEntry(REASON_CODES.STRUCTURALLY_INCOMPLETE_CONCEPT, null));
    report.passed = false;
    report.v3Status = 'incomplete';
  }

  return report;
}

module.exports = {
  validateLegitimacyShape,
};
