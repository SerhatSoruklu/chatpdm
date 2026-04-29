'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  buildVocabularyBoundaryResponse,
} = require('../../../src/modules/legal-vocabulary/vocabulary-boundary');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const draftRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/draft_meanings');
const multiSourceReportsRoot = path.join(
  workspaceRoot,
  'vocabulary_reference_lexicons/multi_source/reports',
);
const generatedSourcesPath = path.join(
  repoRoot,
  'backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json',
);
const reportJsonPath = path.join(repoRoot, 'docs/boundary/meaning-source-provenance-report.json');
const reportMarkdownPath = path.join(repoRoot, 'docs/boundary/meaning-source-provenance-report.md');

const batches = Object.freeze([
  Object.freeze({
    id: 'batch_001',
    draftsPath: path.join(draftRoot, 'batch_001_first_50_drafts.json'),
    appliedDiffPath: path.join(draftRoot, 'writeback_applied/batch_001_applied_diff.json'),
  }),
  Object.freeze({
    id: 'batch_002',
    draftsPath: path.join(draftRoot, 'batch_002_second_50_drafts.json'),
    appliedDiffPath: path.join(draftRoot, 'writeback_applied/batch_002_applied_diff.json'),
  }),
  Object.freeze({
    id: 'batch_003',
    draftsPath: path.join(draftRoot, 'batch_003_third_50_drafts.json'),
    appliedDiffPath: path.join(draftRoot, 'writeback_applied/batch_003_applied_diff.json'),
  }),
]);
const comparatorAppliedDiffPath = path.join(
  multiSourceReportsRoot,
  'comparator_writeback_applied_diff.json',
);
const comparatorV2AppliedDiffPath = path.join(
  multiSourceReportsRoot,
  'comparator_v2_writeback_applied_diff.json',
);
const batch004AppliedDiffPath = path.join(
  draftRoot,
  'writeback_applied/batch_004_applied_diff.json',
);
const batch005AppliedDiffPath = path.join(
  draftRoot,
  'writeback_applied/batch_005_applied_diff.json',
);
const matchedRegistryTermsPath = path.join(
  workspaceRoot,
  'vocabulary_reference_lexicons/alignment/matched_registry_terms.json',
);

const legacyManualTerms = Object.freeze({
  'ab initio': 'Defines "ab initio" as from the beginning or from the first act.',
  abandonment: 'Defines "abandonment" as surrender, relinquishment, disclaimer, or cession of property or rights.',
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

function referenceKey(reference) {
  return [
    reference.sourceId,
    reference.sourceTitle,
    reference.year,
    reference.page,
  ].join('::');
}

function buildMeaningSource(reference, term, supportNote) {
  return {
    sourceId: reference.sourceId,
    sourceTitle: reference.sourceTitle,
    year: reference.year,
    page: reference.page,
    supportNote: normalizeGeneratedSupportNote(term, supportNote),
    referenceRole: 'supporting_lexicon_reference',
  };
}

function compactSupportNote(value) {
  const compacted = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  if (compacted.length <= 220) {
    return compacted;
  }

  return `${compacted.slice(0, 217).trim()}...`;
}

function normalizeGeneratedSupportNote(term, value) {
  const compacted = compactSupportNote(value);
  const patterns = [
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+define\s+(.+?)\s+(as|through|in|with|to)\s+(.+)$/i, 'Defines'],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+describe\s+(.+?)\s+(as|through|in|with|to)\s+(.+)$/i, 'Describes'],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+directly\s+support\s+(.+?)\s+(as|through|in|with|to)\s+(.+)$/i, 'Directly supports'],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+support\s+(.+?)\s+(as|through|in|with|to)\s+(.+)$/i, 'Supports'],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+connect\s+(.+?)\s+(to|with)\s+(.+)$/i, 'Connects'],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+identify\s+(.+?)\s+(as|through|in|with|to)\s+(.+)$/i, 'Identifies'],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+frame\s+(.+?)\s+(as|through|in|with|to)\s+(.+)$/i, 'Frames'],
    [/^(?:Black|Anderson|Osborn|Lexicon)\s+references?\s+provide\s+(.+)$/i, 'Provides'],
  ];

  for (const [pattern, verb] of patterns) {
    const match = pattern.exec(compacted);
    if (!match) {
      continue;
    }

    if (match.length >= 4) {
      return `${verb} "${term}" ${match[2]} ${match[3]}`;
    }

    return `${verb} "${term}" ${match[1]}`;
  }

  return compacted;
}

