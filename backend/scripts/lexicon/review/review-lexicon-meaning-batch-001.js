'use strict';

const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const draftRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/draft_meanings');
const reviewRoot = path.join(draftRoot, 'review');

const inputPaths = Object.freeze({
  draftBatch: path.join(draftRoot, 'batch_001_first_50_drafts.json'),
  draftReview: path.join(draftRoot, 'reports/batch_001_review.md'),
  skippedReport: path.join(draftRoot, 'reports/batch_001_skipped.json'),
  mainApprovalQueue: path.join(workspaceRoot, 'vocabulary_reference_lexicons/approval_queue/main_approval_queue.json'),
});

const outputPaths = Object.freeze({
  approved: path.join(reviewRoot, 'approved_batch_001.json'),
  revise: path.join(reviewRoot, 'revise_batch_001.json'),
  rejected: path.join(reviewRoot, 'rejected_batch_001.json'),
  decisionsMarkdown: path.join(reviewRoot, 'batch_001_review_decisions.md'),
});

const revisionPlan = Object.freeze({
  bailment: {
    revisedMeaningInLaw: 'Delivery of personal property by one person to another for custody or a particular purpose.',
    reviewReason: 'The draft was sound but included return-or-disposition language that is not directly evidenced in the queued snippet.',
    confidence: 'medium',
  },
  cassation: {
    revisedMeaningInLaw: 'In French-law usage, quashing or annulment of a lower-court judgment.',
    reviewReason: 'Narrow historical/French-law scope is correct; revised wording is tighter and less universal.',
    confidence: 'medium',
  },
  allocation: {
    revisedMeaningInLaw: 'Historically, an allowance made on an account in exchequer or account practice.',
    reviewReason: 'The support is narrow and historical, so the wording should make that scope explicit.',
    confidence: 'medium',
  },
  dowry: {
    revisedMeaningInLaw: 'Historically, property a woman brought to her husband in marriage, often described as a portion.',
    reviewReason: 'The support is historical and marital-property specific; revised wording avoids implying current universal usage.',
    confidence: 'medium',
  },
  injunction: {
    revisedMeaningInLaw: 'A court order requiring a person to do, or refrain from doing, a specified act.',
    reviewReason: 'The draft was accurate; revised wording better covers prohibitive and mandatory injunction usage without doctrinal detail.',
    confidence: 'high',
  },
  amnesty: {
    revisedMeaningInLaw: 'A sovereign or governmental act forgiving past offenses, often for a class of persons.',
    reviewReason: 'The draft used archaic "oblivion" wording; revised wording is clearer while preserving source scope.',
    confidence: 'high',
  },
  garnishment: {
    revisedMeaningInLaw: 'An attachment process notifying a third party who holds another person\'s money or property not to deliver it except as legally directed.',
    reviewReason: 'The draft was source-fit but revised wording is more precise and avoids conversational "warning" language.',
    confidence: 'high',
  },
});

