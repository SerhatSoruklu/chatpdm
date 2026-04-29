'use strict';

const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const multiSourceReportsRoot = path.join(
  workspaceRoot,
  'vocabulary_reference_lexicons/multi_source/reports',
);

const inputPaths = Object.freeze({
  approvedReopen: path.join(multiSourceReportsRoot, 'comparator_review_approved_reopen.json'),
  approvedRevisionReview: path.join(multiSourceReportsRoot, 'comparator_review_approved_revision_review.json'),
  comparatorQueue: path.join(multiSourceReportsRoot, 'multi_source_comparator_review_queue.json'),
});

const outputPaths = Object.freeze({
  candidatesJson: path.join(multiSourceReportsRoot, 'comparator_draft_revision_candidates.json'),
  summaryMarkdown: path.join(multiSourceReportsRoot, 'comparator_draft_revision_summary.md'),
  skippedOrDeferredJson: path.join(multiSourceReportsRoot, 'comparator_draft_revision_skipped_or_deferred.json'),
});

const PRIORITY_ORDER = Object.freeze([
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
]);

const REOPEN_DRAFT_PLAN = Object.freeze({
  authentication: {
    proposed: 'Official or legal attestation of a copy, record, act, or other thing done.',
    reason: 'Anderson supplies the missing definition text; Black only identified the evidence-law context.',
  },
  intervention: {
    proposed: 'A proceeding by which a person becomes a party to a pending suit on that person\'s own motion.',
    reason: 'Anderson supplies the procedural suit sense that matches the registry family, correcting the Black wrong-sense issue.',
  },
  pardon: {
    proposed: 'An act of legal forgiveness or grace releasing a person from punishment for an offense.',
    reason: 'Anderson provides direct pardon wording, while the Black snippet was too corrupted for safe drafting.',
  },
  bequest: {
    proposed: 'A gift of personal property by will, or the clause or thing so given.',
    reason: 'Anderson gives direct testamentary-property support that was missing from the rejected Black snippet.',
  },
  employment: {
    proposed: 'Occupation, service, or a business position involving work for another.',
    reason: 'Anderson provides a positive definition where the Black support was negative-framed and too thin.',
  },
  surplusage: {
    proposed: 'Surplus or unnecessary matter, including excess, residue, or matter that may be disregarded without changing legal effect.',
    reason: 'Anderson provides an overplus, residue, balance-over sense plus unnecessary-matter usage, making the term reviewable despite the earlier wrong-sense concern.',
  },
  burden: {
    proposed: 'A charge, obligation, duty, or disadvantage borne by a person or thing.',
    reason: 'Anderson gives broad exact-term support that overcomes the earlier narrow Scots-property Black support.',
  },
});

