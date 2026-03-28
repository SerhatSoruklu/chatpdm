'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { resolveConceptQuery } = require('../backend/src/modules/concepts');
const { assertValidProductResponse } = require('../backend/src/lib/product-response-validator');

const PLATFORM_INTEGRITY_VERSION = 'platform-integrity.v1';
const EXACT_RESOLUTION_POINTS = 10;
const REPEATABILITY_POINTS = 4;
const REFUSAL_POINTS = 4;
const CONTRACT_SHAPE_POINTS = 2;
const MAX_POINTS_PER_CONCEPT = (
  EXACT_RESOLUTION_POINTS
  + REPEATABILITY_POINTS
  + REFUSAL_POINTS
  + CONTRACT_SHAPE_POINTS
);

const CONCEPT_KERNEL = Object.freeze([
  {
    conceptId: 'authority',
    exactQuery: 'authority',
    probeQuery: 'authorities',
  },
  {
    conceptId: 'power',
    exactQuery: 'power',
    probeQuery: 'moral power',
  },
  {
    conceptId: 'legitimacy',
    exactQuery: 'legitimacy',
    probeQuery: 'legitimacy of force',
  },
  {
    conceptId: 'responsibility',
    exactQuery: 'responsibility',
    probeQuery: 'duty and responsibility',
  },
  {
    conceptId: 'duty',
    exactQuery: 'duty',
    probeQuery: 'dutie',
  },
]);

const SUPPLEMENTAL_PROBES = Object.freeze([
  {
    id: 'supplemental-refusal-legit',
    query: 'legit',
    expectedType: 'no_exact_match',
  },
  {
    id: 'supplemental-refusal-social-authority',
    query: 'social authority',
    expectedType: 'no_exact_match',
  },
  {
    id: 'supplemental-comparison-authority-vs-power',
    query: 'authority vs power',
    expectedType: 'comparison',
  },
]);

