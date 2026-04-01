'use strict';

const assert = require('node:assert/strict');

const {
  buildConceptOverlapInspectionReport,
  getConceptOverlapReport,
} = require('../src/modules/concepts/concept-overlap-report-service');
const { getConceptById } = require('../src/modules/concepts/concept-loader');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireConcept(conceptId) {
  const concept = getConceptById(conceptId);
  assert.notEqual(concept, null, `Missing concept fixture for ${conceptId}.`);
  return concept;
}

function verifyCurrentReportIntegrity() {
  const report = buildConceptOverlapInspectionReport();

  assert.equal(report.scope, 'authored_concept_packets', 'overlap inspection scope mismatch.');
  assert.equal(report.summary.totalConcepts, 10, 'current authored concept packet count mismatch.');
  assert.equal(report.matrix.length, 10, 'matrix row count mismatch.');
  assert.equal(report.summary.blockingPairCount, 1, 'current authored concept set blocking pair count mismatch.');
  assert.equal(report.conflictClusters.length, 1, 'current authored concept set should produce one conflict cluster.');
  assert.equal(report.conceptsWithMostBoundaryNotes[0].conceptId, 'violation', 'violation should currently carry the most boundary notes.');
  assert.equal(report.conceptsWithMostBoundaryNotes[0].boundaryNoteCount, 4, 'violation boundary note count mismatch.');

  const governanceAdjacencyCluster = report.adjacencyClusters.find(
    (cluster) => ['authority', 'legitimacy', 'power'].every((conceptId) => cluster.conceptIds.includes(conceptId)),
  );
  assert.notEqual(governanceAdjacencyCluster, undefined, 'authority, power, and legitimacy should form an adjacency cluster.');

  const interactionConflictCluster = report.conflictClusters.find(
    (cluster) => ['agreement', 'breach'].every((conceptId) => cluster.conceptIds.includes(conceptId)),
  );
  assert.notEqual(interactionConflictCluster, undefined, 'agreement and breach should currently form a conflict cluster.');

  const authorityReport = getConceptOverlapReport('authority', report);
  assert.equal(authorityReport.highRisk, true, 'authority should be highlighted as high risk.');
  assert.equal(authorityReport.boundaryRequiredPairCount, 2, 'authority should currently have two boundary-required pairs.');

  const authorityToPower = authorityReport.comparisons.find((entry) => entry.otherConceptId === 'power');
  assert.notEqual(authorityToPower, undefined, 'authority report should include power.');
  assert.equal(authorityToPower.classification, 'adjacent', 'authority -> power classification mismatch.');

  const authorityToLegitimacy = authorityReport.comparisons.find((entry) => entry.otherConceptId === 'legitimacy');
  assert.notEqual(authorityToLegitimacy, undefined, 'authority report should include legitimacy.');
  assert.equal(authorityToLegitimacy.classification, 'adjacent', 'authority -> legitimacy classification mismatch.');

  assert.equal(
    report.highRiskConcepts.some((entry) => entry.conceptId === 'authority'),
    true,
    'high-risk concepts should include authority.',
  );
  assert.equal(
    report.repeatedCollisions.some((entry) => entry.conceptId === 'power'),
    true,
    'repeated-collision concepts should include power.',
  );
  assert.equal(
    report.highRiskConcepts.some((entry) => entry.conceptId === 'agreement' && entry.blockingPairCount === 1),
    true,
    'high-risk concepts should include agreement with one blocking pair.',
  );

  process.stdout.write('PASS concept_overlap_report_current_integrity\n');
}

function verifySyntheticConflictCluster() {
  const authority = requireConcept('authority');
  const power = requireConcept('power');
  const powerShadow = clone(power);
  powerShadow.conceptId = 'power-shadow';
  powerShadow.concept = 'power-shadow';
  powerShadow.title = 'Power Shadow';

  const report = buildConceptOverlapInspectionReport([authority, power, powerShadow]);

  assert.equal(report.summary.blockingPairCount, 1, 'synthetic duplicate should create one blocking pair.');
  assert.equal(report.conflictClusters.length, 1, 'synthetic duplicate should create one conflict cluster.');

  const conflictCluster = report.conflictClusters[0];
  assert.deepEqual(
    conflictCluster.conceptIds,
    ['power', 'power-shadow'],
    'synthetic conflict cluster membership mismatch.',
  );

  const pairRecord = report.pairRecords.find((entry) => entry.pairKey === 'power::power-shadow');
  assert.notEqual(pairRecord, undefined, 'synthetic duplicate pair should be present in pair records.');
  assert.equal(pairRecord.blocking, true, 'synthetic duplicate pair should be blocking.');
  assert.equal(
    pairRecord.classifications.includes('duplicate_candidate'),
    true,
    'synthetic duplicate pair should include duplicate_candidate classification.',
  );

  const powerShadowReport = getConceptOverlapReport('power-shadow', report);
  assert.equal(powerShadowReport.highRisk, true, 'synthetic duplicate should be highlighted as high risk.');
  assert.equal(powerShadowReport.blockingPairCount, 1, 'synthetic duplicate should report one blocking pair.');

  process.stdout.write('PASS concept_overlap_report_synthetic_conflict_cluster\n');
}

function verifyUnknownConceptFails() {
  const report = buildConceptOverlapInspectionReport();

  assert.throws(
    () => getConceptOverlapReport('missing-concept', report),
    /No concept overlap report found/,
    'missing concept overlap report query should fail deterministically.',
  );

  process.stdout.write('PASS concept_overlap_report_missing_concept_query_fails\n');
}

function main() {
  verifyCurrentReportIntegrity();
  verifySyntheticConflictCluster();
  verifyUnknownConceptFails();
  process.stdout.write('ChatPDM concept overlap report service verification passed.\n');
}

main();
