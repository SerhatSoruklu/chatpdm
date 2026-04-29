'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  EMPTY_NORMALIZED_QUERY,
} = require('../../../src/modules/concepts/constants');
const {
  deriveRoutingText,
  normalizeQuery,
} = require('../../../src/modules/concepts/normalizer');
const {
  NO_TERM_SPECIFIC_MEANING_IN_LAW,
} = require('../../../src/modules/inspectable-item-contract');
const {
  EXPLICIT_CLASSIFICATION_OVERRIDES,
  HEADER_TO_CLASSIFICATION,
  datasetPath,
  loadLegalVocabularyRegistry,
} = require('../../../src/modules/legal-vocabulary/recognition-registry-loader');
const {
  buildVocabularyBoundaryResponse,
} = require('../../../src/modules/legal-vocabulary/vocabulary-boundary');

const repoRoot = path.resolve(__dirname, '../../../..');
const outputDirectory = path.join(repoRoot, 'docs/boundary');

const outputPaths = Object.freeze({
  summaryMarkdown: path.join(outputDirectory, 'meaning-coverage-summary.md'),
  coverageAudit: path.join(outputDirectory, 'meaning-coverage-audit.json'),
  duplicateGroups: path.join(outputDirectory, 'duplicate-term-groups.json'),
  highRiskQueue: path.join(outputDirectory, 'high-risk-meaning-queue.json'),
  safeBatchCandidates: path.join(outputDirectory, 'safe-batch-candidates.json'),
});

const bucketRiskRank = Object.freeze({
  procedural: 1,
  carrier: 2,
  derived: 3,
  unknown_structure: 5,
  rejected_candidate: 6,
});

const riskSignals = Object.freeze([
  'abuse',
  'ambiguity',
  'balancing',
  'capacity',
  'claim',
  'classification',
  'competence',
  'conflict',
  'construction',
  'control',
  'discretion',
  'doctrine',
  'equity',
  'fairness',
  'good faith',
  'interest',
  'interpretation',
  'justiciability',
  'justice',
  'legitimacy',
  'liability',
  'public policy',
  'reasonableness',
  'right',
  'rule',
  'scope',
  'standing',
]);

function ensureOutputDirectory() {
  fs.mkdirSync(outputDirectory, { recursive: true });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function buildSurfaceForms(rawTerm) {
  const surfaceForms = new Set();
  const normalizedTerm = deriveRoutingText(normalizeQuery(rawTerm));

  if (normalizedTerm !== EMPTY_NORMALIZED_QUERY) {
    surfaceForms.add(normalizedTerm);
  }

  if (rawTerm.includes('_')) {
    const spacedVariant = deriveRoutingText(normalizeQuery(rawTerm.replaceAll('_', ' ')));
    if (spacedVariant !== EMPTY_NORMALIZED_QUERY) {
      surfaceForms.add(spacedVariant);
    }
  }

  return [...surfaceForms].sort((left, right) => left.localeCompare(right));
}

function parseRawDataset() {
  const rawRecords = [];
  const lines = fs.readFileSync(datasetPath, 'utf8').split(/\r?\n/);

  let activeFamily = null;
  let activeClassification = null;

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = rawLine.trim();

    if (line === '') {
      return;
    }

    const headerMatch = /^\[(.+)\]$/.exec(line);
    if (headerMatch) {
      activeFamily = headerMatch[1];
      activeClassification = HEADER_TO_CLASSIFICATION[activeFamily] ?? null;
      return;
    }

    if (!activeFamily || !activeClassification) {
      throw new Error(`Dataset term appears before a known header at line ${lineNumber}.`);
    }

    const canonicalSurface = normalizeQuery(line);
    rawRecords.push({
      rawTerm: line,
      normalizedRawTerm: canonicalSurface,
      lineNumber,
      family: activeFamily,
      classification: EXPLICIT_CLASSIFICATION_OVERRIDES[canonicalSurface] ?? activeClassification,
      generatedSurfaceForms: buildSurfaceForms(line),
    });
  });

  return rawRecords;
}

