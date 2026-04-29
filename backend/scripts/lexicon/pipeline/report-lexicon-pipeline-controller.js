'use strict';

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const draftRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/draft_meanings');
const multiSourceRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/multi_source');
const multiSourceReportsRoot = path.join(multiSourceRoot, 'reports');
const sourceRegistryPath = path.join(multiSourceRoot, 'source_registry/source_registry.json');
const sourceReadinessReportPath = path.join(multiSourceReportsRoot, 'all_source_readiness_report.json');
const recommendedLaneOrderPath = path.join(multiSourceReportsRoot, 'recommended_lane_order.md');
const ocrBacklogPath = path.join(multiSourceRoot, 'ocr_backlog/ocr_backlog.json');
const meaningCoverageAuditPath = path.join(repoRoot, 'docs/boundary/meaning-coverage-audit.json');
const meaningSourcesPath = path.join(
  repoRoot,
  'backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json',
);
const provenanceReportPath = path.join(repoRoot, 'docs/boundary/meaning-source-provenance-report.json');

const outputPaths = Object.freeze({
  json: path.join(repoRoot, 'docs/boundary/lexicon-pipeline-controller-report.json'),
  markdown: path.join(repoRoot, 'docs/boundary/lexicon-pipeline-controller-report.md'),
});

const BATCH_SIZE_LEVELS = Object.freeze([50, 100, 150, 200, 250]);
const BATCH_ESCALATION_RULES = Object.freeze({
  nextBatchFixedAt50: 'batch_006 remains 50',
  batch007MayIncrease: 'if batch_005 and batch_006 are clean, batch_007 may increase to 100',
  batch008MayIncrease: 'if batch_007 is clean, batch_008 may increase to 150',
  batch009MayIncrease: 'if batch_008 is clean, batch_009 may increase to 200',
  max250Rule: 'move to 250 only after 3 clean batches at 100+',
  hardFailureRule: 'downgrade one level on hard-gate failure',
  qualityFailureRule: 'hold current size on quality-gate failure',
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

function percent(numerator, denominator) {
  if (!denominator) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(2));
}

function countArrayFile(filePath) {
  const value = readJsonIfExists(filePath, []);
  return Array.isArray(value) ? value.length : 0;
}

function normalizeCount(...values) {
  return values.find((value) => Number.isFinite(value)) ?? 0;
}

function getBatchIdFromAppliedFile(fileName) {
  return /^batch_(\d{3})_applied_diff\.json$/.exec(fileName)?.[1] ?? null;
}

function findBatchDraftPath(batchId) {
  const prefix = `batch_${batchId}_`;
  return fs.readdirSync(draftRoot)
    .filter((fileName) => fileName.startsWith(prefix) && fileName.endsWith('_drafts.json'))
    .map((fileName) => path.join(draftRoot, fileName))
    .sort()[0] ?? null;
}

function collectCompletedBatchIds() {
  const appliedRoot = path.join(draftRoot, 'writeback_applied');
  if (!fs.existsSync(appliedRoot)) {
    return [];
  }

  return fs.readdirSync(appliedRoot)
    .map(getBatchIdFromAppliedFile)
    .filter(Boolean)
    .sort();
}

function countBatchTermsWithGeneratedProvenance(appliedRows, generatedSources) {
  return appliedRows.filter((row) => (
    row.status === 'APPLIED'
    && Array.isArray(generatedSources.terms?.[row.term])
    && generatedSources.terms[row.term].length > 0
  )).length;
}

function collectBatchStatus(batchId, generatedSources) {
  const numericBatch = Number(batchId);
  const draftPath = findBatchDraftPath(batchId);
  const previewPath = path.join(
    draftRoot,
    'writeback_preview',
    `batch_${batchId}_writeback_validation_report.json`,
  );
  const appliedPath = path.join(
    draftRoot,
    'writeback_applied',
    `batch_${batchId}_applied_diff.json`,
  );
  const approvedPath = path.join(draftRoot, 'review', `approved_batch_${batchId}.json`);
  const revisePath = path.join(draftRoot, 'review', `revise_batch_${batchId}.json`);
  const rejectedPath = path.join(draftRoot, 'review', `rejected_batch_${batchId}.json`);
  const skippedPath = path.join(draftRoot, 'reports', `batch_${batchId}_skipped.json`);

  const drafts = readJsonIfExists(draftPath, []);
  const preview = readJsonIfExists(previewPath, {});
  const applied = readJsonIfExists(appliedPath, {});
  const previewCounts = preview.counts ?? {};
  const appliedCounts = applied.counts ?? {};
  const appliedRows = Array.isArray(applied.rows) ? applied.rows : [];

  const draftCount = Array.isArray(drafts) ? drafts.length : 0;
  const approvedCount = countArrayFile(approvedPath);
  const revisedCount = countArrayFile(revisePath);
  const rejectedCount = countArrayFile(rejectedPath);
  const skippedCount = countArrayFile(skippedPath);
  const candidateCount = normalizeCount(appliedCounts.candidateCount, previewCounts.totalCandidateCount);
  const failedWrites = normalizeCount(appliedCounts.failedWrites);
  const targetMappingFailures = normalizeCount(
    appliedCounts.targetMappingFailures,
    previewCounts.notFoundInTargetDatasetCount,
  );
  const runtimeCollisions = normalizeCount(
    appliedCounts.runtimeCoreCollisions,
    previewCounts.runtimeCoreCollisionCount,
  );
  const aliasFanoutCount = (
    applied.boundaryDiscipline?.aliasFanOutPerformed
    || preview.boundaryDiscipline?.aliasFanOutPerformed
  ) ? 1 : 0;
  const missingProvenanceCount = normalizeCount(
    appliedCounts.missingProvenance,
    appliedCounts.missingBlackProvenance,
    appliedCounts.missingRequiredAndersonProvenance,
    previewCounts.missingProvenanceCount,
    previewCounts.missingBlackProvenanceCount,
    previewCounts.missingRequiredAndersonProvenanceCount,
  );
  const appliedTermsWithProvenance = countBatchTermsWithGeneratedProvenance(appliedRows, generatedSources);
  const provenanceCoverage = percent(appliedTermsWithProvenance, appliedRows.filter((row) => row.status === 'APPLIED').length);
  const failureRate = percent(failedWrites, candidateCount);
  const skipRate = percent(skippedCount, draftCount);
  const revisionRate = percent(revisedCount, draftCount);

  const hardGateChecks = {
    targetMappingFailuresZero: targetMappingFailures === 0,
    runtimeCollisionsZero: runtimeCollisions === 0,
    failedWritesZero: failedWrites === 0,
    aliasFanoutZero: aliasFanoutCount === 0,
    missingProvenanceZero: missingProvenanceCount === 0,
    provenanceCoverageComplete: provenanceCoverage === 100,
  };
  const qualityGateChecks = {
    skipRateAtOrBelow15Percent: skipRate <= 15,
    revisionRateAtOrBelow25Percent: revisionRate <= 25,
    failureRateZero: failureRate === 0,
  };
  const hardGatePassed = Object.values(hardGateChecks).every(Boolean);
  const qualityGatePassed = Object.values(qualityGateChecks).every(Boolean);

  return {
    batchId: `batch_${batchId}`,
    batchNumber: numericBatch,
    status: hardGatePassed && qualityGatePassed ? 'clean' : hardGatePassed ? 'quality_gate_hold' : 'hard_gate_failed',
    hardGatePassed,
    qualityGatePassed,
    draftCount,
    approvedCount,
    revisedCount,
    rejectedCount,
    skippedCount,
    candidateCount,
    rowsChanged: normalizeCount(appliedCounts.rowsChanged),
    sourceBasisCounts: appliedCounts.bySourceBasis ?? previewCounts.bySourceBasis ?? {},
    hardGateMetrics: {
      targetMappingFailures,
      runtimeCollisions,
      failedWrites,
      aliasFanoutCount,
      missingProvenanceCount,
      provenanceCoverage,
    },
    qualityGateMetrics: {
      skipRate,
      revisionRate,
      failureRate,
    },
    hardGateChecks,
    qualityGateChecks,
    inputFiles: {
      drafts: draftPath ? toWindowsPath(draftPath) : null,
      preview: toWindowsPath(previewPath),
      applied: toWindowsPath(appliedPath),
      skipped: toWindowsPath(skippedPath),
    },
  };
}

function downgradeSize(size) {
  const index = BATCH_SIZE_LEVELS.indexOf(size);
  if (index <= 0) {
    return BATCH_SIZE_LEVELS[0];
  }

  return BATCH_SIZE_LEVELS[index - 1];
}

function getRecommendedNextBatchNumber(batchStatuses) {
  return Math.max(...batchStatuses.map((batch) => batch.batchNumber), 0) + 1;
}

function cleanBatch(batchStatuses, batchNumber) {
  return batchStatuses.some((batch) => batch.batchNumber === batchNumber && batch.status === 'clean');
}

function decideNextBatchSize(batchStatuses) {
  const nextBatchNumber = getRecommendedNextBatchNumber(batchStatuses);
  const latestBatch = [...batchStatuses].sort((left, right) => right.batchNumber - left.batchNumber)[0] ?? null;
  const currentSize = latestBatch?.draftCount || 50;

  if (latestBatch?.status === 'hard_gate_failed') {
    return {
      nextBatchNumber,
      recommendedNextBatchSize: downgradeSize(currentSize),
      escalationAllowed: false,
      reason: 'The latest completed batch failed a hard gate, so the controller downgrades one size level.',
    };
  }

  if (latestBatch?.status === 'quality_gate_hold') {
    return {
      nextBatchNumber,
      recommendedNextBatchSize: currentSize,
      escalationAllowed: false,
      reason: 'The latest completed batch passed hard gates but failed a quality gate, so the controller holds the current size.',
    };
  }

  if (nextBatchNumber === 6) {
    return {
      nextBatchNumber,
      recommendedNextBatchSize: 50,
      escalationAllowed: false,
      reason: 'Batch 006 remains at 50; batch 007 may increase to 100 only if both batch 005 and batch 006 are clean.',
    };
  }

  if (nextBatchNumber === 7 && cleanBatch(batchStatuses, 5) && cleanBatch(batchStatuses, 6)) {
    return {
      nextBatchNumber,
      recommendedNextBatchSize: 100,
      escalationAllowed: true,
      reason: 'Batch 005 and batch 006 are clean, so batch 007 may increase to 100.',
    };
  }

  if (nextBatchNumber === 8 && cleanBatch(batchStatuses, 7)) {
    return {
      nextBatchNumber,
      recommendedNextBatchSize: 150,
      escalationAllowed: true,
      reason: 'Batch 007 is clean, so batch 008 may increase to 150.',
    };
  }

  if (nextBatchNumber === 9 && cleanBatch(batchStatuses, 8)) {
    return {
      nextBatchNumber,
      recommendedNextBatchSize: 200,
      escalationAllowed: true,
      reason: 'Batch 008 is clean, so batch 009 may increase to 200.',
    };
  }

  const cleanAt100Plus = batchStatuses.filter((batch) => batch.status === 'clean' && batch.draftCount >= 100).length;
  if (nextBatchNumber >= 10 && cleanAt100Plus >= 3) {
    return {
      nextBatchNumber,
      recommendedNextBatchSize: 250,
      escalationAllowed: true,
      reason: 'At least 3 clean batches at 100+ are complete, so the controller may move to 250.',
    };
  }

  return {
    nextBatchNumber,
    recommendedNextBatchSize: currentSize,
    escalationAllowed: false,
    reason: 'Escalation prerequisites are not yet satisfied, so the controller holds the current size.',
  };
}

function collectQualityReports() {
  const reportRoots = [
    path.join(workspaceRoot, 'vocabulary_reference_lexicons'),
    multiSourceRoot,
  ];
  const qualityReports = [];
  const seen = new Set();

  function walk(directory) {
    if (!fs.existsSync(directory)) {
      return;
    }

    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        return;
      }

      if (!entry.name.endsWith('_quality_report.json') || seen.has(entryPath)) {
        return;
      }

      seen.add(entryPath);
      const report = readJsonIfExists(entryPath, {});
      qualityReports.push({
        file: toWindowsPath(entryPath),
        sourceId: report.source?.sourceId ?? report.sourceId ?? null,
        scope: report.scope ?? null,
        fullExtractionAssessment: report.fullExtractionAssessment ?? null,
        comparatorReadiness: report.comparatorReadiness ?? null,
        segmentationAssessment: report.segmentationAssessment ?? null,
        counts: report.counts ?? {},
      });
    });
  }

  reportRoots.forEach(walk);
  return qualityReports.sort((left, right) => left.file.localeCompare(right.file));
}

