'use strict';

const {
  runDerivedConceptStressTest,
} = require('../src/modules/concepts/derived-concept-stress-harness');

function main() {
  const results = runDerivedConceptStressTest().map((result) => {
    const output = {
      concept: result.concept,
      reducible: result.reducible,
      kernel_status: result.kernel_status,
      reduction_path: result.reduction_path,
    };

    if (!result.reducible) {
      output.gap = result.gap;
    }

    return output;
  });

  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
}

main();
