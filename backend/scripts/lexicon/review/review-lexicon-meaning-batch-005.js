'use strict';

const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const draftRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/draft_meanings');
const reviewRoot = path.join(draftRoot, 'review');

const inputPaths = Object.freeze({
  draftBatch: path.join(draftRoot, 'batch_005_fifth_50_drafts.json'),
  skippedReport: path.join(draftRoot, 'reports/batch_005_skipped.json'),
});

const outputPaths = Object.freeze({
  approved: path.join(reviewRoot, 'approved_batch_005.json'),
  revise: path.join(reviewRoot, 'revise_batch_005.json'),
  rejected: path.join(reviewRoot, 'rejected_batch_005.json'),
  decisionsMarkdown: path.join(reviewRoot, 'batch_005_review_decisions.md'),
});

const revisionPlan = Object.freeze({
  obstruction: {
    revisedMeaningInLaw: 'In property usage, an obstruction is an injury or impediment affecting an incorporeal hereditament or similar legal right.',
    reviewReason: 'The draft was too general; revised wording keeps the narrow property-right scope supported by Black.',
    confidence: 'medium',
  },
  election: {
    revisedMeaningInLaw: 'The act or result of choosing or selecting a person, thing, course, right, or public officer.',
    reviewReason: 'Revised "office holder" to "public officer" to track Anderson more closely and avoid awkward phrasing.',
    confidence: 'high',
  },
  necessity: {
    revisedMeaningInLaw: 'A controlling force, irresistible compulsion, or constraint that may excuse an otherwise wrongful act.',
    reviewReason: 'Added the article and kept the excuse function explicit while preserving Black and Anderson support.',
    confidence: 'medium',
  },
  release: {
    revisedMeaningInLaw: 'The act or instrument by which a claim, interest, restraint, liability, or confinement is surrendered, discharged, or set free.',
    reviewReason: 'The draft was sound but "set free" better preserves the Black release-from-restraint support without broadening beyond the sources.',
    confidence: 'medium',
  },
  treason: {
    revisedMeaningInLaw: 'An offense against the government or sovereign to which the offender owes allegiance, including attempts to overthrow that government.',
    reviewReason: 'Revised wording avoids making overthrow the only or dominant form while preserving the Black and Anderson support.',
    confidence: 'medium',
  },
  arrest: {
    revisedMeaningInLaw: 'The stopping, seizing, apprehending, or detaining of a person under legal authority.',
    reviewReason: 'Revised "by lawful authority" to "under legal authority" to avoid implying every arrest is substantively lawful.',
    confidence: 'high',
  },
});

const historicallyNarrowTerms = new Set([
  'obstruction',
  'sanctuary',
  'condonation',
  'minority',
  'condition',
  'charter',
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
    '# Batch 005 Review Decisions',
    '',
    'Scope: review-only quality pass for batch 005 draft meanings. This report does not modify the live vocabulary dataset, runtime ontology, existing meaning text, or concept packets.',
    '',
    '## Implemented / Partial / Missing / Not Evidenced',
    '',
    '- Implemented: approve, revise, and reject classifications for batch 005 draft outputs.',
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
    '- representation and subject remain rejected because the available support does not safely match the queued constitutional/political sense.',
    '- obstruction is revised to preserve the historically narrow property-right scope supported by Black.',
    '- sanctuary is approved with historical-scope caution only as old-law asylum usage.',
    '- condonation and minority are approved as narrow domestic-status or status/excuse terms, not as broad modern defenses.',
    '',
    '## Recommendation',
    '',
    '- Build a NOT_APPLIED writeback preview from approved_batch_005.json and revise_batch_005.json before any live vocabulary mutation.',
    '- Keep rejected batch 005 terms out of writeback.',
    '- Batch 006 should remain at 50 until batch 005 preview and apply validation pass.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Build a NOT_APPLIED writeback candidate set from approved_batch_005.json and revise_batch_005.json, using revisedMeaningInLaw where present. Do not modify the live vocabulary dataset yet; produce a diff-style preview and validation report for explicit approval.',
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
