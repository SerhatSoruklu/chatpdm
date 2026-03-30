'use strict';

const CONCEPT_RELATION_SCHEMA_VERSION = 1;

const GOVERNANCE_CONCEPT_IDS = Object.freeze([
  'duty',
  'responsibility',
  'authority',
  'power',
  'legitimacy',
]);

const RELATION_TYPES = Object.freeze({
  GROUNDS_DUTY: 'GROUNDS_DUTY',
  TRIGGERS_RESPONSIBILITY: 'TRIGGERS_RESPONSIBILITY',
  VALIDATES_AUTHORITY: 'VALIDATES_AUTHORITY',
  PERMITS_EXECUTION: 'PERMITS_EXECUTION',
  REQUIRES_AUTHORITY: 'REQUIRES_AUTHORITY',
  DOES_NOT_IMPLY: 'DOES_NOT_IMPLY',
  WEAKENS: 'WEAKENS',
  INVALIDATES: 'INVALIDATES',
});

const RELATION_BASIS_KINDS = Object.freeze([
  'concept_law',
  'scope_rule',
  'boundary_rule',
  'governance_rule',
]);

const RELATION_EFFECT_KINDS = Object.freeze([
  'derives',
  'triggers',
  'validates',
  'permits',
  'depends_on',
  'weakens',
  'invalidates',
  'separates',
]);

const ALLOWED_RELATION_DIRECTIONS = Object.freeze({
  authority: Object.freeze({
    duty: Object.freeze([RELATION_TYPES.GROUNDS_DUTY]),
    power: Object.freeze([RELATION_TYPES.PERMITS_EXECUTION]),
  }),
  duty: Object.freeze({
    responsibility: Object.freeze([RELATION_TYPES.TRIGGERS_RESPONSIBILITY]),
  }),
  legitimacy: Object.freeze({
    authority: Object.freeze([
      RELATION_TYPES.VALIDATES_AUTHORITY,
      RELATION_TYPES.WEAKENS,
      RELATION_TYPES.INVALIDATES,
    ]),
    power: Object.freeze([
      RELATION_TYPES.WEAKENS,
      RELATION_TYPES.INVALIDATES,
    ]),
  }),
  power: Object.freeze({
    authority: Object.freeze([
      RELATION_TYPES.REQUIRES_AUTHORITY,
      RELATION_TYPES.DOES_NOT_IMPLY,
    ]),
    legitimacy: Object.freeze([
      RELATION_TYPES.DOES_NOT_IMPLY,
    ]),
  }),
});

/**
 * @typedef {'duty' | 'responsibility' | 'authority' | 'power' | 'legitimacy'} GovernanceConceptId
 */

/**
 * @typedef {Object} RelationSubjectRef
 * @property {GovernanceConceptId} conceptId
 * @property {string} [path]
 * @property {string} [label]
 */

/**
 * @typedef {Object} RelationTargetRef
 * @property {GovernanceConceptId} conceptId
 * @property {string} [path]
 * @property {string} [label]
 */

/**
 * @typedef {'GROUNDS_DUTY' | 'TRIGGERS_RESPONSIBILITY' | 'VALIDATES_AUTHORITY' | 'PERMITS_EXECUTION' | 'REQUIRES_AUTHORITY' | 'DOES_NOT_IMPLY' | 'WEAKENS' | 'INVALIDATES'} RelationType
 */

/**
 * @typedef {'concept_law' | 'scope_rule' | 'boundary_rule' | 'governance_rule'} RelationBasisKind
 */

/**
 * @typedef {Object} RelationBasis
 * @property {RelationBasisKind} kind
 * @property {string} description
 */

/**
 * @typedef {Object} RelationConditions
 * @property {string[]} [when]
 * @property {string[]} [unless]
 */

/**
 * @typedef {'derives' | 'triggers' | 'validates' | 'permits' | 'depends_on' | 'weakens' | 'invalidates' | 'separates'} RelationEffectKind
 */

/**
 * @typedef {Object} RelationEffect
 * @property {RelationEffectKind} kind
 * @property {string} description
 */

/**
 * @typedef {Object} RelationStatus
 * @property {boolean} active
 * @property {boolean} blocking
 * @property {string} [note]
 */

/**
 * @typedef {Object} ConceptRelation
 * @property {number} schemaVersion
 * @property {RelationSubjectRef} subject
 * @property {RelationType} type
 * @property {RelationTargetRef} target
 * @property {RelationBasis} basis
 * @property {RelationConditions} [conditions]
 * @property {RelationEffect} effect
 * @property {RelationStatus} status
 */

/**
 * @typedef {Object} ConceptRelationPacket
 * @property {number} schemaVersion
 * @property {GovernanceConceptId} conceptId
 * @property {ConceptRelation[]} relations
 */

