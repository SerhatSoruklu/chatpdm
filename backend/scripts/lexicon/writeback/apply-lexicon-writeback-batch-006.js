'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  buildVocabularyBoundaryResponse,
} = require('../../../src/modules/legal-vocabulary/vocabulary-boundary');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const draftRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/draft_meanings');
const previewRoot = path.join(draftRoot, 'writeback_preview');
const appliedRoot = path.join(draftRoot, 'writeback_applied');

const batchId = 'batch_006';
const expectedCandidateCount = 48;
const skippedTerms = Object.freeze(['provision', 'accord_and_satisfaction']);
const skippedTermSet = new Set(skippedTerms);

const inputPaths = Object.freeze({
  preview: path.join(previewRoot, 'batch_006_writeback_preview_NOT_APPLIED.json'),
  humanReview: path.join(previewRoot, 'batch_006_human_preview_review.json'),
});

const targetPaths = Object.freeze({
  meaningSources: path.join(
    repoRoot,
    'backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json',
  ),
  vocabularyBoundary: path.join(repoRoot, 'backend/src/modules/legal-vocabulary/vocabulary-boundary.js'),
});

const outputPaths = Object.freeze({
  reportMarkdown: path.join(appliedRoot, 'batch_006_applied_writeback_report.md'),
  appliedDiffJson: path.join(appliedRoot, 'batch_006_applied_diff.json'),
  postApplyValidationReportJson: path.join(appliedRoot, 'batch_006_post_apply_validation_report.json'),
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
  const output = execFileSync('git', ['diff', '--name-only', '--', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
  return {
    clean: output.length === 0,
    changedPaths: output ? output.split(/\r?\n/) : [],
  };
}

function buildBoundaryEntryMap() {
  const response = buildVocabularyBoundaryResponse();
  return new Map(response.entries.map((entry) => [entry.term, entry]));
}

function fail(message, details = null) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function assertCondition(condition, message, details = null) {
  if (!condition) {
    fail(message, details);
  }
}

function buildApprovedCandidates(preview, humanReview, currentSources) {
  assertCondition(preview.status === 'NOT_APPLIED', 'Preview status must be NOT_APPLIED.', preview.status);
  assertCondition(
    preview.validationSummary?.finalRecommendation === 'ready_for_human_preview_review',
    'Preview recommendation must be ready_for_human_preview_review.',
    preview.validationSummary?.finalRecommendation,
  );
  assertCondition(
    humanReview.finalRecommendation === 'ready_for_apply_prompt',
    'Human review recommendation must be ready_for_apply_prompt.',
    humanReview.finalRecommendation,
  );
  assertCondition(
    humanReview.approvedForApplyCount === expectedCandidateCount,
    'Human review approvedForApply count must be 48.',
    humanReview.approvedForApplyCount,
  );
  assertCondition(humanReview.needsRevisionCount === 0, 'Human review needsRevision count must be 0.');
  assertCondition(humanReview.blockedCount === 0, 'Human review blocked count must be 0.');

  const humanRecordsByTerm = new Map(humanReview.records.map((record) => [record.term, record]));
  const currentGeneratedTerms = new Set(Object.keys(currentSources.terms ?? {}).map(normalizeTerm));
  const candidates = preview.proposedAdditions.map((candidate) => {
    const humanRecord = humanRecordsByTerm.get(candidate.term);
    return {
      ...candidate,
      humanReviewDecision: humanRecord?.decision ?? null,
      humanApplyEligible: humanRecord?.applyEligible ?? false,
    };
  });

  assertCondition(candidates.length === expectedCandidateCount, 'Expected exactly 48 candidates.', candidates.length);

  const failures = [];
  candidates.forEach((candidate) => {
    if (candidate.humanReviewDecision !== 'approve_for_apply' || !candidate.humanApplyEligible) {
      failures.push([candidate.term, 'not approved_for_apply']);
    }
    if (candidate.writebackAction !== 'add') {
      failures.push([candidate.term, `writebackAction ${candidate.writebackAction}`]);
    }
    if (!candidate.finalProposedMeaningInLaw) {
      failures.push([candidate.term, 'missing finalProposedMeaningInLaw']);
    }
    if (candidate.blackPrimaryProvenanceCount < 1) {
      failures.push([candidate.term, 'missing Black primary provenance']);
    }
    if (candidate.term.includes('_')) {
      failures.push([candidate.term, 'underscore alias surface']);
    }
    if (skippedTermSet.has(candidate.term)) {
      failures.push([candidate.term, 'skipped term included']);
    }
    if (currentGeneratedTerms.has(candidate.normalizedTerm)) {
      failures.push([candidate.term, 'already exists in generated source file']);
    }
  });

  assertCondition(failures.length === 0, 'One or more candidates failed pre-apply validation.', failures);
  return candidates;
}

function supportNoteFor(candidate, sourceGroup, source) {
  const sourceLabel = sourceGroup === 'black'
    ? 'Black primary support'
    : `${sourceGroup.charAt(0).toUpperCase()}${sourceGroup.slice(1)} comparator context`;
  const support = candidate.finalProposedMeaningInLaw.replace(/\s+/g, ' ').trim();
  return `${sourceLabel} for ${candidate.term}: ${support}`;
}

function sourceRecordFromPointer(candidate, sourceGroup, source) {
  return {
    sourceId: source.sourceId,
    sourceTitle: source.sourceTitle,
    year: source.year,
    page: source.page,
    lineNumber: Number.isInteger(source.lineNumber) ? source.lineNumber : null,
    headword: typeof source.headword === 'string' ? source.headword : null,
    supportNote: supportNoteFor(candidate, sourceGroup, source),
    snippetDisplay: typeof source.contextPreview === 'string' ? source.contextPreview : null,
    referenceRole: 'supporting_lexicon_reference',
  };
}

function buildSourceRecords(candidate) {
  const groups = ['black', 'anderson', 'osborn'];
  return groups.flatMap((group) => {
    const pointers = candidate.provenancePointers?.[group];
    if (!Array.isArray(pointers)) {
      return [];
    }
    return pointers.map((source) => sourceRecordFromPointer(candidate, group, source));
  });
}

function applyMeaningSources(currentSources, candidates, appliedAt) {
  const nextSources = {
    ...currentSources,
    generatedAt: appliedAt,
    source: `${currentSources.source}_plus_batch_006_writeback`,
    terms: {
      ...currentSources.terms,
    },
  };

  candidates
    .slice()
    .sort((left, right) => left.term.localeCompare(right.term))
    .forEach((candidate) => {
      nextSources.terms[candidate.term] = buildSourceRecords(candidate);
    });

  nextSources.terms = Object.fromEntries(
    Object.entries(nextSources.terms).sort(([left], [right]) => left.localeCompare(right)),
  );

  writeJson(targetPaths.meaningSources, nextSources);
}

function jsString(value) {
  return JSON.stringify(value);
}

function buildOverrideBlock(candidates) {
  return candidates
    .slice()
    .sort((left, right) => left.term.localeCompare(right.term))
    .map((candidate) => [
      `  ${jsString(candidate.term)}: Object.freeze({`,
      `    meaningInLaw: ${jsString(candidate.finalProposedMeaningInLaw)},`,
      '  }),',
    ].join('\n'))
    .join('\n');
}

function applyBoundaryOverrides(candidates) {
  const original = fs.readFileSync(targetPaths.vocabularyBoundary, 'utf8');
  const duplicateTerms = candidates.filter((candidate) => (
    original.includes(`${jsString(candidate.term)}: Object.freeze({`)
    || original.includes(`  ${candidate.term}: Object.freeze({`)
  ));
  assertCondition(duplicateTerms.length === 0, 'Candidate semantic override already exists.', duplicateTerms.map((candidate) => candidate.term));

  const marker = '});\n\nfunction getTermSemanticOverride(term) {';
  const insertion = `${buildOverrideBlock(candidates)}\n`;
  assertCondition(original.includes(marker), 'Could not locate TERM_SEMANTIC_OVERRIDES insertion marker.');

  const updated = original.replace(marker, `${insertion}${marker}`);
  fs.writeFileSync(targetPaths.vocabularyBoundary, updated, 'utf8');
}

function meaningCountSnapshot() {
  delete require.cache[require.resolve('../../../src/modules/legal-vocabulary/vocabulary-boundary')];
  const {
    buildVocabularyBoundaryResponse: freshBuildVocabularyBoundaryResponse,
  } = require('../../../src/modules/legal-vocabulary/vocabulary-boundary');
  const response = freshBuildVocabularyBoundaryResponse();
  const entriesWithMeaning = response.entries.filter((entry) => (
    typeof entry.meaningInLaw === 'string' && entry.meaningInLaw.trim() !== ''
  ));
  const entriesWithSourceProvenance = response.entries.filter((entry) => (
    Array.isArray(entry.meaningSources) && entry.meaningSources.length > 0
  ));
  return {
    totalBoundaryRegistryEntries: response.entries.length,
    boundaryEntriesWithMeaningInLaw: entriesWithMeaning.length,
    sourceBackedBoundaryEntries: entriesWithSourceProvenance.length,
  };
}

function runCommand(command, args, options = {}) {
  try {
    const output = execFileSync(command, args, {
      cwd: options.cwd ?? repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return {
      command: [command, ...args].join(' '),
      status: 'pass',
      output: output.trim(),
    };
  } catch (error) {
    return {
      command: [command, ...args].join(' '),
      status: 'fail',
      output: `${error.stdout ?? ''}${error.stderr ?? ''}`.trim(),
    };
  }
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

function buildReport(appliedDiff, postApplyReport) {
  const addedRows = appliedDiff.addedTerms.map((term) => [
    term.term,
    term.reviewDecision,
    term.sourceBasis,
    term.blackPrimaryProvenanceCount,
    term.andersonComparatorProvenanceCount,
    term.osbornComparatorProvenanceCount,
    term.finalProposedMeaningInLaw,
  ]);
  const validationRows = postApplyReport.validationCommandResults.map((result) => [
    result.command,
    result.status,
  ]);

  return `${[
    '# Batch 006 Applied Writeback Report',
    '',
    'Scope: source-backed legal vocabulary meaning layer only. Runtime ontology, concept packets, resolver behavior, aliases, frontend display, and production data were not changed.',
    '',
    '## Summary',
    '',
    '- Final state: Batch 006 applied',
    `- Added terms: ${appliedDiff.addedCount}`,
    `- Generated source-backed meaning count before: ${appliedDiff.beforeSourceBackedGeneratedMeaningCount}`,
    `- Generated source-backed meaning count after: ${appliedDiff.afterSourceBackedGeneratedMeaningCount}`,
    `- Boundary response meaning count before: ${appliedDiff.beforeBoundaryEntriesWithMeaningInLaw}`,
    `- Boundary response meaning count after: ${appliedDiff.afterBoundaryEntriesWithMeaningInLaw}`,
    `- Source hash before: ${appliedDiff.sourceHashBefore}`,
    `- Source hash after: ${appliedDiff.sourceHashAfter}`,
    '',
    '## Pre-Apply Checks',
    '',
    markdownTable(['Check', 'Result'], appliedDiff.preApplyChecks.map((check) => [check.name, check.passed ? 'pass' : 'fail'])),
    '',
    '## Added Terms',
    '',
    markdownTable(
      ['Term', 'Review decision', 'Source basis', 'Black refs', 'Anderson refs', 'Osborn refs', 'Meaning in law'],
      addedRows,
    ),
    '',
    '## Skipped Terms Preserved',
    '',
    markdownTable(['Term'], appliedDiff.skippedTermsPreserved.map((term) => [term])),
    '',
    '## Validation Commands',
    '',
    markdownTable(['Command', 'Result'], validationRows),
    '',
    '## Safety Confirmations',
    '',
    `- No existing terms modified: ${appliedDiff.noExistingTermsModified}`,
    `- No aliases added: ${appliedDiff.noAliasesAdded}`,
    `- provision excluded: ${postApplyReport.safetyChecks.provisionExcluded}`,
    `- accord_and_satisfaction excluded: ${postApplyReport.safetyChecks.accordAndSatisfactionExcluded}`,
    `- Concept packet diff clean: ${postApplyReport.diffChecks.dataConcepts.clean}`,
    `- Concept module diff clean: ${postApplyReport.diffChecks.backendConceptModules.clean}`,
    '',
  ].join('\n')}\n`;
}

function main() {
  fs.mkdirSync(appliedRoot, { recursive: true });

  const appliedAt = new Date().toISOString();
  const preview = readJson(inputPaths.preview);
  const humanReview = readJson(inputPaths.humanReview);
  const currentSources = readJson(targetPaths.meaningSources);
  const sourceHashBefore = sha256File(targetPaths.meaningSources);
  const boundaryHashBefore = sha256File(targetPaths.vocabularyBoundary);
  const beforeGeneratedCount = Object.keys(currentSources.terms ?? {}).length;
  const beforeMeaningSnapshot = meaningCountSnapshot();
  const beforeExistingTerms = new Set(Object.keys(currentSources.terms ?? {}));

  const preApplyChecks = [];
  function precheck(name, passed, details = null) {
    preApplyChecks.push({ name, passed, details });
    assertCondition(passed, `Pre-apply check failed: ${name}`, details);
  }

  precheck('preview_status_not_applied', preview.status === 'NOT_APPLIED', preview.status);
  precheck(
    'preview_recommendation_ready_for_human_preview_review',
    preview.validationSummary?.finalRecommendation === 'ready_for_human_preview_review',
    preview.validationSummary?.finalRecommendation,
  );
  precheck(
    'human_review_ready_for_apply_prompt',
    humanReview.finalRecommendation === 'ready_for_apply_prompt',
    humanReview.finalRecommendation,
  );
  precheck('human_review_approved_count_48', humanReview.approvedForApplyCount === expectedCandidateCount, humanReview.approvedForApplyCount);
  precheck('human_review_needs_revision_zero', humanReview.needsRevisionCount === 0, humanReview.needsRevisionCount);
  precheck('human_review_blocked_zero', humanReview.blockedCount === 0, humanReview.blockedCount);

  const candidates = buildApprovedCandidates(preview, humanReview, currentSources);
  precheck('all_candidates_prevalidated', candidates.length === expectedCandidateCount, candidates.length);

  applyMeaningSources(currentSources, candidates, appliedAt);
  applyBoundaryOverrides(candidates);

  const afterSources = readJson(targetPaths.meaningSources);
  const afterGeneratedCount = Object.keys(afterSources.terms ?? {}).length;
  const afterMeaningSnapshot = meaningCountSnapshot();
  const sourceHashAfter = sha256File(targetPaths.meaningSources);
  const boundaryHashAfter = sha256File(targetPaths.vocabularyBoundary);
  const addedTerms = candidates.map((candidate) => ({
    term: candidate.term,
    normalizedTerm: candidate.normalizedTerm,
    reviewDecision: candidate.reviewDecision,
    finalProposedMeaningInLaw: candidate.finalProposedMeaningInLaw,
    sourceBasis: candidate.sourceBasis,
    blackPrimaryProvenanceCount: candidate.blackPrimaryProvenanceCount,
    andersonComparatorProvenanceCount: candidate.andersonComparatorProvenanceCount,
    osbornComparatorProvenanceCount: candidate.osbornComparatorProvenanceCount,
    provenancePointerCounts: {
      black: candidate.blackPrimaryProvenanceCount,
      anderson: candidate.andersonComparatorProvenanceCount,
      osborn: candidate.osbornComparatorProvenanceCount,
    },
  }));
  const existingTermsModified = [...beforeExistingTerms].filter((term) => (
    JSON.stringify(currentSources.terms[term]) !== JSON.stringify(afterSources.terms[term])
  ));
  const batchAddedTermsInSource = candidates.filter((candidate) => (
    Array.isArray(afterSources.terms[candidate.term])
  )).map((candidate) => candidate.term);

  const validationCommandResults = [
    runCommand('node', ['--check', 'backend/scripts/lexicon/writeback/apply-lexicon-writeback-batch-006.js']),
    runCommand('node', ['backend/scripts/verify-vocabulary-boundary-contract.js']),
    runCommand('node', ['backend/scripts/verify-legal-vocabulary-recognition.js']),
    runCommand('node', ['backend/scripts/verify-resolver.js']),
    runCommand('node', ['backend/scripts/verify-admission-boundary.js']),
    runCommand('node', ['backend/scripts/verify-blocked-concept-admission.js']),
    runCommand('node', ['backend/scripts/verify-pre-admission-contract-path.js']),
    runCommand('node', ['backend/scripts/verify-public-resolver-regression.js']),
    runCommand('node', [
      '--test',
      'backend/tests/vocabulary/vocabulary-boundary.test.js',
      'backend/tests/vocabulary/vocabulary-boundary-anti-leak.test.js',
      'backend/tests/vocabulary/vocabulary-classification.freeze.test.js',
      'backend/tests/vocabulary/vocabulary-classifier.test.js',
    ]),
    runCommand('npm', ['--prefix', 'frontend', 'run', 'typecheck']),
  ];

  const diffChecks = {
    dataConcepts: gitDiffStatus(['data/concepts']),
    backendConceptModules: gitDiffStatus(['backend/src/modules/concepts']),
    resolverScript: gitDiffStatus(['backend/scripts/verify-resolver.js']),
  };

  const countChecks = {
    batch006AddedTermsInSourceCount: batchAddedTermsInSource.length,
    generatedSourceCountBefore: beforeGeneratedCount,
    generatedSourceCountAfter: afterGeneratedCount,
    generatedSourceCountExpectedAfter: beforeGeneratedCount + expectedCandidateCount,
    boundaryEntriesWithMeaningBefore: beforeMeaningSnapshot.boundaryEntriesWithMeaningInLaw,
    boundaryEntriesWithMeaningAfter: afterMeaningSnapshot.boundaryEntriesWithMeaningInLaw,
    boundaryEntriesWithMeaningExpectedAfter: beforeMeaningSnapshot.boundaryEntriesWithMeaningInLaw + expectedCandidateCount,
    sourceBackedBoundaryEntriesBefore: beforeMeaningSnapshot.sourceBackedBoundaryEntries,
    sourceBackedBoundaryEntriesAfter: afterMeaningSnapshot.sourceBackedBoundaryEntries,
  };

  const safetyChecks = {
    provisionExcluded: !Object.hasOwn(afterSources.terms ?? {}, 'provision'),
    accordAndSatisfactionExcluded: !Object.hasOwn(afterSources.terms ?? {}, 'accord_and_satisfaction'),
    noExistingTermsModified: existingTermsModified.length === 0,
    noAliasesAdded: candidates.every((candidate) => !candidate.term.includes('_')),
    noConceptPacketDiff: diffChecks.dataConcepts.clean,
    noRuntimeOntologyDiff: diffChecks.backendConceptModules.clean,
    noResolverBehaviorDiff: diffChecks.resolverScript.clean,
  };

  const allCommandsPassed = validationCommandResults.every((result) => result.status === 'pass');
  const countsPassed = (
    countChecks.batch006AddedTermsInSourceCount === expectedCandidateCount
    && countChecks.generatedSourceCountAfter === countChecks.generatedSourceCountExpectedAfter
    && countChecks.boundaryEntriesWithMeaningAfter === countChecks.boundaryEntriesWithMeaningExpectedAfter
  );
  const safetyPassed = Object.values(safetyChecks).every(Boolean);
  const finalRecommendation = allCommandsPassed && countsPassed && safetyPassed
    ? 'batch_006_applied_clean'
    : 'blocked_post_apply_with_reasons';

  const appliedDiff = {
    generatedAt: appliedAt,
    status: 'APPLIED',
    batchId,
    addedTerms,
    addedCount: addedTerms.length,
    beforeSourceBackedGeneratedMeaningCount: beforeGeneratedCount,
    afterSourceBackedGeneratedMeaningCount: afterGeneratedCount,
    beforeBoundaryEntriesWithMeaningInLaw: beforeMeaningSnapshot.boundaryEntriesWithMeaningInLaw,
    afterBoundaryEntriesWithMeaningInLaw: afterMeaningSnapshot.boundaryEntriesWithMeaningInLaw,
    sourceHashBefore,
    sourceHashAfter,
    boundaryHashBefore,
    boundaryHashAfter,
    skippedTermsPreserved: skippedTerms,
    noExistingTermsModified: existingTermsModified.length === 0,
    existingTermsModified,
    noAliasesAdded: candidates.every((candidate) => !candidate.term.includes('_')),
    preApplyChecks,
  };

  const postApplyReport = {
    generatedAt: new Date().toISOString(),
    batchId,
    validationCommandResults,
    countChecks,
    diffChecks,
    safetyChecks,
    sourceHashBefore,
    sourceHashAfter,
    boundaryHashBefore,
    boundaryHashAfter,
    finalRecommendation,
  };

  writeJson(outputPaths.appliedDiffJson, appliedDiff);
  writeJson(outputPaths.postApplyValidationReportJson, postApplyReport);
  writeText(outputPaths.reportMarkdown, buildReport(appliedDiff, postApplyReport));

  console.log(JSON.stringify({
    status: 'APPLIED',
    finalRecommendation,
    addedCount: addedTerms.length,
    beforeGeneratedCount,
    afterGeneratedCount,
    beforeBoundaryMeaningCount: beforeMeaningSnapshot.boundaryEntriesWithMeaningInLaw,
    afterBoundaryMeaningCount: afterMeaningSnapshot.boundaryEntriesWithMeaningInLaw,
    sourceHashBefore,
    sourceHashAfter,
    boundaryHashBefore,
    boundaryHashAfter,
    validationPassed: finalRecommendation === 'batch_006_applied_clean',
    outputPaths,
  }, null, 2));

  if (finalRecommendation !== 'batch_006_applied_clean') {
    process.exitCode = 1;
  }
}

main();
