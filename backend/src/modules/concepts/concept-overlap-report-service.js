'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  DETAIL_BACKED_CONCEPT_IDS,
  LIVE_CONCEPT_IDS,
  REJECTED_CONCEPT_IDS,
  VISIBLE_ONLY_PUBLIC_CONCEPT_IDS,
} = require('./admission-state');
const { compareConceptProfiles } = require('./concept-profile-comparator');
const { getConceptById } = require('./concept-loader');
const { normalizeConceptToProfile } = require('./concept-structural-profile');

const conceptsDirectory = path.resolve(__dirname, '../../../../data/concepts');
const NON_CONCEPT_PACKET_FILES = new Set([
  'concept-admission-state.json',
  'overlap-boundary-change-approvals.json',
  'overlap-classification-snapshot.json',
  'resolve-rules.json',
]);

const ADJACENCY_CLASSIFICATIONS = Object.freeze([
  'adjacent',
  'requires_explicit_boundary_note',
]);

const BLOCKING_CLASSIFICATIONS = Object.freeze([
  'conflicting',
  'duplicate_candidate',
  'compressed_synonym_risk',
]);

const CLASSIFICATION_SEVERITY = Object.freeze({
  distinct: 0,
  adjacent: 1,
  requires_explicit_boundary_note: 2,
  conflicting: 3,
  compressed_synonym_risk: 4,
  duplicate_candidate: 5,
});

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

function assertConceptArray(concepts) {
  if (!Array.isArray(concepts)) {
    throw new Error('Concept overlap inspection requires a concept array.');
  }

  concepts.forEach((concept, index) => {
    if (!isPlainObject(concept)) {
      throw new Error(`Concept overlap inspection requires concept objects; entry ${index} is invalid.`);
    }
  });
}

function assertUniqueConceptIds(concepts) {
  const conceptIds = concepts.map((concept) => concept.conceptId);
  const duplicates = conceptIds.filter((conceptId, index) => conceptIds.indexOf(conceptId) !== index);

  if (duplicates.length > 0) {
    throw new Error(`Concept overlap inspection requires unique concept IDs: ${[...new Set(duplicates)].join(', ')}.`);
  }
}

function normalizeConceptId(conceptId) {
  return typeof conceptId === 'string' ? conceptId.trim() : '';
}

function sortByConceptId(left, right) {
  return left.localeCompare(right);
}

function sortClassifications(classifications) {
  return [...classifications].sort(
    (left, right) => CLASSIFICATION_SEVERITY[right] - CLASSIFICATION_SEVERITY[left]
      || left.localeCompare(right),
  );
}

function dedupeAndSortStrings(values) {
  return [...new Set(values)].sort(sortByConceptId);
}

function getMatrixKey(leftConceptId, rightConceptId) {
  return `${leftConceptId}->${rightConceptId}`;
}

function getPairKey(leftConceptId, rightConceptId) {
  const [first, second] = [leftConceptId, rightConceptId].sort(sortByConceptId);
  return `${first}::${second}`;
}

function getPairRiskKind(forwardResult, reverseResult) {
  const classifications = [forwardResult.classification, reverseResult.classification];

  if (classifications.some((classification) => BLOCKING_CLASSIFICATIONS.includes(classification))) {
    return 'blocking';
  }

  if (
    forwardResult.requiredBoundaryProof
    || reverseResult.requiredBoundaryProof
    || classifications.some((classification) => ADJACENCY_CLASSIFICATIONS.includes(classification))
  ) {
    return 'boundary_required';
  }

  return 'none';
}

function extractBoundaryTargetId(boundaryNote) {
  const separatorIndex = boundaryNote.indexOf(':');
  return separatorIndex === -1 ? boundaryNote.trim() : boundaryNote.slice(0, separatorIndex).trim();
}

function resolveAdmissionBucket(conceptId) {
  if (LIVE_CONCEPT_IDS.includes(conceptId)) {
    return 'live';
  }

  if (VISIBLE_ONLY_PUBLIC_CONCEPT_IDS.includes(conceptId)) {
    return 'visible_only_public';
  }

  if (REJECTED_CONCEPT_IDS.includes(conceptId)) {
    return 'rejected';
  }

  if (DETAIL_BACKED_CONCEPT_IDS.includes(conceptId)) {
    return 'detail_backed_only';
  }

  return 'untracked';
}

