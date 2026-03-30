'use strict';

const {
  readAuthorityStructureV3,
  readDutyStructureV3,
  readLegitimacyStructureV3,
  readPowerStructureV3,
  readResponsibilityStructureV3,
} = require('../../../backend/src/modules/concepts/concept-structure-schema');
const { RELATION_TYPES } = require('../../../backend/src/modules/concepts/concept-relation-schema');
const { normalizeText } = require('./normalize');
const { REASON_CODES } = require('./reason-codes');
const {
  buildDefaultGovernanceRelations,
  validateConceptRelations,
} = require('./validate-concept-relations');

const CANONICAL_ZONE_NAMES = Object.freeze([
  'shortDefinition',
  'coreMeaning',
  'fullDefinition',
]);

const POWER_IMPLIES_AUTHORITY_PATTERNS = Object.freeze([
  'power gives the right to direct',
  'power is the right to direct',
  'power itself authorizes',
  'effective capacity is permission',
  'ability to act is permission',
  'capability itself permits',
  'power counts as authority',
  'power is authority',
]);

const POWER_IMPLIES_AUTHORITY_SHIELDS = Object.freeze([
  'power is not the same as authority',
  'does not require a recognized right',
  'does not require recognized authority',
  'authority asks who may direct',
  'not who may rightfully direct',
  'power does not imply authority',
  'without authority',
]);

const POWER_IMPLIES_LEGITIMACY_PATTERNS = Object.freeze([
  'power is legitimate',
  'effective power is legitimate',
  'effectiveness makes power valid',
  'successful control is justified',
  'effective capacity is justified',
  'power counts as valid because it works',
  'power itself justifies rule',
]);

const POWER_IMPLIES_LEGITIMACY_SHIELDS = Object.freeze([
  'power may operate without it',
  'legitimacy may justify it',
  'not accepted or justified validity',
  'power does not imply legitimacy',
  'legitimacy asks whether',
  'power is not legitimacy',
]);

const AUTHORITY_IMPLIES_LEGITIMACY_PATTERNS = Object.freeze([
  'authority is legitimate',
  'authority is automatically legitimate',
  'recognized standing is by itself valid',
  'recognized standing alone is justified',
  'authority counts as justified',
  'authority itself validates standing',
  'directive right is automatically valid',
]);

const AUTHORITY_IMPLIES_LEGITIMACY_SHIELDS = Object.freeze([
  'not whether that standing is valid',
  'questions of whether that standing is valid belong to legitimacy',
  'authority can exist while legitimacy is disputed',
  'authority may exist while its legitimacy is contested',
  'authority is not legitimacy',
  'legitimacy asks whether',
]);

