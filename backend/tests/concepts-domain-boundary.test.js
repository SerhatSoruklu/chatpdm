'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  classifyDomainSignals,
  detectDomainBoundaryViolation,
  normalizeDomainBoundaryText,
} = require('../src/modules/concepts/domain-boundary-detector');

test('cross-domain jumps from empirical signals into metaphysical conclusions are flagged', () => {
  const quantumClaim = detectDomainBoundaryViolation('quantum entanglement proves cosmic consciousness');

  assert.equal(quantumClaim.domainBoundaryViolation, true);
  assert.deepEqual(quantumClaim.classification.detectedDomains, ['physics', 'metaphysics']);
  assert.ok(quantumClaim.classification.signalsByDomain.physics.includes('quantum entanglement'));
  assert.ok(quantumClaim.classification.signalsByDomain.metaphysics.includes('cosmic consciousness'));
  assert.ok(quantumClaim.classification.bridgeCues.includes('proves'));
  assert.ok(quantumClaim.matchedReasons.includes('empirical_to_metaphysical_jump'));

  const microtubuleClaim = detectDomainBoundaryViolation(
    'microtubules show coherence therefore minds are connected to the universe',
  );

  assert.equal(microtubuleClaim.domainBoundaryViolation, true);
  assert.deepEqual(microtubuleClaim.classification.detectedDomains, ['biology', 'metaphysics']);
  assert.ok(microtubuleClaim.classification.signalsByDomain.biology.includes('microtubules'));
  assert.ok(microtubuleClaim.classification.signalsByDomain.metaphysics.includes('connected to the universe'));
  assert.ok(microtubuleClaim.classification.bridgeCues.includes('therefore'));

  const observerClaim = detectDomainBoundaryViolation(
    'brain measurement timing means reality is observer-created',
  );

  assert.equal(observerClaim.domainBoundaryViolation, true);
  assert.ok(observerClaim.classification.detectedDomains.includes('neuroscience'));
  assert.ok(observerClaim.classification.detectedDomains.includes('metaphysics'));
  assert.ok(observerClaim.classification.bridgeCues.includes('means'));
  assert.ok(observerClaim.classification.signalsByDomain.metaphysics.includes('reality is observer created'));
});

test('same-domain and bounded statements remain unflagged', () => {
  const boundedPhysicalClaim = detectDomainBoundaryViolation(
    'microtubules are part of the neuronal cytoskeleton',
  );

  assert.equal(boundedPhysicalClaim.domainBoundaryViolation, false);
  assert.ok(boundedPhysicalClaim.classification.detectedDomains.includes('biology'));
  assert.ok(boundedPhysicalClaim.classification.detectedDomains.includes('neuroscience'));
  assert.deepEqual(boundedPhysicalClaim.classification.signalsByDomain.metaphysics, []);

  const philosophicalClaim = detectDomainBoundaryViolation(
    'consciousness is an unresolved philosophical problem',
  );

  assert.equal(philosophicalClaim.domainBoundaryViolation, false);
  assert.deepEqual(philosophicalClaim.classification.detectedDomains, ['philosophy']);
  assert.deepEqual(philosophicalClaim.classification.bridgeCues, []);

  const boundedQuantumClaim = detectDomainBoundaryViolation(
    'quantum biology studies limited quantum effects in living systems',
  );

  assert.equal(boundedQuantumClaim.domainBoundaryViolation, false);
  assert.ok(boundedQuantumClaim.classification.detectedDomains.includes('physics'));
  assert.ok(boundedQuantumClaim.classification.detectedDomains.includes('biology'));
  assert.deepEqual(boundedQuantumClaim.classification.bridgeCues, []);
});

test('domain classification remains explicit and conservative', () => {
  const classification = classifyDomainSignals('quantum entanglement proves cosmic consciousness');

  assert.equal(classification.normalizedText, 'quantum entanglement proves cosmic consciousness');
  assert.deepEqual(classification.detectedDomains, ['physics', 'metaphysics']);
  assert.ok(classification.signalsByDomain.physics.includes('quantum entanglement'));
  assert.ok(classification.signalsByDomain.metaphysics.includes('cosmic consciousness'));
  assert.ok(classification.bridgeCues.includes('proves'));

  assert.equal(normalizeDomainBoundaryText('  Brain-measurement timing means reality is observer-created  '),
    'brain measurement timing means reality is observer created');
  assert.equal(normalizeDomainBoundaryText(null), '');
});
