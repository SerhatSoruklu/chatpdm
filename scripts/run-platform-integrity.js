'use strict';

const path = require('node:path');
const {
  DEFAULT_PATHS,
  appendIntegrityLog,
  buildBaselineSnapshot,
  loadBaseline,
  runPlatformIntegritySuite,
  writeJson,
} = require('../tests/platform-integrity.spec');

const refreshBaseline = process.argv.includes('--refresh-baseline');
const baselinePath = DEFAULT_PATHS.baselinePath;
const resultsPath = DEFAULT_PATHS.resultsPath;
const logPath = DEFAULT_PATHS.logPath;

function main() {
  if (refreshBaseline) {
    const baseline = buildBaselineSnapshot();
    writeJson(baselinePath, baseline);
  }

  const baseline = loadBaseline(baselinePath);
  const result = runPlatformIntegritySuite({
    baseline,
    executedAt: new Date().toISOString(),
  });

  writeJson(resultsPath, result);
  appendIntegrityLog(result, logPath);

  process.stdout.write(`Platform integrity score: ${result.score.total}/${result.score.max}\n`);
  process.stdout.write(`Status: ${result.status}\n`);
  process.stdout.write(`Baseline: ${path.relative(process.cwd(), baselinePath)}\n`);
  process.stdout.write(`Results: ${path.relative(process.cwd(), resultsPath)}\n`);
  process.stdout.write(`Log: ${path.relative(process.cwd(), logPath)}\n`);

  if (result.status === 'FAIL') {
    process.exitCode = 1;
  }
}

main();
