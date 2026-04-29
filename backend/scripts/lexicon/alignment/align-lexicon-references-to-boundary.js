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
const directTextRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/direct_text');
const segmentationDirectory = path.join(directTextRoot, 'segmentation');
const alignmentRoot = path.join(workspaceRoot, 'vocabulary_reference_lexicons/alignment');
const reportsDirectory = path.join(alignmentRoot, 'reports');

const outputPaths = Object.freeze({
  summaryMarkdown: path.join(reportsDirectory, 'registry_alignment_summary.md'),
  reportJson: path.join(reportsDirectory, 'registry_alignment_report.json'),
  matchedTermsJson: path.join(alignmentRoot, 'matched_registry_terms.json'),
  unmatchedTermsJson: path.join(alignmentRoot, 'unmatched_registry_terms.json'),
  unmatchedExtractedHeadwordsJson: path.join(alignmentRoot, 'unmatched_extracted_headwords.json'),
  duplicateExtractedHeadwordsJson: path.join(alignmentRoot, 'duplicate_extracted_headwords.json'),
  noisyExtractedCandidatesJson: path.join(alignmentRoot, 'noisy_extracted_candidates.json'),
  candidateNewTermsJson: path.join(alignmentRoot, 'candidate_new_terms.json'),
  runtimeCollisionReportJson: path.join(alignmentRoot, 'runtime_collision_report.json'),
});

const boundaryAuditPath = path.join(repoRoot, 'docs/boundary/meaning-coverage-audit.json');
const duplicateGroupsPath = path.join(repoRoot, 'docs/boundary/duplicate-term-groups.json');
const highRiskQueuePath = path.join(repoRoot, 'docs/boundary/high-risk-meaning-queue.json');
const safeBatchCandidatesPath = path.join(repoRoot, 'docs/boundary/safe-batch-candidates.json');

const genericExtractedHeadwords = new Set([
  'appendix',
  'bibliography',
  'black',
  'chapter',
  'containing',
  'copyright',
  'definitions of the terms and phrases',
  'dictionary',
  'english',
  'index',
  'preface',
  'table',
  'title',
]);

function toWindowsPath(filePath) {
  if (filePath.startsWith('/mnt/c/')) {
    return `C:\\${filePath.slice('/mnt/c/'.length).replaceAll('/', '\\')}`;
  }

  return filePath;
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

function loadNdjson(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line));
}

function buildExtractedHeadwordIndex() {
  const files = fs.readdirSync(segmentationDirectory)
    .filter((fileName) => fileName.endsWith('.ndjson'))
    .sort((left, right) => left.localeCompare(right));
  const recordsByNormalizedHeadword = new Map();
  const sourceCountsByHeadword = new Map();
  let totalCandidateRows = 0;

  for (const fileName of files) {
    const filePath = path.join(segmentationDirectory, fileName);
    const rows = loadNdjson(filePath);
    totalCandidateRows += rows.length;

    for (const row of rows) {
      const normalizedHeadword = normalizeForComparison(row.headword);
      if (normalizedHeadword === '') {
        continue;
      }

      if (!recordsByNormalizedHeadword.has(normalizedHeadword)) {
        recordsByNormalizedHeadword.set(normalizedHeadword, []);
        sourceCountsByHeadword.set(normalizedHeadword, new Set());
      }

      recordsByNormalizedHeadword.get(normalizedHeadword).push({
        sourceId: row.sourceId,
        sourceTitle: row.sourceTitle,
        year: row.year,
        volume: row.volume,
        sourceFile: row.sourceFile,
        page: row.page,
        lineNumber: row.lineNumber,
        headword: row.headword,
        rawLine: row.rawLine,
        contextPreview: row.contextPreview,
        parseConfidence: row.parseConfidence,
      });
      sourceCountsByHeadword.get(normalizedHeadword).add(row.sourceId);
    }
  }

  return {
    files,
    totalCandidateRows,
    recordsByNormalizedHeadword,
    sourceCountsByHeadword,
  };
}

