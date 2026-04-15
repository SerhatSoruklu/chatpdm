'use strict';

const { buildCommonFacts } = require('./foundation-wave-b.shared');

function buildNlFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.context.coalitionMode = 'NATIONAL';
  facts.authority.nationalCaveat = false;
  return facts;
}

function buildNlAirspaceFacts(bundle) {
  const facts = buildNlFacts(bundle);
  facts.action.kind = 'SURVEILLANCE';
  facts.action.forceLevel = 'NON_LETHAL';
  facts.action.method = 'AIRBORNE_SURVEILLANCE';
  facts.action.domain = 'AIR';
  return facts;
}

function createNationalPack({
  packId,
  manifestFile,
  clauseFile,
  expectedBundleId,
  casePrefix,
  sourceId,
  jurisdiction,
  refusalReasonCode,
  refusalFailedStage,
  incompleteReasonCode,
  incompleteFailedStage,
  mutateAllowed,
  mutateRefusal,
  mutateIncomplete,
  expectedRefusalRuleId,
  expectedIncompleteRuleId,
}) {
  return {
    packId,
    manifestFile,
    clauseFile,
    expectedBundleId,
    expectedClauseCount: 1,
    caseIds: {
      allowed: `${casePrefix}-allowed-case`,
      refusal: `${casePrefix}-refusal`,
      incomplete: `${casePrefix}-missing-fact`,
    },
    buildFacts(bundle) {
      return buildNlFacts(bundle);
    },
    mutateAllowed,
    mutateRefusal,
    mutateIncomplete,
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: refusalReasonCode,
      failedStage: refusalFailedStage,
      failingRuleIds: [expectedRefusalRuleId],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: incompleteReasonCode,
      failedStage: incompleteFailedStage,
      failingRuleIds: expectedIncompleteRuleId ? [expectedIncompleteRuleId] : [],
    },
    sourceId,
    jurisdiction,
  };
}

function createAirspacePack({
  packId,
  manifestFile,
  clauseFile,
  expectedBundleId,
  casePrefix,
  sourceId,
  jurisdiction,
  mutateAllowed,
  mutateRefusal,
  mutateIncomplete,
  expectedRefusalRuleId,
  expectedIncompleteRuleId,
}) {
  return {
    packId,
    manifestFile,
    clauseFile,
    expectedBundleId,
    expectedClauseCount: 1,
    caseIds: {
      allowed: `${casePrefix}-allowed-case`,
      refusal: `${casePrefix}-refusal`,
      incomplete: `${casePrefix}-missing-fact`,
    },
    buildFacts(bundle) {
      return buildNlAirspaceFacts(bundle);
    },
    mutateAllowed,
    mutateRefusal,
    mutateIncomplete,
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'SCOPE_VIOLATION',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: [expectedRefusalRuleId],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: [expectedIncompleteRuleId],
    },
    sourceId,
    jurisdiction,
  };
}

const PACKS = [
  createNationalPack({
    packId: 'NL_NATIONAL_BASE_V1',
    manifestFile: 'reference-pack-manifest.nl-national-base.json',
    clauseFile: 'nl-national-base-core.json',
    expectedBundleId: 'nl-national-base-bundle',
    casePrefix: 'nl-national-base',
    sourceId: 'NL-MOD-NATIONAL-2024',
    jurisdiction: 'NL',
    refusalReasonCode: 'NATIONAL_CAVEAT_BLOCK',
    refusalFailedStage: 'ADMISSIBILITY',
    incompleteReasonCode: 'FACT_PACKET_INVALID',
    incompleteFailedStage: 'ADMISSIBILITY',
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
    expectedRefusalRuleId: 'CR-NL-NAT-001',
  }),
  createNationalPack({
    packId: 'NL_ROE_BASE_V1',
    manifestFile: 'reference-pack-manifest.nl-roe-base.json',
    clauseFile: 'nl-roe-base-core.json',
    expectedBundleId: 'nl-roe-base-bundle',
    casePrefix: 'nl-roe-base',
    sourceId: 'NL-MOD-ROE-2024',
    jurisdiction: 'NL',
    refusalReasonCode: 'AUTHORITY_INVALID',
    refusalFailedStage: 'ADMISSIBILITY',
    incompleteReasonCode: 'MISSING_REQUIRED_FACT',
    incompleteFailedStage: 'ADMISSIBILITY',
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
    expectedRefusalRuleId: 'CR-NL-ROE-001',
    expectedIncompleteRuleId: 'CR-NL-ROE-001',
  }),
  createNationalPack({
    packId: 'NL_COMMAND_AUTHORITY_V1',
    manifestFile: 'reference-pack-manifest.nl-command-authority.json',
    clauseFile: 'nl-command-authority-core.json',
    expectedBundleId: 'nl-command-authority-bundle',
    casePrefix: 'nl-command-authority',
    sourceId: 'NL-MOD-COMMAND-2024',
    jurisdiction: 'NL',
    refusalReasonCode: 'RESERVED_TO_HIGHER_COMMAND',
    refusalFailedStage: 'ADMISSIBILITY',
    incompleteReasonCode: 'FACT_PACKET_INVALID',
    incompleteFailedStage: 'ADMISSIBILITY',
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
    expectedRefusalRuleId: 'CR-NL-CMD-001',
  }),
  createNationalPack({
    packId: 'NL_DELEGATION_CHAIN_V1',
    manifestFile: 'reference-pack-manifest.nl-delegation-chain.json',
    clauseFile: 'nl-delegation-chain-core.json',
    expectedBundleId: 'nl-delegation-chain-bundle',
    casePrefix: 'nl-delegation-chain',
    sourceId: 'NL-MOD-DELEGATION-2024',
    jurisdiction: 'NL',
    refusalReasonCode: 'AUTHORITY_UNRESOLVED',
    refusalFailedStage: 'ADMISSIBILITY',
    incompleteReasonCode: 'MISSING_REQUIRED_FACT',
    incompleteFailedStage: 'ADMISSIBILITY',
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
    expectedRefusalRuleId: 'CR-NL-DEL-001',
    expectedIncompleteRuleId: 'CR-NL-DEL-001',
  }),
  createAirspacePack({
    packId: 'NL_AIRSPACE_CONTROL_V1',
    manifestFile: 'reference-pack-manifest.nl-airspace-control.json',
    clauseFile: 'nl-airspace-control-core.json',
    expectedBundleId: 'nl-airspace-control-bundle',
    casePrefix: 'nl-airspace-control',
    sourceId: 'NL-MOD-ROE-2024',
    jurisdiction: 'NL',
    mutateAllowed(facts) {
      facts.action.kind = 'SURVEILLANCE';
      facts.action.forceLevel = 'NON_LETHAL';
      facts.action.method = 'AIRBORNE_SURVEILLANCE';
      facts.action.domain = 'AIR';
      facts.authority.delegatedToUnit = true;
      facts.authority.designatedRoeActive = true;
    },
    mutateRefusal(facts) {
      facts.action.domain = 'LAND';
    },
    mutateIncomplete(facts) {
      delete facts.authority.designatedRoeActive;
    },
    expectedRefusalRuleId: 'CR-NL-AIR-001',
    expectedIncompleteRuleId: 'CR-NL-AIR-001',
  }),
];

module.exports = {
  PACKS,
  buildNlFacts,
  buildNlAirspaceFacts,
};