function loadInspectableConceptSet() {
  const conceptIds = fs.readdirSync(conceptsDirectory)
    .filter((fileName) => fileName.endsWith('.json'))
    .filter((fileName) => !NON_CONCEPT_PACKET_FILES.has(fileName))
    .sort()
    .map((fileName) => path.basename(fileName, '.json'));

  const concepts = conceptIds.map((conceptId) => {
    const concept = getConceptById(conceptId);

    if (!concept) {
      throw new Error(`Inspectable concept "${conceptId}" could not be loaded.`);
    }

    return concept;
  });

  return deepFreeze(concepts);
}

function buildDirectionalResultIndex(profiles) {
  const index = new Map();

  profiles.forEach((leftProfile) => {
    profiles.forEach((rightProfile) => {
      if (leftProfile.conceptId === rightProfile.conceptId) {
        return;
      }

      index.set(
        getMatrixKey(leftProfile.conceptId, rightProfile.conceptId),
        compareConceptProfiles(leftProfile, rightProfile),
      );
    });
  });

  return index;
}

function compactDirectionalResult(result) {
  return {
    otherConceptId: result.otherConceptId,
    classification: result.classification,
    requiredBoundaryProof: result.requiredBoundaryProof,
    collidingFields: [...result.collidingFields],
    reasons: [...result.reasons],
    substitutionRiskExamples: [...result.substitutionRiskExamples],
  };
}

function buildPairRecords(conceptIds, directionalResultIndex) {
  const pairRecords = [];

  for (let leftIndex = 0; leftIndex < conceptIds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < conceptIds.length; rightIndex += 1) {
      const leftConceptId = conceptIds[leftIndex];
      const rightConceptId = conceptIds[rightIndex];
      const forwardResult = directionalResultIndex.get(getMatrixKey(leftConceptId, rightConceptId));
      const reverseResult = directionalResultIndex.get(getMatrixKey(rightConceptId, leftConceptId));
      const classifications = sortClassifications(
        dedupeAndSortStrings([forwardResult.classification, reverseResult.classification]),
      );
      const pairRiskKind = getPairRiskKind(forwardResult, reverseResult);

      pairRecords.push({
        pairKey: getPairKey(leftConceptId, rightConceptId),
        leftConceptId,
        rightConceptId,
        classifications,
        pairRiskKind,
        blocking: pairRiskKind === 'blocking',
        boundaryRequired: pairRiskKind === 'boundary_required',
        collidingFields: dedupeAndSortStrings([
          ...forwardResult.collidingFields,
          ...reverseResult.collidingFields,
        ]),
        forward: compactDirectionalResult(forwardResult),
        reverse: compactDirectionalResult(reverseResult),
      });
    }
  }

  return pairRecords;
}

function buildClusters(clusterPrefix, conceptIds, pairRecords, predicate) {
  const relevantPairs = pairRecords.filter(predicate);

  if (relevantPairs.length === 0) {
    return [];
  }

  const adjacency = new Map(conceptIds.map((conceptId) => [conceptId, new Set()]));

  relevantPairs.forEach((pair) => {
    adjacency.get(pair.leftConceptId).add(pair.rightConceptId);
    adjacency.get(pair.rightConceptId).add(pair.leftConceptId);
  });

  const visited = new Set();
  const clusters = [];

  conceptIds.forEach((conceptId) => {
    if (visited.has(conceptId) || adjacency.get(conceptId).size === 0) {
      return;
    }

    const queue = [conceptId];
    const memberIds = [];

    while (queue.length > 0) {
      const currentConceptId = queue.shift();

      if (visited.has(currentConceptId)) {
        continue;
      }

      visited.add(currentConceptId);
      memberIds.push(currentConceptId);

      [...adjacency.get(currentConceptId)]
        .sort(sortByConceptId)
        .forEach((neighborConceptId) => {
          if (!visited.has(neighborConceptId)) {
            queue.push(neighborConceptId);
          }
        });
    }

    const sortedMemberIds = memberIds.sort(sortByConceptId);
    const clusterPairs = relevantPairs
      .filter((pair) => sortedMemberIds.includes(pair.leftConceptId) && sortedMemberIds.includes(pair.rightConceptId));
    const classifications = sortClassifications(
      dedupeAndSortStrings(clusterPairs.flatMap((pair) => pair.classifications)),
    );

    clusters.push({
      clusterId: `${clusterPrefix}_${clusters.length + 1}`,
      conceptIds: sortedMemberIds,
      pairKeys: clusterPairs.map((pair) => pair.pairKey).sort(sortByConceptId),
      pairCount: clusterPairs.length,
      classifications,
    });
  });

  return clusters;
}

