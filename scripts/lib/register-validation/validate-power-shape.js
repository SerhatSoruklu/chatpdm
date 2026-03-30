'use strict';

const {
  ACTOR_REF_TYPES,
  POWER_CAPABILITY_TYPES,
  POWER_EFFECT_TYPES,
  POWER_SOURCE_TYPES,
  readOptionalStructureV3Envelope,
  readPowerStructureV3,
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

function validateActorRef(value) {
  return (
    isPlainObject(value)
    && ACTOR_REF_TYPES.includes(value.type)
    && isNonEmptyString(value.id)
    && (value.label === undefined || isNonEmptyString(value.label))
  );
}

function validatePowerCapability(value) {
  return (
    isPlainObject(value)
    && POWER_CAPABILITY_TYPES.includes(value.type)
    && isNonEmptyString(value.description)
  );
}

function validatePowerScope(value) {
  return (
    isPlainObject(value)
    && isNonEmptyString(value.domain)
    && isNonEmptyStringArray(value.actions)
  );
}

function validatePowerConstraints(value) {
  return (
    isPlainObject(value)
    && (
      value.limitedBy === undefined
      || isNonEmptyStringArray(value.limitedBy)
    )
  );
}

function validatePowerSource(value) {
  return (
    isPlainObject(value)
    && POWER_SOURCE_TYPES.includes(value.type)
    && isNonEmptyString(value.system)
  );
}

function validatePowerEffects(value) {
  return (
    isPlainObject(value)
    && POWER_EFFECT_TYPES.includes(value.type)
    && (
      value.targets === undefined
      || (
        Array.isArray(value.targets)
        && value.targets.every((entry) => isNonEmptyString(entry))
      )
    )
  );
}

function validatePowerShape(concept) {
  const report = {
    applicable: concept?.conceptId === 'power',
    skipped: concept?.conceptId !== 'power',
    passed: true,
    v3Status: 'not_applicable',
    failures: [],
    warnings: [],
    requiredSlots: {
      holder: false,
      capability: false,
      scope: false,
    },
    recommendedSlots: {
      constraints: false,
      source: false,
      effects: false,
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
  const powerStructure = readPowerStructureV3(concept);

  if (validateActorRef(powerStructure?.holder)) {
    report.requiredSlots.holder = true;
  } else {
    report.failures.push(createEntry(REASON_CODES.POWER_MISSING_HOLDER, 'holder'));
  }

  if (validatePowerCapability(powerStructure?.capability)) {
    report.requiredSlots.capability = true;
  } else {
    report.failures.push(createEntry(REASON_CODES.POWER_MISSING_CAPABILITY, 'capability'));
  }

  if (validatePowerScope(powerStructure?.scope)) {
    report.requiredSlots.scope = true;
  } else {
    report.failures.push(createEntry(REASON_CODES.POWER_MISSING_SCOPE, 'scope'));
  }

  if (validatePowerConstraints(powerStructure?.constraints)) {
    report.recommendedSlots.constraints = true;
  } else {
    report.warnings.push(createEntry(REASON_CODES.MISSING_RECOMMENDED_SLOT, 'constraints'));
  }

  if (validatePowerSource(powerStructure?.source)) {
    report.recommendedSlots.source = true;
  } else {
    report.warnings.push(createEntry(REASON_CODES.MISSING_RECOMMENDED_SLOT, 'source'));
  }

  if (validatePowerEffects(powerStructure?.effects)) {
    report.recommendedSlots.effects = true;
  } else {
    report.warnings.push(createEntry(REASON_CODES.MISSING_RECOMMENDED_SLOT, 'effects'));
  }

  if (report.failures.length > 0) {
    report.failures.push(createEntry(REASON_CODES.STRUCTURALLY_INCOMPLETE_CONCEPT, null));
    report.passed = false;
    report.v3Status = 'incomplete';
  }

  return report;
}

module.exports = {
  validatePowerShape,
};
