'use strict';

const { buildCommonFacts } = require('./foundation-wave-b.shared');

function buildTrFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.context.coalitionMode = 'NATIONAL';
  facts.authority.nationalCaveat = false;
  return facts;
}

function buildTrAirspaceFacts(bundle) {
  const facts = buildTrFacts(bundle);
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
      return buildTrFacts(bundle);
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
      return buildTrAirspaceFacts(bundle);
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
    packId: 'TR_NATIONAL_BASE_V1',
    manifestFile: 'reference-pack-manifest.tr-national-base.json',
    clauseFile: 'tr-national-base-core.json',
    expectedBundleId: 'tr-national-base-bundle',
    casePrefix: 'tr-national-base',
    sourceId: 'TR-MOD-NATIONAL-2024',
    jurisdiction: 'TR',
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
    expectedRefusalRuleId: 'CR-TR-NAT-001',
  }),
  createNationalPack({
    packId: 'TR_ROE_BASE_V1',
    manifestFile: 'reference-pack-manifest.tr-roe-base.json',
    clauseFile: 'tr-roe-base-core.json',
    expectedBundleId: 'tr-roe-base-bundle',
    casePrefix: 'tr-roe-base',
    sourceId: 'TR-MOD-ROE-2024',
    jurisdiction: 'TR',
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
    expectedRefusalRuleId: 'CR-TR-ROE-001',
    expectedIncompleteRuleId: 'CR-TR-ROE-001',
  }),
  createNationalPack({
    packId: 'TR_COMMAND_AUTHORITY_V1',
    manifestFile: 'reference-pack-manifest.tr-command-authority.json',
    clauseFile: 'tr-command-authority-core.json',
    expectedBundleId: 'tr-command-authority-bundle',
    casePrefix: 'tr-command-authority',
    sourceId: 'TR-MOD-COMMAND-2024',
    jurisdiction: 'TR',
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
    expectedRefusalRuleId: 'CR-TR-CMD-001',
  }),
  createNationalPack({
    packId: 'TR_DELEGATION_CHAIN_V1',
    manifestFile: 'reference-pack-manifest.tr-delegation-chain.json',
    clauseFile: 'tr-delegation-chain-core.json',
    expectedBundleId: 'tr-delegation-chain-bundle',
    casePrefix: 'tr-delegation-chain',
    sourceId: 'TR-MOD-DELEGATION-2024',
    jurisdiction: 'TR',
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
    expectedRefusalRuleId: 'CR-TR-DEL-001',
    expectedIncompleteRuleId: 'CR-TR-DEL-001',
  }),
  createAirspacePack({
    packId: 'TR_AIRSPACE_CONTROL_V1',
    manifestFile: 'reference-pack-manifest.tr-airspace-control.json',
    clauseFile: 'tr-airspace-control-core.json',
    expectedBundleId: 'tr-airspace-control-bundle',
    casePrefix: 'tr-airspace-control',
    sourceId: 'TR-MOD-ROE-2024',
    jurisdiction: 'TR',
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
    expectedRefusalRuleId: 'CR-TR-AIR-001',
    expectedIncompleteRuleId: 'CR-TR-AIR-001',
  }),
];

module.exports = {
  PACKS,
  buildTrFacts,
  buildTrAirspaceFacts,
};
