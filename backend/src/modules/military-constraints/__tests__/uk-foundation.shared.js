'use strict';

const { buildCommonFacts } = require('./foundation-wave-b.shared');

function buildUkFacts(bundle) {
  return buildCommonFacts(bundle);
}

const PACKS = [
  {
    packId: 'UK_NATIONAL_BASE_V1',
    manifestFile: 'reference-pack-manifest.uk-national-base.json',
    clauseFile: 'uk-national-base-core.json',
    expectedBundleId: 'uk-national-base-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'uk-national-base-allowed-case',
      refusal: 'uk-national-base-refusal',
      incomplete: 'uk-national-base-missing-fact',
    },
    buildFacts(bundle) {
      return buildUkFacts(bundle);
    },
    mutateAllowed(facts) {
      facts.context.coalitionMode = 'NATIONAL';
      facts.authority.nationalCaveat = false;
    },
    mutateRefusal(facts) {
      facts.context.coalitionMode = 'COALITION';
      facts.authority.nationalCaveat = true;
    },
    mutateIncomplete(facts) {
      delete facts.context.coalitionMode;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'NATIONAL_CAVEAT_BLOCK',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-UK-NAT-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'FACT_PACKET_INVALID',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: [],
    },
  },
  {
    packId: 'UK_ROE_BASE_V1',
    manifestFile: 'reference-pack-manifest.uk-roe-base.json',
    clauseFile: 'uk-roe-base-core.json',
    expectedBundleId: 'uk-roe-base-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'uk-roe-base-allowed-case',
      refusal: 'uk-roe-base-refusal',
      incomplete: 'uk-roe-base-missing-fact',
    },
    buildFacts(bundle) {
      return buildUkFacts(bundle);
    },
    mutateAllowed(facts) {
      facts.authority.designatedRoeActive = true;
      facts.authority.designatedActionAuthorized = true;
    },
    mutateRefusal(facts) {
      facts.authority.designatedRoeActive = true;
      facts.authority.designatedActionAuthorized = false;
    },
    mutateIncomplete(facts) {
      delete facts.authority.designatedRoeActive;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'AUTHORITY_INVALID',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-UK-ROE-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-UK-ROE-001'],
    },
  },
  {
    packId: 'UK_COMMAND_AUTHORITY_V1',
    manifestFile: 'reference-pack-manifest.uk-command-authority.json',
    clauseFile: 'uk-command-authority-core.json',
    expectedBundleId: 'uk-command-authority-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'uk-command-authority-allowed-case',
      refusal: 'uk-command-authority-refusal',
      incomplete: 'uk-command-authority-missing-fact',
    },
    buildFacts(bundle) {
      return buildUkFacts(bundle);
    },
    mutateAllowed(facts) {
      facts.actor.authorityLevelId = 'BRIGADE';
      facts.authority.reservedToHigherCommand = false;
    },
    mutateRefusal(facts) {
      facts.actor.authorityLevelId = 'BRIGADE';
      facts.authority.reservedToHigherCommand = true;
    },
    mutateIncomplete(facts) {
      delete facts.actor.authorityLevelId;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'RESERVED_TO_HIGHER_COMMAND',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-UK-CMD-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'FACT_PACKET_INVALID',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: [],
    },
  },
  {
    packId: 'UK_DELEGATION_CHAIN_V1',
    manifestFile: 'reference-pack-manifest.uk-delegation-chain.json',
    clauseFile: 'uk-delegation-chain-core.json',
    expectedBundleId: 'uk-delegation-chain-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'uk-delegation-chain-allowed-case',
      refusal: 'uk-delegation-chain-refusal',
      incomplete: 'uk-delegation-chain-missing-fact',
    },
    buildFacts(bundle) {
      return buildUkFacts(bundle);
    },
    mutateAllowed(facts) {
      facts.authority.delegatedToUnit = true;
      facts.authority.designatedActionAuthorized = true;
    },
    mutateRefusal(facts) {
      facts.authority.delegatedToUnit = false;
      facts.authority.designatedActionAuthorized = true;
    },
    mutateIncomplete(facts) {
      delete facts.authority.designatedActionAuthorized;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'AUTHORITY_UNRESOLVED',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-UK-DEL-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-UK-DEL-001'],
    },
  },
];

module.exports = {
  PACKS,
  buildUkFacts,
};
