'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  buildVocabularyBoundaryResponse,
} = require('../../../src/modules/legal-vocabulary/vocabulary-boundary');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const draftRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/draft_meanings');
const previewRoot = path.join(draftRoot, 'writeback_preview');
const appliedRoot = path.join(draftRoot, 'writeback_applied');

const inputPaths = Object.freeze({
  preview: path.join(previewRoot, 'batch_001_writeback_preview_NOT_APPLIED.json'),
  validationReport: path.join(previewRoot, 'batch_001_writeback_validation_report.json'),
  meaningCoverageAudit: path.join(repoRoot, 'docs/boundary/meaning-coverage-audit.json'),
  meaningCoverageSummary: path.join(repoRoot, 'docs/boundary/meaning-coverage-summary.md'),
});

const outputPaths = Object.freeze({
  reportMarkdown: path.join(appliedRoot, 'batch_001_applied_writeback_report.md'),
  appliedDiffJson: path.join(appliedRoot, 'batch_001_applied_diff.json'),
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

function normalizeForComparison(value) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[.,;:]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function buildCurrentEntryMap() {
  const response = buildVocabularyBoundaryResponse();
  const entries = new Map();
  response.entries.forEach((entry) => {
    entries.set(normalizeForComparison(entry.term), entry);
  });

  return entries;
}

function buildAppliedDiff() {
  const preview = readJson(inputPaths.preview);
  const validationReport = readJson(inputPaths.validationReport);
  const audit = readJson(inputPaths.meaningCoverageAudit);
  const entriesByTerm = buildCurrentEntryMap();

  const rows = preview.candidates.map((candidate) => {
    const currentEntry = entriesByTerm.get(candidate.normalizedTerm);
    const appliedMeaningInLaw = currentEntry?.meaningInLaw ?? null;
    const applied = appliedMeaningInLaw === candidate.proposedMeaningInLaw;

    return {
      term: candidate.term,
      normalizedTerm: candidate.normalizedTerm,
      targetDatasetIdentifier: candidate.targetDatasetIdentifier,
      targetMeaningSourcePath: candidate.targetMeaningSourcePath,
      previousMeaningInLaw: candidate.currentMeaningInLaw,
      proposedMeaningInLaw: candidate.proposedMeaningInLaw,
      appliedMeaningInLaw,
      changeType: candidate.changeType,
      reviewDecisionSource: candidate.reviewDecisionSource,
      status: applied ? 'APPLIED' : 'FAILED',
      failureReason: applied ? null : 'Applied boundary response meaning does not match proposed meaning.',
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
      runtimeCoreCollisions: validationReport.counts.runtimeCoreCollisionCount,
      unexpectedlyNonEmptyCurrentMeanings: validationReport.counts.unexpectedlyNonEmptyCurrentMeaningCount,
    },
    failedRows,
    rows,
  };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function buildReportMarkdown(appliedDiff) {
  const rows = appliedDiff.rows.map((row) => [
    row.term,
    row.changeType,
    row.reviewDecisionSource,
    row.status,
    row.proposedMeaningInLaw,
  ]);

  return [
    '# Batch 001 Applied Writeback Report',
    '',
    'Scope: vocabulary boundary meaning source only. Runtime ontology, concept packets, and live concept meanings were not modified.',
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
    '',
    '## Applied Rows',
    '',
    markdownTable(
      ['Term', 'Change type', 'Decision source', 'Status', 'Meaning in law'],
      rows,
    ),
    '',
  ].join('\n');
}

function main() {
  fs.mkdirSync(appliedRoot, { recursive: true });
  const appliedDiff = buildAppliedDiff();
  writeJson(outputPaths.appliedDiffJson, appliedDiff);
  fs.writeFileSync(outputPaths.reportMarkdown, buildReportMarkdown(appliedDiff), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
