'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const draftRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/draft_meanings');
const reviewRoot = path.join(draftRoot, 'review');
const reportsRoot = path.join(draftRoot, 'reports');
const outputRoot = path.join(draftRoot, 'writeback_preview');

const batchId = 'batch_006';
const expectedCandidateCount = 48;
const excludedSkippedTerms = Object.freeze(['provision', 'accord_and_satisfaction']);

const inputPaths = Object.freeze({
  revisedDraftsPreWriteback: path.join(reviewRoot, 'batch_006_revised_drafts_PRE_WRITEBACK.json'),
  skippedTerms: path.join(reportsRoot, 'batch_006_skipped.json'),
});

const currentSourceFilePath = path.join(
  repoRoot,
  'backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json',
);

const outputPaths = Object.freeze({
  previewJson: path.join(outputRoot, 'batch_006_writeback_preview_NOT_APPLIED.json'),
  diffMarkdown: path.join(outputRoot, 'batch_006_writeback_diff_preview.md'),
  validationReportJson: path.join(outputRoot, 'batch_006_writeback_validation_report.json'),
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

function gitDiffStatus(args) {
  try {
    const output = execFileSync('git', ['diff', '--name-only', '--', ...args], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim();
    return {
      clean: output.length === 0,
      changedPaths: output ? output.split(/\r?\n/) : [],
    };
  } catch (error) {
    return {
      clean: false,
      changedPaths: [],
      error: error.message,
    };
  }
}

function countProvenance(record, key) {
  const values = record.provenancePointers?.[key];
  return Array.isArray(values) ? values.length : 0;
}

function buildProposedAddition(record, generatedSourceTerms) {
  const normalizedTerm = normalizeTerm(record.normalizedTerm ?? record.term);
  const finalProposedMeaningInLaw = record.reviewedMeaningInLaw
    ?? record.revisedMeaningInLaw
    ?? record.draftMeaningInLaw
    ?? null;
  const termAlreadyExistsInGeneratedSource = generatedSourceTerms.has(normalizedTerm);
  const blackPrimaryProvenanceCount = countProvenance(record, 'black');
  const andersonComparatorProvenanceCount = countProvenance(record, 'anderson');
  const osbornComparatorProvenanceCount = countProvenance(record, 'osborn');

  let writebackAction = 'add';
  const safetyNotes = [
    'Preview only; no writeback was applied.',
    'Registry-only meaning/reference layer; no runtime ontology admission.',
    'Comparator sources remain context only.',
  ];

  if (termAlreadyExistsInGeneratedSource) {
    writebackAction = 'skip_existing';
    safetyNotes.push('Skipped because the normalized term already exists in the generated source file.');
  }

  if (!finalProposedMeaningInLaw || blackPrimaryProvenanceCount < 1) {
    writebackAction = 'skip_invalid';
    safetyNotes.push('Skipped because required proposed meaning or Black primary provenance is missing.');
  }

  return {
    term: record.term,
    normalizedTerm,
    reviewDecision: record.reviewDecision,
    originalDraftWording: record.draftMeaningInLaw ?? null,
    revisedWording: record.revisedMeaningInLaw ?? null,
    finalProposedMeaningInLaw,
    sourceBasis: record.sourceBasis,
    blackPrimaryProvenanceCount,
    andersonComparatorProvenanceCount,
    osbornComparatorProvenanceCount,
    provenancePointers: record.provenancePointers,
    sourceReferences: record.sourceReferences,
    termAlreadyExistsInGeneratedSource,
    writebackAction,
    safetyNotes,
  };
}

function validationCheck(name, passed, details = null) {
  return {
    name,
    passed,
    details,
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

function buildMarkdown(preview, validationSummary) {
  const rows = preview.proposedAdditions.map((candidate) => [
    candidate.term,
    candidate.reviewDecision,
    candidate.sourceBasis,
    candidate.blackPrimaryProvenanceCount,
    candidate.andersonComparatorProvenanceCount,
    candidate.osbornComparatorProvenanceCount,
    candidate.writebackAction,
    candidate.finalProposedMeaningInLaw,
  ]);

  const warningRows = validationSummary.validationChecks
    .filter((check) => !check.passed)
    .map((check) => [check.name, JSON.stringify(check.details ?? {})]);

  return `${[
    '# Batch 006 Writeback Diff Preview',
    '',
    'This is a preview only. No writeback was applied.',
    '',
    '## Summary',
    '',
    `- Status: ${preview.status}`,
    `- Mode: ${preview.mode}`,
    `- Writeback executed: ${preview.writebackExecuted}`,
    `- Candidate count: ${preview.candidateCount}`,
    `- Add count: ${preview.addCount}`,
    `- Skip count: ${preview.skipCount}`,
    `- Approved count: ${preview.approvedCount}`,
    `- Revised count: ${preview.revisedCount}`,
    `- Excluded skipped terms: ${preview.excludedSkippedTerms.join(', ')}`,
    '',
    '## Proposed Additions',
    '',
    markdownTable(
      [
        'Term',
        'Review decision',
        'Source basis',
        'Black refs',
        'Anderson refs',
        'Osborn refs',
        'Action',
        'Final proposed meaningInLaw',
      ],
      rows,
    ),
    '',
    '## Validation Warnings',
    '',
    warningRows.length > 0
      ? markdownTable(['Check', 'Details'], warningRows)
      : 'No validation warnings.',
    '',
    '## Skipped / Excluded Terms',
    '',
    markdownTable(
      ['Term', 'Reason'],
      preview.skippedTerms.map((term) => [term.term, term.reason]),
    ),
    '',
    '## Boundary Statement',
    '',
    'This preview does not mutate the generated source file, vocabulary dataset, runtime ontology, concept packets, resolver behavior, aliases, or frontend display files.',
    '',
  ].join('\n')}\n`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const sourceFileHashBefore = sha256File(currentSourceFilePath);
  const revisedDrafts = readJson(inputPaths.revisedDraftsPreWriteback);
  const skippedTerms = readJson(inputPaths.skippedTerms).map((record) => ({
    term: record.term,
    normalizedTerm: normalizeTerm(record.normalizedTerm ?? record.term),
    reason: record.draftReason,
  }));
  const currentSources = readJson(currentSourceFilePath);
  const generatedSourceTerms = new Set(
    Object.keys(currentSources.terms ?? {}).map((term) => normalizeTerm(term)),
  );
  const skippedTermSet = new Set(excludedSkippedTerms.map((term) => term.toLowerCase()));

  const proposedAdditions = revisedDrafts.map((record) => (
    buildProposedAddition(record, generatedSourceTerms)
  ));

  const addCount = proposedAdditions.filter((candidate) => (
    candidate.writebackAction === 'add'
  )).length;
  const skipCount = proposedAdditions.length - addCount;
  const approvedCount = proposedAdditions.filter((candidate) => (
    candidate.reviewDecision === 'approve'
  )).length;
  const revisedCount = proposedAdditions.filter((candidate) => (
    candidate.reviewDecision === 'revise'
  )).length;
  const candidateTerms = new Set(proposedAdditions.map((candidate) => candidate.normalizedTerm));
  const sourceFileHashAfterBuild = sha256File(currentSourceFilePath);
  const sourceFileDiffStatus = gitDiffStatus([
    'backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json',
  ]);
  const dataConceptsDiffStatus = gitDiffStatus(['data/concepts']);
  const conceptModuleDiffStatus = gitDiffStatus(['backend/src/modules/concepts']);
  const candidateExactTerms = new Set(proposedAdditions.map((candidate) => (
    candidate.term.toLowerCase()
  )));

  const validationChecks = [
    validationCheck('expected_candidate_count_48', proposedAdditions.length === expectedCandidateCount, {
      actual: proposedAdditions.length,
      expected: expectedCandidateCount,
    }),
    validationCheck('skipped_terms_excluded', excludedSkippedTerms.every((term) => (
      !candidateExactTerms.has(term.toLowerCase())
    )), {
      excludedSkippedTerms,
      candidateMatches: excludedSkippedTerms.filter((term) => (
        candidateExactTerms.has(term.toLowerCase())
      )),
    }),
    validationCheck('skipped_report_matches_expected_terms', skippedTerms.length === 2 && skippedTerms.every((term) => (
      skippedTermSet.has(term.term.toLowerCase())
    )), {
      skippedTerms,
    }),
    validationCheck('no_candidate_already_exists_in_generated_source', proposedAdditions.every((candidate) => (
      !candidate.termAlreadyExistsInGeneratedSource
    )), {
      existingCandidates: proposedAdditions
        .filter((candidate) => candidate.termAlreadyExistsInGeneratedSource)
        .map((candidate) => candidate.term),
    }),
    validationCheck('every_candidate_has_final_meaning', proposedAdditions.every((candidate) => (
      Boolean(candidate.finalProposedMeaningInLaw)
    )), {
      missingMeaningTerms: proposedAdditions
        .filter((candidate) => !candidate.finalProposedMeaningInLaw)
        .map((candidate) => candidate.term),
    }),
    validationCheck('every_candidate_has_black_primary_provenance', proposedAdditions.every((candidate) => (
      candidate.blackPrimaryProvenanceCount >= 1
    )), {
      missingBlackTerms: proposedAdditions
        .filter((candidate) => candidate.blackPrimaryProvenanceCount < 1)
        .map((candidate) => candidate.term),
    }),
    validationCheck('anderson_osborn_comparator_context_only', proposedAdditions.every((candidate) => (
      candidate.sourceBasis === 'black_only'
      || candidate.sourceBasis.startsWith('black_plus_')
    )), {
      sourceBasisValues: [...new Set(proposedAdditions.map((candidate) => candidate.sourceBasis))],
    }),
    validationCheck('no_alias_surfaces_added', proposedAdditions.every((candidate) => (
      !candidate.term.includes('_')
    )), {
      underscoreTerms: proposedAdditions
        .filter((candidate) => candidate.term.includes('_'))
        .map((candidate) => candidate.term),
    }),
    validationCheck('source_file_hash_unchanged_during_preview_build', sourceFileHashBefore === sourceFileHashAfterBuild, {
      sourceFileHashBefore,
      sourceFileHashAfter: sourceFileHashAfterBuild,
    }),
    validationCheck('data_concepts_diff_clean', dataConceptsDiffStatus.clean, dataConceptsDiffStatus),
    validationCheck('concept_module_diff_clean', conceptModuleDiffStatus.clean, conceptModuleDiffStatus),
  ];
  const validationPassed = validationChecks.every((check) => check.passed);

  const preview = {
    status: 'NOT_APPLIED',
    batchId,
    mode: 'writeback_preview_only',
    writebackExecuted: false,
    generatedAt,
    inputArtifactPaths: inputPaths,
    currentSourceFilePath,
    candidateCount: proposedAdditions.length,
    addCount,
    skipCount,
    approvedCount,
    revisedCount,
    excludedSkippedTerms,
    skippedTerms,
    proposedAdditions,
    validationSummary: {
      passed: validationPassed,
      validationChecks,
      finalRecommendation: validationPassed
        ? 'ready_for_human_preview_review'
        : 'blocked_with_reasons',
    },
  };

  const sourceFileHashAfter = sha256File(currentSourceFilePath);
  const validationReport = {
    status: validationPassed ? 'pass' : 'fail',
    batchId,
    mode: 'writeback_preview_only',
    writebackExecuted: false,
    generatedAt,
    validationChecks,
    sourceFileHashBefore,
    sourceFileHashAfter,
    hashUnchanged: sourceFileHashBefore === sourceFileHashAfter,
    sourceFileDiffStatus,
    runtimeConceptResolverDiffStatus: {
      dataConcepts: dataConceptsDiffStatus,
      backendConceptModules: conceptModuleDiffStatus,
    },
    finalRecommendation: validationPassed
      ? 'ready_for_human_preview_review'
      : 'blocked_with_reasons',
  };

  writeJson(outputPaths.previewJson, preview);
  writeText(outputPaths.diffMarkdown, buildMarkdown(preview, preview.validationSummary));
  writeJson(outputPaths.validationReportJson, validationReport);

  console.log(JSON.stringify({
    status: preview.status,
    batchId,
    candidateCount: preview.candidateCount,
    addCount: preview.addCount,
    skipCount: preview.skipCount,
    approvedCount: preview.approvedCount,
    revisedCount: preview.revisedCount,
    validationPassed,
    finalRecommendation: validationReport.finalRecommendation,
    sourceFileHashBefore,
    sourceFileHashAfter,
    hashUnchanged: validationReport.hashUnchanged,
    outputPaths,
  }, null, 2));

  if (!validationPassed) {
    process.exitCode = 1;
  }
}

main();
