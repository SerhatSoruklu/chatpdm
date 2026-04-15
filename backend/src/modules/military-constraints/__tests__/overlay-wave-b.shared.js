'use strict';

const { buildCommonFacts } = require('./foundation-wave-b.shared');

function buildHospitalProtectionFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'STRIKE';
  facts.action.forceLevel = 'LETHAL';
  facts.action.method = 'HOSPITAL_PROTECTION';
  facts.action.domain = 'LAND';
  facts.target.id = 'HOSPITAL-01';
  facts.target.objectType = 'HOSPITAL';
  facts.target.protectedClass = 'MEDICAL';
  facts.target.lossOfProtectionStatus = 'NOT_LOST';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_FALSE';
  facts.context.zone = 'HOSPITAL-PROTECTION-ZONE';
  facts.context.operationPhase = 'HOSPITAL_PROTECTION';
  facts.authority.designatedActionAuthorized = true;
  return facts;
}

function buildSchoolZoneRestrictionFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'ENGAGE';
  facts.action.forceLevel = 'LETHAL';
  facts.action.method = 'SCHOOL_ZONE_SECURITY';
  facts.action.domain = 'LAND';
  facts.target.id = 'SCHOOL-01';
  facts.target.objectType = 'SCHOOL';
  facts.target.protectedClass = 'CIVILIAN_OBJECT';
  facts.target.lossOfProtectionStatus = 'NOT_LOST';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_FALSE';
  facts.context.zone = 'SCHOOL-ZONE-RESTRICTION-ZONE';
  facts.context.operationPhase = 'SCHOOL_ZONE_RESTRICTION';
  facts.authority.designatedActionAuthorized = true;
  return facts;
}

function buildReligiousSiteProtectionFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'STRIKE';
  facts.action.forceLevel = 'LETHAL';
  facts.action.method = 'RELIGIOUS_SITE_SECURITY';
  facts.action.domain = 'LAND';
  facts.target.id = 'RELIGIOUS-SITE-01';
  facts.target.objectType = 'OTHER';
  facts.target.protectedClass = 'CIVILIAN_OBJECT';
  facts.target.lossOfProtectionStatus = 'NOT_LOST';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_FALSE';
  facts.context.zone = 'RELIGIOUS-SITE-ZONE';
  facts.context.operationPhase = 'RELIGIOUS_SITE_PROTECTION';
  facts.authority.designatedActionAuthorized = true;
  return facts;
}

function buildCulturalPropertyProtectionFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'STRIKE';
  facts.action.forceLevel = 'LETHAL';
  facts.action.method = 'CULTURAL_PROPERTY_SECURITY';
  facts.action.domain = 'LAND';
  facts.target.id = 'CULTURAL-PROPERTY-01';
  facts.target.objectType = 'OTHER';
  facts.target.protectedClass = 'CIVILIAN_OBJECT';
  facts.target.lossOfProtectionStatus = 'NOT_LOST';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_FALSE';
  facts.context.zone = 'CULTURAL-PROPERTY-ZONE';
  facts.context.operationPhase = 'CULTURAL_PROPERTY_PROTECTION';
  facts.authority.designatedActionAuthorized = true;
  return facts;
}

function buildAidDeliverySecurityFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'ACCESS_CONTROL';
  facts.action.forceLevel = 'NON_LETHAL';
  facts.action.method = 'AID_DELIVERY_SECURITY';
  facts.action.domain = 'LAND';
  facts.target.id = 'AID-DELIVERY-01';
  facts.target.objectType = 'OTHER';
  facts.target.protectedClass = 'CIVILIAN_OBJECT';
  facts.target.lossOfProtectionStatus = 'NOT_LOST';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_FALSE';
  facts.context.zone = 'AID-DELIVERY-ZONE';
  facts.context.operationPhase = 'AID_DELIVERY_SECURITY';
  facts.authority.designatedRoeActive = true;
  return facts;
}

function buildEvacuationRouteFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'ACCESS_CONTROL';
  facts.action.forceLevel = 'NON_LETHAL';
  facts.action.method = 'EVACUATION_ROUTE';
  facts.action.domain = 'LAND';
  facts.target.id = 'EVAC-01';
  facts.target.objectType = 'OTHER';
  facts.target.protectedClass = 'CIVILIAN_OBJECT';
  facts.target.lossOfProtectionStatus = 'NOT_LOST';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_FALSE';
  facts.context.zone = 'EVAC-ROUTE-ZONE';
  facts.context.operationPhase = 'EVACUATION_ROUTE';
  facts.authority.designatedActionAuthorized = true;
  return facts;
}

function buildNightOperationFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'SURVEILLANCE';
  facts.action.forceLevel = 'NON_LETHAL';
  facts.action.method = 'NIGHT_OPS';
  facts.action.domain = 'AIR';
  facts.target.id = 'NIGHT-01';
  facts.target.objectType = 'OTHER';
  facts.target.protectedClass = 'MILITARY';
  facts.target.lossOfProtectionStatus = 'NOT_LOST';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_TRUE';
  facts.context.zone = 'NIGHT-OPERATION-ZONE';
  facts.context.operationPhase = 'NIGHT_OPERATION';
  facts.authority.designatedRoeActive = true;
  return facts;
}

function buildWeatherLimitationFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'SURVEILLANCE';
  facts.action.forceLevel = 'NON_LETHAL';
  facts.action.method = 'WEATHER_LIMITATION';
  facts.action.domain = 'AIR';
  facts.target.id = 'WEATHER-01';
  facts.target.objectType = 'OTHER';
  facts.target.protectedClass = 'MILITARY';
  facts.target.lossOfProtectionStatus = 'NOT_LOST';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_TRUE';
  facts.context.zone = 'WEATHER-LIMITED-ZONE';
  facts.context.operationPhase = 'WEATHER_LIMITATION';
  facts.civilianRisk.feasiblePrecautionsTaken = true;
  return facts;
}

function buildSignalInterferenceFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'SURVEILLANCE';
  facts.action.forceLevel = 'NON_LETHAL';
  facts.action.method = 'SIGNAL_INTERFERENCE';
  facts.action.domain = 'CYBER';
  facts.target.id = 'SIGNAL-01';
  facts.target.objectType = 'OTHER';
  facts.target.protectedClass = 'MILITARY';
  facts.target.lossOfProtectionStatus = 'NOT_LOST';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_TRUE';
  facts.context.zone = 'SIGNAL-INTERFERENCE-ZONE';
  facts.context.operationPhase = 'SIGNAL_INTERFERENCE';
  facts.authority.designatedRoeActive = true;
  return facts;
}

function buildIsrRetentionFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'SURVEILLANCE';
  facts.action.forceLevel = 'NON_LETHAL';
  facts.action.method = 'ISR_RETENTION';
  facts.action.domain = 'AIR';
  facts.target.id = 'ISR-01';
  facts.target.objectType = 'OTHER';
  facts.target.protectedClass = 'MILITARY';
  facts.target.lossOfProtectionStatus = 'NOT_LOST';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_TRUE';
  facts.context.zone = 'ISR-RETENTION-ZONE';
  facts.context.operationPhase = 'ISR_RETENTION';
  facts.context.coalitionMode = 'COALITION';
  facts.authority.designatedRoeActive = true;
  return facts;
}

function buildWeaponStatusFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'STRIKE';
  facts.action.forceLevel = 'LETHAL';
  facts.action.method = 'WEAPON_STATUS';
  facts.action.domain = 'LAND';
  facts.target.id = 'WEAPON-01';
  facts.target.objectType = 'OTHER';
  facts.target.protectedClass = 'MILITARY';
  facts.target.lossOfProtectionStatus = 'NOT_LOST';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_TRUE';
  facts.context.zone = 'WEAPON-STATUS-ZONE';
  facts.context.operationPhase = 'WEAPON_STATUS';
  facts.authority.designatedActionAuthorized = true;
  return facts;
}

function buildAlliedRoeMergeFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'ACCESS_CONTROL';
  facts.action.forceLevel = 'NON_LETHAL';
  facts.action.method = 'ALLIED_ROE_MERGE';
  facts.action.domain = 'LAND';
  facts.target.id = 'ALLIED-01';
  facts.target.objectType = 'OTHER';
  facts.target.protectedClass = 'MILITARY';
  facts.target.lossOfProtectionStatus = 'NOT_LOST';
  facts.target.militaryObjectiveStatus = 'CONFIRMED_TRUE';
  facts.context.zone = 'ALLIED-ROE-MERGE-ZONE';
  facts.context.operationPhase = 'ALLIED_ROE_MERGE';
  facts.context.coalitionMode = 'COALITION';
  facts.authority.designatedRoeActive = true;
  facts.authority.designatedActionAuthorized = true;
  return facts;
}

