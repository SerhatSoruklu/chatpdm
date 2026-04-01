'use strict';

const {
  runCorePrimitiveCollapseAudit,
} = require('../src/modules/concepts/core-primitive-collapse-audit');

function main() {
  const results = runCorePrimitiveCollapseAudit().map((result) => ({
    primitive: result.primitive,
    reducible: result.reducible,
    reason: result.reason,
  }));

  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
}

main();
