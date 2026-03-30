'use strict';

const {
  ACTOR_REF_TYPES,
  AUTHORITY_SOURCE_TYPES,
  AUTHORITY_TARGET_TYPES,
  readAuthorityStructureV3,
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

function validateActorRef(value) {
  return (
    isPlainObject(value)
    && ACTOR_REF_TYPES.includes(value.type)
    && isNonEmptyString(value.id)
    && (value.label === undefined || isNonEmptyString(value.label))
  );
}

function validateAuthorityScope(value) {
  return (
    isPlainObject(value)
    && isNonEmptyString(value.domain)
    && isNonEmptyStringArray(value.actions)
  );
}

function validateAuthoritySource(value) {
  return (
    isPlainObject(value)
    && AUTHORITY_SOURCE_TYPES.includes(value.type)
    && isNonEmptyString(value.system)
  );
}

function validateAuthorityTargets(value) {
  return (
    isPlainObject(value)
    && AUTHORITY_TARGET_TYPES.includes(value.type)
    && (
      value.identifiers === undefined
      || (
        Array.isArray(value.identifiers)
        && value.identifiers.every((entry) => isNonEmptyString(entry))
      )
    )
  );
}

function validateAuthorityLimits(value) {
  return (
    isPlainObject(value)
    && isNonEmptyStringArray(value.boundaries)
  );
}

function validateAuthorityDelegation(value) {
  return (
    isPlainObject(value)
    && typeof value.allowed === 'boolean'
  );
}

function validateAuthorityShape(concept) {
  const report = {
    applicable: concept?.conceptId === 'authority',
    skipped: concept?.conceptId !== 'authority',
    passed: true,
    v3Status: 'not_applicable',
    failures: [],
    warnings: [],
    requiredSlots: {
      holder: false,
      scope: false,
      source: false,
    },
    recommendedSlots: {
      targets: false,
      limits: false,
      delegation: false,
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
  const authorityStructure = readAuthorityStructureV3(concept);

  if (validateActorRef(authorityStructure?.holder)) {
    report.requiredSlots.holder = true;
  } else {
    report.failures.push(createEntry(REASON_CODES.AUTHORITY_MISSING_HOLDER, 'holder'));
  }

  if (validateAuthorityScope(authorityStructure?.scope)) {
    report.requiredSlots.scope = true;
  } else {
    report.failures.push(createEntry(REASON_CODES.AUTHORITY_MISSING_SCOPE, 'scope'));
  }

  if (validateAuthoritySource(authorityStructure?.source)) {
    report.requiredSlots.source = true;
  } else {
    report.failures.push(createEntry(REASON_CODES.AUTHORITY_MISSING_SOURCE, 'source'));
  }

  if (validateAuthorityTargets(authorityStructure?.targets)) {
    report.recommendedSlots.targets = true;
  } else {
    report.warnings.push(createEntry(REASON_CODES.MISSING_RECOMMENDED_SLOT, 'targets'));
  }

  if (validateAuthorityLimits(authorityStructure?.limits)) {
    report.recommendedSlots.limits = true;
  } else {
    report.warnings.push(createEntry(REASON_CODES.MISSING_RECOMMENDED_SLOT, 'limits'));
  }

  if (validateAuthorityDelegation(authorityStructure?.delegation)) {
    report.recommendedSlots.delegation = true;
  } else {
    report.warnings.push(createEntry(REASON_CODES.MISSING_RECOMMENDED_SLOT, 'delegation'));
  }

  if (report.failures.length > 0) {
    report.failures.push(createEntry(REASON_CODES.STRUCTURALLY_INCOMPLETE_CONCEPT, null));
    report.passed = false;
    report.v3Status = 'incomplete';
  }

  return report;
}

module.exports = {
  validateAuthorityShape,
};
