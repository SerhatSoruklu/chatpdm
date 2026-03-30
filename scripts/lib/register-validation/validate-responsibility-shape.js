'use strict';

const {
  ACTOR_REF_TYPES,
  RESPONSIBILITY_ACCOUNTABILITY_TARGETS,
  RESPONSIBILITY_ATTRIBUTION_TYPES,
  RESPONSIBILITY_CONSEQUENCE_TYPES,
  RESPONSIBILITY_TRIGGER_TYPES,
  readOptionalStructureV3Envelope,
  readResponsibilityStructureV3,
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

function validateResponsibilityTrigger(value) {
  return (
    isPlainObject(value)
    && RESPONSIBILITY_TRIGGER_TYPES.includes(value.type)
    && isNonEmptyString(value.description)
  );
}

function validateResponsibilityScope(value) {
  return (
    isPlainObject(value)
    && isNonEmptyString(value.domain)
    && (value.object === undefined || isNonEmptyString(value.object))
  );
}

function validateResponsibilityAttribution(value) {
  return (
    isPlainObject(value)
    && RESPONSIBILITY_ATTRIBUTION_TYPES.includes(value.type)
  );
}

function validateResponsibilityAccountability(value) {
  return (
    isPlainObject(value)
    && (value.to === undefined || RESPONSIBILITY_ACCOUNTABILITY_TARGETS.includes(value.to))
    && (value.enforceable === undefined || typeof value.enforceable === 'boolean')
  );
}

function validateResponsibilityConsequence(value) {
  return (
    isPlainObject(value)
    && RESPONSIBILITY_CONSEQUENCE_TYPES.includes(value.type)
  );
}

function validateResponsibilityShape(concept) {
  const report = {
    applicable: concept?.conceptId === 'responsibility',
    skipped: concept?.conceptId !== 'responsibility',
    passed: true,
    v3Status: 'not_applicable',
    failures: [],
    warnings: [],
    requiredSlots: {
      subject: false,
      trigger: false,
      scope: false,
    },
    recommendedSlots: {
      attribution: false,
      accountability: false,
      consequence: false,
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
  const responsibilityStructure = readResponsibilityStructureV3(concept);

  if (validateActorRef(responsibilityStructure?.subject)) {
    report.requiredSlots.subject = true;
  } else {
    report.failures.push(createEntry(REASON_CODES.RESPONSIBILITY_MISSING_SUBJECT, 'subject'));
  }

  if (validateResponsibilityTrigger(responsibilityStructure?.trigger)) {
    report.requiredSlots.trigger = true;
  } else {
    report.failures.push(createEntry(REASON_CODES.RESPONSIBILITY_MISSING_TRIGGER, 'trigger'));
  }

  if (validateResponsibilityScope(responsibilityStructure?.scope)) {
    report.requiredSlots.scope = true;
  } else {
    report.failures.push(createEntry(REASON_CODES.RESPONSIBILITY_MISSING_SCOPE, 'scope'));
  }

  if (validateResponsibilityAttribution(responsibilityStructure?.attribution)) {
    report.recommendedSlots.attribution = true;
  } else {
    report.warnings.push(createEntry(REASON_CODES.MISSING_RECOMMENDED_SLOT, 'attribution'));
  }

  if (validateResponsibilityAccountability(responsibilityStructure?.accountability)) {
    report.recommendedSlots.accountability = true;
  } else {
    report.warnings.push(createEntry(REASON_CODES.MISSING_RECOMMENDED_SLOT, 'accountability'));
  }

  if (validateResponsibilityConsequence(responsibilityStructure?.consequence)) {
    report.recommendedSlots.consequence = true;
  } else {
    report.warnings.push(createEntry(REASON_CODES.MISSING_RECOMMENDED_SLOT, 'consequence'));
  }

  if (report.failures.length > 0) {
    report.failures.push(createEntry(REASON_CODES.STRUCTURALLY_INCOMPLETE_CONCEPT, null));
    report.passed = false;
    report.v3Status = 'incomplete';
  }

  return report;
}

module.exports = {
  validateResponsibilityShape,
};
