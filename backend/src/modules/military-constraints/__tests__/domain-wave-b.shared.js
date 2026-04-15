'use strict';

const { buildCommonFacts } = require('./foundation-wave-b.shared');

function buildCheckpointFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'ACCESS_CONTROL';
  facts.action.forceLevel = 'NON_LETHAL';
  facts.action.method = 'CHECKPOINT_CONTROL';
  facts.action.domain = 'LAND';
  delete facts.context.operationalSlice;
  return facts;
}

function buildSearchFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'SEARCH';
  facts.action.forceLevel = 'NON_LETHAL';
  facts.action.method = 'SEARCH_SWEEP';
  facts.action.domain = 'LAND';
  delete facts.context.operationalSlice;
  return facts;
}

function buildDetentionFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'DETENTION';
  facts.action.forceLevel = 'NON_LETHAL';
  facts.action.method = 'CUSTODY_HANDLING';
  facts.action.domain = 'LAND';
  facts.context.operationalSlice = 'PROTECTED_PERSON_STATE';
  facts.person = {
    status: 'DETAINEE',
    directParticipationStatus: 'CONFIRMED_FALSE',
    horsDeCombatStatus: false,
    detentionStatus: 'IN_CUSTODY',
    medicalRoleStatus: 'NONE',
  };
  return facts;
}

const PACKS = [
  {
    packId: 'US_CHECKPOINT_ADMISSIBILITY_V1',
    manifestFile: 'reference-pack-manifest.checkpoint-admissibility.json',
    clauseFile: 'checkpoint-admissibility-core.json',
    expectedBundleId: 'us-checkpoint-admissibility-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'checkpoint-admissibility-allowed-case',
      refusal: 'checkpoint-admissibility-refusal',
      incomplete: 'checkpoint-admissibility-missing-fact',
    },
    buildFacts(bundle) {
      return buildCheckpointFacts(bundle);
    },
    mutateAllowed(facts) {
      facts.action.kind = 'ACCESS_CONTROL';
      facts.action.forceLevel = 'NON_LETHAL';
      facts.action.method = 'CHECKPOINT_CONTROL';
      facts.action.domain = 'LAND';
      facts.authority.delegatedToUnit = true;
      facts.authority.designatedActionAuthorized = true;
    },
    mutateRefusal(facts) {
      facts.authority.designatedActionAuthorized = false;
    },
    mutateIncomplete(facts) {
      delete facts.authority.designatedActionAuthorized;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'SCOPE_VIOLATION',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-CL-CHK-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-CL-CHK-001'],
    },
  },
  {
    packId: 'US_SEARCH_AND_SEIZURE_V1',
    manifestFile: 'reference-pack-manifest.search-and-seizure.json',
    clauseFile: 'search-and-seizure-core.json',
    expectedBundleId: 'us-search-and-seizure-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'search-and-seizure-allowed-case',
      refusal: 'search-and-seizure-refusal',
      incomplete: 'search-and-seizure-missing-fact',
    },
    buildFacts(bundle) {
      return buildSearchFacts(bundle);
    },
    mutateAllowed(facts) {
      facts.action.kind = 'SEARCH';
      facts.action.forceLevel = 'NON_LETHAL';
      facts.action.method = 'SEARCH_SWEEP';
      facts.action.domain = 'LAND';
      facts.authority.delegatedToUnit = true;
      facts.authority.designatedActionAuthorized = true;
    },
    mutateRefusal(facts) {
      facts.authority.designatedActionAuthorized = false;
    },
    mutateIncomplete(facts) {
      delete facts.authority.designatedActionAuthorized;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'SCOPE_VIOLATION',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-CL-SEARCH-SEIZURE-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-CL-SEARCH-SEIZURE-001'],
    },
  },
  {
    packId: 'US_DETENTION_HANDLING_V1',
    manifestFile: 'reference-pack-manifest.detention-handling.json',
    clauseFile: 'detention-handling-core.json',
    expectedBundleId: 'us-detention-handling-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'detention-handling-allowed-case',
      refusal: 'detention-handling-refusal',
      incomplete: 'detention-handling-missing-fact',
    },
    buildFacts(bundle) {
      return buildDetentionFacts(bundle);
    },
    mutateAllowed(facts) {
      facts.action.kind = 'DETENTION';
      facts.action.forceLevel = 'NON_LETHAL';
      facts.action.method = 'CUSTODY_HANDLING';
      facts.action.domain = 'LAND';
      facts.person.status = 'DETAINEE';
      facts.person.detentionStatus = 'IN_CUSTODY';
      facts.authority.delegatedToUnit = true;
      facts.authority.designatedActionAuthorized = true;
    },
    mutateRefusal(facts) {
      facts.person.detentionStatus = 'RELEASED';
    },
    mutateIncomplete(facts) {
      delete facts.person.detentionStatus;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'SCOPE_VIOLATION',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-CL-DETENTION-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-CL-DETENTION-001'],
    },
  },
];

module.exports = {
  PACKS,
  buildCheckpointFacts,
  buildSearchFacts,
  buildDetentionFacts,
};
