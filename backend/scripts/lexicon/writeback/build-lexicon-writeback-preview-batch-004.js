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
const draftRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/draft_meanings');
const reviewRoot = path.join(draftRoot, 'review');
const outputRoot = path.join(draftRoot, 'writeback_preview');

const datasetPath = path.join(repoRoot, 'data/legal-vocabulary/legal-vocabulary-dataset.txt');
const semanticOverrideTargetPath = path.join(
  repoRoot,
  'backend/src/modules/legal-vocabulary/vocabulary-boundary.js',
);

const inputPaths = Object.freeze({
  approved: path.join(reviewRoot, 'approved_batch_004.json'),
  revise: path.join(reviewRoot, 'revise_batch_004.json'),
  rejected: path.join(reviewRoot, 'rejected_batch_004.json'),
  draftBatch: path.join(draftRoot, 'batch_004_fourth_50_drafts.json'),
  dataset: datasetPath,
  semanticOverrideTarget: semanticOverrideTargetPath,
});

const outputPaths = Object.freeze({
  previewJson: path.join(outputRoot, 'batch_004_writeback_preview_NOT_APPLIED.json'),
  diffMarkdown: path.join(outputRoot, 'batch_004_writeback_diff_preview.md'),
  validationReportJson: path.join(outputRoot, 'batch_004_writeback_validation_report.json'),
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
    const surfaceForms = new Set([normalized]);
    if (trimmed.includes('_')) {
      surfaceForms.add(normalizeForComparison(trimmed.replaceAll('_', ' ')));
    }

    surfaceForms.forEach((surfaceForm) => {
      if (!targetsByNormalizedTerm.has(surfaceForm)) {
        targetsByNormalizedTerm.set(surfaceForm, []);
      }

      targetsByNormalizedTerm.get(surfaceForm).push({
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
  const targetIndex = buildDatasetTargetIndex();
  const registryEntriesByTerm = buildCurrentRegistryEntryMap();
  const rejectedTerms = new Set(rejected.map((record) => normalizeForComparison(record.term)));

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
      changeType: currentMeaningInLaw ? 'revise_existing' : 'new_fill',
      family: record.family,
      bucket: record.bucket,
      riskTier: record.riskTier,
      sourceBasis: record.sourceBasis,
      comparatorUsed: record.comparatorUsed,
      provenancePointers: record.provenancePointers,
      aliasGroupNote: record.aliasGroupNote,
      historicallyNarrow: record.historicallyNarrow,
      reviewDecisionSource: record.reviewDecisionSource,
      reviewDecision: record.reviewDecision,
      reviewReason: record.reviewReason,
      reviewConfidence: record.confidence,
      source: 'batch_004_review',
      status: 'NOT_APPLIED',
      rejectedTermLeak: rejectedTerms.has(normalizedTerm),
      runtimeCollisionTypes: runtimeCollisionTypes(normalizedTerm),
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

function buildDuplicateSelectedTargetGroups(candidates) {
  const termsByTarget = new Map();
  candidates.forEach((candidate) => {
    if (!candidate.targetDatasetIdentifier) {
      return;
    }
    if (!termsByTarget.has(candidate.targetDatasetIdentifier)) {
      termsByTarget.set(candidate.targetDatasetIdentifier, []);
    }
    termsByTarget.get(candidate.targetDatasetIdentifier).push(candidate.term);
  });

  return [...termsByTarget.entries()]
    .filter(([, terms]) => terms.length > 1)
    .map(([targetDatasetIdentifier, terms]) => ({ targetDatasetIdentifier, terms }));
}

function hasNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function buildValidationReport(candidates) {
  const rejectedIncluded = candidates.filter((candidate) => candidate.rejectedTermLeak);
  const notFound = candidates.filter((candidate) => !candidate.selectedTargetDatasetMapping);
  const duplicateMappings = candidates.filter((candidate) => candidate.targetDatasetMappings.length > 1);
  const alternateMappings = candidates.filter((candidate) => candidate.alternateDatasetMappings.length > 0);
  const runtimeCollisions = candidates.filter((candidate) => candidate.runtimeCollisionTypes.length > 0);
  const unexpectedlyNonEmptyCurrentMeanings = candidates.filter((candidate) => (
    candidate.currentMeaningInLaw !== null
    && candidate.currentMeaningInLaw.trim() !== ''
  ));
  const missingBlackProvenance = candidates.filter((candidate) => (
    !hasNonEmptyArray(candidate.provenancePointers?.black)
  ));
  const missingRequiredAndersonProvenance = candidates.filter((candidate) => (
    candidate.comparatorUsed
    && !hasNonEmptyArray(candidate.provenancePointers?.anderson)
  ));
  const duplicateSelectedTargetGroups = buildDuplicateSelectedTargetGroups(candidates);

  return {
    generatedAt: new Date().toISOString(),
    scope: 'batch 004 writeback preview only',
    status: 'NOT_APPLIED',
    boundaryDiscipline: {
      liveVocabularyDatasetModified: false,
      runtimeOntologyChanged: false,
      boundaryContentChanged: false,
      existingMeaningTextChanged: false,
      liveConceptPacketsTouched: false,
      rejectedTermsIncluded: rejectedIncluded.length,
      aliasFanOutPerformed: false,
      exactTermProvenanceOnly: true,
    },
    counts: {
      totalCandidateCount: candidates.length,
      approvedIncludedCount: candidates.filter((candidate) => candidate.reviewDecisionSource === 'approved').length,
      revisedIncludedCount: candidates.filter((candidate) => candidate.reviewDecisionSource === 'revised').length,
      rejectedIncludedCount: rejectedIncluded.length,
      notFoundInTargetDatasetCount: notFound.length,
      duplicateTargetMappingCount: duplicateMappings.length,
      duplicateSelectedTargetGroupCount: duplicateSelectedTargetGroups.length,
      alternateDatasetMappingCount: alternateMappings.length,
      runtimeCoreCollisionCount: runtimeCollisions.length,
      unexpectedlyNonEmptyCurrentMeaningCount: unexpectedlyNonEmptyCurrentMeanings.length,
      missingBlackProvenanceCount: missingBlackProvenance.length,
      missingRequiredAndersonProvenanceCount: missingRequiredAndersonProvenance.length,
      byChangeType: countBy(candidates, 'changeType'),
      bySourceBasis: countBy(candidates, 'sourceBasis'),
      byReviewDecisionSource: countBy(candidates, 'reviewDecisionSource'),
    },
    termsNotFoundInTargetDataset: notFound.map((candidate) => candidate.term),
    duplicateTargetMappings: duplicateMappings.map((candidate) => ({
      term: candidate.term,
      mappings: candidate.targetDatasetMappings,
    })),
    duplicateSelectedTargetGroups,
    alternateDatasetMappings: alternateMappings.map((candidate) => ({
      term: candidate.term,
      selectedMapping: candidate.selectedTargetDatasetMapping,
      alternateMappings: candidate.alternateDatasetMappings,
    })),
    runtimeCoreCollisions: runtimeCollisions.map((candidate) => ({
      term: candidate.term,
      runtimeCollisionTypes: candidate.runtimeCollisionTypes,
    })),
    unexpectedlyNonEmptyCurrentMeanings: unexpectedlyNonEmptyCurrentMeanings.map((candidate) => ({
      term: candidate.term,
      currentMeaningInLaw: candidate.currentMeaningInLaw,
      proposedMeaningInLaw: candidate.proposedMeaningInLaw,
    })),
    missingBlackProvenance: missingBlackProvenance.map((candidate) => candidate.term),
    missingRequiredAndersonProvenance: missingRequiredAndersonProvenance.map((candidate) => candidate.term),
    cleanForExplicitApproval: (
      rejectedIncluded.length === 0
      && notFound.length === 0
      && duplicateMappings.length === 0
      && runtimeCollisions.length === 0
      && unexpectedlyNonEmptyCurrentMeanings.length === 0
      && missingBlackProvenance.length === 0
      && missingRequiredAndersonProvenance.length === 0
    ),
    cleanForExplicitApprovalWithAliasCaution: (
      rejectedIncluded.length === 0
      && notFound.length === 0
      && runtimeCollisions.length === 0
      && unexpectedlyNonEmptyCurrentMeanings.length === 0
      && missingBlackProvenance.length === 0
      && missingRequiredAndersonProvenance.length === 0
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
    candidate.changeType,
    candidate.reviewDecisionSource,
    candidate.sourceBasis,
    candidate.comparatorUsed,
    candidate.currentMeaningInLaw ?? 'NULL',
    candidate.proposedMeaningInLaw,
    candidate.targetDatasetIdentifier ?? 'NOT_FOUND_OR_DUPLICATE',
  ]);
  const duplicateSelectedRows = validationReport.duplicateSelectedTargetGroups.map((group) => [
    group.targetDatasetIdentifier,
    group.terms.join(', '),
  ]);

  return [
    '# Batch 004 Writeback Preview',
    '',
    'Status: NOT_APPLIED. This preview does not modify the live vocabulary dataset, runtime ontology, boundary content, existing meaning text, or concept packets.',
    '',
    '## Validation',
    '',
    `- Total candidates: ${validationReport.counts.totalCandidateCount}`,
    `- Approved included: ${validationReport.counts.approvedIncludedCount}`,
    `- Revised included: ${validationReport.counts.revisedIncludedCount}`,
    `- Rejected included: ${validationReport.counts.rejectedIncludedCount}`,
    `- Terms not found in target dataset: ${validationReport.counts.notFoundInTargetDatasetCount}`,
    `- Duplicate target mappings: ${validationReport.counts.duplicateTargetMappingCount}`,
    `- Duplicate selected target groups: ${validationReport.counts.duplicateSelectedTargetGroupCount}`,
    `- Alternate non-target dataset mappings: ${validationReport.counts.alternateDatasetMappingCount}`,
    `- Runtime/core collisions: ${validationReport.counts.runtimeCoreCollisionCount}`,
    `- Unexpected non-empty current meanings: ${validationReport.counts.unexpectedlyNonEmptyCurrentMeaningCount}`,
    `- Missing Black provenance: ${validationReport.counts.missingBlackProvenanceCount}`,
    `- Missing required Anderson provenance: ${validationReport.counts.missingRequiredAndersonProvenanceCount}`,
    `- Clean for explicit approval: ${validationReport.cleanForExplicitApproval}`,
    `- Clean for explicit approval with alias caution: ${validationReport.cleanForExplicitApprovalWithAliasCaution}`,
    '',
    '## Source Basis',
    '',
    `- Black only: ${validationReport.counts.bySourceBasis.black_only ?? 0}`,
    `- Black plus Anderson: ${validationReport.counts.bySourceBasis.black_plus_anderson ?? 0}`,
    '',
    '## Diff Preview',
    '',
    markdownTable(
      ['Term', 'Change type', 'Decision source', 'Source basis', 'Comparator used', 'Current meaning', 'Proposed meaning', 'Target row'],
      rows,
    ),
    '',
    '## Alias Caution',
    '',
    duplicateSelectedRows.length > 0
      ? markdownTable(['Selected target row', 'Boundary terms'], duplicateSelectedRows)
      : 'No duplicate selected target rows detected.',
    '',
    'A live apply step must apply each candidate only to its selected boundary term and must not fan out to alternate alias rows.',
    '',
    '## Next Step',
    '',
    'If approved, the next step is an explicit live writeback task that applies only these NOT_APPLIED batch 004 candidates and then reruns the boundary audit, vocabulary boundary tests, and boundary contract validation.',
    '',
  ].join('\n');
}

function main() {
  fs.mkdirSync(outputRoot, { recursive: true });
  const candidates = buildCandidates();
  const validationReport = buildValidationReport(candidates);

  writeJson(outputPaths.previewJson, {
    generatedAt: validationReport.generatedAt,
    status: 'NOT_APPLIED',
    source: 'batch_004_review',
    candidates,
  });
  writeJson(outputPaths.validationReportJson, validationReport);
  fs.writeFileSync(outputPaths.diffMarkdown, buildDiffMarkdown(candidates, validationReport), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
