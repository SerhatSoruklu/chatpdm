'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateCompactOutputFormats,
  isSortedUnique,
  SUPPORTED_PATH_PATTERN,
  UNSUPPORTED_BRIDGE_PATTERN,
  FALSIFIER_PATTERN,
  COMPACT_IDENTIFIER_PATTERN,
  COMPACT_ALLOWED_CHAR_PATTERN,
} = require('../utils/validateCompactOutputFormats');

test('compact format validators accept the seeded surface', () => {
  const validation = validateCompactOutputFormats({
    supportedNodes: ['app_store_regulatory_exposure'],
    supportedThreatVectors: ['regulatory_pressure'],
    supportedCausalPaths: ['regulatory_pressure->app_store_regulatory_exposure'],
    unsupportedBridges: ['missing_compatibility_rule:platform_control_weakening->app_store_regulatory_exposure'],
    assumptions: ['local_structural_support_only'],
    unknowns: ['no_multi_hop_chain_support'],
    falsifiers: ['regulatory_risk_resolution@app_store_regulatory_exposure'],
  });

  assert.equal(validation.valid, true);
});

test('compact format validators reject malformed strings', () => {
  const validation = validateCompactOutputFormats({
    supportedNodes: ['bad-node'],
    supportedThreatVectors: ['regulatory_pressure'],
    supportedCausalPaths: ['regulatory_pressure-app_store_regulatory_exposure'],
    unsupportedBridges: ['bridge without format'],
    assumptions: ['assumption one'],
    unknowns: ['unknown-one'],
    falsifiers: ['falsifier@app_store_regulatory_exposure@extra'],
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes('supportedNodes[0]')));
  assert.ok(validation.errors.some((error) => error.includes('supportedCausalPaths[0]')));
  assert.ok(validation.errors.some((error) => error.includes('unsupportedBridges[0]')));
  assert.ok(validation.errors.some((error) => error.includes('falsifiers[0]')));
});

test('format constants remain explicit and readable', () => {
  assert.ok(SUPPORTED_PATH_PATTERN.test('regulatory_pressure->app_store_regulatory_exposure'));
  assert.ok(UNSUPPORTED_BRIDGE_PATTERN.test('missing_compatibility_rule:platform_control_weakening->app_store_regulatory_exposure'));
  assert.ok(FALSIFIER_PATTERN.test('regulatory_risk_resolution@app_store_regulatory_exposure'));
  assert.ok(COMPACT_IDENTIFIER_PATTERN.test('local_structural_support_only'));
  assert.ok(COMPACT_ALLOWED_CHAR_PATTERN.test('regulatory_pressure->app_store_regulatory_exposure'));
  assert.equal(COMPACT_ALLOWED_CHAR_PATTERN.test('Bad Value'), false);
  assert.equal(isSortedUnique(['a', 'b', 'c']), true);
  assert.equal(isSortedUnique(['a', 'a']), false);
});
