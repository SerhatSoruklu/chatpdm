'use strict';

const { connectMongo, disconnectMongo } = require('../src/config/mongoose');
const ProvisioningEvidenceChainHead = require('../src/modules/managed-access/provisioning-evidence-chain-head.model');
const {
  repairProvisioningEvidenceChainHead,
} = require('../src/modules/managed-access/provisioning-evidence-chain.service');

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await connectMongo(process.env.MONGODB_URI);

  try {
    const requestIds = args.requestId
      ? [args.requestId]
      : (await ProvisioningEvidenceChainHead.find({
        inFlightAppendToken: { $type: 'string' },
      }).distinct('requestId')).map((value) => String(value));

    for (const requestId of requestIds) {
      const result = await repairProvisioningEvidenceChainHead(requestId);
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