const DEFAULT_PATHS = Object.freeze({
  baselinePath: path.resolve(__dirname, './runtime/fixtures/platform-integrity-baseline.json'),
  resultsPath: path.resolve(__dirname, './runtime/reports/platform-integrity-results.json'),
  logPath: path.resolve(__dirname, '../docs/PLATFORM_INTEGRITY.md'),
});

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function hashValue(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function runQuery(query) {
  const response = resolveConceptQuery(query);
  return assertValidProductResponse(response);
}

function captureResponse(query) {
  const response = runQuery(query);
  return {
    query,
    hash: hashValue(response),
    response: cloneJson(response),
  };
}

function captureExpectation(query) {
  const captured = captureResponse(query);

  return {
    query,
    hash: captured.hash,
    responseType: captured.response.type,
    queryType: captured.response.queryType,
    interpretationType: captured.response.interpretation?.interpretationType ?? null,
    resolutionConceptId: captured.response.resolution?.conceptId ?? null,
  };
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function contractIssuesForConceptMatch(response, conceptId) {
  const issues = [];

  if (response.type !== 'concept_match') {
    issues.push(`expected concept_match, received ${response.type}`);
    return issues;
  }

  if (response.resolution?.conceptId !== conceptId) {
    issues.push(`expected conceptId ${conceptId}, received ${response.resolution?.conceptId ?? 'missing'}`);
  }

  if (!Number.isInteger(response.resolution?.conceptVersion)) {
    issues.push('conceptVersion missing or not integer');
  }

  if (!isNonEmptyString(response.answer?.title)) {
    issues.push('answer.title missing');
  }

  if (!isNonEmptyString(response.answer?.shortDefinition)) {
    issues.push('answer.shortDefinition missing');
  }

  if (!isNonEmptyString(response.answer?.coreMeaning)) {
    issues.push('answer.coreMeaning missing');
  }

  if (!isNonEmptyString(response.answer?.fullDefinition)) {
    issues.push('answer.fullDefinition missing');
  }

  if (!Array.isArray(response.answer?.contexts)) {
    issues.push('answer.contexts missing');
  }

  if (!Array.isArray(response.answer?.sources) || response.answer.sources.length === 0) {
    issues.push('answer.sources missing');
  }

  if (!Array.isArray(response.answer?.relatedConcepts)) {
    issues.push('answer.relatedConcepts missing');
  }

  if (!response.answer?.derivedExplanationOverlays || typeof response.answer.derivedExplanationOverlays !== 'object') {
    issues.push('answer.derivedExplanationOverlays missing');
  }

  if (response.answer?.derivedExplanationOverlays?.readOnly !== true) {
    issues.push('answer.derivedExplanationOverlays.readOnly missing');
  }

  if (!isNonEmptyString(response.answer?.derivedExplanationOverlays?.canonicalBinding?.canonicalHash)) {
    issues.push('answer.derivedExplanationOverlays.canonicalBinding.canonicalHash missing');
  }

  return issues;
}

function contractIssuesForNoExactMatch(response) {
  const issues = [];

  if (response.type !== 'no_exact_match') {
    issues.push(`expected no_exact_match, received ${response.type}`);
    return issues;
  }

  if (response.resolution?.method !== 'no_exact_match') {
    issues.push('resolution.method must equal no_exact_match');
  }

  if (!response.interpretation || !isNonEmptyString(response.interpretation.interpretationType)) {
    issues.push('interpretation.interpretationType missing');
  }

  if (!isNonEmptyString(response.message)) {
    issues.push('message missing');
  }

  if (!Array.isArray(response.suggestions)) {
    issues.push('suggestions missing');
  }

  return issues;
}

function contractIssuesForComparison(response) {
  const issues = [];

  if (response.type !== 'comparison') {
    issues.push(`expected comparison, received ${response.type}`);
    return issues;
  }

  if (response.mode !== 'comparison') {
    issues.push('mode must equal comparison');
  }

  if (!isNonEmptyString(response.comparison?.conceptA)) {
    issues.push('comparison.conceptA missing');
  }

  if (!isNonEmptyString(response.comparison?.conceptB)) {
    issues.push('comparison.conceptB missing');
  }

  if (!Array.isArray(response.comparison?.axes) || response.comparison.axes.length === 0) {
    issues.push('comparison.axes missing');
  }

  return issues;
}

function contractIssuesForResponse(response, expectedType, conceptId = null) {
  switch (expectedType) {
    case 'concept_match':
      return contractIssuesForConceptMatch(response, conceptId);
    case 'no_exact_match':
      return contractIssuesForNoExactMatch(response);
    case 'comparison':
      return contractIssuesForComparison(response);
    default:
      return [`unsupported expected response type ${expectedType}`];
  }
}

function loadBaseline(baselinePath = DEFAULT_PATHS.baselinePath) {
  return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
}

function buildBaselineSnapshot(executedAt = new Date().toISOString()) {
  return {
    version: PLATFORM_INTEGRITY_VERSION,
    generatedAt: executedAt,
    scoring: {
      exactCanonicalResolutionStable: EXACT_RESOLUTION_POINTS,
      repeatabilityStable: REPEATABILITY_POINTS,
      refusalStable: REFUSAL_POINTS,
      contractShapeStable: CONTRACT_SHAPE_POINTS,
      maxPointsPerConcept: MAX_POINTS_PER_CONCEPT,
      maxPointsTotal: CONCEPT_KERNEL.length * MAX_POINTS_PER_CONCEPT,
    },
    concepts: CONCEPT_KERNEL.map((concept) => ({
      conceptId: concept.conceptId,
      exactQuery: concept.exactQuery,
      probeQuery: concept.probeQuery,
      expectedExact: captureExpectation(concept.exactQuery),
      expectedProbe: captureExpectation(concept.probeQuery),
    })),
    supplemental: SUPPLEMENTAL_PROBES.map((probe) => ({
      id: probe.id,
      query: probe.query,
      expectedType: probe.expectedType,
      expectedResponse: captureExpectation(probe.query),
    })),
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function classifyRunStatus(totalScore, maxScore, driftCount) {
  if (totalScore === maxScore && driftCount === 0) {
    return 'PASS';
  }

  if (totalScore >= 90) {
    return 'PASS WITH MINOR DRIFT';
  }

  return 'FAIL';
}

function buildConceptResult(conceptBaseline) {
  const exactFirst = captureResponse(conceptBaseline.exactQuery);
  const exactSecond = captureResponse(conceptBaseline.exactQuery);
  const probe = captureResponse(conceptBaseline.probeQuery);

  const exactDrift = exactFirst.hash !== conceptBaseline.expectedExact.hash;
  const repeatabilityDrift = exactFirst.hash !== exactSecond.hash;
  const refusalDrift = probe.hash !== conceptBaseline.expectedProbe.hash;
  const exactContractIssues = contractIssuesForResponse(
    exactFirst.response,
    'concept_match',
    conceptBaseline.conceptId,
  );
  const probeContractIssues = contractIssuesForResponse(
    probe.response,
    'no_exact_match',
    null,
  );
  const contractDrift = exactContractIssues.length > 0 || probeContractIssues.length > 0;

  const notes = [];

  if (exactDrift) {
    notes.push(
      `exact output drift: expected ${conceptBaseline.expectedExact.hash.slice(0, 12)}, received ${exactFirst.hash.slice(0, 12)}`,
    );
  }

  if (repeatabilityDrift) {
    notes.push(
      `repeatability drift: first ${exactFirst.hash.slice(0, 12)}, second ${exactSecond.hash.slice(0, 12)}`,
    );
  }

  if (refusalDrift) {
    notes.push(
      `probe drift for "${conceptBaseline.probeQuery}": expected ${conceptBaseline.expectedProbe.responseType}, received ${probe.response.type}`,
    );
  }

  if (exactContractIssues.length > 0) {
    notes.push(...exactContractIssues.map((issue) => `exact contract issue: ${issue}`));
  }

  if (probeContractIssues.length > 0) {
    notes.push(...probeContractIssues.map((issue) => `probe contract issue: ${issue}`));
  }

  const score = (
    (exactDrift ? 0 : EXACT_RESOLUTION_POINTS)
    + (repeatabilityDrift ? 0 : REPEATABILITY_POINTS)
    + (refusalDrift ? 0 : REFUSAL_POINTS)
    + (contractDrift ? 0 : CONTRACT_SHAPE_POINTS)
  );

  return {
    conceptId: conceptBaseline.conceptId,
    exactQuery: conceptBaseline.exactQuery,
    probeQuery: conceptBaseline.probeQuery,
    score,
    maxScore: MAX_POINTS_PER_CONCEPT,
    checks: {
      exactCanonicalResolutionStable: !exactDrift,
      repeatabilityStable: !repeatabilityDrift,
      refusalStable: !refusalDrift,
      contractShapeStable: !contractDrift,
    },
    points: {
      exactCanonicalResolutionStable: exactDrift ? 0 : EXACT_RESOLUTION_POINTS,
      repeatabilityStable: repeatabilityDrift ? 0 : REPEATABILITY_POINTS,
      refusalStable: refusalDrift ? 0 : REFUSAL_POINTS,
      contractShapeStable: contractDrift ? 0 : CONTRACT_SHAPE_POINTS,
    },
    exact: {
      hash: exactFirst.hash,
      baselineHash: conceptBaseline.expectedExact.hash,
      responseType: exactFirst.response.type,
      queryType: exactFirst.response.queryType,
      resolutionConceptId: exactFirst.response.resolution?.conceptId ?? null,
    },
    repeatability: {
      firstHash: exactFirst.hash,
      secondHash: exactSecond.hash,
    },
    probe: {
      hash: probe.hash,
      baselineHash: conceptBaseline.expectedProbe.hash,
      responseType: probe.response.type,
      queryType: probe.response.queryType,
      interpretationType: probe.response.interpretation?.interpretationType ?? null,
    },
    notes,
  };
}

function buildSupplementalResult(supplementalBaseline) {
  const actual = captureResponse(supplementalBaseline.query);
  const contractIssues = contractIssuesForResponse(
    actual.response,
    supplementalBaseline.expectedType,
    null,
  );
  const stable = actual.hash === supplementalBaseline.expectedResponse.hash && contractIssues.length === 0;
  const notes = [];

  if (actual.hash !== supplementalBaseline.expectedResponse.hash) {
    notes.push(
      `supplemental drift: expected ${supplementalBaseline.expectedResponse.hash.slice(0, 12)}, received ${actual.hash.slice(0, 12)}`,
    );
  }

  if (contractIssues.length > 0) {
    notes.push(...contractIssues.map((issue) => `supplemental contract issue: ${issue}`));
  }

  return {
    id: supplementalBaseline.id,
    query: supplementalBaseline.query,
    expectedType: supplementalBaseline.expectedType,
    stable,
    scoreAffectsTotal: false,
    hash: actual.hash,
    baselineHash: supplementalBaseline.expectedResponse.hash,
    responseType: actual.response.type,
    queryType: actual.response.queryType,
    interpretationType: actual.response.interpretation?.interpretationType ?? null,
    notes,
  };
}

function packageLeakageObserved(perConceptResults) {
  return perConceptResults.some((concept) => concept.exact.resolutionConceptId !== concept.conceptId);
}

function runPlatformIntegritySuite(options = {}) {
  const executedAt = options.executedAt ?? new Date().toISOString();
  const baseline = options.baseline ?? loadBaseline(options.baselinePath);
  const perConcept = baseline.concepts.map((concept) => buildConceptResult(concept));
  const supplementalChecks = baseline.supplemental.map((probe) => buildSupplementalResult(probe));
  const totalScore = perConcept.reduce((sum, concept) => sum + concept.score, 0);
  const maxScore = perConcept.reduce((sum, concept) => sum + concept.maxScore, 0);
  const driftNotes = [
    ...perConcept.flatMap((concept) => concept.notes.map((note) => `${concept.conceptId}: ${note}`)),
    ...supplementalChecks.flatMap((probe) => probe.notes.map((note) => `${probe.query}: ${note}`)),
  ];
  const refusalNotes = perConcept.map((concept) => (
    `${concept.conceptId}: "${concept.probeQuery}" -> ${concept.probe.responseType}`
  ));
  const supplementalNotes = supplementalChecks.map((probe) => (
    `${probe.query}: ${probe.responseType}${probe.stable ? ' (stable)' : ' (drift)'}`
  ));
  const status = classifyRunStatus(totalScore, maxScore, driftNotes.length);

  return {
    version: PLATFORM_INTEGRITY_VERSION,
    executedAt,
    score: {
      total: totalScore,
      max: maxScore,
    },
    status,
    conceptsTested: CONCEPT_KERNEL.map((concept) => concept.conceptId),
    scoring: baseline.scoring,
    perConcept,
    refusalNotes,
    supplementalChecks,
    supplementalNotes,
    driftNotes,
    packageLeakageObserved: packageLeakageObserved(perConcept),
  };
}

function formatIntegrityMarkdownBlock(result) {
  const lines = [
    `## Run ${result.executedAt}`,
    '',
    `Integrity Score: ${result.score.total}/${result.score.max}`,
    `Concepts Tested: ${result.conceptsTested.join(', ')}`,
    `Status: ${result.status}`,
    '',
    'Per Concept:',
    '',
    ...result.perConcept.map((concept) => `- ${concept.conceptId}: ${concept.score}/${concept.maxScore}`),
    '',
    'Notes:',
    '',
  ];

  if (result.driftNotes.length === 0) {
    lines.push('- no unexpected output drift detected');
  } else {
    lines.push(...result.driftNotes.map((note) => `- ${note}`));
  }

  lines.push(`- package leakage observed: ${result.packageLeakageObserved ? 'yes' : 'no'}`);
  lines.push(...result.refusalNotes.map((note) => `- refusal check -> ${note}`));
  lines.push(...result.supplementalNotes.map((note) => `- supplemental check -> ${note}`));

  return lines.join('\n');
}

function ensureIntegrityLogExists(logPath = DEFAULT_PATHS.logPath) {
  if (fs.existsSync(logPath)) {
    return;
  }

  const initialContent = [
    '# Platform Integrity',
    '',
    'Append-only runtime evidence ledger for executable platform integrity runs.',
    '',
    'This document records deterministic checks for the 5 live ChatPDM runtime concepts.',
    'It does not define the full trust doctrine. That role belongs to `docs/TRUST_INTEGRITY_STACK.md`.',
    'This artifact remains a subordinate runtime evidence ledger and shall not be treated as doctrine.',
    '',
    '- Baseline: `tests/runtime/fixtures/platform-integrity-baseline.json`',
    '- Latest results: `tests/runtime/reports/platform-integrity-results.json`',
    '- Runner: `node scripts/run-platform-integrity.js`',
    '',
    '## Scoring Contract',
    '',
    '- exact canonical resolution stable = 10',
    '- repeatability stable = 4',
    '- refusal checks stable = 4',
    '- contract shape stable = 2',
    '- total per concept = 20',
    '- total across 5 concepts = 100',
    '',
  ].join('\n');

  fs.writeFileSync(logPath, initialContent);
}

function appendIntegrityLog(result, logPath = DEFAULT_PATHS.logPath) {
  ensureIntegrityLogExists(logPath);
  const existing = fs.readFileSync(logPath, 'utf8');
  const needsSeparator = existing.length > 0 && !existing.endsWith('\n\n');
  const separator = needsSeparator ? '\n' : '';
  fs.appendFileSync(logPath, `${separator}${formatIntegrityMarkdownBlock(result)}\n`);
}

module.exports = {
  CONCEPT_KERNEL,
  DEFAULT_PATHS,
  PLATFORM_INTEGRITY_VERSION,
  appendIntegrityLog,
  buildBaselineSnapshot,
  formatIntegrityMarkdownBlock,
  loadBaseline,
  runPlatformIntegritySuite,
  stableStringify,
  writeJson,
};
