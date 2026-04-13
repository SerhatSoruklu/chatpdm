'use strict';

const path = require('node:path');

const {
  runAllMilitaryConstraintChecks,
} = require('../backend/src/modules/military-constraints/reference-pack-lifecycle');

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const result = runAllMilitaryConstraintChecks({
    rootDir: path.join(repoRoot, 'backend', 'src', 'modules', 'military-constraints'),
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

  if (!result.valid) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
};
