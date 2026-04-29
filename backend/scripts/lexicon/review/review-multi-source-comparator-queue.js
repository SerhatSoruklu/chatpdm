'use strict';

const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const multiSourceReportsRoot = path.join(
  workspaceRoot,
  'vocabulary_reference_lexicons/multi_source/reports',
);

const inputPaths = Object.freeze({
  comparatorQueue: path.join(multiSourceReportsRoot, 'multi_source_comparator_review_queue.json'),
  comparatorSummary: path.join(multiSourceReportsRoot, 'multi_source_comparator_review_summary.md'),
});

const outputPaths = Object.freeze({
  approvedReopen: path.join(multiSourceReportsRoot, 'comparator_review_approved_reopen.json'),
  approvedRevisionReview: path.join(multiSourceReportsRoot, 'comparator_review_approved_revision_review.json'),
  confirmKeep: path.join(multiSourceReportsRoot, 'comparator_review_confirm_keep.json'),
  stillSkip: path.join(multiSourceReportsRoot, 'comparator_review_still_skip.json'),
  decisionsMarkdown: path.join(multiSourceReportsRoot, 'comparator_review_decisions.md'),
});

const DECISION_BY_BUCKET = Object.freeze({
  reopened_from_skip_or_reject: 'approve_reopen',
  candidate_revision_of_authored_meaning: 'approve_revision_review',
  second_source_confirmation: 'confirm_keep',
  still_not_safe: 'still_skip',
});

const REVIEW_REASON_PREFIX = Object.freeze({
  approve_reopen: 'Approved for reopen: Anderson provides exact-term comparator support sufficient for a new draft/review pass, but this does not author a meaning.',
  approve_revision_review: 'Approved for revision review: Anderson provides exact-term comparator support that may narrow, correct, or improve an already-authored meaning.',
  confirm_keep: 'Confirmed keep: Anderson provides exact-term second-source support and does not require revision in this review pass.',
  still_skip: 'Still skip: Anderson does not provide enough exact-term support to safely reopen or revise in this review pass.',
});

const PRIORITY_TERMS = Object.freeze([
  'authentication',
  'intervention',
  'pardon',
  'bequest',
  'employment',
  'surplusage',
  'occupancy',
  'security',
  'cohabitation',
  'premium',
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
  return value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[.,;:]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function reviewRecord(record) {
  const decision = DECISION_BY_BUCKET[record.queueBucket];
  if (!decision) {
    throw new Error(`Unknown comparator queue bucket: ${record.queueBucket}`);
  }

  return {
    term: record.term,
    normalizedTerm: record.normalizedTerm,
    currentStatus: record.currentStatus,
    decision,
    reason: `${REVIEW_REASON_PREFIX[decision]} ${record.reason}`,
    currentMeaning: record.currentMeaning,
    andersonSupportSummary: record.andersonSupportSummary,
    blackSupportSummary: record.blackSupportSummary,
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
    boundaryDisciplineNote: 'Review classification only; no meaning authored, no writeback, no runtime ontology admission, and no alias fan-out.',
  };
}

function sortByPriorityThenTerm(left, right) {
  const leftIndex = PRIORITY_TERMS.indexOf(normalizeForComparison(left.term));
  const rightIndex = PRIORITY_TERMS.indexOf(normalizeForComparison(right.term));
  const leftPriority = leftIndex === -1 ? Number.POSITIVE_INFINITY : leftIndex;
  const rightPriority = rightIndex === -1 ? Number.POSITIVE_INFINITY : rightIndex;

  return leftPriority - rightPriority || left.term.localeCompare(right.term);
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function buildDecisionMarkdown(report) {
  const countRows = [
    ['approve_reopen', report.counts.approvedReopenCount],
    ['approve_revision_review', report.counts.approvedRevisionReviewCount],
    ['confirm_keep', report.counts.confirmKeepCount],
    ['still_skip', report.counts.stillSkipCount],
  ];
  const priorityRows = report.highestPriorityNext.map((record) => [
    record.term,
    record.decision,
    record.reason,
  ]);
  const stillSkipRows = report.decisions.stillSkip.map((record) => [
    record.term,
    record.reason,
  ]);

  return [
    '# Comparator Review Decisions',
    '',
    'Status: REVIEW_CLASSIFICATION_ONLY. No meanings were authored, no live vocabulary dataset was modified, no runtime ontology or concept packets were changed, no existing meaning text was changed, and no alias fan-out was performed.',
    '',
    '## Inputs',
    '',
    `- Comparator queue: ${report.inputFiles.comparatorQueue}`,
    `- Comparator summary: ${report.inputFiles.comparatorSummary}`,
    '',
    '## Counts',
    '',
    markdownTable(['Decision', 'Count'], countRows),
    '',
    '## Highest Priority Next',
    '',
    markdownTable(['Term', 'Decision', 'Reason'], priorityRows),
    '',
    '## Still Skip',
    '',
    stillSkipRows.length > 0
      ? markdownTable(['Term', 'Reason'], stillSkipRows)
      : 'No terms remain still_skip.',
    '',
    '## Recommendation',
    '',
    '- Prepare a comparator draft/revision packet for the approve_reopen and approve_revision_review terms before any live writeback.',
    '- Batch 004 can proceed in parallel as draft-only work, but live writeback should wait until this comparator packet is reviewed.',
    '- Keep Anderson provenance exact-term only; do not copy provenance across alias rows unless the alias row has its own exact support.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Prepare comparator draft/revision candidates for comparator_review_approved_reopen.json and comparator_review_approved_revision_review.json using exact Anderson provenance plus existing Black support. Do not modify the live vocabulary dataset, do not change existing meaning text, and do not modify runtime ontology or concept packets.',
    '',
  ].join('\n');
}

function main() {
  const queueReport = readJson(inputPaths.comparatorQueue);
  const decisions = {
    approvedReopen: queueReport.buckets.reopened_from_skip_or_reject.map(reviewRecord).sort(sortByPriorityThenTerm),
    approvedRevisionReview: queueReport.buckets.candidate_revision_of_authored_meaning.map(reviewRecord).sort(sortByPriorityThenTerm),
    confirmKeep: queueReport.buckets.second_source_confirmation.map(reviewRecord).sort((left, right) => left.term.localeCompare(right.term)),
    stillSkip: queueReport.buckets.still_not_safe.map(reviewRecord).sort((left, right) => left.term.localeCompare(right.term)),
  };
  const highestPriorityNext = [
    ...decisions.approvedReopen,
    ...decisions.approvedRevisionReview,
  ].sort(sortByPriorityThenTerm).slice(0, PRIORITY_TERMS.length);

  const report = {
    generatedAt: new Date().toISOString(),
    status: 'REVIEW_CLASSIFICATION_ONLY',
    sourceQueueStatus: queueReport.status,
    boundaryDiscipline: {
      meaningAuthoringPerformed: false,
      liveVocabularyDatasetChanged: false,
      runtimeOntologyChanged: false,
      conceptPacketsChanged: false,
      existingMeaningTextChanged: false,
      aliasFanOutPerformed: false,
    },
    counts: {
      approvedReopenCount: decisions.approvedReopen.length,
      approvedRevisionReviewCount: decisions.approvedRevisionReview.length,
      confirmKeepCount: decisions.confirmKeep.length,
      stillSkipCount: decisions.stillSkip.length,
      totalDecisionCount: Object.values(decisions).reduce((total, records) => total + records.length, 0),
    },
    highestPriorityNext,
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
