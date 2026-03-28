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
  ledgerDirPath: path.resolve(__dirname, '../docs/integrity-checks'),
  ledgerIndexPath: path.resolve(__dirname, '../docs/integrity-checks/README.md'),
});

const MAX_RUN_BLOCKS_PER_VOLUME = 25;
const INTEGRITY_VOLUME_PREFIX = 'INTEGRITY_CHECK_';
const INTEGRITY_VOLUME_SUFFIX = '.md';

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

function formatIntegrityVolumeNumber(volumeNumber) {
  return `${volumeNumber}`.padStart(3, '0');
}

function formatIntegrityVolumeFilename(volumeNumber) {
  return `${INTEGRITY_VOLUME_PREFIX}${formatIntegrityVolumeNumber(volumeNumber)}${INTEGRITY_VOLUME_SUFFIX}`;
}

function formatIntegrityVolumeHeader(volumeNumber) {
  const volumeLabel = formatIntegrityVolumeNumber(volumeNumber);

  return [
    `# Integrity Check ${volumeLabel}`,
    '',
    'Append-only runtime evidence ledger volume for ChatPDM platform integrity runs.',
    '',
    `- Volume: \`${volumeLabel}\``,
    `- Max run blocks: \`${MAX_RUN_BLOCKS_PER_VOLUME}\``,
    '- Ledger index: [README.md](./README.md)',
    '- Role: subordinate runtime evidence, not doctrine',
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
}

function countRunBlocks(markdown) {
  const matches = markdown.match(/^## Run /gm);
  return matches ? matches.length : 0;
}

function listIntegrityVolumes(ledgerDirPath) {
  if (!fs.existsSync(ledgerDirPath)) {
    return [];
  }

  return fs.readdirSync(ledgerDirPath)
    .map((name) => {
      const match = new RegExp(`^${INTEGRITY_VOLUME_PREFIX}([0-9]{3})\\${INTEGRITY_VOLUME_SUFFIX}$`).exec(name);

      if (!match) {
        return null;
      }

      return {
        name,
        number: Number.parseInt(match[1], 10),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.number - right.number);
}

function buildIntegrityLedgerReadme(activeVolumeName, volumeNames) {
  const lines = [
    '# Integrity Checks',
    '',
    'This folder stores the append-only platform integrity evidence ledger for executable ChatPDM runtime checks.',
    '',
    'It records measured runtime evidence. It does not define trust doctrine. That role belongs to `docs/TRUST_INTEGRITY_STACK.md`.',
    '',
    '## Rotation Rule',
    '',
    `- Each integrity volume may contain a maximum of \`${MAX_RUN_BLOCKS_PER_VOLUME}\` run blocks.`,
    '- After the 25th run block, the next run rotates into the next sequential volume.',
    '- Closed volumes remain append-closed after rotation.',
    '- Historical repair requires deliberate explicit tooling or manual correction.',
    '',
    '## Naming Contract',
    '',
    `- Volume files use the form \`${INTEGRITY_VOLUME_PREFIX}NNN${INTEGRITY_VOLUME_SUFFIX}\`.`,
    '- Numbering is zero-padded and sequential: `001`, `002`, `003`.',
    '',
    '## Active Volume',
    '',
    `- Latest active volume: [${activeVolumeName}](./${activeVolumeName})`,
    '',
    '## Relationship To Trust Doctrine',
    '',
    '- `docs/TRUST_INTEGRITY_STACK.md` defines the constitutional operational law above this ledger.',
    '- This folder remains subordinate runtime evidence, not doctrine.',
    '',
    '## Volumes',
    '',
    ...volumeNames.map((name) => `- [${name}](./${name})`),
    '',
  ];

  return lines.join('\n');
}

function ensureIntegrityLedgerStructure(paths = DEFAULT_PATHS) {
  fs.mkdirSync(paths.ledgerDirPath, { recursive: true });

  const volumes = listIntegrityVolumes(paths.ledgerDirPath);

  if (volumes.length === 0) {
    const initialVolumeName = formatIntegrityVolumeFilename(1);
    const initialVolumePath = path.join(paths.ledgerDirPath, initialVolumeName);
    fs.writeFileSync(initialVolumePath, formatIntegrityVolumeHeader(1));
    const readme = buildIntegrityLedgerReadme(initialVolumeName, [initialVolumeName]);
    fs.writeFileSync(paths.ledgerIndexPath, readme);

    return {
      activeVolumeName: initialVolumeName,
      activeVolumePath: initialVolumePath,
      volumeCount: 1,
    };
  }

  const activeVolume = volumes[volumes.length - 1];
  const activeVolumeName = activeVolume.name;
  const activeVolumePath = path.join(paths.ledgerDirPath, activeVolumeName);
  const readme = buildIntegrityLedgerReadme(activeVolumeName, volumes.map((volume) => volume.name));
  fs.writeFileSync(paths.ledgerIndexPath, readme);

  return {
    activeVolumeName,
    activeVolumePath,
    volumeCount: volumes.length,
  };
}

function resolveActiveIntegrityVolume(paths = DEFAULT_PATHS) {
  const currentState = ensureIntegrityLedgerStructure(paths);
  const currentVolumeContent = fs.readFileSync(currentState.activeVolumePath, 'utf8');

  if (countRunBlocks(currentVolumeContent) < MAX_RUN_BLOCKS_PER_VOLUME) {
    return currentState;
  }

  const nextVolumeNumber = currentState.volumeCount + 1;
  const nextVolumeName = formatIntegrityVolumeFilename(nextVolumeNumber);
  const nextVolumePath = path.join(paths.ledgerDirPath, nextVolumeName);
  fs.writeFileSync(nextVolumePath, formatIntegrityVolumeHeader(nextVolumeNumber));

  const volumes = listIntegrityVolumes(paths.ledgerDirPath).map((volume) => volume.name);
  const readme = buildIntegrityLedgerReadme(nextVolumeName, volumes);
  fs.writeFileSync(paths.ledgerIndexPath, readme);

  return {
    activeVolumeName: nextVolumeName,
    activeVolumePath: nextVolumePath,
    volumeCount: volumes.length,
  };
}

function appendIntegrityLog(result, paths = DEFAULT_PATHS) {
  const activeVolume = resolveActiveIntegrityVolume(paths);
  const existing = fs.readFileSync(activeVolume.activeVolumePath, 'utf8');
  const needsSeparator = existing.length > 0 && !existing.endsWith('\n\n');
  const separator = needsSeparator ? '\n' : '';
  fs.appendFileSync(activeVolume.activeVolumePath, `${separator}${formatIntegrityMarkdownBlock(result)}\n`);

  return {
    activeVolumeName: activeVolume.activeVolumeName,
    activeVolumePath: activeVolume.activeVolumePath,
    ledgerIndexPath: paths.ledgerIndexPath,
  };
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
