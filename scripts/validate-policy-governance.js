const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');

const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const { loadPolicySurfaceRegistry } = require('./policy-surface-data');
const {
  POLICY_SURFACE_KEYS,
  getPublishedPolicyClaims,
  loadPolicyClaimRegistry,
} = require('./lib/policy-governance/policy-claim-registry');

const repoRoot = path.resolve(__dirname, '..');
const hypothesesPath = path.join(repoRoot, 'policies', 'policy-hypotheses.json');
const schemaPath = path.join(repoRoot, 'policies', 'policy-hypotheses.schema.json');

main();

function main() {
  try {
    const schema = readJsonFile(schemaPath);
    const hypothesesDocument = readJsonFile(hypothesesPath);
    const policyClaimRegistry = loadPolicyClaimRegistry();
    const policySurfaceRegistry = loadPolicySurfaceRegistry();
    const publishedClaims = getPublishedPolicyClaims(policyClaimRegistry);
    const claimIds = new Set(publishedClaims.map((claim) => claim.id));

    validateSchema(hypothesesDocument, schema);
    validateClaimReferences(hypothesesDocument.hypotheses, claimIds);
    validateExpiry(hypothesesDocument.hypotheses);
    validateClosureProvenance(hypothesesDocument.hypotheses);
    validatePolicySurfaceParity(policyClaimRegistry, policySurfaceRegistry);
    validateTypedTruthParity(policySurfaceRegistry);
    const evidenceLinkCount = validatePolicyClaimEvidence(publishedClaims);

    // TODO(PR2+): add lifecycle-ready governance path enforcement when stores-claim
    // metadata exists in the authoritative claim dataset. Do not guess at missing
    // lifecycle fields in PR1.

    console.log(
      `Policy governance validation passed for ${hypothesesDocument.hypotheses.length} hypotheses, ${publishedClaims.length} published claims, and ${evidenceLinkCount} evidence links.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read JSON file at ${relativeToRepo(filePath)}: ${error.message}`);
  }
}

function validateSchema(document, schema) {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
  });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const isValid = validate(document);

  if (isValid) {
    return;
  }

  const errors = (validate.errors || []).map(formatAjvError).join('\n');
  throw new Error(`policy-hypotheses.json failed schema validation:\n${errors}`);
}

