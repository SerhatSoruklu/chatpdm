'use strict';

const {
  loadAuthoredRelationPackets,
} = require('../../../backend/src/modules/concepts/concept-relation-loader');
const {
  ALLOWED_RELATION_DIRECTIONS,
  CONCEPT_RELATION_SCHEMA_VERSION,
  GOVERNANCE_CONCEPT_IDS,
  RELATION_BASIS_KINDS,
  RELATION_EFFECT_KINDS,
  RELATION_SCHEMA_EXAMPLES,
  RELATION_TYPES,
} = require('../../../backend/src/modules/concepts/concept-relation-schema');
const { REASON_CODES } = require('./reason-codes');
const { validateConceptShape } = require('./validate-concept-shape');

const DEFAULT_GOVERNANCE_RELATIONS = Object.freeze([
  RELATION_SCHEMA_EXAMPLES.authorityGroundsDuty,
  RELATION_SCHEMA_EXAMPLES.dutyTriggersResponsibility,
  RELATION_SCHEMA_EXAMPLES.legitimacyValidatesAuthority,
  Object.freeze({
    schemaVersion: CONCEPT_RELATION_SCHEMA_VERSION,
    subject: Object.freeze({
      conceptId: 'power',
      path: 'structureV3.power.scope',
      label: 'Power execution within governance scope',
    }),
    type: RELATION_TYPES.REQUIRES_AUTHORITY,
    target: Object.freeze({
      conceptId: 'authority',
      path: 'structureV3.authority.scope',
      label: 'Authority standing that may permit execution',
    }),
    basis: Object.freeze({
      kind: 'scope_rule',
      description: 'Power may require authority when execution is treated as permitted action inside a governance order.',
    }),
    conditions: Object.freeze({
      when: Object.freeze(['execution is claimed as permitted within governance scope']),
      unless: Object.freeze(['the effect operates without recognized standing or permission']),
    }),
    effect: Object.freeze({
      kind: 'depends_on',
      description: 'Permitted execution may depend on authority without making power identical to authority.',
    }),
    status: Object.freeze({
      active: true,
      blocking: false,
      note: 'Seed relation for law validation of authority and power dependency.',
    }),
  }),
  Object.freeze({
    schemaVersion: CONCEPT_RELATION_SCHEMA_VERSION,
    subject: Object.freeze({
      conceptId: 'power',
      path: 'canonical.adjacent.authority',
      label: 'Power does not convert capacity into directive right',
    }),
    type: RELATION_TYPES.DOES_NOT_IMPLY,
    target: Object.freeze({
      conceptId: 'authority',
      path: 'canonical.invariant',
      label: 'Authority remains recognized standing rather than mere capacity',
    }),
    basis: Object.freeze({
      kind: 'boundary_rule',
      description: 'Effective capacity does not by itself imply permission, entitlement, or directive right.',
    }),
    conditions: Object.freeze({
      when: Object.freeze(['power is described as effective capacity or operative leverage']),
      unless: Object.freeze(['recognized authority is independently established']),
    }),
    effect: Object.freeze({
      kind: 'separates',
      description: 'Power remains distinct from authority even when authority channels it.',
    }),
    status: Object.freeze({
      active: true,
      blocking: false,
      note: 'Seed non-implication law for the authority and power boundary.',
    }),
  }),
  Object.freeze({
    schemaVersion: CONCEPT_RELATION_SCHEMA_VERSION,
    subject: Object.freeze({
      conceptId: 'power',
      path: 'canonical.adjacent.legitimacy',
      label: 'Power does not convert effectiveness into legitimacy',
    }),
    type: RELATION_TYPES.DOES_NOT_IMPLY,
    target: Object.freeze({
      conceptId: 'legitimacy',
      path: 'canonical.invariant',
      label: 'Legitimacy remains evaluative validity rather than operative success',
    }),
    basis: Object.freeze({
      kind: 'boundary_rule',
      description: 'Effective capacity or successful control does not by itself imply validity or justified standing.',
    }),
    conditions: Object.freeze({
      when: Object.freeze(['power is described as effective or successful']),
      unless: Object.freeze(['an evaluative legitimacy basis independently justifies the standing']),
    }),
    effect: Object.freeze({
      kind: 'separates',
      description: 'Power remains distinct from legitimacy even when legitimacy later justifies its use.',
    }),
    status: Object.freeze({
      active: true,
      blocking: false,
      note: 'Seed non-implication law for the power and legitimacy boundary.',
    }),
  }),
]);

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

