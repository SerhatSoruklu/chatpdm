'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  buildVocabularyBoundaryResponse,
} = require('../../../src/modules/legal-vocabulary/vocabulary-boundary');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const lexiconRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons');
const outputRoot = path.join(lexiconRoot, 'approval_queue_v2');
const draftRoot = path.join(lexiconRoot, 'draft_meanings');
const multiSourceRoot = path.join(lexiconRoot, 'multi_source');
const multiSourceV3Root = path.join(lexiconRoot, 'multi_source_v3');

const maxRankedCandidates = 1000;
const futureBatches = Object.freeze(['batch_008', 'batch_009', 'batch_010', 'batch_011', 'batch_012']);
const sliceNames = Object.freeze(['A', 'B', 'C', 'D']);
const ocrBlockedSources = Object.freeze([
  'bouvier_1839_vol_1',
  'bouvier_1839_vol_2',
  'burrill_1860',
  'ballentine_1916',
]);

const inputPaths = Object.freeze({
  matchedRegistryTerms: path.join(lexiconRoot, 'alignment/matched_registry_terms.json'),
  mainApprovalQueue: path.join(lexiconRoot, 'approval_queue/main_approval_queue.json'),
  batch007Drafts: path.join(draftRoot, 'batch_007/batch_007_available_30_drafts.json'),
  batch007Skipped: path.join(draftRoot, 'batch_007/batch_007_available_30_skipped.json'),
  duplicateTermGroups: path.join(repoRoot, 'docs/boundary/duplicate-term-groups.json'),
  meaningSources: path.join(
    repoRoot,
    'backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json',
  ),
  andersonAlignment: path.join(multiSourceRoot, 'alignment/anderson_1889.boundary_alignment.ndjson'),
  osbornAlignment: path.join(multiSourceRoot, 'alignment/osborn_1927.boundary_alignment.ndjson'),
  whartonAlignment: path.join(multiSourceV3Root, 'alignment/wharton_1883.boundary_alignment.ndjson'),
  stroudAlignment: path.join(multiSourceV3Root, 'alignment/stroud_1903.boundary_alignment.ndjson'),
});

const outputPaths = Object.freeze({
  rankedJson: path.join(outputRoot, 'approval_queue_v2_ranked_candidates.json'),
  rankedNdjson: path.join(outputRoot, 'approval_queue_v2_ranked_candidates.ndjson'),
  summaryMarkdown: path.join(outputRoot, 'approval_queue_v2_summary.md'),
  skippedOrBlockedJson: path.join(outputRoot, 'approval_queue_v2_skipped_or_blocked.json'),
  batchPlanMarkdown: path.join(outputRoot, 'approval_queue_v2_batch_plan.md'),
  batchPlanJson: path.join(outputRoot, 'approval_queue_v2_batch_plan.json'),
  repoSummaryMarkdown: path.join(repoRoot, 'docs/boundary/approval-queue-v2-summary.md'),
  repoSummaryJson: path.join(repoRoot, 'docs/boundary/approval-queue-v2-summary.json'),
});

const broadOrdinaryWords = new Set([
  'act',
  'case',
  'cause',
  'charge',
  'condition',
  'control',
  'demand',
  'interest',
  'issue',
  'matter',
  'notice',
  'order',
  'party',
  'power',
  'process',
  'property',
  'right',
  'service',
  'title',
  'use',
]);

const historicalScopePatterns = [
  /ecclesiastical/i,
  /feudal/i,
  /scotch/i,
  /old english/i,
  /roman law/i,
  /civil law/i,
  /maritime/i,
  /admiralty/i,
  /international law/i,
  /military law/i,
  /manor/i,
  /copyhold/i,
];

const jurisdictionScopePatterns = [
  /english law/i,
  /scotch law/i,
  /civil law/i,
  /roman law/i,
  /french law/i,
  /spanish law/i,
  /canon law/i,
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

function readNdjson(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line));
}