function buildMatrixRows(conceptIds, profilesById, directionalResultIndex, pairRecordsByKey) {
  return conceptIds.map((conceptId) => ({
    conceptId,
    admissionBucket: resolveAdmissionBucket(conceptId),
    cells: conceptIds
      .filter((otherConceptId) => otherConceptId !== conceptId)
      .map((otherConceptId) => {
        const result = directionalResultIndex.get(getMatrixKey(conceptId, otherConceptId));
        const reciprocal = directionalResultIndex.get(getMatrixKey(otherConceptId, conceptId));
        const pairRecord = pairRecordsByKey.get(getPairKey(conceptId, otherConceptId));

        return {
          otherConceptId,
          otherAdmissionBucket: resolveAdmissionBucket(otherConceptId),
          classification: result.classification,
          reciprocalClassification: reciprocal.classification,
          requiredBoundaryProof: result.requiredBoundaryProof,
          reciprocalBoundaryProof: reciprocal.requiredBoundaryProof,
          pairRiskKind: pairRecord.pairRiskKind,
          collidingFields: [...result.collidingFields],
          reasons: [...result.reasons],
          substitutionRiskExamples: [...result.substitutionRiskExamples],
        };
      }),
    boundaryNoteCount: profilesById.get(conceptId).boundaryNotes.length,
    forbiddenEquivalenceCount: profilesById.get(conceptId).forbiddenEquivalences.length,
  }));
}

function buildConceptReports(matrixRows, profilesById, pairRecords, adjacencyClusters, conflictClusters) {
  return matrixRows.map((row) => {
    const relatedPairs = pairRecords.filter(
      (pair) => pair.leftConceptId === row.conceptId || pair.rightConceptId === row.conceptId,
    );
    const blockingPairs = relatedPairs.filter((pair) => pair.blocking);
    const boundaryRequiredPairs = relatedPairs.filter((pair) => pair.boundaryRequired);
    const riskyPairs = relatedPairs.filter((pair) => pair.pairRiskKind !== 'none');
    const repeatedCollisionTargetIds = riskyPairs
      .map((pair) => (pair.leftConceptId === row.conceptId ? pair.rightConceptId : pair.leftConceptId))
      .sort(sortByConceptId);
    const highRiskReasons = [];

    if (blockingPairs.length > 0) {
      highRiskReasons.push('blocking_overlap_pairs');
    }

    if (riskyPairs.length > 1) {
      highRiskReasons.push('repeated_collisions');
    }

    const adjacencyClusterIds = adjacencyClusters
      .filter((cluster) => cluster.conceptIds.includes(row.conceptId))
      .map((cluster) => cluster.clusterId);
    const conflictClusterIds = conflictClusters
      .filter((cluster) => cluster.conceptIds.includes(row.conceptId))
      .map((cluster) => cluster.clusterId);
    const profile = profilesById.get(row.conceptId);
    const boundaryTargetIds = profile.boundaryNotes
      .map((note) => extractBoundaryTargetId(note))
      .sort(sortByConceptId);

    return {
      conceptId: row.conceptId,
      admissionBucket: row.admissionBucket,
      boundaryNotes: [...profile.boundaryNotes],
      forbiddenEquivalences: [...profile.forbiddenEquivalences],
      boundaryTargetIds,
      boundaryNoteCount: profile.boundaryNotes.length,
      forbiddenEquivalenceCount: profile.forbiddenEquivalences.length,
      blockingPairCount: blockingPairs.length,
      boundaryRequiredPairCount: boundaryRequiredPairs.length,
      riskyPairCount: riskyPairs.length,
      repeatedCollisionTargetIds,
      highRisk: highRiskReasons.length > 0,
      highRiskReasons,
      adjacencyClusterIds,
      conflictClusterIds,
      comparisons: row.cells,
    };
  });
}

function sortConceptPressure(left, right) {
  return right.blockingPairCount - left.blockingPairCount
    || right.riskyPairCount - left.riskyPairCount
    || right.boundaryNoteCount - left.boundaryNoteCount
    || left.conceptId.localeCompare(right.conceptId);
}

