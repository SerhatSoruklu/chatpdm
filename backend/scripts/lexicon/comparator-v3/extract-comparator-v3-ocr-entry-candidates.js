'use strict';

const path = require('node:path');

const { sourceRecords, ocrRepairSourceIds, outputDirs } = require('./comparator-v3-config');
const { normalizeForComparison, readNdjson, writeJson, writeNdjson } = require('./comparator-v3-utils');

const targetSources = sourceRecords.filter((source) => ocrRepairSourceIds.includes(source.sourceId));
const headwordPatterns = [
  /^(?<headword>[A-Z][A-Z0-9 '&,/.-]{1,90})(?:[.:;]|\s{2,}|$)/,
  /^(?<headword>[A-Z][A-Za-z][A-Za-z '&/-]{1,70})\.\s+/,
];

function collapseSpace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function detectHeadword(line) {
  const value = collapseSpace(line);
  for (const pattern of headwordPatterns) {
    const match = pattern.exec(value);
    if (match?.groups?.headword) {
      return collapseSpace(match.groups.headword).replace(/[.;:,]+$/g, '').trim();
    }
  }
  return null;
}

function lineConfidence(line, ocrConfidence) {
  if (ocrConfidence !== null && ocrConfidence < 60) {
    return 'low';
  }
  if (/[^A-Za-z0-9 '&,/.-]/.test(line)) {
    return 'medium';
  }
  return 'high';
}

function main() {
  const summaries = targetSources.map((source) => {
    const pagesPath = path.join(outputDirs.ocrPages, `${source.sourceId}.ocr_pages.ndjson`);
    const pages = readNdjson(pagesPath);
    const candidates = [];
    pages.forEach((page) => {
      const lines = String(page.ocrText ?? '').split(/\r?\n|(?<=\.)\s+(?=[A-Z][A-Za-z ,'-]{2,60}\.)/).map(collapseSpace).filter(Boolean);
      lines.forEach((line, index) => {
        const headword = detectHeadword(line);
        if (!headword) {
          return;
        }
        candidates.push({
          sourceId: source.sourceId,
          sourceTitle: source.sourceTitle,
          year: source.year,
          volume: source.volume,
          page: page.page,
          lineNumber: index + 1,
          headword,
          normalizedHeadword: normalizeForComparison(headword),
          rawLine: line,
          contextPreview: line.slice(0, 360),
          parseConfidence: lineConfidence(line, page.confidence),
          extractionMode: 'ocr_repair_lane',
          sourceQualityTier: page.confidence !== null && page.confidence < 60 ? 'low' : 'medium',
          ocrConfidence: page.confidence,
          comparatorRole: 'assistive_v3_only',
          authorityLevel: 'comparator_only_not_primary',
          mayCreateMeaning: false,
          mayOverrideBlack: false,
          mayAdmitRuntimeOntology: false,
        });
      });
    });
    const outputPath = path.join(outputDirs.ocrEntryCandidates, `${source.sourceId}.ocr_entry_candidates.ndjson`);
    writeNdjson(outputPath, candidates);
    return {
      sourceId: source.sourceId,
      pagesRead: pages.length,
      candidateCount: candidates.length,
      outputPath,
      status: pages.length > 0 ? 'candidates_extracted' : 'blocked_no_ocr_pages',
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'comparator_v3_ocr_entry_candidate_extraction',
    summaries,
  };
  writeJson(path.join(outputDirs.ocrReports, 'comparator_v3_ocr_entry_candidate_summary.json'), report);
  console.log(JSON.stringify(report, null, 2));
}

main();
