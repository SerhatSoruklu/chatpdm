'use strict';

const {
  runCrossLayerAttackSimulation,
} = require('../src/modules/concepts/cross-layer-attack-harness');

function main() {
  const results = runCrossLayerAttackSimulation();
  const failures = results.filter((result) => result.leakage_detected);

  results.forEach((result) => {
    if (result.leakage_detected) {
      process.stdout.write(`FAIL ${result.name}\n`);
      return;
    }

    process.stdout.write(`PASS ${result.name}\n`);
  });

  if (failures.length > 0) {
    const summary = failures
      .map((failure) => (
        `${failure.name}: final_state=${failure.final_state} admission_state=${failure.metadata.admission_state} resolution_type=${failure.metadata.resolution_type}`
      ))
      .join(' | ');
    throw new Error(`Cross-layer leakage detected: ${summary}`);
  }

  process.stdout.write('SYSTEM HOLDS\n');
}

main();