function buildAliasMaps(duplicateGroups) {
  const aliasGroupByTerm = new Map();
  const normalizedAliasesByTerm = new Map();

  for (const group of duplicateGroups.likelyAliasGroups) {
    const normalizedAliases = new Set([
      normalizeForComparison(group.canonicalKey),
      ...group.terms.map((termRecord) => normalizeForComparison(termRecord.term)),
    ]);

    for (const termRecord of group.terms) {
      const normalizedTerm = normalizeForComparison(termRecord.term);
      aliasGroupByTerm.set(termRecord.term, group);
      aliasGroupByTerm.set(normalizedTerm, group);
      normalizedAliasesByTerm.set(termRecord.term, normalizedAliases);
      normalizedAliasesByTerm.set(normalizedTerm, normalizedAliases);
    }
  }

  return {
    aliasGroupByTerm,
    normalizedAliasesByTerm,
  };
}

function isProbableReviewMatch(registryTermKey, extractedHeadwordKey) {
  if (registryTermKey.length < 6 || extractedHeadwordKey.length < 6) {
    return false;
  }

  const registryWords = registryTermKey.split(' ');
  const extractedWords = extractedHeadwordKey.split(' ');
  if (registryWords.length < 2 && extractedWords.length < 2) {
    return false;
  }

  return (
    extractedHeadwordKey.startsWith(`${registryTermKey} `)
    || registryTermKey.startsWith(`${extractedHeadwordKey} `)
  );
}

function compactReferences(records) {
  const seen = new Set();
  const references = [];

  for (const record of records) {
    const key = [
      record.sourceId,
      record.page,
      record.lineNumber,
      record.headword,
    ].join('::');

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    references.push(record);
  }

  return references
    .sort((left, right) => (
      left.sourceId.localeCompare(right.sourceId)
      || left.page - right.page
      || left.lineNumber - right.lineNumber
      || left.headword.localeCompare(right.headword)
    ))
    .slice(0, 12);
}

function getRuntimeCollision(term) {
  const normalizedTerm = normalizeForComparison(term);
  const collisions = [];

  if (LIVE_CONCEPT_IDS.includes(normalizedTerm)) {
    collisions.push('live_runtime_concept');
  }
  if (VISIBLE_ONLY_PUBLIC_CONCEPT_IDS.includes(normalizedTerm)) {
    collisions.push('visible_only_public_concept');
  }
  if (REJECTED_CONCEPT_IDS.includes(normalizedTerm)) {
    collisions.push('rejected_concept');
  }
  if (DETAIL_BACKED_CONCEPT_IDS.includes(normalizedTerm)) {
    collisions.push('detail_backed_concept');
  }

  return collisions;
}

function incrementNestedCount(target, group, status) {
  if (!target[group]) {
    target[group] = {
      total: 0,
      matched: 0,
      unmatched: 0,
      exact_normalized_match: 0,
      alias_assisted_match: 0,
      probable_review_match: 0,
    };
  }

  target[group].total += 1;
  if (status === 'no_match') {
    target[group].unmatched += 1;
  } else {
    target[group].matched += 1;
    target[group][status] += 1;
  }
}

function buildRiskTierMap(highRiskQueue, safeBatchCandidates) {
  const riskByTerm = new Map();

  for (const term of highRiskQueue.highRiskTerms) {
    riskByTerm.set(term.term, 'high');
    riskByTerm.set(normalizeForComparison(term.term), 'high');
  }

  for (const family of safeBatchCandidates.safestFamilies ?? []) {
    for (const sampleTerm of family.sampleTerms ?? []) {
      const normalized = normalizeForComparison(sampleTerm);
      if (!riskByTerm.has(sampleTerm) && !riskByTerm.has(normalized)) {
        riskByTerm.set(sampleTerm, 'low');
        riskByTerm.set(normalized, 'low');
      }
    }
  }

  return riskByTerm;
}

function findProbableReviewMatches(termKey, extractedKeys) {
  return extractedKeys
    .filter((candidateKey) => isProbableReviewMatch(termKey, candidateKey))
    .slice(0, 5);
}

