'use strict';

const {
  DERIVED_CONCEPT_KERNEL_STATUSES,
  runDerivedConceptStressTest,
} = require('../src/modules/concepts/derived-concept-stress-harness');

function main() {
  const results = runDerivedConceptStressTest();
  const gaps = results.filter(
    (result) => result.kernel_status === DERIVED_CONCEPT_KERNEL_STATUSES.REAL_CORE_GAP,
  );
  const breachResult = results.find((result) => result.concept === 'breach');

  if (!breachResult) {
    throw new Error('Derived concept stress test must include breach.');
  }

  if (breachResult.kernel_status !== DERIVED_CONCEPT_KERNEL_STATUSES.OUT_OF_SCOPE_DEPENDENCY) {
    throw new Error(`breach kernel_status drifted: expected OUT_OF_SCOPE_DEPENDENCY, received ${breachResult.kernel_status}.`);
  }

  results.forEach((result) => {
    process.stdout.write(
      `PASS ${result.concept} reducible=${result.reducible} kernel_status=${result.kernel_status}\n`,
    );
  });

  if (gaps.length > 0) {
    const summary = gaps
      .map((gap) => `${gap.concept}: ${gap.gap}`)
      .join(' | ');
    throw new Error(`SYSTEM BREAKS: ${summary}`);
  }

  process.stdout.write('SYSTEM HOLDS\n');
}

main();
