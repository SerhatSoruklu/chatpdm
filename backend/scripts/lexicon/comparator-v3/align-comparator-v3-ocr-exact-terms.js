'use strict';

const path = require('node:path');

const { sourceRecords, ocrRepairSourceIds, outputDirs } = require('./comparator-v3-config');
const { boundaryRegistryIndex, readNdjson, writeJson, writeNdjson } = require('./comparator-v3-utils');

const targetSources = sourceRecords.filter((source) => ocrRepairSourceIds.includes(source.sourceId));

function matchStatusFor(boundaryRecord, candidate) {
  if (boundaryRecord.isAliasSurface) {
    return 'rejected_alias_surface';
  }
  if (candidate.ocrConfidence !== null && candidate.ocrConfidence < 60) {
    return 'rejected_ocr_low_confidence';
  }
  if (candidate.parseConfidence === 'low') {
    return 'rejected_parse_low_confidence';
  }
  return 'exact_normalized_match';
}

function main() {
  const registry = boundaryRegistryIndex();
  const summaries = targetSources.map((source) => {
    const candidates = readNdjson(path.join(
      outputDirs.ocrEntryCandidates,
      `${source.sourceId}.ocr_entry_candidates.ndjson`,
    ));
    const records = [];
    candidates.forEach((candidate) => {
      const matches = registry.byNormalized.get(candidate.normalizedHeadword) ?? [];
      matches.forEach((boundaryRecord) => {
        records.push({
          boundaryTerm: boundaryRecord.term,
          normalizedBoundaryTerm: boundaryRecord.normalizedTerm,
          sourceId: source.sourceId,
          sourceTitle: source.sourceTitle,
          year: source.year,
          volume: source.volume,
          page: candidate.page,
          lineNumber: candidate.lineNumber,
          headword: candidate.headword,
          normalizedHeadword: candidate.normalizedHeadword,
          matchStatus: matchStatusFor(boundaryRecord, candidate),
          rawLine: candidate.rawLine,
          contextPreview: candidate.contextPreview,
          parseConfidence: candidate.parseConfidence,
          ocrConfidence: candidate.ocrConfidence,
          sourceQualityTier: candidate.sourceQualityTier,
          extractionMode: 'ocr_repair_lane',
          comparatorRole: 'assistive_v3_only',
          authorityLevel: 'comparator_only_not_primary',
          mayCreateMeaning: false,
          mayOverrideBlack: false,
          mayAdmitRuntimeOntology: false,
        });
      });
    });
    const outputPath = path.join(outputDirs.ocrAlignment, `${source.sourceId}.ocr_boundary_alignment.ndjson`);
    writeNdjson(outputPath, records);
    const exactRecords = records.filter((record) => record.matchStatus === 'exact_normalized_match');
    return {
      sourceId: source.sourceId,
      outputPath,
      alignmentRecordCount: records.length,
      exactMatchCount: exactRecords.length,
      uniqueExactTermCount: new Set(exactRecords.map((record) => record.normalizedBoundaryTerm)).size,
      rejectedAliasSurfaceCount: records.filter((record) => record.matchStatus === 'rejected_alias_surface').length,
      rejectedParseLowConfidenceCount: records.filter((record) => record.matchStatus === 'rejected_parse_low_confidence').length,
      rejectedOcrLowConfidenceCount: records.filter((record) => record.matchStatus === 'rejected_ocr_low_confidence').length,
      status: candidates.length > 0 ? 'ocr_alignment_built' : 'blocked_no_ocr_candidates',
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'comparator_v3_ocr_exact_alignment',
    totalRegistryTermsChecked: registry.records.length,
    exactTermOnly: true,
    fuzzyMatchingUsed: false,
    aliasFanOutUsed: false,
    summaries,
  };
  writeJson(path.join(outputDirs.ocrReports, 'comparator_v3_ocr_alignment_summary.json'), report);
  console.log(JSON.stringify(report, null, 2));
}

main();
