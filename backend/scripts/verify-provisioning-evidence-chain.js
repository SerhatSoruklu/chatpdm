'use strict';

// INTEGRITY LAW:
// This module is governed by docs/INTERGRITY_RUNTIME_LAWS.md
// Violations of canonical truth, refusal boundary, or hashing determinism are forbidden.

const { connectMongo, disconnectMongo } = require('../src/config/mongoose');
const {
  verifyProvisioningEvidenceChain,
} = require('../src/modules/managed-access/provisioning-evidence-chain-verifier');

function parseArgs(argv) {
  const requestIdIndex = argv.indexOf('--request-id');

  if (requestIdIndex === -1) {
    throw new Error('Provide --request-id <id>.');
  }

  const requestId = argv[requestIdIndex + 1];

  if (!requestId) {
    throw new Error('--request-id requires a value.');
  }

  return { requestId };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await connectMongo(process.env.MONGODB_URI);

  try {
    const result = await verifyProvisioningEvidenceChain(args.requestId);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await disconnectMongo();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
