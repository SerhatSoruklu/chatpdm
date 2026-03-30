'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020');

const { scanRepository } = require('./ai-governance-scan');
const {
  AiGovernanceBoundaryError,
  assertCanonicalStoreFreeOfAiMarkers,
  assertCanonicalWriteInputFreeOfAiMarkers,
  assertDeterministicPathFreeOfAiMarkers,
} = require('../backend/src/lib/ai-governance-guard');

const repoRoot = path.resolve(__dirname, '..');
const violationsDirectory = path.join(repoRoot, 'governance/violations');
const schemaPath = path.join(violationsDirectory, 'violation.schema.json');

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
});

const violationSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const validateViolation = ajv.compile(violationSchema);

function main() {
  const format = process.argv.includes('--format=json') ? 'json' : 'text';

  try {
    const violations = loadViolations();
    const results = violations.map(replayViolation);
    printResults(results, format);

    if (results.some((result) => result.status === 'FAIL')) {
      process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    process.stderr.write(`replay-ai-violations: failed - ${message}\n`);
    process.exit(1);
  }
}

function loadViolations() {
  const entries = fs.readdirSync(violationsDirectory)
    .filter((fileName) => fileName.endsWith('.json') && fileName !== 'violation.schema.json')
    .sort();

  if (entries.length === 0) {
    throw new Error('no AI governance violation fixtures were found.');
  }

  return entries.map((fileName) => {
    const filePath = path.join(violationsDirectory, fileName);
    const record = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!validateViolation(record)) {
      const detail = (validateViolation.errors || [])
        .map((error) => `${error.instancePath || '/'} ${error.message}`)
        .join('; ');
      throw new Error(`violation fixture "${fileName}" is invalid: ${detail}`);
    }

    return {
      fileName,
      filePath,
      record,
    };
  });
}

function replayViolation(entry) {
  if (entry.record.trigger.mode === 'scanner_fixture') {
    return replayScannerFixture(entry);
  }

  if (entry.record.trigger.mode === 'runtime_guard') {
    return replayRuntimeGuard(entry);
  }

  return {
    id: entry.record.id,
    expected: entry.record.expected_outcome,
    actual: 'unsupported',
    status: 'FAIL',
    explanation: `Unsupported replay mode "${entry.record.trigger.mode}".`,
  };
}

function replayScannerFixture(entry) {
  const trigger = entry.record.trigger;
  const absoluteFixturePath = path.join(repoRoot, trigger.file_path);

  if (fs.existsSync(absoluteFixturePath)) {
    throw new Error(`replay fixture path already exists: ${trigger.file_path}`);
  }

  fs.mkdirSync(path.dirname(absoluteFixturePath), { recursive: true });
  fs.writeFileSync(absoluteFixturePath, trigger.content, 'utf8');

  try {
    const report = scanRepository({
      changedFiles: [trigger.file_path],
    });
    const relevantFindings = report.findings.filter((finding) => finding.filePath === normalizePath(trigger.file_path));
    const expectedRuleFinding = relevantFindings.find((finding) => finding.rule === trigger.expected_rule);
    const chosenFinding = expectedRuleFinding || relevantFindings[0] || null;
    const actual = deriveOutcomeFromFinding(chosenFinding);
    const status = actual === entry.record.expected_outcome ? 'PASS' : 'FAIL';
    const ruleSummary = relevantFindings.length > 0
      ? relevantFindings.map((finding) => `${finding.rule}:${finding.severity}`).join(',')
      : 'none';

    return {
      id: entry.record.id,
      expected: entry.record.expected_outcome,
      actual,
      status,
      explanation: expectedRuleFinding
        ? `Detected ${expectedRuleFinding.rule} with severity ${expectedRuleFinding.severity}.`
        : `Observed findings=${ruleSummary}. Expected rule=${trigger.expected_rule}.`,
    };
  } finally {
    safeUnlink(absoluteFixturePath);
    cleanupEmptyParents(path.dirname(absoluteFixturePath));
  }
}

function replayRuntimeGuard(entry) {
  const trigger = entry.record.trigger;
  const guardMap = {
    canonical_store: assertCanonicalStoreFreeOfAiMarkers,
    canonical_write_input: assertCanonicalWriteInputFreeOfAiMarkers,
    deterministic_path: assertDeterministicPathFreeOfAiMarkers,
  };

  const guardFn = guardMap[trigger.guard];

  if (!guardFn) {
    return {
      id: entry.record.id,
      expected: entry.record.expected_outcome,
      actual: 'unsupported',
      status: 'FAIL',
      explanation: `Unsupported runtime guard "${trigger.guard}".`,
    };
  }

  try {
    guardFn(trigger.payload, trigger.context);

    return {
      id: entry.record.id,
      expected: entry.record.expected_outcome,
      actual: 'missed',
      status: entry.record.expected_outcome === 'missed' ? 'PASS' : 'FAIL',
      explanation: `Guard "${trigger.guard}" allowed the payload.`,
    };
  } catch (error) {
    if (error instanceof AiGovernanceBoundaryError) {
      const actual = 'blocked';
      return {
        id: entry.record.id,
        expected: entry.record.expected_outcome,
        actual,
        status: actual === entry.record.expected_outcome ? 'PASS' : 'FAIL',
        explanation: `${error.code} at ${error.details?.path || 'unknown path'}.`,
      };
    }

    throw error;
  }
}

function deriveOutcomeFromFinding(finding) {
  if (!finding) {
    return 'missed';
  }

  return finding.severity === 'blocker' ? 'blocked' : 'flagged';
}

function printResults(results, format = 'text') {
  const summary = {
    total: results.length,
    passed: results.filter((result) => result.status === 'PASS').length,
    failed: results.filter((result) => result.status === 'FAIL').length,
  };

  if (format === 'json') {
    process.stdout.write(`${JSON.stringify({ results, summary }, null, 2)}\n`);
    return;
  }

  results.forEach((result) => {
    process.stdout.write(
      `${result.status} violation=${result.id} expected=${result.expected} actual=${result.actual} explanation="${result.explanation}"\n`,
    );
  });

  process.stdout.write(`SUMMARY total=${summary.total} passed=${summary.passed} failed=${summary.failed}\n`);
}

function safeUnlink(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

function cleanupEmptyParents(directoryPath) {
  let currentPath = directoryPath;

  while (currentPath.startsWith(repoRoot) && currentPath !== repoRoot) {
    try {
      fs.rmdirSync(currentPath);
    } catch {
      break;
    }

    currentPath = path.dirname(currentPath);
  }
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

main();
