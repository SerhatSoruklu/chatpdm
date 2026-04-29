'use strict';

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const alignmentRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/alignment');
const approvalRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/approval_queue');
const reportsDirectory = path.join(approvalRoot, 'reports');

const inputPaths = Object.freeze({
  alignmentSummary: path.join(alignmentRoot, 'reports/registry_alignment_summary.md'),
  alignmentReport: path.join(alignmentRoot, 'reports/registry_alignment_report.json'),
  matchedRegistryTerms: path.join(alignmentRoot, 'matched_registry_terms.json'),
  unmatchedRegistryTerms: path.join(alignmentRoot, 'unmatched_registry_terms.json'),
  runtimeCollisionReport: path.join(alignmentRoot, 'runtime_collision_report.json'),
  meaningCoverageAudit: path.join(repoRoot, 'docs/boundary/meaning-coverage-audit.json'),
  highRiskQueue: path.join(repoRoot, 'docs/boundary/high-risk-meaning-queue.json'),
  safeBatchCandidates: path.join(repoRoot, 'docs/boundary/safe-batch-candidates.json'),
  duplicateTermGroups: path.join(repoRoot, 'docs/boundary/duplicate-term-groups.json'),
});

const outputPaths = Object.freeze({
  summaryMarkdown: path.join(reportsDirectory, 'approval_queue_summary.md'),
  mainApprovalQueue: path.join(approvalRoot, 'main_approval_queue.json'),
  reviewOnlyQueue: path.join(approvalRoot, 'review_only_queue.json'),
  excludedQueue: path.join(approvalRoot, 'excluded_queue.json'),
});

const strictMatchStatuses = new Set(['exact_normalized_match', 'alias_assisted_match']);

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

function buildMissingMeaningSet(meaningCoverageAudit) {
  return new Set(
    meaningCoverageAudit.weakContentAudit.groups.missing
      .map((entry) => normalizeForComparison(entry.term)),
  );
}

function buildHighRiskSet(highRiskQueue) {
  return new Set(
    highRiskQueue.highRiskTerms.map((entry) => normalizeForComparison(entry.term)),
  );
}

function buildRuntimeCollisionSet(runtimeCollisionReport) {
  return new Set(
    runtimeCollisionReport.map((entry) => normalizeForComparison(entry.term)),
  );
}

function buildAliasNotes(duplicateTermGroups) {
  const notesByTerm = new Map();

  duplicateTermGroups.likelyAliasGroups.forEach((group) => {
    const terms = group.terms.map((entry) => entry.term).sort((left, right) => left.localeCompare(right));
    group.terms.forEach((entry) => {
      notesByTerm.set(
        normalizeForComparison(entry.term),
        `Likely alias group "${group.canonicalKey}" with ${terms.length} terms: ${terms.join(', ')}`,
      );
    });
  });

  return notesByTerm;
}

function buildFamilyRank(safeBatchCandidates) {
  const rankByFamily = new Map();
  safeBatchCandidates.summary.topTenSafestFamiliesOrGroups.forEach((family, index) => {
    rankByFamily.set(family, index + 1);
  });

  return rankByFamily;
}

function currentMeaningStatus(term, missingMeaningSet) {
  return missingMeaningSet.has(normalizeForComparison(term))
    ? 'missing'
    : 'authored_review_needed';
}

function compactReferences(references) {
  return references.map((reference) => ({
    sourceId: reference.sourceId,
    sourceTitle: reference.sourceTitle,
    year: reference.year,
    volume: reference.volume,
    sourceFile: reference.sourceFile,
    page: reference.page,
    lineNumber: reference.lineNumber,
    headword: reference.headword,
    rawLine: reference.rawLine,
    contextPreview: reference.contextPreview,
    parseConfidence: reference.parseConfidence,
  }));
}

function baseQueueRecord(term, context, recommendedAction, skipReason = null) {
  const normalizedTerm = term.normalizedTerm ?? normalizeForComparison(term.term);
  const runtimeCollisionFlag = context.runtimeCollisionSet.has(normalizedTerm)
    || (term.runtimeCollisionTypes?.length ?? 0) > 0;

  return {
    term: term.term,
    normalizedTerm,
    family: term.family,
    bucket: term.classification,
    riskTier: term.riskTier ?? (context.highRiskSet.has(normalizedTerm) ? 'high' : 'unknown'),
    currentMeaningStatus: currentMeaningStatus(term.term, context.missingMeaningSet),
    matchStatus: term.matchStatus ?? 'no_match',
    sourceReferences: compactReferences(term.references ?? []),
    supportingHitCount: term.supportingReferenceCount ?? 0,
    aliasGroupNote: context.aliasNotesByTerm.get(normalizedTerm) ?? null,
    runtimeCollisionFlag,
    recommendedAction,
    skipReason,
  };
}

function isStrongMediumSupport(term) {
  const sourceIds = new Set(term.supportingSourceIds ?? []);
  return (
    strictMatchStatuses.has(term.matchStatus)
    && term.supportingReferenceCount >= 2
    && sourceIds.has('blacks_1910')
  );
}

