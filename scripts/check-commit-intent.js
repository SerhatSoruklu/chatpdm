'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ALLOWED_PREFIXES = Object.freeze([
  '[semantic-change]',
  '[register-change]',
  '[refactor]',
  '[golden-update]',
]);

function parseArguments(argv) {
  const options = {
    file: null,
    message: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--file') {
      options.file = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument === '--message') {
      options.message = argv[index + 1];
      index += 1;
    }
  }

  return options;
}

function readCommitMessage(options) {
  if (typeof options.message === 'string') {
    return options.message;
  }

  if (typeof options.file === 'string') {
    return fs.readFileSync(path.resolve(options.file), 'utf8');
  }

  const defaultEditMessage = path.resolve(__dirname, '../.git/COMMIT_EDITMSG');
  if (fs.existsSync(defaultEditMessage)) {
    return fs.readFileSync(defaultEditMessage, 'utf8');
  }

  const result = spawnSync('git', ['log', '-1', '--pretty=%B'], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
  });

  if (result.status === 0) {
    return result.stdout;
  }

  return '';
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const message = readCommitMessage(options).trim();

  if (ALLOWED_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    process.stdout.write(`commit-intent: ok (${ALLOWED_PREFIXES.find((prefix) => message.startsWith(prefix))})\n`);
    return;
  }

  process.stderr.write(
    `commit-intent: warning - missing explicit intent tag. Use one of: ${ALLOWED_PREFIXES.join(', ')}\n`,
  );
}

main();
