const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const defaultPolicyClaimRegistryDir = path.join(repoRoot, 'data', 'policy-claim-registry');

const POLICY_SURFACE_KEYS = Object.freeze([
  'privacy',
  'terms',
  'cookies',
  'data-retention',
  'acceptable-use',
]);

const ALLOWED_TRACE_STATUSES = new Set(['mapped', 'unmapped', 'unclear', 'conflicts_with_system']);
const ALLOWED_CLAIM_STATES = new Set(['draft', 'published', 'superseded']);

function loadPolicyClaimRegistry(registryDir = defaultPolicyClaimRegistryDir) {
  const registry = Object.fromEntries(
    POLICY_SURFACE_KEYS.map((key) => [key, loadPolicyClaimRegistrySurface(key, registryDir)]),
  );

  validateClaimIdUniqueness(registry);

  return registry;
}

function getPolicyClaimRegistryPath(key, registryDir = defaultPolicyClaimRegistryDir) {
  return path.join(registryDir, `${key}.json`);
}

function loadPolicyClaimRegistrySurface(key, registryDir = defaultPolicyClaimRegistryDir) {
  const filePath = getPolicyClaimRegistryPath(key, registryDir);
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);

  validateSurfaceShape(key, parsed);

  return parsed;
}

function validateSurfaceShape(expectedKey, value) {
  if (!isRecord(value)) {
    throw new Error(`Policy claim registry surface must be an object: ${expectedKey}`);
  }

  if (value.key !== expectedKey) {
    throw new Error(`Policy claim registry surface key mismatch: expected ${expectedKey}`);
  }

  if (!isPositiveInteger(value.version)) {
    throw new Error(`Policy claim registry surface version must be a positive integer: ${expectedKey}`);
  }

  if (!ALLOWED_CLAIM_STATES.has(value.state)) {
    throw new Error(`Policy claim registry surface state is invalid: ${expectedKey}`);
  }

  if (!Array.isArray(value.claims)) {
    throw new Error(`Policy claim registry surface claims must be an array: ${expectedKey}`);
  }

  value.claims.forEach((claim, index) => validateClaimShape(expectedKey, claim, index));
}

function validateClaimShape(surfaceKey, value, index) {
  if (!isRecord(value)) {
    throw new Error(`Policy claim registry entry must be an object: ${surfaceKey}[${index}]`);
  }

  assertNonEmptyString(value.id, `Policy claim registry entry id is required: ${surfaceKey}[${index}]`);

  if (!value.id.startsWith(`${surfaceKey}-`)) {
    throw new Error(`Policy claim registry entry id must start with ${surfaceKey}-: ${surfaceKey}[${index}]`);
  }

  if (!isPositiveInteger(value.version)) {
    throw new Error(`Policy claim registry entry version must be a positive integer: ${surfaceKey}[${index}]`);
  }

  if (!ALLOWED_CLAIM_STATES.has(value.state)) {
    throw new Error(`Policy claim registry entry state is invalid: ${surfaceKey}[${index}]`);
  }

  assertNonEmptyString(
    value.policyFile,
    `Policy claim registry entry policyFile is required: ${surfaceKey}[${index}]`,
  );

  if (value.policyFile !== `${surfaceKey}.md`) {
    throw new Error(
      `Policy claim registry entry policyFile must match ${surfaceKey}.md: ${surfaceKey}[${index}]`,
    );
  }

  assertNonEmptyString(
    value.section,
    `Policy claim registry entry section is required: ${surfaceKey}[${index}]`,
  );
  assertNonEmptyString(
    value.policySentence,
    `Policy claim registry entry policySentence is required: ${surfaceKey}[${index}]`,
  );
  assertNonEmptyString(
    value.canonicalClaim,
    `Policy claim registry entry canonicalClaim is required: ${surfaceKey}[${index}]`,
  );
  assertNonEmptyString(
    value.claimClass,
    `Policy claim registry entry claimClass is required: ${surfaceKey}[${index}]`,
  );

  if (!ALLOWED_TRACE_STATUSES.has(value.status)) {
    throw new Error(`Policy claim registry entry status is invalid: ${surfaceKey}[${index}]`);
  }

  if (typeof value.notes !== 'string') {
    throw new Error(`Policy claim registry entry notes must be a string: ${surfaceKey}[${index}]`);
  }

  validateLifecycleShape(value.lifecycle, surfaceKey, index);
  validateEvidenceLinks(value.evidenceLinks, surfaceKey, index);
}

function validateLifecycleShape(lifecycle, surfaceKey, index) {
  if (!isRecord(lifecycle)) {
    throw new Error(`Policy claim lifecycle must be an object: ${surfaceKey}[${index}]`);
  }

  assertNonEmptyString(
    lifecycle.lifecycleClass,
    `Policy claim lifecycle class is required: ${surfaceKey}[${index}]`,
  );
  assertNonEmptyString(
    lifecycle.deletionTrigger,
    `Policy claim deletion trigger is required: ${surfaceKey}[${index}]`,
  );
  assertNonEmptyString(
    lifecycle.enforcementStatus,
    `Policy claim enforcement status is required: ${surfaceKey}[${index}]`,
  );
}

function validateEvidenceLinks(evidenceLinks, surfaceKey, index) {
  if (!Array.isArray(evidenceLinks) || evidenceLinks.length === 0) {
    throw new Error(`Policy claim evidenceLinks must be a non-empty array: ${surfaceKey}[${index}]`);
  }

  evidenceLinks.forEach((mapping, mappingIndex) => {
    if (!isRecord(mapping)) {
      throw new Error(
        `Policy claim evidenceLinks entry must be an object: ${surfaceKey}[${index}].evidenceLinks[${mappingIndex}]`,
      );
    }

    assertNonEmptyString(
      mapping.source,
      `Policy claim evidence link source is required: ${surfaceKey}[${index}].evidenceLinks[${mappingIndex}]`,
    );
    assertNonEmptyString(
      mapping.path,
      `Policy claim evidence link path is required: ${surfaceKey}[${index}].evidenceLinks[${mappingIndex}]`,
    );

    if (typeof mapping.lines !== 'string') {
      throw new Error(
        `Policy claim evidence link lines must be a string: ${surfaceKey}[${index}].evidenceLinks[${mappingIndex}]`,
      );
    }
  });
}

function validateClaimIdUniqueness(registry) {
  const seen = new Set();

  for (const key of POLICY_SURFACE_KEYS) {
    for (const claim of registry[key].claims) {
      if (seen.has(claim.id)) {
        throw new Error(`Policy claim registry claim IDs must be globally unique: ${claim.id}`);
      }

      seen.add(claim.id);
    }
  }
}

function getPublishedPolicyClaims(registry) {
  return POLICY_SURFACE_KEYS.flatMap((key) =>
    registry[key].claims
      .filter((claim) => claim.state === 'published')
      .map((claim) => ({ surfaceKey: key, ...claim })),
  );
}

function assertNonEmptyString(value, message) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(message);
  }
}

function isPositiveInteger(value) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

module.exports = {
  POLICY_SURFACE_KEYS,
  defaultPolicyClaimRegistryDir,
  getPolicyClaimRegistryPath,
  getPublishedPolicyClaims,
  loadPolicyClaimRegistry,
};
