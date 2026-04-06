'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const {
  normalizeChatPdmInput,
  MAX_TRANSFORM_DEPTH,
  MAX_INPUT_BYTES,
} = require('../src/normalization/normalization.pipeline.ts');
const {
  resetNormalizationMetrics,
  snapshotNormalizationMetrics,
  NORMALIZATION_TRANSFORM_KINDS,
  NORMALIZATION_REFUSAL_CODES,
  NORMALIZATION_DURATION_MS_BUCKET_LABELS,
} = require('../src/normalization/normalization.metrics.ts');

const SURROGATE_FIXTURE_PATHS = Object.freeze([
  path.resolve(__dirname, '../tests/normalization/fixtures/normalization-boundary-hardening.json'),
  path.resolve(__dirname, '../tests/fixtures/governance-equivalence-lock.json'),
]);

function parseCli(argv) {
  const cli = {
    source: 'surrogate',
    artifactPath: null,
    packet: 'c2',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--source') {
      const next = argv[index + 1];

      if (typeof next !== 'string' || next.length === 0) {
        throw new Error('--source requires a value of live or surrogate.');
      }

      if (next !== 'live' && next !== 'surrogate') {
        throw new Error(`Unsupported evidence source: ${next}`);
      }

      cli.source = next;
      index += 1;
      continue;
    }

    if (arg === '--artifact' || arg === '--input') {
      const next = argv[index + 1];

      if (typeof next !== 'string' || next.length === 0) {
        throw new Error(`${arg} requires a JSON artifact path.`);
      }

      cli.artifactPath = path.resolve(next);
      index += 1;
      continue;
    }

    if (arg === '--live') {
      cli.source = 'live';
      continue;
    }

    if (arg === '--surrogate') {
      cli.source = 'surrogate';
      continue;
    }

    if (arg === '--packet') {
      const next = argv[index + 1];

      if (typeof next !== 'string' || next.length === 0) {
        throw new Error('--packet requires a value of c2 or c3.');
      }

      if (next !== 'c2' && next !== 'c3') {
        throw new Error(`Unsupported packet mode: ${next}`);
      }

      cli.packet = next;
      index += 1;
      continue;
    }

    if (!arg.startsWith('-') && cli.artifactPath === null) {
      cli.artifactPath = path.resolve(arg);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return cli;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256Fingerprint(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);
}

function byteLength(text) {
  return Buffer.byteLength(text, 'utf8');
}

function reverseText(text) {
  return Array.from(text).reverse().join('');
}

function encodeBase64(text) {
  return Buffer.from(text, 'utf8').toString('base64');
}

function encodeHex(text) {
  return Buffer.from(text, 'utf8').toString('hex').toUpperCase();
}

function encodePercent(text) {
  return Array.from(text, (character) => (
    `%${character.codePointAt(0).toString(16).toUpperCase().padStart(2, '0')}`
  )).join('');
}

function encodeBase64NTimes(text, count) {
  let current = text;

  for (let index = 0; index < count; index += 1) {
    current = encodeBase64(current);
  }

  return current;
}

function applyEncodeSteps(text, encodeSteps) {
  return encodeSteps.reduce((current, step) => {
    switch (step) {
      case 'base64':
        return encodeBase64(current);
      case 'reverse':
        return reverseText(current);
      case 'hex':
        return encodeHex(current);
      case 'percent':
        return encodePercent(current);
      default:
        throw new Error(`Unsupported encode step "${step}".`);
    }
  }, text);
}

function materializeBoundaryInput(testCase) {
  if (typeof testCase.input === 'string') {
    return testCase.input;
  }

  if (!testCase.inputGenerator || typeof testCase.inputGenerator !== 'object') {
    throw new Error(`Boundary case "${testCase.name}" is missing input data.`);
  }

  switch (testCase.inputGenerator.kind) {
    case 'nested_base64': {
      const depth = MAX_TRANSFORM_DEPTH + testCase.inputGenerator.depthOffset;
      return encodeBase64NTimes(testCase.inputGenerator.seed, depth);
    }
    case 'repeat':
      return testCase.inputGenerator.char.repeat(MAX_INPUT_BYTES + testCase.inputGenerator.lengthOffset);
    default:
      throw new Error(`Unsupported boundary input generator "${testCase.inputGenerator.kind}".`);
  }
}

function extractGovernanceEquivalenceInputs(parsed) {
  const inputs = [];

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      if (typeof entry.input !== 'string') {
        throw new Error('Boundary fixture entries must provide an input string.');
      }

      inputs.push(entry.input);
    }

    return inputs;
  }

  const familyGroups = [
    ...(Array.isArray(parsed.harmfulFamilies) ? parsed.harmfulFamilies : []),
    ...(Array.isArray(parsed.safeFamilies) ? parsed.safeFamilies : []),
  ];

  for (const family of familyGroups) {
    if (typeof family.plainText !== 'string') {
      throw new Error(`Family "${family.name}" is missing plainText.`);
    }

    if (!Array.isArray(family.variants)) {
      throw new Error(`Family "${family.name}" is missing variants.`);
    }

    for (const variant of family.variants) {
      if (!Array.isArray(variant.encodeSteps)) {
        throw new Error(`Variant "${family.name}:${variant.name}" is missing encodeSteps.`);
      }

      inputs.push(applyEncodeSteps(family.plainText, variant.encodeSteps));
    }
  }

  if (Array.isArray(parsed.boundaryCases)) {
    for (const boundaryCase of parsed.boundaryCases) {
      inputs.push(materializeBoundaryInput(boundaryCase));
    }
  }

  return inputs;
}

