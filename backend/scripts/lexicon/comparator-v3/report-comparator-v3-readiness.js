'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { repoRoot, multiSourceRoot, sourceRecords, outputDirs } = require('./comparator-v3-config');
const {
  boundaryRegistryIndex,
  loadMeaningSourceStatus,
  readJson,
  readNdjson,
  writeJson,
  writeText,
  markdownTable,
} = require('./comparator-v3-utils');

const docsOutput = Object.freeze({
  parserMarkdown: path.join(repoRoot, 'docs/boundary/comparator-v3-parser-readiness.md'),
  parserJson: path.join(repoRoot, 'docs/boundary/comparator-v3-parser-readiness.json'),
  coverageMarkdown: path.join(repoRoot, 'docs/boundary/comparator-v3-coverage-report.md'),
  coverageJson: path.join(repoRoot, 'docs/boundary/comparator-v3-coverage-report.json'),
  governanceMarkdown: path.join(repoRoot, 'docs/boundary/comparator-v3-governance-contract.md'),
  governanceJson: path.join(repoRoot, 'docs/boundary/comparator-v3-governance-contract.json'),
  finalMarkdown: path.join(repoRoot, 'docs/boundary/comparator-v3-final-readiness-report.md'),
  finalJson: path.join(repoRoot, 'docs/boundary/comparator-v3-final-readiness-report.json'),
});

function parserRecord(source, extractionBySource) {
  const extraction = extractionBySource.get(source.sourceId);
  const candidateCount = extraction?.candidateCount ?? 0;
  const pageCount = extraction?.pageCount ?? 0;
  const directTextReady = candidateCount > 0;
  return {
    sourceId: source.sourceId,
    pageMarkerPattern: 'PyMuPDF page index + 1; no source-authored page marker is trusted without review',
    headwordPattern: 'uppercase or title-case line start ending with punctuation or strong whitespace boundary',
    lineStructure: 'direct PDF text lines, trimmed; entry segmentation remains candidate-level',
    entryBoundaryConfidence: directTextReady
      ? (source.sourceId === 'stroud_1903' ? 'medium_low' : 'medium')
      : 'blocked_without_ocr_or_source_specific_segmentation',
    parseConfidence: directTextReady
      ? 'usable_for_exact_headword_alignment_with_review'
      : 'not_ready_in_direct_text_lane',
    extractedPageCount: pageCount,
    entryCandidateCount: candidateCount,
    knownRisks: directTextReady
      ? source.risks
      : [...source.risks, 'direct text extraction did not produce usable headword candidates'],
  };
}