const historicallyNarrowTerms = new Set([
  'allocation',
  'cassation',
  'dowry',
  'emancipation',
  'filiation',
  'amnesty',
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

function baseReviewRecord(record, decision, reviewReason, options = {}) {
  return {
    term: record.term,
    draftMeaningInLaw: record.draftMeaningInLaw,
    reviewDecision: decision,
    reviewReason,
    revisedMeaningInLaw: options.revisedMeaningInLaw ?? null,
    confidence: options.confidence,
    family: record.family,
    bucket: record.bucket,
    riskTier: record.riskTier,
    currentMeaningStatus: record.currentMeaningStatus,
    matchStatus: record.matchStatus,
    sourceReferenceCount: record.sourceReferences.length,
    historicallyNarrow: historicallyNarrowTerms.has(record.normalizedTerm),
    writebackEligible: decision === 'approve' || decision === 'revise',
  };
}

function buildReview() {
  const draftRecords = readJson(inputPaths.draftBatch);
  const skippedRecords = readJson(inputPaths.skippedReport);

  const approved = [];
  const revise = [];
  const rejected = [];

  draftRecords.forEach((record) => {
    if (record.draftDecision === 'skip') {
      return;
    }

    const revision = revisionPlan[record.normalizedTerm];
    if (revision) {
      revise.push(baseReviewRecord(record, 'revise', revision.reviewReason, revision));
      return;
    }

    approved.push(baseReviewRecord(
      record,
      'approve',
      'Short, descriptive, registry-only wording fits the queued Black support without obvious overreach.',
      {
        confidence: historicallyNarrowTerms.has(record.normalizedTerm) ? 'medium' : 'high',
      },
    ));
  });

  skippedRecords.forEach((record) => {
    rejected.push(baseReviewRecord(
      record,
      'reject',
      record.draftReason,
      { confidence: 'high' },
    ));
  });

  approved.sort((left, right) => left.term.localeCompare(right.term));
  revise.sort((left, right) => left.term.localeCompare(right.term));
  rejected.sort((left, right) => left.term.localeCompare(right.term));

  return { approved, revise, rejected };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function buildDecisionsMarkdown(review) {
  const approvedRows = review.approved.map((record) => [
    record.term,
    record.confidence,
    record.historicallyNarrow ? 'yes' : 'no',
  ]);
  const reviseRows = review.revise.map((record) => [
    record.term,
    record.confidence,
    record.revisedMeaningInLaw,
  ]);
  const rejectedRows = review.rejected.map((record) => [
    record.term,
    record.reviewReason,
  ]);

  return [
    '# Batch 001 Review Decisions',
    '',
    'Scope: review-only quality pass for batch 001 draft meanings. This report does not modify the live vocabulary dataset, runtime ontology, boundary content, or concept packets.',
    '',
    '## Implemented / Partial / Missing / Not Evidenced',
    '',
    '- Implemented: approve, revise, and reject classifications for batch 001 draft outputs.',
    '- Partial: review is based on queued Black snippets and prior extraction quality, not independent full-page legal review.',
    '- Missing: live writeback and human approval of revised wording.',
    '- Not evidenced: modern jurisdiction-specific completeness or runtime concept suitability.',
    '',
    '## Counts',
    '',
    `- Approved: ${review.approved.length}`,
    `- Require revision: ${review.revise.length}`,
    `- Rejected: ${review.rejected.length}`,
    '',
    '## Approved',
    '',
    markdownTable(['Term', 'Confidence', 'Historically narrow'], approvedRows),
    '',
    '## Require Revision',
    '',
    markdownTable(['Term', 'Confidence', 'Revised wording'], reviseRows),
    '',
    '## Rejected',
    '',
    markdownTable(['Term', 'Reason'], rejectedRows),
    '',
    '## Historical Scope Caution',
    '',
    '- allocation: older exchequer/account usage only.',
    '- cassation: French-law quashing/annulment usage.',
    '- dowry: historical marital-property wording.',
    '- emancipation: historically broad release-from-control usage; acceptable but monitor modern scope.',
    '- filiation: parentage attribution usage; acceptable but jurisdiction-sensitive.',
    '- amnesty: sovereign/governmental act; revised for modern clarity.',
    '',
    '## Recommendation',
    '',
    '- Batch 002 should remain at 50 until the revised batch 001 wording is accepted and the writeback path is tested.',
    '- Keep rejected terms out of writeback.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Build a NOT_APPLIED writeback candidate set from approved_batch_001.json and revise_batch_001.json, using revisedMeaningInLaw where present. Do not modify the live vocabulary dataset yet; produce a diff-style preview and validation report for explicit approval.',
    '',
  ].join('\n');
}

function main() {
  fs.mkdirSync(reviewRoot, { recursive: true });
  const review = buildReview();

  writeJson(outputPaths.approved, review.approved);
  writeJson(outputPaths.revise, review.revise);
  writeJson(outputPaths.rejected, review.rejected);
  fs.writeFileSync(outputPaths.decisionsMarkdown, buildDecisionsMarkdown(review), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