function normalizeForComparison(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[.,;:]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function referenceKey(reference) {
  return [
    reference.sourceId,
    reference.sourceTitle,
    reference.year,
    reference.page,
    reference.lineNumber,
    reference.headword,
  ].join('::');
}

function compactBlackReferences(references) {
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

function compactComparatorReferences(references, referenceRole) {
  return references.map((reference) => ({
    sourceId: reference.sourceId,
    sourceTitle: reference.sourceTitle,
    year: reference.year,
    volume: reference.volume,
    sourceFile: reference.sourceFile,
    page: reference.page,
    lineNumber: reference.lineNumber,
    headword: reference.headword,
    normalizedHeadword: reference.normalizedHeadword,
    matchStatus: reference.matchStatus,
    rawLine: reference.rawLine,
    contextPreview: reference.contextPreview,
    supportingSnippet: reference.supportingSnippet,
    parseConfidence: reference.parseConfidence,
    sourceQualityTier: reference.sourceQualityTier,
    extractionMode: reference.extractionMode,
    comparatorRole: reference.comparatorRole ?? referenceRole,
    authorityLevel: reference.authorityLevel ?? 'comparator_only_not_primary',
    mayCreateMeaning: false,
    mayOverrideBlack: false,
    mayAdmitRuntimeOntology: false,
    referenceRole,
  }));
}

function buildReferenceMap(records, getTerm, getReferences) {
  const referencesByTerm = new Map();

  records.forEach((record) => {
    const normalized = normalizeForComparison(getTerm(record));
    if (!referencesByTerm.has(normalized)) {
      referencesByTerm.set(normalized, new Map());
    }

    getReferences(record).forEach((reference) => {
      referencesByTerm.get(normalized).set(referenceKey(reference), reference);
    });
  });

  return new Map([...referencesByTerm.entries()].map(([term, references]) => [
    term,
    [...references.values()].sort((left, right) => (
      (left.page ?? 0) - (right.page ?? 0)
      || (left.lineNumber ?? 0) - (right.lineNumber ?? 0)
      || String(left.headword ?? '').localeCompare(String(right.headword ?? ''))
    )),
  ]));
}

function buildComparatorReferenceMap(filePath) {
  return buildReferenceMap(
    readNdjson(filePath).filter((record) => record.matchStatus === 'exact_normalized_match'),
    (record) => record.normalizedBoundaryTerm ?? record.boundaryTerm,
    (record) => [record],
  );
}

function buildAliasNotes() {
  const duplicateTermGroups = readJson(inputPaths.duplicateTermGroups);
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

function buildBoundaryMaps() {
  const response = buildVocabularyBoundaryResponse();
  const entriesByTerm = new Map();
  const entries = [];
  const meaningTerms = new Set();

  response.entries.forEach((entry) => {
    const normalized = normalizeForComparison(entry.term);
    entries.push(entry);
    entriesByTerm.set(normalized, entry);
    if (entry.meaningInLaw) {
      meaningTerms.add(normalized);
    }
  });

  return {
    totalRegistryEntries: response.entries.length,
    entries,
    entriesByTerm,
    meaningTerms,
  };
}

function computeRisks(term, references, duplicateGroupNote) {
  const normalized = normalizeForComparison(term);
  const snippets = references
    .map((reference) => `${reference.rawLine ?? ''} ${reference.contextPreview ?? ''}`)
    .join('\n');

  return {
    aliasRisk: term.includes('_') ? 'underscore_alias_surface' : (duplicateGroupNote ? 'duplicate_group' : 'low'),
    broadOrdinaryWordRisk: broadOrdinaryWords.has(normalized),
    historicalScopeRisk: historicalScopePatterns.some((pattern) => pattern.test(snippets)),
    jurisdictionScopeRisk: jurisdictionScopePatterns.some((pattern) => pattern.test(snippets)),
  };
}

function rankCandidate(candidate) {
  let score = 0;
  score += candidate.blackReferenceCount > 0 ? 1000 : 0;
  score += Math.min(candidate.blackReferenceCount, 5) * 40;
  score += candidate.andersonExactReferenceCount > 0 ? 90 : 0;
  score += candidate.osbornExactReferenceCount > 0 ? 80 : 0;
  score += candidate.stroudV3ExactReferenceCount > 0 ? 50 : 0;
  score += candidate.whartonV3ExactReferenceCount > 0 ? 40 : 0;
  score += candidate.aliasRisk === 'low' ? 75 : -300;
  score += candidate.broadOrdinaryWordRisk ? -100 : 30;
  score += candidate.historicalScopeRisk ? -40 : 20;
  score += candidate.jurisdictionScopeRisk ? -40 : 20;
  score += candidate.family && candidate.bucket ? 25 : 0;
  score += candidate.riskTier === 'low' ? 30 : 0;
  return score;
}

function assignBatchPosition(index) {
  const batchIndex = Math.floor(index / 200);
  const batch = futureBatches[batchIndex] ?? 'later';
  const positionInBatch = index % 200;
  return {
    recommendedBatch: batch,
    recommendedSlice: batch === 'later'
      ? 'later'
      : sliceNames[Math.floor(positionInBatch / 50)],
  };
}

function gitDiffStatus(paths) {
  const output = execFileSync('git', ['diff', '--name-only', '--', ...paths], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();

  return {
    clean: output.length === 0,
    changedPaths: output ? output.split(/\r?\n/) : [],
  };
}

function buildQueue() {
  const boundary = buildBoundaryMaps();
  const meaningSources = readJson(inputPaths.meaningSources);
  const sourceBackedTerms = new Set(Object.keys(meaningSources.terms ?? {}).map(normalizeForComparison));
  const priorQueue = readJson(inputPaths.mainApprovalQueue);
  const batch007Records = [
    ...readJson(inputPaths.batch007Drafts),
    ...readJson(inputPaths.batch007Skipped),
  ];
  const batch007Terms = new Set(batch007Records.map((record) => normalizeForComparison(record.term)));
  const matchedRegistryTerms = readJson(inputPaths.matchedRegistryTerms);
  const blackByTerm = buildReferenceMap(
    matchedRegistryTerms,
    (record) => record.normalizedTerm ?? record.term,
    (record) => record.references ?? [],
  );
  const aliasNotesByTerm = buildAliasNotes();
  const andersonByTerm = buildComparatorReferenceMap(inputPaths.andersonAlignment);
  const osbornByTerm = buildComparatorReferenceMap(inputPaths.osbornAlignment);
  const whartonByTerm = buildComparatorReferenceMap(inputPaths.whartonAlignment);
  const stroudByTerm = buildComparatorReferenceMap(inputPaths.stroudAlignment);

  const records = [];
  const skippedOrBlocked = [];

  boundary.entries.forEach((entry) => {
    const normalizedTerm = normalizeForComparison(entry.term);
    const blackReferences = compactBlackReferences(blackByTerm.get(normalizedTerm) ?? []);
    const andersonReferences = compactComparatorReferences(andersonByTerm.get(normalizedTerm) ?? [], 'comparator_support');
    const osbornReferences = compactComparatorReferences(osbornByTerm.get(normalizedTerm) ?? [], 'comparator_support');
    const whartonReferences = compactComparatorReferences(whartonByTerm.get(normalizedTerm) ?? [], 'assistive_v3_only');
    const stroudReferences = compactComparatorReferences(stroudByTerm.get(normalizedTerm) ?? [], 'assistive_v3_only');
    const duplicateGroupNote = aliasNotesByTerm.get(normalizedTerm) ?? null;
    const risks = computeRisks(entry.term, blackReferences, duplicateGroupNote);

    let eligibilityDecision = 'eligible_for_future_batch';
    let blockedReason = null;

    if (sourceBackedTerms.has(normalizedTerm) || boundary.meaningTerms.has(normalizedTerm)) {
      eligibilityDecision = 'skip_existing_meaning';
      blockedReason = 'Existing source-backed or boundary meaningInLaw is present.';
    } else if (batch007Terms.has(normalizedTerm)) {
      eligibilityDecision = 'skip_batch_007_pending';
      blockedReason = 'Term is already scheduled in Batch 007 draft-only artifacts.';
    } else if (entry.term.includes('_')) {
      eligibilityDecision = 'skip_alias_surface';
      blockedReason = 'Underscore alias surface is excluded because no alias fan-out policy exists.';
    } else if (duplicateGroupNote) {
      eligibilityDecision = 'skip_duplicate_alias_group';
      blockedReason = 'Duplicate alias group requires explicit alias policy before queueing.';
    } else if (blackReferences.length === 0) {
      eligibilityDecision = 'skip_no_black_primary';
      blockedReason = 'No exact Black primary provenance found.';
    } else if (blackReferences.every((reference) => reference.parseConfidence === 'low')) {
      eligibilityDecision = 'skip_low_provenance_quality';
      blockedReason = 'Only low-confidence Black provenance was found.';
    } else if (risks.broadOrdinaryWordRisk || risks.historicalScopeRisk || risks.jurisdictionScopeRisk) {
      eligibilityDecision = 'review_risk';
    }

    const baseRecord = {
      term: entry.term,
      normalizedTerm,
      family: entry.familyLabel ?? entry.family,
      bucket: entry.classificationLabel ?? entry.classification,
      riskTier: entry.riskTier ?? 'medium_or_unclassified',
      currentMeaningStatus: entry.meaningInLaw ? 'has_boundary_meaning' : 'missing',
      blackReferenceCount: blackReferences.length,
      andersonExactReferenceCount: andersonReferences.length,
      osbornExactReferenceCount: osbornReferences.length,
      whartonV3ExactReferenceCount: whartonReferences.length,
      stroudV3ExactReferenceCount: stroudReferences.length,
      aliasRisk: risks.aliasRisk,
      duplicateGroupNote,
      broadOrdinaryWordRisk: risks.broadOrdinaryWordRisk,
      historicalScopeRisk: risks.historicalScopeRisk,
      jurisdictionScopeRisk: risks.jurisdictionScopeRisk,
      eligibilityDecision,
      provenancePointers: {
        black: blackReferences,
        anderson: andersonReferences,
        osborn: osbornReferences,
        wharton_v3: whartonReferences,
        stroud_v3: stroudReferences,
      },
    };

    const rankingScore = rankCandidate(baseRecord);
    const record = {
      ...baseRecord,
      rankingScore,
    };

    if (eligibilityDecision === 'eligible_for_future_batch' || eligibilityDecision === 'review_risk') {
      records.push(record);
    } else {
      skippedOrBlocked.push({
        ...record,
        blockedReason,
      });
    }
  });

  records.sort((left, right) => (
    right.rankingScore - left.rankingScore
    || left.term.localeCompare(right.term)
  ));

  const rankedCandidates = records.slice(0, maxRankedCandidates).map((record, index) => {
    const batchPosition = assignBatchPosition(index);
    return {
      queueV2Position: index + 1,
      ...record,
      recommendedBatch: batchPosition.recommendedBatch,
      recommendedSlice: batchPosition.recommendedSlice,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    totalRegistryEntriesConsidered: boundary.totalRegistryEntries,
    currentSourceBackedMeaningCount: sourceBackedTerms.size,
    currentBoundaryMeaningCount: boundary.meaningTerms.size,
    originalApprovalQueueCount: priorQueue.length,
    batch007PendingCount: batch007Terms.size,
    rankedCandidates,
    skippedOrBlocked,
  };
}

function countBy(records, key) {
  return records.reduce((counts, record) => {
    const value = record[key];
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function buildBatchPlan(candidates) {
  return {
    generatedAt: new Date().toISOString(),
    mode: 'approval_queue_v2_batch_plan_only',
    batchSize: 200,
    sliceSize: 50,
    batches: futureBatches.map((batchId) => {
      const batchCandidates = candidates.filter((candidate) => candidate.recommendedBatch === batchId);
      return {
        batchId,
        candidateCount: batchCandidates.length,
        queueV2Range: batchCandidates.length > 0
          ? {
            start: batchCandidates[0].queueV2Position,
            end: batchCandidates[batchCandidates.length - 1].queueV2Position,
          }
          : null,
        slices: sliceNames.map((sliceId) => {
          const sliceCandidates = batchCandidates.filter((candidate) => candidate.recommendedSlice === sliceId);
          return {
            sliceId,
            candidateCount: sliceCandidates.length,
            queueV2Range: sliceCandidates.length > 0
              ? {
                start: sliceCandidates[0].queueV2Position,
                end: sliceCandidates[sliceCandidates.length - 1].queueV2Position,
              }
              : null,
            terms: sliceCandidates.map((candidate) => candidate.term),
          };
        }),
      };
    }),
    laterCount: candidates.filter((candidate) => candidate.recommendedBatch === 'later').length,
    note: 'Batch plan is queue-only. It does not generate drafts or writeback previews.',
  };
}

function markdownCell(value) {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replace(/\s+/g, ' ')
    .trim();
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
}

function summarizeQueue(queue) {
  const candidates = queue.rankedCandidates;
  const skipped = queue.skippedOrBlocked;
  const eligibilityCounts = {
    ...countBy(candidates, 'eligibilityDecision'),
    ...countBy(skipped, 'eligibilityDecision'),
  };

  return {
    generatedAt: queue.generatedAt,
    mode: 'approval_queue_v2_ranked_queue_only',
    totalRegistryEntriesConsidered: queue.totalRegistryEntriesConsidered,
    existingMeaningsExcluded: skipped.filter((record) => record.eligibilityDecision === 'skip_existing_meaning').length,
    batch007PendingExcluded: skipped.filter((record) => record.eligibilityDecision === 'skip_batch_007_pending').length,
    eligibleFutureCandidateCount: candidates.filter((record) => record.eligibilityDecision === 'eligible_for_future_batch').length,
    reviewRiskCandidateCount: candidates.filter((record) => record.eligibilityDecision === 'review_risk').length,
    rankedCandidateCount: candidates.length,
    skippedOrBlockedCount: skipped.length,
    whartonV3SupportedCandidateCount: candidates.filter((record) => record.whartonV3ExactReferenceCount > 0).length,
    stroudV3SupportedCandidateCount: candidates.filter((record) => record.stroudV3ExactReferenceCount > 0).length,
    eligibilityCounts,
    ocrBlockedSourcesExcluded: ocrBlockedSources,
    safety: {
      queueArtifactsOnly: true,
      noVocabularyMeaningsWritten: true,
      noWritebackPreviewCreated: true,
      noWritebackApplied: true,
      noAliasesAdded: true,
      noFuzzyMatching: true,
      blackPrimaryMandatory: true,
      whartonStroudAssistiveOnly: true,
      ocrBlockedSourcesNotUsed: true,
      noBatch008DraftArtifactsCreated: true,
    },
  };
}

function buildSummaryMarkdown(summary, batchPlan) {
  return [
    '# Approval Queue v2 Summary',
    '',
    'Approval Queue v2 is queue-only. It does not write meanings, create drafts, create writeback previews, alter runtime ontology, alter concept packets, alter resolver behavior, or add aliases.',
    '',
    'Black remains mandatory primary provenance. Anderson and Osborn are comparator context. Wharton and Stroud are Comparator v3 assistive-only sources. Bouvier, Burrill, and Ballentine were not used because they are OCR-blocked.',
    '',
    '## Counts',
    '',
    markdownTable(
      ['Metric', 'Count'],
      [
        ['Total registry entries considered', summary.totalRegistryEntriesConsidered],
        ['Existing meanings excluded', summary.existingMeaningsExcluded],
        ['Batch 007 pending excluded', summary.batch007PendingExcluded],
        ['Eligible future candidates', summary.eligibleFutureCandidateCount],
        ['Review-risk candidates', summary.reviewRiskCandidateCount],
        ['Ranked candidate count', summary.rankedCandidateCount],
        ['Skipped/blocked count', summary.skippedOrBlockedCount],
        ['Wharton v3 supported candidates', summary.whartonV3SupportedCandidateCount],
        ['Stroud v3 supported candidates', summary.stroudV3SupportedCandidateCount],
      ],
    ),
    '',
    '## Eligibility Counts',
    '',
    markdownTable(
      ['Decision', 'Count'],
      Object.entries(summary.eligibilityCounts).sort((left, right) => left[0].localeCompare(right[0])),
    ),
    '',
    '## Proposed Batch Plan',
    '',
    markdownTable(
      ['Batch', 'Candidates', 'Queue v2 range'],
      batchPlan.batches.map((batch) => [
        batch.batchId,
        batch.candidateCount,
        batch.queueV2Range ? `${batch.queueV2Range.start}-${batch.queueV2Range.end}` : 'none',
      ]),
    ),
    '',
    '## Safety',
    '',
    '- Queue v2 ranks candidates only.',
    '- No Batch 008 draft artifacts were created.',
    '- No writeback preview was created.',
    '- No writeback was applied.',
    '- OCR-blocked v3 sources were excluded.',
    '- Wharton and Stroud cannot originate meanings or override Black.',
    '',
  ].join('\n');
}

function buildBatchPlanMarkdown(batchPlan) {
  const lines = [
    '# Approval Queue v2 Batch Plan',
    '',
    'This is a queue-only plan for future 200-scanned batches. It does not generate drafts or writeback previews.',
    '',
    '## Batches',
    '',
  ];

  batchPlan.batches.forEach((batch) => {
    lines.push(`### ${batch.batchId}`, '');
    lines.push(`Candidate count: ${batch.candidateCount}`, '');
    lines.push(markdownTable(
      ['Slice', 'Candidates', 'Queue v2 range'],
      batch.slices.map((slice) => [
        slice.sliceId,
        slice.candidateCount,
        slice.queueV2Range ? `${slice.queueV2Range.start}-${slice.queueV2Range.end}` : 'none',
      ]),
    ));
    lines.push('');
  });

  return `${lines.join('\n')}\n`;
}

function main() {
  const queue = buildQueue();
  const summary = summarizeQueue(queue);
  const batchPlan = buildBatchPlan(queue.rankedCandidates);
  const diffStatus = {
    generatedMeaningSources: gitDiffStatus([
      'backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json',
    ]),
    dataConcepts: gitDiffStatus(['data/concepts']),
    backendConceptModules: gitDiffStatus(['backend/src/modules/concepts']),
  };
  const finalSummary = {
    ...summary,
    validationSnapshot: {
      protectedDiffStatus: diffStatus,
    },
    outputPaths,
  };

  writeJson(outputPaths.rankedJson, queue.rankedCandidates);
  writeText(
    outputPaths.rankedNdjson,
    `${queue.rankedCandidates.map((candidate) => JSON.stringify(candidate)).join('\n')}\n`,
  );
  writeJson(outputPaths.skippedOrBlockedJson, queue.skippedOrBlocked);
  writeJson(outputPaths.batchPlanJson, batchPlan);
  writeText(outputPaths.batchPlanMarkdown, buildBatchPlanMarkdown(batchPlan));
  writeText(outputPaths.summaryMarkdown, buildSummaryMarkdown(finalSummary, batchPlan));
  writeJson(outputPaths.repoSummaryJson, finalSummary);
  writeText(outputPaths.repoSummaryMarkdown, buildSummaryMarkdown(finalSummary, batchPlan));

  console.log(JSON.stringify({
    totalRegistryEntriesConsidered: finalSummary.totalRegistryEntriesConsidered,
    existingMeaningsExcluded: finalSummary.existingMeaningsExcluded,
    batch007PendingExcluded: finalSummary.batch007PendingExcluded,
    eligibleFutureCandidateCount: finalSummary.eligibleFutureCandidateCount,
    reviewRiskCandidateCount: finalSummary.reviewRiskCandidateCount,
    rankedCandidateCount: finalSummary.rankedCandidateCount,
    skippedOrBlockedCount: finalSummary.skippedOrBlockedCount,
    whartonV3SupportedCandidateCount: finalSummary.whartonV3SupportedCandidateCount,
    stroudV3SupportedCandidateCount: finalSummary.stroudV3SupportedCandidateCount,
    outputPaths,
  }, null, 2));
}

main();
