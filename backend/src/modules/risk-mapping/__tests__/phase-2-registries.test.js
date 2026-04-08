'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { loadDomainManifest } = require('../registries/loadDomainManifest');
const { loadNodeRegistry } = require('../registries/loadNodeRegistry');
const { loadThreatRegistry } = require('../registries/loadThreatRegistry');
const { loadCausalCompatibilityRegistry } = require('../registries/loadCausalCompatibilityRegistry');
const { loadFalsifierRegistry } = require('../registries/loadFalsifierRegistry');
const { buildRegistryIndex } = require('../registries/buildRegistryIndex');
const { validateDomainManifest } = require('../registries/validateDomainManifest');
const { validateRiskMappingManifest } = require('../registries/validateRiskMappingManifest');

const DOMAIN_ID = 'organization_risk';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('loadDomainManifest loads and validates the seeded domain', () => {
  const domainManifest = loadDomainManifest(DOMAIN_ID);

  assert.deepEqual(domainManifest, {
    domainId: 'organization_risk',
    version: 'v1',
    supportedScenarioTypes: ['decline_risk', 'disruption_risk', 'fragility_risk'],
    supportedScopes: ['platform_dependency', 'regulatory', 'revenue_concentration', 'supply_chain'],
    allowedEntityTypes: ['company'],
    description: 'Bounded organization risk domain for authored scenario structure.',
    notes: 'Seeded proof domain for deterministic registry validation.',
    narrowingPolicy: 'Narrow unsupported queries to supported scopes only.',
    refusalPolicy: 'Refuse unsupported scope, domain mismatch, or missing authored structure.',
  });

  assert.equal(Object.isFrozen(domainManifest), true);
  assert.equal(Object.isFrozen(domainManifest.supportedScenarioTypes), true);
  assert.equal(Object.isFrozen(domainManifest.supportedScopes), true);
  assert.equal(Object.isFrozen(domainManifest.allowedEntityTypes), true);
});

test('each registry loads and validates successfully', () => {
  const nodeRegistry = loadNodeRegistry(DOMAIN_ID);
  const threatRegistry = loadThreatRegistry(DOMAIN_ID);
  const causalCompatibilityRegistry = loadCausalCompatibilityRegistry(DOMAIN_ID);
  const falsifierRegistry = loadFalsifierRegistry(DOMAIN_ID);

  assert.equal(nodeRegistry.domainId, 'organization_risk');
  assert.equal(threatRegistry.domainId, 'organization_risk');
  assert.equal(causalCompatibilityRegistry.domainId, 'organization_risk');
  assert.equal(falsifierRegistry.domainId, 'organization_risk');

  assert.equal(nodeRegistry.entries.length, 4);
  assert.equal(threatRegistry.entries.length, 4);
  assert.equal(causalCompatibilityRegistry.entries.length, 4);
  assert.equal(falsifierRegistry.entries.length, 4);

  assert.equal(Object.isFrozen(nodeRegistry), true);
  assert.equal(Object.isFrozen(threatRegistry), true);
  assert.equal(Object.isFrozen(causalCompatibilityRegistry), true);
  assert.equal(Object.isFrozen(falsifierRegistry), true);
  assert.equal(Object.isFrozen(nodeRegistry.entries[0]), true);
  assert.equal(Object.isFrozen(threatRegistry.entries[0]), true);
  assert.equal(Object.isFrozen(causalCompatibilityRegistry.entries[0]), true);
  assert.equal(Object.isFrozen(falsifierRegistry.entries[0]), true);
});

test('buildRegistryIndex builds deterministic id maps', () => {
  const domainManifest = loadDomainManifest(DOMAIN_ID);
  const nodeRegistry = loadNodeRegistry(DOMAIN_ID);
  const threatRegistry = loadThreatRegistry(DOMAIN_ID);
  const causalCompatibilityRegistry = loadCausalCompatibilityRegistry(DOMAIN_ID);
  const falsifierRegistry = loadFalsifierRegistry(DOMAIN_ID);

  const first = buildRegistryIndex({
    domainManifest,
    nodeRegistry,
    threatRegistry,
    causalCompatibilityRegistry,
    falsifierRegistry,
  });

  const second = buildRegistryIndex({
    domainManifest,
    nodeRegistry,
    threatRegistry,
    causalCompatibilityRegistry,
    falsifierRegistry,
  });

  assert.deepEqual(first, second);
  assert.deepEqual(first.nodeIds, [
    'app_store_regulatory_exposure',
    'china_supply_chain_exposure',
    'iphone_revenue_concentration',
    'platform_dependency_exposure',
  ]);
  assert.equal(Object.isFrozen(first.nodeById), true);
  assert.equal(Object.isFrozen(first.threatById), true);
  assert.equal(Object.isFrozen(first.causalCompatibilityById), true);
  assert.equal(Object.isFrozen(first.falsifierById), true);
});

