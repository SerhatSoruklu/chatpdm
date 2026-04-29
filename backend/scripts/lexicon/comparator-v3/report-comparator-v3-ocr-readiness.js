'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  repoRoot,
  sourceRecords,
  ocrRepairSourceIds,
  outputDirs,
} = require('./comparator-v3-config');
const { readJson, readNdjson, writeJson, writeText, markdownTable } = require('./comparator-v3-utils');

const targetSources = sourceRecords.filter((source) => ocrRepairSourceIds.includes(source.sourceId));
const outputPaths = Object.freeze({
  json: path.join(repoRoot, 'docs/boundary/comparator-v3-ocr-readiness-report.json'),
  markdown: path.join(repoRoot, 'docs/boundary/comparator-v3-ocr-readiness-report.md'),
  workspaceJson: path.join(outputDirs.ocrReports, 'comparator_v3_ocr_readiness_report.json'),
});

function optionalJson(filePath, fallback) {
  return fs.existsSync(filePath) ? readJson(filePath) : fallback;
}

function sampleMatches(sourceId) {
  return readNdjson(path.join(outputDirs.ocrAlignment, `${sourceId}.ocr_boundary_alignment.ndjson`))
    .filter((record) => record.matchStatus === 'exact_normalized_match')
    .slice(0, 20)
    .map((record) => ({
      boundaryTerm: record.boundaryTerm,
      page: record.page,
      headword: record.headword,
      contextPreview: record.contextPreview,
    }));
}

function main() {
  const tooling = optionalJson(
    path.join(outputDirs.ocrReports, 'comparator_v3_ocr_tooling_report.json'),
    { fullOcrCanRunLocallyNow: false, cliTools: {}, pythonLibraries: {}, missingTools: [] },
  );
  const pageSummary = optionalJson(
    path.join(outputDirs.ocrReports, 'comparator_v3_ocr_page_extraction_summary.json'),
    { summaries: [] },
  );
  const blockedPageSummary = optionalJson(
    path.join(outputDirs.ocrReports, 'comparator_v3_ocr_page_extraction_blocked.json'),
    null,
  );
  const candidateSummary = optionalJson(
    path.join(outputDirs.ocrReports, 'comparator_v3_ocr_entry_candidate_summary.json'),
    { summaries: [] },
  );
  const alignmentSummary = optionalJson(
    path.join(outputDirs.ocrReports, 'comparator_v3_ocr_alignment_summary.json'),
    { summaries: [] },
  );

  const pagesBySource = new Map((pageSummary.summaries ?? []).map((summary) => [summary.sourceId, summary]));
  const candidatesBySource = new Map((candidateSummary.summaries ?? []).map((summary) => [summary.sourceId, summary]));
  const alignmentBySource = new Map((alignmentSummary.summaries ?? []).map((summary) => [summary.sourceId, summary]));

  const records = targetSources.map((source) => {
    const pageRecord = pagesBySource.get(source.sourceId);
    const candidateRecord = candidatesBySource.get(source.sourceId);
    const alignmentRecord = alignmentBySource.get(source.sourceId);
    let sourceStatus = 'blocked_pending_ocr_tooling';
    if (tooling.fullOcrCanRunLocallyNow && pageRecord?.recordsWritten > 0) {
      sourceStatus = (alignmentRecord?.exactMatchCount ?? 0) > 0
        ? 'partial_ocr_ready_needs_review'
        : 'blocked_pending_source_specific_segmentation';
    }
    return {
      sourceId: source.sourceId,
      sourceTitle: source.sourceTitle,
      pagesOcred: pageRecord?.recordsWritten ?? 0,
      ocrCandidateCount: candidateRecord?.candidateCount ?? 0,
      exactMatchCount: alignmentRecord?.exactMatchCount ?? 0,
      uniqueExactTermCount: alignmentRecord?.uniqueExactTermCount ?? 0,
      lowConfidenceCount: (alignmentRecord?.rejectedParseLowConfidenceCount ?? 0)
        + (alignmentRecord?.rejectedOcrLowConfidenceCount ?? 0),
      blockedReason: sourceStatus === 'blocked_pending_ocr_tooling'
        ? 'OCR engine/tooling unavailable locally; no OCR pages produced.'
        : null,
      sourceStatus,
      sampleExactMatches: sampleMatches(source.sourceId),
      riskNotes: [
        'OCR noise may corrupt headwords.',
        'Exact-term alignment only; no fuzzy repair or alias fan-out.',
        'Comparator v3 remains assistive-only and cannot originate meanings.',
      ],
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'comparator_v3_ocr_readiness',
    tooling,
    blockedPageSummary,
    sourcesAttempted: targetSources.map((source) => source.sourceId),
    records,
  };
  const markdown = `${[
    '# Comparator v3 OCR Readiness Report',
    '',
    `Full OCR can run locally now: ${tooling.fullOcrCanRunLocallyNow}`,
    '',
    markdownTable(
      ['Source id', 'Pages OCRed', 'Candidates', 'Exact matches', 'Unique exact terms', 'Low confidence', 'Status', 'Blocked reason'],
      records.map((record) => [
        record.sourceId,
        record.pagesOcred,
        record.ocrCandidateCount,
        record.exactMatchCount,
        record.uniqueExactTermCount,
        record.lowConfidenceCount,
        record.sourceStatus,
        record.blockedReason,
      ]),
    ),
    '',
    '## Sample Exact OCR Matches',
    '',
    ...records.flatMap((record) => [
      `### ${record.sourceId}`,
      '',
      record.sampleExactMatches.length
        ? markdownTable(['Boundary term', 'Page', 'Headword', 'Context'], record.sampleExactMatches.map((match) => [
          match.boundaryTerm,
          match.page,
          match.headword,
          match.contextPreview,
        ]))
        : 'No exact OCR matches available.',
      '',
    ]),
    '## OCR Risk Notes',
    '',
    '- OCR output is not trusted until confidence and exact-term checks pass.',
    '- OCR output may not create meanings, override Black, add aliases, or affect runtime ontology.',
    '',
  ].join('\n')}\n`;
  writeJson(outputPaths.json, report);
  writeJson(outputPaths.workspaceJson, report);
  writeText(outputPaths.markdown, markdown);
  console.log(JSON.stringify({ outputPaths, records: records.length }, null, 2));
}

main();
