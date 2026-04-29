'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const draftRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/draft_meanings');
const resolvedRoot = path.join(draftRoot, 'resolved_review');
const previewRoot = path.join(draftRoot, 'writeback_preview');

const batchId = 'batch_007';
const expectedCandidateCount = 29;
const excludedTerms = Object.freeze(['inherent_power']);

const inputPaths = Object.freeze({
  resolvedDraftsPreWriteback: path.join(resolvedRoot, 'batch_007_resolved_drafts_PRE_WRITEBACK.json'),
  resolvedWordingReview: path.join(resolvedRoot, 'batch_007_resolved_wording_review.json'),
});

const currentSourceFilePath = path.join(
  repoRoot,
  'backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json',
);

const outputPaths = Object.freeze({
  previewJson: path.join(previewRoot, 'batch_007_resolved_writeback_preview_NOT_APPLIED.json'),
  diffMarkdown: path.join(previewRoot, 'batch_007_resolved_writeback_diff_preview.md'),
  validationReportJson: path.join(previewRoot, 'batch_007_resolved_writeback_validation_report.json'),
});

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

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function normalizeTerm(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[.,;:]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
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

function countProvenance(record, key) {
  const values = record.provenancePointers?.[key];
  return Array.isArray(values) ? values.length : 0;
}

function validationCheck(name, passed, details = null) {
  return { name, passed, details };
}

function buildProposedAddition(record, generatedSourceTerms) {
  const normalizedTerm = normalizeTerm(record.normalizedTerm ?? record.term);
  const finalProposedMeaningInLaw = record.finalProposedMeaningInLaw ?? record.draftMeaningInLaw ?? null;
  const termAlreadyExistsInGeneratedSource = generatedSourceTerms.has(record.term.toLowerCase().trim());
  const blackPrimaryProvenanceCount = countProvenance(record, 'black');
  const andersonComparatorProvenanceCount = countProvenance(record, 'anderson');
  const osbornComparatorProvenanceCount = countProvenance(record, 'osborn');
  const whartonV3ComparatorProvenanceCount = countProvenance(record, 'wharton_v3');
  const stroudV3ComparatorProvenanceCount = countProvenance(record, 'stroud_v3');

  let writebackAction = 'add';
  const safetyNotes = [
    'Preview only; no writeback was applied.',
    'Black remains primary; comparator sources remain context only.',
    'Registry-only meaning/reference layer; no runtime ontology admission.',
  ];

  if (termAlreadyExistsInGeneratedSource) {
    writebackAction = 'skip_existing';
    safetyNotes.push('Skipped because exact term already exists in generated source file.');
  }

  if (!finalProposedMeaningInLaw || blackPrimaryProvenanceCount < 1 || record.term.includes('_')) {
    writebackAction = 'skip_invalid';
    safetyNotes.push('Skipped because required final meaning, Black provenance, or alias-surface safety failed.');
  }

  return {
    term: record.term,
    normalizedTerm,
    resolvedDecision: record.resolvedDecision,
    finalProposedMeaningInLaw,
    sourceBasis: record.sourceBasis,
    blackPrimaryProvenanceCount,
    andersonComparatorProvenanceCount,
    osbornComparatorProvenanceCount,
    whartonV3ComparatorProvenanceCount,
    stroudV3ComparatorProvenanceCount,
    provenancePointers: record.provenancePointers,
    comparatorAvailability: record.comparatorAvailability,
    termAlreadyExistsInGeneratedSource,
    writebackAction,
    safetyNotes,
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

function buildMarkdown(preview) {
  return [
    '# Batch 007 Resolved Writeback Diff Preview',
    '',
    'This is a preview only. No writeback was applied.',
    '',
    '## Summary',
    '',
    markdownTable(
      ['Metric', 'Count'],
      [
        ['Candidate count', preview.candidateCount],
        ['Add count', preview.addCount],
        ['Skip count', preview.skipCount],
        ['Excluded terms', preview.excludedTerms.join(', ')],
      ],
    ),
    '',
    '## Proposed Additions',
    '',
    markdownTable(
      ['Term', 'Action', 'Source basis', 'Black refs', 'Final proposed meaningInLaw'],
      preview.proposedAdditions.map((candidate) => [
        candidate.term,
        candidate.writebackAction,
        candidate.sourceBasis,
        candidate.blackPrimaryProvenanceCount,
        candidate.finalProposedMeaningInLaw,
      ]),
    ),
    '',
    '## Validation Warnings',
    '',
    preview.validationSummary.validationChecks.some((check) => !check.passed)
      ? markdownTable(
        ['Check', 'Details'],
        preview.validationSummary.validationChecks
          .filter((check) => !check.passed)
          .map((check) => [check.name, JSON.stringify(check.details ?? {})]),
      )
      : 'No validation warnings.',
    '',
    '## Recommendation',
    '',
    preview.finalRecommendation,
    '',
  ].join('\n');
}

function main() {
  const sourceHashBefore = sha256File(currentSourceFilePath);
  const resolvedDrafts = readJson(inputPaths.resolvedDraftsPreWriteback);
  const resolvedReview = readJson(inputPaths.resolvedWordingReview);
  const currentSources = readJson(currentSourceFilePath);
  const generatedSourceTerms = new Set(Object.keys(currentSources.terms ?? {}).map((term) => term.toLowerCase().trim()));
  const excludedTermSet = new Set(excludedTerms.map((term) => term.toLowerCase()));
  const proposedAdditions = resolvedDrafts.map((record) => buildProposedAddition(record, generatedSourceTerms));
  const addCount = proposedAdditions.filter((candidate) => candidate.writebackAction === 'add').length;
  const skipCount = proposedAdditions.length - addCount;
  const sourceHashAfterBuild = sha256File(currentSourceFilePath);
  const sourceDiffStatus = gitDiffStatus([
    'backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json',
  ]);
  const dataConceptsDiffStatus = gitDiffStatus(['data/concepts']);
  const conceptModulesDiffStatus = gitDiffStatus(['backend/src/modules/concepts']);

  const validationChecks = [
    validationCheck('expected_candidate_count_29', proposedAdditions.length === expectedCandidateCount, {
      expected: expectedCandidateCount,
      actual: proposedAdditions.length,
    }),
    validationCheck('every_candidate_has_final_meaning', proposedAdditions.every((candidate) => (
      Boolean(candidate.finalProposedMeaningInLaw)
    )), {
      missing: proposedAdditions.filter((candidate) => !candidate.finalProposedMeaningInLaw).map((candidate) => candidate.term),
    }),
    validationCheck('every_candidate_has_black_primary_provenance', proposedAdditions.every((candidate) => (
      candidate.blackPrimaryProvenanceCount > 0
    )), {
      missing: proposedAdditions.filter((candidate) => candidate.blackPrimaryProvenanceCount < 1).map((candidate) => candidate.term),
    }),
    validationCheck('no_underscore_alias_surface', proposedAdditions.every((candidate) => (
      !candidate.term.includes('_')
    )), {
      aliasCandidates: proposedAdditions.filter((candidate) => candidate.term.includes('_')).map((candidate) => candidate.term),
    }),
    validationCheck('no_candidate_already_exists', proposedAdditions.every((candidate) => (
      !candidate.termAlreadyExistsInGeneratedSource
    )), {
      existing: proposedAdditions.filter((candidate) => candidate.termAlreadyExistsInGeneratedSource).map((candidate) => candidate.term),
    }),
    validationCheck('no_skipped_terms_included', proposedAdditions.every((candidate) => (
      !excludedTermSet.has(candidate.term.toLowerCase())
    )), {
      excludedTerms,
      included: proposedAdditions.filter((candidate) => excludedTermSet.has(candidate.term.toLowerCase())).map((candidate) => candidate.term),
    }),
    validationCheck('resolved_review_ready_for_preview', resolvedReview.finalRecommendation === 'ready_for_preview', {
      finalRecommendation: resolvedReview.finalRecommendation,
    }),
    validationCheck('source_file_hash_unchanged', sourceHashBefore === sourceHashAfterBuild, {
      sourceHashBefore,
      sourceHashAfter: sourceHashAfterBuild,
    }),
    validationCheck('generated_source_diff_empty', sourceDiffStatus.clean, sourceDiffStatus),
    validationCheck('data_concepts_diff_empty', dataConceptsDiffStatus.clean, dataConceptsDiffStatus),
    validationCheck('backend_concepts_diff_empty', conceptModulesDiffStatus.clean, conceptModulesDiffStatus),
  ];
  const validationPassed = validationChecks.every((check) => check.passed);
  const finalRecommendation = validationPassed && addCount === expectedCandidateCount
    ? 'ready_for_apply_prompt'
    : 'blocked_with_reasons';

  const preview = {
    status: 'NOT_APPLIED',
    batchId,
    mode: 'resolved_writeback_preview_only',
    writebackExecuted: false,
    generatedAt: new Date().toISOString(),
    inputArtifactPaths: inputPaths,
    currentSourceFilePath,
    candidateCount: proposedAdditions.length,
    addCount,
    skipCount,
    proposedAdditions,
    excludedTerms,
    validationSummary: {
      passed: validationPassed,
      validationChecks,
    },
    finalRecommendation,
  };

  const sourceHashAfter = sha256File(currentSourceFilePath);
  const validationReport = {
    status: validationPassed ? 'pass' : 'fail',
    batchId,
    mode: 'resolved_writeback_preview_validation',
    writebackExecuted: false,
    sourceFileHashBefore: sourceHashBefore,
    sourceFileHashAfter: sourceHashAfter,
    hashUnchanged: sourceHashBefore === sourceHashAfter,
    validationChecks,
    diffStatus: {
      generatedSource: sourceDiffStatus,
      dataConcepts: dataConceptsDiffStatus,
      backendConceptModules: conceptModulesDiffStatus,
    },
    finalRecommendation,
  };

  writeJson(outputPaths.previewJson, preview);
  writeText(outputPaths.diffMarkdown, buildMarkdown(preview));
  writeJson(outputPaths.validationReportJson, validationReport);

  console.log(JSON.stringify({
    candidateCount: preview.candidateCount,
    addCount: preview.addCount,
    skipCount: preview.skipCount,
    validationPassed,
    finalRecommendation,
    hashUnchanged: validationReport.hashUnchanged,
    outputPaths,
  }, null, 2));
}

main();