function sizeBucket(bytes) {
  if (bytes === 0) {
    return '0';
  }

  if (bytes <= 16) {
    return '1-16';
  }

  if (bytes <= 64) {
    return '17-64';
  }

  if (bytes <= 256) {
    return '65-256';
  }

  if (bytes <= 1024) {
    return '257-1024';
  }

  return '1025+';
}

function outputSizeBucket(bytes) {
  if (bytes === null) {
    return 'null';
  }

  return sizeBucket(bytes);
}

function createCountMap(keys) {
  return keys.reduce((accumulator, key) => {
    accumulator[key] = 0;
    return accumulator;
  }, {});
}

function incrementCount(map, key) {
  map[key] = (map[key] ?? 0) + 1;
}

function assertAllowedTransformKinds(transformKinds) {
  for (const transform of transformKinds) {
    if (!NORMALIZATION_TRANSFORM_KINDS.includes(transform)) {
      throw new Error(`Unknown normalization transform kind in evidence: ${transform}`);
    }
  }
}

function assertAllowedRefusalCode(refusalCode) {
  if (refusalCode === null) {
    return;
  }

  if (!NORMALIZATION_REFUSAL_CODES.includes(refusalCode)) {
    throw new Error(`Unknown normalization refusal code in evidence: ${refusalCode}`);
  }
}

function computeExpansionRatio(inputBytes, outputBytes) {
  if (outputBytes === null) {
    return null;
  }

  if (inputBytes === 0) {
    return outputBytes === 0 ? 0 : null;
  }

  return outputBytes / inputBytes;
}

function normalizeObservationShape(observation) {
  const rawText = typeof observation.rawText === 'string'
    ? observation.rawText
    : (typeof observation.input === 'string' ? observation.input : null);
  const canonicalText = typeof observation.canonicalText === 'string'
    ? observation.canonicalText
    : (typeof observation.outputText === 'string' ? observation.outputText : null);
  const rawFingerprint = typeof observation.rawFingerprint === 'string'
    ? observation.rawFingerprint
    : (rawText === null ? null : sha256Fingerprint(rawText));

  if (rawFingerprint === null) {
    throw new Error('Artifact observations require either rawText or rawFingerprint.');
  }

  const appliedTransformKinds = Array.isArray(observation.appliedTransformKinds)
    ? observation.appliedTransformKinds.filter((transform) => typeof transform === 'string')
    : [];
  const status = typeof observation.status === 'string'
    ? observation.status
    : (typeof observation.refusalCode === 'string' ? 'refused' : 'normalized');
  const refusalCode = status === 'refused'
    ? (typeof observation.refusalCode === 'string'
      ? observation.refusalCode
      : (typeof observation.code === 'string' ? observation.code : null))
    : null;
  const inputBytes = Number.isFinite(observation.inputBytes)
    ? observation.inputBytes
    : (rawText === null ? 0 : byteLength(rawText));
  const outputBytes = observation.outputBytes === null
    ? null
    : (Number.isFinite(observation.outputBytes)
      ? observation.outputBytes
      : (canonicalText === null ? null : byteLength(canonicalText)));
  const expansionRatio = typeof observation.expansionRatio === 'number' && Number.isFinite(observation.expansionRatio)
    ? observation.expansionRatio
    : computeExpansionRatio(inputBytes, outputBytes);
  const depthUsed = Number.isFinite(observation.depthUsed) ? observation.depthUsed : 0;
  const changed = typeof observation.changed === 'boolean'
    ? observation.changed
    : (status !== 'unchanged');

  if (status !== 'refused') {
    assert.equal(refusalCode, null, 'Non-refused observations must not carry a refusalCode.');
  }

  if (status === 'refused') {
    assert.notEqual(refusalCode, null, 'Refused observations require a refusalCode.');
  }

  assertAllowedTransformKinds(appliedTransformKinds);
  assertAllowedRefusalCode(refusalCode);

  return {
    rawText,
    canonicalText,
    rawFingerprint,
    status,
    refusalCode,
    appliedTransformKinds,
    depthUsed,
    inputBytes,
    outputBytes,
    expansionRatio,
    changed,
    inputBucket: sizeBucket(inputBytes),
    outputBucket: outputSizeBucket(outputBytes),
  };
}

