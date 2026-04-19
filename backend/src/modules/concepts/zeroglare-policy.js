'use strict';

const {
  ZEROGLARE_PUBLIC_MARKER_CODES,
} = require('./zeroglare-marker-contract');

const ZEROGLARE_PUBLIC_ACTIVE_SIGNAL_ORDER = Object.freeze([
  ...ZEROGLARE_PUBLIC_MARKER_CODES,
]);

const ZEROGLARE_PRIMARY_SIGNAL_PRIORITY = Object.freeze([
  ...ZEROGLARE_PUBLIC_ACTIVE_SIGNAL_ORDER,
]);

const ZEROGLARE_STATUS_RULE = Object.freeze({
  clear: Object.freeze({
    min_marker_count: 0,
    max_marker_count: 0,
  }),
  pressure: Object.freeze({
    min_marker_count: 1,
    max_marker_count: 2,
  }),
  fail: Object.freeze({
    min_marker_count: 3,
  }),
});

function resolveZeroGlareStatus(markerCount) {
  if (markerCount <= ZEROGLARE_STATUS_RULE.clear.max_marker_count) {
    return 'clear';
  }

  if (markerCount >= ZEROGLARE_STATUS_RULE.fail.min_marker_count) {
    return 'fail';
  }

  return 'pressure';
}

function orderZeroGlareActiveObservations(observations) {
  const observationByCode = new Map();

  for (const observation of observations) {
    if (observation && typeof observation.code === 'string' && observation.detected === true) {
      observationByCode.set(observation.code, observation);
    }
  }

  return ZEROGLARE_PUBLIC_ACTIVE_SIGNAL_ORDER
    .map((code) => observationByCode.get(code))
    .filter((observation) => Boolean(observation));
}

function selectZeroGlarePrimaryObservation(observations) {
  const observationByCode = new Map();

  for (const observation of observations) {
    if (observation && typeof observation.code === 'string' && observation.detected === true) {
      observationByCode.set(observation.code, observation);
    }
  }

  for (const code of ZEROGLARE_PRIMARY_SIGNAL_PRIORITY) {
    const observation = observationByCode.get(code);

    if (observation) {
      return observation;
    }
  }

  return null;
}

module.exports = Object.freeze({
  ZEROGLARE_PRIMARY_SIGNAL_PRIORITY,
  ZEROGLARE_PUBLIC_ACTIVE_SIGNAL_ORDER,
  ZEROGLARE_STATUS_RULE,
  orderZeroGlareActiveObservations,
  resolveZeroGlareStatus,
  selectZeroGlarePrimaryObservation,
});