function validateClaimReferences(hypotheses, liveClaimIds) {
  const errors = [];

  for (const hypothesis of hypotheses) {
    if (!liveClaimIds.has(hypothesis.claim_id)) {
      errors.push(
        `Missing claim reference for hypothesis ${hypothesis.id}: claim_id ${hypothesis.claim_id} not found in published claim registry`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

function validatePolicySurfaceParity(policyClaimRegistry, policySurfaceRegistry) {
  const errors = [];

  for (const surfaceKey of POLICY_SURFACE_KEYS) {
    const registrySurface = policyClaimRegistry[surfaceKey];
    const policySurface = policySurfaceRegistry[surfaceKey];

    if (!policySurface || !Array.isArray(policySurface.claims)) {
      errors.push(`Generated policy surface is missing claims array: ${surfaceKey}`);
      continue;
    }

    const publishedClaims = registrySurface.claims.filter((claim) => claim.state === 'published');
    const generatedClaims = policySurface.claims;

    if (generatedClaims.length !== publishedClaims.length) {
      errors.push(
        `Generated policy surface claim count mismatch for ${surfaceKey}: expected ${publishedClaims.length}, received ${generatedClaims.length}`,
      );
      continue;
    }

    const generatedClaimById = new Map(generatedClaims.map((claim) => [claim.id, claim]));

    for (const claim of publishedClaims) {
      const generatedClaim = generatedClaimById.get(claim.id);

      if (!generatedClaim) {
        errors.push(`Generated policy surface is missing published claim ${claim.id}`);
        continue;
      }

      const expectedGeneratedClaim = buildExpectedGeneratedClaim(claim);

      if (!isDeepStrictEqual(generatedClaim, expectedGeneratedClaim)) {
        errors.push(`Generated policy surface drift detected for claim ${claim.id}`);
      }
    }

    const expectedSummary = buildExpectedSurfaceSummary(publishedClaims);

    if (!isDeepStrictEqual(policySurface.summary, expectedSummary)) {
      errors.push(`Generated policy surface summary drift detected for ${surfaceKey}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

function validateTypedTruthParity(policySurfaceRegistry) {
  const errors = [];

  for (const surfaceKey of POLICY_SURFACE_KEYS) {
    const surface = policySurfaceRegistry[surfaceKey];

    if (surfaceKey === 'terms') {
      if (!surface.termsTruth) {
        errors.push('Terms surface is missing termsTruth.');
      }

      if (surface.cookiesTruth !== undefined) {
        errors.push('Terms surface must not expose cookiesTruth.');
      }

      if (surface.termsTruth) {
        const termsClaimIds = new Set(surface.claims.map((claim) => claim.id));
        const truthClaimIds = [
          ...surface.termsTruth.endpointContracts.map((row) => row.claimId),
          ...surface.termsTruth.fieldContracts.map((row) => row.claimId),
          ...surface.termsTruth.platformRules.map((row) => row.claimId),
          ...surface.termsTruth.runtimeBoundaries.map((row) => row.claimId),
          ...surface.termsTruth.refusalBoundaries.map((row) => row.claimId),
        ];

        if (truthClaimIds.length !== surface.claims.length) {
          errors.push(
            `Terms truth drift detected: expected ${surface.claims.length} typed rows, received ${truthClaimIds.length}`,
          );
        }

        for (const claimId of truthClaimIds) {
          if (!termsClaimIds.has(claimId)) {
            errors.push(`Terms truth row references missing claim ${claimId}`);
          }
        }

        const claimTraceById = new Map(surface.claims.map((claim) => [claim.id, claim.traces]));

        for (const row of [
          ...surface.termsTruth.endpointContracts,
          ...surface.termsTruth.fieldContracts,
          ...surface.termsTruth.platformRules,
          ...surface.termsTruth.runtimeBoundaries,
          ...surface.termsTruth.refusalBoundaries,
        ]) {
          if (!isDeepStrictEqual(row.evidence, claimTraceById.get(row.claimId))) {
            errors.push(`Terms truth evidence drift detected for claim ${row.claimId}`);
          }
        }
      }

      continue;
    }

    if (surface.termsTruth !== undefined) {
      errors.push(`${surfaceKey} surface must not expose termsTruth.`);
    }

    if (surfaceKey === 'cookies') {
      if (!Array.isArray(surface.cookiesTruth) || surface.cookiesTruth.length === 0) {
        errors.push('Cookies surface is missing cookiesTruth.');
        continue;
      }

      if (surface.cookiesTruth.length !== surface.claims.length) {
        errors.push(
          `Cookies truth drift detected: expected ${surface.claims.length} typed rows, received ${surface.cookiesTruth.length}`,
        );
      }

      const cookieClaimById = new Map(surface.claims.map((claim) => [claim.id, claim]));

      for (const row of surface.cookiesTruth) {
        const claim = cookieClaimById.get(row.claimId);

        if (!claim) {
          errors.push(`Cookies truth row references missing claim ${row.claimId}`);
          continue;
        }

        if (!isDeepStrictEqual(row.evidence, claim.traces)) {
          errors.push(`Cookies truth evidence drift detected for claim ${row.claimId}`);
        }
      }

      continue;
    }

    if (surface.cookiesTruth !== undefined) {
      errors.push(`${surfaceKey} surface must not expose cookiesTruth.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

function validatePolicyClaimEvidence(publishedClaims) {
  const errors = [];
  const fileCache = new Map();
  let evidenceLinkCount = 0;

  for (const claim of publishedClaims) {
    const strongAnchors = shouldRequireAnchorMatch(claim) ? extractStrongAnchors(claim) : [];
    let claimMatchedAnchor = strongAnchors.length === 0;

    for (const evidence of claim.evidenceLinks) {
      evidenceLinkCount += 1;

      const filePath = path.join(repoRoot, evidence.path);

      if (!fs.existsSync(filePath)) {
        errors.push(`Evidence path is missing for claim ${claim.id}: ${evidence.path}`);
        continue;
      }

      const expectedSource = `${evidence.path}:${evidence.lines}`;

      if (evidence.source !== expectedSource) {
        errors.push(
          `Evidence source drift detected for claim ${claim.id}: expected ${expectedSource}, received ${evidence.source}`,
        );
      }

      const ranges = parseLineRanges(evidence.lines, claim.id);
      const fileLines = loadFileLines(filePath, fileCache);
      const extractedLines = [];

      for (const range of ranges) {
        if (range.end > fileLines.length) {
          errors.push(
            `Evidence lines exceed file length for claim ${claim.id}: ${evidence.path}:${range.start}-${range.end}`,
          );
          continue;
        }

        extractedLines.push(fileLines.slice(range.start - 1, range.end).join('\n'));
      }

      const evidenceText = extractedLines.join('\n').trim();

      if (evidenceText.length === 0) {
        errors.push(`Evidence lines resolved to empty content for claim ${claim.id}: ${expectedSource}`);
        continue;
      }

      if (!claimMatchedAnchor && strongAnchors.length > 0) {
        const normalizedEvidenceText = normalizeForMatch(evidenceText);

        claimMatchedAnchor = strongAnchors.some((anchor) =>
          normalizedEvidenceText.includes(normalizeForMatch(anchor)),
        );
      }
    }

    if (!claimMatchedAnchor && strongAnchors.length > 0) {
      errors.push(
        `Evidence anchor drift detected for claim ${claim.id}: none of [${strongAnchors.join(', ')}] matched its registered evidence links`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return evidenceLinkCount;
}

function buildExpectedGeneratedClaim(claim) {
  const hasInternalTransportNote = claim.notes.toLowerCase().includes('internal ssr transport only');

  return {
    id: claim.id,
    version: claim.version,
    state: claim.state,
    policyFile: claim.policyFile,
    section: claim.section,
    policySentence: claim.policySentence,
    canonicalClaim: claim.canonicalClaim,
    claimClass: claim.claimClass,
    systemMapping: claim.evidenceLinks.map((trace) => `\`${trace.source}\``).join('; '),
    status: claim.status,
    notes: claim.notes,
    specialNotes: hasInternalTransportNote
      ? ['internal SSR transport only', 'not third-party disclosure']
      : claim.notes
        ? [claim.notes]
        : [],
    hasInternalTransportNote,
    lifecycle: claim.lifecycle,
    traces: claim.evidenceLinks,
  };
}

function buildExpectedSurfaceSummary(publishedClaims) {
  const claimClasses = [];
  const seenClasses = new Set();

  for (const claim of publishedClaims) {
    if (!seenClasses.has(claim.claimClass)) {
      seenClasses.add(claim.claimClass);
      claimClasses.push(claim.claimClass);
    }
  }

  return {
    totalClaims: publishedClaims.length,
    mappedClaims: publishedClaims.filter((claim) => claim.status === 'mapped').length,
    claimClasses,
    internalTransportNoteCount: publishedClaims.filter((claim) =>
      claim.notes.toLowerCase().includes('internal ssr transport only'),
    ).length,
  };
}

function parseLineRanges(lineSpec, claimId) {
  const segments = lineSpec.split(',').map((segment) => segment.trim()).filter(Boolean);

  if (segments.length === 0) {
    throw new Error(`Evidence lines are missing for claim ${claimId}`);
  }

  return segments.map((segment) => {
    const rangeMatch = /^(\d+)-(\d+)$/.exec(segment);

    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);

      if (start > end) {
        throw new Error(`Invalid evidence line range for claim ${claimId}: ${segment}`);
      }

      return { start, end };
    }

    const singleMatch = /^(\d+)$/.exec(segment);

    if (singleMatch) {
      const line = Number(singleMatch[1]);
      return { start: line, end: line };
    }

    throw new Error(`Invalid evidence line segment for claim ${claimId}: ${segment}`);
  });
}

function loadFileLines(filePath, fileCache) {
  if (fileCache.has(filePath)) {
    return fileCache.get(filePath);
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  fileCache.set(filePath, lines);
  return lines;
}

function extractStrongAnchors(claim) {
  const anchors = new Set();

  for (const text of [claim.policySentence, claim.canonicalClaim]) {
    const matches = text.matchAll(/`([^`]+)`/g);

    for (const match of matches) {
      const literal = match[1].trim();

      if (/^[A-Za-z0-9._-]{1,}$/u.test(literal)) {
        anchors.add(literal);
      }
    }
  }

  return Array.from(anchors);
}

function shouldRequireAnchorMatch(claim) {
  return (
    /feedback field `[^`]+`/u.test(claim.policySentence)
    || /feedback response type `[^`]+`/u.test(claim.policySentence)
    || /feedback option `[^`]+`/u.test(claim.policySentence)
    || /\bstores `[^`]+`/u.test(claim.policySentence)
    || /`cookie` headers|`set-cookie` headers|`x-forwarded-for` headers/u.test(claim.policySentence)
  );
}

function normalizeForMatch(value) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function validateExpiry(hypotheses) {
  const today = getTodayUtc();
  const errors = [];

  for (const hypothesis of hypotheses) {
    if (hypothesis.status !== 'unverified') {
      continue;
    }

    const openedAt = parseDateUtc(hypothesis.opened_at);
    const expiryDate = addDaysUtc(openedAt, hypothesis.expires_after_days);

    if (today.getTime() > expiryDate.getTime()) {
      errors.push(`Unverified hypothesis expired: ${hypothesis.id}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

function validateClosureProvenance(hypotheses) {
  const errors = [];

  for (const hypothesis of hypotheses) {
    if (hypothesis.status !== 'closed') {
      continue;
    }

    if (typeof hypothesis.linked_pr !== 'string' || hypothesis.linked_pr.trim().length === 0) {
      errors.push(`Closed hypothesis missing linked_pr: ${hypothesis.id}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

function formatAjvError(error) {
  const location = error.instancePath || '/';
  return `- ${location} ${error.message}`;
}

function getTodayUtc() {
  const override = process.env.POLICY_GOVERNANCE_TODAY;

  if (override) {
    return parseDateUtc(override);
  }

  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parseDateUtc(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new Error(`Invalid governance date value: ${value}`);
  }

  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function addDaysUtc(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function relativeToRepo(filePath) {
  return path.relative(repoRoot, filePath) || '.';
}