function buildDefaultGovernanceRelations() {
  return DEFAULT_GOVERNANCE_RELATIONS.map((relation) => JSON.parse(JSON.stringify(relation)));
}

function buildDefaultGovernanceRelationsForConcepts(conceptIds) {
  const conceptIdSet = new Set(conceptIds);
  return buildDefaultGovernanceRelations().filter((relation) => conceptIdSet.has(relation.subject.conceptId));
}

function createRelationEntry(code, relation, detail, side = null) {
  return {
    code,
    side,
    detail,
    relationType: isNonEmptyString(relation?.type) ? relation.type : null,
    subjectConceptId: isNonEmptyString(relation?.subject?.conceptId) ? relation.subject.conceptId : null,
    targetConceptId: isNonEmptyString(relation?.target?.conceptId) ? relation.target.conceptId : null,
  };
}

function createConceptRelationEntry(code, conceptId, detail) {
  return {
    code,
    detail,
    relationType: null,
    side: null,
    conceptId,
    subjectConceptId: conceptId,
    targetConceptId: null,
  };
}

function isValidConditions(value) {
  if (value === undefined) {
    return true;
  }

  if (!isPlainObject(value)) {
    return false;
  }

  const keys = ['when', 'unless'];
  return keys.every((key) => (
    value[key] === undefined
    || (
      Array.isArray(value[key])
      && value[key].every(isNonEmptyString)
    )
  ));
}

function hasValidRelationShape(relation) {
  return (
    isPlainObject(relation)
    && relation.schemaVersion === CONCEPT_RELATION_SCHEMA_VERSION
    && isPlainObject(relation.subject)
    && GOVERNANCE_CONCEPT_IDS.includes(relation.subject.conceptId)
    && isPlainObject(relation.target)
    && GOVERNANCE_CONCEPT_IDS.includes(relation.target.conceptId)
    && Object.values(RELATION_TYPES).includes(relation.type)
    && isPlainObject(relation.basis)
    && RELATION_BASIS_KINDS.includes(relation.basis.kind)
    && isNonEmptyString(relation.basis.description)
    && isValidConditions(relation.conditions)
    && isPlainObject(relation.effect)
    && RELATION_EFFECT_KINDS.includes(relation.effect.kind)
    && isNonEmptyString(relation.effect.description)
    && isPlainObject(relation.status)
    && typeof relation.status.active === 'boolean'
    && typeof relation.status.blocking === 'boolean'
  );
}

function getConceptShapeReport(conceptId, conceptsById, cache) {
  if (cache.has(conceptId)) {
    return cache.get(conceptId);
  }

  const concept = conceptsById[conceptId] ?? null;
  const report = concept ? validateConceptShape(concept) : null;
  cache.set(conceptId, report);
  return report;
}

function buildRelationConflicts(relationResults) {
  const failures = [];
  const grouped = new Map();

  relationResults
    .filter((relationResult) => relationResult.passed && relationResult?.relation?.status?.active !== false)
    .forEach((relationResult) => {
      const relation = relationResult.relation;
      const key = `${relation.subject.conceptId}->${relation.target.conceptId}`;

      if (!grouped.has(key)) {
        grouped.set(key, new Set());
      }

      grouped.get(key).add(relation.type);
    });

  grouped.forEach((types, key) => {
    const [subjectConceptId, targetConceptId] = key.split('->');

    if (types.has(RELATION_TYPES.VALIDATES_AUTHORITY) && types.has(RELATION_TYPES.INVALIDATES)) {
      failures.push({
        code: REASON_CODES.RELATION_CONFLICT,
        detail: 'Authored relation data must not declare both validation and invalidation for the same active concept pair.',
        relationType: null,
        side: null,
        conceptId: subjectConceptId,
        subjectConceptId,
        targetConceptId,
      });
    }
  });

  return failures;
}

