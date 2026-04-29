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
  preview: path.join(previewRoot, 'batch_005_writeback_preview_NOT_APPLIED.json'),
  validationReport: path.join(previewRoot, 'batch_005_writeback_validation_report.json'),
  meaningCoverageAudit: path.join(repoRoot, 'docs/boundary/meaning-coverage-audit.json'),
  meaningCoverageSummary: path.join(repoRoot, 'docs/boundary/meaning-coverage-summary.md'),
});

const outputPaths = Object.freeze({
  reportMarkdown: path.join(appliedRoot, 'batch_005_applied_writeback_report.md'),
  appliedDiffJson: path.join(appliedRoot, 'batch_005_applied_diff.json'),
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

function countBy(records, key) {
  return records.reduce((counts, record) => {
    const value = record[key] ?? 'unknown';
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function buildAppliedDiff() {
  const preview = readJson(inputPaths.preview);
  const validationReport = readJson(inputPaths.validationReport);
  const audit = readJson(inputPaths.meaningCoverageAudit);
  const entriesByExactTerm = buildCurrentEntryMap();
  const duplicateSelectedTargetGroups = buildDuplicateSelectedTargetGroups(preview.candidates);

  const rows = preview.candidates.map((candidate) => {
    const currentEntry = entriesByExactTerm.get(candidate.term);
    const appliedMeaningInLaw = currentEntry?.meaningInLaw ?? null;
    const applied = appliedMeaningInLaw === candidate.proposedMeaningInLaw;

    return {
      term: candidate.term,
      normalizedTerm: candidate.normalizedTerm,
      targetDatasetIdentifier: candidate.targetDatasetIdentifier,
      selectedTargetDatasetMapping: candidate.selectedTargetDatasetMapping,
      targetMeaningSourcePath: candidate.targetMeaningSourcePath,
      previousMeaningInLaw: candidate.currentMeaningInLaw,
      proposedMeaningInLaw: candidate.proposedMeaningInLaw,
      appliedMeaningInLaw,
      changeType: candidate.changeType,
      reviewDecisionSource: candidate.reviewDecisionSource,
      sourceBasis: candidate.sourceBasis,
      comparatorUsed: candidate.comparatorUsed,
      provenancePointers: candidate.provenancePointers,
      status: applied ? 'APPLIED' : 'FAILED',
      failureReason: applied ? null : 'Exact boundary entry meaning does not match proposed meaning.',
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
      exactTargetRowsOnly: true,
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
      unexpectedlyNonEmptyCurrentMeanings: validationReport.counts.unexpectedlyNonEmptyCurrentMeaningCount,
      missingBlackProvenance: validationReport.counts.missingBlackProvenanceCount,
      missingRequiredAndersonProvenance: validationReport.counts.missingRequiredAndersonProvenanceCount,
      byChangeType: countBy(rows, 'changeType'),
      bySourceBasis: countBy(rows, 'sourceBasis'),
      byReviewDecisionSource: countBy(rows, 'reviewDecisionSource'),
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
    row.changeType,
    row.reviewDecisionSource,
    row.sourceBasis,
    row.comparatorUsed,
    row.status,
    row.proposedMeaningInLaw,
  ]);
  const duplicateRows = appliedDiff.duplicateSelectedTargetGroups.map((group) => [
    group.targetDatasetIdentifier,
    group.terms.join(', '),
  ]);

  return [
    '# Batch 005 Applied Writeback Report',
    '',
    'Scope: vocabulary boundary meaning source only. Runtime ontology, concept packets, and live concept meanings were not modified. Each candidate was applied only to its selected exact target row; no alias fan-out was performed.',
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
    `- Unexpected non-empty current meanings: ${appliedDiff.counts.unexpectedlyNonEmptyCurrentMeanings}`,
    `- Missing Black provenance in preview: ${appliedDiff.counts.missingBlackProvenance}`,
    `- Missing required Anderson provenance in preview: ${appliedDiff.counts.missingRequiredAndersonProvenance}`,
    `- Duplicate selected target groups: ${appliedDiff.counts.duplicateSelectedTargetGroups}`,
    '',
    '## Source Basis',
    '',
    `- Black only: ${appliedDiff.counts.bySourceBasis.black_only ?? 0}`,
    `- Black plus Anderson: ${appliedDiff.counts.bySourceBasis.black_plus_anderson ?? 0}`,
    '',
    '## Applied Rows',
    '',
    markdownTable(
      ['Term', 'Change type', 'Decision source', 'Source basis', 'Comparator used', 'Status', 'Meaning in law'],
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
  fs.mkdirSync(appliedRoot, { recursive: true });
  const appliedDiff = buildAppliedDiff();
  writeJson(outputPaths.appliedDiffJson, appliedDiff);
  fs.writeFileSync(outputPaths.reportMarkdown, buildReportMarkdown(appliedDiff), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