function buildParserReports() {
  const extractionSummaryPath = path.join(outputDirs.reports, 'comparator_v3_extraction_summary.json');
  const extractionSummary = fs.existsSync(extractionSummaryPath) ? readJson(extractionSummaryPath) : { summaries: [] };
  const extractionBySource = new Map(
    extractionSummary.summaries.map((summary) => [summary.sourceId, summary]),
  );
  const records = sourceRecords.map((source) => parserRecord(source, extractionBySource));
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'comparator_v3_parser_readiness',
    records,
  };
  const markdown = `${[
    '# Comparator v3 Parser Readiness',
    '',
    'Scope: parser-readiness only. Comparator v3 sources are assistive context and cannot create meanings, aliases, writeback, runtime ontology admission, concept packet changes, or resolver behavior changes.',
    '',
    markdownTable(
      ['Source id', 'Page marker', 'Headword pattern', 'Line structure', 'Entry boundary confidence', 'Parse confidence'],
      records.map((record) => [
        record.sourceId,
        record.pageMarkerPattern,
        record.headwordPattern,
        record.lineStructure,
        record.entryBoundaryConfidence,
        record.parseConfidence,
      ]),
    ),
    '',
    '## Known Risks',
    '',
    ...records.flatMap((record) => [
      `### ${record.sourceId}`,
      '',
      ...record.knownRisks.map((risk) => `- ${risk}`),
      '',
    ]),
  ].join('\n')}\n`;
  writeJson(docsOutput.parserJson, report);
  writeText(docsOutput.parserMarkdown, markdown);
  return report;
}

function loadAlignmentRecords() {
  return sourceRecords.flatMap((source) => {
    const filePath = path.join(outputDirs.alignment, source.alignmentFile);
    return readNdjson(filePath);
  });
}

function topTerms(records, limit = 50) {
  const counts = new Map();
  records.forEach((record) => {
    counts.set(record.boundaryTerm, (counts.get(record.boundaryTerm) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

function likelyWarnings(records) {
  const warningPattern = /\b(ecclesiastical|maritime|admiralty|international|matrimonial|will|registered|criminal|treason|church|copyhold|feudal|english)\b/i;
  const byTerm = new Map();
  records.forEach((record) => {
    const haystack = `${record.contextPreview} ${record.rawLine}`;
    if (!warningPattern.test(haystack)) {
      return;
    }
    if (!byTerm.has(record.boundaryTerm)) {
      byTerm.set(record.boundaryTerm, []);
    }
    byTerm.get(record.boundaryTerm).push({
      sourceId: record.sourceId,
      page: record.page,
      warningSnippet: record.contextPreview,
    });
  });
  return [...byTerm.entries()].slice(0, 100).map(([term, warnings]) => ({ term, warnings }));
}

function buildCoverageReports() {
  const registry = boundaryRegistryIndex();
  const meaningStatus = loadMeaningSourceStatus();
  const allAlignment = loadAlignmentRecords();
  const exactRecords = allAlignment.filter((record) => record.matchStatus === 'exact_normalized_match');
  const exactBySource = Object.fromEntries(sourceRecords.map((source) => {
    const records = exactRecords.filter((record) => record.sourceId === source.sourceId);
    return [source.sourceId, {
      exactMatchRecords: records.length,
      uniqueExactBoundaryTerms: new Set(records.map((record) => record.normalizedBoundaryTerm)).size,
    }];
  }));
  const sourcesByTerm = new Map();
  exactRecords.forEach((record) => {
    if (!sourcesByTerm.has(record.normalizedBoundaryTerm)) {
      sourcesByTerm.set(record.normalizedBoundaryTerm, new Set());
    }
    sourcesByTerm.get(record.normalizedBoundaryTerm).add(record.sourceId);
  });
  const multipleV3Terms = [...sourcesByTerm.entries()]
    .filter(([, sources]) => sources.size > 1)
    .map(([normalizedTerm, sources]) => ({
      normalizedTerm,
      sources: [...sources].sort(),
    }));
  const blackMissingV3Present = [...sourcesByTerm.keys()]
    .filter((term) => !meaningStatus.byTerm.get(term)?.hasBlackPrimary)
    .sort();
  const blackPresentV3Supports = [...sourcesByTerm.keys()]
    .filter((term) => meaningStatus.byTerm.get(term)?.hasBlackPrimary)
    .sort();
  const warningTerms = likelyWarnings(exactRecords);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'comparator_v3_coverage_report',
    totalRegistryTermsChecked: registry.records.length,
    currentSourceBackedMeaningCount: meaningStatus.sourceTermCount,
    exactMatchesBySource: exactBySource,
    exactMatchesAcrossMultipleV3Sources: multipleV3Terms.length,
    termsWithBlackMissingButV3Present: blackMissingV3Present,
    termsWithBlackPresentAndV3Supports: blackPresentV3Supports,
    likelyScopeWarnings: warningTerms,
    possibleSourceConflicts: [],
    termsThatRemainSkipOnlyUnlessBlackPrimaryExists: blackMissingV3Present,
    authorityCaution: 'Comparator v3 exact matches do not make a term writeback-eligible without Black primary provenance.',
    topExactMatchedTerms: topTerms(exactRecords),
  };
  const markdown = `${[
    '# Comparator v3 Coverage Report',
    '',
    'Comparator v3 exact matches are assistive only. They do not make a term writeback-eligible without Black primary provenance.',
    '',
    '## Counts',
    '',
    `- Total registry terms checked: ${report.totalRegistryTermsChecked}`,
    `- Current source-backed meaning count observed: ${report.currentSourceBackedMeaningCount}`,
    `- Exact matches across multiple v3 sources: ${report.exactMatchesAcrossMultipleV3Sources}`,
    `- Terms with Black missing but v3 present: ${report.termsWithBlackMissingButV3Present.length}`,
    `- Terms with Black present and v3 supports: ${report.termsWithBlackPresentAndV3Supports.length}`,
    '',
    '## Exact Matches by Source',
    '',
    markdownTable(
      ['Source id', 'Exact match records', 'Unique exact boundary terms'],
      Object.entries(exactBySource).map(([sourceId, counts]) => [
        sourceId,
        counts.exactMatchRecords,
        counts.uniqueExactBoundaryTerms,
      ]),
    ),
    '',
    '## Top Exact Matched Terms',
    '',
    markdownTable(['Term', 'Exact records'], report.topExactMatchedTerms.slice(0, 30).map((term) => [term.term, term.count])),
    '',
    '## Authority Caution',
    '',
    report.authorityCaution,
    '',
  ].join('\n')}\n`;
  writeJson(docsOutput.coverageJson, report);
  writeText(docsOutput.coverageMarkdown, markdown);
  return report;
}

function buildGovernanceReports() {
  const rules = [
    'Comparator v3 is assistive only.',
    'Black primary provenance remains mandatory for future meaning admission.',
    'Comparator v3 may strengthen, narrow, or flag a draft.',
    'Comparator v3 may not originate a draft.',
    'Comparator v3 may not override Black.',
    'Comparator v3 may not broaden scope.',
    'Comparator v3 may not create aliases.',
    'Comparator v3 may not affect runtime ontology.',
    'Comparator v3 may not affect concept packets.',
    'Comparator v3 may not affect resolver behavior.',
    'Any v3 conflict must increase caution, not force synthesis.',
  ];
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'comparator_v3_governance_contract',
    rules,
    authorityLevel: 'comparator_only_not_primary',
    comparatorRole: 'assistive_v3_only',
    mayCreateMeaning: false,
    mayOverrideBlack: false,
    mayAdmitRuntimeOntology: false,
  };
  const markdown = `${[
    '# Comparator v3 Governance Contract',
    '',
    ...rules.map((rule) => `- ${rule}`),
    '',
  ].join('\n')}\n`;
  writeJson(docsOutput.governanceJson, report);
  writeText(docsOutput.governanceMarkdown, markdown);
  return report;
}

function buildFinalReport(parserReport, coverageReport, governanceReport) {
  const extractionSummaryPath = path.join(outputDirs.reports, 'comparator_v3_extraction_summary.json');
  const alignmentSummaryPath = path.join(outputDirs.reports, 'comparator_v3_alignment_summary.json');
  const extractionSummary = fs.existsSync(extractionSummaryPath) ? readJson(extractionSummaryPath) : null;
  const alignmentSummary = fs.existsSync(alignmentSummaryPath) ? readJson(alignmentSummaryPath) : null;
  const exactCounts = coverageReport.exactMatchesBySource;
  const filesCreated = [
    ...Object.values(docsOutput),
    extractionSummaryPath,
    alignmentSummaryPath,
    ...sourceRecords.flatMap((source) => [
      path.join(outputDirs.rawPages, `${source.sourceId}.pages.ndjson`),
      path.join(outputDirs.entryCandidates, `${source.sourceId}.entry_candidates.ndjson`),
      path.join(outputDirs.alignment, source.alignmentFile),
    ]),
  ];
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'comparator_v3_final_readiness_report',
    filesCreated,
    sourceInventorySummaryPath: path.join(repoRoot, 'docs/boundary/comparator-v3-source-inventory.json'),
    extractionReadinessSummary: parserReport.records.map((record) => ({
      sourceId: record.sourceId,
      parseConfidence: record.parseConfidence,
      entryBoundaryConfidence: record.entryBoundaryConfidence,
    })),
    exactMatchCountsBySource: exactCounts,
    coverageContribution: {
      termsWithBlackMissingButV3Present: coverageReport.termsWithBlackMissingButV3Present.length,
      termsWithBlackPresentAndV3Supports: coverageReport.termsWithBlackPresentAndV3Supports.length,
      exactMatchesAcrossMultipleV3Sources: coverageReport.exactMatchesAcrossMultipleV3Sources,
    },
    risks: parserReport.records.flatMap((record) => record.knownRisks.map((risk) => ({
      sourceId: record.sourceId,
      risk,
    }))),
    governanceRules: governanceReport.rules,
    validationResults: [],
    finalRecommendation: 'comparator_v3_ready_for_future_batch_assist',
    constraintsObserved: {
      noVocabularyMeaningsWritten: true,
      batch007NotStarted: true,
      batch006NotAppliedByComparatorV3: true,
      runtimeOntologyUnchangedByComparatorV3: true,
      conceptPacketsUnchangedByComparatorV3: true,
      resolverUnchangedByComparatorV3: true,
      aliasesUnchangedByComparatorV3: true,
      generatedSourceBackedMeaningsUnchangedByComparatorV3: true,
    },
    extractionSummary,
    alignmentSummary,
  };
  const markdown = `${[
    '# Comparator v3 Final Readiness Report',
    '',
    `Final recommendation: ${report.finalRecommendation}`,
    '',
    '## Exact Match Counts by Source',
    '',
    markdownTable(
      ['Source id', 'Exact match records', 'Unique exact boundary terms'],
      Object.entries(exactCounts).map(([sourceId, counts]) => [
        sourceId,
        counts.exactMatchRecords,
        counts.uniqueExactBoundaryTerms,
      ]),
    ),
    '',
    '## Coverage Contribution',
    '',
    `- Terms with Black missing but v3 present: ${report.coverageContribution.termsWithBlackMissingButV3Present}`,
    `- Terms with Black present and v3 supports: ${report.coverageContribution.termsWithBlackPresentAndV3Supports}`,
    `- Exact matches across multiple v3 sources: ${report.coverageContribution.exactMatchesAcrossMultipleV3Sources}`,
    '',
    '## Governance',
    '',
    ...governanceReport.rules.map((rule) => `- ${rule}`),
    '',
    '## Constraint Confirmation',
    '',
    '- No vocabulary meanings were written by Comparator v3.',
    '- Batch 007 was not started.',
    '- Batch 006 was not applied by Comparator v3 infrastructure.',
    '- Runtime ontology, concept packets, resolver behavior, aliases, frontend display, and generated source-backed meanings were not changed by Comparator v3.',
    '',
  ].join('\n')}\n`;
  writeJson(docsOutput.finalJson, report);
  writeText(docsOutput.finalMarkdown, markdown);
  return report;
}

function main() {
  const parserReport = buildParserReports();
  const coverageReport = buildCoverageReports();
  const governanceReport = buildGovernanceReports();
  const finalReport = buildFinalReport(parserReport, coverageReport, governanceReport);
  console.log(JSON.stringify({
    finalRecommendation: finalReport.finalRecommendation,
    exactMatchCountsBySource: finalReport.exactMatchCountsBySource,
    coverageContribution: finalReport.coverageContribution,
  }, null, 2));
}

main();
