'use strict';

const path = require('node:path');

const { sourceRecords, outputDirs } = require('./comparator-v3-config');
const {
  boundaryRegistryIndex,
  readNdjson,
  writeJson,
  writeNdjson,
} = require('./comparator-v3-utils');

function isLowConfidence(candidate) {
  return candidate.parseConfidence === 'low' || candidate.sourceQualityTier === 'poor';
}

function sourceQualityTier(candidate) {
  if (candidate.sourceQualityTier === 'good' && candidate.parseConfidence === 'high') {
    return 'high';
  }
  if (candidate.sourceQualityTier === 'poor' || candidate.parseConfidence === 'low') {
    return 'low';
  }
  return 'medium';
}

function buildAlignmentForSource(source, registry) {
  const candidatesPath = path.join(outputDirs.entryCandidates, `${source.sourceId}.entry_candidates.ndjson`);
  const candidates = readNdjson(candidatesPath);
  const records = [];

  candidates.forEach((candidate) => {
    const boundaryMatches = registry.byNormalized.get(candidate.normalizedHeadword) ?? [];
    boundaryMatches.forEach((boundaryRecord) => {
      const matchStatus = boundaryRecord.isAliasSurface
        ? 'rejected_alias_surface'
        : isLowConfidence(candidate)
          ? 'rejected_parse_low_confidence'
          : 'exact_normalized_match';

      records.push({
        boundaryTerm: boundaryRecord.term,
        normalizedBoundaryTerm: boundaryRecord.normalizedTerm,
        boundaryFamily: boundaryRecord.family,
        boundaryClassification: boundaryRecord.classification,
        sourceId: source.sourceId,
        sourceTitle: source.sourceTitle,
        year: source.year,
        volume: source.volume,
        page: candidate.page,
        lineNumber: candidate.lineNumber,
        headword: candidate.headword,
        normalizedHeadword: candidate.normalizedHeadword,
        matchStatus,
        rawLine: candidate.rawLine,
        contextPreview: candidate.contextPreview,
        parseConfidence: candidate.parseConfidence,
        sourceQualityTier: sourceQualityTier(candidate),
        extractionMode: candidate.extractionMode,
        comparatorRole: 'assistive_v3_only',
        authorityLevel: 'comparator_only_not_primary',
        mayCreateMeaning: false,
        mayOverrideBlack: false,
        mayAdmitRuntimeOntology: false,
      });
    });
  });

  const outputPath = path.join(outputDirs.alignment, source.alignmentFile);
  writeNdjson(outputPath, records);
  return {
    sourceId: source.sourceId,
    outputPath,
    alignmentRecordCount: records.length,
    exactNormalizedMatchCount: records.filter((record) => record.matchStatus === 'exact_normalized_match').length,
    rejectedAliasSurfaceCount: records.filter((record) => record.matchStatus === 'rejected_alias_surface').length,
    rejectedParseLowConfidenceCount: records.filter((record) => record.matchStatus === 'rejected_parse_low_confidence').length,
    uniqueExactBoundaryTerms: new Set(records
      .filter((record) => record.matchStatus === 'exact_normalized_match')
      .map((record) => record.normalizedBoundaryTerm)).size,
  };
}

function main() {
  const registry = boundaryRegistryIndex();
  const summaries = sourceRecords.map((source) => buildAlignmentForSource(source, registry));
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'comparator_v3_exact_term_alignment_only',
    totalRegistryTermsChecked: registry.records.length,
    exactTermOnly: true,
    fuzzyMatchingUsed: false,
    aliasFanOutUsed: false,
    comparatorRole: 'assistive_v3_only',
    summaries,
  };
  writeJson(path.join(outputDirs.reports, 'comparator_v3_alignment_summary.json'), report);
  console.log(JSON.stringify(report, null, 2));
}

main();
