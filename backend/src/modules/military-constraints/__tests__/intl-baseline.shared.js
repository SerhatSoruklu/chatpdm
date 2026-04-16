'use strict';

const { buildCommonFacts } = require('./foundation-wave-b.shared');

function buildIntlStrikeFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'STRIKE';
  facts.action.forceLevel = 'DEADLY';
  facts.action.method = 'AIRSTRIKE';
  facts.action.domain = 'LAND';
  facts.target.protectedClass = 'MILITARY';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_TRUE';
  facts.target.lossOfProtectionStatus = 'NOT_LOST';
  facts.target.positiveIdentificationStatus = 'CONFIRMED_TRUE';
  return facts;
}

function buildIntlProtectedPersonFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'ENGAGE';
  facts.action.forceLevel = 'NON_LETHAL';
  facts.action.method = 'ACCESS_CONTROL';
  facts.action.domain = 'LAND';
  facts.context.operationalSlice = 'PROTECTED_PERSON_STATE';
  facts.person = {
    status: 'CIVILIAN',
    directParticipationStatus: 'CONFIRMED_TRUE',
    horsDeCombatStatus: false,
    detentionStatus: 'RELEASED',
    medicalRoleStatus: 'NONE',
  };
  facts.target.horsDeCombatStatus = false;
  return facts;
}

const PACKS = [
  {
    packId: 'INTL_LOAC_BASE_V1',
    manifestFile: 'reference-pack-manifest.intl-loac-base.json',
    clauseFile: 'intl-loac-base-core.json',
    expectedBundleId: 'intl-loac-base-bundle',
    expectedClauseCount: 2,
    caseIds: {
      allowed: 'intl-loac-allowed-case',
      refusal: 'intl-loac-refusal',
      incomplete: 'intl-loac-missing-fact',
    },
    buildFacts(bundle) {
      return buildIntlStrikeFacts(bundle);
    },
    mutateAllowed(facts) {
      facts.target.protectedClass = 'MILITARY';
      facts.target.militaryObjectiveStatus = 'CONFIRMED_TRUE';
    },
    mutateRefusal(facts) {
      facts.target.protectedClass = 'CIVILIAN';
      facts.target.militaryObjectiveStatus = 'UNCONFIRMED';
    },
    mutateIncomplete(facts) {
      delete facts.target.protectedClass;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'PROHIBITED_TARGET',
      failedStage: 'LEGAL_FLOOR',
      failingRuleIds: ['CR-INTL-LOAC-0001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'LEGAL_FLOOR',
      failingRuleIds: ['CR-INTL-LOAC-0001'],
    },
  },
  {
    packId: 'INTL_PROTECTED_SITE_BASE_V1',
    manifestFile: 'reference-pack-manifest.intl-protected-site-base.json',
    clauseFile: 'intl-protected-site-base-core.json',
    expectedBundleId: 'intl-protected-site-base-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'intl-protected-site-allowed-case',
      refusal: 'intl-protected-site-refusal',
      incomplete: 'intl-protected-site-missing-fact',
    },
    buildFacts(bundle) {
      return buildIntlStrikeFacts(bundle);
    },
    mutateAllowed(facts) {
      facts.target.objectType = 'OTHER';
      facts.target.lossOfProtectionStatus = 'NOT_LOST';
    },
    mutateRefusal(facts) {
      facts.target.objectType = 'HOSPITAL';
      facts.target.protectedClass = 'CIVILIAN';
      facts.target.militaryObjectiveStatus = 'UNCONFIRMED';
      facts.target.positiveIdentificationStatus = 'CONFIRMED_FALSE';
      facts.target.lossOfProtectionStatus = 'NOT_LOST';
    },
    mutateIncomplete(facts) {
      facts.target.objectType = 'HOSPITAL';
      facts.target.protectedClass = 'MEDICAL';
      delete facts.target.militaryObjectiveStatus;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'PROHIBITED_TARGET',
      failedStage: 'LEGAL_FLOOR',
      failingRuleIds: ['CR-INTL-SITE-0001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'LEGAL_FLOOR',
      failingRuleIds: ['CR-INTL-SITE-0001'],
    },
  },
  {
    packId: 'INTL_PROTECTED_PERSON_BASE_V1',
    manifestFile: 'reference-pack-manifest.intl-protected-person-base.json',
    clauseFile: 'intl-protected-person-base-core.json',
    expectedBundleId: 'intl-protected-person-base-bundle',
    expectedClauseCount: 4,
    caseIds: {
      allowed: 'intl-protected-person-allowed-case',
      refusal: 'intl-protected-person-refusal',
      incomplete: 'intl-protected-person-missing-fact',
    },
    buildFacts(bundle) {
      return buildIntlProtectedPersonFacts(bundle);
    },
    mutateAllowed(facts) {
      facts.person.status = 'CIVILIAN';
      facts.person.directParticipationStatus = 'CONFIRMED_TRUE';
      facts.person.horsDeCombatStatus = false;
      facts.person.detentionStatus = 'RELEASED';
      facts.person.medicalRoleStatus = 'NONE';
    },
    mutateRefusal(facts) {
      facts.person.status = 'CIVILIAN';
      facts.person.directParticipationStatus = 'CONFIRMED_FALSE';
      facts.person.horsDeCombatStatus = false;
      facts.person.detentionStatus = 'RELEASED';
      facts.person.medicalRoleStatus = 'NONE';
    },
    mutateIncomplete(facts) {
      facts.person.status = 'CIVILIAN';
      delete facts.person.directParticipationStatus;
      facts.person.horsDeCombatStatus = false;
      facts.person.detentionStatus = 'RELEASED';
      facts.person.medicalRoleStatus = 'NONE';
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'PROHIBITED_TARGET',
      failedStage: 'LEGAL_FLOOR',
      failingRuleIds: ['CR-INTL-PER-LF-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-INTL-PER-ADM-001'],
    },
    extraCases: [
      {
        caseId: 'intl-protected-person-medical-refusal',
        mutate(facts) {
          facts.person.status = 'MEDICAL_PERSONNEL';
          facts.person.directParticipationStatus = 'CONFIRMED_FALSE';
          facts.person.horsDeCombatStatus = false;
          facts.person.detentionStatus = 'RELEASED';
          facts.person.medicalRoleStatus = 'MEDICAL';
        },
        expected: {
          decision: 'REFUSED',
          reasonCode: 'PROHIBITED_TARGET',
          failedStage: 'LEGAL_FLOOR',
          failingRuleIds: ['CR-INTL-PER-LF-002'],
        },
      },
      {
        caseId: 'intl-protected-person-hors-de-combat-refusal',
        mutate(facts) {
          facts.person.status = 'DETAINEE';
          facts.person.directParticipationStatus = 'CONFIRMED_TRUE';
          facts.person.horsDeCombatStatus = true;
          facts.person.detentionStatus = 'DETAINED';
          facts.person.medicalRoleStatus = 'NONE';
        },
        expected: {
          decision: 'REFUSED',
          reasonCode: 'HORS_DE_COMBAT_PROTECTED',
          failedStage: 'LEGAL_FLOOR',
          failingRuleIds: ['CR-INTL-PER-LF-003'],
        },
      },
    ],
  },
];

module.exports = {
  PACKS,
  buildIntlProtectedPersonFacts,
  buildIntlStrikeFacts,
};
