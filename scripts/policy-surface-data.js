'use strict';

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const defaultPolicySurfaceDataPath = path.join(
  repoRoot,
  'frontend',
  'src',
  'app',
  'policies',
  'policy-surface.data.ts',
);

function loadPolicySurfaceRegistry(filePath = defaultPolicySurfaceDataPath) {
  let fileContents;

  try {
    fileContents = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(
      `Failed to read live policy claim dataset at ${relativeToRepo(filePath)}: ${error.message}`,
    );
  }

  const startToken = 'export const POLICY_SURFACE_DATA = ';
  const endToken = ' satisfies PolicySurfaceRegistry;';
  const startIndex = fileContents.indexOf(startToken);
  const endIndex = fileContents.lastIndexOf(endToken);

  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error(
      `Unable to parse live policy claim dataset from ${relativeToRepo(filePath)}. The generated policy surface file shape is no longer recognized.`,
    );
  }

  const jsonText = fileContents
    .slice(startIndex + startToken.length, endIndex)
    .trim();

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    throw new Error(
      `Failed to parse generated policy claim dataset at ${relativeToRepo(filePath)}: ${error.message}`,
    );
  }
}

function loadPolicyClaims(filePath = defaultPolicySurfaceDataPath) {
  const registry = loadPolicySurfaceRegistry(filePath);
  const claims = [];

  for (const [surfaceKey, surface] of Object.entries(registry)) {
    if (!surface || !Array.isArray(surface.claims)) {
      continue;
    }

    for (const claim of surface.claims) {
      claims.push({
        surfaceKey,
        ...claim,
      });
    }
  }

  if (claims.length === 0) {
    throw new Error(
      `No live policy claims were found in ${relativeToRepo(filePath)}. Contract consumers cannot continue without the generated policy dataset.`,
    );
  }

  return claims;
}

function loadLiveClaimIds(filePath = defaultPolicySurfaceDataPath) {
  const claimIds = new Set(loadPolicyClaims(filePath).map((claim) => claim.id));

  if (claimIds.size === 0) {
    throw new Error(
      `No live claim IDs were found in ${relativeToRepo(filePath)}. Governance validation cannot continue without the generated policy dataset.`,
    );
  }

  return claimIds;
}

function relativeToRepo(filePath) {
  return path.relative(repoRoot, filePath) || '.';
}

module.exports = {
  defaultPolicySurfaceDataPath,
  loadLiveClaimIds,
  loadPolicyClaims,
  loadPolicySurfaceRegistry,
};
