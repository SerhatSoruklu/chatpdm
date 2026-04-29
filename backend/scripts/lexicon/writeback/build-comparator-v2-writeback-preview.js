'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  DETAIL_BACKED_CONCEPT_IDS,
  LIVE_CONCEPT_IDS,
  REJECTED_CONCEPT_IDS,
  VISIBLE_ONLY_PUBLIC_CONCEPT_IDS,
} = require('../../../src/modules/concepts/admission-state');
const {
  buildVocabularyBoundaryResponse,
} = require('../../../src/modules/legal-vocabulary/vocabulary-boundary');

const repoRoot = path.resolve(__dirname, '../../../..');
const workspaceRoot = '/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons';
const multiSourceReportsRoot = path.join(
  workspaceRoot,
  'vocabulary_reference_lexicons/multi_source/reports',
);

const datasetPath = path.join(repoRoot, 'data/legal-vocabulary/legal-vocabulary-dataset.txt');
const semanticOverrideTargetPath = path.join(
  repoRoot,
  'backend/src/modules/legal-vocabulary/vocabulary-boundary.js',
);
const meaningSourcesPath = path.join(
  repoRoot,
  'backend/src/modules/legal-vocabulary/vocabulary-meaning-sources.generated.json',
);

const inputPaths = Object.freeze({
  approved: path.join(multiSourceReportsRoot, 'comparator_draft_revision_v2_approved.json'),
  revise: path.join(multiSourceReportsRoot, 'comparator_draft_revision_v2_revise.json'),
  rejected: path.join(multiSourceReportsRoot, 'comparator_draft_revision_v2_rejected.json'),
  deferred: path.join(multiSourceReportsRoot, 'comparator_draft_revision_deferred_v2.json'),
  dataset: datasetPath,
  semanticOverrideTarget: semanticOverrideTargetPath,
  meaningSources: meaningSourcesPath,
});

const outputPaths = Object.freeze({
  previewJson: path.join(multiSourceReportsRoot, 'comparator_v2_writeback_preview_NOT_APPLIED.json'),
  diffMarkdown: path.join(multiSourceReportsRoot, 'comparator_v2_writeback_diff_preview.md'),
  validationReportJson: path.join(multiSourceReportsRoot, 'comparator_v2_writeback_validation_report.json'),
});

const HEADER_TO_CLASSIFICATION = Object.freeze({
  'CORE / GOVERNANCE': 'unknown_structure',
  'AUTHORITY / VALIDITY / INSTITUTIONAL STATUS': 'derived',
  'POWER / FORCE / CONTROL': 'derived',
  'DUTY / OBLIGATION / CONSTRAINT': 'derived',
  'FAILURE / BREACH / NONCOMPLIANCE': 'derived',
  'RESPONSIBILITY / ATTRIBUTION / LIABILITY': 'derived',
  'LAW / RULE / SOURCES': 'derived',
  'PROCEDURE / ADJUDICATION': 'procedural',
  'REMEDIES / RESPONSES / OUTCOMES': 'procedural',
  'CONTRACT / AGREEMENT / CONSENSUS': 'derived',
  'PROPERTY / TITLE / POSSESSION': 'carrier',
  'COMMERCE / FINANCE / ALLOCATION': 'carrier',
  'CRIMINAL / PUBLIC ORDER': 'derived',
  'DEFENCES / JUSTIFICATIONS / EXCUSES': 'derived',
  'EVIDENCE / PROOF / EPISTEMIC': 'procedural',
  'STATUS / PERSON / RELATION': 'carrier',
  'LABOR / ORGANIZATIONAL / ASSOCIATIONAL': 'carrier',
  'CONSTITUTIONAL / POLITICAL': 'derived',
  'META / STRESS / EDGE TERMS': 'unknown_structure',
});

const EXPLICIT_CLASSIFICATION_OVERRIDES = Object.freeze({
  claim: 'rejected_candidate',
  defeasibility: 'rejected_candidate',
  enforcement: 'rejected_candidate',
  jurisdiction: 'rejected_candidate',
  liability: 'rejected_candidate',
  obligation: 'rejected_candidate',
});

