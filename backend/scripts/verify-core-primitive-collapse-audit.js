'use strict';

const {
  runCorePrimitiveCollapseAudit,
} = require('../src/modules/concepts/core-primitive-collapse-audit');

function main() {
  const results = runCorePrimitiveCollapseAudit();
  const failures = results.filter((result) => result.reducible === true);

  results.forEach((result) => {
    if (result.reducible) {
      process.stdout.write(`FAIL ${result.primitive}\n`);
      return;
    }

    process.stdout.write(`PASS ${result.primitive}\n`);
  });

  if (failures.length > 0) {
    const summary = failures
      .map((failure) => `${failure.primitive}: ${failure.reason}`)
      .join(' | ');
    throw new Error(`SYSTEM FAIL: ${summary}`);
  }

  process.stdout.write('SYSTEM HOLDS\n');
}

main();
