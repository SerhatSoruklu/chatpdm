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

const inputPaths = Object.freeze({
  approved: path.join(multiSourceReportsRoot, 'comparator_draft_revision_approved.json'),
  revise: path.join(multiSourceReportsRoot, 'comparator_draft_revision_revise.json'),
  rejected: path.join(multiSourceReportsRoot, 'comparator_draft_revision_rejected.json'),
  dataset: datasetPath,
  semanticOverrideTarget: semanticOverrideTargetPath,
});

const outputPaths = Object.freeze({
  previewJson: path.join(multiSourceReportsRoot, 'comparator_writeback_preview_NOT_APPLIED.json'),
  diffMarkdown: path.join(multiSourceReportsRoot, 'comparator_writeback_diff_preview.md'),
  validationReportJson: path.join(multiSourceReportsRoot, 'comparator_writeback_validation_report.json'),
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
  return value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[.,;:]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeFamily(value) {
  return value
    .toLowerCase()
    .split('/')
    .map((segment) => segment.trim().replace(/\s+/g, ' '))
    .join(' / ');
}

function normalizeSurface(value) {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
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

function buildCandidates() {
  const approved = readJson(inputPaths.approved);
  const revise = readJson(inputPaths.revise);
  const rejected = readJson(inputPaths.rejected);
  const rejectedTerms = new Set(rejected.map((record) => normalizeForComparison(record.term)));
  const targetIndex = buildDatasetTargetIndex();
  const registryEntriesByTerm = buildCurrentRegistryEntryMap();

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
    const proposedMeaningInLaw = record.revisedMeaningInLaw ?? record.draftMeaningInLaw;
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
      family: record.family,
      bucket: record.bucket,
      riskTier: record.riskTier,
      reviewDecisionSource: record.reviewDecisionSource,
      reviewDecision: record.reviewDecision,
      reviewReason: record.reviewReason,
      reviewConfidence: record.confidence,
      blackSupportSummary: record.blackSupportSummary,
      andersonSupportSummary: record.andersonSupportSummary,
      sourceProvenancePointers: record.sourceProvenancePointers,
      aliasCaution: record.aliasCaution,
      source: 'multi_source_comparator_review',
      status: 'NOT_APPLIED',
      rejectedTermLeak: rejectedTerms.has(normalizedTerm),
      runtimeCollisionTypes: runtimeCollisionTypes(normalizedTerm),
      currentMeaningExpectation: record.comparatorDecisionType === 'revision_review'
        ? 'expected_non_empty'
        : 'expected_empty',
      currentMeaningExpectationMet: record.comparatorDecisionType === 'revision_review'
        ? Boolean(currentMeaningInLaw)
        : !currentMeaningInLaw,
      artifactCurrentMeaning: record.currentMeaning,
      artifactCurrentMeaningMatchesRegistry: (record.currentMeaning ?? null) === currentMeaningInLaw,
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

function buildValidationReport(candidates) {
  const rejectedIncluded = candidates.filter((candidate) => candidate.rejectedTermLeak);
  const notFound = candidates.filter((candidate) => !candidate.selectedTargetDatasetMapping);
  const duplicateMappings = candidates.filter((candidate) => candidate.targetDatasetMappings.length > 1);
  const alternateMappings = candidates.filter((candidate) => candidate.alternateDatasetMappings.length > 0);
  const runtimeCollisions = candidates.filter((candidate) => candidate.runtimeCollisionTypes.length > 0);
  const currentMeaningExpectationFailures = candidates.filter((candidate) => !candidate.currentMeaningExpectationMet);
  const artifactCurrentMeaningMismatches = candidates.filter((candidate) => !candidate.artifactCurrentMeaningMatchesRegistry);
  const missingProvenance = candidates.filter((candidate) => (
    !candidate.sourceProvenancePointers
    || !Array.isArray(candidate.sourceProvenancePointers.anderson)
    || candidate.sourceProvenancePointers.anderson.length === 0
  ));

  return {
    generatedAt: new Date().toISOString(),
    scope: 'multi-source comparator writeback preview only',
    status: 'NOT_APPLIED',
    boundaryDiscipline: {
      liveVocabularyDatasetModified: false,
      runtimeOntologyChanged: false,
      conceptPacketsTouched: false,
      liveConceptMeaningsTouched: false,
      existingMeaningTextChanged: false,
      writebackApplied: false,
      aliasFanOutPerformed: false,
      exactTermProvenanceOnly: true,
      rejectedTermsIncluded: rejectedIncluded.length,
    },
    counts: {
      totalCandidateCount: candidates.length,
      approvedIncludedCount: candidates.filter((candidate) => candidate.reviewDecisionSource === 'approved').length,
      revisedIncludedCount: candidates.filter((candidate) => candidate.reviewDecisionSource === 'revised').length,
      rejectedIncludedCount: rejectedIncluded.length,
      notFoundInTargetDatasetCount: notFound.length,
      duplicateTargetMappingCount: duplicateMappings.length,
      alternateDatasetMappingCount: alternateMappings.length,
      runtimeCoreCollisionCount: runtimeCollisions.length,
      currentMeaningExpectationFailureCount: currentMeaningExpectationFailures.length,
      artifactCurrentMeaningMismatchCount: artifactCurrentMeaningMismatches.length,
      missingAndersonProvenanceCount: missingProvenance.length,
      byChangeType: countBy(candidates, 'changeType'),
      byComparatorDecisionType: countBy(candidates, 'comparatorDecisionType'),
    },
    termsNotFoundInTargetDataset: notFound.map((candidate) => candidate.term),
    duplicateTargetMappings: duplicateMappings.map((candidate) => ({
      term: candidate.term,
      mappings: candidate.targetDatasetMappings,
    })),
    alternateDatasetMappings: alternateMappings.map((candidate) => ({
      term: candidate.term,
      selectedMapping: candidate.selectedTargetDatasetMapping,
      alternateMappings: candidate.alternateDatasetMappings,
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
    missingAndersonProvenance: missingProvenance.map((candidate) => candidate.term),
    cleanForExplicitApproval: (
      rejectedIncluded.length === 0
      && notFound.length === 0
      && duplicateMappings.length === 0
      && runtimeCollisions.length === 0
      && currentMeaningExpectationFailures.length === 0
      && artifactCurrentMeaningMismatches.length === 0
      && missingProvenance.length === 0
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
    candidate.reviewDecisionSource,
    candidate.currentMeaningInLaw ?? 'NULL',
    candidate.proposedMeaningInLaw,
    candidate.targetDatasetIdentifier ?? 'NOT_FOUND_OR_DUPLICATE',
  ]);

  return [
    '# Comparator Writeback Preview',
    '',
    'Status: NOT_APPLIED. This preview does not modify the live vocabulary dataset, existing meaning text, runtime ontology, concept packets, or live concept meanings.',
    '',
    '## Validation',
    '',
    `- Total candidates: ${validationReport.counts.totalCandidateCount}`,
    `- Approved included: ${validationReport.counts.approvedIncludedCount}`,
    `- Revised included: ${validationReport.counts.revisedIncludedCount}`,
    `- Rejected included: ${validationReport.counts.rejectedIncludedCount}`,
    `- Terms not found in target dataset: ${validationReport.counts.notFoundInTargetDatasetCount}`,
    `- Duplicate target mappings: ${validationReport.counts.duplicateTargetMappingCount}`,
    `- Alternate non-target dataset mappings: ${validationReport.counts.alternateDatasetMappingCount}`,
    `- Runtime/core collisions: ${validationReport.counts.runtimeCoreCollisionCount}`,
    `- Current meaning expectation failures: ${validationReport.counts.currentMeaningExpectationFailureCount}`,
    `- Artifact/current registry meaning mismatches: ${validationReport.counts.artifactCurrentMeaningMismatchCount}`,
    `- Missing Anderson provenance: ${validationReport.counts.missingAndersonProvenanceCount}`,
    `- Clean for explicit approval: ${validationReport.cleanForExplicitApproval}`,
    '',
    '## Diff Preview',
    '',
    markdownTable(
      ['Term', 'Comparator type', 'Change type', 'Decision source', 'Current meaning', 'Proposed meaning', 'Target row'],
      rows,
    ),
    '',
    '## Next Step',
    '',
    'If approved, the next task should explicitly apply only these NOT_APPLIED comparator candidates to the vocabulary boundary meaning source, preserve exact source provenance, then rerun boundary audit and vocabulary boundary tests.',
    '',
  ].join('\n');
}

function main() {
  const candidates = buildCandidates();
  const validationReport = buildValidationReport(candidates);

  writeJson(outputPaths.previewJson, {
    generatedAt: validationReport.generatedAt,
    status: 'NOT_APPLIED',
    source: 'multi_source_comparator_review',
    candidates,
  });
  writeJson(outputPaths.validationReportJson, validationReport);
  fs.writeFileSync(outputPaths.diffMarkdown, buildDiffMarkdown(candidates, validationReport), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
