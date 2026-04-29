'use strict';

const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const multiSourceReportsRoot = path.join(
  workspaceRoot,
  'vocabulary_reference_lexicons/multi_source/reports',
);

const inputPaths = Object.freeze({
  candidates: path.join(multiSourceReportsRoot, 'comparator_draft_revision_candidates.json'),
  skippedOrDeferred: path.join(multiSourceReportsRoot, 'comparator_draft_revision_skipped_or_deferred.json'),
});

const outputPaths = Object.freeze({
  approved: path.join(multiSourceReportsRoot, 'comparator_draft_revision_approved.json'),
  revise: path.join(multiSourceReportsRoot, 'comparator_draft_revision_revise.json'),
  rejected: path.join(multiSourceReportsRoot, 'comparator_draft_revision_rejected.json'),
  decisionsMarkdown: path.join(multiSourceReportsRoot, 'comparator_draft_revision_review_decisions.md'),
});

const APPROVALS = Object.freeze({
  pardon: 'Short, stable, and directly supported by Anderson; it avoids broader doctrinal detail.',
  bequest: 'Short, stable, and source-fit; Anderson directly supports personal-property gift by will and clause/thing usage.',
  burden: 'Short and descriptive; Anderson supports charge, obligation, duty, and disadvantage without forcing procedural burden-of-proof usage.',
  cohabitation: 'Properly narrows ordinary living-together language to legal significance and evidentiary marriage context.',
  ward: 'Keeps the person-status and guardianship/protection sense explicit while avoiding older watch-and-ward senses.',
  marriage: 'Boundary-safe and historically cautious; Anderson supports mutual consent and status/contract framing.',
  heir: 'Source-fit and narrower than expectancy language; Anderson supports descent by law on death.',
  appurtenance: 'Appropriately incorporates Anderson right/use/enjoyment support without overbuilding doctrine.',
});

