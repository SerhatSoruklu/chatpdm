'use strict';

const { buildCommonFacts } = require('./foundation-wave-b.shared');

function buildAirspaceFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'SURVEILLANCE';
  facts.action.forceLevel = 'NON_LETHAL';
  facts.action.method = 'AIRBORNE_SURVEILLANCE';
  facts.action.domain = 'AIR';
  return facts;
}

function buildGroundFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'MANEUVER';
  facts.action.forceLevel = 'NON_LETHAL';
  facts.action.method = 'GROUND_MOVEMENT';
  facts.action.domain = 'LAND';
  facts.target.horsDeCombatStatus = false;
  return facts;
}

const PACKS = [
  {
    packId: 'US_AIRSPACE_CONTROL_V1',
    manifestFile: 'reference-pack-manifest.airspace-control.json',
    clauseFile: 'airspace-control-core.json',
    expectedBundleId: 'us-airspace-control-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'airspace-control-allowed-case',
      refusal: 'airspace-control-refusal',
      incomplete: 'airspace-control-missing-fact',
    },
    buildFacts(bundle) {
      return buildAirspaceFacts(bundle);
    },
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
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'SCOPE_VIOLATION',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-CL-AIRSPACE-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-CL-AIRSPACE-001'],
    },
  },
  {
    packId: 'US_GROUND_MANEUVER_V1',
    manifestFile: 'reference-pack-manifest.ground-maneuver.json',
    clauseFile: 'ground-maneuver-core.json',
    expectedBundleId: 'us-ground-maneuver-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'ground-maneuver-allowed-case',
      refusal: 'ground-maneuver-refusal',
      incomplete: 'ground-maneuver-missing-fact',
    },
    buildFacts(bundle) {
      return buildGroundFacts(bundle);
    },
    mutateAllowed(facts) {
      facts.action.kind = 'MANEUVER';
      facts.action.forceLevel = 'NON_LETHAL';
      facts.action.method = 'GROUND_MOVEMENT';
      facts.action.domain = 'LAND';
      facts.target.horsDeCombatStatus = false;
      facts.authority.delegatedToUnit = true;
      facts.authority.designatedActionAuthorized = true;
    },
    mutateRefusal(facts) {
      facts.action.domain = 'AIR';
    },
    mutateIncomplete(facts) {
      delete facts.authority.designatedActionAuthorized;
    },
    expectedRefusal: {
      decision: 'REFUSED',
      reasonCode: 'SCOPE_VIOLATION',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-CL-GROUND-SCOPE-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-CL-GROUND-SCOPE-001'],
    },
  },
];

module.exports = {
  PACKS,
  buildAirspaceFacts,
  buildGroundFacts,
};
