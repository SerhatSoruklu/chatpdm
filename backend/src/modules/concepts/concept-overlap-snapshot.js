'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { compareConceptProfiles } = require('./concept-profile-comparator');
const { buildConceptOverlapInspectionReport } = require('./concept-overlap-report-service');
const { getConceptById } = require('./concept-loader');
const {
  normalizeConceptToProfile,
  validateConceptStructuralProfile,
} = require('./concept-structural-profile');

const overlapSnapshotPath = path.resolve(
  __dirname,
  '../../../../data/concepts/overlap-classification-snapshot.json',
);
const boundaryChangeApprovalPath = path.resolve(
  __dirname,
  '../../../../data/concepts/overlap-boundary-change-approvals.json',
);

const SNAPSHOT_SCOPE_VALUES = Object.freeze([
  'authored_pair',
  'regression_pair',
]);

const BOUNDARY_CHANGE_APPROVAL_FIELDS = Object.freeze([
  'scope',
  'caseId',
  'conceptId',
  'otherConceptId',
  'previousClassification',
  'newClassification',
  'reason',
  'approvedBy',
  'approvedAt',
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepFreeze(value) {
  if (Array.isArray(value)) {
    value.forEach((entry) => deepFreeze(entry));
    return Object.freeze(value);
  }

  if (isPlainObject(value)) {
    Object.values(value).forEach((entry) => deepFreeze(entry));
    return Object.freeze(value);
  }

  return value;
}

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Concept overlap snapshot has invalid ${fieldName}.`);
  }
}

function assertScopeValue(scope, fieldName) {
  assertNonEmptyString(scope, fieldName);

  if (!SNAPSHOT_SCOPE_VALUES.includes(scope)) {
    throw new Error(`Concept overlap snapshot has unsupported ${fieldName} "${scope}".`);
  }
}

function getLiveProfile(conceptId) {
  const concept = getConceptById(conceptId);

  if (!concept) {
    throw new Error(`Concept overlap regression fixture "${conceptId}" could not be loaded.`);
  }

  return concept;
}

function buildObligationProfile() {
  return validateConceptStructuralProfile({
    conceptId: 'obligation',
    domain: 'governance-structures',
    coreMeaning: 'Obligation marks a binding condition that places conduct under owed force before the conduct line is finalized as duty.',
    function: 'binding condition that places conduct under owed force',
    object: 'conduct or restraint owed by an actor',
    sourceType: 'rule, role, office, or obligation with binding force',
    actorRelation: 'actor stands under a binding condition that can make conduct owed',
    temporalRole: 'pre-duty binding condition',
    enforcementRole: 'exposes the actor to later enforcement if the owed condition is carried into duty and unmet',
    answerabilityRole: 'does not assign answerability by itself',
    requiredConductRole: 'conditions required conduct without fixing the final conduct line by itself',
    outcomeAttributionRole: 'does not attribute outcomes by itself',
    forbiddenEquivalences: ['duty', 'responsibility'],
    boundaryNotes: [
      'duty: obligation marks the binding condition; duty marks the conduct owed under that condition.',
      'responsibility: obligation concerns binding force before answerability; responsibility concerns answerability after attribution.',
    ],
  });
}

function createRegressionPairEntry(caseId, conceptId, otherConceptId, classification) {
  return {
    scope: 'regression_pair',
    caseId,
    conceptId,
    otherConceptId,
    classification,
  };
}

function buildRegressionPairSnapshotEntries() {
  const duty = normalizeConceptToProfile(getLiveProfile('duty'));
  const responsibility = normalizeConceptToProfile(getLiveProfile('responsibility'));
  const authority = normalizeConceptToProfile(getLiveProfile('authority'));
  const power = normalizeConceptToProfile(getLiveProfile('power'));
  const legitimacy = normalizeConceptToProfile(getLiveProfile('legitimacy'));
  const obligation = buildObligationProfile();

  return [
    createRegressionPairEntry(
      'duty_vs_responsibility',
      'duty',
      'responsibility',
      compareConceptProfiles(duty, responsibility).classification,
    ),
    createRegressionPairEntry(
      'obligation_vs_duty',
      'obligation',
      'duty',
      compareConceptProfiles(obligation, duty).classification,
    ),
    createRegressionPairEntry(
      'obligation_vs_responsibility',
      'obligation',
      'responsibility',
      compareConceptProfiles(obligation, responsibility).classification,
    ),
    createRegressionPairEntry(
      'authority_vs_power',
      'authority',
      'power',
      compareConceptProfiles(authority, power).classification,
    ),
    createRegressionPairEntry(
      'legitimacy_vs_authority',
      'legitimacy',
      'authority',
      compareConceptProfiles(legitimacy, authority).classification,
    ),
  ].sort((left, right) => {
    if (left.caseId !== right.caseId) {
      return left.caseId.localeCompare(right.caseId);
    }

    return left.otherConceptId.localeCompare(right.otherConceptId);
  });
}

function createAuthoredPairEntry(conceptId, cell) {
  return {
    scope: 'authored_pair',
    conceptId,
    otherConceptId: cell.otherConceptId,
    classification: cell.classification,
  };
}

function buildCurrentConceptRelationshipSnapshot() {
  const report = buildConceptOverlapInspectionReport();
  const authoredPairs = report.matrix
    .flatMap((row) => row.cells.map((cell) => createAuthoredPairEntry(row.conceptId, cell)))
    .sort((left, right) => left.conceptId.localeCompare(right.conceptId)
      || left.otherConceptId.localeCompare(right.otherConceptId));
  const regressionPairs = buildRegressionPairSnapshotEntries();

  return deepFreeze({
    snapshotVersion: 1,
    authoredPairs,
    regressionPairs,
  });
}

function validateSnapshotEntry(entry, expectedScope) {
  if (!isPlainObject(entry)) {
    throw new Error('Concept overlap snapshot entry must be an object.');
  }

  assertScopeValue(entry.scope, 'entry.scope');

  if (entry.scope !== expectedScope) {
    throw new Error(`Concept overlap snapshot entry scope mismatch; expected "${expectedScope}".`);
  }

  if (entry.scope === 'regression_pair') {
    assertNonEmptyString(entry.caseId, 'entry.caseId');
  }

  assertNonEmptyString(entry.conceptId, 'entry.conceptId');
  assertNonEmptyString(entry.otherConceptId, 'entry.otherConceptId');
  assertNonEmptyString(entry.classification, 'entry.classification');
}

function validateSnapshotEntries(entries, expectedScope, fieldName) {
  if (!Array.isArray(entries)) {
    throw new Error(`Concept overlap snapshot has invalid ${fieldName}; expected an array.`);
  }

  const seenKeys = new Set();

  entries.forEach((entry, index) => {
    validateSnapshotEntry(entry, expectedScope);
    const key = getSnapshotEntryKey(entry);

    if (seenKeys.has(key)) {
      throw new Error(`Concept overlap snapshot has duplicate ${fieldName}[${index}] key "${key}".`);
    }

    seenKeys.add(key);
  });
}

function validateStoredConceptRelationshipSnapshot(snapshot) {
  if (!isPlainObject(snapshot)) {
    throw new Error('Concept overlap snapshot must be an object.');
  }

  if (snapshot.snapshotVersion !== 1) {
    throw new Error('Concept overlap snapshot must declare snapshotVersion 1.');
  }

  validateSnapshotEntries(snapshot.authoredPairs, 'authored_pair', 'authoredPairs');
  validateSnapshotEntries(snapshot.regressionPairs, 'regression_pair', 'regressionPairs');

  return deepFreeze({
    snapshotVersion: 1,
    authoredPairs: snapshot.authoredPairs.map((entry) => ({ ...entry })),
    regressionPairs: snapshot.regressionPairs.map((entry) => ({ ...entry })),
  });
}

function loadStoredConceptRelationshipSnapshot() {
  if (!fs.existsSync(overlapSnapshotPath)) {
    throw new Error(`Concept overlap snapshot file is missing at ${overlapSnapshotPath}.`);
  }

  const snapshot = JSON.parse(fs.readFileSync(overlapSnapshotPath, 'utf8'));
  return validateStoredConceptRelationshipSnapshot(snapshot);
}

function assertApprovalReason(reason) {
  assertNonEmptyString(reason, 'approval.reason');

  if (reason.trim().split(/\s+/).length < 4) {
    throw new Error('Concept overlap boundary change approval reason must contain at least 4 words.');
  }
}

function validateBoundaryChangeApproval(entry) {
  if (!isPlainObject(entry)) {
    throw new Error('Concept overlap boundary change approval must be an object.');
  }

  const unexpectedFields = Object.keys(entry)
    .filter((fieldName) => !BOUNDARY_CHANGE_APPROVAL_FIELDS.includes(fieldName));

  if (unexpectedFields.length > 0) {
    throw new Error(
      `Concept overlap boundary change approval has unsupported field(s): ${unexpectedFields.join(', ')}.`,
    );
  }

  assertScopeValue(entry.scope, 'approval.scope');

  if (entry.scope === 'regression_pair') {
    assertNonEmptyString(entry.caseId, 'approval.caseId');
  }

  assertNonEmptyString(entry.conceptId, 'approval.conceptId');
  assertNonEmptyString(entry.otherConceptId, 'approval.otherConceptId');
  assertNonEmptyString(entry.previousClassification, 'approval.previousClassification');
  assertNonEmptyString(entry.newClassification, 'approval.newClassification');
  assertApprovalReason(entry.reason);
  assertNonEmptyString(entry.approvedBy, 'approval.approvedBy');
  assertNonEmptyString(entry.approvedAt, 'approval.approvedAt');

  return deepFreeze({
    ...entry,
  });
}

function loadBoundaryChangeApprovalRegistry() {
  if (!fs.existsSync(boundaryChangeApprovalPath)) {
    throw new Error(`Concept overlap boundary change approval file is missing at ${boundaryChangeApprovalPath}.`);
  }

  const registry = JSON.parse(fs.readFileSync(boundaryChangeApprovalPath, 'utf8'));

  if (!isPlainObject(registry) || !Array.isArray(registry.approvals)) {
    throw new Error('Concept overlap boundary change approval registry must expose an approvals array.');
  }

  const approvals = registry.approvals.map((entry) => validateBoundaryChangeApproval(entry));
  return deepFreeze({ approvals });
}

function getSnapshotEntryKey(entry) {
  const caseId = entry.scope === 'regression_pair' ? `::${entry.caseId}` : '';
  return `${entry.scope}${caseId}::${entry.conceptId}::${entry.otherConceptId}`;
}

function indexSnapshotEntries(entries) {
  return new Map(entries.map((entry) => [getSnapshotEntryKey(entry), entry]));
}

function findMatchingBoundaryChangeApproval(change, approvals) {
  return approvals.find((approval) => approval.scope === change.scope
    && (approval.caseId || null) === (change.caseId || null)
    && approval.conceptId === change.conceptId
    && approval.otherConceptId === change.otherConceptId
    && approval.previousClassification === change.previousClassification
    && approval.newClassification === change.newClassification) || null;
}

function evaluateConceptRelationshipSnapshotDrift(
  storedSnapshot,
  currentSnapshot,
  approvalRegistry = { approvals: [] },
) {
  const stored = validateStoredConceptRelationshipSnapshot(storedSnapshot);
  const current = validateStoredConceptRelationshipSnapshot(currentSnapshot);
  const approvals = approvalRegistry.approvals || [];
  const storedEntries = indexSnapshotEntries([
    ...stored.authoredPairs,
    ...stored.regressionPairs,
  ]);
  const currentEntries = indexSnapshotEntries([
    ...current.authoredPairs,
    ...current.regressionPairs,
  ]);
  const entryKeys = [...new Set([...storedEntries.keys(), ...currentEntries.keys()])].sort();
  const changes = entryKeys
    .map((entryKey) => {
      const previousEntry = storedEntries.get(entryKey) || null;
      const currentEntry = currentEntries.get(entryKey) || null;
      const previousClassification = previousEntry?.classification ?? null;
      const newClassification = currentEntry?.classification ?? null;

      if (previousClassification === newClassification) {
        return null;
      }

      const change = {
        scope: currentEntry?.scope ?? previousEntry.scope,
        caseId: currentEntry?.caseId ?? previousEntry?.caseId ?? null,
        conceptId: currentEntry?.conceptId ?? previousEntry.conceptId,
        otherConceptId: currentEntry?.otherConceptId ?? previousEntry.otherConceptId,
        previousClassification,
        newClassification,
      };
      const approval = findMatchingBoundaryChangeApproval(change, approvals);

      return {
        ...change,
        approved: approval !== null,
        reason: approval?.reason ?? null,
        approvedBy: approval?.approvedBy ?? null,
        approvedAt: approval?.approvedAt ?? null,
      };
    })
    .filter(Boolean);

  return deepFreeze({
    changes,
    blockingChanges: changes.filter((change) => !change.approved),
    approvedChanges: changes.filter((change) => change.approved),
  });
}

function formatBlockingChanges(changes) {
  return changes
    .map((change) => (
      `${change.scope}:${change.conceptId}->${change.otherConceptId} ${change.previousClassification}=>${change.newClassification}`
    ))
    .join(', ');
}

function assertStoredConceptRelationshipSnapshotAuthority() {
  const storedSnapshot = loadStoredConceptRelationshipSnapshot();
  const currentSnapshot = buildCurrentConceptRelationshipSnapshot();
  const approvalRegistry = loadBoundaryChangeApprovalRegistry();
  const drift = evaluateConceptRelationshipSnapshotDrift(
    storedSnapshot,
    currentSnapshot,
    approvalRegistry,
  );

  if (drift.blockingChanges.length > 0) {
    throw new Error(
      `Concept overlap snapshot authority blocked by unapproved drift: ${formatBlockingChanges(drift.blockingChanges)}.`,
    );
  }

  return drift;
}

function writeConceptRelationshipSnapshot(snapshot) {
  const validatedSnapshot = validateStoredConceptRelationshipSnapshot(snapshot);
  fs.writeFileSync(
    overlapSnapshotPath,
    `${JSON.stringify(validatedSnapshot, null, 2)}\n`,
    'utf8',
  );
}

module.exports = {
  BOUNDARY_CHANGE_APPROVAL_FIELDS,
  assertStoredConceptRelationshipSnapshotAuthority,
  boundaryChangeApprovalPath,
  buildCurrentConceptRelationshipSnapshot,
  evaluateConceptRelationshipSnapshotDrift,
  findMatchingBoundaryChangeApproval,
  loadBoundaryChangeApprovalRegistry,
  loadStoredConceptRelationshipSnapshot,
  overlapSnapshotPath,
  validateBoundaryChangeApproval,
  validateStoredConceptRelationshipSnapshot,
  writeConceptRelationshipSnapshot,
};
