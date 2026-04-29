'use strict';

const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const draftRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/draft_meanings');
const reviewRoot = path.join(draftRoot, 'review');

const inputPaths = Object.freeze({
  draftBatch: path.join(draftRoot, 'batch_002_second_50_drafts.json'),
  draftReview: path.join(draftRoot, 'reports/batch_002_review.md'),
  skippedReport: path.join(draftRoot, 'reports/batch_002_skipped.json'),
  mainApprovalQueue: path.join(workspaceRoot, 'vocabulary_reference_lexicons/approval_queue/main_approval_queue.json'),
});

const outputPaths = Object.freeze({
  approved: path.join(reviewRoot, 'approved_batch_002.json'),
  revise: path.join(reviewRoot, 'revise_batch_002.json'),
  rejected: path.join(reviewRoot, 'rejected_batch_002.json'),
  decisionsMarkdown: path.join(reviewRoot, 'batch_002_review_decisions.md'),
});

const revisionPlan = Object.freeze({
  corporation: {
    revisedMeaningInLaw: 'A legal entity created or recognized under law, commonly organized under a distinct name.',
    reviewReason: 'The draft was source-fit but "franchise formed by one or more persons" sounded historically narrow and less clear for registry display.',
    confidence: 'high',
  },
  board: {
    revisedMeaningInLaw: 'An official or organizational body of persons authorized to manage, supervise, or administer a matter.',
    reviewReason: 'The support is example-driven, so revised wording keeps the administrative-body sense without overstating a single doctrinal definition.',
    confidence: 'medium',
  },
  boycott: {
    revisedMeaningInLaw: 'A concerted refusal or effort to deal with a person or business, historically discussed in law as business-interference conduct.',
    reviewReason: 'The draft over-weighted conspiracy framing; revised wording keeps the historical caution without making conspiracy universal.',
    confidence: 'medium',
  },
  presumption: {
    revisedMeaningInLaw: 'An inference or legal assumption drawn from law or fact until displaced where proof permits.',
    reviewReason: 'The draft was sound but slightly awkward; revised wording is tighter while keeping the proof-limited scope.',
    confidence: 'high',
  },
  insufficiency: {
    revisedMeaningInLaw: 'In pleading, legal inadequacy such as an answer that fails to respond sufficiently to material allegations.',
    reviewReason: 'The source support is pleading-specific, so revised wording makes that narrow context explicit.',
    confidence: 'medium',
  },
  process: {
    revisedMeaningInLaw: 'A writ or other legal means used to compel a party to appear or act in a proceeding.',
    reviewReason: 'The draft included "procedure," which could over-broaden the entry; revised wording tracks the writ/compulsion support more closely.',
    confidence: 'high',
  },
  exhibit: {
    revisedMeaningInLaw: 'A document or paper produced and shown to a court during a trial or hearing.',
    reviewReason: 'The queued support is document-focused, so revised wording removes the broader "item" language.',
    confidence: 'high',
  },
  hearing: {
    revisedMeaningInLaw: 'A court proceeding or stage at which the court hears argument or matter submitted by the parties.',
    reviewReason: 'The support is historically tied to argument in equity practice; revised wording avoids adding unsupported evidence-taking breadth.',
    confidence: 'medium',
  },
  submission: {
    revisedMeaningInLaw: 'A yielding to authority, or the placing of a matter before another for decision.',
    reviewReason: 'The draft was acceptable but revised wording removes unnecessary "agreement" language not needed for the boundary meaning.',
    confidence: 'medium',
  },
  inspection: {
    revisedMeaningInLaw: 'An examination or viewing of a person, thing, or matter under legal process or authority.',
    reviewReason: 'The draft was broad from divergent uses; revised wording anchors the breadth to legal process or authority.',
    confidence: 'medium',
  },
  rejoinder: {
    revisedMeaningInLaw: "In common-law pleading, a defendant's answer to the plaintiff's replication.",
    reviewReason: 'The draft was accurate but less precise than the supported pleading sequence.',
    confidence: 'high',
  },
});

const historicallyNarrowTerms = new Set([
  'boycott',
  'foreclosure',
  'governor',
  'hearing',
  'insufficiency',
  'rejoinder',
  'reply',
  'submission',
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
    '# Batch 002 Review Decisions',
    '',
    'Scope: review-only quality pass for batch 002 draft meanings. This report does not modify the live vocabulary dataset, runtime ontology, boundary content, or concept packets.',
    '',
    '## Implemented / Partial / Missing / Not Evidenced',
    '',
    '- Implemented: approve, revise, and reject classifications for batch 002 draft outputs.',
    '- Partial: review is based on queued Black snippets and prior extraction quality, not independent full-page legal review.',
    '- Missing: live writeback, explicit writeback preview, and human approval of revised wording.',
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
    '- boycott: historical business-interference and conspiracy framing should not be universalized.',
    '- foreclosure: Black support is chancery/right-of-redemption focused.',
    '- governor: public-office meaning is stable, but examples include older colonial/territorial phrasing.',
    '- hearing: source support is tied to equity-practice argument, so broad evidence-hearing wording should be avoided.',
    '- insufficiency: support is pleading-specific.',
    '- rejoinder and reply: common-law pleading sequence terms; keep procedural scope narrow.',
    '- submission: has both yielding-to-authority and dispute-submission senses; wording should stay general.',
    '',
    '## Recommendation',
    '',
    '- Batch 003 should remain at 50 until the batch 002 writeback preview validates clean target mappings.',
    '- Keep rejected terms out of writeback.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Build a NOT_APPLIED writeback candidate set from approved_batch_002.json and revise_batch_002.json, using revisedMeaningInLaw where present. Do not modify the live vocabulary dataset yet; produce a diff-style preview and validation report for explicit approval.',
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
