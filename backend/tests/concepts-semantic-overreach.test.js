'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  detectSemanticOverreach,
  hasNormalizedTerm,
  normalizeSemanticOverreachText,
} = require('../src/modules/concepts/semantic-overreach-detector');

test('unsupported semantic bridges are detected on explicit escalation patterns', () => {
  const microtubuleClaim = detectSemanticOverreach(
    'microtubules are quantum therefore consciousness is cosmic',
  );

  assert.equal(microtubuleClaim.unsupportedSemanticBridge, true);
  assert.equal(microtubuleClaim.causalOverreach, false);
  assert.ok(microtubuleClaim.matchedReasons.includes('microtubules_to_consciousness'));
  assert.ok(microtubuleClaim.matchedReasons.includes('microtubules_to_cosmic_consciousness'));

  const biologyClaim = detectSemanticOverreach(
    'quantum effects exist in biology therefore consciousness is quantum',
  );

  assert.equal(biologyClaim.unsupportedSemanticBridge, true);
  assert.equal(biologyClaim.causalOverreach, false);
  assert.ok(biologyClaim.matchedReasons.includes('quantum_biology_to_consciousness'));

  const observerClaim = detectSemanticOverreach(
    'measurement problem implies observer-created reality',
  );

  assert.equal(observerClaim.unsupportedSemanticBridge, true);
  assert.equal(observerClaim.causalOverreach, false);
  assert.ok(observerClaim.matchedReasons.includes('measurement_problem_to_observer_created_reality'));
});

test('causal overreach is detected on correlation-to-causation and necessity escalation patterns', () => {
  const correlationClaim = detectSemanticOverreach('X correlates with Y so X causes Y');

  assert.equal(correlationClaim.unsupportedSemanticBridge, false);
  assert.equal(correlationClaim.causalOverreach, true);
  assert.ok(correlationClaim.matchedReasons.includes('correlation_to_causation'));

  const processClaim = detectSemanticOverreach('presence of a process proves it generates consciousness');

  assert.equal(processClaim.unsupportedSemanticBridge, false);
  assert.equal(processClaim.causalOverreach, true);
  assert.ok(processClaim.matchedReasons.includes('process_to_consciousness'));

  const necessityClaim = detectSemanticOverreach('this suggests A, therefore A is necessary and sufficient');

  assert.equal(necessityClaim.unsupportedSemanticBridge, false);
  assert.equal(necessityClaim.causalOverreach, true);
  assert.ok(necessityClaim.matchedReasons.includes('suggestion_to_necessity'));
});

test('ordinary inputs remain unflagged', () => {
  const negatives = [
    'microtubules are quantum',
    'quantum effects exist in biology',
    'measurement problem is a physics puzzle',
    'x correlates with y',
    'the process may relate to consciousness',
    'this suggests A',
  ];

  negatives.forEach((input) => {
    const result = detectSemanticOverreach(input);
    assert.equal(result.unsupportedSemanticBridge, false, input);
    assert.equal(result.causalOverreach, false, input);
    assert.deepEqual(result.matchedReasons, [], input);
  });
});

test('normalized term matching remains boundary-aware on large normalized inputs', () => {
  assert.equal(hasNormalizedTerm('microtubules_consciousness', 'microtubules'), true);
  assert.equal(hasNormalizedTerm('microtubules_consciousness', 'tubules'), false);
  assert.equal(hasNormalizedTerm('quantum_biology_brain_quantum_computer', 'quantum biology'), true);
});

test('long noisy input still normalizes and matches deterministically', () => {
  const longClaim = `${' '.repeat(1000)}microtubules${'-'.repeat(1000)}consciousness`
    + `${' '.repeat(1000)}therefore${' '.repeat(1000)}cosmic${' '.repeat(1000)}consciousness`;

  const result = detectSemanticOverreach(longClaim);

  assert.equal(result.unsupportedSemanticBridge, true);
  assert.equal(result.causalOverreach, false);
  assert.ok(result.matchedReasons.includes('microtubules_to_consciousness'));
  assert.ok(result.matchedReasons.includes('microtubules_to_cosmic_consciousness'));
});

test('normalization is explicit and conservative', () => {
  assert.equal(
    normalizeSemanticOverreachText('  Measurement-problem implies observer-created reality  '),
    'measurement_problem_implies_observer_created_reality',
  );
  assert.equal(
    normalizeSemanticOverreachText('Observer created reality'),
    'observer_created_reality',
  );
  assert.equal(normalizeSemanticOverreachText(null), '');
});
