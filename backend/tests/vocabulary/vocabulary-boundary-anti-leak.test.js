'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  loadConceptSet,
  loadInspectableConceptSet,
  loadPreAdmissionContractPathRegistry,
} = require('../../src/modules/concepts');
const {
  DETAIL_BACKED_CONCEPT_IDS,
  LIVE_CONCEPT_IDS,
  REJECTED_CONCEPT_IDS,
  VISIBLE_ONLY_PUBLIC_CONCEPT_IDS,
} = require('../../src/modules/concepts/admission-state');
const { loadRejectionRegistry } = require('../../src/modules/concepts/rejection-registry-loader');
const {
  buildCurrentConceptRelationshipSnapshot,
  loadStoredConceptRelationshipSnapshot,
} = require('../../src/modules/concepts/concept-overlap-snapshot');
const {
  buildConceptOverlapInspectionReport,
} = require('../../src/modules/concepts/concept-overlap-report-service');

const VOCABULARY_TERM_IDS = Object.freeze(['obligation', 'liability', 'jurisdiction']);
const conceptsModuleDirectory = path.resolve(__dirname, '../../src/modules/concepts');
const resolverPath = path.resolve(conceptsModuleDirectory, 'resolver.js');

function listConceptModuleFiles(directoryPath) {
  return fs.readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      return listConceptModuleFiles(entryPath);
    }

    return entry.name.endsWith('.js') ? [entryPath] : [];
  });
}

function extractSnapshotConceptIds(snapshot) {
  return [
    ...snapshot.authoredPairs.flatMap((entry) => [entry.conceptId, entry.otherConceptId]),
    ...snapshot.regressionPairs.flatMap((entry) => [entry.conceptId, entry.otherConceptId]),
  ];
}

test('vocabulary terms stay outside concept admission registries', () => {
  VOCABULARY_TERM_IDS.forEach((conceptId) => {
    assert.equal(LIVE_CONCEPT_IDS.includes(conceptId), false, `${conceptId} leaked into LIVE_CONCEPT_IDS.`);
    assert.equal(VISIBLE_ONLY_PUBLIC_CONCEPT_IDS.includes(conceptId), false, `${conceptId} leaked into VISIBLE_ONLY_PUBLIC_CONCEPT_IDS.`);
    assert.equal(REJECTED_CONCEPT_IDS.includes(conceptId), false, `${conceptId} leaked into REJECTED_CONCEPT_IDS.`);
    assert.equal(DETAIL_BACKED_CONCEPT_IDS.includes(conceptId), false, `${conceptId} leaked into DETAIL_BACKED_CONCEPT_IDS.`);
  });
});

test('vocabulary terms stay outside live and inspectable concept sets', () => {
  const liveConceptIds = loadConceptSet().map((concept) => concept.conceptId);
  const inspectableConceptIds = loadInspectableConceptSet().map((concept) => concept.conceptId);

  VOCABULARY_TERM_IDS.forEach((conceptId) => {
    assert.equal(liveConceptIds.includes(conceptId), false, `${conceptId} leaked into loadConceptSet().`);
    assert.equal(inspectableConceptIds.includes(conceptId), false, `${conceptId} leaked into loadInspectableConceptSet().`);
  });
});

test('vocabulary terms stay outside rejection and pre-admission registries', () => {
  const rejectionRegistry = loadRejectionRegistry();
  const preAdmissionRegistry = loadPreAdmissionContractPathRegistry();

  VOCABULARY_TERM_IDS.forEach((conceptId) => {
    assert.equal(
      rejectionRegistry.recordsByConceptId.has(conceptId),
      false,
      `${conceptId} leaked into the rejection registry.`,
    );
    assert.equal(
      preAdmissionRegistry.conceptPaths.some((entry) => entry.conceptId === conceptId),
      false,
      `${conceptId} leaked into the pre-admission contract path registry.`,
    );
  });
});

test('vocabulary terms stay outside overlap reports and stored/current relationship snapshots', () => {
  const overlapReport = buildConceptOverlapInspectionReport();
  const storedSnapshot = loadStoredConceptRelationshipSnapshot();
  const currentSnapshot = buildCurrentConceptRelationshipSnapshot();
  const overlapConceptIds = [
    ...overlapReport.matrix.map((row) => row.conceptId),
    ...overlapReport.matrix.flatMap((row) => row.cells.map((cell) => cell.otherConceptId)),
  ];
  const storedSnapshotConceptIds = extractSnapshotConceptIds(storedSnapshot);
  const currentSnapshotConceptIds = extractSnapshotConceptIds(currentSnapshot);

  VOCABULARY_TERM_IDS.forEach((conceptId) => {
    assert.equal(overlapConceptIds.includes(conceptId), false, `${conceptId} leaked into the overlap report matrix.`);
    assert.equal(storedSnapshotConceptIds.includes(conceptId), false, `${conceptId} leaked into the stored overlap snapshot.`);
    assert.equal(currentSnapshotConceptIds.includes(conceptId), false, `${conceptId} leaked into the current overlap snapshot.`);
  });
});

test('concept modules only import the vocabulary subsystem through the resolver entry guard', () => {
  const filesWithVocabularyImports = listConceptModuleFiles(conceptsModuleDirectory)
    .filter((filePath) => fs.readFileSync(filePath, 'utf8').includes('vocabulary/'));

  assert.deepEqual(
    filesWithVocabularyImports,
    [resolverPath],
    'Only resolver.js may import the vocabulary subsystem inside backend/src/modules/concepts.',
  );

  const resolverSource = fs.readFileSync(resolverPath, 'utf8');
  assert.match(
    resolverSource,
    /require\('\.\.\/\.\.\/vocabulary\/vocabulary-service\.ts'\)/,
    'resolver.js must import the vocabulary service through the explicit entry guard path.',
  );
});
