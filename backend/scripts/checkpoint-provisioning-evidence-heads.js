'use strict';

// INTEGRITY LAW:
// This module is governed by docs/INTERGRITY_RUNTIME_LAWS.md
// Violations of canonical truth, refusal boundary, or hashing determinism are forbidden.

const { connectMongo, disconnectMongo } = require('../src/config/mongoose');
const ProvisioningEvidenceChainHead = require('../src/modules/managed-access/provisioning-evidence-chain-head.model');
const ProvisioningEvidenceEvent = require('../src/modules/managed-access/provisioning-evidence-event.model');
const {
  rebuildProvisioningEvidenceSignedCheckpoint,
} = require('../src/modules/managed-access/provisioning-evidence-checkpoint.service');

function parseArgs(argv) {
  const requestIdIndex = argv.indexOf('--request-id');

  if (requestIdIndex !== -1) {
    const requestId = argv[requestIdIndex + 1];

    if (!requestId) {
      throw new Error('--request-id requires a value.');
    }

    return { requestId };
  }

  if (argv.includes('--all')) {
    return { all: true };
  }

  throw new Error('Provide either --request-id <id> or --all.');
}

async function loadAllRequestIds() {
  const [chainHeadRequestIds, eventRequestIds] = await Promise.all([
    ProvisioningEvidenceChainHead.distinct('requestId'),
    ProvisioningEvidenceEvent.distinct('requestId'),
  ]);

  return [...new Set(
    [...chainHeadRequestIds, ...eventRequestIds].map((value) => String(value)),
  )].sort();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await connectMongo(process.env.MONGODB_URI);

  try {
    const requestIds = args.requestId ? [args.requestId] : await loadAllRequestIds();

    for (const requestId of requestIds) {
      const result = await rebuildProvisioningEvidenceSignedCheckpoint(requestId);
      process.stdout.write(`${JSON.stringify(result)}\n`);
    }
  } finally {
    await disconnectMongo();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