function chooseNextSourceProof(sourceRegistry, qualityReports) {
  const proofedOrExtractedSourceIds = new Set(
    qualityReports
      .map((report) => report.sourceId)
      .filter(Boolean),
  );
  const candidates = sourceRegistry.records
    .filter((source) => !source.sourceId.startsWith('black'))
    .filter((source) => source.extractionMode !== 'ocr')
    .filter((source) => source.readinessClass === 'ready_for_direct_text' || source.readinessClass === 'usable_with_tuning')
    .filter((source) => !proofedOrExtractedSourceIds.has(source.sourceId))
    .sort((left, right) => {
      const readinessRank = {
        ready_for_direct_text: 0,
        usable_with_tuning: 1,
      };
      return (readinessRank[left.readinessClass] ?? 9) - (readinessRank[right.readinessClass] ?? 9)
        || left.sourceId.localeCompare(right.sourceId);
    });

  const selected = candidates[0] ?? null;
  if (!selected) {
    return {
      sourceId: null,
      reason: 'No unproofed non-Black direct-text source is available in the registry.',
      parallelOnly: true,
    };
  }

  return {
    sourceId: selected.sourceId,
    sourceTitle: selected.sourceTitle,
    readinessClass: selected.readinessClass,
    sourceQualityTier: selected.sourceQualityTier,
    reason: `${selected.sourceId} is the next unproofed non-Black direct-text comparator candidate; proof it in parallel before any authoring use.`,
    parallelOnly: true,
  };
}