const PACKS = [
  {
    packId: 'US_HOSPITAL_PROTECTION_V1',
    manifestFile: 'reference-pack-manifest.hospital-protection.json',
    clauseFile: 'hospital-protection-core.json',
    expectedBundleId: 'us-hospital-protection-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'hospital-protection-allowed-case',
      refusal: 'hospital-protection-refusal',
      incomplete: 'hospital-protection-missing-fact',
    },
    buildFacts(bundle) {
      return buildHospitalProtectionFacts(bundle);
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
      failingRuleIds: ['CR-HOSP-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-HOSP-001'],
    },
  },
  {
    packId: 'US_SCHOOL_ZONE_RESTRICTION_V1',
    manifestFile: 'reference-pack-manifest.school-zone-restriction.json',
    clauseFile: 'school-zone-restriction-core.json',
    expectedBundleId: 'us-school-zone-restriction-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'school-zone-restriction-allowed-case',
      refusal: 'school-zone-restriction-refusal',
      incomplete: 'school-zone-restriction-missing-fact',
    },
    buildFacts(bundle) {
      return buildSchoolZoneRestrictionFacts(bundle);
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
      failingRuleIds: ['CR-SZR-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-SZR-001'],
    },
  },
  {
    packId: 'US_RELIGIOUS_SITE_PROTECTION_V1',
    manifestFile: 'reference-pack-manifest.religious-site-protection.json',
    clauseFile: 'religious-site-protection-core.json',
    expectedBundleId: 'us-religious-site-protection-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'religious-site-protection-allowed-case',
      refusal: 'religious-site-protection-refusal',
      incomplete: 'religious-site-protection-missing-fact',
    },
    buildFacts(bundle) {
      return buildReligiousSiteProtectionFacts(bundle);
    },
    mutateRefusal(facts) {
      facts.authority.designatedActionAuthorized = false;
    },
    mutateIncomplete(facts) {
      delete facts.authority.designatedActionAuthorized;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'PROHIBITED_TARGET',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-RSP-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-RSP-001'],
    },
  },
  {
    packId: 'US_CULTURAL_PROPERTY_PROTECTION_V1',
    manifestFile: 'reference-pack-manifest.cultural-property-protection.json',
    clauseFile: 'cultural-property-protection-core.json',
    expectedBundleId: 'us-cultural-property-protection-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'cultural-property-protection-allowed-case',
      refusal: 'cultural-property-protection-refusal',
      incomplete: 'cultural-property-protection-missing-fact',
    },
    buildFacts(bundle) {
      return buildCulturalPropertyProtectionFacts(bundle);
    },
    mutateRefusal(facts) {
      facts.authority.designatedActionAuthorized = false;
    },
    mutateIncomplete(facts) {
      delete facts.authority.designatedActionAuthorized;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'PROHIBITED_TARGET',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-CPP-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-CPP-001'],
    },
  },
  {
    packId: 'US_AID_DELIVERY_SECURITY_V1',
    manifestFile: 'reference-pack-manifest.aid-delivery-security.json',
    clauseFile: 'aid-delivery-security-core.json',
    expectedBundleId: 'us-aid-delivery-security-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'aid-delivery-security-allowed-case',
      refusal: 'aid-delivery-security-refusal',
      incomplete: 'aid-delivery-security-missing-fact',
    },
    buildFacts(bundle) {
      return buildAidDeliverySecurityFacts(bundle);
    },
    mutateRefusal(facts) {
      facts.authority.designatedRoeActive = false;
    },
    mutateIncomplete(facts) {
      delete facts.authority.designatedRoeActive;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'AUTHORITY_INVALID',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-ADS-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-ADS-001'],
    },
  },
  {
    packId: 'US_EVACUATION_ROUTE_V1',
    manifestFile: 'reference-pack-manifest.evacuation-route.json',
    clauseFile: 'evacuation-route-core.json',
    expectedBundleId: 'us-evacuation-route-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'evacuation-route-allowed-case',
      refusal: 'evacuation-route-refusal',
      incomplete: 'evacuation-route-missing-fact',
    },
    buildFacts(bundle) {
      return buildEvacuationRouteFacts(bundle);
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
      failingRuleIds: ['CR-EVR-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-EVR-001'],
    },
  },
  {
    packId: 'US_NIGHT_OPERATION_V1',
    manifestFile: 'reference-pack-manifest.night-operation.json',
    clauseFile: 'night-operation-core.json',
    expectedBundleId: 'us-night-operation-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'night-operation-allowed-case',
      refusal: 'night-operation-refusal',
      incomplete: 'night-operation-missing-fact',
    },
    buildFacts(bundle) {
      return buildNightOperationFacts(bundle);
    },
    mutateRefusal(facts) {
      facts.authority.designatedRoeActive = false;
    },
    mutateIncomplete(facts) {
      delete facts.authority.designatedRoeActive;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'AUTHORITY_INVALID',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-NIGHT-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-NIGHT-001'],
    },
  },
  {
    packId: 'US_WEATHER_LIMITATION_V1',
    manifestFile: 'reference-pack-manifest.weather-limitation.json',
    clauseFile: 'weather-limitation-core.json',
    expectedBundleId: 'us-weather-limitation-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'weather-limitation-allowed-case',
      refusal: 'weather-limitation-refusal',
      incomplete: 'weather-limitation-missing-fact',
    },
    buildFacts(bundle) {
      return buildWeatherLimitationFacts(bundle);
    },
    mutateRefusal(facts) {
      facts.civilianRisk.feasiblePrecautionsTaken = false;
    },
    mutateIncomplete(facts) {
      delete facts.civilianRisk.feasiblePrecautionsTaken;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'SCOPE_VIOLATION',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-WTH-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'FACT_PACKET_INVALID',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: [],
    },
  },
  {
    packId: 'US_SIGNAL_INTERFERENCE_V1',
    manifestFile: 'reference-pack-manifest.signal-interference.json',
    clauseFile: 'signal-interference-core.json',
    expectedBundleId: 'us-signal-interference-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'signal-interference-allowed-case',
      refusal: 'signal-interference-refusal',
      incomplete: 'signal-interference-missing-fact',
    },
    buildFacts(bundle) {
      return buildSignalInterferenceFacts(bundle);
    },
    mutateRefusal(facts) {
      facts.authority.designatedRoeActive = false;
    },
    mutateIncomplete(facts) {
      delete facts.authority.designatedRoeActive;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'SCOPE_VIOLATION',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-SIG-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-SIG-001'],
    },
  },
  {
    packId: 'US_ISR_RETENTION_V1',
    manifestFile: 'reference-pack-manifest.isr-retention.json',
    clauseFile: 'isr-retention-core.json',
    expectedBundleId: 'us-isr-retention-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'isr-retention-allowed-case',
      refusal: 'isr-retention-refusal',
      incomplete: 'isr-retention-missing-fact',
    },
    buildFacts(bundle) {
      return buildIsrRetentionFacts(bundle);
    },
    mutateRefusal(facts) {
      facts.authority.nationalCaveat = true;
    },
    mutateIncomplete(facts) {
      delete facts.authority.designatedRoeActive;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'COALITION_RULE_CONFLICT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-ISR-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-ISR-001'],
    },
  },
  {
    packId: 'US_WEAPON_STATUS_V1',
    manifestFile: 'reference-pack-manifest.weapon-status.json',
    clauseFile: 'weapon-status-core.json',
    expectedBundleId: 'us-weapon-status-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'weapon-status-allowed-case',
      refusal: 'weapon-status-refusal',
      incomplete: 'weapon-status-missing-fact',
    },
    buildFacts(bundle) {
      return buildWeaponStatusFacts(bundle);
    },
    mutateRefusal(facts) {
      facts.authority.reservedToHigherCommand = true;
    },
    mutateIncomplete(facts) {
      delete facts.authority.designatedActionAuthorized;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'FORCE_LEVEL_NOT_AUTHORIZED',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-WPN-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-WPN-001'],
    },
  },
  {
    packId: 'US_ALLIED_ROE_MERGE_V1',
    manifestFile: 'reference-pack-manifest.allied-roe-merge.json',
    clauseFile: 'allied-roe-merge-core.json',
    expectedBundleId: 'us-allied-roe-merge-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'allied-roe-merge-allowed-case',
      refusal: 'allied-roe-merge-refusal',
      incomplete: 'allied-roe-merge-missing-fact',
    },
    buildFacts(bundle) {
      return buildAlliedRoeMergeFacts(bundle);
    },
    mutateRefusal(facts) {
      facts.authority.nationalCaveat = true;
    },
    mutateIncomplete(facts) {
      delete facts.authority.designatedActionAuthorized;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'COALITION_RULE_CONFLICT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-ARO-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'POLICY_OVERLAY',
      failingRuleIds: ['CR-ARO-001'],
    },
  },
];

module.exports = {
  PACKS,
  buildAidDeliverySecurityFacts,
  buildAlliedRoeMergeFacts,
  buildCulturalPropertyProtectionFacts,
  buildEvacuationRouteFacts,
  buildHospitalProtectionFacts,
  buildIsrRetentionFacts,
  buildNightOperationFacts,
  buildReligiousSiteProtectionFacts,
  buildSchoolZoneRestrictionFacts,
  buildSignalInterferenceFacts,
  buildWeatherLimitationFacts,
  buildWeaponStatusFacts,
};
