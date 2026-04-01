'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  runFullPipeline,
} = require('../src/modules/concepts/pipeline-runner');

const fixturePath = path.resolve(
  __dirname,
  '../../tests/runtime/fixtures/phase-6-adversarial-scenarios.json',
);

function loadScenarios() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function buildScenarioResult(scenario) {
  const pipelineResult = runFullPipeline(scenario.input);
  const finalOutput = pipelineResult.final_output;
  const hasViolation = (
    finalOutput.reason === 'output_validation_failed'
    || finalOutput.state !== scenario.expectedFinalState
    || finalOutput.type !== scenario.expectedType
  );

  return {
    input: scenario.input,
    final_state: finalOutput.state,
    phase_path: pipelineResult.phase_path,
    violation: hasViolation,
  };
}

function main() {
  const scenarios = loadScenarios();
  const results = scenarios.map(buildScenarioResult);
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
}

main();