function sourceLaneDisplayName(sourceId) {
  if (sourceId === 'anderson_1889') {
    return 'Anderson';
  }
  if (sourceId === 'osborn_1927') {
    return 'Osborn';
  }
  if (String(sourceId).startsWith('black')) {
    return 'Black';
  }
  return sourceId;
}

function collectSourceLaneDecisions(sourceRegistry, readinessReport, qualityReports, ocrBacklog) {
  const activeSourceLanes = sourceRegistry.records
    .filter((source) => source.readinessStatus === 'active')
    .map((source) => source.sourceId)
    .sort();
  const proofedComparatorIds = new Set(
    qualityReports
      .filter((report) => report.fullExtractionAssessment === 'ready_for_comparator_alignment_use')
      .map((report) => report.sourceId)
      .filter(Boolean),
  );
  const usableComparatorLanes = sourceRegistry.records
    .filter((source) => source.readinessStatus === 'comparator_ready')
    .map((source) => ({
      sourceId: source.sourceId,
      sourceTitle: source.sourceTitle,
      readinessClass: source.readinessClass,
      sourceQualityTier: source.sourceQualityTier,
      fullExtractionReady: proofedComparatorIds.has(source.sourceId),
      laneUse: proofedComparatorIds.has(source.sourceId)
        ? 'exact-term comparator support'
        : 'proof/full-extraction required before authoring use',
    }))
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId));
  const ocrBlockedLanes = (ocrBacklog.sources ?? sourceRegistry.records.filter((source) => source.extractionMode === 'ocr'))
    .map((source) => ({
      sourceId: source.sourceId,
      sourceTitle: source.sourceTitle,
      year: source.year,
      pages: source.pages ?? source.pageCount ?? null,
    }))
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId));
  const nextSourceProof = chooseNextSourceProof(sourceRegistry, qualityReports);
  const readyComparatorLaneNames = usableComparatorLanes
    .filter((source) => source.fullExtractionReady)
    .map((source) => sourceLaneDisplayName(source.sourceId));

  return {
    activeSourceLanes,
    currentAuthoringLane: readyComparatorLaneNames.length > 0
      ? `Black primary lane with ${readyComparatorLaneNames.join(', ')} exact-term comparator context where available`
      : 'Black primary lane with exact-term comparator context where available',
    continueCurrentSourceLanes: true,
    usableComparatorLanes,
    ocrBlockedLanes,
    nextSourceProof,
    nextBatchShouldWaitForAnotherSource: false,
    sourceDecisionNotes: [
      readyComparatorLaneNames.length > 0
        ? `Continue Black + ${readyComparatorLaneNames.join(' + ')} while hard and quality gates remain clean.`
        : 'Continue Black with exact-term comparator context while hard and quality gates remain clean.',
      'Do not block the next batch on unused sources.',
      'Proof another source only in parallel.',
      'Do not promote a new source into authoring until bounded proof, full extraction, and alignment pass are complete.',
      'OCR sources remain blocked until OCR tooling is installed and validated.',
      'Extra sources are exact-term support only for wrong-sense correction or historically narrow terms.',
    ],
    readinessSummary: readinessReport.counts ?? {},
  };
}

