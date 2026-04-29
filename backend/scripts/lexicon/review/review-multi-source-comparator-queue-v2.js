'use strict';

const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const multiSourceReportsRoot = path.join(
  workspaceRoot,
  'vocabulary_reference_lexicons/multi_source/reports',
);

const inputPaths = Object.freeze({
  comparatorQueueV2: path.join(multiSourceReportsRoot, 'multi_source_comparator_review_queue_v2.json'),
  comparatorSummaryV2: path.join(multiSourceReportsRoot, 'multi_source_comparator_review_summary_v2.md'),
});

const outputPaths = Object.freeze({
  approvedReopen: path.join(multiSourceReportsRoot, 'comparator_review_v2_approved_reopen.json'),
  approvedRevisionReview: path.join(multiSourceReportsRoot, 'comparator_review_v2_approved_revision_review.json'),
  confirmKeep: path.join(multiSourceReportsRoot, 'comparator_review_v2_confirm_keep.json'),
  stillSkip: path.join(multiSourceReportsRoot, 'comparator_review_v2_still_skip.json'),
  decisionsMarkdown: path.join(multiSourceReportsRoot, 'comparator_review_v2_decisions.md'),
});

const DECISION_BY_BUCKET = Object.freeze({
  reopen_from_skip_or_reject: 'approve_reopen',
  candidate_revision_of_authored_meaning: 'approve_revision_review',
  second_source_confirmation: 'confirm_keep',
  still_not_safe: 'still_skip',
});

const REVIEW_REASON_PREFIX = Object.freeze({
  approve_reopen: 'Approved for reopen review: Black plus Anderson/Osborn comparator evidence is sufficient for a draft/review pass, but this does not author a meaning.',
  approve_revision_review: 'Approved for revision review: Anderson/Osborn exact-term comparator evidence may narrow, correct, or improve an already-authored meaning, but this does not change meaning text.',
  confirm_keep: 'Confirmed keep: Anderson/Osborn provides exact-term second-source support without requiring revision in this review pass.',
  still_skip: 'Still skip: Black plus Anderson/Osborn support is absent, noisy, indirect, or insufficient for safe reopen/revision in this pass.',
});

const PRIORITY_TERMS = Object.freeze([
  'bequest',
  'employment',
  'pardon',
  'surplusage',
  'probation',
  'representation',
  'debenture',
  'conversion',
  'relief',
  'subject',
  'usufruct',
  'ward',
  'security',
  'occupancy',
  'premium',
  'cohabitation',
]);

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
  return String(value ?? '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[.,;:]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function reviewRecord(record) {
  const decision = DECISION_BY_BUCKET[record.queueBucket];
  if (!decision) {
    throw new Error(`Unknown comparator queue v2 bucket: ${record.queueBucket}`);
  }

  return {
    term: record.term,
    normalizedTerm: record.normalizedTerm,
    currentStatus: record.currentStatus,
    decision,
    reason: `${REVIEW_REASON_PREFIX[decision]} ${record.reason}`,
    currentMeaning: record.currentMeaning,
    sourceSupportBasis: record.sourceSupportBasis,
    blackSupportSummary: record.blackSupportSummary,
    andersonSupportSummary: record.andersonSupportSummary,
    osbornSupportSummary: record.osbornSupportSummary,
    osbornComparisonFlags: record.osbornComparisonFlags,
    osbornContradictsOrNarrowsAnderson: record.osbornContradictsOrNarrowsAnderson,
    osbornNoisySnippetCount: record.osbornNoisySnippetCount,
    osbornNoisySnippets: record.osbornNoisySnippets,
    sourceProvenancePointers: record.sourceProvenancePointers,
    family: record.family,
    bucket: record.bucket,
    riskTier: record.riskTier,
    aliasCaution: record.aliasCaution,
    reviewSourceBucket: record.queueBucket,
    reviewStatuses: record.reviewStatuses,
    batches: record.batches,
    historicallyNarrow: record.historicallyNarrow,
    reviewConfidence: record.reviewConfidence,
    confidenceFlags: record.confidenceFlags,
    boundaryDisciplineNote: 'Review classification only; no meaning authored, no writeback, no runtime ontology admission, no vocabulary boundary source change, and no alias fan-out.',
  };
}

function sortByPriorityThenTerm(left, right) {
  const leftIndex = PRIORITY_TERMS.indexOf(normalizeForComparison(left.term));
  const rightIndex = PRIORITY_TERMS.indexOf(normalizeForComparison(right.term));
  const leftPriority = leftIndex === -1 ? Number.POSITIVE_INFINITY : leftIndex;
  const rightPriority = rightIndex === -1 ? Number.POSITIVE_INFINITY : rightIndex;

  return leftPriority - rightPriority || left.term.localeCompare(right.term);
}