function mainEligibility(term, context) {
  const normalizedTerm = term.normalizedTerm ?? normalizeForComparison(term.term);
  if (!strictMatchStatuses.has(term.matchStatus)) {
    return { eligible: false, reason: 'not_strict_black_match' };
  }
  if (context.runtimeCollisionSet.has(normalizedTerm) || (term.runtimeCollisionTypes?.length ?? 0) > 0) {
    return { eligible: false, reason: 'runtime_collision' };
  }
  if (term.sourceStatus && term.sourceStatus !== 'registry_only') {
    return { eligible: false, reason: 'not_registry_only' };
  }
  if (term.riskTier === 'high' || context.highRiskSet.has(normalizedTerm)) {
    return { eligible: false, reason: 'high_risk' };
  }
  if (term.riskTier === 'low') {
    return { eligible: true, reason: null };
  }
  if (term.riskTier === 'medium_or_unclassified' && isStrongMediumSupport(term)) {
    return { eligible: true, reason: null };
  }

  return { eligible: false, reason: 'medium_support_not_strong_enough' };
}

function reviewReason(term, context) {
  const normalizedTerm = term.normalizedTerm ?? normalizeForComparison(term.term);
  if (context.runtimeCollisionSet.has(normalizedTerm) || (term.runtimeCollisionTypes?.length ?? 0) > 0) {
    return null;
  }
  if (term.matchStatus === 'probable_review_match') {
    return 'probable_review_match_only';
  }
  if (term.riskTier === 'high' || context.highRiskSet.has(normalizedTerm)) {
    return 'high_risk_manual_review';
  }
  if (
    term.riskTier === 'medium_or_unclassified'
    && strictMatchStatuses.has(term.matchStatus)
    && !isStrongMediumSupport(term)
  ) {
    return 'medium_strict_match_with_single_or_weaker_support';
  }

  return null;
}

function familyRank(term, context) {
  return context.rankByFamily.get(term.family) ?? 999;
}

function sortQueueRecords(left, right, context) {
  const riskRank = { low: 1, medium_or_unclassified: 2, high: 3, unknown: 4 };
  const matchRank = { exact_normalized_match: 1, alias_assisted_match: 2, probable_review_match: 3, no_match: 4 };

  return (
    (riskRank[left.riskTier] ?? 9) - (riskRank[right.riskTier] ?? 9)
    || familyRank(left, context) - familyRank(right, context)
    || (matchRank[left.matchStatus] ?? 9) - (matchRank[right.matchStatus] ?? 9)
    || right.supportingHitCount - left.supportingHitCount
    || left.term.localeCompare(right.term)
  );
}

function buildQueues() {
  const alignmentReport = readJson(inputPaths.alignmentReport);
  const matchedRegistryTerms = readJson(inputPaths.matchedRegistryTerms);
  const unmatchedRegistryTerms = readJson(inputPaths.unmatchedRegistryTerms);
  const runtimeCollisionReport = readJson(inputPaths.runtimeCollisionReport);
  const meaningCoverageAudit = readJson(inputPaths.meaningCoverageAudit);
  const highRiskQueue = readJson(inputPaths.highRiskQueue);
  const safeBatchCandidates = readJson(inputPaths.safeBatchCandidates);
  const duplicateTermGroups = readJson(inputPaths.duplicateTermGroups);

  const context = {
    missingMeaningSet: buildMissingMeaningSet(meaningCoverageAudit),
    highRiskSet: buildHighRiskSet(highRiskQueue),
    runtimeCollisionSet: buildRuntimeCollisionSet(runtimeCollisionReport),
    aliasNotesByTerm: buildAliasNotes(duplicateTermGroups),
    rankByFamily: buildFamilyRank(safeBatchCandidates),
  };

  const mainApprovalQueue = [];
  const reviewOnlyQueue = [];
  const excludedQueue = [];

  matchedRegistryTerms.forEach((term) => {
    const eligibility = mainEligibility(term, context);
    if (eligibility.eligible) {
      mainApprovalQueue.push(baseQueueRecord(
        term,
        context,
        term.riskTier === 'low'
          ? 'approve_for_first_authoring_review'
          : 'approve_for_first_authoring_review_after_medium_risk_spot_check',
      ));
      return;
    }

    const reason = reviewReason(term, context);
    if (reason) {
      reviewOnlyQueue.push(baseQueueRecord(
        term,
        context,
        'manual_review_before_authoring_queue',
        reason,
      ));
      return;
    }

    excludedQueue.push(baseQueueRecord(
      term,
      context,
      'exclude_from_first_authoring_queue',
      eligibility.reason,
    ));
  });

  unmatchedRegistryTerms.forEach((term) => {
    const normalizedTerm = term.normalizedTerm ?? normalizeForComparison(term.term);
    const skipReason = context.runtimeCollisionSet.has(normalizedTerm)
      ? 'runtime_collision'
      : 'no_strict_black_reference';

    excludedQueue.push(baseQueueRecord(
      {
        ...term,
        matchStatus: 'no_match',
        supportingReferenceCount: 0,
        references: [],
      },
      context,
      'exclude_from_first_authoring_queue',
      skipReason,
    ));
  });

  mainApprovalQueue.sort((left, right) => sortQueueRecords(left, right, context));
  reviewOnlyQueue.sort((left, right) => sortQueueRecords(left, right, context));
  excludedQueue.sort((left, right) => sortQueueRecords(left, right, context));

  return {
    alignmentReport,
    meaningCoverageAudit,
    safeBatchCandidates,
    mainApprovalQueue,
    reviewOnlyQueue,
    excludedQueue,
  };
}

