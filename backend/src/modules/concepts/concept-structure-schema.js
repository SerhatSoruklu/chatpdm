'use strict';

const CONCEPT_STRUCTURE_SCHEMA_VERSION = 1;
const DUTY_SCHEMA_FAMILY = 'duty';
const RESPONSIBILITY_SCHEMA_FAMILY = 'responsibility';
const AUTHORITY_SCHEMA_FAMILY = 'authority';
const POWER_SCHEMA_FAMILY = 'power';
const LEGITIMACY_SCHEMA_FAMILY = 'legitimacy';

const ACTOR_REF_TYPES = Object.freeze([
  'person',
  'office',
  'organization_role',
  'public_body',
]);

const DUTY_CONTENT_TYPES = Object.freeze([
  'do',
  'forbear',
  'ensure',
  'disclose',
]);

const DUTY_CONTENT_STANDARDS = Object.freeze([
  'rule_like',
  'open_textured',
]);

const DUTY_SOURCE_TYPES = Object.freeze([
  'statute',
  'contract',
  'fiduciary',
  'policy',
  'moral',
]);

const DUTY_OBLIGEE_TYPES = Object.freeze([
  'party',
  'class',
  'public',
]);

const DUTY_DELEGATION_EFFECTS = Object.freeze([
  'transfer',
  'shared',
  'none',
]);

const DUTY_PHASES = Object.freeze([
  'primary',
  'remedial',
  'procedural',
]);

const DUTY_MODALITIES = Object.freeze([
  'absolute',
  'defeasible',
]);

const RESPONSIBILITY_TRIGGER_TYPES = Object.freeze([
  'action',
  'outcome',
  'breach',
  'omission',
]);

const RESPONSIBILITY_ATTRIBUTION_TYPES = Object.freeze([
  'direct',
  'indirect',
  'collective',
]);

const RESPONSIBILITY_ACCOUNTABILITY_TARGETS = Object.freeze([
  'party',
  'class',
  'public',
  'institution',
]);

const RESPONSIBILITY_CONSEQUENCE_TYPES = Object.freeze([
  'moral',
  'legal',
  'organisational',
]);

const RESPONSIBILITY_PHASES = Object.freeze([
  'post_action',
  'post_breach',
  'ongoing',
]);

const AUTHORITY_SOURCE_TYPES = Object.freeze([
  'law',
  'role',
  'institution',
  'delegation',
]);

const AUTHORITY_TARGET_TYPES = Object.freeze([
  'party',
  'class',
  'public',
  'institution',
]);

const POWER_CAPABILITY_TYPES = Object.freeze([
  'physical',
  'legal',
  'institutional',
  'economic',
  'informational',
]);

const POWER_SOURCE_TYPES = Object.freeze([
  'position',
  'control',
  'resource',
  'delegation',
]);

const POWER_EFFECT_TYPES = Object.freeze([
  'direct',
  'indirect',
]);

const LEGITIMACY_SUBJECT_TYPES = Object.freeze([
  ...ACTOR_REF_TYPES,
  'authority',
  'power',
  'rule',
]);

const LEGITIMACY_BASIS_TYPES = Object.freeze([
  'legal',
  'procedural',
  'moral',
  'social',
]);

