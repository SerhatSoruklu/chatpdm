'use strict';

const path = require('node:path');
const { safeJsonRead } = require('../utils/safeJsonRead');
const { freezePlainObject } = require('../utils/freezePlainObject');
const { stableSort } = require('../utils/stableSort');

const BACKEND_ROOT = path.resolve(__dirname, '../../../../');
const GOVERNANCE_RELEASE_HISTORY_PATH = path.resolve(BACKEND_ROOT, 'data/risk-mapping/governance/release-history.json');

function normalizeEvent(event) {
  return freezePlainObject({
    eventId: event.eventId,
    releaseId: event.releaseId,
    eventType: event.eventType,
    status: event.status,
    changedAt: event.changedAt,
    notes: event.notes,
  });
}

function loadGovernanceReleaseHistory() {
  const history = safeJsonRead(GOVERNANCE_RELEASE_HISTORY_PATH);

  return freezePlainObject({
    domainId: history.domainId,
    currentReleaseId: history.currentReleaseId,
    events: Object.freeze(stableSort(history.events, (left, right) => left.eventId.localeCompare(right.eventId)).map(normalizeEvent)),
  });
}

module.exports = Object.freeze({
  GOVERNANCE_RELEASE_HISTORY_PATH,
  loadGovernanceReleaseHistory,
});
