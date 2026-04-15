'use strict';

const { buildCommonFacts } = require('./foundation-wave-b.shared');

function buildNoFlyZoneFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'SURVEILLANCE';
  facts.action.forceLevel = 'NON_LETHAL';
  facts.action.method = 'AIRSPACE_RESTRICTION_CHECK';
  facts.action.domain = 'AIR';
  facts.context.operationPhase = 'NO_FLY_ZONE';
  facts.context.zone = 'AIRSPACE-CTRL-ZONE';
  facts.authority.delegatedToUnit = true;
  facts.authority.designatedRoeActive = true;
  return facts;
}

function buildTargetApprovalFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'STRIKE';
  facts.action.forceLevel = 'LETHAL';
  facts.action.method = 'AIR_TARGET_APPROVAL';
  facts.action.domain = 'AIR';
  facts.context.operationPhase = 'TARGET_APPROVAL';
  facts.context.zone = 'TARGET-APPROVAL-ZONE';
  facts.authority.delegatedToUnit = true;
  facts.authority.designatedRoeActive = true;
  facts.authority.designatedActionAuthorized = true;
  facts.authority.reservedToHigherCommand = false;
  return facts;
}

function buildCollateralAssessmentFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'STRIKE';
  facts.action.forceLevel = 'LETHAL';
  facts.action.method = 'COLLATERAL_ASSESSMENT';
  facts.action.domain = 'LAND';
  facts.context.operationPhase = 'COLLATERAL_ASSESSMENT';
  facts.context.zone = 'COLLATERAL-ASSESSMENT-ZONE';
  facts.target.protectedClass = 'CIVILIAN_OBJECT';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_FALSE';
  facts.target.lossOfProtectionStatus = 'NOT_LOST';
  facts.civilianRisk.estimatedIncidentalHarmScore = 20;
  facts.civilianRisk.expectedMilitaryAdvantageScore = 80;
  facts.civilianRisk.feasiblePrecautionsTaken = true;
  facts.authority.delegatedToUnit = true;
  facts.authority.designatedRoeActive = true;
  facts.authority.designatedActionAuthorized = true;
  return facts;
}

const PACKS = [
  {
    packId: 'US_NO_FLY_ZONE_V1',
    manifestFile: 'reference-pack-manifest.no-fly-zone.json',
    clauseFile: 'no-fly-zone-core.json',
    expectedBundleId: 'us-no-fly-zone-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'no-fly-zone-allowed-case',
      refusal: 'no-fly-zone-refusal',
      incomplete: 'no-fly-zone-missing-fact',
    },
    buildFacts(bundle) {
      return buildNoFlyZoneFacts(bundle);
    },
    mutateRefusal(facts) {
      facts.context.zone = 'US-NO-FLY-ZONE-ALPHA';
    },
    mutateIncomplete(facts) {
      delete facts.authority.designatedRoeActive;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'SCOPE_VIOLATION',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-CL-NFZ-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-CL-NFZ-001'],
    },
  },
  {
    packId: 'US_TARGET_APPROVAL_V1',
    manifestFile: 'reference-pack-manifest.target-approval.json',
    clauseFile: 'target-approval-core.json',
    expectedBundleId: 'us-target-approval-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'target-approval-allowed-case',
      refusal: 'target-approval-refusal',
      incomplete: 'target-approval-missing-fact',
    },
    buildFacts(bundle) {
      return buildTargetApprovalFacts(bundle);
    },
    mutateRefusal(facts) {
      facts.authority.designatedActionAuthorized = false;
    },
    mutateIncomplete(facts) {
      delete facts.authority.designatedActionAuthorized;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'AUTHORITY_INVALID',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-CL-TAP-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-CL-TAP-001'],
    },
  },
  {
    packId: 'US_COLLATERAL_DAMAGE_ASSESSMENT_V1',
    manifestFile: 'reference-pack-manifest.collateral-damage-assessment.json',
    clauseFile: 'collateral-damage-assessment-core.json',
    expectedBundleId: 'us-collateral-damage-assessment-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'collateral-damage-assessment-allowed-case',
      refusal: 'collateral-damage-assessment-refusal',
      incomplete: 'collateral-damage-assessment-missing-fact',
    },
    buildFacts(bundle) {
      return buildCollateralAssessmentFacts(bundle);
    },
    mutateRefusal(facts) {
      facts.civilianRisk.estimatedIncidentalHarmScore = 95;
      facts.civilianRisk.expectedMilitaryAdvantageScore = 10;
      facts.civilianRisk.feasiblePrecautionsTaken = false;
    },
    mutateIncomplete(facts) {
      delete facts.target.protectedClass;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'EXCESSIVE_INCIDENTAL_HARM_RISK',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-CL-CDA-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-CL-CDA-001'],
    },
  },
];

module.exports = {
  PACKS,
  buildCollateralAssessmentFacts,
  buildNoFlyZoneFacts,
  buildTargetApprovalFacts,
};