const REVISIONS = Object.freeze({
  authentication: {
    revisedMeaningInLaw: 'Official or legal attestation that a copy, record, act, or other matter is genuine or duly done.',
    reason: 'The draft is source-fit but "thing done" is awkward for registry text; revised wording preserves Anderson attestation support and clarifies the attestation function.',
  },
  intervention: {
    revisedMeaningInLaw: 'A proceeding by which a nonparty becomes a party to a pending suit on that person\'s own motion.',
    reason: 'The draft is good but should make the pending-suit, nonparty-to-party procedural sense explicit.',
  },
  employment: {
    revisedMeaningInLaw: 'Occupation, service, or a position involving business or work.',
    reason: 'The draft over-narrows employment to work for another; Anderson also supports occupation and business position.',
  },
  surplusage: {
    revisedMeaningInLaw: 'Excess, residue, or unnecessary matter, including matter treated as extraneous in a legal instrument or record.',
    reason: 'The draft is reviewable but "without changing legal effect" overstates the source; revised wording keeps excess/residue and unnecessary-matter senses.',
  },
  occupancy: {
    revisedMeaningInLaw: 'Possession, actual control, or occupation of property, including the older property-acquisition sense of taking possession of ownerless property.',
    reason: 'The proposed revision corrected the narrow Black-only meaning but dropped the older acquisition sense; revised wording preserves both sources.',
  },
  security: {
    revisedMeaningInLaw: 'An assurance, surety, indemnity, or instrument furnished to secure payment, performance, or another obligation.',
    reason: 'The proposed revision was sound but should retain the Black indemnity/protection sense while adding Anderson instrument and surety support.',
  },
  premium: {
    revisedMeaningInLaw: 'A reward, recompense, price, or sum paid or agreed to be paid, including as consideration for insurance.',
    reason: 'The candidate is source-fit, but "including but not limited to" is not the preferred boundary style.',
  },
  royalty: {
    revisedMeaningInLaw: 'A prerogative or superior right, and in property or commercial usage a payment due for use of a mine, patent, publication, or similar right.',
    reason: 'The candidate should separate Anderson\'s sovereign-prerogative sense from modern payment usage more clearly.',
  },
  amnesty: {
    revisedMeaningInLaw: 'A governmental act forgiving or overlooking past offenses, especially in public or international-law contexts.',
    reason: 'The candidate is source-fit but "oblivion" is too archaic for the meaning text; revised wording keeps Anderson\'s public/international-law caution.',
  },
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

function proposedMeaning(candidate) {
  return candidate.proposedDraftMeaningInLaw ?? candidate.proposedRevisedMeaningInLaw;
}

function reviewCandidate(candidate) {
  const normalized = normalizeForComparison(candidate.term);
  const approvalReason = APPROVALS[normalized];
  const revision = REVISIONS[normalized];

  if (approvalReason) {
    return {
      ...baseReviewRecord(candidate),
      reviewDecision: 'approve',
      reviewReason: approvalReason,
      revisedMeaningInLaw: null,
      confidence: 'high',
      writebackEligibleAfterPreview: true,
    };
  }

  if (revision) {
    return {
      ...baseReviewRecord(candidate),
      reviewDecision: 'revise',
      reviewReason: revision.reason,
      revisedMeaningInLaw: revision.revisedMeaningInLaw,
      confidence: 'medium',
      writebackEligibleAfterPreview: true,
    };
  }

  return {
    ...baseReviewRecord(candidate),
    reviewDecision: 'reject',
    reviewReason: 'No approved comparator review rule was available for this candidate; keep it out of writeback.',
    revisedMeaningInLaw: null,
    confidence: 'low',
    writebackEligibleAfterPreview: false,
  };
}

function baseReviewRecord(candidate) {
  return {
    term: candidate.term,
    normalizedTerm: candidate.normalizedTerm,
    currentStatus: candidate.currentStatus,
    currentMeaning: candidate.currentMeaning,
    comparatorDecisionType: candidate.comparatorDecisionType,
    draftMeaningInLaw: proposedMeaning(candidate),
    blackSupportSummary: candidate.blackSupportSummary,
    andersonSupportSummary: candidate.andersonSupportSummary,
    sourceProvenancePointers: candidate.provenancePointers,
    family: candidate.family,
    bucket: candidate.bucket,
    riskTier: candidate.riskTier,
    aliasCaution: candidate.aliasCaution,
    boundaryDisciplineNote: 'Review decision only; no meaning authored, no writeback, no live dataset change, no runtime ontology change, no concept packet change, no alias fan-out.',
  };
}

function prioritySort(left, right) {
  const order = [
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
    'ward',
    'marriage',
    'heir',
    'appurtenance',
    'royalty',
    'amnesty',
    'burden',
  ];
  const leftIndex = order.indexOf(normalizeForComparison(left.term));
  const rightIndex = order.indexOf(normalizeForComparison(right.term));
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
  const approvalRows = report.approved.map((record) => [
    record.term,
    record.comparatorDecisionType,
    record.draftMeaningInLaw,
  ]);
  const reviseRows = report.revise.map((record) => [
    record.term,
    record.draftMeaningInLaw,
    record.revisedMeaningInLaw,
  ]);
  const rejectedRows = report.rejected.map((record) => [
    record.term,
    record.reviewReason,
  ]);

  return [
    '# Comparator Draft / Revision Review Decisions',
    '',
    'Status: REVIEW_ONLY_NOT_APPLIED. No live vocabulary dataset was modified, no existing meaning text was changed, no runtime ontology or concept packets were changed, no writeback was applied, and no alias fan-out was performed.',
    '',
    '## Counts',
    '',
    `- Approved: ${report.counts.approvedCount}`,
    `- Require revision: ${report.counts.reviseCount}`,
    `- Rejected: ${report.counts.rejectedCount}`,
    `- Deferred kept out of writeback: ${report.counts.deferredInputCount}`,
    '',
    '## Approved',
    '',
    approvalRows.length > 0
      ? markdownTable(['Term', 'Type', 'Approved wording'], approvalRows)
      : 'No candidates approved as written.',
    '',
    '## Require Revision',
    '',
    reviseRows.length > 0
      ? markdownTable(['Term', 'Candidate wording', 'Revised wording'], reviseRows)
      : 'No candidates require revision.',
    '',
    '## Rejected',
    '',
    rejectedRows.length > 0
      ? markdownTable(['Term', 'Reason'], rejectedRows)
      : 'No candidates rejected.',
    '',
    '## Recommendation',
    '',
    '- Build a NOT_APPLIED comparator writeback preview only from approved plus revised comparator records.',
    '- Keep deferred and rejected rows out of writeback.',
    '- Preserve exact Anderson and Black provenance in the preview candidate set.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Build a NOT_APPLIED comparator writeback preview from comparator_draft_revision_approved.json and comparator_draft_revision_revise.json, using revisedMeaningInLaw where present. Do not modify the live vocabulary dataset; produce a diff preview and validation report for explicit approval.',
    '',
  ].join('\n');
}

function main() {
  const candidatesReport = readJson(inputPaths.candidates);
  const deferredInput = readJson(inputPaths.skippedOrDeferred);
  const candidates = [
    ...candidatesReport.reopened_draft_candidates,
    ...candidatesReport.revision_review_candidates,
  ];
  const reviewed = candidates.map(reviewCandidate).sort(prioritySort);
  const approved = reviewed.filter((record) => record.reviewDecision === 'approve');
  const revise = reviewed.filter((record) => record.reviewDecision === 'revise');
  const rejected = reviewed.filter((record) => record.reviewDecision === 'reject');

  const report = {
    generatedAt: new Date().toISOString(),
    status: 'REVIEW_ONLY_NOT_APPLIED',
    boundaryDiscipline: {
      liveVocabularyDatasetChanged: false,
      existingMeaningTextChanged: false,
      runtimeOntologyChanged: false,
      conceptPacketsChanged: false,
      writebackApplied: false,
      aliasFanOutPerformed: false,
    },
    counts: {
      reviewedCandidateCount: reviewed.length,
      approvedCount: approved.length,
      reviseCount: revise.length,
      rejectedCount: rejected.length,
      deferredInputCount: deferredInput.length,
    },
    inputFiles: Object.fromEntries(
      Object.entries(inputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
    outputFiles: Object.fromEntries(
      Object.entries(outputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
    approved,
    revise,
    rejected,
    deferredInput,
  };

  writeJson(outputPaths.approved, approved);
  writeJson(outputPaths.revise, revise);
  writeJson(outputPaths.rejected, rejected);
  fs.writeFileSync(outputPaths.decisionsMarkdown, buildDecisionMarkdown(report), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