function buildComparatorMeaningSource(reference, term, sourceLane) {
  const supportText = sourceLane === 'black'
    ? (reference.contextPreview ?? reference.supportNote ?? reference.supportingSnippet)
    : (reference.supportingSnippet ?? reference.supportNote ?? reference.contextPreview);
  const fallback = `Comparator-reviewed source support for ${term}.`;
  const supportNote = supportText || fallback;

  return buildMeaningSource(reference, term, supportNote);
}

function collectAppliedProvenanceSources(filePath, sourceLabel, provenanceFieldName) {
  if (!fs.existsSync(filePath)) {
    return {
      rows: [],
      missingReferenceRows: [],
      nonAppliedRows: [],
    };
  }

  const appliedDiff = readJson(filePath);
  const rows = [];
  const missingReferenceRows = [];
  const nonAppliedRows = [];

  (appliedDiff.rows ?? []).forEach((row) => {
    if (row.status !== 'APPLIED') {
      nonAppliedRows.push({ source: sourceLabel, term: row.term, status: row.status });
      return;
    }

    const sourcePointers = row[provenanceFieldName] ?? {};
    const sourceRows = [];

    ['black', 'anderson', 'osborn'].forEach((sourceLane) => {
      (sourcePointers[sourceLane] ?? []).forEach((reference) => {
        sourceRows.push(buildComparatorMeaningSource(reference, row.term, sourceLane));
      });
    });

    if (sourceRows.length === 0) {
      missingReferenceRows.push({ source: sourceLabel, term: row.term });
      return;
    }

    rows.push({
      term: row.term,
      referenceCount: sourceRows.length,
      sources: sourceRows,
    });
  });

  return {
    rows,
    missingReferenceRows,
    nonAppliedRows,
  };
}

function buildDraftsByTerm(drafts) {
  const draftsByTerm = new Map();

  drafts.forEach((draft) => {
    draftsByTerm.set(draft.term, draft);
  });

  return draftsByTerm;
}

function setTermSources(terms, term, sources) {
  terms[term] = [...sources.values()].sort((left, right) => (
    left.sourceId.localeCompare(right.sourceId)
    || left.page - right.page
    || left.sourceTitle.localeCompare(right.sourceTitle)
  ));
}

function mergeTermSources(terms, term, sources) {
  const mergedSources = new Map();

  (terms[term] ?? []).forEach((source) => {
    mergedSources.set(referenceKey(source), source);
  });
  sources.forEach((source) => {
    if (!mergedSources.has(referenceKey(source))) {
      mergedSources.set(referenceKey(source), source);
    }
  });

  setTermSources(terms, term, mergedSources);
}

function collectComparatorAppliedSources() {
  return collectAppliedProvenanceSources(
    comparatorAppliedDiffPath,
    'comparator_writeback',
    'sourceProvenancePointers',
  );
}

function collectComparatorV2AppliedSources() {
  return collectAppliedProvenanceSources(
    comparatorV2AppliedDiffPath,
    'comparator_v2_writeback',
    'sourceProvenancePointers',
  );
}

function collectBatch004AppliedSources() {
  return collectAppliedProvenanceSources(
    batch004AppliedDiffPath,
    'batch_004_writeback',
    'provenancePointers',
  );
}

function collectBatch005AppliedSources() {
  return collectAppliedProvenanceSources(
    batch005AppliedDiffPath,
    'batch_005_writeback',
    'provenancePointers',
  );
}

