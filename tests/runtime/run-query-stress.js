'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { assertValidProductResponse } = require('../../backend/src/lib/product-response-validator');

const FIXED_BASE_URL = 'http://127.0.0.1:4301';
const fixturePath = path.resolve(__dirname, 'fixtures/query-stress-pack.v1.json');
const reportsDirectory = path.resolve(__dirname, 'reports');
const reportPath = path.join(reportsDirectory, 'query-stress-report.v1.json');
const summaryPath = path.join(reportsDirectory, 'query-stress-summary.v1.md');

function loadFixturePack() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function hashText(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableStringify(value) {
  return JSON.stringify(value, null, 2);
}

function unique(values) {
  return [...new Set(values)];
}

function bucketTable(results) {
  const rows = new Map();

  for (const result of results) {
    if (!rows.has(result.bucket)) {
      rows.set(result.bucket, {
        bucket: result.bucket,
        cases: 0,
        passed: 0,
        partial: 0,
        failed: 0,
        totalScore: 0,
      });
    }

    const row = rows.get(result.bucket);
    row.cases += 1;
    row.totalScore += result.score;

    if (result.score === 2) {
      row.passed += 1;
    } else if (result.score === 1) {
      row.partial += 1;
    } else {
      row.failed += 1;
    }
  }

  return [...rows.values()].map((row) => ({
    ...row,
    averageScore: Number((row.totalScore / row.cases).toFixed(3)),
  }));
}

function actualModeFromAttempt(attempt) {
  if (attempt.status === 400 && attempt.bodyJson?.error?.code === 'invalid_query') {
    return 'invalid_input';
  }

  if (attempt.status === 200 && typeof attempt.bodyJson?.type === 'string') {
    return attempt.bodyJson.type;
  }

  return 'unexpected_error';
}

function actualComparisonFromAttempt(attempt) {
  if (attempt.status === 200 && attempt.bodyJson?.type === 'comparison') {
    return attempt.bodyJson.comparison ?? null;
  }

  return null;
}

function actualCanonicalFromAttempt(attempt) {
  if (attempt.bodyJson?.type === 'concept_match') {
    return attempt.bodyJson?.resolution?.conceptId ?? null;
  }

  return null;
}

function actualResolutionMethodFromAttempt(attempt) {
  if (attempt.status === 200 && typeof attempt.bodyJson?.resolution?.method === 'string') {
    return attempt.bodyJson.resolution.method;
  }

  return null;
}

function actualQueryTypeFromAttempt(attempt) {
  if (attempt.status === 200 && typeof attempt.bodyJson?.queryType === 'string') {
    return attempt.bodyJson.queryType;
  }

  return null;
}

function actualInterpretationFromAttempt(attempt) {
  if (attempt.status === 200 && attempt.bodyJson && Object.hasOwn(attempt.bodyJson, 'interpretation')) {
    return attempt.bodyJson.interpretation;
  }

  return null;
}

function actualCandidatesFromAttempt(attempt) {
  if (!Array.isArray(attempt.bodyJson?.candidates)) {
    return [];
  }

  return attempt.bodyJson.candidates.map((candidate) => candidate.conceptId);
}

function matchesSubset(actualValue, expectedValue) {
  if (expectedValue === null) {
    return actualValue === null;
  }

  if (Array.isArray(expectedValue)) {
    return Array.isArray(actualValue)
      && actualValue.length === expectedValue.length
      && expectedValue.every((expectedItem, index) => matchesSubset(actualValue[index], expectedItem));
  }

  if (expectedValue && typeof expectedValue === 'object') {
    if (!actualValue || typeof actualValue !== 'object') {
      return false;
    }

    return Object.entries(expectedValue).every(([key, value]) => matchesSubset(actualValue[key], value));
  }

  return actualValue === expectedValue;
}

function actualSuggestionsFromAttempt(attempt) {
  if (!Array.isArray(attempt.bodyJson?.suggestions)) {
    return [];
  }

  return attempt.bodyJson.suggestions.map((suggestion) => ({
    conceptId: suggestion.conceptId,
    reason: suggestion.reason,
  }));
}

function hasBoundaryCheck(testCase) {
  return testCase.checks.some((check) => (
    check.startsWith('no_collapse_')
    || check.startsWith('preserve_distinction_')
    || check === 'no_boundary_leak'
  ));
}

function classifyModeMismatch(testCase, labels) {
  if (testCase.expectedMode === 'no_exact_match') {
    labels.push('weak_no_match');
    if (hasBoundaryCheck(testCase)) {
      labels.push('boundary_leak');
    }
    return;
  }

  if (testCase.expectedMode === 'ambiguous_match') {
    labels.push('wrong_match');
    labels.push('collapse');
    if (hasBoundaryCheck(testCase)) {
      labels.push('boundary_leak');
    }
    return;
  }

  if (testCase.expectedMode === 'concept_match') {
    labels.push('wrong_match');
    if (hasBoundaryCheck(testCase)) {
      labels.push('collapse');
      labels.push('boundary_leak');
    }
    return;
  }

  if (testCase.expectedMode === 'invalid_input') {
    labels.push('weak_no_match');
    return;
  }

  labels.push('wrong_match');
}

function evaluateCase(testCase, attempts) {
  const firstAttempt = attempts[0];
  const hashes = attempts.map((attempt) => attempt.hash);
  const deterministic = hashes.every((hash) => hash === hashes[0]);
  const labels = [];
  const issues = [];
  let score = 2;

  if (!deterministic) {
    labels.push('drift');
    issues.push('repeated runs returned different response hashes');
    score = 0;
  }

  const actualMode = actualModeFromAttempt(firstAttempt);
  const actualCanonical = actualCanonicalFromAttempt(firstAttempt);
  const actualMethod = actualResolutionMethodFromAttempt(firstAttempt);
  const actualQueryType = actualQueryTypeFromAttempt(firstAttempt);
  const actualInterpretation = actualInterpretationFromAttempt(firstAttempt);
  const actualComparison = actualComparisonFromAttempt(firstAttempt);
  const actualCandidates = actualCandidatesFromAttempt(firstAttempt);
  const actualSuggestions = actualSuggestionsFromAttempt(firstAttempt);

  if (testCase.expectedMode === 'invalid_input') {
    if (actualMode !== 'invalid_input') {
      classifyModeMismatch(testCase, labels);
      issues.push(`expected invalid_input but received ${actualMode}`);
      score = 0;
    }
  } else {
    if (firstAttempt.status !== 200) {
      labels.push('wrong_match');
      issues.push(`expected product response but received HTTP ${firstAttempt.status}`);
      score = 0;
    } else if (actualMode !== testCase.expectedMode) {
      classifyModeMismatch(testCase, labels);
      issues.push(`expected ${testCase.expectedMode} but received ${actualMode}`);
      score = 0;
    }
  }

  if (testCase.expectedMode !== 'invalid_input' && firstAttempt.status === 200) {
    if (
      typeof testCase.expectedNormalizedQuery === 'string'
      && firstAttempt.bodyJson?.normalizedQuery !== testCase.expectedNormalizedQuery
    ) {
      labels.push('wrong_match');
      issues.push(
        `expected normalizedQuery "${testCase.expectedNormalizedQuery}" but received "${firstAttempt.bodyJson?.normalizedQuery}"`,
      );
      score = 0;
    }
  }

  if (
    testCase.expectedMode !== 'invalid_input'
    && firstAttempt.status === 200
    && typeof testCase.expectedMethod === 'string'
    && actualMethod !== testCase.expectedMethod
  ) {
    labels.push('wrong_match');
    issues.push(`expected resolution.method "${testCase.expectedMethod}" but received "${actualMethod}"`);
    score = 0;
  }

  if (
    testCase.expectedMode !== 'invalid_input'
    && firstAttempt.status === 200
    && typeof testCase.expectedQueryType === 'string'
    && actualQueryType !== testCase.expectedQueryType
  ) {
    labels.push('wrong_match');
    issues.push(`expected queryType "${testCase.expectedQueryType}" but received "${actualQueryType}"`);
    score = 0;
  }

  if (testCase.expectedMode !== 'invalid_input' && firstAttempt.status === 200) {
    try {
      assertValidProductResponse(firstAttempt.bodyJson);
    } catch (error) {
      labels.push('wrong_match');
      issues.push(error.message);
      score = 0;
    }
  }

  if (
    testCase.expectedMode !== 'invalid_input'
    && firstAttempt.status === 200
    && Object.hasOwn(testCase, 'expectedInterpretation')
    && !matchesSubset(actualInterpretation, testCase.expectedInterpretation)
  ) {
    labels.push('wrong_match');
    issues.push(
      `expected interpretation subset ${stableStringify(testCase.expectedInterpretation)} but received ${stableStringify(actualInterpretation)}`,
    );
    score = 0;
  }

  if (testCase.expectedMode === 'concept_match' && actualMode === 'concept_match') {
    if (actualCanonical !== testCase.expectedCanonical) {
      labels.push('wrong_match');
      if (hasBoundaryCheck(testCase)) {
        labels.push('collapse');
        labels.push('boundary_leak');
      }
      issues.push(`expected concept "${testCase.expectedCanonical}" but received "${actualCanonical}"`);
      score = 0;
    }
  }

  if (testCase.expectedMode === 'comparison' && actualMode === 'comparison') {
    if (
      Object.hasOwn(testCase, 'expectedComparison')
      && !matchesSubset(actualComparison, testCase.expectedComparison)
    ) {
      labels.push('wrong_match');
      issues.push(
        `expected comparison subset ${stableStringify(testCase.expectedComparison)} but received ${stableStringify(actualComparison)}`,
      );
      score = 0;
    }

    if (!actualComparison || !Array.isArray(actualComparison.axes) || actualComparison.axes.length === 0) {
      labels.push('wrong_match');
      issues.push('comparison response did not include authored axes');
      score = 0;
    }
  }

  if (testCase.expectedMode === 'ambiguous_match' && actualMode === 'ambiguous_match') {
    if (Array.isArray(testCase.expectedCandidates)) {
      const actualJson = stableStringify(actualCandidates);
      const expectedJson = stableStringify(testCase.expectedCandidates);
      if (actualJson !== expectedJson) {
        labels.push('wrong_match');
        issues.push(`expected candidates ${expectedJson} but received ${actualJson}`);
        score = 1;
      }
    }

    if (Array.isArray(testCase.allowedCanonicals)) {
      const actualJson = stableStringify(actualCandidates);
      const expectedJson = stableStringify(testCase.allowedCanonicals);
      if (actualJson !== expectedJson) {
        labels.push('collapse');
        labels.push('boundary_leak');
        issues.push(`allowed canonicals ${expectedJson} do not match actual candidates ${actualJson}`);
        score = Math.min(score, 1);
      }
    }
  }

  if (testCase.expectedMode === 'no_exact_match' && actualMode === 'no_exact_match') {
    const expectedSuggestions = Array.isArray(testCase.expectedSuggestions)
      ? testCase.expectedSuggestions
      : (testCase.allowAnySuggestions ? null : []);

    if (expectedSuggestions !== null) {
      const actualJson = stableStringify(actualSuggestions);
      const expectedJson = stableStringify(expectedSuggestions);
      if (actualJson !== expectedJson) {
        labels.push('weak_no_match');
        issues.push(`expected suggestions ${expectedJson} but received ${actualJson}`);
        score = 1;
      }
    }
  }

  if (
    testCase.expectedMode === 'no_exact_match'
    && actualMode === 'concept_match'
    && hasBoundaryCheck(testCase)
  ) {
    labels.push('collapse');
    labels.push('boundary_leak');
  }

  if (testCase.checks.includes('reject_garbage_input') && actualMode === 'concept_match') {
    labels.push('weak_no_match');
    issues.push('garbage-like query forced a canonical match');
    score = 0;
  }

  const manualReview = unique([
    ...(testCase.checks.includes('manual_boundary_review') ? ['boundary_leak'] : []),
    ...(testCase.checks.includes('manual_circularity_review') ? ['circularity'] : []),
  ]);

  return {
    id: testCase.id,
    bucket: testCase.bucket,
    query: testCase.query,
    checks: testCase.checks,
    notes: testCase.notes,
    expectedMode: testCase.expectedMode,
    expectedCanonical: testCase.expectedCanonical ?? null,
    expectedQueryType: testCase.expectedQueryType ?? null,
    expectedInterpretation: testCase.expectedInterpretation ?? null,
    expectedComparison: testCase.expectedComparison ?? null,
    expectedCandidates: testCase.expectedCandidates ?? [],
    expectedSuggestions: testCase.expectedSuggestions ?? [],
    actualMode,
    actualCanonical,
    actualQueryType,
    actualInterpretation,
    actualComparison,
    actualCandidates,
    actualSuggestions,
    statusCode: firstAttempt.status,
    deterministic,
    hashes,
    score,
    labels: unique(labels),
    issues,
    manualReview,
    firstResponse: firstAttempt.bodyJson ?? firstAttempt.bodyText,
  };
}

async function runAttempt(baseUrl, query) {
  const requestUrl = new URL('/api/v1/concepts/resolve', baseUrl);
  requestUrl.searchParams.set('q', query);

  const response = await fetch(requestUrl, {
    headers: {
      accept: 'application/json',
    },
  });

  const bodyText = await response.text();
  let bodyJson = null;

  try {
    bodyJson = JSON.parse(bodyText);
  } catch {
    bodyJson = null;
  }

  return {
    status: response.status,
    bodyText,
    bodyJson,
    hash: hashText(bodyText),
  };
}

function buildSummary(report) {
  const lines = [
    '# Query Stress Summary v1',
    '',
    `- Base URL: \`${report.baseUrl}\``,
    `- Pack version: \`${report.packVersion}\``,
    `- Total cases: \`${report.summary.totalCases}\``,
    `- Passed: \`${report.summary.passed}\``,
    `- Partial: \`${report.summary.partial}\``,
    `- Failed: \`${report.summary.failed}\``,
    `- Average score: \`${report.summary.averageScore}\``,
    `- Deterministic failures: \`${report.summary.driftCount}\``,
    '',
    '## Failure Labels',
    '',
  ];

  for (const [label, count] of Object.entries(report.summary.labelCounts)) {
    lines.push(`- \`${label}\`: \`${count}\``);
  }

  lines.push('', '## Bucket Scores', '', '| Bucket | Cases | Passed | Partial | Failed | Average |', '| --- | --- | --- | --- | --- | --- |');

  for (const bucket of report.summary.bucketScores) {
    lines.push(
      `| \`${bucket.bucket}\` | ${bucket.cases} | ${bucket.passed} | ${bucket.partial} | ${bucket.failed} | ${bucket.averageScore} |`,
    );
  }

  lines.push('', '## Failed Or Partial Cases', '');

  const flagged = report.results.filter((result) => result.score < 2);
  if (flagged.length === 0) {
    lines.push('- none');
  } else {
    for (const result of flagged) {
      const labelText = result.labels.length > 0 ? result.labels.join(', ') : 'unlabeled';
      lines.push(`- \`${result.id}\` score=${result.score} labels=[${labelText}] query="${result.query}"`);
      if (result.issues.length > 0) {
        lines.push(`  issues: ${result.issues.join(' | ')}`);
      }
      if (result.manualReview.length > 0) {
        lines.push(`  manual review: ${result.manualReview.join(', ')}`);
      }
    }
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const baseUrl = FIXED_BASE_URL;
  const fixturePack = loadFixturePack();
  const results = [];

  for (const testCase of fixturePack) {
    const repeatCount = Number.isInteger(testCase.repeatCount) ? testCase.repeatCount : 3;
    const attempts = [];

    for (let index = 0; index < repeatCount; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      attempts.push(await runAttempt(baseUrl, testCase.query));
    }

    results.push(evaluateCase(testCase, attempts));
  }

  const totalScore = results.reduce((sum, result) => sum + result.score, 0);
  const labelCounts = {
    collapse: 0,
    drift: 0,
    wrong_match: 0,
    boundary_leak: 0,
    circularity: 0,
    weak_no_match: 0,
  };

  for (const result of results) {
    for (const label of result.labels) {
      if (labelCounts[label] !== undefined) {
        labelCounts[label] += 1;
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    packVersion: 'v1',
    summary: {
      totalCases: results.length,
      passed: results.filter((result) => result.score === 2).length,
      partial: results.filter((result) => result.score === 1).length,
      failed: results.filter((result) => result.score === 0).length,
      averageScore: Number((totalScore / results.length).toFixed(3)),
      driftCount: labelCounts.drift,
      labelCounts,
      bucketScores: bucketTable(results),
    },
    results,
  };

  fs.mkdirSync(reportsDirectory, { recursive: true });
  fs.writeFileSync(reportPath, `${stableStringify(report)}\n`);
  fs.writeFileSync(summaryPath, buildSummary(report));

  process.stdout.write(`Wrote ${reportPath}\n`);
  process.stdout.write(`Wrote ${summaryPath}\n`);
  process.stdout.write(
    `Stress pack complete: ${report.summary.passed} passed, ${report.summary.partial} partial, ${report.summary.failed} failed.\n`,
  );

  if (report.summary.failed > 0 || report.summary.driftCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`[chatpdm-boundary] stress runner failed: ${error.stack || error.message}\n`);
  process.exit(1);
});