function countBy(records, key) {
  return records.reduce((counts, record) => {
    const value = record[key] ?? 'unknown';
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function topFamilies(records, limit = 10) {
  return Object.entries(countBy(records, 'family'))
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function buildSummaryMarkdown(queueReport) {
  const mainFamilyRows = topFamilies(queueReport.mainApprovalQueue).map(([family, count]) => [family, count]);
  const mainRiskRows = Object.entries(countBy(queueReport.mainApprovalQueue, 'riskTier'))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([riskTier, count]) => [riskTier, count]);
  const reviewReasonRows = Object.entries(countBy(queueReport.reviewOnlyQueue, 'skipReason'))
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([reason, count]) => [reason, count]);
  const excludedReasonRows = Object.entries(countBy(queueReport.excludedQueue, 'skipReason'))
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([reason, count]) => [reason, count]);

  return [
    '# First Reference-Backed Meaning Approval Queue',
    '',
    'Scope: Black 1910 and Black 1891 strict/reference-backed queue selection for ChatPDM vocabulary-boundary terms only. This report does not author meanings, modify runtime ontology, change boundary content, process Bouvier/Ballentine/Burrill, or touch live concept packets.',
    '',
    '## Implemented / Partial / Missing / Not Evidenced',
    '',
    '- Implemented: deterministic filtering of strict Black matches into main, review-only, and excluded queues.',
    '- Partial: medium-risk inclusion uses strict support plus Black 1910 presence as a conservative proxy for stronger support.',
    '- Missing: actual meaning authoring, source-snippet legal review, final reference corpus, and frontend reference index.',
    '- Not evidenced: that any queued source snippet is sufficient by itself for final wording.',
    '',
    '## Counts',
    '',
    `- Main approval queue: ${queueReport.mainApprovalQueue.length}`,
    `- Review-only queue: ${queueReport.reviewOnlyQueue.length}`,
    `- Excluded queue: ${queueReport.excludedQueue.length}`,
    `- Strict Black-supported boundary terms from alignment: ${queueReport.alignmentReport.coverage.strictMatchedRegistryTerms}`,
    `- Probable review-only terms from alignment: ${queueReport.alignmentReport.coverage.probableReviewOnlyTerms}`,
    '',
    '## Main Queue By Risk',
    '',
    markdownTable(['Risk tier', 'Count'], mainRiskRows),
    '',
    '## Dominant Main Queue Families',
    '',
    markdownTable(['Family', 'Count'], mainFamilyRows),
    '',
    '## Review-Only Reasons',
    '',
    markdownTable(['Reason', 'Count'], reviewReasonRows),
    '',
    '## Excluded Reasons',
    '',
    markdownTable(['Reason', 'Count'], excludedReasonRows),
    '',
    '## Recommendation',
    '',
    '- First actual authoring batch should be 50 terms, not 100, because the queue now includes medium-risk terms and the authoring style has not yet been source-reviewed.',
    '- Prefer the low-risk exact-match rows first; use medium-risk rows only after the first 50 have passed review.',
    '- Bouvier remains deferrable until this Black-backed queue is reviewed and the first authoring pass exposes real coverage gaps.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Author boundary-safe Meaning in law drafts for the first 50 terms from main_approval_queue.json. Use only the listed Black source references as support, preserve registry-only framing, do not touch runtime ontology or concept packets, and produce a before/after review report without modifying the live vocabulary dataset until approved.',
    '',
    '## Generated Outputs',
    '',
    ...Object.values(outputPaths).map((filePath) => `- \`${toWindowsPath(filePath)}\``),
    '',
  ].join('\n');
}

function main() {
  fs.mkdirSync(reportsDirectory, { recursive: true });
  const queueReport = {
    generatedAt: new Date().toISOString(),
    boundaryDiscipline: {
      meaningAuthoringPerformed: false,
      runtimeOntologyChanged: false,
      boundaryContentChanged: false,
      liveConceptPacketsTouched: false,
      nonBlackSourcesProcessed: false,
    },
    inputFiles: Object.fromEntries(
      Object.entries(inputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
    ...buildQueues(),
  };

  writeJson(outputPaths.mainApprovalQueue, queueReport.mainApprovalQueue);
  writeJson(outputPaths.reviewOnlyQueue, queueReport.reviewOnlyQueue);
  writeJson(outputPaths.excludedQueue, queueReport.excludedQueue);
  fs.writeFileSync(outputPaths.summaryMarkdown, buildSummaryMarkdown(queueReport), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
