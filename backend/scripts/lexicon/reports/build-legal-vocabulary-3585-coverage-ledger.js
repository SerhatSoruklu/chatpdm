'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  buildVocabularyBoundaryResponse,
} = require('../../../src/modules/legal-vocabulary/vocabulary-boundary');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const lexiconRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons');
const coverageRoot = path.join(lexiconRoot, 'coverage');
const draftRoot = path.join(lexiconRoot, 'draft_meanings');
const multiSourceRoot = path.join(lexiconRoot, 'multi_source');
const multiSourceV3Root = path.join(lexiconRoot, 'multi_source_v3');

const inputPaths = Object.freeze({
  meaningSources: path.join(
    repoRoot,
    'backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json',
  ),
  matchedRegistryTerms: path.join(lexiconRoot, 'alignment/matched_registry_terms.json'),
  queueV2Ranked: path.join(lexiconRoot, 'approval_queue_v2/approval_queue_v2_ranked_candidates.json'),
  queueV2SkippedOrBlocked: path.join(lexiconRoot, 'approval_queue_v2/approval_queue_v2_skipped_or_blocked.json'),
  duplicateTermGroups: path.join(repoRoot, 'docs/boundary/duplicate-term-groups.json'),
  andersonAlignment: path.join(multiSourceRoot, 'alignment/anderson_1889.boundary_alignment.ndjson'),
  osbornAlignment: path.join(multiSourceRoot, 'alignment/osborn_1927.boundary_alignment.ndjson'),
  whartonAlignment: path.join(multiSourceV3Root, 'alignment/wharton_1883.boundary_alignment.ndjson'),
  stroudAlignment: path.join(multiSourceV3Root, 'alignment/stroud_1903.boundary_alignment.ndjson'),
  batch007Review: path.join(draftRoot, 'review/batch_007_wording_review.json'),
  batch008Review: path.join(draftRoot, 'review/batch_008_wording_review.json'),
  batch009Review: path.join(draftRoot, 'review/batch_009_wording_review.json'),
});

const outputPaths = Object.freeze({
  ledgerJson: path.join(coverageRoot, 'coverage_3585_ledger.json'),
  ledgerNdjson: path.join(coverageRoot, 'coverage_3585_ledger.ndjson'),
  summaryMarkdown: path.join(coverageRoot, 'coverage_3585_summary.md'),
  blockedBreakdownJson: path.join(coverageRoot, 'coverage_3585_blocked_breakdown.json'),
  unlockPlanMarkdown: path.join(coverageRoot, 'coverage_3585_next_unlock_plan.md'),
  unlockPlanJson: path.join(coverageRoot, 'coverage_3585_next_unlock_plan.json'),
  repoSummaryMarkdown: path.join(repoRoot, 'docs/boundary/legal-vocabulary-3585-coverage-summary.md'),
  repoSummaryJson: path.join(repoRoot, 'docs/boundary/legal-vocabulary-3585-coverage-summary.json'),
});

const ocrBlockedSources = Object.freeze([
  'bouvier_1839_vol_1',
  'bouvier_1839_vol_2',
  'burrill_1860',
  'ballentine_1916',
]);

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

function exactTermKey(value) {
  return String(value ?? '').toLowerCase().trim();
}

function buildCountMap(records, getTerm, getReferences) {
  const countByTerm = new Map();

  records.forEach((record) => {
    const normalized = normalizeForComparison(getTerm(record));
    const current = countByTerm.get(normalized) ?? 0;
    countByTerm.set(normalized, current + getReferences(record).length);
  });

  return countByTerm;
}

function buildComparatorCountMap(filePath) {
  return buildCountMap(
    readNdjson(filePath).filter((record) => record.matchStatus === 'exact_normalized_match'),
    (record) => record.normalizedBoundaryTerm ?? record.boundaryTerm,
    () => [true],
  );
}