test('duplicate ids are rejected', () => {
  const domainManifest = loadDomainManifest(DOMAIN_ID);
  const nodeRegistry = clone(loadNodeRegistry(DOMAIN_ID));
  const threatRegistry = loadThreatRegistry(DOMAIN_ID);
  const causalCompatibilityRegistry = loadCausalCompatibilityRegistry(DOMAIN_ID);
  const falsifierRegistry = loadFalsifierRegistry(DOMAIN_ID);

  nodeRegistry.entries = nodeRegistry.entries.concat([clone(nodeRegistry.entries[0])]);

  assert.throws(
    () =>
      buildRegistryIndex({
        domainManifest,
        nodeRegistry,
        threatRegistry,
        causalCompatibilityRegistry,
        falsifierRegistry,
      }),
    /Duplicate id detected:/,
  );
});

test('missing referenced ids are rejected where applicable', () => {
  const domainManifest = loadDomainManifest(DOMAIN_ID);
  const nodeRegistry = loadNodeRegistry(DOMAIN_ID);
  const threatRegistry = clone(loadThreatRegistry(DOMAIN_ID));
  const causalCompatibilityRegistry = loadCausalCompatibilityRegistry(DOMAIN_ID);
  const falsifierRegistry = loadFalsifierRegistry(DOMAIN_ID);

  threatRegistry.entries = threatRegistry.entries.filter((entry) => entry.id !== 'regulatory_pressure');

  assert.throws(
    () =>
      buildRegistryIndex({
        domainManifest,
        nodeRegistry,
        threatRegistry,
        causalCompatibilityRegistry,
        falsifierRegistry,
      }),
    /Missing supportedThreatIds for node app_store_regulatory_exposure reference: regulatory_pressure/,
  );
});

test('same input artifacts produce the same index output', () => {
  const domainManifest = loadDomainManifest(DOMAIN_ID);
  const nodeRegistry = loadNodeRegistry(DOMAIN_ID);
  const threatRegistry = loadThreatRegistry(DOMAIN_ID);
  const causalCompatibilityRegistry = loadCausalCompatibilityRegistry(DOMAIN_ID);
  const falsifierRegistry = loadFalsifierRegistry(DOMAIN_ID);

  const first = buildRegistryIndex({
    domainManifest,
    nodeRegistry,
    threatRegistry,
    causalCompatibilityRegistry,
    falsifierRegistry,
  });

  const second = buildRegistryIndex({
    domainManifest,
    nodeRegistry,
    threatRegistry,
    causalCompatibilityRegistry,
    falsifierRegistry,
  });

  assert.deepEqual(first, second);
});

test('loaded artifacts are frozen or treated immutably', () => {
  const nodeRegistry = loadNodeRegistry(DOMAIN_ID);
  const threatRegistry = loadThreatRegistry(DOMAIN_ID);
  const causalCompatibilityRegistry = loadCausalCompatibilityRegistry(DOMAIN_ID);
  const falsifierRegistry = loadFalsifierRegistry(DOMAIN_ID);

  assert.equal(Object.isFrozen(nodeRegistry.entries), true);
  assert.equal(Object.isFrozen(threatRegistry.entries), true);
  assert.equal(Object.isFrozen(causalCompatibilityRegistry.entries), true);
  assert.equal(Object.isFrozen(falsifierRegistry.entries), true);
});

test('invalid manifests fail consistently', () => {
  const invalidRiskMappingManifest = {
    availableDomains: ['organization_risk'],
    currentDomainVersions: {},
    registryPaths: {},
  };

  const invalidDomainManifest = {
    domainId: '',
    version: 'v1',
    supportedScenarioTypes: ['decline_risk'],
    supportedScopes: ['regulatory'],
    allowedEntityTypes: ['company'],
    description: 'x',
    notes: 'y',
    narrowingPolicy: 'z',
    refusalPolicy: 'w',
  };

  const riskMappingValidation = validateRiskMappingManifest(invalidRiskMappingManifest);
  const domainValidation = validateDomainManifest(invalidDomainManifest);

  assert.equal(riskMappingValidation.valid, false);
  assert.equal(domainValidation.valid, false);
  assert.deepEqual(riskMappingValidation.errors, [
    'currentDomainVersions must define a non-empty version for organization_risk.',
    'registryPaths must define a plain object for organization_risk.',
  ]);
  assert.deepEqual(domainValidation.errors, [
    'domainId must be a non-empty string.',
  ]);
});
