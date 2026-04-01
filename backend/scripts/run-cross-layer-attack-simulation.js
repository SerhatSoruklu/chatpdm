'use strict';

const {
  runCrossLayerAttackSimulation,
} = require('../src/modules/concepts/cross-layer-attack-harness');

function main() {
  const results = runCrossLayerAttackSimulation().map((result) => ({
    input: result.input,
    leakage_detected: result.leakage_detected,
    final_state: result.final_state,
  }));

  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
}

main();
