'use strict';

const path = require('node:path');

const {
  releaseReferencePack,
} = require('./reference-pack-lifecycle');
const { resolveModuleRoot } = require('./reference-pack-utils');

function parseArgs(argv) {
  const args = {
    rootDir: resolveModuleRoot(path.resolve(__dirname)),
    manifestPath: path.join(path.resolve(__dirname), 'reference-pack-manifest.json'),
    artifactRoot: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--rootDir' && typeof argv[index + 1] === 'string') {
      args.rootDir = resolveModuleRoot(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token.startsWith('--rootDir=')) {
      args.rootDir = resolveModuleRoot(token.slice('--rootDir='.length));
      continue;
    }

    if (token === '--manifestPath' && typeof argv[index + 1] === 'string') {
      args.manifestPath = path.isAbsolute(argv[index + 1])
        ? argv[index + 1]
        : path.join(args.rootDir, argv[index + 1]);
      index += 1;
      continue;
    }

    if (token.startsWith('--manifestPath=')) {
      const value = token.slice('--manifestPath='.length);
      args.manifestPath = path.isAbsolute(value)
        ? value
        : path.join(args.rootDir, value);
      continue;
    }

    if (token === '--artifactRoot' && typeof argv[index + 1] === 'string') {
      args.artifactRoot = argv[index + 1];
      index += 1;
      continue;
    }

    if (token.startsWith('--artifactRoot=')) {
      args.artifactRoot = token.slice('--artifactRoot='.length);
    }
  }

  return args;
}

function main(argv) {
  const result = releaseReferencePack(parseArgs(argv));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.valid) {
    process.exitCode = 1;
  }
}

module.exports = {
  releaseReferencePack,
  main,
};

if (require.main === module) {
  main(process.argv.slice(2));
}
