'use strict';

const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const draftRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/draft_meanings');
const reviewRoot = path.join(draftRoot, 'review');

const inputPaths = Object.freeze({
  draftBatch: path.join(draftRoot, 'batch_004_fourth_50_drafts.json'),
  skippedReport: path.join(draftRoot, 'reports/batch_004_skipped.json'),
});

const outputPaths = Object.freeze({
  approved: path.join(reviewRoot, 'approved_batch_004.json'),
  revise: path.join(reviewRoot, 'revise_batch_004.json'),
  rejected: path.join(reviewRoot, 'rejected_batch_004.json'),
  decisionsMarkdown: path.join(reviewRoot, 'batch_004_review_decisions.md'),
});

const revisionPlan = Object.freeze({
  will: {
    revisedMeaningInLaw: 'A legal declaration of a person\'s wishes for the disposition of property after death.',
    reviewReason: 'The draft was sound, but "declaration" is tighter than "expression" for testamentary wording while staying within Black support.',
    confidence: 'high',
  },
  redemption: {
    revisedMeaningInLaw: 'The act or right of repurchasing, buying back, or recovering property by payment or performance.',
    reviewReason: 'The draft was source-fit but broad; revised wording tracks the repurchase and mortgage-redemption senses without overextending recovery.',
    confidence: 'medium',
  },
  restitution: {
    revisedMeaningInLaw: 'The restoration or return of a thing, right, person, or condition to its former owner, position, or state.',
    reviewReason: 'The draft was sound; revised wording adds "return" to better match the source support while keeping the broader Anderson comparator scope.',
    confidence: 'medium',
  },
  partnership: {
    revisedMeaningInLaw: 'A voluntary contract between two or more persons to contribute property, labor, skill, or effects to lawful business for shared profit and loss.',
    reviewReason: 'Removed "association" so the wording stays closer to the Black contract-based definition and avoids broad organizational drift.',
    confidence: 'high',
  },
  shareholder: {
    revisedMeaningInLaw: 'A person who holds shares in a corporation or has agreed to become a member by taking shares.',
    reviewReason: 'The draft was acceptable but awkward; revised wording is clearer while preserving the corporate-membership source basis.',
    confidence: 'medium',
  },
  failure: {
    revisedMeaningInLaw: 'A deficiency, lack, omission, neglect of duty, or unsuccessful attempt.',
    reviewReason: 'Removed "measured by a legal standard" because the Black support did not require that extra qualifier.',
    confidence: 'medium',
  },
  intrusion: {
    revisedMeaningInLaw: 'In property law, an injury by ouster or entry by a stranger into a freehold after a prior estate ends and before the next estate takes effect.',
    reviewReason: 'The source support is historically property-specific; revised wording makes that narrow scope explicit.',
    confidence: 'medium',
  },
});

const historicallyNarrowTerms = new Set([
  'patrimony',
  'redemption',
  'restitution',
  'relief',
  'reprieve',
  'probation',
  'reformation',
  'rescission',
  'vacatur',
  'intrusion',
  'conversion',
  'delict',
  'interference',
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
    normalizedTerm: record.normalizedTerm,
    draftMeaningInLaw: record.draftMeaningInLaw,
    reviewDecision: decision,
    reviewReason,
    revisedMeaningInLaw: options.revisedMeaningInLaw ?? null,
    confidence: options.confidence,
    family: record.family,
    bucket: record.bucket,
    riskTier: record.riskTier,
    currentMeaningStatus: record.currentMeaningStatus,
    currentMeaning: record.currentMeaning,
    matchStatus: record.matchStatus,
    sourceReferenceCount: record.sourceReferences.length,
    sourceBasis: record.sourceBasis,
    comparatorUsed: record.comparatorUsed,
    provenancePointers: record.provenancePointers,
    aliasGroupNote: record.aliasGroupNote,
    historicallyNarrow: historicallyNarrowTerms.has(record.normalizedTerm) || record.weakOrHistoricallyNarrow === true,
    writebackEligible: decision === 'approve' || decision === 'revise',
    boundaryDisciplineNote: 'Review classification only; no writeback, no live vocabulary mutation, no runtime ontology admission, and no alias fan-out.',
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
      record.comparatorUsed
        ? 'Boundary-safe wording fits the Black support and exact Anderson comparator context without obvious overreach.'
        : 'Boundary-safe wording fits the queued Black support without obvious overreach.',
      {
        confidence: historicallyNarrowTerms.has(record.normalizedTerm) || record.weakOrHistoricallyNarrow === true
          ? 'medium'
          : 'high',
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

function buildDecisionsMarkdown(review) {
  const approvedRows = review.approved.map((record) => [
    record.term,
    record.confidence,
    record.sourceBasis,
    record.historicallyNarrow ? 'yes' : 'no',
  ]);
  const reviseRows = review.revise.map((record) => [
    record.term,
    record.confidence,
    record.sourceBasis,
    record.revisedMeaningInLaw,
  ]);
  const rejectedRows = review.rejected.map((record) => [
    record.term,
    record.reviewReason,
  ]);

  return [
    '# Batch 004 Review Decisions',
    '',
    'Scope: review-only quality pass for batch 004 draft meanings. This report does not modify the live vocabulary dataset, runtime ontology, existing meaning text, or concept packets.',
    '',
    '## Implemented / Partial / Missing / Not Evidenced',
    '',
    '- Implemented: approve, revise, and reject classifications for batch 004 draft outputs.',
    '- Partial: review is based on queued Black snippets, Anderson comparator alignment where available, and prior extraction quality; it is not independent full-page legal review.',
    '- Missing: live writeback, explicit writeback preview, and human approval of revised wording.',
    '- Not evidenced: modern jurisdiction-specific completeness or runtime concept suitability.',
    '',
    '## Counts',
    '',
    `- Approved: ${review.approved.length}`,
    `- Require revision: ${review.revise.length}`,
    `- Rejected: ${review.rejected.length}`,
    `- Approved or revised writeback-eligible: ${review.approved.length + review.revise.length}`,
    '',
    '## Approved',
    '',
    markdownTable(['Term', 'Confidence', 'Source basis', 'Historically narrow'], approvedRows),
    '',
    '## Require Revision',
    '',
    markdownTable(['Term', 'Confidence', 'Source basis', 'Revised wording'], reviseRows),
    '',
    '## Rejected',
    '',
    markdownTable(['Term', 'Reason'], rejectedRows),
    '',
    '## Historical / Wrong-Sense Caution',
    '',
    '- relief, probation, reformation, dereliction, and conversion remain rejected because their available snippets are wrong-sense, cross-reference-only, or too narrow for the queued family.',
    '- interference is approved with medium confidence only as a patent-law usage, not a broad interference concept.',
    '- intrusion is revised to make the historically property-specific scope explicit.',
    '- redemption, restitution, reprieve, rescission, vacatur, and delict remain historically framed terms and should stay registry-only.',
    '',
    '## Recommendation',
    '',
    '- Build a NOT_APPLIED writeback preview from approved_batch_004.json and revise_batch_004.json before any live vocabulary mutation.',
    '- Keep rejected batch 004 terms out of writeback.',
    '- Batch 005 should remain at 50 until batch 004 preview and apply validation pass.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Build a NOT_APPLIED writeback candidate set from approved_batch_004.json and revise_batch_004.json, using revisedMeaningInLaw where present. Do not modify the live vocabulary dataset yet; produce a diff-style preview and validation report for explicit approval.',
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