function validateConceptRelations({ concepts, relations, relationLoadOptions } = {}) {
  const conceptsById = normalizeConceptMap(concepts);
  let packetResults = [];
  let relationFailures = [];
  let relationWarnings = [];
  let relationDataPresent = Array.isArray(relations) && relations.length > 0;
  let source = relationDataPresent ? 'authored' : 'fallback';
  let dataSource = relationDataPresent ? 'provided_relations' : 'default_seed_relations';
  let strictMode = false;
  let fallbackUsed = false;
  let activeRelations = relationDataPresent
    ? relations
    : buildDefaultGovernanceRelations();
  let fallbackSubjectIds = new Set();

  if (!Array.isArray(relations)) {
    const authoredRelationLoad = loadAuthoredRelationPackets(relationLoadOptions);
    packetResults = authoredRelationLoad.packetResults;
    relationFailures = [...authoredRelationLoad.failures];
    relationWarnings = [...authoredRelationLoad.warnings];
    relationDataPresent = authoredRelationLoad.relationDataPresent;
    source = authoredRelationLoad.source;
    dataSource = authoredRelationLoad.dataSource;
    strictMode = authoredRelationLoad.strictMode;
    fallbackUsed = authoredRelationLoad.fallbackUsed;
    fallbackSubjectIds = new Set(authoredRelationLoad.missingConceptIds);

    activeRelations = [
      ...authoredRelationLoad.relations,
      ...(!strictMode
        ? buildDefaultGovernanceRelationsForConcepts(authoredRelationLoad.missingConceptIds)
        : []),
    ];
  } else {
    strictMode = false;
    fallbackUsed = false;
  }

  const shapeReportCache = new Map();

  const relationResults = activeRelations.map((relation) => {
    const failures = [];
    const warnings = [];

    if (!hasValidRelationShape(relation)) {
      failures.push(createRelationEntry(REASON_CODES.INVALID_RELATION_DIRECTION, relation, 'Relation object is malformed or uses unsupported relation schema values.'));
    } else {
      const allowedRelationTypes = ALLOWED_RELATION_DIRECTIONS[relation.subject.conceptId]?.[relation.target.conceptId] ?? [];

      if (!allowedRelationTypes.includes(relation.type)) {
        failures.push(createRelationEntry(REASON_CODES.INVALID_RELATION_DIRECTION, relation, 'Relation direction or type is not allowed for the current governance cluster.'));
      }
    }

    const subjectReport = isNonEmptyString(relation?.subject?.conceptId)
      ? getConceptShapeReport(relation.subject.conceptId, conceptsById, shapeReportCache)
      : null;
    const targetReport = isNonEmptyString(relation?.target?.conceptId)
      ? getConceptShapeReport(relation.target.conceptId, conceptsById, shapeReportCache)
      : null;

    if (!subjectReport?.applicable || !subjectReport?.passed) {
      failures.push(createRelationEntry(REASON_CODES.RELATION_REQUIRES_STRUCTURALLY_VALID_CONCEPT, relation, 'Relation subject must reference a structurally valid concept.', 'subject'));
    }

    if (!targetReport?.applicable || !targetReport?.passed) {
      failures.push(createRelationEntry(REASON_CODES.RELATION_REQUIRES_STRUCTURALLY_VALID_CONCEPT, relation, 'Relation target must reference a structurally valid concept.', 'target'));
    }

    return {
      relation,
      source: fallbackSubjectIds.has(relation?.subject?.conceptId) ? 'fallback' : 'authored',
      passed: failures.length === 0,
      failures,
      warnings,
      subjectV3Status: subjectReport?.v3Status ?? 'not_applicable',
      targetV3Status: targetReport?.v3Status ?? 'not_applicable',
    };
  });

  const relationConflicts = buildRelationConflicts(relationResults);
  relationFailures.push(...relationConflicts);

  if (fallbackUsed) {
    const fallbackWarnings = packetResults
      .filter((entry) => entry.present === false)
      .map((entry) => createConceptRelationEntry(
        REASON_CODES.RELATION_FALLBACK_USED,
        entry.conceptId,
        'Fallback relation seeds were used because authored relation coverage is incomplete.',
      ));

    relationWarnings.push(...fallbackWarnings);
  }

  return {
    passed: relationFailures.length === 0 && relationResults.every((relationResult) => relationResult.passed),
    applicable: activeRelations.length > 0,
    source,
    relationDataPresent,
    dataSource,
    strictMode,
    fallbackUsed,
    relationCount: relationResults.length,
    failureCount: relationFailures.length + relationResults.reduce((sum, relationResult) => sum + relationResult.failures.length, 0),
    warningCount: relationWarnings.length + relationResults.reduce((sum, relationResult) => sum + relationResult.warnings.length, 0),
    failures: [
      ...relationFailures,
      ...relationResults.flatMap((relationResult) => relationResult.failures),
    ],
    warnings: [
      ...relationWarnings,
      ...relationResults.flatMap((relationResult) => relationResult.warnings),
    ],
    packetResults,
    relations: relationResults,
  };
}

module.exports = {
  buildDefaultGovernanceRelations,
  validateConceptRelations,
};
