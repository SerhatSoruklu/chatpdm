'use strict';

const { evaluateEditDiscipline } = require('./lib/register-validation/edit-discipline');

function parseArgs(argv) {
  const options = {
    ref: undefined,
    mode: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--ref') {
      options.ref = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === '--mode') {
      options.mode = argv[index + 1];
      index += 1;
    }
  }

  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = evaluateEditDiscipline(options);

  process.stdout.write(
    `register-edit-discipline mode=${report.mode} baseRef=${report.baseRef} warnings=${report.warningCount}\n`,
  );

  report.warnings.forEach((warning) => {
    process.stdout.write(
      `WARN ${warning.conceptId} ${warning.code}${warning.detail ? ` ${warning.detail}` : ''}\n`,
    );
  });

  if (!report.passed) {
    process.exitCode = 1;
  }
}

main();