function buildConceptOverlapInspectionReport(concepts = loadInspectableConceptSet()) {
  assertConceptArray(concepts);
  assertUniqueConceptIds(concepts);

  const profiles = concepts
    .map((concept) => normalizeConceptToProfile(concept))
    .sort((left, right) => left.conceptId.localeCompare(right.conceptId));
  const conceptIds = profiles.map((profile) => profile.conceptId);
  const profilesById = new Map(profiles.map((profile) => [profile.conceptId, profile]));
  const directionalResultIndex = buildDirectionalResultIndex(profiles);
  const pairRecords = buildPairRecords(conceptIds, directionalResultIndex);
  const pairRecordsByKey = new Map(pairRecords.map((pair) => [pair.pairKey, pair]));
  const matrix = buildMatrixRows(conceptIds, profilesById, directionalResultIndex, pairRecordsByKey);
  const adjacencyClusters = buildClusters(
    'adjacency_cluster',
    conceptIds,
    pairRecords,
    (pair) => pair.boundaryRequired,
  );
  const conflictClusters = buildClusters(
    'conflict_cluster',
    conceptIds,
    pairRecords,
    (pair) => pair.blocking,
  );
  const conceptReports = buildConceptReports(matrix, profilesById, pairRecords, adjacencyClusters, conflictClusters)
    .sort(sortConceptPressure);
  const conceptsWithMostBoundaryNotes = [...conceptReports]
    .sort((left, right) => right.boundaryNoteCount - left.boundaryNoteCount || left.conceptId.localeCompare(right.conceptId))
    .map((conceptReport) => ({
      conceptId: conceptReport.conceptId,
      admissionBucket: conceptReport.admissionBucket,
      boundaryNoteCount: conceptReport.boundaryNoteCount,
      boundaryTargetIds: [...conceptReport.boundaryTargetIds],
    }));
  const highRiskConcepts = conceptReports
    .filter((conceptReport) => conceptReport.highRisk)
    .map((conceptReport) => ({
      conceptId: conceptReport.conceptId,
      admissionBucket: conceptReport.admissionBucket,
      blockingPairCount: conceptReport.blockingPairCount,
      boundaryRequiredPairCount: conceptReport.boundaryRequiredPairCount,
      riskyPairCount: conceptReport.riskyPairCount,
      repeatedCollisionTargetIds: [...conceptReport.repeatedCollisionTargetIds],
      highRiskReasons: [...conceptReport.highRiskReasons],
    }));
  const repeatedCollisions = conceptReports
    .filter((conceptReport) => conceptReport.repeatedCollisionTargetIds.length > 1)
    .map((conceptReport) => ({
      conceptId: conceptReport.conceptId,
      admissionBucket: conceptReport.admissionBucket,
      repeatedCollisionCount: conceptReport.repeatedCollisionTargetIds.length,
      repeatedCollisionTargetIds: [...conceptReport.repeatedCollisionTargetIds],
    }));

  return deepFreeze({
    scope: 'authored_concept_packets',
    conceptIds: [...conceptIds],
    summary: {
      totalConcepts: conceptIds.length,
      totalPairs: pairRecords.length,
      boundaryRequiredPairCount: pairRecords.filter((pair) => pair.boundaryRequired).length,
      blockingPairCount: pairRecords.filter((pair) => pair.blocking).length,
      adjacencyClusterCount: adjacencyClusters.length,
      conflictClusterCount: conflictClusters.length,
      highRiskConceptCount: highRiskConcepts.length,
      repeatedCollisionConceptCount: repeatedCollisions.length,
    },
    matrix,
    pairRecords,
    adjacencyClusters,
    conflictClusters,
    conceptsWithMostBoundaryNotes,
    highRiskConcepts,
    repeatedCollisions,
    conceptReports,
  });
}

function getConceptOverlapReport(conceptId, overlapInspectionReport = null) {
  const normalizedConceptId = normalizeConceptId(conceptId);

  if (normalizedConceptId === '') {
    throw new Error('Concept overlap report query requires a conceptId.');
  }

  const inspectionReport = overlapInspectionReport ?? buildConceptOverlapInspectionReport();
  const conceptReport = inspectionReport.conceptReports.find(
    (entry) => entry.conceptId === normalizedConceptId,
  );

  if (!conceptReport) {
    throw new Error(`No concept overlap report found for "${normalizedConceptId}".`);
  }

  return conceptReport;
}

module.exports = {
  ADJACENCY_CLASSIFICATIONS,
  BLOCKING_CLASSIFICATIONS,
  buildConceptOverlapInspectionReport,
  getConceptOverlapReport,
  loadInspectableConceptSet,
};
