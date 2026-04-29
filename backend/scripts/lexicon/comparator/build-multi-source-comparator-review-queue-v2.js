'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  buildVocabularyBoundaryResponse,
} = require('../../../src/modules/legal-vocabulary/vocabulary-boundary');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const lexiconRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons');
const draftRoot = path.join(lexiconRoot, 'draft_meanings');
const multiSourceRoot = path.join(lexiconRoot, 'multi_source');
const reportsRoot = path.join(multiSourceRoot, 'reports');

const inputPaths = Object.freeze({
  andersonAlignment: path.join(multiSourceRoot, 'alignment/anderson_1889.boundary_alignment.ndjson'),
  osbornAlignment: path.join(multiSourceRoot, 'alignment/osborn_1927.boundary_alignment.ndjson'),
  andersonQualityReport: path.join(reportsRoot, 'anderson_1889_full_extraction_quality_report.json'),
  osbornQualityReport: path.join(reportsRoot, 'osborn_1927_full_extraction_quality_report.json'),
  meaningCoverageAudit: path.join(repoRoot, 'docs/boundary/meaning-coverage-audit.json'),
  duplicateTermGroups: path.join(repoRoot, 'docs/boundary/duplicate-term-groups.json'),
  meaningSources: path.join(
    repoRoot,
    'backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json',
  ),
});

const outputPaths = Object.freeze({
  queueJson: path.join(reportsRoot, 'multi_source_comparator_review_queue_v2.json'),
  summaryMarkdown: path.join(reportsRoot, 'multi_source_comparator_review_summary_v2.md'),
});

const SOURCE_LABELS = Object.freeze({
  anderson: 'Anderson',
  osborn: 'Osborn',
});