function loadObservationArtifact(filePath) {
  const parsed = readJson(filePath);
  const observations = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.observations)
      ? parsed.observations
      : Array.isArray(parsed.events)
        ? parsed.events
        : null;

  if (observations === null) {
    throw new Error('Observation artifacts must be an array or contain observations/events arrays.');
  }

  return observations.map((observation) => normalizeObservationShape(observation));
}

function loadSurrogateObservations() {
  resetNormalizationMetrics();

  const observations = [];

  for (const fixturePath of SURROGATE_FIXTURE_PATHS) {
    const parsedFixture = readJson(fixturePath);
    const fixtureInputs = extractGovernanceEquivalenceInputs(parsedFixture);

    for (const input of fixtureInputs) {
      const result = normalizeChatPdmInput(input);
      const rawFingerprint = sha256Fingerprint(result.rawText);

      observations.push({
        rawText: result.rawText,
        canonicalText: result.canonicalText,
        rawFingerprint,
        status: result.status,
        refusalCode: result.status === 'refused' ? result.refusalCode : null,
        appliedTransformKinds: [...result.appliedTransformKinds],
        depthUsed: result.depthUsed,
        inputBytes: result.inputBytes,
        outputBytes: result.outputBytes,
        expansionRatio: result.expansionRatio,
        changed: result.changed,
        inputBucket: sizeBucket(result.inputBytes),
        outputBucket: outputSizeBucket(result.outputBytes),
      });
    }
  }

  const snapshot = snapshotNormalizationMetrics();

  return {
    evidenceSource: 'surrogate',
    observations,
    snapshot,
  };
}

function buildBoundarySignatureKey(observation) {
  const refusalCode = observation.refusalCode === null ? 'ALLOW' : observation.refusalCode;
  const transformPath = observation.appliedTransformKinds.length === 0
    ? 'none'
    : observation.appliedTransformKinds.join('>');

  return [
    `code=${refusalCode}`,
    `path=${transformPath}`,
    `depth=${observation.depthUsed}`,
    `input=${observation.inputBucket}`,
    `output=${observation.outputBucket}`,
    `raw=${observation.rawFingerprint}`,
  ].join('|');
}

function classifySuspiciousShape(observation, count) {
  const tags = [];

  if (count > 1) {
    tags.push('repeated_signature');
  }

  if (observation.refusalCode === 'NORMALIZATION_TOO_DEEP') {
    tags.push('depth_burst');
  }

  if (observation.refusalCode === 'NORMALIZATION_TOO_LARGE') {
    tags.push('size_burst');
  }

  if (observation.refusalCode === 'NORMALIZATION_AMBIGUOUS') {
    tags.push('ambiguity_burst');
  }

  if (observation.appliedTransformKinds.length > 1) {
    tags.push('mixed_layer_probe');
  }

  return tags;
}