const AUTHORITY_GROUNDS_DUTY_EXAMPLE = Object.freeze({
  schemaVersion: CONCEPT_RELATION_SCHEMA_VERSION,
  subject: Object.freeze({
    conceptId: 'authority',
    path: 'structureV3.authority.scope',
    label: 'Recognized authority within governance scope',
  }),
  type: RELATION_TYPES.GROUNDS_DUTY,
  target: Object.freeze({
    conceptId: 'duty',
    path: 'structureV3.duty.source',
    label: 'Derived duty grounded in authority',
  }),
  basis: Object.freeze({
    kind: 'concept_law',
    description: 'Valid authority may ground or issue duties within its defined governance scope.',
  }),
  conditions: Object.freeze({
    when: Object.freeze(['authority acts within the recognized scope of standing']),
    unless: Object.freeze(['the standing is invalidated or exceeds scope']),
  }),
  effect: Object.freeze({
    kind: 'derives',
    description: 'A scoped duty may be generated or grounded from authority.',
  }),
  status: Object.freeze({
    active: true,
    blocking: false,
    note: 'Schema-only example for the relation layer foundation.',
  }),
});

const DUTY_TRIGGERS_RESPONSIBILITY_EXAMPLE = Object.freeze({
  schemaVersion: CONCEPT_RELATION_SCHEMA_VERSION,
  subject: Object.freeze({
    conceptId: 'duty',
    path: 'structureV3.duty.content',
    label: 'Duty under performance review',
  }),
  type: RELATION_TYPES.TRIGGERS_RESPONSIBILITY,
  target: Object.freeze({
    conceptId: 'responsibility',
    path: 'structureV3.responsibility.trigger',
    label: 'Responsibility activated by duty breach or non-performance',
  }),
  basis: Object.freeze({
    kind: 'governance_rule',
    description: 'Duty breach, non-performance, or attributable outcome may activate responsibility.',
  }),
  conditions: Object.freeze({
    when: Object.freeze(['duty performance fails, breaches, or produces attributable outcome']),
    unless: Object.freeze(['the duty is discharged or the trigger event does not occur']),
  }),
  effect: Object.freeze({
    kind: 'triggers',
    description: 'Responsibility becomes active when the duty trigger condition is met.',
  }),
  status: Object.freeze({
    active: true,
    blocking: false,
    note: 'Schema-only example for future cross-concept law validation.',
  }),
});

const LEGITIMACY_VALIDATES_AUTHORITY_EXAMPLE = Object.freeze({
  schemaVersion: CONCEPT_RELATION_SCHEMA_VERSION,
  subject: Object.freeze({
    conceptId: 'legitimacy',
    path: 'structureV3.legitimacy.status',
    label: 'Legitimacy assessment of governance standing',
  }),
  type: RELATION_TYPES.VALIDATES_AUTHORITY,
  target: Object.freeze({
    conceptId: 'authority',
    path: 'structureV3.authority.holder',
    label: 'Authority standing subject to validation',
  }),
  basis: Object.freeze({
    kind: 'boundary_rule',
    description: 'Legitimacy evaluates whether authority standing counts as justified or accepted.',
  }),
  conditions: Object.freeze({
    when: Object.freeze(['authority standing is assessed within governance order']),
    unless: Object.freeze(['no evaluative basis is available for legitimacy review']),
  }),
  effect: Object.freeze({
    kind: 'validates',
    description: 'Legitimacy may validate, weaken, or invalidate authority standing.',
  }),
  status: Object.freeze({
    active: true,
    blocking: false,
    note: 'Schema-only example for authority validation relation.',
  }),
});

const RELATION_SCHEMA_EXAMPLES = Object.freeze({
  authorityGroundsDuty: AUTHORITY_GROUNDS_DUTY_EXAMPLE,
  dutyTriggersResponsibility: DUTY_TRIGGERS_RESPONSIBILITY_EXAMPLE,
  legitimacyValidatesAuthority: LEGITIMACY_VALIDATES_AUTHORITY_EXAMPLE,
});

module.exports = {
  ALLOWED_RELATION_DIRECTIONS,
  AUTHORITY_GROUNDS_DUTY_EXAMPLE,
  CONCEPT_RELATION_SCHEMA_VERSION,
  DUTY_TRIGGERS_RESPONSIBILITY_EXAMPLE,
  GOVERNANCE_CONCEPT_IDS,
  LEGITIMACY_VALIDATES_AUTHORITY_EXAMPLE,
  RELATION_BASIS_KINDS,
  RELATION_EFFECT_KINDS,
  RELATION_SCHEMA_EXAMPLES,
  RELATION_TYPES,
};