function collectLegacyManualSources() {
  if (!fs.existsSync(matchedRegistryTermsPath)) {
    return {
      rows: [],
      missingReferenceRows: Object.keys(legacyManualTerms).map((term) => ({
        source: 'legacy_manual_seed',
        term,
      })),
    };
  }

  const matchedTerms = readJson(matchedRegistryTermsPath);
  const matchedByTerm = new Map(matchedTerms.map((record) => [record.term, record]));
  const rows = [];
  const missingReferenceRows = [];

  Object.entries(legacyManualTerms).forEach(([term, supportNote]) => {
    const matched = matchedByTerm.get(term);
    const references = Array.isArray(matched?.references) ? matched.references : [];

    if (references.length === 0) {
      missingReferenceRows.push({ source: 'legacy_manual_seed', term });
      return;
    }

    rows.push({
      term,
      referenceCount: references.length,
      sources: references.map((reference) => buildMeaningSource(reference, term, supportNote)),
    });
  });

  return {
    rows,
    missingReferenceRows,
  };
}

function buildTermSources() {
  const terms = {};
  const rows = [];
  const missingDraftRows = [];
  const missingReferenceRows = [];
  const nonAppliedRows = [];

  batches.forEach((batch) => {
    const draftsByTerm = buildDraftsByTerm(readJson(batch.draftsPath));
    const appliedRows = readJson(batch.appliedDiffPath).rows
      .filter((row) => row.status === 'APPLIED')
      .sort((left, right) => left.term.localeCompare(right.term));

    appliedRows.forEach((row) => {
      const draft = draftsByTerm.get(row.term);
      if (!draft) {
        missingDraftRows.push({ batchId: batch.id, term: row.term });
        return;
      }

      const references = Array.isArray(draft.sourceReferences) ? draft.sourceReferences : [];
      if (references.length === 0) {
        missingReferenceRows.push({ batchId: batch.id, term: row.term });
        return;
      }

      const dedupedSources = new Map();
      references.forEach((reference) => {
        const source = buildMeaningSource(reference, row.term, draft.shortSupportNote);
        dedupedSources.set(referenceKey(source), source);
      });

      setTermSources(terms, row.term, dedupedSources);

      rows.push({
        batchId: batch.id,
        term: row.term,
        referenceCount: terms[row.term].length,
      });
    });
  });

  const comparatorSources = collectComparatorAppliedSources();
  comparatorSources.rows.forEach((row) => {
    mergeTermSources(terms, row.term, row.sources);
    rows.push({
      batchId: 'comparator_writeback',
      term: row.term,
      referenceCount: terms[row.term].length,
    });
  });
  missingReferenceRows.push(...comparatorSources.missingReferenceRows);
  nonAppliedRows.push(...comparatorSources.nonAppliedRows);

  const comparatorV2Sources = collectComparatorV2AppliedSources();
  comparatorV2Sources.rows.forEach((row) => {
    mergeTermSources(terms, row.term, row.sources);
    rows.push({
      batchId: 'comparator_v2_writeback',
      term: row.term,
      referenceCount: terms[row.term].length,
    });
  });
  missingReferenceRows.push(...comparatorV2Sources.missingReferenceRows);
  nonAppliedRows.push(...comparatorV2Sources.nonAppliedRows);

  const batch004Sources = collectBatch004AppliedSources();
  batch004Sources.rows.forEach((row) => {
    mergeTermSources(terms, row.term, row.sources);
    rows.push({
      batchId: 'batch_004',
      term: row.term,
      referenceCount: terms[row.term].length,
    });
  });
  missingReferenceRows.push(...batch004Sources.missingReferenceRows);
  nonAppliedRows.push(...batch004Sources.nonAppliedRows);

  const batch005Sources = collectBatch005AppliedSources();
  batch005Sources.rows.forEach((row) => {
    mergeTermSources(terms, row.term, row.sources);
    rows.push({
      batchId: 'batch_005',
      term: row.term,
      referenceCount: terms[row.term].length,
    });
  });
  missingReferenceRows.push(...batch005Sources.missingReferenceRows);
  nonAppliedRows.push(...batch005Sources.nonAppliedRows);

  const legacyManualSources = collectLegacyManualSources();
  legacyManualSources.rows.forEach((row) => {
    mergeTermSources(terms, row.term, row.sources);
    rows.push({
      batchId: 'legacy_manual_seed',
      term: row.term,
      referenceCount: terms[row.term].length,
    });
  });
  missingReferenceRows.push(...legacyManualSources.missingReferenceRows);

  return {
    terms,
    rows,
    missingDraftRows,
    missingReferenceRows,
    nonAppliedRows,
    comparatorAppliedRows: comparatorSources.rows,
    comparatorV2AppliedRows: comparatorV2Sources.rows,
    batch004AppliedRows: batch004Sources.rows,
    batch005AppliedRows: batch005Sources.rows,
    legacyManualRows: legacyManualSources.rows,
  };
}

