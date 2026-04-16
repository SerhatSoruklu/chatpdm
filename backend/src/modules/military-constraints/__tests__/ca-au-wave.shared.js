'use strict';

const { buildCommonFacts } = require('./foundation-wave-b.shared');

function buildNationalFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.context.coalitionMode = 'NATIONAL';
  facts.authority.nationalCaveat = false;
  return facts;
}

function buildAirspaceFacts(bundle) {
  const facts = buildNationalFacts(bundle);
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
  allowedReasonCode,
  allowedFailedStage,
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
      return buildNationalFacts(bundle);
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
    allowedReasonCode,
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
      return buildAirspaceFacts(bundle);
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
    packId: 'CA_NATIONAL_BASE_V1',
    manifestFile: 'reference-pack-manifest.ca-national-base.json',
    clauseFile: 'ca-national-base-core.json',
    expectedBundleId: 'ca-national-base-bundle',
    casePrefix: 'ca-national-base',
    sourceId: 'CA-DND-NATIONAL-2024',
    jurisdiction: 'CA',
    allowedReasonCode: null,
    allowedFailedStage: null,
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
    expectedRefusalRuleId: 'CR-CA-NAT-001',
  }),
  createNationalPack({
    packId: 'CA_ROE_BASE_V1',
    manifestFile: 'reference-pack-manifest.ca-roe-base.json',
    clauseFile: 'ca-roe-base-core.json',
    expectedBundleId: 'ca-roe-base-bundle',
    casePrefix: 'ca-roe-base',
    sourceId: 'CA-DND-ROE-2024',
    jurisdiction: 'CA',
    allowedReasonCode: null,
    allowedFailedStage: null,
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
    expectedRefusalRuleId: 'CR-CA-ROE-001',
    expectedIncompleteRuleId: 'CR-CA-ROE-001',
  }),
  createNationalPack({
    packId: 'CA_COMMAND_AUTHORITY_V1',
    manifestFile: 'reference-pack-manifest.ca-command-authority.json',
    clauseFile: 'ca-command-authority-core.json',
    expectedBundleId: 'ca-command-authority-bundle',
    casePrefix: 'ca-command-authority',
    sourceId: 'CA-DND-COMMAND-2024',
    jurisdiction: 'CA',
    allowedReasonCode: null,
    allowedFailedStage: null,
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
    expectedRefusalRuleId: 'CR-CA-CMD-001',
  }),
  createNationalPack({
    packId: 'CA_DELEGATION_CHAIN_V1',
    manifestFile: 'reference-pack-manifest.ca-delegation-chain.json',
    clauseFile: 'ca-delegation-chain-core.json',
    expectedBundleId: 'ca-delegation-chain-bundle',
    casePrefix: 'ca-delegation-chain',
    sourceId: 'CA-DND-DELEGATION-2024',
    jurisdiction: 'CA',
    allowedReasonCode: null,
    allowedFailedStage: null,
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
    expectedRefusalRuleId: 'CR-CA-DEL-001',
    expectedIncompleteRuleId: 'CR-CA-DEL-001',
  }),
  createAirspacePack({
    packId: 'CA_AIRSPACE_CONTROL_V1',
    manifestFile: 'reference-pack-manifest.ca-airspace-control.json',
    clauseFile: 'ca-airspace-control-core.json',
    expectedBundleId: 'ca-airspace-control-bundle',
    casePrefix: 'ca-airspace-control',
    sourceId: 'CA-DND-ROE-2024',
    jurisdiction: 'CA',
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
    expectedRefusalRuleId: 'CR-CA-AIR-001',
    expectedIncompleteRuleId: 'CR-CA-AIR-001',
  }),
  createNationalPack({
    packId: 'AU_NATIONAL_BASE_V1',
    manifestFile: 'reference-pack-manifest.au-national-base.json',
    clauseFile: 'au-national-base-core.json',
    expectedBundleId: 'au-national-base-bundle',
    casePrefix: 'au-national-base',
    sourceId: 'AU-ADF-NATIONAL-2024',
    jurisdiction: 'AU',
    allowedReasonCode: null,
    allowedFailedStage: null,
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
    expectedRefusalRuleId: 'CR-AU-NAT-001',
  }),
  createNationalPack({
    packId: 'AU_ROE_BASE_V1',
    manifestFile: 'reference-pack-manifest.au-roe-base.json',
    clauseFile: 'au-roe-base-core.json',
    expectedBundleId: 'au-roe-base-bundle',
    casePrefix: 'au-roe-base',
    sourceId: 'AU-ADF-ROE-2024',
    jurisdiction: 'AU',
    allowedReasonCode: null,
    allowedFailedStage: null,
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
    expectedRefusalRuleId: 'CR-AU-ROE-001',
    expectedIncompleteRuleId: 'CR-AU-ROE-001',
  }),
  createNationalPack({
    packId: 'AU_COMMAND_AUTHORITY_V1',
    manifestFile: 'reference-pack-manifest.au-command-authority.json',
    clauseFile: 'au-command-authority-core.json',
    expectedBundleId: 'au-command-authority-bundle',
    casePrefix: 'au-command-authority',
    sourceId: 'AU-ADF-COMMAND-2024',
    jurisdiction: 'AU',
    allowedReasonCode: null,
    allowedFailedStage: null,
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
    expectedRefusalRuleId: 'CR-AU-CMD-001',
  }),
  createNationalPack({
    packId: 'AU_DELEGATION_CHAIN_V1',
    manifestFile: 'reference-pack-manifest.au-delegation-chain.json',
    clauseFile: 'au-delegation-chain-core.json',
    expectedBundleId: 'au-delegation-chain-bundle',
    casePrefix: 'au-delegation-chain',
    sourceId: 'AU-ADF-DELEGATION-2024',
    jurisdiction: 'AU',
    allowedReasonCode: null,
    allowedFailedStage: null,
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
    expectedRefusalRuleId: 'CR-AU-DEL-001',
    expectedIncompleteRuleId: 'CR-AU-DEL-001',
  }),
  createAirspacePack({
    packId: 'AU_AIRSPACE_CONTROL_V1',
    manifestFile: 'reference-pack-manifest.au-airspace-control.json',
    clauseFile: 'au-airspace-control-core.json',
    expectedBundleId: 'au-airspace-control-bundle',
    casePrefix: 'au-airspace-control',
    sourceId: 'AU-ADF-ROE-2024',
    jurisdiction: 'AU',
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
    expectedRefusalRuleId: 'CR-AU-AIR-001',
    expectedIncompleteRuleId: 'CR-AU-AIR-001',
  }),
];

module.exports = {
  PACKS,
  buildNationalFacts,
  buildAirspaceFacts,
};