function summarizeObservations(observations) {
  const allowedTransformLookup = Object.create(null);
  const allowedRefusalLookup = Object.create(null);

  for (const transform of NORMALIZATION_TRANSFORM_KINDS) {
    allowedTransformLookup[transform] = true;
  }

  for (const refusalCode of NORMALIZATION_REFUSAL_CODES) {
    allowedRefusalLookup[refusalCode] = true;
  }

  const transformFrequency = createCountMap(NORMALIZATION_TRANSFORM_KINDS);
  const refusalCounts = createCountMap(NORMALIZATION_REFUSAL_CODES);
  const depthDistribution = {};
  const bySignature = new Map();
  const expansionOutliers = [];
  let changedCount = 0;
  let measuredExpansionCount = 0;

  for (const observation of observations) {
    if (observation.changed) {
      changedCount += 1;
    }

    for (const transform of observation.appliedTransformKinds) {
      if (!Object.prototype.hasOwnProperty.call(allowedTransformLookup, transform)) {
        throw new Error(`Unknown normalization transform kind in evidence: ${transform}`);
      }

      incrementCount(transformFrequency, transform);
    }

    if (observation.refusalCode !== null) {
      if (!Object.prototype.hasOwnProperty.call(allowedRefusalLookup, observation.refusalCode)) {
        throw new Error(`Unknown normalization refusal code in evidence: ${observation.refusalCode}`);
      }

      incrementCount(refusalCounts, observation.refusalCode);
    }

    incrementCount(depthDistribution, String(observation.depthUsed));

    if (typeof observation.expansionRatio === 'number' && Number.isFinite(observation.expansionRatio)) {
      measuredExpansionCount += 1;

      if (observation.expansionRatio > 1) {
        expansionOutliers.push({
          ratio: observation.expansionRatio,
          rawFingerprint: observation.rawFingerprint,
          inputBucket: observation.inputBucket,
          outputBucket: observation.outputBucket,
          depthUsed: observation.depthUsed,
          transformPath: observation.appliedTransformKinds.length === 0
            ? 'none'
            : observation.appliedTransformKinds.join('>'),
          refusalCode: observation.refusalCode === null ? 'ALLOW' : observation.refusalCode,
          status: observation.status,
        });
      }
    }

    const signatureKey = buildBoundarySignatureKey(observation);
    const existing = bySignature.get(signatureKey) ?? {
      key: signatureKey,
      count: 0,
      observation,
    };

    existing.count += 1;
    bySignature.set(signatureKey, existing);
  }

  const repeatedBoundarySignatures = [...bySignature.values()]
    .filter((entry) => entry.count > 1)
    .map((entry) => ({
      count: entry.count,
      rawFingerprint: entry.observation.rawFingerprint,
      inputBucket: entry.observation.inputBucket,
      outputBucket: entry.observation.outputBucket,
      depthUsed: entry.observation.depthUsed,
      transformPath: entry.observation.appliedTransformKinds.length === 0
        ? 'none'
        : entry.observation.appliedTransformKinds.join('>'),
      refusalCode: entry.observation.refusalCode === null ? 'ALLOW' : entry.observation.refusalCode,
      shapeTags: classifySuspiciousShape(entry.observation, entry.count),
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.rawFingerprint.localeCompare(right.rawFingerprint);
    });

  expansionOutliers.sort((left, right) => {
    if (right.ratio !== left.ratio) {
      return right.ratio - left.ratio;
    }

    return left.rawFingerprint.localeCompare(right.rawFingerprint);
  });

  return {
    totalAttempts: observations.length,
    changedCount,
    unchangedCount: observations.length - changedCount,
    transformFrequency,
    refusalCounts,
    depthDistribution,
    measuredExpansionCount,
    expansionOutliers: expansionOutliers.slice(0, 5),
    repeatedBoundarySignatures,
  };
}

function assertMetricsAlignment(snapshot, summary) {
  assert.equal(snapshot.normalization_attempt_total, summary.totalAttempts, 'attempt_total mismatch.');
  assert.equal(snapshot.normalization_changed_total, summary.changedCount, 'changed_total mismatch.');
  assert.equal(snapshot.normalization_duration_ms.count, summary.totalAttempts, 'duration count mismatch.');
  assert.equal(
    snapshot.normalization_output_expansion_ratio.count,
    summary.measuredExpansionCount,
    'expansion ratio count mismatch.',
  );
  assert.deepEqual(snapshot.normalization_applied_total, summary.transformFrequency, 'transform frequency mismatch.');
  assert.deepEqual(snapshot.normalization_refused_total, summary.refusalCounts, 'refusal counts mismatch.');
  assert.deepEqual(snapshot.normalization_depth_histogram, summary.depthDistribution, 'depth distribution mismatch.');
}

function renderSection(title, lines) {
  const body = lines.length > 0 ? lines : ['none'];
  return [title, ...body.map((line) => `  ${line}`)].join('\n');
}

function renderCountSection(title, entries) {
  return renderSection(
    title,
    entries.map(([label, value]) => `${label}: ${value}`),
  );
}

function renderAttemptSection(summary) {
  return renderSection('Attempts', [`total: ${summary.totalAttempts}`]);
}

function renderChangedSection(summary) {
  return renderSection('Changed vs unchanged', [
    `changed: ${summary.changedCount}`,
    `unchanged: ${summary.unchangedCount}`,
  ]);
}

function renderTransformFrequency(summary) {
  return renderCountSection(
    'Transform frequency',
    NORMALIZATION_TRANSFORM_KINDS.map((transform) => [transform, summary.transformFrequency[transform] ?? 0]),
  );
}

function renderRefusalsByCode(summary) {
  return renderCountSection(
    'Refusals by code',
    NORMALIZATION_REFUSAL_CODES.map((refusalCode) => [refusalCode, summary.refusalCounts[refusalCode] ?? 0]),
  );
}

function renderDepthDistribution(summary) {
  const depthEntries = Object.keys(summary.depthDistribution)
    .map((key) => [Number(key), summary.depthDistribution[key]])
    .sort((left, right) => left[0] - right[0])
    .map(([depth, value]) => [String(depth), value]);

  return renderCountSection('Depth distribution', depthEntries);
}

function formatRatio(ratio) {
  return ratio.toFixed(2);
}

function renderExpansionOutliers(summary) {
  if (summary.expansionOutliers.length === 0) {
    return renderSection('Expansion outliers', ['none']);
  }

  return renderSection(
    'Expansion outliers',
    summary.expansionOutliers.map((entry) => (
      `ratio=${formatRatio(entry.ratio)} raw=${entry.rawFingerprint} input=${entry.inputBucket} output=${entry.outputBucket} depth=${entry.depthUsed} path=${entry.transformPath} code=${entry.refusalCode} status=${entry.status}`
    )),
  );
}

function renderRepeatedBoundarySignatures(summary) {
  if (summary.repeatedBoundarySignatures.length === 0) {
    return renderSection('Repeated boundary signatures', ['none']);
  }

  return renderSection(
    'Repeated boundary signatures',
    summary.repeatedBoundarySignatures.map((entry) => (
      `${entry.count}x raw=${entry.rawFingerprint} code=${entry.refusalCode} path=${entry.transformPath} depth=${entry.depthUsed} input=${entry.inputBucket} output=${entry.outputBucket} shape=${entry.shapeTags.join(',')}`
    )),
  );
}

function renderEvidenceSource(evidenceSource) {
  return renderSection('Evidence source', [evidenceSource]);
}

function buildReport(summary, evidenceSource) {
  return [
    renderAttemptSection(summary),
    renderChangedSection(summary),
    renderTransformFrequency(summary),
    renderRefusalsByCode(summary),
    renderDepthDistribution(summary),
    renderExpansionOutliers(summary),
    renderRepeatedBoundarySignatures(summary),
    renderEvidenceSource(evidenceSource),
  ].join('\n\n');
}

function sumNumericValues(values) {
  return values.reduce((sum, value) => sum + value, 0);
}

function buildLatencySummary(snapshot) {
  const buckets = snapshot.normalization_duration_ms.buckets;
  const bucketCounts = NORMALIZATION_DURATION_MS_BUCKET_LABELS.map((label) => buckets[label] ?? 0);
  const total = sumNumericValues(bucketCounts);

  if (total === 0) {
    return {
      count: snapshot.normalization_duration_ms.count,
      p50Bucket: 'n/a',
      p95Bucket: 'n/a',
      bucketLine: NORMALIZATION_DURATION_MS_BUCKET_LABELS.map((label) => `${label}=0`).join(', '),
    };
  }

  const percentileBucket = (percentile) => {
    const target = Math.ceil(total * percentile);
    let running = 0;

    for (let index = 0; index < NORMALIZATION_DURATION_MS_BUCKET_LABELS.length; index += 1) {
      const label = NORMALIZATION_DURATION_MS_BUCKET_LABELS[index];
      running += buckets[label] ?? 0;

      if (running >= target) {
        return label;
      }
    }

    return NORMALIZATION_DURATION_MS_BUCKET_LABELS[NORMALIZATION_DURATION_MS_BUCKET_LABELS.length - 1];
  };

  return {
    count: snapshot.normalization_duration_ms.count,
    p50Bucket: percentileBucket(0.5),
    p95Bucket: percentileBucket(0.95),
    bucketLine: NORMALIZATION_DURATION_MS_BUCKET_LABELS
      .map((label) => `${label}=${buckets[label] ?? 0}`)
      .join(', '),
  };
}

function renderLatencySummary(snapshot) {
  const latency = buildLatencySummary(snapshot);

  return renderSection('Latency summary', [
    `count: ${latency.count}`,
    `p50 bucket: ${latency.p50Bucket}`,
    `p95 bucket: ${latency.p95Bucket}`,
    `buckets: ${latency.bucketLine}`,
  ]);
}

function computeRecommendation(summary, latencySummary) {
  const ambiguityCount = summary.refusalCounts.NORMALIZATION_AMBIGUOUS;
  const depthTrapCount = summary.refusalCounts.NORMALIZATION_TOO_DEEP;
  const sizeTrapCount = summary.refusalCounts.NORMALIZATION_TOO_LARGE;
  const nonTextCount = summary.refusalCounts.NORMALIZATION_NON_TEXT_OUTPUT;
  const invalidEncodingCount = summary.refusalCounts.NORMALIZATION_INVALID_ENCODING;
  const refusalNoise = ambiguityCount + depthTrapCount + sizeTrapCount + nonTextCount + invalidEncodingCount;
  const lowLatency = latencySummary.p95Bucket === '0-1' || latencySummary.p95Bucket === '1-2';
  const ambiguityLow = (ambiguityCount / summary.totalAttempts) <= 0.05;
  const trapsLow = (depthTrapCount + sizeTrapCount) <= 2;
  const probesExplainable = summary.repeatedBoundarySignatures.every((entry) => (
    entry.shapeTags.includes('repeated_signature')
    && !entry.shapeTags.includes('mixed_layer_probe')
  ));
  const repeatedProbeBursts = summary.repeatedBoundarySignatures.length > 2;

  if (lowLatency && ambiguityLow && trapsLow && !repeatedProbeBursts && probesExplainable) {
    return {
      recommendation: 'hold',
      rationale: [
        'low latency',
        'ambiguity is low',
        'refusals are mostly malformed or junk',
        'no credible missed-transform evidence',
        'repeated signatures are sparse and explainable',
      ].join(', '),
    };
  }

  if (
    refusalNoise > (summary.totalAttempts * 0.25)
    || depthTrapCount > 0
    || sizeTrapCount > 0
    || repeatedProbeBursts
    || summary.repeatedBoundarySignatures.some((entry) => entry.shapeTags.includes('mixed_layer_probe'))
  ) {
    return {
      recommendation: 'tighten',
      rationale: [
        'ambiguity or trap traffic is noisy',
        'same-shape probe bursts are visible',
        'boundary pressure looks operationally significant',
      ].join(', '),
    };
  }

  return {
    recommendation: 'consider admission',
    rationale: [
      'repeated labeled misses exist',
      'a specific missing transform class is named',
      'bounded cost and ambiguity risk are acceptable',
      'fixtures and spec revision path are ready',
    ].join(', '),
  };
}

function buildStabilityReviewPacket(summary, evidenceSource, snapshot) {
  const latencySummary = buildLatencySummary(snapshot);
  const recommendation = computeRecommendation(summary, latencySummary);

  return [
    renderEvidenceSource(evidenceSource),
    renderAttemptSection(summary),
    renderChangedSection(summary),
    renderTransformFrequency(summary),
    renderRefusalsByCode(summary),
    renderLatencySummary(snapshot),
    renderDepthDistribution(summary),
    renderExpansionOutliers(summary),
    renderRepeatedBoundarySignatures(summary),
    renderSection('Recommendation', [
      recommendation.recommendation,
      `rationale: ${recommendation.rationale}`,
    ]),
  ].join('\n\n');
}

function main() {
  const cli = parseCli(process.argv.slice(2));

  if (cli.artifactPath !== null) {
    if (!fs.existsSync(cli.artifactPath)) {
      throw new Error(`Artifact file not found: ${cli.artifactPath}`);
    }

    const observations = loadObservationArtifact(cli.artifactPath);
    const summary = summarizeObservations(observations);

    if (cli.packet === 'c3') {
      throw new Error('C3 stability packets require surrogate evidence with internal latency metrics.');
    }

    process.stdout.write(`${buildReport(summary, cli.source)}\n`);
    return;
  }

  if (cli.source !== 'surrogate') {
    throw new Error('Live evidence requires an artifact path.');
  }

  const surrogate = loadSurrogateObservations();
  const summary = summarizeObservations(surrogate.observations);

  assertMetricsAlignment(surrogate.snapshot, summary);

  if (cli.packet === 'c3') {
    process.stdout.write(`${buildStabilityReviewPacket(summary, surrogate.evidenceSource, surrogate.snapshot)}\n`);
    return;
  }

  process.stdout.write(`${buildReport(summary, surrogate.evidenceSource)}\n`);
}

main();