function toWindowsPath(filePath) {
  if (filePath.startsWith('/mnt/c/')) {
    return `C:\\${filePath.slice('/mnt/c/'.length).replaceAll('/', '\\')}`;
  }

  return filePath;
}

function toRepoRelativePath(filePath) {
  return path.relative(repoRoot, filePath);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

function normalizeFamily(value) {
  return String(value ?? '')
    .toLowerCase()
    .split('/')
    .map((segment) => segment.trim().replace(/\s+/g, ' '))
    .join(' / ');
}

function normalizeSurface(value) {
  return String(value ?? '').toLowerCase().replace(/[_-]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function parseHeader(line) {
  const match = /^\[(.+)]$/.exec(line);
  return match ? match[1] : null;
}

function buildDatasetTargetIndex() {
  const lines = fs.readFileSync(datasetPath, 'utf8').split(/\r?\n/);
  const targetsByNormalizedTerm = new Map();
  let activeHeader = null;
  let activeClassification = null;

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();
    if (!trimmed) {
      return;
    }

    const header = parseHeader(trimmed);
    if (header) {
      activeHeader = header;
      activeClassification = HEADER_TO_CLASSIFICATION[header] ?? null;
      return;
    }

    if (!activeHeader || !activeClassification) {
      return;
    }

    const normalized = normalizeForComparison(trimmed);
    const forms = new Set([normalized]);
    if (trimmed.includes('_')) {
      forms.add(normalizeForComparison(trimmed.replaceAll('_', ' ')));
    }

    forms.forEach((form) => {
      if (!targetsByNormalizedTerm.has(form)) {
        targetsByNormalizedTerm.set(form, []);
      }
      targetsByNormalizedTerm.get(form).push({
        datasetPath: toRepoRelativePath(datasetPath),
        datasetWindowsPath: toWindowsPath(datasetPath),
        lineNumber,
        rawDatasetTerm: trimmed,
        familyHeader: activeHeader,
        classification: EXPLICIT_CLASSIFICATION_OVERRIDES[normalized.replaceAll(' ', '_')]
          ?? EXPLICIT_CLASSIFICATION_OVERRIDES[normalized]
          ?? activeClassification,
      });
    });
  });

  return targetsByNormalizedTerm;
}

function buildCurrentRegistryEntryMap() {
  const response = buildVocabularyBoundaryResponse();
  return new Map(response.entries.map((entry) => [normalizeForComparison(entry.term), entry]));
}

function loadGeneratedMeaningSourcesByTerm() {
  if (!fs.existsSync(meaningSourcesPath)) {
    return new Map();
  }

  const payload = readJson(meaningSourcesPath);
  return new Map(
    Object.entries(payload.terms ?? {}).map(([term, records]) => [
      normalizeForComparison(term),
      Array.isArray(records) ? records : [],
    ]),
  );
}

function runtimeCollisionTypes(normalizedTerm) {
  const types = [];
  [
    ['live_concept', LIVE_CONCEPT_IDS],
    ['visible_only_public_concept', VISIBLE_ONLY_PUBLIC_CONCEPT_IDS],
    ['rejected_concept', REJECTED_CONCEPT_IDS],
    ['detail_backed_concept', DETAIL_BACKED_CONCEPT_IDS],
  ].forEach(([label, ids]) => {
    if (ids.includes(normalizedTerm)) {
      types.push(label);
    }
  });

  return types;
}

function chooseReviewedTarget(record, targets) {
  const familyMatches = targets.filter((target) => (
    normalizeFamily(target.familyHeader) === normalizeFamily(record.family)
    && target.classification === record.bucket
  ));
  const exactSurfaceMatches = familyMatches.filter((target) => (
    normalizeSurface(target.rawDatasetTerm) === normalizeSurface(record.term)
  ));

  if (exactSurfaceMatches.length === 1) {
    return {
      selectedTarget: exactSurfaceMatches[0],
      targetDatasetMappings: exactSurfaceMatches,
      alternateDatasetMappings: targets.filter((target) => target !== exactSurfaceMatches[0]),
    };
  }

  if (familyMatches.length === 1) {
    return {
      selectedTarget: familyMatches[0],
      targetDatasetMappings: familyMatches,
      alternateDatasetMappings: targets.filter((target) => target !== familyMatches[0]),
    };
  }

  return {
    selectedTarget: null,
    targetDatasetMappings: familyMatches,
    alternateDatasetMappings: targets.filter((target) => !familyMatches.includes(target)),
  };
}

function sourceLooksLikeBlack(reference) {
  const sourceId = String(reference.sourceId ?? '').toLowerCase();
  const sourceTitle = String(reference.sourceTitle ?? '').toLowerCase();
  return sourceId.includes('black') || sourceTitle.includes('black');
}

function compactGeneratedReference(reference) {
  return {
    sourceId: reference.sourceId,
    sourceTitle: reference.sourceTitle,
    year: reference.year,
    volume: reference.volume ?? null,
    sourceFile: reference.sourceFile ?? null,
    page: reference.page,
    lineNumber: reference.lineNumber ?? null,
    headword: reference.headword ?? null,
    referenceRole: reference.referenceRole ?? 'supporting_lexicon_reference',
    supportNote: reference.supportNote,
  };
}

function mergeSourceProvenance(record, generatedMeaningSourcesByTerm) {
  const explicitPointers = record.sourceProvenancePointers ?? {};
  const generatedSources = generatedMeaningSourcesByTerm.get(record.normalizedTerm) ?? [];
  const generatedBlack = generatedSources
    .filter(sourceLooksLikeBlack)
    .map(compactGeneratedReference);

  return {
    black: (explicitPointers.black?.length ? explicitPointers.black : generatedBlack),
    anderson: explicitPointers.anderson ?? [],
    osborn: explicitPointers.osborn ?? [],
  };
}

function proposedMeaning(record) {
  return record.revisedMeaningInLaw ?? record.draftMeaningInLaw;
}

function buildCandidates() {
  const approved = readJson(inputPaths.approved);
  const revise = readJson(inputPaths.revise);
  const rejected = readJson(inputPaths.rejected);
  const deferred = readJson(inputPaths.deferred);
  const rejectedTerms = new Set(rejected.map((record) => normalizeForComparison(record.term)));
  const deferredTerms = new Set(deferred.map((record) => normalizeForComparison(record.term)));
  const targetIndex = buildDatasetTargetIndex();
  const registryEntriesByTerm = buildCurrentRegistryEntryMap();
  const generatedMeaningSourcesByTerm = loadGeneratedMeaningSourcesByTerm();

  const selected = [
    ...approved.map((record) => ({ ...record, reviewDecisionSource: 'approved' })),
    ...revise.map((record) => ({ ...record, reviewDecisionSource: 'revised' })),
  ].sort((left, right) => left.term.localeCompare(right.term));

  return selected.map((record) => {
    const normalizedTerm = normalizeForComparison(record.term);
    const targets = targetIndex.get(normalizedTerm) ?? [];
    const targetChoice = chooseReviewedTarget(record, targets);
    const registryEntry = registryEntriesByTerm.get(normalizedTerm) ?? null;
    const currentMeaningInLaw = registryEntry?.meaningInLaw ?? null;
    const sourceProvenancePointers = mergeSourceProvenance(
      { ...record, normalizedTerm },
      generatedMeaningSourcesByTerm,
    );
    const proposedMeaningInLaw = proposedMeaning(record);
    const changeType = currentMeaningInLaw ? 'revise_existing' : 'new_fill';

    return {
      term: record.term,
      normalizedTerm,
      targetDatasetIdentifier: targetChoice.selectedTarget
        ? `${targetChoice.selectedTarget.datasetPath}:${targetChoice.selectedTarget.lineNumber}`
        : null,
      selectedTargetDatasetMapping: targetChoice.selectedTarget,
      targetDatasetMappings: targetChoice.targetDatasetMappings,
      alternateDatasetMappings: targetChoice.alternateDatasetMappings,
      targetMeaningSourcePath: toRepoRelativePath(semanticOverrideTargetPath),
      targetMeaningSourceWindowsPath: toWindowsPath(semanticOverrideTargetPath),
      currentMeaningInLaw,
      proposedMeaningInLaw,
      changeType,
      comparatorDecisionType: record.comparatorDecisionType,
      sourceBasis: record.sourceBasis,
      family: record.family,
      bucket: record.bucket,
      riskTier: record.riskTier,
      reviewDecisionSource: record.reviewDecisionSource,
      reviewDecision: record.reviewDecision,
      reviewReason: record.reviewReason,
      reviewConfidence: record.confidence,
      blackSupportSummary: record.blackSupportSummary,
      andersonSupportSummary: record.andersonSupportSummary,
      osbornSupportSummary: record.osbornSupportSummary,
      sourceProvenancePointers,
      sourceProvenanceDerivation: {
        black: sourceProvenancePointers.black.length > (record.sourceProvenancePointers?.black?.length ?? 0)
          ? 'generated_meaning_sources_exact_term'
          : 'review_record',
        anderson: 'review_record',
        osborn: 'review_record',
      },
      osbornComparisonFlags: record.osbornComparisonFlags,
      osbornNoisySnippetCount: record.osbornNoisySnippetCount,
      osbornNoisySnippetsExcludedFromWording: record.osbornNoisySnippetsExcludedFromWording,
      aliasCaution: record.aliasCaution,
      source: 'multi_source_comparator_v2_review',
      status: 'NOT_APPLIED',
      rejectedTermLeak: rejectedTerms.has(normalizedTerm),
      deferredTermLeak: deferredTerms.has(normalizedTerm),
      runtimeCollisionTypes: runtimeCollisionTypes(normalizedTerm),
      currentMeaningExpectation: record.comparatorDecisionType === 'revision_review'
        ? 'expected_non_empty'
        : 'expected_empty',
      currentMeaningExpectationMet: record.comparatorDecisionType === 'revision_review'
        ? Boolean(currentMeaningInLaw)
        : !currentMeaningInLaw,
      artifactCurrentMeaning: record.currentMeaning,
      artifactCurrentMeaningMatchesRegistry: (record.currentMeaning ?? null) === currentMeaningInLaw,
      aliasFanOutPerformed: false,
      exactTargetRowOnly: targetChoice.selectedTarget ? targetChoice.targetDatasetMappings.length === 1 : false,
    };
  });
}

function countBy(records, key) {
  return records.reduce((counts, record) => {
    const value = record[key] ?? 'unknown';
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function requiredSourceLanes(candidate) {
  const lanes = [];
  if (candidate.changeType === 'revise_existing' || candidate.sourceProvenancePointers.black.length > 0) {
    lanes.push('black');
  }
  if (candidate.sourceBasis.includes('anderson')) {
    lanes.push('anderson');
  }
  if (candidate.sourceBasis.includes('osborn')) {
    lanes.push('osborn');
  }
  return lanes;
}

function hasMissingRequiredSource(candidate, lane) {
  return requiredSourceLanes(candidate).includes(lane)
    && candidate.sourceProvenancePointers[lane].length === 0;
}

function buildValidationReport(candidates) {
  const rejectedIncluded = candidates.filter((candidate) => candidate.rejectedTermLeak);
  const deferredIncluded = candidates.filter((candidate) => candidate.deferredTermLeak);
  const notFound = candidates.filter((candidate) => !candidate.selectedTargetDatasetMapping);
  const duplicateMappings = candidates.filter((candidate) => candidate.targetDatasetMappings.length > 1);
  const runtimeCollisions = candidates.filter((candidate) => candidate.runtimeCollisionTypes.length > 0);
  const currentMeaningExpectationFailures = candidates.filter((candidate) => !candidate.currentMeaningExpectationMet);
  const artifactCurrentMeaningMismatches = candidates.filter((candidate) => !candidate.artifactCurrentMeaningMatchesRegistry);
  const missingBlack = candidates.filter((candidate) => hasMissingRequiredSource(candidate, 'black'));
  const missingAnderson = candidates.filter((candidate) => hasMissingRequiredSource(candidate, 'anderson'));
  const missingOsborn = candidates.filter((candidate) => hasMissingRequiredSource(candidate, 'osborn'));
  const aliasFanOut = candidates.filter((candidate) => candidate.aliasFanOutPerformed);
  const nonExactTargetRows = candidates.filter((candidate) => !candidate.exactTargetRowOnly);

  return {
    generatedAt: new Date().toISOString(),
    scope: 'multi-source comparator v2 writeback preview only',
    status: 'NOT_APPLIED',
    boundaryDiscipline: {
      liveVocabularyDatasetModified: false,
      vocabularyBoundarySourceModified: false,
      vocabularyMeaningSourcesModified: false,
      runtimeOntologyChanged: false,
      conceptPacketsTouched: false,
      liveConceptMeaningsTouched: false,
      existingMeaningTextChanged: false,
      writebackApplied: false,
      aliasFanOutPerformed: false,
      exactTermProvenanceOnly: true,
      rejectedTermsIncluded: rejectedIncluded.length,
      deferredTermsIncluded: deferredIncluded.length,
    },
    counts: {
      totalCandidateCount: candidates.length,
      approvedIncludedCount: candidates.filter((candidate) => candidate.reviewDecisionSource === 'approved').length,
      revisedIncludedCount: candidates.filter((candidate) => candidate.reviewDecisionSource === 'revised').length,
      rejectedIncludedCount: rejectedIncluded.length,
      deferredIncludedCount: deferredIncluded.length,
      targetMappingFailureCount: notFound.length,
      duplicateTargetMappingCount: duplicateMappings.length,
      nonExactTargetRowCount: nonExactTargetRows.length,
      runtimeCoreCollisionCount: runtimeCollisions.length,
      currentMeaningExpectationFailureCount: currentMeaningExpectationFailures.length,
      artifactCurrentMeaningMismatchCount: artifactCurrentMeaningMismatches.length,
      missingBlackProvenanceWhereRequiredCount: missingBlack.length,
      missingAndersonProvenanceWhereRequiredCount: missingAnderson.length,
      missingOsbornProvenanceWhereRequiredCount: missingOsborn.length,
      aliasFanOutCount: aliasFanOut.length,
      byChangeType: countBy(candidates, 'changeType'),
      byComparatorDecisionType: countBy(candidates, 'comparatorDecisionType'),
      bySourceBasis: countBy(candidates, 'sourceBasis'),
    },
    termsNotFoundInTargetDataset: notFound.map((candidate) => candidate.term),
    duplicateTargetMappings: duplicateMappings.map((candidate) => ({
      term: candidate.term,
      mappings: candidate.targetDatasetMappings,
    })),
    nonExactTargetRows: nonExactTargetRows.map((candidate) => ({
      term: candidate.term,
      selectedMapping: candidate.selectedTargetDatasetMapping,
      targetDatasetMappings: candidate.targetDatasetMappings,
    })),
    runtimeCoreCollisions: runtimeCollisions.map((candidate) => ({
      term: candidate.term,
      runtimeCollisionTypes: candidate.runtimeCollisionTypes,
    })),
    currentMeaningExpectationFailures: currentMeaningExpectationFailures.map((candidate) => ({
      term: candidate.term,
      comparatorDecisionType: candidate.comparatorDecisionType,
      expected: candidate.currentMeaningExpectation,
      currentMeaningInLaw: candidate.currentMeaningInLaw,
    })),
    artifactCurrentMeaningMismatches: artifactCurrentMeaningMismatches.map((candidate) => ({
      term: candidate.term,
      artifactCurrentMeaning: candidate.artifactCurrentMeaning,
      registryCurrentMeaning: candidate.currentMeaningInLaw,
    })),
    missingBlackProvenanceWhereRequired: missingBlack.map((candidate) => candidate.term),
    missingAndersonProvenanceWhereRequired: missingAnderson.map((candidate) => candidate.term),
    missingOsbornProvenanceWhereRequired: missingOsborn.map((candidate) => candidate.term),
    rejectedIncludedTerms: rejectedIncluded.map((candidate) => candidate.term),
    deferredIncludedTerms: deferredIncluded.map((candidate) => candidate.term),
    cleanForExplicitApproval: (
      rejectedIncluded.length === 0
      && deferredIncluded.length === 0
      && notFound.length === 0
      && duplicateMappings.length === 0
      && nonExactTargetRows.length === 0
      && runtimeCollisions.length === 0
      && currentMeaningExpectationFailures.length === 0
      && missingBlack.length === 0
      && missingAnderson.length === 0
      && missingOsborn.length === 0
      && aliasFanOut.length === 0
    ),
    inputFiles: Object.fromEntries(
      Object.entries(inputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
    outputFiles: Object.fromEntries(
      Object.entries(outputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
  };
}

function escapeMarkdownCell(value) {
  return String(value ?? 'NULL').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escapeMarkdownCell).join(' | ')} |`),
  ].join('\n');
}

function buildDiffMarkdown(candidates, validationReport) {
  const rows = candidates.map((candidate) => [
    candidate.term,
    candidate.comparatorDecisionType,
    candidate.changeType,
    candidate.sourceBasis,
    candidate.reviewDecisionSource,
    candidate.currentMeaningInLaw ?? 'NULL',
    candidate.proposedMeaningInLaw,
    candidate.targetDatasetIdentifier ?? 'NOT_FOUND_OR_DUPLICATE',
  ]);

  return [
    '<!-- markdownlint-disable MD013 -->',
    '',
    '# Comparator V2 Writeback Preview',
    '',
    'Status: NOT_APPLIED. This preview does not modify the live vocabulary dataset, vocabulary boundary source, generated meaning-source storage, runtime ontology, concept packets, or live concept meanings.',
    '',
    '## Validation',
    '',
    `- Total candidates: ${validationReport.counts.totalCandidateCount}`,
    `- New fills: ${validationReport.counts.byChangeType.new_fill ?? 0}`,
    `- Revisions: ${validationReport.counts.byChangeType.revise_existing ?? 0}`,
    `- Approved included: ${validationReport.counts.approvedIncludedCount}`,
    `- Revised included: ${validationReport.counts.revisedIncludedCount}`,
    `- Rejected included: ${validationReport.counts.rejectedIncludedCount}`,
    `- Deferred included: ${validationReport.counts.deferredIncludedCount}`,
    `- Target mapping failures: ${validationReport.counts.targetMappingFailureCount}`,
    `- Runtime/core collisions: ${validationReport.counts.runtimeCoreCollisionCount}`,
    `- Current meaning expectation failures: ${validationReport.counts.currentMeaningExpectationFailureCount}`,
    `- Missing Black provenance where required: ${validationReport.counts.missingBlackProvenanceWhereRequiredCount}`,
    `- Missing Anderson provenance where required: ${validationReport.counts.missingAndersonProvenanceWhereRequiredCount}`,
    `- Missing Osborn provenance where required: ${validationReport.counts.missingOsbornProvenanceWhereRequiredCount}`,
    `- Alias fan-out: ${validationReport.counts.aliasFanOutCount}`,
    `- Clean for explicit approval: ${validationReport.cleanForExplicitApproval}`,
    '',
    '## Diff Preview',
    '',
    markdownTable(
      ['Term', 'Comparator type', 'Change type', 'Source basis', 'Decision source', 'Current meaning', 'Proposed meaning', 'Target row'],
      rows,
    ),
    '',
    '## Next Step',
    '',
    'If explicitly approved, apply only these NOT_APPLIED comparator v2 candidates to the vocabulary boundary meaning source, preserve exact source provenance, then rerun boundary audit, vocabulary boundary tests, and boundary contract validation.',
    '',
  ].join('\n');
}

function main() {
  const candidates = buildCandidates();
  const validationReport = buildValidationReport(candidates);

  writeJson(outputPaths.previewJson, {
    generatedAt: validationReport.generatedAt,
    status: 'NOT_APPLIED',
    source: 'multi_source_comparator_v2_review',
    candidates,
  });
  writeJson(outputPaths.validationReportJson, validationReport);
  fs.writeFileSync(outputPaths.diffMarkdown, buildDiffMarkdown(candidates, validationReport), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
