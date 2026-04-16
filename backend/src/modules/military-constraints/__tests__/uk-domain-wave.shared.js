'use strict';

const { buildCommonFacts } = require('./foundation-wave-b.shared');

function buildUkAirspaceFacts(bundle) {
  const facts = buildCommonFacts(bundle);
  facts.action.kind = 'SURVEILLANCE';
  facts.action.forceLevel = 'NON_LETHAL';
  facts.action.method = 'AIRBORNE_SURVEILLANCE';
  facts.action.domain = 'AIR';
  return facts;
}

function buildUkGroundFacts(bundle) {
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
    packId: 'UK_AIRSPACE_CONTROL_V1',
    manifestFile: 'reference-pack-manifest.uk-airspace-control.json',
    clauseFile: 'uk-airspace-control-core.json',
    expectedBundleId: 'uk-airspace-control-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'uk-airspace-control-allowed-case',
      refusal: 'uk-airspace-control-refusal',
      incomplete: 'uk-airspace-control-missing-fact',
    },
    buildFacts(bundle) {
      return buildUkAirspaceFacts(bundle);
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
      failingRuleIds: ['CR-UK-AIR-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-UK-AIR-001'],
    },
  },
  {
    packId: 'UK_GROUND_MANEUVER_V1',
    manifestFile: 'reference-pack-manifest.uk-ground-maneuver.json',
    clauseFile: 'uk-ground-maneuver-core.json',
    expectedBundleId: 'uk-ground-maneuver-bundle',
    expectedClauseCount: 1,
    caseIds: {
      allowed: 'uk-ground-maneuver-allowed-case',
      refusal: 'uk-ground-maneuver-refusal',
      incomplete: 'uk-ground-maneuver-missing-fact',
    },
    buildFacts(bundle) {
      return buildUkGroundFacts(bundle);
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
      failingRuleIds: ['CR-UK-GROUND-001'],
    },
    expectedIncomplete: {
      decision: 'REFUSED_INCOMPLETE',
      reasonCode: 'MISSING_REQUIRED_FACT',
      failedStage: 'ADMISSIBILITY',
      failingRuleIds: ['CR-UK-GROUND-001'],
    },
  },
];

module.exports = {
  PACKS,
  buildUkAirspaceFacts,
  buildUkGroundFacts,
};
