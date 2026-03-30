'use strict';

const {
  ACTOR_REF_TYPES,
  DUTY_CONTENT_STANDARDS,
  DUTY_CONTENT_TYPES,
  DUTY_OBLIGEE_TYPES,
  DUTY_PHASES,
  DUTY_SOURCE_TYPES,
  readDutyStructureV3,
  readOptionalStructureV3Envelope,
} = require('../../../backend/src/modules/concepts/concept-structure-schema');
const { REASON_CODES } = require('./reason-codes');

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function createEntry(code, slot) {
  return { code, slot };
}

function validateActorRef(value) {
  return (
    isPlainObject(value)
    && ACTOR_REF_TYPES.includes(value.type)
    && isNonEmptyString(value.id)
    && (value.label === undefined || isNonEmptyString(value.label))
  );
}

function validateDutyContent(value) {
  return (
    isPlainObject(value)
    && DUTY_CONTENT_TYPES.includes(value.type)
    && isNonEmptyString(value.description)
    && DUTY_CONTENT_STANDARDS.includes(value.standard)
  );
}

function validateDutySource(value) {
  return (
    isPlainObject(value)
    && DUTY_SOURCE_TYPES.includes(value.type)
    && isNonEmptyString(value.system)
  );
}

function validateDutyObligee(value) {
  return (
    isPlainObject(value)
    && DUTY_OBLIGEE_TYPES.includes(value.type)
    && (value.identifier === undefined || isNonEmptyString(value.identifier))
  );
}

function validateDutyPhase(value) {
  return DUTY_PHASES.includes(value);
}

function validateDutyShape(concept) {
  const report = {
    applicable: concept?.conceptId === 'duty',
    skipped: concept?.conceptId !== 'duty',
    passed: true,
    v3Status: 'not_applicable',
    failures: [],
    warnings: [],
    requiredSlots: {
      bearer: false,
      content: false,
      source: false,
    },
    recommendedSlots: {
      obligee: false,
      phase: false,
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
  const dutyStructure = readDutyStructureV3(concept);

  if (validateActorRef(dutyStructure?.bearer)) {
    report.requiredSlots.bearer = true;
  } else {
    report.failures.push(createEntry(REASON_CODES.DUTY_MISSING_BEARER, 'bearer'));
  }

  if (validateDutyContent(dutyStructure?.content)) {
    report.requiredSlots.content = true;
  } else {
    report.failures.push(createEntry(REASON_CODES.DUTY_MISSING_CONTENT, 'content'));
  }

  if (validateDutySource(dutyStructure?.source)) {
    report.requiredSlots.source = true;
  } else {
    report.failures.push(createEntry(REASON_CODES.DUTY_MISSING_SOURCE, 'source'));
  }

  if (validateDutyObligee(dutyStructure?.obligee)) {
    report.recommendedSlots.obligee = true;
  } else {
    report.warnings.push(createEntry(REASON_CODES.MISSING_RECOMMENDED_SLOT, 'obligee'));
  }

  if (validateDutyPhase(dutyStructure?.phase)) {
    report.recommendedSlots.phase = true;
  } else {
    report.warnings.push(createEntry(REASON_CODES.MISSING_RECOMMENDED_SLOT, 'phase'));
  }

  if (report.failures.length > 0) {
    report.failures.push(createEntry(REASON_CODES.STRUCTURALLY_INCOMPLETE_CONCEPT, null));
    report.passed = false;
    report.v3Status = 'incomplete';
  }

  return report;
}

module.exports = {
  validateDutyShape,
};
