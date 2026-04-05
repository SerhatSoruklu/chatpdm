'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  UNRESOLVED_DOMAIN_REGISTRY,
  isUnresolvedDomain,
  normalizeUnresolvedDomainTerm,
} = require('../src/modules/concepts/unresolved-domain-registry');

test('unresolved domain registry matches the initial deterministic domain set', () => {
  UNRESOLVED_DOMAIN_REGISTRY.forEach((term) => {
    assert.equal(isUnresolvedDomain(term), true, `${term} should be recognized.`);
  });

  assert.equal(isUnresolvedDomain('non local mind'), true);
  assert.equal(isUnresolvedDomain('observer-created-reality'), true);
  assert.equal(isUnresolvedDomain('  cosmic consciousness  '), true);

  assert.equal(isUnresolvedDomain('authority'), false);
  assert.equal(isUnresolvedDomain('power'), false);
  assert.equal(isUnresolvedDomain('law'), false);
});

test('unresolved domain normalization is conservative and explicit', () => {
  assert.equal(normalizeUnresolvedDomainTerm('  Non-Local Mind  '), 'non_local_mind');
  assert.equal(normalizeUnresolvedDomainTerm('Observer created reality'), 'observer_created_reality');
  assert.equal(normalizeUnresolvedDomainTerm('cosmic-consciousness'), 'cosmic_consciousness');
  assert.equal(normalizeUnresolvedDomainTerm(null), '');
});

test('unresolved domain normalization stays deterministic on large noisy input', () => {
  const noisyInput = `${' '.repeat(1000)}Observer${'-'.repeat(1000)}Created${' '.repeat(1000)}Reality`
    + `${' '.repeat(1000)}`;

  assert.equal(normalizeUnresolvedDomainTerm(noisyInput), 'observer_created_reality');
  assert.equal(isUnresolvedDomain(noisyInput), true);
});
