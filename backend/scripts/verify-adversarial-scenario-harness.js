'use strict';

const assert = require('node:assert/strict');
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

function runScenario(scenario) {
  const pipelineResult = runFullPipeline(scenario.input);
  const finalOutput = pipelineResult.final_output;
  const violationReasons = [];

  if (finalOutput.reason === 'output_validation_failed') {
    violationReasons.push('output_validation_failed');
  }

  if (finalOutput.state !== scenario.expectedFinalState) {
    violationReasons.push(
      `expected final_state ${scenario.expectedFinalState} but received ${finalOutput.state}`,
    );
  }

  if (finalOutput.type !== scenario.expectedType) {
    violationReasons.push(
      `expected output type ${scenario.expectedType} but received ${finalOutput.type}`,
    );
  }

  if (pipelineResult.admission_state !== 'NOT_A_CONCEPT') {
    violationReasons.push(
      `expected admission_state NOT_A_CONCEPT but received ${pipelineResult.admission_state}`,
    );
  }

  if (pipelineResult.resolution_output.type !== scenario.expectedType) {
    violationReasons.push(
      `expected resolution output type ${scenario.expectedType} but received ${pipelineResult.resolution_output.type}`,
    );
  }

  if (pipelineResult.final_output.state === 'valid') {
    violationReasons.push('valid output is not allowed for adversarial scenarios');
  }

  if (pipelineResult.final_output.state === 'classified') {
    violationReasons.push('classified output is not allowed for adversarial scenarios');
  }

  if (pipelineResult.vocabulary_recognition.recognized === true) {
    violationReasons.push('vocabulary classification leakage is not allowed for adversarial scenarios');
  }

  return {
    scenario,
    pipelineResult,
    finalOutput,
    violation: violationReasons.length > 0,
    violationReasons,
  };
}

function main() {
  const scenarios = loadScenarios();
  const results = scenarios.map(runScenario);
  const failures = results.filter((result) => result.violation);

  results.forEach((result) => {
    assert.deepEqual(
      result.pipelineResult.phase_path,
      [0, 1, 2, 3, 4, 5],
      `${result.scenario.name} phase_path mismatch.`,
    );

    process.stdout.write(`PASS ${result.scenario.name}\n`);
  });

  if (failures.length > 0) {
    const summary = failures
      .map((failure) => `${failure.scenario.name}: ${failure.violationReasons.join('; ')}`)
      .join(' | ');
    throw new Error(`SYSTEM BREAKS: ${summary}`);
  }

  process.stdout.write('SYSTEM HOLDS\n');
}

main();