function alignRegistryTerms({
  extractedIndex,
  aliasMaps,
  riskTierByTerm,
}) {
  const response = buildVocabularyBoundaryResponse();
  const extractedKeys = [...extractedIndex.recordsByNormalizedHeadword.keys()].sort((left, right) => left.localeCompare(right));
  const matchedRegistryTerms = [];
  const unmatchedRegistryTerms = [];
  const runtimeCollisions = [];
  const matchedExtractedKeys = new Set();

  const countsByBucket = {};
  const countsByFamily = {};
  const countsByRiskTier = {};
  const matchStatusCounts = {
    exact_normalized_match: 0,
    alias_assisted_match: 0,
    probable_review_match: 0,
    no_match: 0,
  };

  for (const entry of response.entries) {
    const termKey = normalizeForComparison(entry.term);
    const riskTier = riskTierByTerm.get(entry.term) ?? riskTierByTerm.get(termKey) ?? 'medium_or_unclassified';
    const runtimeCollisionTypes = getRuntimeCollision(entry.term);
    let matchStatus = 'no_match';
    let matchedKeys = [];
    let matchedVia = null;

    if (extractedIndex.recordsByNormalizedHeadword.has(termKey)) {
      matchStatus = 'exact_normalized_match';
      matchedKeys = [termKey];
      matchedVia = entry.term;
    } else {
      const aliases = aliasMaps.normalizedAliasesByTerm.get(entry.term) ?? aliasMaps.normalizedAliasesByTerm.get(termKey);
      const aliasMatch = aliases ? [...aliases].find((aliasKey) => extractedIndex.recordsByNormalizedHeadword.has(aliasKey)) : null;

      if (aliasMatch) {
        matchStatus = 'alias_assisted_match';
        matchedKeys = [aliasMatch];
        matchedVia = aliasMatch;
      } else {
        const reviewMatches = findProbableReviewMatches(termKey, extractedKeys);
        if (reviewMatches.length > 0) {
          matchStatus = 'probable_review_match';
          matchedKeys = reviewMatches;
          matchedVia = 'conservative_prefix_review';
        }
      }
    }

    matchStatusCounts[matchStatus] += 1;
    incrementNestedCount(countsByBucket, entry.classification, matchStatus);
    incrementNestedCount(countsByFamily, entry.familyLabel, matchStatus);
    incrementNestedCount(countsByRiskTier, riskTier, matchStatus);

    if (runtimeCollisionTypes.length > 0) {
      runtimeCollisions.push({
        term: entry.term,
        family: entry.familyLabel,
        classification: entry.classification,
        matchStatus,
        runtimeCollisionTypes,
        replacementWorkflowAllowed: false,
      });
    }

    if (matchStatus === 'no_match') {
      unmatchedRegistryTerms.push({
        term: entry.term,
        family: entry.familyLabel,
        classification: entry.classification,
        sourceStatus: entry.sourceStatus,
        riskTier,
        normalizedTerm: termKey,
      });
      continue;
    }

    matchedKeys.forEach((key) => matchedExtractedKeys.add(key));
    const references = compactReferences(
      matchedKeys.flatMap((key) => extractedIndex.recordsByNormalizedHeadword.get(key) ?? []),
    );
    const supportingSourceIds = [...new Set(references.map((reference) => reference.sourceId))].sort();

    matchedRegistryTerms.push({
      term: entry.term,
      normalizedTerm: termKey,
      family: entry.familyLabel,
      classification: entry.classification,
      sourceStatus: entry.sourceStatus,
      riskTier,
      matchStatus,
      matchedVia,
      matchedExtractedHeadwords: matchedKeys,
      supportingSourceIds,
      supportingReferenceCount: references.length,
      hasMultipleSupportingBlackReferences: supportingSourceIds.length > 1 || references.length > 1,
      runtimeCollisionTypes,
      replacementWorkflowAllowed: runtimeCollisionTypes.length === 0,
      references,
    });
  }

  const unmatchedExtractedHeadwords = extractedKeys
    .filter((key) => !matchedExtractedKeys.has(key))
    .map((key) => {
      const records = extractedIndex.recordsByNormalizedHeadword.get(key) ?? [];
      const sourceIds = [...new Set(records.map((record) => record.sourceId))].sort();
      return {
        normalizedHeadword: key,
        displayHeadwords: [...new Set(records.map((record) => record.headword))].sort().slice(0, 10),
        occurrenceCount: records.length,
        sourceIds,
        references: compactReferences(records),
      };
    })
    .sort((left, right) => (
      right.occurrenceCount - left.occurrenceCount
      || left.normalizedHeadword.localeCompare(right.normalizedHeadword)
    ));

  const candidateNewTerms = unmatchedExtractedHeadwords
    .filter((headword) => (
      headword.occurrenceCount >= 2
      && headword.normalizedHeadword.length >= 4
      && !genericExtractedHeadwords.has(headword.normalizedHeadword)
    ))
    .map((headword) => ({
      ...headword,
      liveRegistryAction: 'do_not_add_from_proof',
      note: 'Candidate extracted headword only; keep separate from the live registry.',
    }));

  const duplicateExtractedHeadwords = unmatchedExtractedHeadwords
    .filter((headword) => headword.occurrenceCount > 1);

  const noisyExtractedCandidates = unmatchedExtractedHeadwords
    .filter((headword) => (
      headword.normalizedHeadword.length < 4
      || genericExtractedHeadwords.has(headword.normalizedHeadword)
      || /^[a-z]\s[a-z]/.test(headword.normalizedHeadword)
    ));

  return {
    totalRegistryTerms: response.entries.length,
    matchedRegistryTerms,
    unmatchedRegistryTerms,
    unmatchedExtractedHeadwords,
    candidateNewTerms,
    duplicateExtractedHeadwords,
    noisyExtractedCandidates,
    runtimeCollisions,
    counts: {
      matchStatusCounts,
      countsByBucket,
      countsByFamily,
      countsByRiskTier,
      extractedCandidateRows: extractedIndex.totalCandidateRows,
      uniqueExtractedHeadwords: extractedIndex.recordsByNormalizedHeadword.size,
      matchedExtractedHeadwordKeys: matchedExtractedKeys.size,
    },
  };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function buildSummaryMarkdown(report) {
  const matchedCount = report.matchedRegistryTerms.length;
  const unmatchedCount = report.unmatchedRegistryTerms.length;
  const exactCount = report.counts.matchStatusCounts.exact_normalized_match;
  const aliasCount = report.counts.matchStatusCounts.alias_assisted_match;
  const reviewCount = report.counts.matchStatusCounts.probable_review_match;
  const strictMatchCount = exactCount + aliasCount;
  const coverage = report.totalRegistryTerms === 0 ? 0 : matchedCount / report.totalRegistryTerms;
  const strictCoverage = report.totalRegistryTerms === 0 ? 0 : strictMatchCount / report.totalRegistryTerms;
  const multipleReferenceCount = report.matchedRegistryTerms.filter((term) => term.hasMultipleSupportingBlackReferences).length;
  const strictMultipleReferenceCount = report.matchedRegistryTerms
    .filter((term) => (
      (term.matchStatus === 'exact_normalized_match' || term.matchStatus === 'alias_assisted_match')
      && term.hasMultipleSupportingBlackReferences
    )).length;
  const bucketRows = Object.entries(report.counts.countsByBucket)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([bucket, counts]) => [
      bucket,
      counts.total,
      counts.matched,
      counts.unmatched,
      counts.exact_normalized_match,
      counts.alias_assisted_match,
      counts.probable_review_match,
    ]);
  const riskRows = Object.entries(report.counts.countsByRiskTier)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([riskTier, counts]) => [
      riskTier,
      counts.total,
      counts.matched,
      counts.unmatched,
      counts.exact_normalized_match,
      counts.alias_assisted_match,
      counts.probable_review_match,
    ]);

  return [
    '# Registry Alignment Proof',
    '',
    'Scope: direct-text Black 1910 and Black 1891 headword candidates aligned against the ChatPDM recognized vocabulary boundary. This proof does not author meanings, build the final merged corpus, process Bouvier/OCR sources, add registry terms, or modify runtime ontology/boundary content.',
    '',
    '## Implemented / Partial / Missing / Not Evidenced',
    '',
    '- Implemented: conservative normalized matching, alias-group assisted matching, review-only prefix matches, runtime collision reporting, and coverage reports.',
    '- Partial: extracted records are headword candidates, not finalized dictionary entries.',
    '- Missing: final reference corpus, entry-level segmentation, frontend reference index, Bouvier/OCR lanes, and meaning authoring.',
    '- Not evidenced: legal meaning accuracy, source sufficiency for each term, or review approval for candidate new terms.',
    '',
    '## Coverage',
    '',
    `- Total boundary registry terms: ${report.totalRegistryTerms}`,
    `- Strict Black reference hits (exact or alias-assisted): ${strictMatchCount}`,
    `- Strict Black reference coverage: ${(strictCoverage * 100).toFixed(2)}%`,
    `- Probable review-only hits: ${reviewCount}`,
    `- Any alignment hit including review-only: ${matchedCount}`,
    `- Terms without a Black reference hit: ${unmatchedCount}`,
    `- Any-hit coverage: ${(coverage * 100).toFixed(2)}%`,
    `- Strict hits with multiple supporting Black references: ${strictMultipleReferenceCount}`,
    `- Any-hit terms with multiple Black references: ${multipleReferenceCount}`,
    `- Extracted candidate rows: ${report.counts.extractedCandidateRows}`,
    `- Unique extracted headwords: ${report.counts.uniqueExtractedHeadwords}`,
    `- Runtime collisions reported: ${report.runtimeCollisions.length}`,
    '',
    '## Match Status Counts',
    '',
    `- exact_normalized_match: ${report.counts.matchStatusCounts.exact_normalized_match}`,
    `- alias_assisted_match: ${report.counts.matchStatusCounts.alias_assisted_match}`,
    `- probable_review_match: ${report.counts.matchStatusCounts.probable_review_match}`,
    `- no_match: ${report.counts.matchStatusCounts.no_match}`,
    '',
    '## Counts By Bucket',
    '',
    markdownTable(
      ['Bucket', 'Total', 'Matched', 'Unmatched', 'Exact', 'Alias', 'Review'],
      bucketRows,
    ),
    '',
    '## Counts By Risk Tier',
    '',
    markdownTable(
      ['Risk tier', 'Total', 'Matched', 'Unmatched', 'Exact', 'Alias', 'Review'],
      riskRows,
    ),
    '',
    '## Extracted Candidate Reporting',
    '',
    `- Unmatched extracted headwords: ${report.unmatchedExtractedHeadwords.length}`,
    `- Likely duplicate extracted headwords: ${report.duplicateExtractedHeadwords.length}`,
    `- Likely noisy/unhelpful extracted candidates: ${report.noisyExtractedCandidates.length}`,
    `- Candidate new terms kept separate from live registry: ${report.candidateNewTerms.length}`,
    '',
    '## Recommendation',
    '',
    '- Black 1910 + Black 1891 are sufficient to begin a first reference-backed meaning batch only for matched, low-risk or medium-risk registry terms after manual review of cited snippets.',
    '- Keep high-risk and runtime-collision terms out of replacement workflows.',
    '- Defer Bouvier until the matched Black coverage is reviewed and first-batch yield is known.',
    '',
    '## Exact Next Prompt',
    '',
    'Task: Review the matched low-risk registry terms from the Black alignment proof and select a first reference-backed meaning-authoring batch. Do not author meanings yet; produce an approval queue with term, family, risk tier, matched source references, alias-group notes, and skip reasons for high-risk/runtime-collision terms.',
    '',
    '## Generated Outputs',
    '',
    ...Object.values(outputPaths).map((filePath) => `- \`${toWindowsPath(filePath)}\``),
    '',
  ].join('\n');
}