function buildDuplicateNotes() {
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

function buildQueueMaps() {
  const ranked = readJson(inputPaths.queueV2Ranked);
  const skippedOrBlocked = readJson(inputPaths.queueV2SkippedOrBlocked);
  const byExactTerm = new Map();
  const byNormalizedTerm = new Map();

  [...ranked, ...skippedOrBlocked].forEach((record) => {
    byExactTerm.set(exactTermKey(record.term), record);
    byNormalizedTerm.set(normalizeForComparison(record.normalizedTerm ?? record.term), record);
  });

  return { byExactTerm, byNormalizedTerm };
}

function buildPendingMaps() {
  const pendingByTerm = new Map();

  [
    ['batch_007', readJson(inputPaths.batch007Review)],
    ['batch_008', readJson(inputPaths.batch008Review)],
    ['batch_009', readJson(inputPaths.batch009Review)],
  ].forEach(([batchId, review]) => {
    review.decisions.forEach((decision) => {
      pendingByTerm.set(exactTermKey(decision.term), {
        batchId,
        reviewDecision: decision.reviewDecision,
        applyEligible: Boolean(decision.applyEligible),
      });
    });
  });

  return pendingByTerm;
}

function mapEligibilityToState(record) {
  if (!record) {
    return null;
  }

  if (record.eligibilityDecision === 'skip_no_black_primary') return 'blocked_no_black_primary';
  if (record.eligibilityDecision === 'skip_alias_surface') return 'blocked_alias_surface';
  if (record.eligibilityDecision === 'skip_duplicate_alias_group') return 'blocked_duplicate_alias_group';
  if (record.eligibilityDecision === 'skip_low_provenance_quality') return 'blocked_low_provenance_quality';
  if (record.eligibilityDecision === 'blocked_source_conflict') return 'blocked_source_conflict';
  if (record.historicalScopeRisk || record.jurisdictionScopeRisk || record.broadOrdinaryWordRisk) {
    return 'blocked_historical_scope_review';
  }

  return null;
}

function nextUnlockActionFor(state) {
  switch (state) {
    case 'source_backed_meaning_live':
    case 'packet_backed_concept_meaning':
      return 'none_live';
    case 'pending_draft':
    case 'pending_review':
      return 'review_pending_batch';
    case 'blocked_alias_surface':
    case 'blocked_duplicate_alias_group':
      return 'create_alias_policy';
    case 'blocked_no_black_primary':
    case 'blocked_low_provenance_quality':
      return 'repair_black_extraction';
    case 'blocked_ocr_source_needed':
      return 'run_bouvier_ocr';
    case 'blocked_source_conflict':
      return 'source_conflict_review';
    case 'blocked_historical_scope_review':
      return 'historical_scope_review';
    default:
      return 'leave_unadmitted_until_source_exists';
  }
}

function priorityFor(state, record) {
  if (state === 'pending_draft' || state === 'pending_review') return 'high';
  if (state === 'blocked_historical_scope_review' || state === 'blocked_source_conflict') return 'medium';
  if (state === 'blocked_alias_surface' || state === 'blocked_duplicate_alias_group') {
    return record.blackReferenceCount > 0 ? 'medium' : 'blocked';
  }
  if (state === 'blocked_no_black_primary' || state === 'blocked_low_provenance_quality') return 'blocked';
  if (state === 'source_backed_meaning_live' || state === 'packet_backed_concept_meaning') return 'low';
  return 'blocked';
}

function blockerReasonFor(state, queueRecord, duplicateGroupNote) {
  if (state === 'source_backed_meaning_live') return null;
  if (state === 'packet_backed_concept_meaning') return 'Boundary meaning exists, but no source-backed lexicon provenance record exists.';
  if (state === 'pending_draft') return 'Approved wording preview exists but writeback has not been applied.';
  if (state === 'pending_review') return 'Batch review or wording resolution is still pending.';
  if (state === 'blocked_alias_surface') return 'Alias or underscore surface requires explicit alias policy before admission.';
  if (state === 'blocked_duplicate_alias_group') return duplicateGroupNote ?? 'Duplicate alias group requires explicit alias policy before admission.';
  if (state === 'blocked_no_black_primary') return 'No exact Black primary provenance is currently available.';
  if (state === 'blocked_low_provenance_quality') return 'Only low-confidence source provenance is currently available.';
  if (state === 'blocked_source_conflict') return queueRecord?.blockedReason ?? 'Source conflict requires review.';
  if (state === 'blocked_historical_scope_review') return 'Historical, jurisdiction-specific, or broad ordinary-word scope requires review.';
  if (state === 'blocked_ocr_source_needed') return 'Potential support requires OCR-blocked source repair before use.';
  return 'No current safe source-backed path exists.';
}

function countBy(records, key) {
  return records.reduce((counts, record) => {
    const value = record[key];
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function buildLedger() {
  const boundaryResponse = buildVocabularyBoundaryResponse();
  const meaningSources = readJson(inputPaths.meaningSources);
  const sourceBackedTerms = new Set(Object.keys(meaningSources.terms ?? {}).map(exactTermKey));
  const matchedRegistryTerms = readJson(inputPaths.matchedRegistryTerms);
  const blackCounts = buildCountMap(
    matchedRegistryTerms,
    (record) => record.normalizedTerm ?? record.term,
    (record) => record.references ?? [],
  );
  const andersonCounts = buildComparatorCountMap(inputPaths.andersonAlignment);
  const osbornCounts = buildComparatorCountMap(inputPaths.osbornAlignment);
  const whartonCounts = buildComparatorCountMap(inputPaths.whartonAlignment);
  const stroudCounts = buildComparatorCountMap(inputPaths.stroudAlignment);
  const duplicateNotes = buildDuplicateNotes();
  const queueMaps = buildQueueMaps();
  const pendingMaps = buildPendingMaps();

  return boundaryResponse.entries.map((entry) => {
    const normalizedTerm = normalizeForComparison(entry.term);
    const exactKey = exactTermKey(entry.term);
    const queueRecord = queueMaps.byExactTerm.get(exactKey) ?? queueMaps.byNormalizedTerm.get(normalizedTerm) ?? null;
    const pending = pendingMaps.get(exactKey) ?? null;
    const hasSourceBackedMeaning = sourceBackedTerms.has(exactTermKey(entry.term));
    const hasBoundaryMeaningInLaw = Boolean(entry.meaningInLaw);
    const isPacketBackedConcept = hasBoundaryMeaningInLaw && !hasSourceBackedMeaning;
    const duplicateGroupNote = duplicateNotes.get(normalizedTerm) ?? queueRecord?.duplicateGroupNote ?? null;
    const blackReferenceCount = blackCounts.get(normalizedTerm) ?? queueRecord?.blackReferenceCount ?? 0;
    const recordCounts = {
      blackReferenceCount,
      andersonExactReferenceCount: andersonCounts.get(normalizedTerm) ?? queueRecord?.andersonExactReferenceCount ?? 0,
      osbornExactReferenceCount: osbornCounts.get(normalizedTerm) ?? queueRecord?.osbornExactReferenceCount ?? 0,
      whartonV3ExactReferenceCount: whartonCounts.get(normalizedTerm) ?? queueRecord?.whartonV3ExactReferenceCount ?? 0,
      stroudV3ExactReferenceCount: stroudCounts.get(normalizedTerm) ?? queueRecord?.stroudV3ExactReferenceCount ?? 0,
    };

    let currentCoverageState = 'unresolved_needs_source_repair';
    if (hasSourceBackedMeaning) {
      currentCoverageState = 'source_backed_meaning_live';
    } else if (isPacketBackedConcept) {
      currentCoverageState = 'packet_backed_concept_meaning';
    } else if (pending?.applyEligible) {
      currentCoverageState = 'pending_draft';
    } else if (pending) {
      currentCoverageState = 'pending_review';
    } else if (entry.term.includes('_')) {
      currentCoverageState = 'blocked_alias_surface';
    } else if (duplicateGroupNote) {
      currentCoverageState = 'blocked_duplicate_alias_group';
    } else {
      currentCoverageState = mapEligibilityToState(queueRecord)
        ?? (blackReferenceCount === 0 ? 'blocked_no_black_primary' : 'unresolved_needs_source_repair');
    }

    const partialRecord = {
      ...recordCounts,
    };
    const nextUnlockAction = nextUnlockActionFor(currentCoverageState);

    return {
      term: entry.term,
      normalizedTerm,
      family: entry.familyLabel ?? entry.family,
      bucket: entry.classificationLabel ?? entry.classification,
      riskTier: entry.riskTier ?? queueRecord?.riskTier ?? 'medium_or_unclassified',
      currentCoverageState,
      hasSourceBackedMeaning,
      hasBoundaryMeaningInLaw,
      isPacketBackedConcept,
      isBatch007Pending: pending?.batchId === 'batch_007',
      isBatch008Pending: pending?.batchId === 'batch_008',
      isBatch009Pending: pending?.batchId === 'batch_009',
      ...recordCounts,
      isAliasSurface: entry.term.includes('_'),
      duplicateGroupNote,
      blockerReason: blockerReasonFor(currentCoverageState, queueRecord, duplicateGroupNote),
      nextUnlockAction,
      recommendedPriority: priorityFor(currentCoverageState, partialRecord),
    };
  });
}

function buildSummary(ledger) {
  const stateCounts = countBy(ledger, 'currentCoverageState');
  const actionCounts = countBy(ledger, 'nextUnlockAction');
  const pendingBatchTerms = ledger.filter((record) => (
    record.isBatch007Pending || record.isBatch008Pending || record.isBatch009Pending
  )).length;
  const sourceBackedMeaningsLive = stateCounts.source_backed_meaning_live ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    totalRegistryEntries: ledger.length,
    sourceBackedMeaningsLive,
    boundaryMeaningsLive: ledger.filter((record) => record.hasBoundaryMeaningInLaw).length,
    packetBackedConceptMeanings: stateCounts.packet_backed_concept_meaning ?? 0,
    pendingBatchTerms,
    noBlackPrimaryBlockers: stateCounts.blocked_no_black_primary ?? 0,
    aliasBlockers: stateCounts.blocked_alias_surface ?? 0,
    duplicateBlockers: stateCounts.blocked_duplicate_alias_group ?? 0,
    ocrSourceRepairBlockers: stateCounts.blocked_ocr_source_needed ?? 0,
    lowProvenanceBlockers: stateCounts.blocked_low_provenance_quality ?? 0,
    conflictBlockers: stateCounts.blocked_source_conflict ?? 0,
    historicalScopeBlockers: stateCounts.blocked_historical_scope_review ?? 0,
    fullyProcessedCount: ledger.length,
    unresolvedCount: stateCounts.unresolved_needs_source_repair ?? 0,
    remainingWithoutSourceBackedMeaning: ledger.length - sourceBackedMeaningsLive,
    stateCounts,
    nextUnlockActionCounts: actionCounts,
  };
}

function buildUnlockPlan(summary) {
  const aliasUnlock = (summary.aliasBlockers ?? 0) + (summary.duplicateBlockers ?? 0);
  const blackRepairUnlock = (summary.noBlackPrimaryBlockers ?? 0) + (summary.lowProvenanceBlockers ?? 0);
  const historicalUnlock = summary.historicalScopeBlockers ?? 0;
  const conflictUnlock = summary.conflictBlockers ?? 0;
  const pendingUnlock = summary.pendingBatchTerms;

  return {
    generatedAt: new Date().toISOString(),
    recommendation: 'coverage_ledger_complete_next_unlock_required',
    tracks: [
      {
        track: 'alias_policy',
        action: 'create_alias_policy',
        affectedCount: aliasUnlock,
        batch010CandidatePotential: aliasUnlock,
        notes: [
          'Handle underscore and duplicate surfaces separately.',
          'Do not automatically fan out aliases.',
          'Require explicit policy before any alias-surface admission.',
        ],
      },
      {
        track: 'ocr_source_repair',
        action: 'run_bouvier_ocr / run_burrill_ocr / run_ballentine_ocr',
        affectedCount: summary.ocrSourceRepairBlockers,
        batch010CandidatePotential: 0,
        notes: [
          'No term-level OCR-blocked matches are usable yet.',
          'Install/configure tesseract, poppler, pytesseract, and pdf2image before rerunning OCR lanes.',
          `OCR-blocked sources remain excluded: ${ocrBlockedSources.join(', ')}.`,
        ],
      },
      {
        track: 'black_extraction_repair',
        action: 'repair_black_extraction',
        affectedCount: blackRepairUnlock,
        batch010CandidatePotential: blackRepairUnlock,
        notes: [
          'Identify terms likely present in Black but missing from current alignment.',
          'Do not admit any term without exact Black primary provenance.',
        ],
      },
      {
        track: 'conflict_historical_review',
        action: 'source_conflict_review / historical_scope_review',
        affectedCount: historicalUnlock + conflictUnlock,
        batch010CandidatePotential: historicalUnlock + conflictUnlock,
        notes: [
          'Historical, jurisdiction-specific, field-specific, and source-conflict terms need human scope review.',
          'Narrow scope must remain explicit in any future wording.',
        ],
      },
      {
        track: 'future_batch_plan',
        action: 'review_pending_batch',
        affectedCount: pendingUnlock,
        batch010CandidatePotential: 0,
        notes: [
          'Resolve Batch 007/008/009 pending review before applying.',
          'Batch 010+ should start only after new safe candidates are unlocked.',
        ],
      },
    ],
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

function buildSummaryMarkdown(summary) {
  return [
    '# Legal Vocabulary 3,585 Coverage Summary',
    '',
    'This is coverage accounting only. No vocabulary meanings were written, no writeback was applied, no writeback preview was created, and no runtime ontology, concept packet, resolver, or alias behavior was changed.',
    '',
    '## Counts',
    '',
    markdownTable(
      ['Metric', 'Count'],
      [
        ['Total registry entries', summary.totalRegistryEntries],
        ['Source-backed meanings live', summary.sourceBackedMeaningsLive],
        ['Boundary meanings live', summary.boundaryMeaningsLive],
        ['Packet-backed concept meanings', summary.packetBackedConceptMeanings],
        ['Pending batch terms', summary.pendingBatchTerms],
        ['No-Black-primary blockers', summary.noBlackPrimaryBlockers],
        ['Alias blockers', summary.aliasBlockers],
        ['Duplicate blockers', summary.duplicateBlockers],
        ['OCR/source-repair blockers', summary.ocrSourceRepairBlockers],
        ['Low-provenance blockers', summary.lowProvenanceBlockers],
        ['Conflict blockers', summary.conflictBlockers],
        ['Historical-scope blockers', summary.historicalScopeBlockers],
        ['Fully processed disposition count', summary.fullyProcessedCount],
        ['Unresolved count', summary.unresolvedCount],
        ['Remaining without source-backed meaning', summary.remainingWithoutSourceBackedMeaning],
      ],
    ),
    '',
    '## Coverage States',
    '',
    markdownTable(
      ['State', 'Count'],
      Object.entries(summary.stateCounts).sort((left, right) => left[0].localeCompare(right[0])),
    ),
    '',
    '## Next Unlock Actions',
    '',
    markdownTable(
      ['Action', 'Count'],
      Object.entries(summary.nextUnlockActionCounts).sort((left, right) => left[0].localeCompare(right[0])),
    ),
    '',
  ].join('\n');
}

function buildUnlockPlanMarkdown(plan) {
  return [
    '# Legal Vocabulary 3,585 Next Unlock Plan',
    '',
    'The safe goal is complete disposition coverage: every vocabulary entry receives either a source-backed meaning or an explicit refusal/block reason. This plan does not claim all entries will receive meanings.',
    '',
    '## Tracks',
    '',
    markdownTable(
      ['Track', 'Action', 'Affected count', 'Batch 010+ candidate potential', 'Notes'],
      plan.tracks.map((track) => [
        track.track,
        track.action,
        track.affectedCount,
        track.batch010CandidatePotential,
        track.notes.join(' '),
      ]),
    ),
    '',
    '## OCR Source Repair',
    '',
    '- Bouvier, Burrill, and Ballentine remain blocked until OCR tooling/source segmentation is repaired.',
    '- Do not treat OCR-blocked sources as usable until exact-term OCR output exists and passes confidence checks.',
    '',
  ].join('\n');
}

function main() {
  const ledger = buildLedger();
  const summary = buildSummary(ledger);
  const blockedBreakdown = {
    generatedAt: summary.generatedAt,
    stateCounts: summary.stateCounts,
    nextUnlockActionCounts: summary.nextUnlockActionCounts,
    blockerSamples: Object.fromEntries(
      Object.keys(summary.stateCounts).map((state) => [
        state,
        ledger
          .filter((record) => record.currentCoverageState === state)
          .slice(0, 20)
          .map((record) => ({
            term: record.term,
            blockerReason: record.blockerReason,
            nextUnlockAction: record.nextUnlockAction,
          })),
      ]),
    ),
  };
  const unlockPlan = buildUnlockPlan(summary);
  const repoSummary = {
    ...summary,
    outputPaths,
    safety: {
      noVocabularyMeaningsWritten: true,
      noWritebackApplied: true,
      noWritebackPreviewCreated: true,
      noRuntimeOntologyChanges: true,
      noConceptPacketChanges: true,
      noResolverBehaviorChanges: true,
      noAliasesAdded: true,
      noFuzzyMatching: true,
      ocrBlockedSourcesNotUsedAsEvidence: true,
    },
  };

  writeJson(outputPaths.ledgerJson, ledger);
  writeText(outputPaths.ledgerNdjson, `${ledger.map((record) => JSON.stringify(record)).join('\n')}\n`);
  writeText(outputPaths.summaryMarkdown, buildSummaryMarkdown(summary));
  writeJson(outputPaths.blockedBreakdownJson, blockedBreakdown);
  writeText(outputPaths.unlockPlanMarkdown, buildUnlockPlanMarkdown(unlockPlan));
  writeJson(outputPaths.unlockPlanJson, unlockPlan);
  writeText(outputPaths.repoSummaryMarkdown, buildSummaryMarkdown(summary));
  writeJson(outputPaths.repoSummaryJson, repoSummary);

  console.log(JSON.stringify({
    totalRegistryEntries: summary.totalRegistryEntries,
    sourceBackedMeaningsLive: summary.sourceBackedMeaningsLive,
    boundaryMeaningsLive: summary.boundaryMeaningsLive,
    remainingWithoutSourceBackedMeaning: summary.remainingWithoutSourceBackedMeaning,
    stateCounts: summary.stateCounts,
    nextUnlockActionCounts: summary.nextUnlockActionCounts,
    outputPaths,
  }, null, 2));
}

main();