const OSBORN_NARROWING_OR_CORRECTION_NOTES = Object.freeze({
  bequest: 'Osborn gives direct will/personal-property support and should be compared against reopened bequest wording.',
  condonation: 'Osborn frames condonation as forgiveness of a conjugal offense with knowledge, keeping the matrimonial scope narrow.',
  conversion: 'Osborn supplies property/conversion context useful for wrong-sense control.',
  debenture: 'Osborn supplies company-security context where Anderson did not provide direct support.',
  dereliction: 'Osborn provides direct historical/legal context for dereliction that may recover a skipped term.',
  employment: 'Osborn adds employment-in-contract context useful for reopened support review.',
  pardon: 'Osborn supplies direct pardon support for the reopened criminal/public order term.',
  probation: 'Osborn gives probation-of-offenders context, narrower than a generic supervision sense.',
  representation: 'Osborn distinguishes representation as condition/warranty contract context, directly relevant to a skipped narrow term.',
  surplusage: 'Osborn supports the non-vitiating-writing maxim, narrowing the term away from generic excess.',
  ward: 'Osborn provides ward/ship context that should be compared against the authored guardianship wording.',
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

function readJsonIfExists(filePath, fallback) {
  return fs.existsSync(filePath) ? readJson(filePath) : fallback;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readNdjson(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim())
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

function compactText(value, maxLength = 360) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trim()}...`;
}

function countWords(value) {
  const matches = String(value ?? '').match(/[A-Za-z][A-Za-z'-]*/g);
  return matches ? matches.length : 0;
}

function containsDefinitionMarker(snippet) {
  const lower = snippet.toLowerCase().replace(/\s+/g, ' ');
  return [
    ' means ',
    ' mean ',
    ' is ',
    ' are ',
    ' consists ',
    ' includes ',
    ' denotes ',
    ' defined ',
    ' a person ',
    ' a right ',
    ' a duty ',
    ' a gift ',
    ' a contract ',
    ' the act ',
    ' the right ',
    ' the person ',
    ' property ',
    ' estate ',
    ' court ',
    ' action ',
    ' offence ',
    ' offense ',
    ' statute ',
    ' instrument ',
  ].some((marker) => lower.includes(marker));
}

function isNoisySnippet(record) {
  const snippet = String(record.supportingSnippet ?? '');
  const compact = snippet.replace(/\s+/g, ' ').trim();
  const headword = normalizeForComparison(record.headword);
  if (record.parseConfidence === 'low') {
    return true;
  }
  if (countWords(compact) < 8) {
    return true;
  }
  if (/^\(?\s*\d+\s*\)?$/.test(compact)) {
    return true;
  }
  if (record.lineNumber <= 3 && /^[A-Z]{2,4}(?:\s+[A-Z]{2,4}){0,3}\b/.test(compact) && !compact.toLowerCase().includes(`${headword}.`)) {
    return true;
  }
  if (/\bL\.D\.\s*\d+\b/.test(compact)) {
    return true;
  }
  return false;
}

function scoreSupport(record, sourceLane) {
  let score = 0;
  const snippet = String(record.supportingSnippet ?? '');
  const lower = snippet.toLowerCase().replace(/\s+/g, ' ');
  const headword = normalizeForComparison(record.headword);

  if (record.parseConfidence === 'high') {
    score += 3;
  } else if (record.parseConfidence === 'medium') {
    score += 2;
  }

  if (record.matchStatus === 'exact_normalized_match') {
    score += 3;
  } else if (record.matchStatus === 'target_prefix_headword_match') {
    score += 2;
  } else if (record.matchStatus === 'alias_assisted_match') {
    score -= 3;
  }

  if (lower.includes(`${headword}.`) || lower.startsWith(`${headword} `)) {
    score += 2;
  }
  if (containsDefinitionMarker(snippet)) {
    score += 2;
  }
  if (/^see\s+/i.test(lower.replace(new RegExp(`^${headword}\\.?\\s*`, 'i'), '').trim())) {
    score -= 4;
  }
  if (isNoisySnippet(record)) {
    score -= sourceLane === 'osborn' ? 2 : 1;
  }

  return score;
}

function selectUsableSupport(records, sourceLane) {
  return records
    .filter((record) => record.matchStatus !== 'alias_assisted_match')
    .map((record) => ({
      ...record,
      sourceLane,
      supportScore: scoreSupport(record, sourceLane),
      noisySnippet: sourceLane === 'osborn' ? isNoisySnippet(record) : false,
    }))
    .filter((record) => record.supportScore >= 4)
    .sort((left, right) => (
      right.supportScore - left.supportScore
      || left.page - right.page
      || left.lineNumber - right.lineNumber
    ));
}

function compactComparatorReferences(records) {
  return records.slice(0, 6).map((record) => ({
    sourceId: record.sourceId,
    sourceTitle: record.sourceTitle,
    year: record.year,
    volume: record.volume,
    sourceFile: record.sourceFile,
    page: record.page,
    lineNumber: record.lineNumber,
    headword: record.headword,
    normalizedHeadword: record.normalizedHeadword,
    matchStatus: record.matchStatus,
    parseConfidence: record.parseConfidence,
    sourceQualityTier: record.sourceQualityTier,
    extractionMode: record.extractionMode,
    referenceRole: 'comparator_support',
    supportScore: record.supportScore,
    noisySnippet: record.noisySnippet,
    supportingSnippet: compactText(record.supportingSnippet, 320),
  }));
}

function compactBlackReferences(record) {
  const pointers = record.provenancePointers?.black
    ?? record.sourceProvenancePointers?.black
    ?? record.sourceReferences
    ?? [];

  return pointers.slice(0, 6).map((reference) => ({
    sourceId: reference.sourceId,
    sourceTitle: reference.sourceTitle,
    year: reference.year,
    volume: reference.volume,
    sourceFile: reference.sourceFile,
    page: reference.page,
    lineNumber: reference.lineNumber,
    headword: reference.headword,
    parseConfidence: reference.parseConfidence,
    contextPreview: compactText(reference.contextPreview ?? reference.supportingSnippet ?? reference.supportNote, 240),
  }));
}

function loadRegistryEntriesByTerm() {
  const response = buildVocabularyBoundaryResponse();
  return new Map(response.entries.map((entry) => [entry.term, entry]));
}

function loadAliasNotesByTerm() {
  const duplicateGroups = readJsonIfExists(inputPaths.duplicateTermGroups, { likelyAliasGroups: [] });
  const notes = new Map();

  duplicateGroups.likelyAliasGroups.forEach((group) => {
    const terms = group.terms.map((entry) => entry.term).sort((left, right) => left.localeCompare(right));
    group.terms.forEach((entry) => {
      notes.set(
        entry.term,
        `Likely alias group "${group.canonicalKey}" with ${terms.length} terms: ${terms.join(', ')}. Exact-row support only; no alias fan-out.`,
      );
    });
  });

  return notes;
}

function findDraftPaths() {
  if (!fs.existsSync(draftRoot)) {
    return [];
  }

  return fs.readdirSync(draftRoot)
    .filter((fileName) => /^batch_\d{3}_.+_drafts\.json$/.test(fileName))
    .map((fileName) => path.join(draftRoot, fileName))
    .sort();
}

function addTermRecord(recordsByTerm, record) {
  const normalized = record.normalizedTerm ?? normalizeForComparison(record.term);
  const existing = recordsByTerm.get(normalized) ?? {
    term: record.term,
    normalizedTerm: normalized,
    family: record.family,
    bucket: record.bucket,
    riskTier: record.riskTier,
    draftRecords: [],
    reviewRecords: [],
    skippedRecords: [],
    reviewStatuses: new Set(),
    batches: new Set(),
    historicallyNarrow: false,
    confidenceFlags: new Set(),
  };

  if (record.kind === 'draft') {
    existing.draftRecords.push(record.payload);
  } else if (record.kind === 'skipped') {
    existing.skippedRecords.push(record.payload);
    existing.reviewStatuses.add('skipped');
  } else {
    existing.reviewRecords.push(record.payload);
    existing.reviewStatuses.add(record.reviewStatus);
  }

  if (!existing.family && record.family) {
    existing.family = record.family;
  }
  if (!existing.bucket && record.bucket) {
    existing.bucket = record.bucket;
  }
  if (!existing.riskTier && record.riskTier) {
    existing.riskTier = record.riskTier;
  }
  if (record.payload?.historicallyNarrow === true || record.payload?.weakOrHistoricallyNarrow === true) {
    existing.historicallyNarrow = true;
  }
  if (record.payload?.confidence) {
    existing.confidenceFlags.add(record.payload.confidence);
  }
  existing.batches.add(record.batchId);
  recordsByTerm.set(normalized, existing);
}

function loadBatchTermRecords() {
  const recordsByTerm = new Map();

  findDraftPaths().forEach((draftPath) => {
    const batchId = /^batch_(\d{3})_/.exec(path.basename(draftPath))?.[1] ?? null;
    if (!batchId) {
      return;
    }

    readJson(draftPath).forEach((record) => {
      addTermRecord(recordsByTerm, {
        kind: 'draft',
        batchId,
        term: record.term,
        normalizedTerm: record.normalizedTerm,
        family: record.family,
        bucket: record.bucket,
        riskTier: record.riskTier,
        payload: record,
      });
    });

    [
      ['approved', 'approved'],
      ['revise', 'revised'],
      ['rejected', 'rejected'],
    ].forEach(([filePrefix, reviewStatus]) => {
      const filePath = path.join(draftRoot, `review/${filePrefix}_batch_${batchId}.json`);
      if (!fs.existsSync(filePath)) {
        return;
      }

      readJson(filePath).forEach((record) => {
        addTermRecord(recordsByTerm, {
          kind: 'review',
          batchId,
          reviewStatus,
          term: record.term,
          normalizedTerm: record.normalizedTerm ?? normalizeForComparison(record.term),
          family: record.family,
          bucket: record.bucket,
          riskTier: record.riskTier,
          payload: record,
        });
      });
    });

    const skippedPath = path.join(draftRoot, `reports/batch_${batchId}_skipped.json`);
    if (fs.existsSync(skippedPath)) {
      readJson(skippedPath).forEach((record) => {
        addTermRecord(recordsByTerm, {
          kind: 'skipped',
          batchId,
          term: record.term,
          normalizedTerm: record.normalizedTerm ?? normalizeForComparison(record.term),
          family: record.family,
          bucket: record.bucket,
          riskTier: record.riskTier,
          payload: record,
        });
      });
    }
  });

  return [...recordsByTerm.values()].map((record) => ({
    ...record,
    reviewStatuses: [...record.reviewStatuses].sort(),
    batches: [...record.batches].sort(),
    confidenceFlags: [...record.confidenceFlags].sort(),
  }));
}

function groupAlignmentByTerm(filePath, sourceLane) {
  const grouped = new Map();
  readNdjson(filePath).forEach((record) => {
    const normalized = normalizeForComparison(record.boundaryTerm);
    if (!grouped.has(normalized)) {
      grouped.set(normalized, []);
    }
    grouped.get(normalized).push({
      ...record,
      sourceLane,
    });
  });
  return grouped;
}

function mergeCurrentMeaningRecords(termRecords, registryEntriesByTerm) {
  const byNormalized = new Map(termRecords.map((record) => [record.normalizedTerm, record]));

  registryEntriesByTerm.forEach((entry) => {
    if (!entry.meaningInLaw || entry.sourceStatus !== 'registry_only') {
      return;
    }
    const normalized = normalizeForComparison(entry.term);
    if (!byNormalized.has(normalized)) {
      byNormalized.set(normalized, {
        term: entry.term,
        normalizedTerm: normalized,
        family: entry.family,
        bucket: entry.classification,
        riskTier: null,
        draftRecords: [],
        reviewRecords: [],
        skippedRecords: [],
        reviewStatuses: ['authored_existing'],
        batches: [],
        historicallyNarrow: false,
        confidenceFlags: [],
      });
    }
  });

  return [...byNormalized.values()];
}

function buildBlackSupportSummary(termRecord) {
  const latestDraft = [...termRecord.draftRecords].at(-1) ?? null;
  const latestReview = [...termRecord.reviewRecords].at(-1) ?? null;
  const latestSkipped = [...termRecord.skippedRecords].at(-1) ?? null;
  const parts = [];

  if (latestDraft?.shortSupportNote) {
    parts.push(latestDraft.shortSupportNote);
  }
  if (latestReview?.reviewReason) {
    parts.push(`Review: ${latestReview.reviewReason}`);
  }
  if (latestSkipped?.draftReason) {
    parts.push(`Skipped: ${latestSkipped.draftReason}`);
  }
  if (latestReview?.sourceReferenceCount) {
    parts.push(`Black reference count: ${latestReview.sourceReferenceCount}.`);
  } else if (latestDraft?.sourceReferences?.length) {
    parts.push(`Black reference count: ${latestDraft.sourceReferences.length}.`);
  }

  return parts.length > 0 ? parts.join(' ') : null;
}

function buildSupportSummary(term, sourceLane, supportRecords) {
  const label = SOURCE_LABELS[sourceLane];
  if (supportRecords.length === 0) {
    return `No usable exact-term ${label} support was found for this term.`;
  }

  const best = supportRecords[0];
  return `${label} exact-term support for ${term}: page ${best.page}, line ${best.lineNumber}, headword "${best.headword}" (${best.parseConfidence} confidence, ${best.matchStatus}). ${compactText(best.supportingSnippet, 260)}`;
}

function sourceSupportBasis(andersonRecords, osbornRecords) {
  if (andersonRecords.length > 0 && osbornRecords.length > 0) {
    return 'black_plus_anderson_plus_osborn';
  }
  if (andersonRecords.length > 0) {
    return 'black_plus_anderson';
  }
  if (osbornRecords.length > 0) {
    return 'black_plus_osborn';
  }
  return 'black_only_existing';
}

function lexicalOverlap(left, right) {
  const leftWords = new Set(String(left ?? '').toLowerCase().match(/[a-z]{4,}/g) ?? []);
  const rightWords = new Set(String(right ?? '').toLowerCase().match(/[a-z]{4,}/g) ?? []);
  if (leftWords.size === 0 || rightWords.size === 0) {
    return 0;
  }
  const shared = [...leftWords].filter((word) => rightWords.has(word)).length;
  return shared / Math.min(leftWords.size, rightWords.size);
}

function buildOsbornComparisonFlags(termRecord, andersonRecords, osbornRecords) {
  const flags = [];
  const normalized = termRecord.normalizedTerm;

  if (osbornRecords.length === 0) {
    return flags;
  }
  if (andersonRecords.length === 0) {
    flags.push('osborn_adds_support_not_found_in_anderson_alignment');
  }
  if (OSBORN_NARROWING_OR_CORRECTION_NOTES[normalized]) {
    flags.push('osborn_may_narrow_or_correct_anderson_or_black_scope');
  }
  if (andersonRecords.length > 0) {
    const overlap = lexicalOverlap(andersonRecords[0].supportingSnippet, osbornRecords[0].supportingSnippet);
    if (overlap > 0 && overlap < 0.18) {
      flags.push('anderson_osborn_scope_differs_review_required');
    }
  }
  if (osbornRecords.some((record) => record.matchStatus === 'target_prefix_headword_match')) {
    flags.push('osborn_prefix_headword_match_requires_exact-scope_review');
  }

  return [...new Set(flags)].sort();
}

function currentStatusFor(termRecord, currentMeaning) {
  const statuses = new Set(termRecord.reviewStatuses);
  if (currentMeaning) {
    return statuses.has('rejected') || statuses.has('skipped')
      ? 'authored_but_previously_skipped_or_rejected'
      : 'authored_applied';
  }
  if (statuses.has('rejected') && statuses.has('skipped')) {
    return 'rejected_and_skipped';
  }
  if (statuses.has('rejected')) {
    return 'rejected';
  }
  if (statuses.has('skipped')) {
    return 'skipped';
  }
  return statuses.size > 0 ? [...statuses].join('_') : 'unreviewed';
}

function buildQueueRecord({
  termRecord,
  registryEntry,
  queueBucket,
  suggestedAction,
  reason,
  andersonRecords,
  osbornRecords,
  aliasNotesByTerm,
}) {
  const latestDraft = [...termRecord.draftRecords].at(-1) ?? {};
  const latestReview = [...termRecord.reviewRecords].at(-1) ?? {};
  const currentMeaning = registryEntry?.meaningInLaw ?? null;
  const osbornNoisy = osbornRecords.filter((record) => record.noisySnippet);
  const comparisonFlags = buildOsbornComparisonFlags(termRecord, andersonRecords, osbornRecords);

  return {
    queueBucket,
    term: termRecord.term,
    normalizedTerm: termRecord.normalizedTerm,
    currentStatus: currentStatusFor(termRecord, currentMeaning),
    batches: termRecord.batches,
    reviewStatuses: termRecord.reviewStatuses,
    currentMeaning,
    sourceSupportBasis: sourceSupportBasis(andersonRecords, osbornRecords),
    blackSupportSummary: buildBlackSupportSummary(termRecord),
    andersonSupportSummary: buildSupportSummary(termRecord.term, 'anderson', andersonRecords),
    osbornSupportSummary: buildSupportSummary(termRecord.term, 'osborn', osbornRecords),
    suggestedAction,
    reason,
    osbornComparisonFlags: comparisonFlags,
    osbornContradictsOrNarrowsAnderson: comparisonFlags.some((flag) => (
      flag.includes('narrow')
      || flag.includes('scope_differs')
      || flag.includes('correct')
    )),
    osbornNoisySnippetCount: osbornNoisy.length,
    osbornNoisySnippets: compactComparatorReferences(osbornNoisy),
    sourceProvenancePointers: {
      black: compactBlackReferences(latestReview.term ? latestReview : latestDraft),
      anderson: compactComparatorReferences(andersonRecords),
      osborn: compactComparatorReferences(osbornRecords),
    },
    family: termRecord.family ?? registryEntry?.family ?? null,
    bucket: termRecord.bucket ?? registryEntry?.classification ?? null,
    riskTier: termRecord.riskTier ?? null,
    reviewDecision: latestReview.reviewDecision ?? null,
    reviewConfidence: latestReview.confidence ?? null,
    historicallyNarrow: termRecord.historicallyNarrow,
    confidenceFlags: termRecord.confidenceFlags,
    aliasCaution: aliasNotesByTerm.get(termRecord.term) ?? null,
    boundaryDisciplineNote: 'Review/intelligence output only; no meaning authored, no writeback, no runtime ontology admission, no alias fan-out.',
  };
}

function classifyTerm(termRecord, registryEntry, andersonRecords, osbornRecords, aliasNotesByTerm) {
  const currentMeaning = registryEntry?.meaningInLaw ?? null;
  const statuses = new Set(termRecord.reviewStatuses);
  const isSkippedOrRejected = statuses.has('skipped') || statuses.has('rejected');
  const supportCount = andersonRecords.length + osbornRecords.length;

  if (isSkippedOrRejected && !currentMeaning) {
    if (supportCount > 0 && osbornRecords.every((record) => !record.noisySnippet)) {
      return buildQueueRecord({
        termRecord,
        registryEntry,
        queueBucket: 'reopen_from_skip_or_reject',
        suggestedAction: 'reopen',
        reason: osbornRecords.length > 0
          ? 'Osborn and/or Anderson now provide usable exact-term comparator support for a previously skipped or rejected term.'
          : 'Anderson provides usable exact-term comparator support for a previously skipped or rejected term.',
        andersonRecords,
        osbornRecords,
        aliasNotesByTerm,
      });
    }

    return buildQueueRecord({
      termRecord,
      registryEntry,
      queueBucket: 'still_not_safe',
      suggestedAction: 'still_skip',
      reason: supportCount > 0
        ? 'Comparator hits exist, but the usable support is noisy, indirect, or not enough for safe reopen in this pass.'
        : 'No usable exact-term Anderson or Osborn support was found; keep the previous skip/reject decision.',
      andersonRecords,
      osbornRecords,
      aliasNotesByTerm,
    });
  }

  if (currentMeaning && supportCount > 0) {
    const comparisonFlags = buildOsbornComparisonFlags(termRecord, andersonRecords, osbornRecords);
    const shouldReviewRevision = (
      termRecord.historicallyNarrow
      || statuses.has('revised')
      || termRecord.confidenceFlags.includes('low')
      || comparisonFlags.some((flag) => flag.includes('narrow') || flag.includes('scope_differs') || flag.includes('correct'))
    );

    if (shouldReviewRevision) {
      return buildQueueRecord({
        termRecord,
        registryEntry,
        queueBucket: 'candidate_revision_of_authored_meaning',
        suggestedAction: 'revise',
        reason: OSBORN_NARROWING_OR_CORRECTION_NOTES[termRecord.normalizedTerm]
          ?? 'Osborn and/or Anderson provide exact-term comparator support for an authored term with revision, historical-narrowness, low-confidence, or source-scope review signals.',
        andersonRecords,
        osbornRecords,
        aliasNotesByTerm,
      });
    }

    return buildQueueRecord({
      termRecord,
      registryEntry,
      queueBucket: 'second_source_confirmation',
      suggestedAction: 'keep',
      reason: 'Anderson and/or Osborn provide usable exact-term comparator support and do not clearly require changing the authored meaning.',
      andersonRecords,
      osbornRecords,
      aliasNotesByTerm,
    });
  }

  if (isSkippedOrRejected) {
    return buildQueueRecord({
      termRecord,
      registryEntry,
      queueBucket: 'still_not_safe',
      suggestedAction: 'still_skip',
      reason: 'The term remains skipped or rejected without a current authored meaning and without enough comparator support for reopen.',
      andersonRecords,
      osbornRecords,
      aliasNotesByTerm,
    });
  }

  return null;
}

function markdownCell(value) {
  return String(value ?? '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.map(markdownCell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
}

function buildSummaryMarkdown(report) {
  const bucketRows = Object.entries(report.counts.byQueueBucket).map(([bucket, count]) => [bucket, count]);
  const sourceBasisRows = Object.entries(report.counts.bySourceSupportBasis).map(([basis, count]) => [basis, count]);
  const reopenedRows = report.buckets.reopen_from_skip_or_reject.map((record) => [
    record.term,
    record.sourceSupportBasis,
    record.suggestedAction,
    record.osbornSupportSummary,
  ]);
  const revisionRows = report.buckets.candidate_revision_of_authored_meaning.map((record) => [
    record.term,
    record.sourceSupportBasis,
    record.suggestedAction,
    record.reason,
  ]);
  const unsafeRows = report.buckets.still_not_safe.map((record) => [
    record.term,
    record.currentStatus,
    record.reason,
  ]);
  const osbornFlagsRows = report.queue
    .filter((record) => record.osbornComparisonFlags.length > 0)
    .slice(0, 40)
    .map((record) => [record.term, record.osbornComparisonFlags.join(', ')]);

  return [
    '# Multi-Source Comparator Review Queue V2',
    '',
    'Status: REVIEW_ONLY_NOT_APPLIED. This report uses Black batch artifacts plus Anderson and Osborn exact-term alignments as comparator intelligence only. No meanings were authored, no live vocabulary dataset was modified, no vocabulary boundary source was modified, no runtime ontology or concept packets were changed, no writeback was applied, and no alias fan-out was performed.',
    '',
    '## Inputs',
    '',
    `- Anderson alignment: ${report.inputFiles.andersonAlignment}`,
    `- Osborn alignment: ${report.inputFiles.osbornAlignment}`,
    `- Anderson quality report: ${report.inputFiles.andersonQualityReport}`,
    `- Osborn quality report: ${report.inputFiles.osbornQualityReport}`,
    `- Meaning coverage audit: ${report.inputFiles.meaningCoverageAudit}`,
    `- Meaning sources: ${report.inputFiles.meaningSources}`,
    '',
    '## Counts',
    '',
    `- Total queued terms: ${report.counts.totalQueuedTerms}`,
    `- Reopen from skip/reject: ${report.counts.byQueueBucket.reopen_from_skip_or_reject}`,
    `- Candidate revisions of authored meanings: ${report.counts.byQueueBucket.candidate_revision_of_authored_meaning}`,
    `- Second-source confirmations: ${report.counts.byQueueBucket.second_source_confirmation}`,
    `- Still not safe: ${report.counts.byQueueBucket.still_not_safe}`,
    `- Terms with Osborn support: ${report.counts.termsWithOsbornSupport}`,
    `- Osborn noisy snippet rows: ${report.counts.osbornNoisySnippetRows}`,
    `- Osborn contradiction/narrowing flags: ${report.counts.osbornContradictionOrNarrowingRows}`,
    '',
    '## Bucket Counts',
    '',
    markdownTable(['Bucket', 'Count'], bucketRows),
    '',
    '## Source Basis Counts',
    '',
    markdownTable(['Source basis', 'Count'], sourceBasisRows),
    '',
    '## Reopen From Skip Or Reject',
    '',
    reopenedRows.length > 0
      ? markdownTable(['Term', 'Source basis', 'Action', 'Osborn support'], reopenedRows)
      : 'No terms were reopened.',
    '',
    '## Candidate Revisions',
    '',
    revisionRows.length > 0
      ? markdownTable(['Term', 'Source basis', 'Action', 'Reason'], revisionRows)
      : 'No authored terms were marked as revision candidates.',
    '',
    '## Osborn Scope Flags',
    '',
    osbornFlagsRows.length > 0
      ? markdownTable(['Term', 'Flags'], osbornFlagsRows)
      : 'No Osborn scope flags were raised.',
    '',
    '## Still Not Safe',
    '',
    unsafeRows.length > 0
      ? markdownTable(['Term', 'Current status', 'Reason'], unsafeRows)
      : 'No terms remain unsafe in this review queue.',
    '',
    '## Recommendation',
    '',
    '- Osborn should become an active comparator lane for exact-term review intelligence after this queue is reviewed.',
    '- Batch 006 should not wait for this queue; keep it draft-only in parallel.',
    '- Do not create draft meanings from this queue until the queue decisions are reviewed.',
    '- Preserve exact source/page provenance and keep alias rows explicit-only.',
    '',
    '## Exact Next Prompt',
    '',
    report.exactNextPrompt,
    '',
  ].join('\n');
}

function countBy(records, key) {
  return records.reduce((counts, record) => {
    const value = record[key] ?? 'unknown';
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function main() {
  const andersonQualityReport = readJson(inputPaths.andersonQualityReport);
  const osbornQualityReport = readJson(inputPaths.osbornQualityReport);
  const meaningCoverageAudit = readJson(inputPaths.meaningCoverageAudit);
  const meaningSources = readJsonIfExists(inputPaths.meaningSources, { terms: {} });
  const registryEntriesByTerm = loadRegistryEntriesByTerm();
  const aliasNotesByTerm = loadAliasNotesByTerm();
  const termRecords = mergeCurrentMeaningRecords(loadBatchTermRecords(), registryEntriesByTerm);
  const andersonRecordsByTerm = groupAlignmentByTerm(inputPaths.andersonAlignment, 'anderson');
  const osbornRecordsByTerm = groupAlignmentByTerm(inputPaths.osbornAlignment, 'osborn');

  const buckets = {
    reopen_from_skip_or_reject: [],
    candidate_revision_of_authored_meaning: [],
    second_source_confirmation: [],
    still_not_safe: [],
  };

  termRecords
    .map((termRecord) => {
      const registryEntry = registryEntriesByTerm.get(termRecord.term) ?? null;
      const andersonRecords = selectUsableSupport(
        andersonRecordsByTerm.get(termRecord.normalizedTerm) ?? [],
        'anderson',
      );
      const osbornRecords = selectUsableSupport(
        osbornRecordsByTerm.get(termRecord.normalizedTerm) ?? [],
        'osborn',
      );

      return classifyTerm(termRecord, registryEntry, andersonRecords, osbornRecords, aliasNotesByTerm);
    })
    .filter(Boolean)
    .sort((left, right) => (
      left.queueBucket.localeCompare(right.queueBucket)
      || left.term.localeCompare(right.term)
    ))
    .forEach((record) => {
      buckets[record.queueBucket].push(record);
    });

  Object.values(buckets).forEach((records) => {
    records.sort((left, right) => left.term.localeCompare(right.term));
  });

  const queue = [
    ...buckets.reopen_from_skip_or_reject,
    ...buckets.candidate_revision_of_authored_meaning,
    ...buckets.second_source_confirmation,
    ...buckets.still_not_safe,
  ];
  const byQueueBucket = Object.fromEntries(
    Object.entries(buckets).map(([bucket, records]) => [bucket, records.length]),
  );
  const bySourceSupportBasis = countBy(queue, 'sourceSupportBasis');
  const exactNextPrompt = 'Task: Review multi_source_comparator_review_queue_v2.json. Decide approve_reopen, approve_revision_review, confirm_keep, or still_skip for each queued term using Black plus Anderson plus Osborn support; do not author meanings, do not modify the live vocabulary dataset, do not modify vocabulary-boundary.js, and do not modify runtime ontology or concept packets.';

  const report = {
    generatedAt: new Date().toISOString(),
    status: 'REVIEW_ONLY_NOT_APPLIED',
    scope: 'Black plus Anderson plus Osborn comparator review queue update only',
    boundaryDiscipline: {
      meaningAuthoringPerformed: false,
      liveVocabularyDatasetChanged: false,
      vocabularyBoundarySourceChanged: false,
      vocabularyMeaningSourcesChanged: false,
      runtimeOntologyChanged: false,
      conceptPacketsChanged: false,
      existingMeaningTextChanged: false,
      writebackApplied: false,
      aliasFanOutPerformed: false,
      exactTermProvenanceOnly: true,
    },
    extractionAssessments: {
      anderson: andersonQualityReport.fullExtractionAssessment,
      osborn: osbornQualityReport.fullExtractionAssessment,
    },
    meaningCoverageAuditCounts: {
      authoredMeaningCount: meaningCoverageAudit.counts.authoredMeaningCount,
      missingMeaningCount: meaningCoverageAudit.counts.missingMeaningCount,
      totalRecognizedLegalVocabularyTerms: meaningCoverageAudit.counts.totalRecognizedLegalVocabularyTerms,
    },
    generatedMeaningSourceTerms: Object.keys(meaningSources.terms ?? {}).length,
    counts: {
      totalQueuedTerms: queue.length,
      byQueueBucket,
      bySourceSupportBasis,
      termsWithAndersonSupport: queue.filter((record) => record.sourceProvenancePointers.anderson.length > 0).length,
      termsWithOsbornSupport: queue.filter((record) => record.sourceProvenancePointers.osborn.length > 0).length,
      osbornReopenedSkippedOrRejectedTerms: buckets.reopen_from_skip_or_reject
        .filter((record) => record.sourceProvenancePointers.osborn.length > 0).length,
      osbornSuggestedAuthoredRevisions: buckets.candidate_revision_of_authored_meaning
        .filter((record) => record.sourceProvenancePointers.osborn.length > 0).length,
      osbornConfirmedAuthoredTerms: buckets.second_source_confirmation
        .filter((record) => record.sourceProvenancePointers.osborn.length > 0).length,
      osbornNoisySnippetRows: queue.filter((record) => record.osbornNoisySnippetCount > 0).length,
      osbornContradictionOrNarrowingRows: queue.filter((record) => record.osbornContradictsOrNarrowsAnderson).length,
      aliasCautionRows: queue.filter((record) => record.aliasCaution).length,
    },
    recommendations: {
      osbornShouldBecomeActiveComparatorLane: osbornQualityReport.fullExtractionAssessment === 'ready_for_comparator_alignment_use',
      batch006ShouldWaitForThis: false,
      doNotAuthorYet: true,
    },
    stillUnsafeTerms: buckets.still_not_safe.map((record) => record.term),
    inputFiles: Object.fromEntries(
      Object.entries(inputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
    outputFiles: Object.fromEntries(
      Object.entries(outputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
    exactNextPrompt,
    queue,
    buckets,
  };

  writeJson(outputPaths.queueJson, report);
  fs.writeFileSync(outputPaths.summaryMarkdown, buildSummaryMarkdown(report), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
