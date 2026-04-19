'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ZEROGLARE_PRIMARY_SIGNAL_PRIORITY,
  ZEROGLARE_PUBLIC_ACTIVE_SIGNAL_ORDER,
  ZEROGLARE_STATUS_RULE,
  orderZeroGlareActiveObservations,
  resolveZeroGlareStatus,
  selectZeroGlarePrimaryObservation,
} = require('../../src/modules/concepts/zeroglare-policy');

test('ZeroGlare policy keeps explicit public ordering and primary priority', () => {
  assert.deepEqual(ZEROGLARE_PUBLIC_ACTIVE_SIGNAL_ORDER, [
    'rhetorical_noise',
    'ambiguity_surface',
    'unsupported_semantic_bridge',
    'scope_pressure',
    'scope_instability_pressure',
    'circular_dependency_pressure',
    'recursive_frame_pressure',
    'conditional_frame_fragility',
    'contradiction_pressure',
    'universal_scope_pressure',
    'exception_leak_pressure',
    'role_forcing_pressure',
    'self_negation_pressure',
    'causal_bridge_pressure',
    'reference_collapse_pressure',
    'context_drift_pressure',
  ]);

  assert.deepEqual(ZEROGLARE_PRIMARY_SIGNAL_PRIORITY, ZEROGLARE_PUBLIC_ACTIVE_SIGNAL_ORDER);
  assert.equal(ZEROGLARE_STATUS_RULE.clear.max_marker_count, 0);
  assert.equal(ZEROGLARE_STATUS_RULE.pressure.min_marker_count, 1);
  assert.equal(ZEROGLARE_STATUS_RULE.pressure.max_marker_count, 2);
  assert.equal(ZEROGLARE_STATUS_RULE.fail.min_marker_count, 3);
});

test('ZeroGlare policy orders active signals explicitly rather than by input array position', () => {
  const activeObservations = orderZeroGlareActiveObservations([
    { code: 'scope_pressure', detected: true },
    { code: 'rhetorical_noise', detected: true },
    { code: 'unsupported_semantic_bridge', detected: true },
    { code: 'context_drift_pressure', detected: true },
    { code: 'ambiguity_surface', detected: false },
  ]);

  assert.deepEqual(activeObservations.map((observation) => observation.code), [
    'rhetorical_noise',
    'unsupported_semantic_bridge',
    'scope_pressure',
    'context_drift_pressure',
  ]);
  assert.equal(
    selectZeroGlarePrimaryObservation([
      { code: 'scope_pressure', detected: true },
      { code: 'rhetorical_noise', detected: true },
      { code: 'context_drift_pressure', detected: true },
    ])?.code,
    'rhetorical_noise',
  );
});

test('ZeroGlare policy resolves clear pressure and fail boundaries explicitly', () => {
  assert.equal(resolveZeroGlareStatus(0), 'clear');
  assert.equal(resolveZeroGlareStatus(1), 'pressure');
  assert.equal(resolveZeroGlareStatus(2), 'pressure');
  assert.equal(resolveZeroGlareStatus(3), 'fail');
});
