'use strict';

function buildCommonFacts(bundle) {
  return {
    bundleId: bundle.bundleId,
    bundleVersion: bundle.bundleVersion,
    bundleHash: bundle.bundleHash,
    actor: {
      id: 'FOUNDATION-WAVE-01',
      role: 'BRIGADE_COMMANDER',
      authorityLevelId: 'BRIGADE',
    },
    action: {
      kind: 'STRIKE',
      forceLevel: 'DEADLY',
      method: 'AIRSTRIKE',
      domain: 'LAND',
    },
    target: {
      id: 'FOUNDATION-TARGET-01',
      protectedClass: 'MILITARY',
      militaryObjectiveStatus: 'CONFIRMED_TRUE',
      lossOfProtectionStatus: 'NOT_LOST',
      objectType: 'OTHER',
      horsDeCombatStatus: false,
    },
    context: {
      zone: 'FOUNDATION-OPS-ZONE',
      missionType: 'ARMED_CONFLICT',
      operationPhase: 'PLANNING',
      operationalSlice: 'PROTECTED_PERSON_STATE',
      coalitionMode: 'NATIONAL',
      timeWindowStart: '2026-04-13T18:00:00.000Z',
      timeWindowEnd: '2026-04-13T19:00:00.000Z',
    },
    threat: {
      hostileAct: false,
      hostileIntent: false,
      imminence: 'NONE',
      necessity: 'LOW',
    },
    civilianRisk: {
      civilianPresence: false,
      civilianObjectPresence: false,
      estimatedIncidentalHarm: 'LOW',
      feasiblePrecautionsTaken: true,
      expectedMilitaryAdvantage: 'MEDIUM',
      estimatedIncidentalHarmScore: 10,
      expectedMilitaryAdvantageScore: 60,
    },
    authority: {
      reservedToHigherCommand: false,
      nationalCaveat: false,
      delegatedToUnit: true,
      designatedRoeActive: true,
      designatedActionAuthorized: true,
    },
  };
}

const PACKS = [
  {
    packId: 'US_COMMAND_AUTHORITY_V1',
    manifestFile: 'reference-pack-manifest.command-authority.json',
    clauseFile: 'command-authority-core.json',
    expectedBundleId: 'us-command-authority-bundle',
    expectedClauseCount: 2,
    caseIds: {
      allowed: 'command-authority-allowed-case',
      refusal: 'command-authority-refusal',
      incomplete: 'command-authority-missing-fact',
    },
    buildFacts(bundle) {
      return buildCommonFacts(bundle);
    },
    mutateAllowed(facts) {
      facts.authority.reservedToHigherCommand = false;
      facts.authority.nationalCaveat = false;
      facts.authority.delegatedToUnit = true;
    },
    mutateRefusal(facts) {
      facts.authority.reservedToHigherCommand = true;
    },
    mutateIncomplete(facts) {
      delete facts.authority.designatedRoeActive;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'RESERVED_TO_HIGHER_COMMAND',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-CMD-AUTH-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-CMD-AUTH-001'],
    },
  },
  {
    packId: 'US_DELEGATION_CHAIN_V1',
    manifestFile: 'reference-pack-manifest.delegation-chain.json',
    clauseFile: 'delegation-chain-core.json',
    expectedBundleId: 'us-delegation-chain-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'delegation-chain-allowed-case',
      refusal: 'delegation-chain-refusal',
      incomplete: 'delegation-chain-missing-fact',
    },
    buildFacts(bundle) {
      return buildCommonFacts(bundle);
    },
    mutateAllowed(facts) {
      facts.authority.delegatedToUnit = true;
    },
    mutateRefusal(facts) {
      facts.authority.delegatedToUnit = false;
    },
    mutateIncomplete(facts) {
      delete facts.authority.designatedActionAuthorized;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'AUTHORITY_UNRESOLVED',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-DEL-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-DEL-001'],
    },
  },
  {
    packId: 'US_PROTECTED_SITE_V1',
    manifestFile: 'reference-pack-manifest.protected-site.json',
    clauseFile: 'protected-site-core.json',
    expectedBundleId: 'us-protected-site-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'protected-site-allowed-case',
      refusal: 'protected-site-refusal',
      incomplete: 'protected-site-missing-fact',
    },
    buildFacts(bundle) {
      return buildCommonFacts(bundle);
    },
    mutateAllowed(facts) {
      facts.target.objectType = 'OTHER';
      facts.target.lossOfProtectionStatus = 'NOT_LOST';
    },
    mutateRefusal(facts) {
      facts.target.objectType = 'HOSPITAL';
      facts.target.protectedClass = 'MEDICAL';
      facts.target.lossOfProtectionStatus = 'NOT_LOST';
    },
    mutateIncomplete(facts) {
      facts.target.objectType = 'HOSPITAL';
      facts.target.protectedClass = 'MEDICAL';
      delete facts.target.lossOfProtectionStatus;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'PROHIBITED_TARGET',
      failedStage: 'LEGAL_FLOOR',
      failingRuleIds: ['CR-SITE-LF-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'LEGAL_FLOOR',
      failingRuleIds: ['CR-SITE-LF-001'],
    },
  },
  {
    packId: 'US_COALITION_INTEROP_V1',
    manifestFile: 'reference-pack-manifest.coalition-interop.json',
    clauseFile: 'coalition-interop-core.json',
    expectedBundleId: 'us-coalition-interop-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'coalition-interop-allowed-case',
      refusal: 'coalition-interop-refusal',
      incomplete: 'coalition-interop-missing-fact',
    },
    buildFacts(bundle) {
      const facts = buildCommonFacts(bundle);
      facts.context.coalitionMode = 'NATIONAL';
      facts.authority.nationalCaveat = false;
      facts.authority.designatedRoeActive = true;
      return facts;
    },
    mutateAllowed(facts) {
      facts.context.coalitionMode = 'NATIONAL';
      facts.authority.nationalCaveat = false;
      facts.authority.designatedRoeActive = true;
    },
    mutateRefusal(facts) {
      facts.context.coalitionMode = 'COALITION';
      facts.authority.nationalCaveat = true;
      facts.authority.designatedRoeActive = true;
    },
    mutateIncomplete(facts) {
      facts.context.coalitionMode = 'COALITION';
      delete facts.authority.designatedRoeActive;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'COALITION_RULE_CONFLICT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-COAL-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-COAL-001'],
    },
  },
];

module.exports = {
  PACKS,
  buildCommonFacts,
};