const TRIGGER_TYPE_TOKENS = Object.freeze({
  action: Object.freeze(['action', 'conduct', 'performance']),
  outcome: Object.freeze(['outcome', 'result', 'effect']),
  breach: Object.freeze(['breach', 'violation', 'non performance']),
  omission: Object.freeze(['omission', 'failure']),
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function normalizeConceptMap(concepts) {
  if (Array.isArray(concepts)) {
    return concepts.reduce((accumulator, concept) => {
      if (typeof concept?.conceptId === 'string' && concept.conceptId.trim() !== '') {
        accumulator[concept.conceptId] = concept;
      }

      return accumulator;
    }, {});
  }

  if (isPlainObject(concepts)) {
    return concepts;
  }

  return {};
}

function createLawEntry(code, severity, detail, relation = null, matchedText = null) {
  return {
    code,
    severity,
    detail,
    matchedText,
    relationType: isNonEmptyString(relation?.type) ? relation.type : null,
    subjectConceptId: isNonEmptyString(relation?.subject?.conceptId) ? relation.subject.conceptId : null,
    targetConceptId: isNonEmptyString(relation?.target?.conceptId) ? relation.target.conceptId : null,
  };
}

function collectRelationTexts(relation) {
  const texts = [];

  if (isNonEmptyString(relation?.basis?.description)) {
    texts.push(relation.basis.description);
  }

  if (isNonEmptyString(relation?.effect?.description)) {
    texts.push(relation.effect.description);
  }

  for (const key of ['when', 'unless']) {
    if (Array.isArray(relation?.conditions?.[key])) {
      relation.conditions[key].forEach((entry) => {
        if (isNonEmptyString(entry)) {
          texts.push(entry);
        }
      });
    }
  }

  return texts;
}

function collectConceptSignals(concept, structureSignals = []) {
  const texts = [
    concept?.canonical?.invariant,
    ...CANONICAL_ZONE_NAMES.map((zoneName) => concept?.[zoneName]),
    ...structureSignals,
  ];

  return texts
    .filter(isNonEmptyString)
    .map((text) => normalizeText(text))
    .filter(Boolean);
}

function findPatternMatch(signals, patterns, shields) {
  return signals.find((signal) => (
    patterns.some((pattern) => signal.includes(pattern))
    && !shields.some((pattern) => signal.includes(pattern))
  )) || null;
}

function relationScopeGrounded(authorityConcept, dutyConcept, relation) {
  const authorityStructure = readAuthorityStructureV3(authorityConcept);
  const dutyStructure = readDutyStructureV3(dutyConcept);
  const authorityDomain = normalizeText(authorityStructure?.scope?.domain);
  const authoritySystem = normalizeText(authorityStructure?.source?.system);
  const signals = [
    dutyConcept?.domain,
    dutyConcept?.scope?.domain,
    dutyStructure?.source?.system,
    dutyStructure?.content?.description,
    ...collectRelationTexts(relation),
  ]
    .filter(isNonEmptyString)
    .map((text) => normalizeText(text));

  if (!authorityDomain && !authoritySystem) {
    return false;
  }

  return signals.some((signal) => (
    (authorityDomain && signal.includes(authorityDomain))
    || (authoritySystem && signal.includes(authoritySystem))
  ));
}

function relationHasResponsibilityTriggerBasis(responsibilityConcept, relation) {
  const responsibilityStructure = readResponsibilityStructureV3(responsibilityConcept);
  const triggerType = responsibilityStructure?.trigger?.type;

  if (!isNonEmptyString(triggerType)) {
    return false;
  }

  const relationText = normalizeText(collectRelationTexts(relation).join(' '));
  const triggerTokens = TRIGGER_TYPE_TOKENS[triggerType] ?? [];
  const descriptionTokens = normalizeText(responsibilityStructure?.trigger?.description ?? '')
    .split(' ')
    .filter((token) => token.length >= 6);

  return (
    triggerTokens.some((token) => relationText.includes(token))
    || descriptionTokens.some((token) => relationText.includes(token))
  );
}

function validateAuthorityGroundsDutyLaw(relation, conceptsById) {
  if (relation.type !== RELATION_TYPES.GROUNDS_DUTY) {
    return null;
  }

  const failures = [];
  const authorityConcept = conceptsById[relation.subject.conceptId];
  const dutyConcept = conceptsById[relation.target.conceptId];
  const authorityStructure = readAuthorityStructureV3(authorityConcept);
  const dutyStructure = readDutyStructureV3(dutyConcept);

  if (!isNonEmptyString(dutyStructure?.source?.type) || !isNonEmptyString(dutyStructure?.source?.system)) {
    failures.push(createLawEntry(
      REASON_CODES.DUTY_DERIVATION_MISSING_VALID_SOURCE,
      'failure',
      'Duty derivation requires a typed duty source before authority may ground it.',
      relation,
    ));
  }

  if (!authorityStructure?.scope || !relationScopeGrounded(authorityConcept, dutyConcept, relation)) {
    failures.push(createLawEntry(
      REASON_CODES.AUTHORITY_CANNOT_GROUND_DUTY_OUTSIDE_SCOPE,
      'failure',
      'Authority may ground duty only when the relation remains aligned with authority scope or governing system.',
      relation,
    ));
  }

  return {
    lawId: 'authority_grounds_duty',
    relationType: relation.type,
    subjectConceptId: relation.subject.conceptId,
    targetConceptId: relation.target.conceptId,
    passed: failures.length === 0,
    failures,
    warnings: [],
  };
}

function validateDutyTriggersResponsibilityLaw(relation, conceptsById) {
  if (relation.type !== RELATION_TYPES.TRIGGERS_RESPONSIBILITY) {
    return null;
  }

  const failures = [];
  const responsibilityConcept = conceptsById[relation.target.conceptId];
  const responsibilityStructure = readResponsibilityStructureV3(responsibilityConcept);

  if (!responsibilityStructure?.trigger || !isNonEmptyString(responsibilityStructure.trigger.description)) {
    failures.push(createLawEntry(
      REASON_CODES.DUTY_TRIGGER_MISSING_RESPONSIBILITY_BASIS,
      'failure',
      'Responsibility requires a valid trigger basis before a duty relation may activate it.',
      relation,
    ));
  }

  if (responsibilityStructure?.trigger && !relationHasResponsibilityTriggerBasis(responsibilityConcept, relation)) {
    failures.push(createLawEntry(
      REASON_CODES.RESPONSIBILITY_MISSING_VALID_TRIGGER_RELATION,
      'failure',
      'Responsibility trigger must align with the duty relation basis, condition, or effect description.',
      relation,
    ));
  }

  return {
    lawId: 'duty_triggers_responsibility',
    relationType: relation.type,
    subjectConceptId: relation.subject.conceptId,
    targetConceptId: relation.target.conceptId,
    passed: failures.length === 0,
    failures,
    warnings: [],
  };
}

function validateAuthorityDoesNotImplyLegitimacy(conceptsById) {
  const authorityConcept = conceptsById.authority;
  const authorityStructure = readAuthorityStructureV3(authorityConcept);
  const signals = collectConceptSignals(authorityConcept, [
    authorityStructure?.holder?.label,
    authorityStructure?.source?.system,
  ]);
  const matchedText = findPatternMatch(
    signals,
    AUTHORITY_IMPLIES_LEGITIMACY_PATTERNS,
    AUTHORITY_IMPLIES_LEGITIMACY_SHIELDS,
  );
  const warnings = matchedText
    ? [createLawEntry(
      REASON_CODES.AUTHORITY_DOES_NOT_IMPLY_LEGITIMACY,
      'warning',
      'Authority must remain distinct from the evaluative validity tracked by legitimacy.',
      null,
      matchedText,
    )]
    : [];

  return {
    lawId: 'authority_does_not_imply_legitimacy',
    relationType: null,
    subjectConceptId: 'authority',
    targetConceptId: 'legitimacy',
    passed: warnings.length === 0,
    failures: [],
    warnings,
  };
}

function validatePowerDoesNotImplyAuthority(conceptsById) {
  const powerConcept = conceptsById.power;
  const powerStructure = readPowerStructureV3(powerConcept);
  const signals = collectConceptSignals(powerConcept, [
    powerStructure?.capability?.description,
    powerStructure?.source?.system,
  ]);
  const matchedText = findPatternMatch(
    signals,
    POWER_IMPLIES_AUTHORITY_PATTERNS,
    POWER_IMPLIES_AUTHORITY_SHIELDS,
  );
  const warnings = matchedText
    ? [createLawEntry(
      REASON_CODES.POWER_DOES_NOT_IMPLY_AUTHORITY,
      'warning',
      'Power must remain distinct from permission, entitlement, or directive right.',
      null,
      matchedText,
    )]
    : [];

  return {
    lawId: 'power_does_not_imply_authority',
    relationType: null,
    subjectConceptId: 'power',
    targetConceptId: 'authority',
    passed: warnings.length === 0,
    failures: [],
    warnings,
  };
}

function validatePowerDoesNotImplyLegitimacy(conceptsById) {
  const powerConcept = conceptsById.power;
  const powerStructure = readPowerStructureV3(powerConcept);
  const legitimacyConcept = conceptsById.legitimacy;
  const legitimacyStructure = readLegitimacyStructureV3(legitimacyConcept);
  const signals = collectConceptSignals(powerConcept, [
    powerStructure?.capability?.description,
    powerStructure?.effects?.type,
    legitimacyStructure?.basis?.description,
  ]);
  const matchedText = findPatternMatch(
    signals,
    POWER_IMPLIES_LEGITIMACY_PATTERNS,
    POWER_IMPLIES_LEGITIMACY_SHIELDS,
  );
  const warnings = matchedText
    ? [createLawEntry(
      REASON_CODES.POWER_DOES_NOT_IMPLY_LEGITIMACY,
      'warning',
      'Effective power must remain distinct from justified or valid standing.',
      null,
      matchedText,
    )]
    : [];

  return {
    lawId: 'power_does_not_imply_legitimacy',
    relationType: null,
    subjectConceptId: 'power',
    targetConceptId: 'legitimacy',
    passed: warnings.length === 0,
    failures: [],
    warnings,
  };
}

function hasRelationOfType(relationResults, subjectConceptId, relationType, targetConceptId) {
  return relationResults.some((relationResult) => (
    relationResult?.relation?.subject?.conceptId === subjectConceptId
    && relationResult?.relation?.target?.conceptId === targetConceptId
    && relationResult?.relation?.type === relationType
  ));
}

function hasRelationFromTo(relationResults, subjectConceptId, targetConceptId) {
  return relationResults.some((relationResult) => (
    relationResult?.relation?.subject?.conceptId === subjectConceptId
    && relationResult?.relation?.target?.conceptId === targetConceptId
  ));
}

function validateAuthorityLegitimacyCoverage(relationReport) {
  if (!relationReport.relationDataPresent) {
    return null;
  }

  const warnings = [];
  const hasAuthorityLegitimacyRelation = hasRelationFromTo(
    relationReport.relations,
    'legitimacy',
    'authority',
  );

  if (!hasAuthorityLegitimacyRelation) {
    warnings.push(createLawEntry(
      REASON_CODES.AUTHORITY_MISSING_LEGITIMACY_RELATION,
      'warning',
      'Authority should declare an explicit legitimacy relation when authored relation data is present.',
    ));
  }

  if (
    hasAuthorityLegitimacyRelation
    && !hasRelationOfType(
      relationReport.relations,
      'legitimacy',
      RELATION_TYPES.VALIDATES_AUTHORITY,
      'authority',
    )
  ) {
    warnings.push(createLawEntry(
      REASON_CODES.LEGITIMACY_RELATION_INCOMPLETE,
      'warning',
      'Legitimacy relation data is present for authority but lacks an explicit validation relation.',
    ));
  }

  return {
    lawId: 'authority_legitimacy_relation_coverage',
    relationType: null,
    subjectConceptId: 'legitimacy',
    targetConceptId: 'authority',
    passed: warnings.length === 0,
    failures: [],
    warnings,
  };
}

function validatePowerAuthorityCoverage(relationReport) {
  if (!relationReport.relationDataPresent) {
    return null;
  }

  const warnings = [];

  if (
    !hasRelationOfType(
      relationReport.relations,
      'power',
      RELATION_TYPES.REQUIRES_AUTHORITY,
      'authority',
    )
  ) {
    warnings.push(createLawEntry(
      REASON_CODES.POWER_MISSING_AUTHORITY_DEPENDENCY,
      'warning',
      'Power should declare an explicit authority dependency when authored relation data is present.',
    ));
  }

  return {
    lawId: 'power_authority_relation_coverage',
    relationType: null,
    subjectConceptId: 'power',
    targetConceptId: 'authority',
    passed: warnings.length === 0,
    failures: [],
    warnings,
  };
}

function validateGovernanceLaws({ concepts, relations, relationLoadOptions } = {}) {
  const conceptsById = normalizeConceptMap(concepts);
  const relationReport = validateConceptRelations({
    concepts: conceptsById,
    relations,
    relationLoadOptions,
  });

  const relationLawChecks = relationReport.relations
    .filter((relationResult) => relationResult.passed)
    .map((relationResult) => {
      if (relationResult.relation.type === RELATION_TYPES.GROUNDS_DUTY) {
        return validateAuthorityGroundsDutyLaw(relationResult.relation, conceptsById);
      }

      if (relationResult.relation.type === RELATION_TYPES.TRIGGERS_RESPONSIBILITY) {
        return validateDutyTriggersResponsibilityLaw(relationResult.relation, conceptsById);
      }

      return null;
    })
    .filter(Boolean);

  const implicationChecks = [
    validateAuthorityDoesNotImplyLegitimacy(conceptsById),
    validatePowerDoesNotImplyAuthority(conceptsById),
    validatePowerDoesNotImplyLegitimacy(conceptsById),
    validateAuthorityLegitimacyCoverage(relationReport),
    validatePowerAuthorityCoverage(relationReport),
  ].filter(Boolean);

  const lawChecks = [
    ...relationLawChecks,
    ...implicationChecks,
  ];
  const lawFailures = lawChecks.flatMap((lawCheck) => lawCheck.failures);
  const lawWarnings = lawChecks.flatMap((lawCheck) => lawCheck.warnings);

  const failures = [
    ...relationReport.failures,
    ...lawFailures,
  ];
  const warnings = [
    ...relationReport.warnings,
    ...lawWarnings,
  ];

  return {
    passed: failures.length === 0,
    applicable: relationReport.applicable || lawChecks.length > 0,
    source: relationReport.source,
    relationDataPresent: relationReport.relationDataPresent,
    dataSource: relationReport.dataSource,
    strictMode: relationReport.strictMode,
    fallbackUsed: relationReport.fallbackUsed,
    relationReport,
    relations: relationReport.relations,
    lawChecks,
    lawFailures,
    lawWarnings,
    failures,
    warnings,
    summary: {
      relationCount: relationReport.relationCount,
      lawCheckCount: lawChecks.length,
      failureCount: failures.length,
      warningCount: warnings.length,
    },
  };
}

module.exports = {
  buildDefaultGovernanceRelations,
  validateGovernanceLaws,
};
