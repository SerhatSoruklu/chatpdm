'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  buildVocabularyBoundaryResponse,
} = require('../../../src/modules/legal-vocabulary/vocabulary-boundary');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const multiSourceReportsRoot = path.join(
  workspaceRoot,
  'vocabulary_reference_lexicons/multi_source/reports',
);

const inputPaths = Object.freeze({
  appliedDiff: path.join(multiSourceReportsRoot, 'comparator_v2_writeback_applied_diff.json'),
  preview: path.join(multiSourceReportsRoot, 'comparator_v2_writeback_preview_NOT_APPLIED.json'),
  validationReport: path.join(multiSourceReportsRoot, 'comparator_v2_writeback_validation_report.json'),
  provenanceReport: path.join(repoRoot, 'docs/boundary/meaning-source-provenance-report.json'),
  coverageAudit: path.join(repoRoot, 'docs/boundary/meaning-coverage-audit.json'),
  pipelineController: path.join(repoRoot, 'docs/boundary/lexicon-pipeline-controller-report.json'),
});

const outputPaths = Object.freeze({
  json: path.join(repoRoot, 'docs/boundary/comparator-v2-stabilization-readiness-report.json'),
  markdown: path.join(repoRoot, 'docs/boundary/comparator-v2-stabilization-readiness-report.md'),
});

