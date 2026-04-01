'use strict';

const fs = require('node:fs');

const {
  buildCurrentConceptRelationshipSnapshot,
  boundaryChangeApprovalPath,
  evaluateConceptRelationshipSnapshotDrift,
  loadBoundaryChangeApprovalRegistry,
  loadStoredConceptRelationshipSnapshot,
  overlapSnapshotPath,
  writeConceptRelationshipSnapshot,
} = require('../src/modules/concepts/concept-overlap-snapshot');

function formatClassification(value) {
  return value === null ? '<missing>' : value;
}

function printChanges(label, changes) {
  if (changes.length === 0) {
    return;
  }

  process.stdout.write(`${label}\n`);
  changes.forEach((change) => {
    const caseLabel = change.caseId ? ` case=${change.caseId}` : '';
    const reason = change.reason ? ` reason="${change.reason}"` : '';
    process.stdout.write(
      `- ${change.conceptId} -> ${change.otherConceptId}${caseLabel}: ${formatClassification(change.previousClassification)} -> ${formatClassification(change.newClassification)}${reason}\n`,
    );
  });
}

function main() {
  const currentSnapshot = buildCurrentConceptRelationshipSnapshot();

  if (!fs.existsSync(overlapSnapshotPath)) {
    writeConceptRelationshipSnapshot(currentSnapshot);
    process.stdout.write(`Bootstrapped concept overlap snapshot at ${overlapSnapshotPath}\n`);
    return;
  }

  const storedSnapshot = loadStoredConceptRelationshipSnapshot();
  const approvals = loadBoundaryChangeApprovalRegistry();
  const drift = evaluateConceptRelationshipSnapshotDrift(storedSnapshot, currentSnapshot, approvals);

  if (drift.changes.length === 0) {
    process.stdout.write('Concept overlap snapshot already matches current relationships.\n');
    return;
  }

  if (drift.blockingChanges.length > 0) {
    printChanges(
      `Blocking concept relationship changes require approval entries in ${boundaryChangeApprovalPath}:`,
      drift.blockingChanges,
    );
    process.exitCode = 1;
    return;
  }

  writeConceptRelationshipSnapshot(currentSnapshot);
  printChanges('Applied approved concept relationship changes:', drift.approvedChanges);
  process.stdout.write(`Updated concept overlap snapshot at ${overlapSnapshotPath}\n`);
}

main();
