'use strict';

// INTEGRITY LAW:
// This module is governed by docs/INTERGRITY_RUNTIME_LAWS.md
// Violations of canonical truth, refusal boundary, or hashing determinism are forbidden.

const { connectMongo, disconnectMongo } = require('../src/config/mongoose');
const {
  buildProvisioningEvidenceBundle,
  writeProvisioningEvidenceBundleFile,
} = require('../src/modules/managed-access/provisioning-evidence-bundle.service');

function parseArgs(argv) {
  const requestIdIndex = argv.indexOf('--request-id');

  if (requestIdIndex === -1) {
    throw new Error('Provide --request-id <id>.');
  }

  const requestId = argv[requestIdIndex + 1];

  if (!requestId) {
    throw new Error('--request-id requires a value.');
  }

  const outputIndex = argv.indexOf('--output');
  const outputPath = outputIndex === -1 ? null : argv[outputIndex + 1];

  if (outputIndex !== -1 && !outputPath) {
    throw new Error('--output requires a value.');
  }

  return {
    requestId,
    outputPath,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await connectMongo(process.env.MONGODB_URI);

  try {
    const result = await buildProvisioningEvidenceBundle(args.requestId);

    if (result.status === 'valid' && args.outputPath) {
      await writeProvisioningEvidenceBundleFile(args.outputPath, result.bundle);
      process.stdout.write(`${JSON.stringify({
        status: 'written',
        reason: 'bundle_written',
        requestId: result.requestId,
        bundlePath: args.outputPath,
      })}\n`);
      return;
    }

    if (result.status === 'valid') {
      process.stdout.write(`${JSON.stringify(result.bundle, null, 2)}\n`);
      return;
    }

    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await disconnectMongo();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