const HIGH_RISK_EXPECTATIONS = Object.freeze({
  probation: {
    required: ['criminal procedure', 'conditional release', 'offender'],
    forbidden: ['employment', 'test period', 'supervision'],
    risk: 'modern expansion from a narrow probation-of-offenders comparator sense',
  },
  condonation: {
    required: ['matrimonial', 'forgiveness', 'marriage'],
    forbidden: ['criminal', 'general forgiveness'],
    risk: 'loss of historically narrow matrimonial scope',
  },
  sanctuary: {
    required: ['old law', 'asylum', 'process'],
    forbidden: ['immigration', 'modern refuge'],
    risk: 'modern policy drift from historical asylum/process-immunity sense',
  },
  servitude: {
    required: ['property', 'civil-law', 'burden'],
    forbidden: ['personal service', 'labor'],
    risk: 'collapse into non-property service language',
  },
  submission: {
    required: ['dispute', 'decision', 'arbitration'],
    forbidden: ['obedience', 'surrender'],
    risk: 'collapse into generic yielding instead of procedural submission',
  },
  process: {
    required: ['writ', 'court', 'compel'],
    forbidden: ['method', 'workflow'],
    risk: 'modern generic-process drift',
  },
  marriage: {
    required: ['legally recognized', 'consent', 'civil status'],
    forbidden: ['social relationship', 'ceremony only'],
    risk: 'sociological or ceremonial broadening',
  },
  succession: {
    required: ['transmission', 'property', 'rights'],
    forbidden: ['sequence only', 'next in time'],
    risk: 'generic sequence drift',
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

function readJsonIfExists(filePath, fallback = null) {
  return fs.existsSync(filePath) ? readJson(filePath) : fallback;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function normalizeForComparison(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[.,;:]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function countBy(records, key) {
  return records.reduce((counts, record) => {
    const value = record[key] ?? 'unknown';
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function percent(numerator, denominator) {
  if (!denominator) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(2));
}

function includesText(value, expected) {
  return normalizeForComparison(value).includes(normalizeForComparison(expected));
}

function evaluateHighRiskTerm(term, expectation, entriesByTerm, appliedRowsByTerm, previewRowsByTerm) {
  const entry = entriesByTerm.get(term) ?? null;
  const currentMeaningInLaw = entry?.meaningInLaw ?? null;
  const requiredMatches = expectation.required.map((phrase) => ({
    phrase,
    present: includesText(currentMeaningInLaw, phrase),
  }));
  const forbiddenHits = expectation.forbidden.filter((phrase) => includesText(currentMeaningInLaw, phrase));
  const missingRequired = requiredMatches.filter((match) => !match.present).map((match) => match.phrase);
  const appliedRow = appliedRowsByTerm.get(term) ?? null;
  const previewRow = previewRowsByTerm.get(term) ?? null;
  const status = !currentMeaningInLaw
    ? 'missing_current_meaning'
    : forbiddenHits.length > 0
      ? 'fail_forbidden_scope_signal'
      : missingRequired.length > 0
        ? 'review_required_missing_expected_scope_marker'
        : 'pass';

  return {
    term,
    status,
    risk: expectation.risk,
    currentMeaningInLaw,
    requiredMatches,
    missingRequired,
    forbiddenHits,
    sourceBasis: appliedRow?.sourceBasis ?? previewRow?.sourceBasis ?? null,
    changeType: appliedRow?.changeType ?? previewRow?.changeType ?? null,
    operation: appliedRow?.operation ?? null,
    reviewDecisionSource: appliedRow?.reviewDecisionSource ?? previewRow?.reviewDecisionSource ?? null,
    osbornNoisySnippetCount: previewRow?.osbornNoisySnippetCount ?? null,
    osbornComparisonFlags: previewRow?.osbornComparisonFlags ?? [],
  };
}

function buildFeedbackLoop(appliedRows, previewRows) {
  const appliedStatusRows = appliedRows.filter((row) => row.status === 'APPLIED');
  const osbornRows = appliedStatusRows.filter((row) => row.sourceBasis.includes('osborn'));
  const andersonRows = appliedStatusRows.filter((row) => row.sourceBasis.includes('anderson'));
  const osbornOnlyRows = appliedStatusRows.filter((row) => row.sourceBasis === 'black_plus_osborn');
  const andersonOnlyRows = appliedStatusRows.filter((row) => row.sourceBasis === 'black_plus_anderson');
  const osbornAndAndersonRows = appliedStatusRows.filter((row) => (
    row.sourceBasis === 'black_plus_anderson_plus_osborn'
  ));
  const osbornNarrowingRows = previewRows.filter((row) => (
    row.osbornContradictsOrNarrowsAnderson
    || (row.osbornComparisonFlags ?? []).some((flag) => /narrow|correct|scope_differs/i.test(flag))
  ));
  const osbornScopeReviewRows = previewRows.filter((row) => (
    (row.osbornComparisonFlags ?? []).some((flag) => /scope|prefix_headword|narrow|correct/i.test(flag))
  ));
  const osbornNoisySnippetRows = previewRows.filter((row) => Number(row.osbornNoisySnippetCount ?? 0) > 0);

  return {
    sourceBasisCounts: countBy(appliedStatusRows, 'sourceBasis'),
    operationCounts: countBy(appliedStatusRows, 'operation'),
    changeTypeCounts: countBy(appliedStatusRows, 'changeType'),
    osborn: {
      appliedRowsUsingOsborn: osbornRows.length,
      osbornOnlyRows: osbornOnlyRows.length,
      osbornWithAndersonRows: osbornAndAndersonRows.length,
      narrowingOrContradictionRows: osbornNarrowingRows.length,
      scopeReviewFlagRows: osbornScopeReviewRows.length,
      noisySnippetCandidateRows: osbornNoisySnippetRows.length,
      appliedSharePercent: percent(osbornRows.length, appliedStatusRows.length),
    },
    anderson: {
      appliedRowsUsingAnderson: andersonRows.length,
      andersonOnlyRows: andersonOnlyRows.length,
      andersonWithOsbornRows: osbornAndAndersonRows.length,
      appliedSharePercent: percent(andersonRows.length, appliedStatusRows.length),
    },
    growthBias: {
      newFillRows: appliedStatusRows.filter((row) => row.changeType === 'new_fill').length,
      revisionRows: appliedStatusRows.filter((row) => row.changeType === 'revise_existing').length,
      revisionBiasPercent: percent(
        appliedStatusRows.filter((row) => row.changeType === 'revise_existing').length,
        appliedStatusRows.length,
      ),
    },
  };
}

function buildBatch006Readiness({
  appliedDiff,
  validationReport,
  provenanceReport,
  highRiskRows,
  pipelineController,
}) {
  const counts = appliedDiff.counts ?? {};
  const provenanceCounts = provenanceReport.counts ?? {};
  const batchDecision = pipelineController.batchSizeDecision ?? {};
  const highRiskBlockingFailures = highRiskRows.filter((row) => row.status.startsWith('fail')).length;
  const highRiskReviewWarnings = highRiskRows.filter((row) => row.status.startsWith('review_required')).length;
  const hardGateClean = (
    counts.failedWrites === 0
    && counts.runtimeCoreCollisions === 0
    && counts.targetMappingFailures === 0
    && counts.aliasFanOutCount === 0
    && counts.missingBlackProvenanceWhereRequired === 0
    && counts.missingAndersonProvenanceWhereRequired === 0
    && counts.missingOsbornProvenanceWhereRequired === 0
    && validationReport.cleanForExplicitApproval === true
  );
  const provenanceClean = (
    provenanceCounts.registryAuthoredTermsMissingGeneratedProvenance === 0
    && provenanceCounts.registryAuthoredTermsWithGeneratedProvenance === provenanceCounts.registryAuthoredMeaningCount
  );
  const batchSizeClean = (
    batchDecision.nextBatchNumber === 6
    && batchDecision.recommendedNextBatchSize === 50
    && batchDecision.escalationAllowed === false
  );
  const ready = hardGateClean && provenanceClean && highRiskBlockingFailures === 0 && batchSizeClean;

  return {
    status: ready ? 'ready_for_batch_006_draft_only' : 'hold_before_batch_006',
    ready,
    recommendedBatchSize: batchDecision.recommendedNextBatchSize ?? 50,
    escalationAllowed: batchDecision.escalationAllowed ?? false,
    highRiskBlockingFailures,
    highRiskReviewWarnings,
    hardGateClean,
    provenanceClean,
    batchSizeClean,
    nextBatchShouldWaitForAnotherSource: pipelineController.sourceLanes?.nextBatchShouldWaitForAnotherSource ?? false,
    exactNextPrompt: pipelineController.exactNextPrompt
      ?? 'Task: Prepare batch 006 draft-only meaning candidates using the current Black lane plus Anderson and Osborn comparator context where available, with a target batch size of 50. Do not modify the live vocabulary dataset, runtime ontology, concept packets, or existing meaning text; preserve exact-term provenance only and keep this as draft-only preparation.',
  };
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

function buildMarkdown(report) {
  const highRiskRows = report.highRiskSanity.rows.map((row) => [
    row.term,
    row.status,
    row.sourceBasis,
    row.operation,
    row.missingRequired.join(', ') || 'none',
    row.forbiddenHits.join(', ') || 'none',
  ]);
  const feedbackRows = [
    ['applied_rows_using_osborn', report.comparatorFeedback.osborn.appliedRowsUsingOsborn],
    ['osborn_only_rows', report.comparatorFeedback.osborn.osbornOnlyRows],
    ['osborn_with_anderson_rows', report.comparatorFeedback.osborn.osbornWithAndersonRows],
    ['osborn_narrowing_or_contradiction_rows', report.comparatorFeedback.osborn.narrowingOrContradictionRows],
    ['osborn_scope_review_flag_rows', report.comparatorFeedback.osborn.scopeReviewFlagRows],
    ['osborn_noisy_snippet_candidate_rows', report.comparatorFeedback.osborn.noisySnippetCandidateRows],
    ['applied_rows_using_anderson', report.comparatorFeedback.anderson.appliedRowsUsingAnderson],
    ['new_fill_rows', report.comparatorFeedback.growthBias.newFillRows],
    ['revision_rows', report.comparatorFeedback.growthBias.revisionRows],
    ['revision_bias_percent', `${report.comparatorFeedback.growthBias.revisionBiasPercent}%`],
  ];

  return [
    '<!-- markdownlint-disable MD013 -->',
    '',
    '# Comparator V2 Stabilization Readiness',
    '',
    'Status: REPORT_ONLY. No vocabulary meanings, runtime ontology, concept packets, live vocabulary dataset, or generated provenance were modified by this report.',
    '',
    '## Decision',
    '',
    `- Batch 006 readiness: ${report.batch006Readiness.status}`,
    `- Ready: ${report.batch006Readiness.ready}`,
    `- Recommended batch size: ${report.batch006Readiness.recommendedBatchSize}`,
    `- Escalation allowed: ${report.batch006Readiness.escalationAllowed}`,
    `- High-risk blocking failures: ${report.batch006Readiness.highRiskBlockingFailures}`,
    `- High-risk review warnings: ${report.batch006Readiness.highRiskReviewWarnings}`,
    `- Hard gates clean: ${report.batch006Readiness.hardGateClean}`,
    `- Provenance clean: ${report.batch006Readiness.provenanceClean}`,
    '',
    '## High-Risk Sanity Pass',
    '',
    markdownTable(
      ['Term', 'Status', 'Source basis', 'Operation', 'Missing required markers', 'Forbidden hits'],
      highRiskRows,
    ),
    '',
    '## Comparator Feedback Loop',
    '',
    markdownTable(['Metric', 'Value'], feedbackRows),
    '',
    '## Guardrails',
    '',
    `- Upstream exact-target candidate guard: ${report.guardrails.upstreamExactTargetGuard}`,
    `- Rejected/deferred rows included in apply: ${report.guardrails.rejectedOrDeferredRowsIncluded}`,
    `- Alias fan-out count: ${report.guardrails.aliasFanOutCount}`,
    `- Runtime/core collision count: ${report.guardrails.runtimeCoreCollisionCount}`,
    '',
    '## Exact Next Prompt',
    '',
    report.batch006Readiness.exactNextPrompt,
    '',
  ].join('\n');
}

function main() {
  const appliedDiff = readJson(inputPaths.appliedDiff);
  const preview = readJson(inputPaths.preview);
  const validationReport = readJson(inputPaths.validationReport);
  const provenanceReport = readJson(inputPaths.provenanceReport);
  const coverageAudit = readJson(inputPaths.coverageAudit);
  const pipelineController = readJsonIfExists(inputPaths.pipelineController, {});
  const response = buildVocabularyBoundaryResponse();
  const entriesByTerm = new Map(response.entries.map((entry) => [normalizeForComparison(entry.term), entry]));
  const appliedRows = appliedDiff.rows ?? [];
  const previewRows = preview.candidates ?? [];
  const appliedRowsByTerm = new Map(appliedRows.map((row) => [normalizeForComparison(row.term), row]));
  const previewRowsByTerm = new Map(previewRows.map((row) => [normalizeForComparison(row.term), row]));
  const highRiskRows = Object.entries(HIGH_RISK_EXPECTATIONS).map(([term, expectation]) => (
    evaluateHighRiskTerm(term, expectation, entriesByTerm, appliedRowsByTerm, previewRowsByTerm)
  ));
  const comparatorFeedback = buildFeedbackLoop(appliedRows, previewRows);
  const batch006Readiness = buildBatch006Readiness({
    appliedDiff,
    validationReport,
    provenanceReport,
    highRiskRows,
    pipelineController,
  });
  const report = {
    generatedAt: new Date().toISOString(),
    status: 'REPORT_ONLY',
    scope: 'Comparator v2 post-apply stabilization checkpoint and batch 006 readiness',
    boundaryDiscipline: {
      vocabularyMeaningsModified: false,
      liveVocabularyDatasetModified: false,
      runtimeOntologyChanged: false,
      conceptPacketsChanged: false,
      generatedProvenanceModified: false,
      writebackAppliedByThisReport: false,
      aliasFanOutPerformed: false,
    },
    currentSystemState: {
      authoredMeanings: coverageAudit.counts?.authoredMeaningCount ?? null,
      missingMeanings: coverageAudit.counts?.missingMeaningCount ?? null,
      provenanceCoverageComplete: provenanceReport.counts?.registryAuthoredTermsMissingGeneratedProvenance === 0,
      comparatorLanesActive: ['Black', 'Anderson', 'Osborn'],
    },
    comparatorApplyState: {
      candidateCount: appliedDiff.counts?.candidateCount ?? 0,
      appliedRows: appliedDiff.counts?.appliedRows ?? 0,
      rowsChanged: appliedDiff.counts?.rowsChanged ?? 0,
      noOpRows: (appliedDiff.counts?.appliedRows ?? 0) - (appliedDiff.counts?.rowsChanged ?? 0),
      byChangeType: appliedDiff.counts?.byChangeType ?? {},
      bySourceBasis: appliedDiff.counts?.bySourceBasis ?? {},
    },
    highRiskSanity: {
      status: highRiskRows.every((row) => row.status === 'pass')
        ? 'pass'
        : highRiskRows.some((row) => row.status.startsWith('fail'))
          ? 'fail'
          : 'review_required',
      rows: highRiskRows,
    },
    comparatorFeedback,
    guardrails: {
      upstreamExactTargetGuard: 'implemented_in_prepare_comparator_draft_revision_candidates_v2',
      rejectedOrDeferredRowsIncluded: (
        (appliedDiff.counts?.rejectedIncludedCount ?? 0)
        + (appliedDiff.counts?.deferredIncludedCount ?? 0)
      ),
      aliasFanOutCount: appliedDiff.counts?.aliasFanOutCount ?? null,
      runtimeCoreCollisionCount: appliedDiff.counts?.runtimeCoreCollisions ?? null,
      targetMappingFailures: appliedDiff.counts?.targetMappingFailures ?? null,
      provenanceGaps: (
        (appliedDiff.counts?.missingBlackProvenanceWhereRequired ?? 0)
        + (appliedDiff.counts?.missingAndersonProvenanceWhereRequired ?? 0)
        + (appliedDiff.counts?.missingOsbornProvenanceWhereRequired ?? 0)
      ),
    },
    batch006Readiness,
    inputFiles: Object.fromEntries(
      Object.entries(inputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
    outputFiles: Object.fromEntries(
      Object.entries(outputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
  };

  writeJson(outputPaths.json, report);
  fs.writeFileSync(outputPaths.markdown, buildMarkdown(report), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