function main() {
  fs.mkdirSync(reportsDirectory, { recursive: true });

  const boundaryAudit = readJson(boundaryAuditPath);
  const duplicateGroups = readJson(duplicateGroupsPath);
  const highRiskQueue = readJson(highRiskQueuePath);
  const safeBatchCandidates = readJson(safeBatchCandidatesPath);
  const extractedIndex = buildExtractedHeadwordIndex();
  const aliasMaps = buildAliasMaps(duplicateGroups);
  const riskTierByTerm = buildRiskTierMap(highRiskQueue, safeBatchCandidates);
  const alignment = alignRegistryTerms({
    extractedIndex,
    aliasMaps,
    riskTierByTerm,
  });

  const matchedCount = alignment.matchedRegistryTerms.length;
  const strictMatchedCount = (
    alignment.counts.matchStatusCounts.exact_normalized_match
    + alignment.counts.matchStatusCounts.alias_assisted_match
  );
  const coverage = alignment.totalRegistryTerms === 0 ? 0 : matchedCount / alignment.totalRegistryTerms;
  const strictCoverage = alignment.totalRegistryTerms === 0
    ? 0
    : strictMatchedCount / alignment.totalRegistryTerms;
  const report = {
    generatedAt: new Date().toISOString(),
    scope: 'direct-text Black reference alignment proof',
    boundaryDiscipline: {
      meaningAuthoringPerformed: false,
      finalMergedCorpusBuilt: false,
      nonBlackSourcesProcessed: false,
      boundaryContentChanged: false,
      runtimeOntologyChanged: false,
      liveConceptPacketsTouched: false,
    },
    inputFiles: {
      segmentationDirectory: toWindowsPath(segmentationDirectory),
      boundaryAudit: path.relative(repoRoot, boundaryAuditPath),
      duplicateGroups: path.relative(repoRoot, duplicateGroupsPath),
      highRiskQueue: path.relative(repoRoot, highRiskQueuePath),
      safeBatchCandidates: path.relative(repoRoot, safeBatchCandidatesPath),
    },
    priorBoundaryBaseline: {
      totalRecognizedLegalVocabularyTerms: boundaryAudit.counts.totalRecognizedLegalVocabularyTerms,
      authoredMeaningCount: boundaryAudit.counts.authoredMeaningCount,
      missingMeaningCount: boundaryAudit.counts.missingMeaningCount,
    },
    coverage: {
      totalRegistryTerms: alignment.totalRegistryTerms,
      matchedRegistryTerms: matchedCount,
      unmatchedRegistryTerms: alignment.unmatchedRegistryTerms.length,
      coverageRatio: Number(coverage.toFixed(6)),
      coveragePercent: Number((coverage * 100).toFixed(2)),
      strictMatchedRegistryTerms: strictMatchedCount,
      strictCoverageRatio: Number(strictCoverage.toFixed(6)),
      strictCoveragePercent: Number((strictCoverage * 100).toFixed(2)),
      probableReviewOnlyTerms: alignment.counts.matchStatusCounts.probable_review_match,
      termsWithAtLeastOneSupportingBlackReference: strictMatchedCount,
      termsWithMultipleSupportingBlackReferences: alignment.matchedRegistryTerms
        .filter((term) => (
          (term.matchStatus === 'exact_normalized_match' || term.matchStatus === 'alias_assisted_match')
          && term.hasMultipleSupportingBlackReferences
        )).length,
      termsWithAnyBlackReferenceCandidate: matchedCount,
      termsWithMultipleBlackReferenceCandidates: alignment.matchedRegistryTerms
        .filter((term) => term.hasMultipleSupportingBlackReferences).length,
    },
    counts: alignment.counts,
    outputFiles: Object.fromEntries(
      Object.entries(outputPaths).map(([key, filePath]) => [key, toWindowsPath(filePath)]),
    ),
  };

  writeJson(outputPaths.reportJson, report);
  writeJson(outputPaths.matchedTermsJson, alignment.matchedRegistryTerms);
  writeJson(outputPaths.unmatchedTermsJson, alignment.unmatchedRegistryTerms);
  writeJson(outputPaths.unmatchedExtractedHeadwordsJson, alignment.unmatchedExtractedHeadwords);
  writeJson(outputPaths.duplicateExtractedHeadwordsJson, alignment.duplicateExtractedHeadwords);
  writeJson(outputPaths.noisyExtractedCandidatesJson, alignment.noisyExtractedCandidates);
  writeJson(outputPaths.candidateNewTermsJson, alignment.candidateNewTerms);
  writeJson(outputPaths.runtimeCollisionReportJson, alignment.runtimeCollisions);
  fs.writeFileSync(outputPaths.summaryMarkdown, buildSummaryMarkdown({
    ...alignment,
    coverage: report.coverage,
  }), 'utf8');

  Object.values(outputPaths).forEach((filePath) => {
    process.stdout.write(`Wrote ${toWindowsPath(filePath)}\n`);
  });
}

main();
