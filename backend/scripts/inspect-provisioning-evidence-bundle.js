'use strict';

// INTEGRITY LAW:
// This module is governed by docs/INTERGRITY_RUNTIME_LAWS.md
// Violations of canonical truth, refusal boundary, or hashing determinism are forbidden.

const fs = require('node:fs/promises');

const { connectMongo, disconnectMongo } = require('../src/config/mongoose');
const {
  inspectProvisioningEvidenceBundle,
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

  const bundlePathIndex = argv.indexOf('--bundle-path');
  const bundlePath = bundlePathIndex === -1 ? null : argv[bundlePathIndex + 1];

  if (bundlePathIndex !== -1 && !bundlePath) {
    throw new Error('--bundle-path requires a value.');
  }

  return {
    requestId,
    bundlePath,
  };
}

async function readStdin() {
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  return chunks.join('');
}

async function loadBundleInput(bundlePath) {
  if (bundlePath) {
    return fs.readFile(bundlePath, 'utf8');
  }

  return readStdin();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rawBundle = await loadBundleInput(args.bundlePath);
  let bundle;

  try {
    bundle = JSON.parse(rawBundle);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({
      status: 'invalid',
      reason: 'bundle_malformed',
      requestId: args.requestId,
      bundle: null,
      verificationResult: null,
    })}\n`);
    return;
  }

  await connectMongo(process.env.MONGODB_URI);

  try {
    const result = await inspectProvisioningEvidenceBundle(args.requestId, bundle);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await disconnectMongo();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
