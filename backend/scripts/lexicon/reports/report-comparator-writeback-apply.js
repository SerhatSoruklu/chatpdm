'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  buildVocabularyBoundaryResponse,
} = require('../../../src/modules/legal-vocabulary/vocabulary-boundary');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const multiSourceReportsRoot = path.join(
  workspaceRoot,
  'vocabulary_reference_lexicons/multi_source/reports',
);

const inputPaths = Object.freeze({
  preview: path.join(multiSourceReportsRoot, 'comparator_writeback_preview_NOT_APPLIED.json'),
  validationReport: path.join(multiSourceReportsRoot, 'comparator_writeback_validation_report.json'),
  meaningCoverageAudit: path.join(repoRoot, 'docs/boundary/meaning-coverage-audit.json'),
});

const outputPaths = Object.freeze({
  appliedDiffJson: path.join(multiSourceReportsRoot, 'comparator_writeback_applied_diff.json'),
  reportMarkdown: path.join(multiSourceReportsRoot, 'comparator_writeback_applied_report.md'),
});

function toWindowsPath(filePath) {
  if (filePath.startsWith('/mnt/c/')) {
    return `C:\\${filePath.slice('/mnt/c/'.length).replaceAll('/', '\\')}`;
  }

  return filePath;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function buildCurrentEntryMap() {
  const response = buildVocabularyBoundaryResponse();
  return new Map(response.entries.map((entry) => [entry.term, entry]));
}

function buildDuplicateSelectedTargetGroups(candidates) {
  const termsByTarget = new Map();
  candidates.forEach((candidate) => {
    if (!candidate.targetDatasetIdentifier) {
      return;
    }
    if (!termsByTarget.has(candidate.targetDatasetIdentifier)) {
      termsByTarget.set(candidate.targetDatasetIdentifier, []);
    }
    termsByTarget.get(candidate.targetDatasetIdentifier).push(candidate.term);
  });

  return [...termsByTarget.entries()]
    .filter(([, terms]) => terms.length > 1)
    .map(([targetDatasetIdentifier, terms]) => ({
      targetDatasetIdentifier,
      terms,
    }));
}

function buildAppliedDiff() {
  const preview = readJson(inputPaths.preview);
  const validationReport = readJson(inputPaths.validationReport);
  const audit = readJson(inputPaths.meaningCoverageAudit);
  const entriesByTerm = buildCurrentEntryMap();
  const duplicateSelectedTargetGroups = buildDuplicateSelectedTargetGroups(preview.candidates);

  const rows = preview.candidates.map((candidate) => {
    const currentEntry = entriesByTerm.get(candidate.term);
    const appliedMeaningInLaw = currentEntry?.meaningInLaw ?? null;
    const applied = appliedMeaningInLaw === candidate.proposedMeaningInLaw;

    return {
      term: candidate.term,
      normalizedTerm: candidate.normalizedTerm,
      comparatorDecisionType: candidate.comparatorDecisionType,
      targetDatasetIdentifier: candidate.targetDatasetIdentifier,
      selectedTargetDatasetMapping: candidate.selectedTargetDatasetMapping,
      targetMeaningSourcePath: candidate.targetMeaningSourcePath,
      previousMeaningInLaw: candidate.currentMeaningInLaw,
      proposedMeaningInLaw: candidate.proposedMeaningInLaw,
      appliedMeaningInLaw,
      changeType: candidate.changeType,
      reviewDecisionSource: candidate.reviewDecisionSource,
      sourceProvenancePointers: candidate.sourceProvenancePointers,
      status: applied ? 'APPLIED' : 'FAILED',
      failureReason: applied ? null : 'Exact boundary entry meaning does not match proposed comparator meaning.',
    };
  });
  const failedRows = rows.filter((row) => row.status !== 'APPLIED');

  return {
    generatedAt: new Date().toISOString(),
    sourcePreviewStatus: preview.status,
    status: failedRows.length === 0 ? 'APPLIED' : 'PARTIAL_FAILURE',
    boundaryDiscipline: {
      runtimeOntologyChanged: false,
      conceptPacketsTouched: false,
      liveConceptMeaningsTouched: false,
      vocabularyBoundaryMeaningSourceChanged: true,
      aliasFanOutPerformed: false,
      liveVocabularyDatasetChanged: false,
    },
    counts: {
      candidateCount: preview.candidates.length,
      rowsChanged: rows.filter((row) => row.status === 'APPLIED').length,
      failedWrites: failedRows.length,
      authoredMeaningCountAfterApply: audit.counts.authoredMeaningCount,
      missingMeaningCountAfterApply: audit.counts.missingMeaningCount,
      rejectedIncludedCount: validationReport.counts.rejectedIncludedCount,
      targetMappingFailures: validationReport.counts.notFoundInTargetDatasetCount,
      duplicateTargetMappings: validationReport.counts.duplicateTargetMappingCount,
      duplicateSelectedTargetGroups: duplicateSelectedTargetGroups.length,
      runtimeCoreCollisions: validationReport.counts.runtimeCoreCollisionCount,
      currentMeaningExpectationFailures: validationReport.counts.currentMeaningExpectationFailureCount,
      missingAndersonProvenance: validationReport.counts.missingAndersonProvenanceCount,
      byChangeType: validationReport.counts.byChangeType,
      byComparatorDecisionType: validationReport.counts.byComparatorDecisionType,
    },
    duplicateSelectedTargetGroups,
    failedRows,
    rows,
  };
}

function escapeMarkdownCell(value) {
  return String(value ?? 'NULL').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escapeMarkdownCell).join(' | ')} |`),
  ].join('\n');
}

function buildReportMarkdown(appliedDiff) {
  const rows = appliedDiff.rows.map((row) => [
    row.term,
    row.comparatorDecisionType,
    row.changeType,
    row.reviewDecisionSource,
    row.status,
    row.proposedMeaningInLaw,
  ]);
  const duplicateRows = appliedDiff.duplicateSelectedTargetGroups.map((group) => [
    group.targetDatasetIdentifier,
    group.terms.join(', '),
  ]);

  return [
    '# Comparator Applied Writeback Report',
    '',
    'Scope: vocabulary boundary meaning source only. Runtime ontology, concept packets, live concept meanings, and the live vocabulary dataset were not modified. Alias fan-out was not performed.',
    '',
    '## Counts',
    '',
    `- Candidate count: ${appliedDiff.counts.candidateCount}`,
    `- Rows changed: ${appliedDiff.counts.rowsChanged}`,
    `- Failed writes: ${appliedDiff.counts.failedWrites}`,
    `- Authored meaning count after apply: ${appliedDiff.counts.authoredMeaningCountAfterApply}`,
    `- Missing meaning count after apply: ${appliedDiff.counts.missingMeaningCountAfterApply}`,
    `- Rejected terms included: ${appliedDiff.counts.rejectedIncludedCount}`,
    `- Target mapping failures: ${appliedDiff.counts.targetMappingFailures}`,
    `- Runtime/core collisions: ${appliedDiff.counts.runtimeCoreCollisions}`,
    `- Duplicate selected target groups: ${appliedDiff.counts.duplicateSelectedTargetGroups}`,
    `- Missing Anderson provenance in source preview: ${appliedDiff.counts.missingAndersonProvenance}`,
    '',
    '## Applied Rows',
    '',
    markdownTable(
      ['Term', 'Comparator type', 'Change type', 'Decision source', 'Status', 'Meaning in law'],
      rows,
    ),
    '',
    '## Alias Target Caution',
    '',
    duplicateRows.length > 0
      ? markdownTable(['Selected target row', 'Boundary terms'], duplicateRows)
      : 'No duplicate selected target rows detected.',
    '',
  ].join('\n');
}

function main() {
  const appliedDiff = buildAppliedDiff();
  writeJson(outputPaths.appliedDiffJson, appliedDiff);
  fs.writeFileSync(outputPaths.reportMarkdown, buildReportMarkdown(appliedDiff), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
