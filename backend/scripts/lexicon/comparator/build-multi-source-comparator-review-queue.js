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
  andersonQualityReport: path.join(reportsRoot, 'anderson_1889_full_extraction_quality_report.json'),
  meaningCoverageAudit: path.join(repoRoot, 'docs/boundary/meaning-coverage-audit.json'),
  duplicateTermGroups: path.join(repoRoot, 'docs/boundary/duplicate-term-groups.json'),
});

const outputPaths = Object.freeze({
  queueJson: path.join(reportsRoot, 'multi_source_comparator_review_queue.json'),
  summaryMarkdown: path.join(reportsRoot, 'multi_source_comparator_review_summary.md'),
});

const BATCH_IDS = Object.freeze(['001', '002', '003']);

const REVISION_CANDIDATE_OVERRIDES = Object.freeze({
  amnesty: 'Anderson adds common-law caution: it says the term has no technical common-law meaning and equates it with oblivion.',
  appurtenance: 'Anderson frames the term as a right connected with use or enjoyment of a principal thing, narrower than generic attachment wording.',
  cohabitation: 'Anderson treats cohabitation as evidence supporting a presumption of marriage, not merely living together.',
  heir: 'Anderson gives a common-law inheritance scope tied to the person on whom the estate is cast at death.',
  marriage: 'Anderson offers a consent and contract-based treatment that may improve the historically gendered Black-only support.',
  occupancy: 'Anderson gives possession or actual-control support, which may correct the narrower ownerless-property acquisition wording.',
  premium: 'Anderson gives a broader reward, recompense, or sum-paid sense than the insurance-focused Black draft.',
  royalty: 'Anderson exposes both royal-prerogative and mine/patent/book-payment senses, so the current payment wording should be reviewed for scope.',
  security: 'Anderson emphasizes instrument, surety, and evidences-of-indebtedness senses, suggesting review of the broad protection wording.',
  ward: 'Anderson separates guard/watch senses from guardianship/minor status, so the authored meaning should keep the guardianship scope explicit.',
});

const REOPEN_OVERRIDES = Object.freeze({
  authentication: 'Anderson directly defines authentication as official legal attestation.',
  bequest: 'Anderson directly defines bequest as a gift of personalty by will, including the clause or thing given.',
  burden: 'Anderson directly defines burden as charge, obligation, duty, or disadvantage.',
  employment: 'Anderson directly defines employment as occupation, business position, or service.',
  intervention: 'Anderson supplies the procedural suit sense that was missing from the Black-only support.',
  pardon: 'Anderson includes a direct pardon definition as forgiveness, release, remission, and an act of grace.',
  surplusage: 'Anderson adds an overplus, residue, balance-over sense in addition to pleading surplusage.',
});

