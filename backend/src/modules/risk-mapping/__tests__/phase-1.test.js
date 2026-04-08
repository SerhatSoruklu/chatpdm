'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { validateRiskMapQueryContract } = require('../contracts/riskMapQueryContract');
const { validateRiskMapOutputContract } = require('../contracts/riskMapOutputContract');
const { normalizeRiskMapQuery } = require('../normalizers/normalizeRiskMapQuery');
const { classifyRiskMapQueryShape } = require('../classification/classifyRiskMapQueryShape');
const { resolveRiskMapQuery } = require('../resolve/resolveRiskMapQuery');

const VALID_QUERY = Object.freeze({
  entity: '  Apple  ',
  timeHorizon: ' 5 years ',
  scenarioType: ' DECLINE_RISK ',
  domain: ' ORGANIZATION_RISK ',
  scope: Object.freeze(['Supply_Chain', ' regulatory ', 'supply_chain']),
  evidenceSetVersion: ' v1 ',
});

const QUERY_WITH_FRAMING = Object.freeze({
  entity: '  Apple  ',
  timeHorizon: ' 5 years ',
  scenarioType: ' DECLINE_RISK ',
  domain: ' ORGANIZATION_RISK ',
  scope: Object.freeze(['Supply_Chain', ' regulatory ']),
  evidenceSetVersion: ' v1 ',
  queryText: '  apple downfall in 5 years  ',
});

test('validateRiskMapQueryContract accepts a complete query shape', () => {
  const result = validateRiskMapQueryContract(VALID_QUERY);

  assert.deepEqual(result, {
    valid: true,
    errors: [],
    reasonCode: null,
  });
});

test('validateRiskMapQueryContract accepts an optional queryText field when provided', () => {
  const result = validateRiskMapQueryContract(QUERY_WITH_FRAMING);

  assert.deepEqual(result, {
    valid: true,
    errors: [],
    reasonCode: null,
  });
});

test('validateRiskMapQueryContract rejects an empty queryText field when provided', () => {
  const result = validateRiskMapQueryContract({
    ...VALID_QUERY,
    queryText: '   ',
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['queryText must be a non-empty string when provided.']);
});

test('validateRiskMapQueryContract rejects an invalid query shape deterministically', () => {
  const invalid = {
    entity: 'Apple',
    timeHorizon: 42,
    scenarioType: '',
    domain: 'organization_risk',
    scope: ['regulatory', 7],
    evidenceSetVersion: 'v1',
  };

  const result = validateRiskMapQueryContract(invalid);

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'timeHorizon must be a non-empty string.',
    'scenarioType must be a non-empty string.',
    'scope[1] must be a non-empty string.',
  ]);
});

test('normalizeRiskMapQuery trims, lowercases canonical fields, sorts, and deduplicates scope', () => {
  const input = {
    entity: '  Apple  ',
    timeHorizon: ' 5 years ',
    scenarioType: ' DECLINE_RISK ',
    domain: ' ORGANIZATION_RISK ',
    scope: ['Supply_Chain', ' regulatory ', 'supply_chain', 'Platform_Dependency'],
    evidenceSetVersion: ' v1 ',
  };

  const normalized = normalizeRiskMapQuery(input);

  assert.deepEqual(normalized, {
    entity: 'apple',
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: 'organization_risk',
    scope: ['platform_dependency', 'regulatory', 'supply_chain'],
    evidenceSetVersion: 'v1',
  });

  assert.deepEqual(input, {
    entity: '  Apple  ',
    timeHorizon: ' 5 years ',
    scenarioType: ' DECLINE_RISK ',
    domain: ' ORGANIZATION_RISK ',
    scope: ['Supply_Chain', ' regulatory ', 'supply_chain', 'Platform_Dependency'],
    evidenceSetVersion: ' v1 ',
  });
});

test('normalizeRiskMapQuery preserves queryText while keeping entity canonical', () => {
  const normalized = normalizeRiskMapQuery(QUERY_WITH_FRAMING);

  assert.deepEqual(normalized, {
    entity: 'apple',
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: 'organization_risk',
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: 'v1',
    queryText: 'apple downfall in 5 years',
  });
});

test('normalizeRiskMapQuery is deterministic for the same input', () => {
  const first = normalizeRiskMapQuery(VALID_QUERY);
  const second = normalizeRiskMapQuery(VALID_QUERY);

  assert.deepEqual(first, second);
});

test('normalizeRiskMapQuery rejects invalid shapes before normalization', () => {
  assert.throws(
    () => normalizeRiskMapQuery({
      entity: 'Apple',
      timeHorizon: '5 years',
      scenarioType: 'decline_risk',
      domain: 'organization_risk',
      scope: ['regulatory', ''],
      evidenceSetVersion: 'v1',
    }),
    /Invalid RiskMapQuery contract:/,
  );
});