function markdownCell(value) {
  return String(value ?? '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.map(markdownCell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
}

function countBy(records, key) {
  return records.reduce((counts, record) => {
    const value = record[key] ?? 'unknown';
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function buildDecisionMarkdown(report) {
  const countRows = [
    ['approve_reopen', report.counts.approvedReopenCount],
    ['approve_revision_review', report.counts.approvedRevisionReviewCount],
    ['confirm_keep', report.counts.confirmKeepCount],
    ['still_skip', report.counts.stillSkipCount],
  ];
  const sourceBasisRows = Object.entries(report.counts.bySourceSupportBasis).map(([basis, count]) => [basis, count]);
  const priorityRows = report.highestPriorityNext.map((record) => [
    record.term,
    record.decision,
    record.sourceSupportBasis,
    record.reason,
  ]);
  const stillSkipRows = report.decisions.stillSkip.map((record) => [
    record.term,
    record.sourceSupportBasis,
    record.reason,
  ]);
  const osbornFlagRows = report.osbornReviewFlags.slice(0, 40).map((record) => [
    record.term,
    record.decision,
    record.osbornComparisonFlags.join(', '),
  ]);

  return [
    '# Comparator Review V2 Decisions',
    '',
    'Status: REVIEW_CLASSIFICATION_ONLY. No meanings were authored, no live vocabulary dataset was modified, no vocabulary boundary source was modified, no vocabulary meaning-source storage was modified, no runtime ontology or concept packets were changed, no existing meaning text was changed, no writeback was applied, and no alias fan-out was performed.',
    '',
    '## Inputs',
    '',
    `- Comparator queue v2: ${report.inputFiles.comparatorQueueV2}`,
    `- Comparator summary v2: ${report.inputFiles.comparatorSummaryV2}`,
    '',
    '## Counts',
    '',
    markdownTable(['Decision', 'Count'], countRows),
    '',
    '## Source Basis Counts',
    '',
    markdownTable(['Source basis', 'Count'], sourceBasisRows),
    '',
    '## Highest Priority Next',
    '',
    markdownTable(['Term', 'Decision', 'Source basis', 'Reason'], priorityRows),
    '',
    '## Osborn Review Flags',
    '',
    osbornFlagRows.length > 0
      ? markdownTable(['Term', 'Decision', 'Flags'], osbornFlagRows)
      : 'No Osborn comparison flags were raised.',
    '',
    '## Still Skip',
    '',
    stillSkipRows.length > 0
      ? markdownTable(['Term', 'Source basis', 'Reason'], stillSkipRows)
      : 'No terms remain still_skip.',
    '',
    '## Recommendation',
    '',
    '- Prepare comparator draft/revision candidates only for approve_reopen and approve_revision_review records after this classification.',
    '- Keep confirm_keep records as provenance/review intelligence only; do not rewrite them.',
    '- Batch 006 can continue in parallel as draft-only work.',
    '- Keep Anderson and Osborn provenance exact-term only; do not copy support across alias rows unless the alias row has its own exact support.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Prepare comparator draft/revision candidates for comparator_review_v2_approved_reopen.json and comparator_review_v2_approved_revision_review.json using exact Black, Anderson, and Osborn provenance. Do not modify the live vocabulary dataset, do not change existing meaning text, do not modify vocabulary-boundary.js, and do not modify runtime ontology or concept packets.',
    '',
  ].join('\n');
}

function main() {
  const queueReport = readJson(inputPaths.comparatorQueueV2);
  const decisions = {
    approvedReopen: queueReport.buckets.reopen_from_skip_or_reject.map(reviewRecord).sort(sortByPriorityThenTerm),
    approvedRevisionReview: queueReport.buckets.candidate_revision_of_authored_meaning.map(reviewRecord).sort(sortByPriorityThenTerm),
    confirmKeep: queueReport.buckets.second_source_confirmation.map(reviewRecord).sort((left, right) => left.term.localeCompare(right.term)),
    stillSkip: queueReport.buckets.still_not_safe.map(reviewRecord).sort((left, right) => left.term.localeCompare(right.term)),
  };
  const highestPriorityNext = [
    ...decisions.approvedReopen,
    ...decisions.approvedRevisionReview,
  ].sort(sortByPriorityThenTerm).slice(0, 24);
  const allDecisionRecords = [
    ...decisions.approvedReopen,
    ...decisions.approvedRevisionReview,
    ...decisions.confirmKeep,
    ...decisions.stillSkip,
  ];
  const osbornReviewFlags = allDecisionRecords
    .filter((record) => record.osbornComparisonFlags.length > 0)
    .sort(sortByPriorityThenTerm);

  const report = {
    generatedAt: new Date().toISOString(),
    status: 'REVIEW_CLASSIFICATION_ONLY',
    sourceQueueStatus: queueReport.status,
    sourceQueueScope: queueReport.scope,
    boundaryDiscipline: {
      meaningAuthoringPerformed: false,
      liveVocabularyDatasetChanged: false,
      vocabularyBoundarySourceChanged: false,
      vocabularyMeaningSourcesChanged: false,
      runtimeOntologyChanged: false,
      conceptPacketsChanged: false,
      existingMeaningTextChanged: false,
      writebackApplied: false,
      aliasFanOutPerformed: false,
      exactTermProvenanceOnly: true,
    },
    counts: {
      approvedReopenCount: decisions.approvedReopen.length,
      approvedRevisionReviewCount: decisions.approvedRevisionReview.length,
      confirmKeepCount: decisions.confirmKeep.length,
      stillSkipCount: decisions.stillSkip.length,
      totalDecisionCount: allDecisionRecords.length,
      bySourceSupportBasis: countBy(allDecisionRecords, 'sourceSupportBasis'),
      osbornFlaggedDecisionCount: osbornReviewFlags.length,
      osbornNoisySnippetDecisionCount: allDecisionRecords.filter((record) => record.osbornNoisySnippetCount > 0).length,
    },
    highestPriorityNext,
    osbornReviewFlags,
    inputFiles: Object.fromEntries(
      Object.entries(inputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
    outputFiles: Object.fromEntries(
      Object.entries(outputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
    decisions,
  };

  writeJson(outputPaths.approvedReopen, decisions.approvedReopen);
  writeJson(outputPaths.approvedRevisionReview, decisions.approvedRevisionReview);
  writeJson(outputPaths.confirmKeep, decisions.confirmKeep);
  writeJson(outputPaths.stillSkip, decisions.stillSkip);
  fs.writeFileSync(outputPaths.decisionsMarkdown, buildDecisionMarkdown(report), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
