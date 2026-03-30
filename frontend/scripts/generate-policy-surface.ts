import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  PolicyClaim,
  PolicyClaimLifecycle,
  PolicyClaimRegistryEntry,
  PolicyClaimRegistrySurface,
  PolicyCookiesTruthFact,
  PolicySurfaceDefinition,
  PolicySurfaceKey,
  PolicySurfaceRegistry,
  PolicyTermsTruth,
  PolicyTraceMapping,
} from '../src/app/policies/policy-surface.types.ts';
import { loadPolicyClaimRegistry } from './policy-claim-registry.ts';
import { validatePolicyClaimLifecycle } from './policy-lifecycle-contract.ts';
import { buildPolicyCookiesTruth } from './policy-cookies-truth.ts';
import { buildPolicyTermsTruth } from './policy-terms-truth.ts';

interface DraftMeta {
  key: PolicySurfaceKey;
  route: string;
  title: string;
  subtitle: string;
  sourceTitle: string;
  scopeBullets: string[];
}

interface PolicySurfaceConfig {
  policyFileName: string;
  route: string;
  title: string;
  subtitle: string;
}

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(currentDir, '..', '..');
const policiesDir = join(repoRoot, 'policies');
const outputPath = join(currentDir, '../src/app/policies/policy-surface.data.ts');

const policySurfaceConfig: Record<PolicySurfaceKey, PolicySurfaceConfig> = {
  privacy: {
    policyFileName: 'privacy.md',
    route: '/inspect/privacy',
    title: 'Privacy Policy',
    subtitle: 'Inspectable privacy behavior',
  },
  terms: {
    policyFileName: 'terms.md',
    route: '/inspect/terms',
    title: 'Terms of Service',
    subtitle: 'Runtime operations, field rules, and refusal boundaries',
  },
  cookies: {
    policyFileName: 'cookies.md',
    route: '/inspect/cookies',
    title: 'Cookie Policy',
    subtitle: 'Browser and SSR cookie behavior',
  },
  'data-retention': {
    policyFileName: 'data-retention.md',
    route: '/inspect/data-retention',
    title: 'Data Retention / Data Usage',
    subtitle: 'Lifecycle, storage, expiry, and session-bound control evidence',
  },
  'acceptable-use': {
    policyFileName: 'acceptable-use.md',
    route: '/inspect/acceptable-use',
    title: 'Acceptable Use',
    subtitle: 'Runtime scope, refusal, and feedback constraints',
  },
};

const policyDrafts = buildDraftMetadata();
const claimRegistry = loadPolicyClaimRegistry();
const outputData = buildPolicyRegistry(policyDrafts, claimRegistry);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, buildOutputFile(outputData), 'utf8');

function buildDraftMetadata(): Record<PolicySurfaceKey, DraftMeta> {
  return Object.fromEntries(
    getPolicySurfaceKeys().map((key) => {
      const config = policySurfaceConfig[key];
      const markdown = readFileSync(join(policiesDir, config.policyFileName), 'utf8');
      return [key, parsePolicyDraft(key, markdown)];
    }),
  ) as Record<PolicySurfaceKey, DraftMeta>;
}

function parsePolicyDraft(key: PolicySurfaceKey, markdown: string): DraftMeta {
  const lines = markdown.split(/\r?\n/);
  const sourceTitle = lines.find((line) => line.startsWith('# '))?.replace('# ', '').trim() ?? '';
  const scopeStart = lines.findIndex((line) => line.startsWith('## Scope'));
  const scopeBullets: string[] = [];

  if (scopeStart >= 0) {
    for (let index = scopeStart + 1; index < lines.length; index += 1) {
      const line = lines[index].trim();

      if (line.startsWith('## ')) {
        break;
      }

      if (line.startsWith('- ')) {
        scopeBullets.push(line.slice(2).trim());
      }
    }
  }

  return {
    key,
    route: policySurfaceConfig[key].route,
    title: policySurfaceConfig[key].title,
    subtitle: policySurfaceConfig[key].subtitle,
    sourceTitle,
    scopeBullets,
  };
}