function canonicalizeVariant(value) {
  return normalizeQuery(value)
    .replaceAll('_', ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeMeaning(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function countWords(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function hasAuthoredMeaning(entry) {
  return typeof entry.meaningInLaw === 'string' && entry.meaningInLaw.trim() !== '';
}

function classifyMeaning(entry) {
  if (typeof entry.meaningInLaw !== 'string') {
    return {
      presence: 'missing',
      weakness: 'missing',
    };
  }

  const trimmed = entry.meaningInLaw.trim();
  if (trimmed === '') {
    return {
      presence: 'missing',
      weakness: 'empty',
    };
  }

  if (trimmed === NO_TERM_SPECIFIC_MEANING_IN_LAW) {
    return {
      presence: 'missing',
      weakness: 'placeholder',
    };
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.includes('registry-only term')
    || lower.includes('recognized legal vocabulary')
    || lower.includes('not backed by a published concept packet')
    || lower.includes('visible in the registry only')
  ) {
    return {
      presence: 'authored',
      weakness: 'generic',
    };
  }

  if (countWords(trimmed) < 4) {
    return {
      presence: 'authored',
      weakness: 'weak_short',
    };
  }

  return {
    presence: 'authored',
    weakness: 'implemented',
  };
}

function incrementCounter(target, key, by = 1) {
  target[key] = (target[key] ?? 0) + by;
}

function buildCounts(entries) {
  const byBucket = {};
  const byFamily = {};
  const byBucketAndMeaningPresence = {};
  const byFamilyAndMeaningPresence = {};
  const bySourceStatus = {};

  let authoredMeaningCount = 0;
  let missingMeaningCount = 0;

  for (const entry of entries) {
    const meaning = classifyMeaning(entry);
    const familyKey = entry.familyLabel;

    incrementCounter(byBucket, entry.classification);
    incrementCounter(byFamily, familyKey);
    incrementCounter(bySourceStatus, entry.sourceStatus);

    if (!byBucketAndMeaningPresence[entry.classification]) {
      byBucketAndMeaningPresence[entry.classification] = {
        total: 0,
        authored: 0,
        missing: 0,
        weakAuthored: 0,
      };
    }

    if (!byFamilyAndMeaningPresence[familyKey]) {
      byFamilyAndMeaningPresence[familyKey] = {
        total: 0,
        authored: 0,
        missing: 0,
        weakAuthored: 0,
      };
    }

    byBucketAndMeaningPresence[entry.classification].total += 1;
    byFamilyAndMeaningPresence[familyKey].total += 1;

    if (meaning.presence === 'authored') {
      authoredMeaningCount += 1;
      byBucketAndMeaningPresence[entry.classification].authored += 1;
      byFamilyAndMeaningPresence[familyKey].authored += 1;

      if (meaning.weakness !== 'implemented') {
        byBucketAndMeaningPresence[entry.classification].weakAuthored += 1;
        byFamilyAndMeaningPresence[familyKey].weakAuthored += 1;
      }
    } else {
      missingMeaningCount += 1;
      byBucketAndMeaningPresence[entry.classification].missing += 1;
      byFamilyAndMeaningPresence[familyKey].missing += 1;
    }
  }

  return {
    totalRecognizedLegalVocabularyTerms: entries.length,
    authoredMeaningCount,
    missingMeaningCount,
    byBucket,
    byFamily,
    bySourceStatus,
    byBucketAndMeaningPresence,
    byFamilyAndMeaningPresence,
  };
}

function buildDuplicateAudit(entries, rawRecords) {
  const variantGroups = new Map();
  const duplicateMeaningGroups = new Map();
  const rawTermGroups = new Map();
  const generatedSurfaceGroups = new Map();

  for (const entry of entries) {
    const key = canonicalizeVariant(entry.term);
    if (!variantGroups.has(key)) {
      variantGroups.set(key, []);
    }
    variantGroups.get(key).push({
      term: entry.term,
      family: entry.familyLabel,
      classification: entry.classification,
      sourceStatus: entry.sourceStatus,
      hasAuthoredMeaning: hasAuthoredMeaning(entry),
    });

    if (hasAuthoredMeaning(entry)) {
      const meaningKey = normalizeMeaning(entry.meaningInLaw);
      if (!duplicateMeaningGroups.has(meaningKey)) {
        duplicateMeaningGroups.set(meaningKey, []);
      }
      duplicateMeaningGroups.get(meaningKey).push({
        term: entry.term,
        family: entry.familyLabel,
        classification: entry.classification,
        meaningInLaw: entry.meaningInLaw,
      });
    }
  }

  for (const rawRecord of rawRecords) {
    if (!rawTermGroups.has(rawRecord.normalizedRawTerm)) {
      rawTermGroups.set(rawRecord.normalizedRawTerm, []);
    }
    rawTermGroups.get(rawRecord.normalizedRawTerm).push(rawRecord);

    for (const generatedSurfaceForm of rawRecord.generatedSurfaceForms) {
      if (!generatedSurfaceGroups.has(generatedSurfaceForm)) {
        generatedSurfaceGroups.set(generatedSurfaceForm, []);
      }
      generatedSurfaceGroups.get(generatedSurfaceForm).push(rawRecord);
    }
  }

  const likelyAliasGroups = [...variantGroups.entries()]
    .filter(([, terms]) => terms.length > 1)
    .map(([canonicalKey, terms]) => ({
      canonicalKey,
      count: terms.length,
      terms: terms.sort((left, right) => left.term.localeCompare(right.term)),
    }))
    .sort((left, right) => (
      right.count - left.count
      || left.canonicalKey.localeCompare(right.canonicalKey)
    ));

  const exactDuplicateMeaningGroups = [...duplicateMeaningGroups.entries()]
    .filter(([, terms]) => terms.length > 1)
    .map(([meaningKey, terms]) => ({
      normalizedMeaning: meaningKey,
      count: terms.length,
      terms: terms.sort((left, right) => left.term.localeCompare(right.term)),
    }))
    .sort((left, right) => (
      right.count - left.count
      || left.normalizedMeaning.localeCompare(right.normalizedMeaning)
    ));

  const rawDuplicateDisplayNames = [...rawTermGroups.entries()]
    .filter(([, records]) => records.length > 1)
    .map(([normalizedRawTerm, records]) => ({
      normalizedRawTerm,
      count: records.length,
      records: records.map((record) => ({
        rawTerm: record.rawTerm,
        lineNumber: record.lineNumber,
        family: record.family,
        classification: record.classification,
      })),
    }))
    .sort((left, right) => (
      right.count - left.count
      || left.normalizedRawTerm.localeCompare(right.normalizedRawTerm)
    ));

  const generatedSurfaceCollisions = [...generatedSurfaceGroups.entries()]
    .filter(([, records]) => records.length > 1)
    .map(([surfaceForm, records]) => ({
      surfaceForm,
      count: records.length,
      records: records.map((record) => ({
        rawTerm: record.rawTerm,
        lineNumber: record.lineNumber,
        family: record.family,
        classification: record.classification,
      })),
    }))
    .sort((left, right) => (
      right.count - left.count
      || left.surfaceForm.localeCompare(right.surfaceForm)
    ));

  return {
    summary: {
      likelyAliasGroupCount: likelyAliasGroups.length,
      termsInLikelyAliasGroups: likelyAliasGroups.reduce((sum, group) => sum + group.count, 0),
      exactDuplicateMeaningGroupCount: exactDuplicateMeaningGroups.length,
      rawDuplicateDisplayNameGroupCount: rawDuplicateDisplayNames.length,
      generatedSurfaceCollisionGroupCount: generatedSurfaceCollisions.length,
    },
    likelyAliasGroups,
    exactDuplicateMeaningGroups,
    rawDuplicateDisplayNames,
    generatedSurfaceCollisions,
  };
}

function buildWeakContentAudit(entries) {
  const groups = {
    missing: [],
    empty: [],
    placeholder: [],
    generic: [],
    weak_short: [],
  };

  for (const entry of entries) {
    const meaning = classifyMeaning(entry);
    if (meaning.weakness === 'implemented') {
      continue;
    }

    groups[meaning.weakness].push({
      term: entry.term,
      family: entry.familyLabel,
      classification: entry.classification,
      sourceStatus: entry.sourceStatus,
      meaningInLaw: entry.meaningInLaw,
    });
  }

  Object.values(groups).forEach((items) => {
    items.sort((left, right) => left.term.localeCompare(right.term));
  });

  return {
    summary: Object.fromEntries(
      Object.entries(groups).map(([key, items]) => [key, items.length]),
    ),
    groups,
  };
}

function getRiskProfile(entry, duplicateAudit) {
  const signals = [];

  if (entry.classification === 'unknown_structure') {
    signals.push('bucket:unknown_structure');
  }

  if (entry.classification === 'rejected_candidate') {
    signals.push('bucket:rejected_candidate');
  }

  if (entry.sourceStatus === 'packet_backed') {
    signals.push('packet_backed:review_before_reauthoring');
  }

  const normalizedTerm = canonicalizeVariant(entry.term);
  riskSignals.forEach((signal) => {
    if (normalizedTerm.includes(signal)) {
      signals.push(`lexical:${signal}`);
    }
  });

  const aliasGroup = duplicateAudit.likelyAliasGroups.find((group) => (
    group.terms.some((termRecord) => termRecord.term === entry.term)
  ));

  if (aliasGroup) {
    signals.push('canonicalization_alias_group');
  }

  let riskLevel = 'low';
  if (
    entry.classification === 'unknown_structure'
    || entry.classification === 'rejected_candidate'
    || signals.some((signal) => signal.startsWith('lexical:'))
  ) {
    riskLevel = 'high';
  } else if (
    entry.classification === 'derived'
    || aliasGroup
    || entry.sourceStatus === 'packet_backed'
  ) {
    riskLevel = 'medium';
  }

  return {
    riskLevel,
    riskSignals: signals,
  };
}

function buildStructuralRiskAudit(entries, duplicateAudit) {
  const highRiskTerms = [];
  const riskCounts = {
    high: 0,
    medium: 0,
    low: 0,
  };
  const familyRisk = {};

  for (const entry of entries) {
    const profile = getRiskProfile(entry, duplicateAudit);
    riskCounts[profile.riskLevel] += 1;

    if (!familyRisk[entry.familyLabel]) {
      familyRisk[entry.familyLabel] = {
        family: entry.familyLabel,
        classification: entry.classification,
        total: 0,
        high: 0,
        medium: 0,
        low: 0,
        missingMeaning: 0,
      };
    }

    familyRisk[entry.familyLabel].total += 1;
    familyRisk[entry.familyLabel][profile.riskLevel] += 1;
    if (!hasAuthoredMeaning(entry)) {
      familyRisk[entry.familyLabel].missingMeaning += 1;
    }

    if (profile.riskLevel === 'high') {
      highRiskTerms.push({
        term: entry.term,
        family: entry.familyLabel,
        classification: entry.classification,
        sourceStatus: entry.sourceStatus,
        hasAuthoredMeaning: hasAuthoredMeaning(entry),
        riskSignals: profile.riskSignals,
      });
    }
  }

  highRiskTerms.sort((left, right) => (
    left.family.localeCompare(right.family)
    || left.term.localeCompare(right.term)
  ));

  const familyRiskSummary = Object.values(familyRisk)
    .sort((left, right) => (
      right.high - left.high
      || right.total - left.total
      || left.family.localeCompare(right.family)
    ));

  return {
    summary: {
      riskCounts,
      highRiskTermCount: highRiskTerms.length,
      note: 'High risk means the term should be reviewed manually before batch meaning authoring. It is not an ontology judgment.',
    },
    highRiskTerms,
    familyRiskSummary,
  };
}

function buildSafeBatchCandidates(entries, duplicateAudit) {
  const aliasTerms = new Set(
    duplicateAudit.likelyAliasGroups.flatMap((group) => (
      group.terms.map((termRecord) => termRecord.term)
    )),
  );
  const familyCandidates = new Map();

  for (const entry of entries) {
    const riskProfile = getRiskProfile(entry, duplicateAudit);
    const meaning = classifyMeaning(entry);
    const family = entry.familyLabel;

    if (!familyCandidates.has(family)) {
      familyCandidates.set(family, {
        family,
        classification: entry.classification,
        total: 0,
        missingMeaning: 0,
        authoredMeaning: 0,
        lowRiskMissing: 0,
        mediumRiskMissing: 0,
        highRiskMissing: 0,
        aliasTermCount: 0,
        sampleTerms: [],
      });
    }

    const candidate = familyCandidates.get(family);
    candidate.total += 1;

    if (aliasTerms.has(entry.term)) {
      candidate.aliasTermCount += 1;
    }

    if (meaning.presence === 'authored') {
      candidate.authoredMeaning += 1;
      continue;
    }

    candidate.missingMeaning += 1;

    if (riskProfile.riskLevel === 'low') {
      candidate.lowRiskMissing += 1;
      if (candidate.sampleTerms.length < 12) {
        candidate.sampleTerms.push(entry.term);
      }
    } else if (riskProfile.riskLevel === 'medium') {
      candidate.mediumRiskMissing += 1;
    } else {
      candidate.highRiskMissing += 1;
    }
  }

  const rankedFamilies = [...familyCandidates.values()]
    .map((candidate) => {
      const bucketRisk = bucketRiskRank[candidate.classification] ?? 9;
      const aliasRatio = candidate.total === 0 ? 0 : candidate.aliasTermCount / candidate.total;
      const safeScore = (
        candidate.lowRiskMissing * 10
        - candidate.mediumRiskMissing * 3
        - candidate.highRiskMissing * 8
        - Math.round(aliasRatio * 20)
        - bucketRisk * 5
      );

      return {
        ...candidate,
        aliasRatio: Number(aliasRatio.toFixed(4)),
        safeScore,
      };
    })
    .sort((left, right) => (
      right.safeScore - left.safeScore
      || right.lowRiskMissing - left.lowRiskMissing
      || left.family.localeCompare(right.family)
    ));

  const safestFamilies = rankedFamilies.filter((candidate) => candidate.lowRiskMissing > 0);

  return {
    summary: {
      rankedFamilyCount: rankedFamilies.length,
      lowRiskCandidateFamilyCount: safestFamilies.length,
      topTenSafestFamiliesOrGroups: rankedFamilies.slice(0, 10).map((candidate) => candidate.family),
      recommendedFirstBatchSize: 100,
      batchSizeGuidance: {
        lowRiskProceduralOrCarrier: 100,
        repetitiveAliasCleanupAfterCanonicalDecision: 250,
        mediumRiskDerived: 50,
        highRiskUnknownStructureOrRejectedCandidate: 25,
      },
    },
    rankedFamilies,
    safestFamilies,
  };
}

function toMarkdownTable(headers, rows) {
  const headerRow = `| ${headers.join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.join(' | ')} |`);
  return [headerRow, separator, ...body].join('\n');
}

function buildMarkdownSummary({
  counts,
  duplicateAudit,
  weakContentAudit,
  structuralRiskAudit,
  safeBatchCandidates,
  registry,
  response,
}) {
  const bucketRows = Object.entries(counts.byBucketAndMeaningPresence)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([bucket, bucketCounts]) => [
      bucket,
      bucketCounts.total,
      bucketCounts.authored,
      bucketCounts.missing,
      bucketCounts.weakAuthored,
    ]);

  const familyRows = Object.entries(counts.byFamilyAndMeaningPresence)
    .sort(([, leftCounts], [, rightCounts]) => (
      rightCounts.total - leftCounts.total
    ))
    .map(([family, familyCounts]) => [
      family,
      familyCounts.total,
      familyCounts.authored,
      familyCounts.missing,
    ]);

  const safestRows = safeBatchCandidates.rankedFamilies
    .slice(0, 10)
    .map((candidate, index) => [
      index + 1,
      candidate.family,
      candidate.classification,
      candidate.lowRiskMissing,
      candidate.mediumRiskMissing,
      candidate.highRiskMissing,
      candidate.aliasTermCount,
    ]);

  return [
    '# Boundary Meaning Coverage Audit',
    '',
    'Scope: recognized legal vocabulary boundary registry only. This report does not admit terms into runtime ontology and does not author new meanings.',
    '',
    '## Implemented / Partial / Missing / Not Evidenced',
    '',
    `- Implemented: ${counts.authoredMeaningCount} entries have a non-empty backend \`meaningInLaw\` value.`,
    `- Partial: ${weakContentAudit.summary.generic + weakContentAudit.summary.weak_short} authored entries were flagged as weak or generic.`,
    `- Missing: ${counts.missingMeaningCount} entries do not have authored backend \`meaningInLaw\`.`,
    '- Not evidenced: no external legal-source validation was performed in this audit; findings are based on repository data and deterministic heuristics only.',
    '',
    '## Exact Counts',
    '',
    `- Total recognized legal vocabulary terms: ${counts.totalRecognizedLegalVocabularyTerms}`,
    `- Terms with authored "Meaning in law": ${counts.authoredMeaningCount}`,
    `- Terms without authored meaning: ${counts.missingMeaningCount}`,
    `- Published concept packets reported by boundary surface: ${response.surfaceCounts.publishedConceptPackets}`,
    `- Current runtime boundary reported by boundary surface: ${response.surfaceCounts.liveRuntimeConcepts}`,
    `- Registry dataset path: \`${path.relative(repoRoot, registry.datasetPath)}\``,
    '',
    '## Counts By Bucket',
    '',
    toMarkdownTable(
      ['Bucket', 'Total', 'Authored meaning', 'Missing meaning', 'Weak authored'],
      bucketRows,
    ),
    '',
    '## Counts By Family',
    '',
    toMarkdownTable(
      ['Family', 'Total', 'Authored meaning', 'Missing meaning'],
      familyRows,
    ),
    '',
    '## Duplicate / Canonicalization Audit',
    '',
    `- Likely alias groups: ${duplicateAudit.summary.likelyAliasGroupCount}`,
    `- Terms inside likely alias groups: ${duplicateAudit.summary.termsInLikelyAliasGroups}`,
    `- Exact duplicate authored meaning groups: ${duplicateAudit.summary.exactDuplicateMeaningGroupCount}`,
    `- Raw duplicate display-name groups: ${duplicateAudit.summary.rawDuplicateDisplayNameGroupCount}`,
    `- Generated surface collision groups: ${duplicateAudit.summary.generatedSurfaceCollisionGroupCount}`,
    '',
    'Likely aliases are mostly spaced/underscored variants created by recognition-surface expansion. They should be canonicalized before large-scale authoring so one meaning can govern aliases without duplicated prose.',
    '',
    '## Placeholder / Weak Content Audit',
    '',
    `- Missing: ${weakContentAudit.summary.missing}`,
    `- Empty: ${weakContentAudit.summary.empty}`,
    `- Placeholder: ${weakContentAudit.summary.placeholder}`,
    `- Generic authored: ${weakContentAudit.summary.generic}`,
    `- Too short authored: ${weakContentAudit.summary.weak_short}`,
    '',
    '## Structural-Risk Audit',
    '',
    `- High risk queue: ${structuralRiskAudit.summary.highRiskTermCount}`,
    `- Risk counts: high ${structuralRiskAudit.summary.riskCounts.high}, medium ${structuralRiskAudit.summary.riskCounts.medium}, low ${structuralRiskAudit.summary.riskCounts.low}`,
    '',
    'High risk here means "manual review before batch meaning authoring"; it is not a claim that a term should become a runtime concept.',
    '',
    '## Top 10 Safest Families / Groups',
    '',
    toMarkdownTable(
      ['Rank', 'Family', 'Bucket', 'Low-risk missing', 'Medium-risk missing', 'High-risk missing', 'Alias terms'],
      safestRows,
    ),
    '',
    '## Recommendation',
    '',
    '- Safest first batch: start with the highest-ranked procedural/carrier families from `safe-batch-candidates.json`, skipping alias duplicates until canonical-display policy is set.',
    '- The top 10 table includes lower-risk procedural/carrier families first, then the least risky derived families as cautious follow-on groups.',
    '- Recommended first batch size: 100 terms.',
    '- Use 100-term batches for low-risk procedural/carrier rows, 50-term batches for derived rows, and 25-term review queues for unknown-structure or rejected-candidate rows.',
    '- Blockers before scale authoring: canonicalize spaced/underscored aliases, decide whether packet-backed rows should inherit packet wording or receive registry-specific wording, and keep every output explicitly registry-only.',
    '',
    '## Generated Artifacts',
    '',
    ...Object.values(outputPaths).map((filePath) => `- \`${path.relative(repoRoot, filePath)}\``),
    '',
  ].join('\n');
}

function buildAudit() {
  const registry = loadLegalVocabularyRegistry();
  const response = buildVocabularyBoundaryResponse();
  const rawRecords = parseRawDataset();
  const entries = response.entries;

  const counts = buildCounts(entries);
  const duplicateAudit = buildDuplicateAudit(entries, rawRecords);
  const weakContentAudit = buildWeakContentAudit(entries);
  const structuralRiskAudit = buildStructuralRiskAudit(entries, duplicateAudit);
  const safeBatchCandidates = buildSafeBatchCandidates(entries, duplicateAudit);

  const coverageAudit = {
    auditVersion: 1,
    scope: 'recognized legal vocabulary boundary registry only',
    sourceFiles: {
      dataset: path.relative(repoRoot, registry.datasetPath),
      boundaryBuilder: 'backend/src/modules/legal-vocabulary/vocabulary-boundary.js',
      registryLoader: 'backend/src/modules/legal-vocabulary/recognition-registry-loader.js',
    },
    boundaryDiscipline: {
      runtimeOntologyChanged: false,
      conceptAdmissionChanged: false,
      meaningsAuthoredByThisAudit: false,
      externalSourceValidationPerformed: false,
    },
    counts,
    weakContentAudit,
    outputFiles: Object.fromEntries(
      Object.entries(outputPaths).map(([key, filePath]) => [key, path.relative(repoRoot, filePath)]),
    ),
  };

  return {
    coverageAudit,
    duplicateAudit,
    structuralRiskAudit,
    safeBatchCandidates,
    markdownSummary: buildMarkdownSummary({
      counts,
      duplicateAudit,
      weakContentAudit,
      structuralRiskAudit,
      safeBatchCandidates,
      registry,
      response,
    }),
  };
}

function main() {
  ensureOutputDirectory();

  const audit = buildAudit();
  writeJson(outputPaths.coverageAudit, audit.coverageAudit);
  writeJson(outputPaths.duplicateGroups, audit.duplicateAudit);
  writeJson(outputPaths.highRiskQueue, audit.structuralRiskAudit);
  writeJson(outputPaths.safeBatchCandidates, audit.safeBatchCandidates);
  fs.writeFileSync(outputPaths.summaryMarkdown, audit.markdownSummary, 'utf8');

  process.stdout.write(`Wrote ${path.relative(repoRoot, outputPaths.summaryMarkdown)}\n`);
  process.stdout.write(`Wrote ${path.relative(repoRoot, outputPaths.coverageAudit)}\n`);
  process.stdout.write(`Wrote ${path.relative(repoRoot, outputPaths.duplicateGroups)}\n`);
  process.stdout.write(`Wrote ${path.relative(repoRoot, outputPaths.highRiskQueue)}\n`);
  process.stdout.write(`Wrote ${path.relative(repoRoot, outputPaths.safeBatchCandidates)}\n`);
}

main();