test('classifyRiskMapQueryShape detects an RMG candidate without implying admission', () => {
  const normalized = normalizeRiskMapQuery({
    entity: 'Apple',
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: 'organization_risk',
    scope: ['regulatory', 'supply_chain'],
    evidenceSetVersion: 'v1',
  });

  const classification = classifyRiskMapQueryShape(normalized);

  assert.deepEqual(classification, {
    isRiskMapQuery: true,
    detectedScenarioType: 'decline_risk',
    detectedDomain: 'organization_risk',
    flags: {
      hasBroadCollapseLanguage: false,
      hasUnsupportedFraming: false,
    },
  });
  assert.equal(Object.prototype.hasOwnProperty.call(classification, 'status'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(classification, 'reasonCode'), false);
});

test('classifyRiskMapQueryShape flags broad collapse and unsupported framing language', () => {
  const normalized = normalizeRiskMapQuery({
    entity: 'Apple',
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: 'organization_risk',
    scope: ['regulatory'],
    evidenceSetVersion: 'v1',
  });

  const classification = classifyRiskMapQueryShape({
    ...normalized,
    entity: 'apple downfall',
    timeHorizon: 'what will happen',
  });

  assert.equal(classification.flags.hasBroadCollapseLanguage, true);
  assert.equal(classification.flags.hasUnsupportedFraming, true);
});

test('classifyRiskMapQueryShape detects broad framing from queryText without corrupting entity lookup', () => {
  const normalized = normalizeRiskMapQuery(QUERY_WITH_FRAMING);
  const classification = classifyRiskMapQueryShape(normalized);

  assert.equal(normalized.entity, 'apple');
  assert.equal(normalized.queryText, 'apple downfall in 5 years');
  assert.equal(classification.flags.hasBroadCollapseLanguage, true);
  assert.equal(classification.flags.hasUnsupportedFraming, false);
});

test('resolveRiskMapQuery returns the bounded admissibility response and validates it', () => {
  const response = resolveRiskMapQuery(VALID_QUERY);

  assert.deepEqual(response, {
    status: 'admitted',
    reasonCode: 'ADMISSIBLE_QUERY',
    reason: 'The query is admissible under authored evidence support.',
    domain: 'organization_risk',
    scenarioType: 'decline_risk',
    entity: 'apple',
    supportedNodes: [
      'app_store_regulatory_exposure',
      'china_supply_chain_exposure',
    ],
    supportedThreatVectors: [
      'platform_control_weakening',
      'regulatory_pressure',
      'supply_chain_disruption',
    ],
    supportedCausalPaths: [
      'regulatory_pressure->app_store_regulatory_exposure',
      'supply_chain_disruption->china_supply_chain_exposure',
    ],
    unsupportedBridges: [
      'missing_compatibility_rule:platform_control_weakening->app_store_regulatory_exposure',
    ],
    assumptions: [
      'local_structural_support_only',
      'scope_isolated_without_cross_scope_propagation',
    ],
    unknowns: [
      'no_cross_scope_propagation_support',
      'no_multi_hop_chain_support',
      'no_timeline_progression_support',
    ],
    falsifiers: [
      'regulatory_risk_resolution@app_store_regulatory_exposure',
      'successful_geographic_supply_diversification@china_supply_chain_exposure',
    ],
    boundedConfidenceClass: 'MEDIUM_BOUNDED_SUPPORT',
    diagnostics: {
      hasBroadCollapseLanguage: false,
      hasUnsupportedFraming: false,
      admittedScopes: ['regulatory', 'supply_chain'],
      narrowedFromScopes: [],
      refusedScopes: [],
      supportedNodeIds: ['app_store_regulatory_exposure', 'china_supply_chain_exposure'],
      unsupportedNodeIds: [],
      supportedThreatIds: ['platform_control_weakening', 'regulatory_pressure', 'supply_chain_disruption'],
      unsupportedThreatIds: [],
    },
  });

  const outputValidation = validateRiskMapOutputContract(response);

  assert.deepEqual(outputValidation, {
    valid: true,
    errors: [],
    reasonCode: null,
  });
});

test('resolveRiskMapQuery detects broad framing from queryText without corrupting authored entity lookup', () => {
  const response = resolveRiskMapQuery(QUERY_WITH_FRAMING);

  assert.deepEqual(response, {
    status: 'narrowed',
    reasonCode: 'BROAD_COLLAPSE_FRAMING',
    reason: 'Broad collapse framing was narrowed to the supported structural scope.',
    domain: 'organization_risk',
    scenarioType: 'decline_risk',
    entity: 'apple',
    supportedNodes: [
      'app_store_regulatory_exposure',
      'china_supply_chain_exposure',
    ],
    supportedThreatVectors: [
      'platform_control_weakening',
      'regulatory_pressure',
      'supply_chain_disruption',
    ],
    supportedCausalPaths: [
      'regulatory_pressure->app_store_regulatory_exposure',
      'supply_chain_disruption->china_supply_chain_exposure',
    ],
    unsupportedBridges: [
      'broad_collapse_overreach:apple',
      'missing_compatibility_rule:platform_control_weakening->app_store_regulatory_exposure',
    ],
    assumptions: [
      'local_structural_support_only',
      'scope_isolated_without_cross_scope_propagation',
    ],
    unknowns: [
      'no_cross_scope_propagation_support',
      'no_multi_hop_chain_support',
      'no_timeline_progression_support',
    ],
    falsifiers: [
      'regulatory_risk_resolution@app_store_regulatory_exposure',
      'successful_geographic_supply_diversification@china_supply_chain_exposure',
    ],
    boundedConfidenceClass: 'MEDIUM_BOUNDED_SUPPORT',
    diagnostics: {
      hasBroadCollapseLanguage: true,
      hasUnsupportedFraming: false,
      admittedScopes: ['regulatory', 'supply_chain'],
      narrowedFromScopes: [],
      refusedScopes: [],
      supportedNodeIds: ['app_store_regulatory_exposure', 'china_supply_chain_exposure'],
      unsupportedNodeIds: [],
      supportedThreatIds: ['platform_control_weakening', 'regulatory_pressure', 'supply_chain_disruption'],
      unsupportedThreatIds: [],
    },
  });
});

test('resolveRiskMapQuery rejects invalid input deterministically', () => {
  const invalid = {
    entity: '',
    timeHorizon: '5 years',
    scenarioType: 'decline_risk',
    domain: 'organization_risk',
    scope: ['regulatory'],
    evidenceSetVersion: 'v1',
  };

  assert.throws(
    () => resolveRiskMapQuery(invalid),
    /Invalid RiskMapQuery contract: entity must be a non-empty string\./,
  );
});