function buildExactNextPrompt(decision, sourceLanes) {
  const batchId = String(decision.nextBatchNumber).padStart(3, '0');
  const ordinal = {
    '006': 'sixth',
    '007': 'seventh',
    '008': 'eighth',
    '009': 'ninth',
  }[batchId] ?? `batch_${batchId}`;
  const comparatorContext = sourceLanes.usableComparatorLanes
    .filter((source) => source.fullExtractionReady)
    .map((source) => sourceLaneDisplayName(source.sourceId))
    .join(' and ');
  const comparatorClause = comparatorContext
    ? `${comparatorContext} comparator context where available`
    : 'available exact-term comparator context';

  return `Task: Prepare batch ${batchId} draft-only meaning candidates using the current Black lane plus ${comparatorClause}, with a target batch size of ${decision.recommendedNextBatchSize}. Do not modify the live vocabulary dataset, runtime ontology, concept packets, or existing meaning text; preserve exact-term provenance only and keep this as draft-only preparation. Deliver batch_${batchId}_${ordinal}_${decision.recommendedNextBatchSize}_drafts.json, batch_${batchId}_review.md, batch_${batchId}_skipped.json, and batch_${batchId}_writeback_NOT_APPLIED.json.`;
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? '').replaceAll('|', '\\|')).join(' | ')} |`),
  ].join('\n');
}

function buildMarkdownReport(report) {
  const batchRows = report.batchStatuses.map((batch) => [
    batch.batchId,
    batch.status,
    batch.draftCount,
    batch.skippedCount,
    `${batch.qualityGateMetrics.skipRate}%`,
    batch.revisedCount,
    `${batch.qualityGateMetrics.revisionRate}%`,
    batch.hardGatePassed,
    batch.qualityGatePassed,
  ]);
  const comparatorRows = report.sourceLanes.usableComparatorLanes.map((source) => [
    source.sourceId,
    source.readinessClass,
    source.sourceQualityTier,
    source.fullExtractionReady,
    source.laneUse,
  ]);
  const ocrRows = report.sourceLanes.ocrBlockedLanes.map((source) => [
    source.sourceId,
    source.sourceTitle,
    source.year,
    source.pages,
  ]);

  return [
    '# Lexicon Pipeline Controller Report',
    '',
    'Status: REPORT_ONLY. No vocabulary meanings, runtime ontology, concept packets, live concept meanings, or writeback state were modified.',
    '',
    '## Controller Answer',
    '',
    `- Current completed batch count: ${report.currentCompletedBatchCount}`,
    `- Recommended next batch: batch_${String(report.batchSizeDecision.nextBatchNumber).padStart(3, '0')}`,
    `- Recommended next batch size: ${report.batchSizeDecision.recommendedNextBatchSize}`,
    `- Escalation allowed: ${report.batchSizeDecision.escalationAllowed}`,
    `- Escalation reason: ${report.batchSizeDecision.reason}`,
    `- Active source lanes: ${report.sourceLanes.activeSourceLanes.join(', ')}`,
    `- Recommended next source proof: ${report.sourceLanes.nextSourceProof.sourceId ?? 'none'}`,
    `- Next batch should wait for another source: ${report.sourceLanes.nextBatchShouldWaitForAnotherSource}`,
    `- Writeback/provenance safe to continue: ${report.writebackAndProvenanceSafeToContinue}`,
    '',
    '## Batch Statuses',
    '',
    markdownTable(
      ['Batch', 'Status', 'Drafts', 'Skipped', 'Skip rate', 'Revised', 'Revision rate', 'Hard gates', 'Quality gates'],
      batchRows,
    ),
    '',
    '## Source Lanes',
    '',
    `Current authoring lane: ${report.sourceLanes.currentAuthoringLane}`,
    '',
    '### Usable Comparator Lanes',
    '',
    comparatorRows.length > 0
      ? markdownTable(['Source', 'Readiness', 'Quality tier', 'Full extraction ready', 'Use'], comparatorRows)
      : 'No usable comparator lanes are currently available.',
    '',
    '### OCR-Blocked Lanes',
    '',
    ocrRows.length > 0
      ? markdownTable(['Source', 'Title', 'Year', 'Pages'], ocrRows)
      : 'No OCR-blocked lanes are currently listed.',
    '',
    '## Source Decision Notes',
    '',
    ...report.sourceLanes.sourceDecisionNotes.map((note) => `- ${note}`),
    '',
    '## Hard Gates',
    '',
    ...Object.entries(report.aggregateHardGateStatus).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Quality Gates',
    '',
    ...Object.entries(report.aggregateQualityGateStatus).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Exact Next Prompt',
    '',
    report.exactNextPrompt,
    '',
  ].join('\n');
}

function main() {
  const generatedSources = readJsonIfExists(meaningSourcesPath, { terms: {} });
  const provenanceReport = readJsonIfExists(provenanceReportPath, { counts: {} });
  const sourceRegistry = readJson(sourceRegistryPath);
  const readinessReport = readJsonIfExists(sourceReadinessReportPath, {});
  const ocrBacklog = readJsonIfExists(ocrBacklogPath, { sources: [] });
  const qualityReports = collectQualityReports();
  const completedBatchIds = collectCompletedBatchIds();
  const batchStatuses = completedBatchIds.map((batchId) => collectBatchStatus(batchId, generatedSources));
  const batchSizeDecision = decideNextBatchSize(batchStatuses);
  const sourceLanes = collectSourceLaneDecisions(sourceRegistry, readinessReport, qualityReports, ocrBacklog);
  const allHardGatesPassed = batchStatuses.every((batch) => batch.hardGatePassed);
  const latestBatch = [...batchStatuses].sort((left, right) => right.batchNumber - left.batchNumber)[0] ?? null;
  const provenanceCoverage = percent(
    provenanceReport.counts?.registryAuthoredTermsWithGeneratedProvenance ?? 0,
    provenanceReport.counts?.registryAuthoredMeaningCount ?? 0,
  );
  const aggregateHardGateStatus = {
    allCompletedBatchesHardGatePassed: allHardGatesPassed,
    latestBatchHardGatePassed: latestBatch?.hardGatePassed ?? false,
    provenanceCoverage,
    provenanceCoverageComplete: provenanceCoverage === 100,
  };
  const aggregateQualityGateStatus = {
    allCompletedBatchesQualityGatePassed: batchStatuses.every((batch) => batch.qualityGatePassed),
    latestBatchQualityGatePassed: latestBatch?.qualityGatePassed ?? false,
    latestBatchSkipRate: latestBatch?.qualityGateMetrics.skipRate ?? null,
    latestBatchRevisionRate: latestBatch?.qualityGateMetrics.revisionRate ?? null,
    latestBatchFailureRate: latestBatch?.qualityGateMetrics.failureRate ?? null,
  };
  const writebackAndProvenanceSafeToContinue = (
    latestBatch?.hardGatePassed === true
    && provenanceCoverage === 100
    && (provenanceReport.counts?.registryAuthoredTermsMissingGeneratedProvenance ?? 1) === 0
  );
  const exactNextPrompt = buildExactNextPrompt(batchSizeDecision, sourceLanes);
  const report = {
    generatedAt: new Date().toISOString(),
    status: 'REPORT_ONLY',
    boundaryDiscipline: {
      vocabularyMeaningsModified: false,
      runtimeOntologyChanged: false,
      conceptPacketsChanged: false,
      writebackApplied: false,
    },
    controllerRules: {
      batchSize: BATCH_ESCALATION_RULES,
      hardGates: [
        'target_mapping_failures == 0',
        'runtime_collisions == 0',
        'failed_writes == 0',
        'alias_fanout_count == 0',
        'missing_provenance_count == 0',
        'provenance_coverage == 100%',
      ],
      qualityGates: [
        'skip_rate <= 15%',
        'revision_rate <= 25%',
        'failure_rate == 0%',
      ],
    },
    currentCompletedBatchCount: batchStatuses.length,
    batchStatuses,
    batchSizeDecision,
    aggregateHardGateStatus,
    aggregateQualityGateStatus,
    sourceLanes,
    writebackAndProvenanceSafeToContinue,
    qualityReports,
    sourceFiles: {
      meaningCoverageAudit: toWindowsPath(meaningCoverageAuditPath),
      meaningSources: toWindowsPath(meaningSourcesPath),
      sourceRegistry: toWindowsPath(sourceRegistryPath),
      sourceReadinessReport: toWindowsPath(sourceReadinessReportPath),
      recommendedLaneOrder: toWindowsPath(recommendedLaneOrderPath),
      ocrBacklog: toWindowsPath(ocrBacklogPath),
      provenanceReport: toWindowsPath(provenanceReportPath),
    },
    outputFiles: Object.fromEntries(
      Object.entries(outputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
    exactNextPrompt,
  };

  writeJson(outputPaths.json, report);
  fs.writeFileSync(outputPaths.markdown, buildMarkdownReport(report), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