const REVISION_PLAN = Object.freeze({
  occupancy: {
    proposed: 'Possession, actual control, or occupation of property or premises.',
    reason: 'Anderson gives a broader possession and actual-control sense than the current ownerless-property acquisition wording.',
  },
  security: {
    proposed: 'An assurance, surety, or instrument that secures payment, performance, or another obligation.',
    reason: 'Anderson emphasizes instrument and surety senses; the proposed wording narrows the current broad protection wording.',
  },
  cohabitation: {
    proposed: 'Living together in a way that may have legal significance, especially as evidence bearing on marriage.',
    reason: 'Anderson treats cohabitation as evidentiary support for a presumption of marriage, not just ordinary living together.',
  },
  premium: {
    proposed: 'A reward, recompense, price, or sum paid or to be paid, including but not limited to insurance consideration.',
    reason: 'Anderson supports a broader payment or reward sense than the current insurance-focused wording.',
  },
  ward: {
    proposed: 'A person, commonly a minor or protected person, who is under another\'s guardianship, care, or legal protection.',
    reason: 'Black supports guardianship; Anderson adds care, charge, and protection senses, while older watch-and-ward senses remain out of scope.',
  },
  marriage: {
    proposed: 'A legally recognized marital relation founded on mutual consent, historically treated as a civil status or contract.',
    reason: 'Anderson provides consent and contract/status support that improves the historically cautious current wording.',
  },
  heir: {
    proposed: 'A person on whom an estate or property right descends by law on another\'s death.',
    reason: 'Anderson gives a common-law estate-casting formulation and avoids the broader expectancy language.',
  },
  appurtenance: {
    proposed: 'A right, thing, or incident connected with the use or enjoyment of a principal thing.',
    reason: 'Anderson adds right/use/enjoyment language to the Black accessory-or-incident support.',
  },
  royalty: {
    proposed: 'A sovereign prerogative or a payment due for use of a mine, patent, publication, or similar right.',
    reason: 'Anderson exposes both sovereign-prerogative and modern use-payment senses, so the review candidate broadens the current payment-only wording.',
  },
  amnesty: {
    proposed: 'A governmental act of oblivion or forgiveness for past offenses, especially in public or international-law contexts.',
    reason: 'Anderson adds common-law caution and international-law scope to the existing governmental-forgiveness wording.',
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

function prioritySort(left, right) {
  const leftIndex = PRIORITY_ORDER.indexOf(normalizeForComparison(left.term));
  const rightIndex = PRIORITY_ORDER.indexOf(normalizeForComparison(right.term));
  const leftPriority = leftIndex === -1 ? Number.POSITIVE_INFINITY : leftIndex;
  const rightPriority = rightIndex === -1 ? Number.POSITIVE_INFINITY : rightIndex;

  return leftPriority - rightPriority || left.term.localeCompare(right.term);
}

function baseCandidate(record, comparatorDecisionType, plan) {
  return {
    term: record.term,
    normalizedTerm: record.normalizedTerm,
    currentStatus: record.currentStatus,
    currentMeaning: record.currentMeaning,
    comparatorDecisionType,
    blackSupportSummary: record.blackSupportSummary,
    andersonSupportSummary: record.andersonSupportSummary,
    conciseReasonForProposedWording: plan.reason,
    provenancePointers: {
      black: record.sourceProvenancePointers.black,
      anderson: record.sourceProvenancePointers.anderson,
    },
    family: record.family,
    bucket: record.bucket,
    riskTier: record.riskTier,
    aliasCaution: record.aliasCaution,
    reviewDecisionSource: record.decision,
    reviewDecisionReason: record.reason,
    boundaryDisciplineNote: 'Draft/revision preparation only; not applied, no live vocabulary dataset change, no runtime ontology change, no concept packet change, no alias fan-out.',
  };
}

function buildReopenCandidate(record) {
  const plan = REOPEN_DRAFT_PLAN[normalizeForComparison(record.term)];
  if (!plan) {
    return null;
  }

  return {
    ...baseCandidate(record, 'reopen_draft', plan),
    proposedDraftMeaningInLaw: plan.proposed,
    proposedRevisedMeaningInLaw: null,
  };
}

function buildRevisionCandidate(record) {
  const plan = REVISION_PLAN[normalizeForComparison(record.term)];
  if (!plan) {
    return null;
  }

  return {
    ...baseCandidate(record, 'revision_review', plan),
    proposedDraftMeaningInLaw: null,
    proposedRevisedMeaningInLaw: plan.proposed,
  };
}

function buildDeferred(record, reason) {
  return {
    term: record.term,
    normalizedTerm: record.normalizedTerm,
    currentStatus: record.currentStatus,
    currentMeaning: record.currentMeaning,
    decision: 'deferred',
    reason,
    blackSupportSummary: record.blackSupportSummary,
    andersonSupportSummary: record.andersonSupportSummary,
    provenancePointers: record.sourceProvenancePointers,
    family: record.family,
    bucket: record.bucket,
    riskTier: record.riskTier,
    aliasCaution: record.aliasCaution,
    boundaryDisciplineNote: 'Deferred from draft/revision preparation; no authoring or writeback applied.',
  };
}

function buildUnchangedReferenceContext(queueReport) {
  return queueReport.buckets.second_source_confirmation.map((record) => ({
    term: record.term,
    normalizedTerm: record.normalizedTerm,
    currentStatus: record.currentStatus,
    currentMeaning: record.currentMeaning,
    comparatorDecisionType: 'unchanged_reference_context',
    suggestedAction: 'keep',
    blackSupportSummary: record.blackSupportSummary,
    andersonSupportSummary: record.andersonSupportSummary,
    provenancePointers: record.sourceProvenancePointers,
    family: record.family,
    bucket: record.bucket,
    riskTier: record.riskTier,
    aliasCaution: record.aliasCaution,
    boundaryDisciplineNote: 'Reference context only; no meaning change proposed and no alias fan-out.',
  })).sort((left, right) => left.term.localeCompare(right.term));
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function buildSummaryMarkdown(report) {
  const reopenRows = report.reopened_draft_candidates.map((candidate) => [
    candidate.term,
    candidate.proposedDraftMeaningInLaw,
    candidate.conciseReasonForProposedWording,
  ]);
  const revisionRows = report.revision_review_candidates.map((candidate) => [
    candidate.term,
    candidate.currentMeaning,
    candidate.proposedRevisedMeaningInLaw,
  ]);
  const deferredRows = report.skipped_or_deferred.map((record) => [
    record.term,
    record.reason,
  ]);

  return [
    '# Comparator Draft / Revision Candidates',
    '',
    'Status: DRAFT_REVIEW_PREPARATION_ONLY. No live vocabulary dataset was modified, no existing meaning text was changed, no runtime ontology or concept packets were changed, no writeback was applied, and no alias fan-out was performed.',
    '',
    '## Inputs',
    '',
    `- Approved reopen: ${report.inputFiles.approvedReopen}`,
    `- Approved revision review: ${report.inputFiles.approvedRevisionReview}`,
    `- Comparator queue: ${report.inputFiles.comparatorQueue}`,
    '',
    '## Counts',
    '',
    `- Reopen draft candidates: ${report.counts.reopenedDraftCandidateCount}`,
    `- Revision-review candidates: ${report.counts.revisionReviewCandidateCount}`,
    `- Unchanged reference context rows: ${report.counts.unchangedReferenceContextCount}`,
    `- Skipped or deferred: ${report.counts.skippedOrDeferredCount}`,
    '',
    '## Reopened Draft Candidates',
    '',
    markdownTable(['Term', 'Proposed draft meaning', 'Reason'], reopenRows),
    '',
    '## Revision Review Candidates',
    '',
    markdownTable(['Term', 'Current meaning', 'Proposed revised meaning'], revisionRows),
    '',
    '## Deferred',
    '',
    deferredRows.length > 0
      ? markdownTable(['Term', 'Reason'], deferredRows)
      : 'No terms were deferred.',
    '',
    '## Strongest First Review',
    '',
    '- authentication',
    '- intervention',
    '- pardon',
    '- bequest',
    '- employment',
    '- occupancy',
    '- security',
    '',
    '## Recommendation',
    '',
    '- Review the reopen and revision candidates before any live writeback preview.',
    '- Batch 004 draft-only work can continue in parallel because this packet does not change live meanings.',
    '- Keep provenance exact-term only; do not copy Anderson support across alias rows unless explicitly mapped in a later review.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Review comparator_draft_revision_candidates.json for boundary-safe wording. Approve, revise, or reject each reopened draft and revision-review candidate; keep deferred terms out of writeback. Do not modify the live vocabulary dataset or runtime ontology.',
    '',
  ].join('\n');
}

function main() {
  const approvedReopen = readJson(inputPaths.approvedReopen);
  const approvedRevisionReview = readJson(inputPaths.approvedRevisionReview);
  const queueReport = readJson(inputPaths.comparatorQueue);
  const skippedOrDeferred = [];

  const reopenedDraftCandidates = approvedReopen.map((record) => {
    const candidate = buildReopenCandidate(record);
    if (!candidate) {
      skippedOrDeferred.push(buildDeferred(record, 'No safe comparator draft plan was available for this approved reopen term.'));
    }
    return candidate;
  }).filter(Boolean).sort(prioritySort);

  const revisionReviewCandidates = approvedRevisionReview.map((record) => {
    const candidate = buildRevisionCandidate(record);
    if (!candidate) {
      skippedOrDeferred.push(buildDeferred(record, 'No safe comparator revision plan was available for this approved revision-review term.'));
    }
    return candidate;
  }).filter(Boolean).sort(prioritySort);

  skippedOrDeferred.sort(prioritySort);

  const report = {
    generatedAt: new Date().toISOString(),
    status: 'DRAFT_REVIEW_PREPARATION_ONLY',
    boundaryDiscipline: {
      liveVocabularyDatasetChanged: false,
      existingMeaningTextChanged: false,
      runtimeOntologyChanged: false,
      conceptPacketsChanged: false,
      writebackApplied: false,
      aliasFanOutPerformed: false,
      exactTermProvenanceOnly: true,
    },
    counts: {
      reopenedDraftCandidateCount: reopenedDraftCandidates.length,
      revisionReviewCandidateCount: revisionReviewCandidates.length,
      unchangedReferenceContextCount: queueReport.buckets.second_source_confirmation.length,
      skippedOrDeferredCount: skippedOrDeferred.length,
    },
    inputFiles: Object.fromEntries(
      Object.entries(inputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
    outputFiles: Object.fromEntries(
      Object.entries(outputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
    reopened_draft_candidates: reopenedDraftCandidates,
    revision_review_candidates: revisionReviewCandidates,
    unchanged_reference_context: buildUnchangedReferenceContext(queueReport),
    skipped_or_deferred: skippedOrDeferred,
  };

  writeJson(outputPaths.candidatesJson, report);
  writeJson(outputPaths.skippedOrDeferredJson, skippedOrDeferred);
  fs.writeFileSync(outputPaths.summaryMarkdown, buildSummaryMarkdown(report), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
