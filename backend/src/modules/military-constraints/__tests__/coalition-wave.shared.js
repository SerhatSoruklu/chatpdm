'use strict';

function buildCoalitionFacts(bundle) {
  return {
    bundleId: bundle.bundleId,
    bundleVersion: bundle.bundleVersion,
    bundleHash: bundle.bundleHash,
    actor: {
      id: 'COALITION-TEAM-01',
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
      id: 'COALITION-TARGET-01',
      protectedClass: 'MILITARY',
      militaryObjectiveStatus: 'CONFIRMED_TRUE',
      lossOfProtectionStatus: 'NOT_LOST',
      objectType: 'OTHER',
      horsDeCombatStatus: false,
    },
    context: {
      zone: 'COALITION-OPS-ZONE',
      missionType: 'ARMED_CONFLICT',
      operationPhase: 'PLANNING',
      coalitionMode: 'COALITION',
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
    packId: 'NATO_INTEROP_BASE_V1',
    manifestFile: 'reference-pack-manifest.nato-interop-base.json',
    clauseFile: 'nato-interop-base-core.json',
    expectedBundleId: 'nato-interop-base-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'nato-interop-base-allowed-case',
      refusal: 'nato-interop-base-refusal',
      incomplete: 'nato-interop-base-missing-fact',
    },
    buildFacts(bundle) {
      const facts = buildCoalitionFacts(bundle);
      facts.context.coalitionMode = 'COALITION';
      facts.authority.nationalCaveat = false;
      return facts;
    },
    mutateAllowed(facts) {
      facts.context.coalitionMode = 'COALITION';
      facts.authority.nationalCaveat = false;
    },
    mutateRefusal(facts) {
      facts.context.coalitionMode = 'COALITION';
      facts.authority.nationalCaveat = true;
    },
    mutateIncomplete(facts) {
      facts.context.coalitionMode = 'COALITION';
      delete facts.authority.nationalCaveat;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'COALITION_RULE_CONFLICT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-NATO-COAL-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'FACT_PACKET_INVALID',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: [],
    },
  },
  {
    packId: 'ALLIED_AUTHORITY_MERGE_V1',
    manifestFile: 'reference-pack-manifest.allied-authority-merge.json',
    clauseFile: 'allied-authority-merge-core.json',
    expectedBundleId: 'allied-authority-merge-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'allied-authority-merge-allowed-case',
      refusal: 'allied-authority-merge-refusal',
      incomplete: 'allied-authority-merge-missing-fact',
    },
    buildFacts(bundle) {
      const facts = buildCoalitionFacts(bundle);
      facts.context.coalitionMode = 'COALITION';
      facts.authority.designatedActionAuthorized = true;
      return facts;
    },
    mutateAllowed(facts) {
      facts.context.coalitionMode = 'COALITION';
      facts.authority.designatedActionAuthorized = true;
    },
    mutateRefusal(facts) {
      facts.context.coalitionMode = 'COALITION';
      facts.authority.designatedActionAuthorized = false;
    },
    mutateIncomplete(facts) {
      facts.context.coalitionMode = 'COALITION';
      delete facts.authority.designatedActionAuthorized;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'COALITION_RULE_CONFLICT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-NATO-ALLIED-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-NATO-ALLIED-001'],
    },
  },
  {
    packId: 'NATO_ROE_COMPAT_V1',
    manifestFile: 'reference-pack-manifest.nato-roe-compat.json',
    clauseFile: 'nato-roe-compat-core.json',
    expectedBundleId: 'nato-roe-compat-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'nato-roe-compat-allowed-case',
      refusal: 'nato-roe-compat-refusal',
      incomplete: 'nato-roe-compat-missing-fact',
    },
    buildFacts(bundle) {
      const facts = buildCoalitionFacts(bundle);
      facts.context.coalitionMode = 'COALITION';
      facts.authority.designatedRoeActive = true;
      return facts;
    },
    mutateAllowed(facts) {
      facts.context.coalitionMode = 'COALITION';
      facts.authority.designatedRoeActive = true;
    },
    mutateRefusal(facts) {
      facts.context.coalitionMode = 'COALITION';
      facts.authority.designatedRoeActive = false;
    },
    mutateIncomplete(facts) {
      facts.context.coalitionMode = 'COALITION';
      delete facts.authority.designatedRoeActive;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'COALITION_RULE_CONFLICT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-NATO-ROE-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-NATO-ROE-001'],
    },
  },
];

module.exports = {
  PACKS,
  buildCoalitionFacts,
};