const LEGITIMACY_EVALUATOR_TYPES = Object.freeze([
  'institution',
  'public',
  'community',
  'system',
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * A governance-domain actor reference that can bear, hold, or be assigned
 * structured concept relations without introducing runtime inference.
 *
 * @typedef {'person' | 'office' | 'organization_role' | 'public_body'} ActorRefType
 */

/**
 * @typedef {Object} ActorRef
 * @property {ActorRefType} type
 * @property {string} id
 * @property {string} [label]
 */

/**
 * @typedef {'do' | 'forbear' | 'ensure' | 'disclose'} DutyContentType
 */

/**
 * @typedef {'rule_like' | 'open_textured'} DutyContentStandard
 */

/**
 * @typedef {Object} DutyContent
 * @property {DutyContentType} type
 * @property {string} description
 * @property {DutyContentStandard} standard
 */

/**
 * @typedef {'statute' | 'contract' | 'fiduciary' | 'policy' | 'moral'} DutySourceType
 */

/**
 * @typedef {Object} DutySource
 * @property {DutySourceType} type
 * @property {string} system
 */

/**
 * @typedef {'party' | 'class' | 'public'} DutyObligeeType
 */

/**
 * @typedef {Object} DutyObligee
 * @property {DutyObligeeType} type
 * @property {string} [identifier]
 */

/**
 * @typedef {Object} DutyConditions
 * @property {string[]} [when]
 * @property {string[]} [unless]
 * @property {string[]} [exceptions]
 */

/**
 * @typedef {Object} DutyEnforcement
 * @property {boolean} enforceable
 * @property {string[]} [enforcer]
 * @property {string} [forum]
 * @property {string[]} [sanctions]
 */

/**
 * @typedef {'transfer' | 'shared' | 'none'} DutyDelegationEffect
 */

/**
 * @typedef {Object} DutyDelegation
 * @property {boolean} delegable
 * @property {DutyDelegationEffect} effect
 */

/**
 * @typedef {'primary' | 'remedial' | 'procedural'} DutyPhase
 */

/**
 * @typedef {'absolute' | 'defeasible'} DutyModality
 */

/**
 * @typedef {Object} DutySchema
 * @property {ActorRef} bearer
 * @property {DutyContent} content
 * @property {DutySource} source
 * @property {DutyObligee} [obligee]
 * @property {DutyConditions} [conditions]
 * @property {DutyEnforcement} [enforcement]
 * @property {DutyDelegation} [delegation]
 * @property {DutyPhase} [phase]
 * @property {DutyModality} [modality]
 */

/**
 * @typedef {'action' | 'outcome' | 'breach' | 'omission'} ResponsibilityTriggerType
 */

/**
 * @typedef {Object} ResponsibilityTrigger
 * @property {ResponsibilityTriggerType} type
 * @property {string} description
 */

/**
 * @typedef {Object} ResponsibilityScope
 * @property {string} domain
 * @property {string} [object]
 */

/**
 * @typedef {'direct' | 'indirect' | 'collective'} ResponsibilityAttributionType
 */

/**
 * @typedef {Object} ResponsibilityAttribution
 * @property {ResponsibilityAttributionType} type
 */

/**
 * @typedef {'party' | 'class' | 'public' | 'institution'} ResponsibilityAccountabilityTarget
 */

/**
 * @typedef {Object} ResponsibilityAccountability
 * @property {ResponsibilityAccountabilityTarget} [to]
 * @property {boolean} [enforceable]
 */

/**
 * @typedef {'moral' | 'legal' | 'organisational'} ResponsibilityConsequenceType
 */

/**
 * @typedef {Object} ResponsibilityConsequence
 * @property {ResponsibilityConsequenceType} type
 */

/**
 * @typedef {'post_action' | 'post_breach' | 'ongoing'} ResponsibilityPhase
 */

/**
 * @typedef {Object} ResponsibilitySchema
 * @property {ActorRef} subject
 * @property {ResponsibilityTrigger} trigger
 * @property {ResponsibilityScope} scope
 * @property {ResponsibilityAttribution} [attribution]
 * @property {ResponsibilityAccountability} [accountability]
 * @property {ResponsibilityConsequence} [consequence]
 * @property {ResponsibilityPhase} [phase]
 */

/**
 * @typedef {Object} AuthorityScope
 * @property {string} domain
 * @property {string[]} actions
 */

/**
 * @typedef {'law' | 'role' | 'institution' | 'delegation'} AuthoritySourceType
 */

/**
 * @typedef {Object} AuthoritySource
 * @property {AuthoritySourceType} type
 * @property {string} system
 */

/**
 * @typedef {'party' | 'class' | 'public' | 'institution'} AuthorityTargetType
 */

/**
 * @typedef {Object} AuthorityTargets
 * @property {AuthorityTargetType} type
 * @property {string[]} [identifiers]
 */

/**
 * @typedef {Object} AuthorityLimits
 * @property {string[]} boundaries
 */

/**
 * @typedef {Object} AuthorityDelegation
 * @property {boolean} allowed
 */

/**
 * @typedef {Object} AuthorityLegitimacyHint
 * @property {boolean} [recognised]
 */

/**
 * @typedef {Object} AuthoritySchema
 * @property {ActorRef} holder
 * @property {AuthorityScope} scope
 * @property {AuthoritySource} source
 * @property {AuthorityTargets} [targets]
 * @property {AuthorityLimits} [limits]
 * @property {AuthorityDelegation} [delegation]
 * @property {AuthorityLegitimacyHint} [legitimacyHint]
 */

/**
 * @typedef {'physical' | 'legal' | 'institutional' | 'economic' | 'informational'} PowerCapabilityType
 */

/**
 * @typedef {Object} PowerCapability
 * @property {PowerCapabilityType} type
 * @property {string} description
 */

/**
 * @typedef {Object} PowerScope
 * @property {string} domain
 * @property {string[]} actions
 */

/**
 * @typedef {Object} PowerConstraints
 * @property {string[]} [limitedBy]
 */

/**
 * @typedef {'position' | 'control' | 'resource' | 'delegation'} PowerSourceType
 */

/**
 * @typedef {Object} PowerSource
 * @property {PowerSourceType} type
 * @property {string} system
 */

/**
 * @typedef {'direct' | 'indirect'} PowerEffectType
 */

/**
 * @typedef {Object} PowerEffects
 * @property {PowerEffectType} type
 * @property {string[]} [targets]
 */

/**
 * @typedef {Object} PowerDependency
 * @property {boolean} [requiresAuthority]
 */

/**
 * @typedef {Object} PowerSchema
 * @property {ActorRef} holder
 * @property {PowerCapability} capability
 * @property {PowerScope} scope
 * @property {PowerConstraints} [constraints]
 * @property {PowerSource} [source]
 * @property {PowerEffects} [effects]
 * @property {PowerDependency} [dependency]
 */

/**
 * @typedef {'person' | 'office' | 'organization_role' | 'public_body' | 'authority' | 'power' | 'rule'} LegitimacySubjectType
 */

/**
 * @typedef {Object} LegitimacySubjectRef
 * @property {LegitimacySubjectType} type
 * @property {string} id
 * @property {string} [label]
 */

/**
 * @typedef {'legal' | 'procedural' | 'moral' | 'social'} LegitimacyBasisType
 */

/**
 * @typedef {Object} LegitimacyBasis
 * @property {LegitimacyBasisType} type
 * @property {string} description
 */

/**
 * @typedef {Object} LegitimacyScope
 * @property {string} domain
 * @property {string} [object]
 */

/**
 * @typedef {Object} LegitimacyStatus
 * @property {boolean} recognised
 * @property {boolean} [justified]
 */

/**
 * @typedef {'institution' | 'public' | 'community' | 'system'} LegitimacyEvaluatorType
 */

/**
 * @typedef {Object} LegitimacyEvaluator
 * @property {LegitimacyEvaluatorType} type
 * @property {string} [identifier]
 */

/**
 * @typedef {Object} LegitimacyConditions
 * @property {string[]} [when]
 * @property {string[]} [unless]
 */

/**
 * @typedef {Object} LegitimacySchema
 * @property {LegitimacySubjectRef} subject
 * @property {LegitimacyBasis} basis
 * @property {LegitimacyScope} scope
 * @property {LegitimacyStatus} status
 * @property {LegitimacyEvaluator} [evaluator]
 * @property {LegitimacyConditions} [conditions]
 */

const DUTY_SCHEMA_EXAMPLE = Object.freeze({
  bearer: Object.freeze({
    type: 'office',
    id: 'director',
    label: 'Company director',
  }),
  content: Object.freeze({
    type: 'do',
    description: 'act in the interest of the governed entity within the defined office scope',
    standard: 'open_textured',
  }),
  source: Object.freeze({
    type: 'statute',
    system: 'governance_law',
  }),
  obligee: Object.freeze({
    type: 'public',
  }),
  conditions: Object.freeze({
    when: Object.freeze(['while the actor occupies the office']),
    unless: Object.freeze(['a valid suspension or disqualification applies']),
    exceptions: Object.freeze([]),
  }),
  enforcement: Object.freeze({
    enforceable: true,
    enforcer: Object.freeze(['court', 'oversight_body']),
    forum: 'governance_review_process',
    sanctions: Object.freeze(['injunction', 'removal']),
  }),
  delegation: Object.freeze({
    delegable: false,
    effect: 'none',
  }),
  phase: 'primary',
  modality: 'defeasible',
});

const RESPONSIBILITY_SCHEMA_EXAMPLE = Object.freeze({
  subject: Object.freeze({
    type: 'organization_role',
    id: 'office_holder',
    label: 'Office-holder subject to answerability',
  }),
  trigger: Object.freeze({
    type: 'action',
    description: 'actions and omissions attributable to the office-holder within the role scope',
  }),
  scope: Object.freeze({
    domain: 'governance',
    object: 'decisions, omissions, and outcomes attributable to the held role',
  }),
  attribution: Object.freeze({
    type: 'direct',
  }),
  accountability: Object.freeze({
    to: 'institution',
    enforceable: true,
  }),
  consequence: Object.freeze({
    type: 'organisational',
  }),
  phase: 'ongoing',
});

const AUTHORITY_SCHEMA_EXAMPLE = Object.freeze({
  holder: Object.freeze({
    type: 'office',
    id: 'governing_office',
    label: 'Recognized governing office',
  }),
  scope: Object.freeze({
    domain: 'governance',
    actions: Object.freeze(['direct', 'decide', 'govern']),
  }),
  source: Object.freeze({
    type: 'institution',
    system: 'governance_order',
  }),
  targets: Object.freeze({
    type: 'public',
    identifiers: Object.freeze([]),
  }),
  limits: Object.freeze({
    boundaries: Object.freeze(['within the role-defined governance scope']),
  }),
  delegation: Object.freeze({
    allowed: true,
  }),
  legitimacyHint: Object.freeze({
    recognised: true,
  }),
});

const POWER_SCHEMA_EXAMPLE = Object.freeze({
  holder: Object.freeze({
    type: 'organization_role',
    id: 'governing_actor',
    label: 'Actor able to produce governance effects',
  }),
  capability: Object.freeze({
    type: 'institutional',
    description: 'capacity to secure compliance and alter governance conditions',
  }),
  scope: Object.freeze({
    domain: 'governance',
    actions: Object.freeze(['produce_effects', 'secure_compliance', 'alter_conditions']),
  }),
  constraints: Object.freeze({
    limitedBy: Object.freeze(['resource scarcity', 'countervailing institutions']),
  }),
  source: Object.freeze({
    type: 'position',
    system: 'governance_order',
  }),
  effects: Object.freeze({
    type: 'direct',
    targets: Object.freeze(['governed_parties', 'institutional_conditions']),
  }),
  dependency: Object.freeze({
    requiresAuthority: false,
  }),
});

const LEGITIMACY_SCHEMA_EXAMPLE = Object.freeze({
  subject: Object.freeze({
    type: 'authority',
    id: 'governing_standing',
    label: 'Rule or standing under evaluative review',
  }),
  basis: Object.freeze({
    type: 'procedural',
    description: 'the standing is treated as valid because it arises through accepted governance procedures',
  }),
  scope: Object.freeze({
    domain: 'governance',
    object: 'rule, office, or standing under evaluation',
  }),
  status: Object.freeze({
    recognised: true,
    justified: true,
  }),
  evaluator: Object.freeze({
    type: 'institution',
    identifier: 'governance_order',
  }),
  conditions: Object.freeze({
    when: Object.freeze(['while the underlying governance process remains accepted']),
    unless: Object.freeze(['procedural invalidity or norm-breaking defect is established']),
  }),
});

function readOptionalStructureV3Envelope(concept) {
  return isPlainObject(concept?.structureV3) ? concept.structureV3 : null;
}

function readDutyStructureV3(concept) {
  const structureV3 = readOptionalStructureV3Envelope(concept);

  if (
    structureV3
    && structureV3.schemaVersion === CONCEPT_STRUCTURE_SCHEMA_VERSION
    && structureV3.conceptFamily === DUTY_SCHEMA_FAMILY
    && isPlainObject(structureV3.duty)
  ) {
    return structureV3.duty;
  }

  return null;
}

function readResponsibilityStructureV3(concept) {
  const structureV3 = readOptionalStructureV3Envelope(concept);

  if (
    structureV3
    && structureV3.schemaVersion === CONCEPT_STRUCTURE_SCHEMA_VERSION
    && structureV3.conceptFamily === RESPONSIBILITY_SCHEMA_FAMILY
    && isPlainObject(structureV3.responsibility)
  ) {
    return structureV3.responsibility;
  }

  return null;
}

function readAuthorityStructureV3(concept) {
  const structureV3 = readOptionalStructureV3Envelope(concept);

  if (
    structureV3
    && structureV3.schemaVersion === CONCEPT_STRUCTURE_SCHEMA_VERSION
    && structureV3.conceptFamily === AUTHORITY_SCHEMA_FAMILY
    && isPlainObject(structureV3.authority)
  ) {
    return structureV3.authority;
  }

  return null;
}

function readPowerStructureV3(concept) {
  const structureV3 = readOptionalStructureV3Envelope(concept);

  if (
    structureV3
    && structureV3.schemaVersion === CONCEPT_STRUCTURE_SCHEMA_VERSION
    && structureV3.conceptFamily === POWER_SCHEMA_FAMILY
    && isPlainObject(structureV3.power)
  ) {
    return structureV3.power;
  }

  return null;
}

function readLegitimacyStructureV3(concept) {
  const structureV3 = readOptionalStructureV3Envelope(concept);

  if (
    structureV3
    && structureV3.schemaVersion === CONCEPT_STRUCTURE_SCHEMA_VERSION
    && structureV3.conceptFamily === LEGITIMACY_SCHEMA_FAMILY
    && isPlainObject(structureV3.legitimacy)
  ) {
    return structureV3.legitimacy;
  }

  return null;
}

module.exports = {
  ACTOR_REF_TYPES,
  AUTHORITY_SCHEMA_EXAMPLE,
  AUTHORITY_SCHEMA_FAMILY,
  AUTHORITY_SOURCE_TYPES,
  AUTHORITY_TARGET_TYPES,
  CONCEPT_STRUCTURE_SCHEMA_VERSION,
  DUTY_CONTENT_STANDARDS,
  DUTY_CONTENT_TYPES,
  DUTY_DELEGATION_EFFECTS,
  DUTY_MODALITIES,
  DUTY_OBLIGEE_TYPES,
  DUTY_PHASES,
  DUTY_SCHEMA_EXAMPLE,
  DUTY_SCHEMA_FAMILY,
  DUTY_SOURCE_TYPES,
  LEGITIMACY_BASIS_TYPES,
  LEGITIMACY_EVALUATOR_TYPES,
  LEGITIMACY_SCHEMA_EXAMPLE,
  LEGITIMACY_SCHEMA_FAMILY,
  LEGITIMACY_SUBJECT_TYPES,
  POWER_CAPABILITY_TYPES,
  POWER_EFFECT_TYPES,
  POWER_SCHEMA_EXAMPLE,
  POWER_SCHEMA_FAMILY,
  POWER_SOURCE_TYPES,
  RESPONSIBILITY_ACCOUNTABILITY_TARGETS,
  RESPONSIBILITY_ATTRIBUTION_TYPES,
  RESPONSIBILITY_CONSEQUENCE_TYPES,
  RESPONSIBILITY_PHASES,
  RESPONSIBILITY_SCHEMA_EXAMPLE,
  RESPONSIBILITY_SCHEMA_FAMILY,
  RESPONSIBILITY_TRIGGER_TYPES,
  readAuthorityStructureV3,
  readDutyStructureV3,
  readLegitimacyStructureV3,
  readOptionalStructureV3Envelope,
  readPowerStructureV3,
  readResponsibilityStructureV3,
};