function buildPolicyRegistry(
  drafts: Record<PolicySurfaceKey, DraftMeta>,
  registry: ReturnType<typeof loadPolicyClaimRegistry>,
): PolicySurfaceRegistry {
  return Object.fromEntries(
    getPolicySurfaceKeys().map((key) => [key, buildPolicySurface(drafts[key], registry[key])]),
  ) as PolicySurfaceRegistry;
}

function buildPolicySurface(
  draft: DraftMeta,
  registrySurface: PolicyClaimRegistrySurface,
): PolicySurfaceDefinition {
  const claims = registrySurface.claims
    .filter((claim) => claim.state === 'published')
    .map((claim) => buildClaim(claim));
  const claimClasses = collectUniqueValues(claims.map((claim) => claim.claimClass));
  const cookiesTruth = buildCookiesSurfaceTruth(draft.key, claims);
  const termsTruth = buildTermsSurfaceTruth(draft.key, claims);

  return {
    key: draft.key,
    route: draft.route,
    title: draft.title,
    subtitle: draft.subtitle,
    intro: buildIntroLine(draft.scopeBullets),
    sourceTitle: draft.sourceTitle,
    scopeBullets: draft.scopeBullets,
    claims,
    cookiesTruth,
    termsTruth,
    summary: {
      totalClaims: claims.length,
      mappedClaims: claims.filter((claim) => claim.status === 'mapped').length,
      claimClasses,
      internalTransportNoteCount: claims.filter((claim) => claim.hasInternalTransportNote).length,
    },
  };
}

function buildClaim(entry: PolicyClaimRegistryEntry): PolicyClaim {
  const hasInternalTransportNote = entry.notes.toLowerCase().includes('internal ssr transport only');
  const specialNotes = hasInternalTransportNote
    ? ['internal SSR transport only', 'not third-party disclosure']
    : entry.notes
      ? [entry.notes]
      : [];

  return {
    id: entry.id,
    version: entry.version,
    state: entry.state,
    policyFile: entry.policyFile,
    section: entry.section,
    policySentence: entry.policySentence,
    canonicalClaim: entry.canonicalClaim,
    claimClass: entry.claimClass,
    systemMapping: buildSystemMapping(entry.evidenceLinks),
    status: entry.status,
    notes: entry.notes,
    specialNotes,
    hasInternalTransportNote,
    lifecycle: buildClaimLifecycle(entry),
    traces: entry.evidenceLinks,
  };
}

function buildClaimLifecycle(entry: PolicyClaimRegistryEntry): PolicyClaimLifecycle {
  validatePolicyClaimLifecycle(entry, entry.lifecycle);
  return entry.lifecycle;
}

function buildCookiesSurfaceTruth(
  surfaceKey: PolicySurfaceKey,
  claims: readonly PolicyClaim[],
): readonly PolicyCookiesTruthFact[] | undefined {
  if (surfaceKey !== 'cookies') {
    return undefined;
  }

  return buildPolicyCookiesTruth(claims);
}

function buildTermsSurfaceTruth(
  surfaceKey: PolicySurfaceKey,
  claims: readonly PolicyClaim[],
): PolicyTermsTruth | undefined {
  if (surfaceKey !== 'terms') {
    return undefined;
  }

  return buildPolicyTermsTruth(claims);
}

function buildSystemMapping(traces: readonly PolicyTraceMapping[]): string {
  return traces.map((trace) => `\`${trace.source}\``).join('; ');
}

function buildIntroLine(scopeBullets: readonly string[]): string {
  if (scopeBullets.length === 0) {
    return 'Current rendered policy claims are exposed here as an inspectable contract surface.';
  }

  return `Current rendered policy claims covering ${formatJoinedList(scopeBullets)}.`;
}

function formatJoinedList(values: readonly string[]): string {
  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

function collectUniqueValues(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function getPolicySurfaceKeys(): PolicySurfaceKey[] {
  return Object.keys(policySurfaceConfig) as PolicySurfaceKey[];
}

function buildOutputFile(data: PolicySurfaceRegistry): string {
  const serialized = JSON.stringify(data, null, 2);

  return `import type { PolicySurfaceRegistry } from './policy-surface.types';

export const POLICY_SURFACE_DATA = ${serialized} satisfies PolicySurfaceRegistry;
`;
}
