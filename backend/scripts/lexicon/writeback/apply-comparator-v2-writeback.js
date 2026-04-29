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
  preview: path.join(multiSourceReportsRoot, 'comparator_v2_writeback_preview_NOT_APPLIED.json'),
  validationReport: path.join(multiSourceReportsRoot, 'comparator_v2_writeback_validation_report.json'),
  meaningCoverageAudit: path.join(repoRoot, 'docs/boundary/meaning-coverage-audit.json'),
});

const outputPaths = Object.freeze({
  appliedDiffJson: path.join(multiSourceReportsRoot, 'comparator_v2_writeback_applied_diff.json'),
  reportMarkdown: path.join(multiSourceReportsRoot, 'comparator_v2_writeback_applied_report.md'),
});

const semanticOverrideTargetPath = path.join(
  repoRoot,
  'backend/src/modules/legal-vocabulary/vocabulary-boundary.js',
);

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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeJsSingleQuoted(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function keyLiteral(term) {
  return /^[a-z][a-z0-9]*$/.test(term) ? term : `'${escapeJsSingleQuoted(term)}'`;
}

function buildCurrentEntryMap() {
  const response = buildVocabularyBoundaryResponse();
  return new Map(response.entries.map((entry) => [entry.term, entry]));
}

function extractOverrideRange(sourceText) {
  const startNeedle = 'const TERM_SEMANTIC_OVERRIDES = Object.freeze({';
  const endNeedle = '\n});\n\nfunction getTermSemanticOverride';
  const start = sourceText.indexOf(startNeedle);
  const end = sourceText.indexOf(endNeedle, start);

  if (start === -1 || end === -1) {
    throw new Error('Could not locate TERM_SEMANTIC_OVERRIDES block.');
  }

  return {
    start,
    contentStart: start + startNeedle.length,
    end,
  };
}

function termEntryRegex(term) {
  const key = escapeRegExp(keyLiteral(term));
  return new RegExp(
    `(  ${key}: Object\\.freeze\\(\\{\\n    meaningInLaw: )'((?:\\\\'|[^'])*)'([\\s\\S]*?\\n  \\}\\),)`,
  );
}

function entrySnippet(term, meaningInLaw) {
  return [
    `  ${keyLiteral(term)}: Object.freeze({`,
    `    meaningInLaw: '${escapeJsSingleQuoted(meaningInLaw)}',`,
    '  }),',
    '',
  ].join('\n');
}

function insertNewEntry(sourceText, term, meaningInLaw) {
  const range = extractOverrideRange(sourceText);
  const block = sourceText.slice(range.contentStart, range.end);
  const entryMatches = [...block.matchAll(/\n  ((?:'[^']+'|[a-z][a-z0-9]*)): Object\.freeze\(\{/g)];
  const normalizedTerm = term.toLowerCase();
  const insertion = `\n${entrySnippet(term, meaningInLaw)}`;

  for (const match of entryMatches) {
    const rawKey = match[1];
    const existingTerm = rawKey.startsWith("'") ? rawKey.slice(1, -1) : rawKey;
    if (existingTerm.toLowerCase().localeCompare(normalizedTerm) > 0) {
      const absoluteIndex = range.contentStart + match.index;
      return `${sourceText.slice(0, absoluteIndex)}${insertion}${sourceText.slice(absoluteIndex)}`;
    }
  }

  return `${sourceText.slice(0, range.end)}${insertion}${sourceText.slice(range.end)}`;
}

function applyCandidateToSource(sourceText, candidate) {
  const regex = termEntryRegex(candidate.term);
  const match = regex.exec(sourceText);
  const escapedMeaning = escapeJsSingleQuoted(candidate.proposedMeaningInLaw);

  if (!match) {
    if (candidate.changeType !== 'new_fill') {
      throw new Error(`Missing existing semantic override for revision term "${candidate.term}".`);
    }
    return {
      sourceText: insertNewEntry(sourceText, candidate.term, candidate.proposedMeaningInLaw),
      operation: 'inserted',
    };
  }

  const existingLiteral = match[2];
  if (existingLiteral === escapedMeaning) {
    return {
      sourceText,
      operation: 'already_current',
    };
  }

  return {
    sourceText: sourceText.replace(regex, `$1'${escapedMeaning}'$3`),
    operation: 'updated',
  };
}

function assertPreviewIsClean(validationReport) {
  if (validationReport.status !== 'NOT_APPLIED') {
    throw new Error(`Expected NOT_APPLIED validation report, got ${validationReport.status}.`);
  }
  if (validationReport.cleanForExplicitApproval !== true) {
    throw new Error('Comparator v2 preview is not clean for explicit approval.');
  }
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

function applyWriteback() {
  const preview = readJson(inputPaths.preview);
  const validationReport = readJson(inputPaths.validationReport);
  assertPreviewIsClean(validationReport);

  const beforeEntriesByTerm = buildCurrentEntryMap();
  let sourceText = fs.readFileSync(semanticOverrideTargetPath, 'utf8');
  const operationsByTerm = new Map();

  preview.candidates.forEach((candidate) => {
    const result = applyCandidateToSource(sourceText, candidate);
    sourceText = result.sourceText;
    operationsByTerm.set(candidate.term, result.operation);
  });

  fs.writeFileSync(semanticOverrideTargetPath, sourceText, 'utf8');
  delete require.cache[require.resolve('../../../src/modules/legal-vocabulary/vocabulary-boundary')];
  const {
    buildVocabularyBoundaryResponse: buildUpdatedVocabularyBoundaryResponse,
  } = require('../../../src/modules/legal-vocabulary/vocabulary-boundary');
  const afterEntriesByTerm = new Map(
    buildUpdatedVocabularyBoundaryResponse().entries.map((entry) => [entry.term, entry]),
  );

  const rows = preview.candidates.map((candidate) => {
    const previousMeaningInLaw = beforeEntriesByTerm.get(candidate.term)?.meaningInLaw ?? null;
    const appliedMeaningInLaw = afterEntriesByTerm.get(candidate.term)?.meaningInLaw ?? null;
    const applied = appliedMeaningInLaw === candidate.proposedMeaningInLaw;

    return {
      term: candidate.term,
      normalizedTerm: candidate.normalizedTerm,
      comparatorDecisionType: candidate.comparatorDecisionType,
      targetDatasetIdentifier: candidate.targetDatasetIdentifier,
      selectedTargetDatasetMapping: candidate.selectedTargetDatasetMapping,
      targetMeaningSourcePath: candidate.targetMeaningSourcePath,
      previousMeaningInLaw,
      proposedMeaningInLaw: candidate.proposedMeaningInLaw,
      appliedMeaningInLaw,
      changeType: candidate.changeType,
      reviewDecisionSource: candidate.reviewDecisionSource,
      sourceBasis: candidate.sourceBasis,
      sourceProvenancePointers: candidate.sourceProvenancePointers,
      sourceProvenanceDerivation: candidate.sourceProvenanceDerivation,
      exactTargetRowOnly: candidate.exactTargetRowOnly,
      aliasFanOutPerformed: false,
      operation: operationsByTerm.get(candidate.term),
      status: applied ? 'APPLIED' : 'FAILED',
      failureReason: applied ? null : 'Exact boundary entry meaning does not match proposed comparator v2 meaning.',
    };
  });
  const failedRows = rows.filter((row) => row.status !== 'APPLIED');
  const changedRows = rows.filter((row) => row.previousMeaningInLaw !== row.appliedMeaningInLaw);
  const duplicateSelectedTargetGroups = buildDuplicateSelectedTargetGroups(preview.candidates);

  return {
    generatedAt: new Date().toISOString(),
    sourcePreviewStatus: preview.status,
    status: failedRows.length === 0 ? 'APPLIED' : 'PARTIAL_FAILURE',
    boundaryDiscipline: {
      runtimeOntologyChanged: false,
      conceptPacketsTouched: false,
      liveConceptMeaningsTouched: false,
      vocabularyBoundaryMeaningSourceChanged: changedRows.length > 0,
      vocabularyMeaningSourcesChangedManually: false,
      aliasFanOutPerformed: false,
      exactTargetRowsOnly: true,
      liveVocabularyDatasetChanged: false,
    },
    counts: {
      candidateCount: preview.candidates.length,
      appliedRows: rows.filter((row) => row.status === 'APPLIED').length,
      rowsChanged: changedRows.length,
      failedWrites: failedRows.length,
      rejectedIncludedCount: validationReport.counts.rejectedIncludedCount,
      deferredIncludedCount: validationReport.counts.deferredIncludedCount,
      targetMappingFailures: validationReport.counts.targetMappingFailureCount,
      runtimeCoreCollisions: validationReport.counts.runtimeCoreCollisionCount,
      currentMeaningExpectationFailures: validationReport.counts.currentMeaningExpectationFailureCount,
      missingBlackProvenanceWhereRequired: validationReport.counts.missingBlackProvenanceWhereRequiredCount,
      missingAndersonProvenanceWhereRequired: validationReport.counts.missingAndersonProvenanceWhereRequiredCount,
      missingOsbornProvenanceWhereRequired: validationReport.counts.missingOsbornProvenanceWhereRequiredCount,
      aliasFanOutCount: validationReport.counts.aliasFanOutCount,
      duplicateSelectedTargetGroups: duplicateSelectedTargetGroups.length,
      byChangeType: validationReport.counts.byChangeType,
      byComparatorDecisionType: validationReport.counts.byComparatorDecisionType,
      bySourceBasis: validationReport.counts.bySourceBasis,
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
    row.sourceBasis,
    row.operation,
    row.status,
    row.proposedMeaningInLaw,
  ]);
  const duplicateRows = appliedDiff.duplicateSelectedTargetGroups.map((group) => [
    group.targetDatasetIdentifier,
    group.terms.join(', '),
  ]);

  return [
    '<!-- markdownlint-disable MD013 -->',
    '',
    '# Comparator V2 Applied Writeback Report',
    '',
    'Scope: vocabulary boundary meaning source only. Runtime ontology, concept packets, live concept meanings, generated meaning-source storage, and the live vocabulary dataset were not modified manually. Each candidate was applied only to its selected exact target row; no alias fan-out was performed.',
    '',
    '## Counts',
    '',
    `- Candidate count: ${appliedDiff.counts.candidateCount}`,
    `- Applied rows: ${appliedDiff.counts.appliedRows}`,
    `- Rows changed: ${appliedDiff.counts.rowsChanged}`,
    `- Failed writes: ${appliedDiff.counts.failedWrites}`,
    `- Rejected included: ${appliedDiff.counts.rejectedIncludedCount}`,
    `- Deferred included: ${appliedDiff.counts.deferredIncludedCount}`,
    `- Target mapping failures: ${appliedDiff.counts.targetMappingFailures}`,
    `- Runtime/core collisions: ${appliedDiff.counts.runtimeCoreCollisions}`,
    `- Current meaning expectation failures: ${appliedDiff.counts.currentMeaningExpectationFailures}`,
    `- Missing Black provenance where required: ${appliedDiff.counts.missingBlackProvenanceWhereRequired}`,
    `- Missing Anderson provenance where required: ${appliedDiff.counts.missingAndersonProvenanceWhereRequired}`,
    `- Missing Osborn provenance where required: ${appliedDiff.counts.missingOsbornProvenanceWhereRequired}`,
    `- Alias fan-out: ${appliedDiff.counts.aliasFanOutCount}`,
    '',
    '## Applied Rows',
    '',
    markdownTable(
      ['Term', 'Comparator type', 'Change type', 'Decision source', 'Source basis', 'Operation', 'Status', 'Meaning in law'],
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
  const appliedDiff = applyWriteback();
  writeJson(outputPaths.appliedDiffJson, appliedDiff);
  fs.writeFileSync(outputPaths.reportMarkdown, buildReportMarkdown(appliedDiff), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