function buildValidationReport(termSourcePayload) {
  const response = buildVocabularyBoundaryResponse();
  const authoredEntries = response.entries.filter((entry) => (
    entry.meaningInLaw !== null
    && entry.meaningInLaw.trim() !== ''
  ));
  const registryAuthoredEntries = authoredEntries.filter((entry) => entry.sourceStatus === 'registry_only');
  const authoredTermsWithGeneratedProvenance = registryAuthoredEntries.filter((entry) => (
    Array.isArray(termSourcePayload.terms[entry.term])
    && termSourcePayload.terms[entry.term].length > 0
  ));
  const authoredTermsMissingGeneratedProvenance = registryAuthoredEntries
    .filter((entry) => !authoredTermsWithGeneratedProvenance.includes(entry))
    .map((entry) => entry.term)
    .sort((left, right) => left.localeCompare(right));

  return {
    generatedAt: new Date().toISOString(),
    scope: 'vocabulary-boundary meaning source provenance backfill',
    boundaryDiscipline: {
      liveVocabularyMeaningTextChanged: false,
      runtimeOntologyChanged: false,
      conceptPacketsChanged: false,
      aliasFanoutPerformed: false,
    },
    counts: {
      authoredMeaningCount: authoredEntries.length,
      registryAuthoredMeaningCount: registryAuthoredEntries.length,
      packetBackedAuthoredMeaningCount: authoredEntries.length - registryAuthoredEntries.length,
      appliedBatchRowsScanned: (
        termSourcePayload.rows.length
        - termSourcePayload.comparatorAppliedRows.length
        - termSourcePayload.comparatorV2AppliedRows.length
        - termSourcePayload.batch004AppliedRows.length
        - termSourcePayload.batch005AppliedRows.length
        - termSourcePayload.legacyManualRows.length
      ),
      comparatorAppliedRowsScanned: termSourcePayload.comparatorAppliedRows.length,
      comparatorV2AppliedRowsScanned: termSourcePayload.comparatorV2AppliedRows.length,
      batch004AppliedRowsScanned: termSourcePayload.batch004AppliedRows.length,
      batch005AppliedRowsScanned: termSourcePayload.batch005AppliedRows.length,
      legacyManualRowsScanned: termSourcePayload.legacyManualRows.length,
      totalAppliedSourceRowsScanned: termSourcePayload.rows.length,
      termsWithGeneratedProvenance: Object.keys(termSourcePayload.terms).length,
      registryAuthoredTermsWithGeneratedProvenance: authoredTermsWithGeneratedProvenance.length,
      registryAuthoredTermsMissingGeneratedProvenance: authoredTermsMissingGeneratedProvenance.length,
      missingDraftRows: termSourcePayload.missingDraftRows.length,
      missingReferenceRows: termSourcePayload.missingReferenceRows.length,
      nonAppliedComparatorRows: termSourcePayload.nonAppliedRows.length,
    },
    registryAuthoredTermsMissingGeneratedProvenance: authoredTermsMissingGeneratedProvenance,
    missingDraftRows: termSourcePayload.missingDraftRows,
    missingReferenceRows: termSourcePayload.missingReferenceRows,
    nonAppliedRows: termSourcePayload.nonAppliedRows,
    generatedSourcesPath: toWindowsPath(generatedSourcesPath),
    comparatorAppliedDiffPath: toWindowsPath(comparatorAppliedDiffPath),
    comparatorV2AppliedDiffPath: toWindowsPath(comparatorV2AppliedDiffPath),
    batch004AppliedDiffPath: toWindowsPath(batch004AppliedDiffPath),
    batch005AppliedDiffPath: toWindowsPath(batch005AppliedDiffPath),
    matchedRegistryTermsPath: toWindowsPath(matchedRegistryTermsPath),
  };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function buildMarkdownReport(validationReport, sourceRows) {
  const sampleRows = sourceRows
    .slice(0, 20)
    .map((row) => [row.batchId, row.term, row.referenceCount]);

  return [
    '# Vocabulary Meaning Source Provenance Backfill',
    '',
    'Scope: registry-only vocabulary-boundary meanings authored through batches 001-005, approved comparator writeback rows, approved comparator v2 writeback rows, and the two legacy manually seeded meanings. This generator adds supporting lexicon reference metadata only; it does not change meaning text, runtime ontology, concept packets, or live concept meanings.',
    '',
    '## Counts',
    '',
    `- Authored meaning count: ${validationReport.counts.authoredMeaningCount}`,
    `- Registry-authored meaning count: ${validationReport.counts.registryAuthoredMeaningCount}`,
    `- Terms with generated provenance: ${validationReport.counts.termsWithGeneratedProvenance}`,
    `- Registry-authored terms with generated provenance: ${validationReport.counts.registryAuthoredTermsWithGeneratedProvenance}`,
    `- Registry-authored terms missing generated provenance: ${validationReport.counts.registryAuthoredTermsMissingGeneratedProvenance}`,
    `- Applied batch rows scanned: ${validationReport.counts.appliedBatchRowsScanned}`,
    `- Comparator applied rows scanned: ${validationReport.counts.comparatorAppliedRowsScanned}`,
    `- Comparator v2 applied rows scanned: ${validationReport.counts.comparatorV2AppliedRowsScanned}`,
    `- Batch 004 applied rows scanned: ${validationReport.counts.batch004AppliedRowsScanned}`,
    `- Batch 005 applied rows scanned: ${validationReport.counts.batch005AppliedRowsScanned}`,
    `- Legacy manual rows scanned: ${validationReport.counts.legacyManualRowsScanned}`,
    `- Total applied source rows scanned: ${validationReport.counts.totalAppliedSourceRowsScanned}`,
    `- Non-applied comparator rows ignored: ${validationReport.counts.nonAppliedComparatorRows}`,
    '',
    '## Missing Provenance',
    '',
    validationReport.registryAuthoredTermsMissingGeneratedProvenance.length > 0
      ? validationReport.registryAuthoredTermsMissingGeneratedProvenance.map((term) => `- ${term}`).join('\n')
      : 'No registry-authored terms are missing generated provenance.',
    '',
    '## Sample Generated Rows',
    '',
    markdownTable(['Batch', 'Term', 'Reference count'], sampleRows),
    '',
    '## Discipline',
    '',
    '- Meaning text changed: false',
    '- Runtime ontology changed: false',
    '- Concept packets changed: false',
    '- Alias fan-out performed: false',
    '- Comparator provenance exact-term only: true',
    '- Legacy manual provenance exact-term only: true',
    '',
  ].join('\n');
}

function main() {
  const termSourcePayload = buildTermSources();
  const generatedPayload = {
    generatedAt: new Date().toISOString(),
    source: 'batch_001_to_batch_005_black_reference_artifacts_plus_comparator_writeback_plus_comparator_v2_writeback_plus_legacy_manual_seed',
    referenceRole: 'supporting_lexicon_reference',
    terms: termSourcePayload.terms,
  };

  writeJson(generatedSourcesPath, generatedPayload);

  const validationReport = buildValidationReport(termSourcePayload);
  writeJson(reportJsonPath, validationReport);
  fs.writeFileSync(
    reportMarkdownPath,
    buildMarkdownReport(validationReport, termSourcePayload.rows),
    'utf8',
  );

  [generatedSourcesPath, reportJsonPath, reportMarkdownPath].forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