const STILL_UNSAFE_OVERRIDES = Object.freeze({
  usufruct: 'Anderson only points to related entries and still does not supply direct definition text for usufruct itself.',
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

function readNdjson(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function normalizeForComparison(value) {
  return value
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

function scoreAndersonSupport(alignment) {
  if (!['high', 'medium'].includes(alignment.parseConfidence)) {
    return 0;
  }

  const snippet = alignment.supportingSnippet.toLowerCase().replace(/\s+/g, ' ');
  const headword = alignment.headword.toLowerCase().replace(/\s+/g, ' ');
  let score = 1;

  if (snippet.includes(`${headword}.`) || snippet.includes(`${headword}.^`)) {
    score += 3;
  }

  [
    ' means ',
    ' is ',
    ' are ',
    ' one who ',
    ' he who ',
    ' a right ',
    ' the act ',
    ' the right ',
    ' a person ',
    ' contract',
    ' consent',
    ' forgiveness',
    ' gift ',
    ' possession',
    ' permission',
    ' privilege',
    ' advantage',
    ' obligation',
    ' duty',
    ' property',
    ' estate',
    ' instrument',
    ' written',
    ' official',
    ' legal',
    ' balance',
    ' residue',
    ' sum ',
  ].forEach((marker) => {
    if (snippet.includes(marker)) {
      score += 1;
    }
  });

  if (/^see\s+/i.test(snippet.replace(new RegExp(`^${headword}\\.?\\s*`, 'i'), '').trim())) {
    score -= 3;
  }

  if (alignment.lineNumber <= 3 && !snippet.includes(`${headword}.`)) {
    score -= 2;
  }

  return score;
}

function selectUsableAndersonSupport(records, normalizedTerm) {
  const minimumScore = REVISION_CANDIDATE_OVERRIDES[normalizedTerm] ? 1 : 3;
  return records
    .map((record) => ({ ...record, supportScore: scoreAndersonSupport(record) }))
    .filter((record) => record.supportScore >= minimumScore)
    .sort((left, right) => (
      right.supportScore - left.supportScore
      || left.page - right.page
      || left.lineNumber - right.lineNumber
    ));
}

function loadRegistryEntriesByTerm() {
  const response = buildVocabularyBoundaryResponse();
  return new Map(response.entries.map((entry) => [entry.term, entry]));
}

function loadAliasNotesByTerm() {
  const duplicateGroups = readJson(inputPaths.duplicateTermGroups);
  const notes = new Map();

  duplicateGroups.likelyAliasGroups.forEach((group) => {
    const terms = group.terms.map((entry) => entry.term).sort((left, right) => left.localeCompare(right));
    group.terms.forEach((entry) => {
      notes.set(
        entry.term,
        `Likely alias group "${group.canonicalKey}" with ${terms.length} terms: ${terms.join(', ')}. Exact-row support only; do not fan out automatically.`,
      );
    });
  });

  return notes;
}

function compactBlackReferences(sourceReferences = []) {
  return sourceReferences.slice(0, 5).map((reference) => ({
    sourceId: reference.sourceId,
    sourceTitle: reference.sourceTitle,
    year: reference.year,
    volume: reference.volume,
    sourceFile: reference.sourceFile,
    page: reference.page,
    lineNumber: reference.lineNumber,
    headword: reference.headword,
    parseConfidence: reference.parseConfidence,
    contextPreview: compactText(reference.contextPreview, 220),
  }));
}

function compactAndersonReferences(records) {
  return records.slice(0, 5).map((record) => ({
    sourceId: record.sourceId,
    sourceTitle: record.sourceTitle,
    year: record.year,
    volume: record.volume,
    sourceFile: record.sourceFile,
    page: record.page,
    lineNumber: record.lineNumber,
    headword: record.headword,
    parseConfidence: record.parseConfidence,
    sourceQualityTier: record.sourceQualityTier,
    extractionMode: record.extractionMode,
    referenceRole: 'comparator_support',
    supportScore: record.supportScore,
    supportingSnippet: compactText(record.supportingSnippet, 300),
  }));
}

function addTermRecord(recordsByTerm, record) {
  const existing = recordsByTerm.get(record.term) ?? {
    term: record.term,
    normalizedTerm: record.normalizedTerm ?? normalizeForComparison(record.term),
    family: record.family,
    bucket: record.bucket,
    riskTier: record.riskTier,
    draftRecord: null,
    reviewRecords: [],
    skippedRecords: [],
    reviewStatuses: new Set(),
    batches: new Set(),
  };

  if (record.kind === 'draft') {
    existing.draftRecord = record.payload;
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
  existing.batches.add(record.batchId);
  recordsByTerm.set(record.term, existing);
}

function loadBatchTermRecords() {
  const recordsByTerm = new Map();

  BATCH_IDS.forEach((batchId) => {
    const draftPath = path.join(draftRoot, `batch_${batchId}_${batchId === '001' ? 'first' : batchId === '002' ? 'second' : 'third'}_50_drafts.json`);
    if (fs.existsSync(draftPath)) {
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
    }

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
  }));
}

function buildBlackSupportSummary(termRecord) {
  const review = termRecord.reviewRecords[0] ?? null;
  const draft = termRecord.draftRecord;
  const skipped = termRecord.skippedRecords[0] ?? null;
  const parts = [];

  if (draft?.shortSupportNote) {
    parts.push(draft.shortSupportNote);
  }
  if (review?.reviewReason) {
    parts.push(`Review: ${review.reviewReason}`);
  }
  if (skipped?.draftReason) {
    parts.push(`Skipped: ${skipped.draftReason}`);
  }
  if (review?.sourceReferenceCount) {
    parts.push(`Black reference count: ${review.sourceReferenceCount}.`);
  } else if (draft?.sourceReferences?.length) {
    parts.push(`Black reference count: ${draft.sourceReferences.length}.`);
  }

  return parts.length > 0 ? parts.join(' ') : null;
}

function buildAndersonSupportSummary(term, supportRecords) {
  if (supportRecords.length === 0) {
    return 'No usable exact-row Anderson support was found for this term.';
  }

  const best = supportRecords[0];
  return `Anderson exact-row support for ${term}: page ${best.page}, line ${best.lineNumber}, headword "${best.headword}" (${best.parseConfidence} confidence). ${compactText(best.supportingSnippet, 260)}`;
}

function currentStatusFor(termRecord, currentMeaning) {
  const statuses = new Set(termRecord.reviewStatuses);
  if (statuses.has('approved') || statuses.has('revised')) {
    return currentMeaning ? 'authored_applied' : 'approved_or_revised_without_current_meaning';
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

  return 'draft_only';
}

function buildQueueRecord({
  termRecord,
  registryEntry,
  queueBucket,
  suggestedAction,
  reason,
  supportRecords,
  aliasNotesByTerm,
}) {
  const draft = termRecord.draftRecord;
  const review = termRecord.reviewRecords[0] ?? null;
  const blackReferences = compactBlackReferences(draft?.sourceReferences ?? []);
  const andersonReferences = compactAndersonReferences(supportRecords);
  const currentMeaning = registryEntry?.meaningInLaw ?? null;

  return {
    queueBucket,
    term: termRecord.term,
    normalizedTerm: termRecord.normalizedTerm,
    currentStatus: currentStatusFor(termRecord, currentMeaning),
    batches: termRecord.batches,
    reviewStatuses: termRecord.reviewStatuses,
    currentMeaning,
    blackSupportSummary: buildBlackSupportSummary(termRecord),
    andersonSupportSummary: buildAndersonSupportSummary(termRecord.term, supportRecords),
    suggestedAction,
    reason,
    sourceProvenancePointers: {
      black: blackReferences,
      anderson: andersonReferences,
    },
    family: termRecord.family ?? registryEntry?.family ?? null,
    bucket: termRecord.bucket ?? registryEntry?.classification ?? null,
    riskTier: termRecord.riskTier ?? null,
    reviewDecision: review?.reviewDecision ?? null,
    reviewConfidence: review?.confidence ?? null,
    historicallyNarrow: review?.historicallyNarrow ?? false,
    aliasCaution: aliasNotesByTerm.get(termRecord.term) ?? null,
    boundaryDisciplineNote: 'Review/intelligence output only; not authoring, not writeback, not runtime ontology admission.',
  };
}

function bucketTermRecord(termRecord, registryEntriesByTerm, andersonRecordsByTerm, aliasNotesByTerm) {
  const registryEntry = registryEntriesByTerm.get(termRecord.term) ?? null;
  const normalized = normalizeForComparison(termRecord.term);
  const supportRecords = selectUsableAndersonSupport(
    andersonRecordsByTerm.get(termRecord.term) ?? [],
    normalized,
  );
  const statuses = new Set(termRecord.reviewStatuses);
  const isAuthored = statuses.has('approved') || statuses.has('revised');
  const isSkippedOrRejected = statuses.has('skipped') || statuses.has('rejected');

  if (isSkippedOrRejected) {
    if (REOPEN_OVERRIDES[normalized] && supportRecords.length > 0) {
      return buildQueueRecord({
        termRecord,
        registryEntry,
        queueBucket: 'reopened_from_skip_or_reject',
        suggestedAction: 'reopen',
        reason: REOPEN_OVERRIDES[normalized],
        supportRecords,
        aliasNotesByTerm,
      });
    }

    return buildQueueRecord({
      termRecord,
      registryEntry,
      queueBucket: 'still_not_safe',
      suggestedAction: 'still_skip',
      reason: STILL_UNSAFE_OVERRIDES[normalized]
        ?? (supportRecords.length > 0
          ? 'Anderson has an exact-row hit, but this pass did not classify it as enough corrective support for safe authoring.'
          : 'No usable exact-row Anderson support was found; keep the previous skip/reject decision.'),
      supportRecords,
      aliasNotesByTerm,
    });
  }

  if (isAuthored && supportRecords.length > 0) {
    if (REVISION_CANDIDATE_OVERRIDES[normalized]) {
      return buildQueueRecord({
        termRecord,
        registryEntry,
        queueBucket: 'candidate_revision_of_authored_meaning',
        suggestedAction: 'revise',
        reason: REVISION_CANDIDATE_OVERRIDES[normalized],
        supportRecords,
        aliasNotesByTerm,
      });
    }

    return buildQueueRecord({
      termRecord,
      registryEntry,
      queueBucket: 'second_source_confirmation',
      suggestedAction: 'keep',
      reason: 'Anderson provides usable exact-row comparator support and does not clearly require changing the authored Black-based meaning.',
      supportRecords,
      aliasNotesByTerm,
    });
  }

  return null;
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function buildSummaryMarkdown(report) {
  const bucketRows = Object.entries(report.counts.byQueueBucket).map(([bucket, count]) => [bucket, count]);
  const reopenedRows = report.buckets.reopened_from_skip_or_reject.map((record) => [
    record.term,
    record.suggestedAction,
    record.andersonSupportSummary,
  ]);
  const revisionRows = report.buckets.candidate_revision_of_authored_meaning.map((record) => [
    record.term,
    record.suggestedAction,
    record.reason,
  ]);
  const unsafeRows = report.buckets.still_not_safe.map((record) => [
    record.term,
    record.currentStatus,
    record.reason,
  ]);

  return [
    '# Multi-Source Comparator Review Queue',
    '',
    'Status: REVIEW_ONLY_NOT_APPLIED. This report uses Black batch artifacts plus Anderson exact-row alignments as comparator intelligence only. No meanings were authored, no live vocabulary dataset was modified, no runtime ontology or concept packets were changed, and no alias fan-out was performed.',
    '',
    '## Inputs',
    '',
    `- Anderson alignment: ${report.inputFiles.andersonAlignment}`,
    `- Anderson quality report: ${report.inputFiles.andersonQualityReport}`,
    `- Meaning coverage audit: ${report.inputFiles.meaningCoverageAudit}`,
    `- Duplicate term groups: ${report.inputFiles.duplicateTermGroups}`,
    '',
    '## Counts',
    '',
    `- Total queued terms: ${report.counts.totalQueuedTerms}`,
    `- Reopened from skip/reject: ${report.counts.byQueueBucket.reopened_from_skip_or_reject}`,
    `- Candidate revisions of authored meanings: ${report.counts.byQueueBucket.candidate_revision_of_authored_meaning}`,
    `- Second-source confirmations: ${report.counts.byQueueBucket.second_source_confirmation}`,
    `- Still not safe: ${report.counts.byQueueBucket.still_not_safe}`,
    `- Alias-caution rows: ${report.counts.aliasCautionRows}`,
    '',
    '## Bucket Counts',
    '',
    markdownTable(['Bucket', 'Count'], bucketRows),
    '',
    '## Reopened From Skip Or Reject',
    '',
    reopenedRows.length > 0
      ? markdownTable(['Term', 'Action', 'Anderson support'], reopenedRows)
      : 'No terms were reopened.',
    '',
    '## Candidate Revisions',
    '',
    revisionRows.length > 0
      ? markdownTable(['Term', 'Action', 'Reason'], revisionRows)
      : 'No authored terms were marked as revision candidates.',
    '',
    '## Still Not Safe',
    '',
    unsafeRows.length > 0
      ? markdownTable(['Term', 'Current status', 'Reason'], unsafeRows)
      : 'No terms remain unsafe in this review queue.',
    '',
    '## Recommendation',
    '',
    '- Batch 004 can proceed after this comparator queue is reviewed, but the reopened skip/reject terms should be handled as a small separate comparator review before any live writeback.',
    '- Keep Anderson as comparator support only until specific terms are explicitly approved for meaning authoring or revision.',
    '- Preserve exact source/page provenance and keep alias rows explicit-only.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Review multi_source_comparator_review_queue.json. Decide approve_reopen, approve_revision_review, confirm_keep, or still_skip for each queued term; do not author meanings, do not modify the live vocabulary dataset, and do not modify runtime ontology or concept packets.',
    '',
  ].join('\n');
}

function main() {
  const andersonQualityReport = readJson(inputPaths.andersonQualityReport);
  const meaningCoverageAudit = readJson(inputPaths.meaningCoverageAudit);
  const registryEntriesByTerm = loadRegistryEntriesByTerm();
  const aliasNotesByTerm = loadAliasNotesByTerm();
  const termRecords = loadBatchTermRecords();
  const andersonRecordsByTerm = new Map();

  readNdjson(inputPaths.andersonAlignment).forEach((record) => {
    if (!andersonRecordsByTerm.has(record.boundaryTerm)) {
      andersonRecordsByTerm.set(record.boundaryTerm, []);
    }
    andersonRecordsByTerm.get(record.boundaryTerm).push(record);
  });

  const buckets = {
    reopened_from_skip_or_reject: [],
    candidate_revision_of_authored_meaning: [],
    second_source_confirmation: [],
    still_not_safe: [],
  };

  termRecords
    .map((termRecord) => bucketTermRecord(
      termRecord,
      registryEntriesByTerm,
      andersonRecordsByTerm,
      aliasNotesByTerm,
    ))
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
    ...buckets.reopened_from_skip_or_reject,
    ...buckets.candidate_revision_of_authored_meaning,
    ...buckets.second_source_confirmation,
    ...buckets.still_not_safe,
  ];
  const byQueueBucket = Object.fromEntries(
    Object.entries(buckets).map(([bucket, records]) => [bucket, records.length]),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    status: 'REVIEW_ONLY_NOT_APPLIED',
    scope: 'Black plus Anderson comparator review queue only',
    boundaryDiscipline: {
      meaningAuthoringPerformed: false,
      liveVocabularyDatasetChanged: false,
      runtimeOntologyChanged: false,
      conceptPacketsChanged: false,
      existingMeaningTextChanged: false,
      aliasFanOutPerformed: false,
    },
    andersonExtractionAssessment: andersonQualityReport.fullExtractionAssessment,
    meaningCoverageAuditCounts: {
      authoredMeaningCount: meaningCoverageAudit.counts.authoredMeaningCount,
      missingMeaningCount: meaningCoverageAudit.counts.missingMeaningCount,
      totalRecognizedLegalVocabularyTerms: meaningCoverageAudit.counts.totalRecognizedLegalVocabularyTerms,
    },
    counts: {
      totalQueuedTerms: queue.length,
      byQueueBucket,
      aliasCautionRows: queue.filter((record) => record.aliasCaution).length,
      termsWithAndersonProvenance: queue.filter((record) => record.sourceProvenancePointers.anderson.length > 0).length,
    },
    inputFiles: Object.fromEntries(
      Object.entries(inputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
    outputFiles: Object.fromEntries(
      Object.entries(outputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
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
