import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  PolicyClaim,
  PolicyCookiesTruthFact,
  PolicyClaimLifecycle,
  PolicyTermsTruth,
  PolicySurfaceDefinition,
  PolicySurfaceKey,
  PolicySurfaceRegistry,
  PolicyTraceMapping,
  PolicyTraceStatus,
} from '../src/app/policies/policy-surface.types.ts';
import {
  resolvePolicyClaimLifecycle,
  validatePolicyClaimLifecycle,
} from './policy-lifecycle-contract.ts';
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

interface TraceRow {
  policyFile: string;
  section: string;
  policySentence: string;
  canonicalClaim: string;
  claimClass: string;
  systemMapping: string;
  status: PolicyTraceStatus;
  notes: string;
}

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(currentDir, '..', '..');
const policiesDir = join(repoRoot, 'policies');
const outputPath = join(currentDir, '../src/app/policies/policy-surface.data.ts');
const phaseDPath = join(policiesDir, 'POLICY_AUDIT_PHASE_D.md');

const policyFiles = {
  privacy: join(policiesDir, 'privacy.md'),
  terms: join(policiesDir, 'terms.md'),
  cookies: join(policiesDir, 'cookies.md'),
} as const;

const subtitles: Record<PolicySurfaceKey, string> = {
  privacy: 'Inspectable privacy behavior',
  cookies: 'Browser and SSR cookie behavior',
  terms: 'Runtime rules and allowed use',
};

const routes: Record<PolicySurfaceKey, string> = {
  privacy: '/inspect/privacy',
  cookies: '/inspect/cookies',
  terms: '/inspect/terms',
};

const policyDrafts = buildDraftMetadata();
const traceability = parsePhaseD(readFileSync(phaseDPath, 'utf8'));
const outputData = buildPolicyRegistry(policyDrafts, traceability);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, buildOutputFile(outputData), 'utf8');

function buildDraftMetadata(): Record<PolicySurfaceKey, DraftMeta> {
  return {
    privacy: parsePolicyDraft('privacy', readFileSync(policyFiles.privacy, 'utf8')),
    terms: parsePolicyDraft('terms', readFileSync(policyFiles.terms, 'utf8')),
    cookies: parsePolicyDraft('cookies', readFileSync(policyFiles.cookies, 'utf8')),
  };
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
    route: routes[key],
    title: getLegalTitle(key),
    subtitle: subtitles[key],
    sourceTitle,
    scopeBullets,
  };
}

function getLegalTitle(key: PolicySurfaceKey): string {
  switch (key) {
    case 'privacy':
      return 'Privacy Policy';
    case 'cookies':
      return 'Cookie Policy';
    case 'terms':
      return 'Terms of Service';
  }
}

function parsePhaseD(markdown: string): Record<PolicySurfaceKey, TraceRow[]> {
  const blocks = markdown.split(/\n## /);
  const rowsByPolicy: Record<PolicySurfaceKey, TraceRow[]> = {
    privacy: [],
    terms: [],
    cookies: [],
  };

  for (const block of blocks) {
    const normalizedBlock = block.startsWith('## ') ? block : `## ${block}`;

    const key = getPolicyKeyFromBlock(normalizedBlock);

    if (!key) {
      continue;
    }

    rowsByPolicy[key] = parseTraceTable(normalizedBlock);
  }

  return rowsByPolicy;
}

function getPolicyKeyFromBlock(block: string): PolicySurfaceKey | null {
  if (block.startsWith('## 2. Privacy Policy Traceability')) {
    return 'privacy';
  }

  if (block.startsWith('## 3. Terms of Service Traceability')) {
    return 'terms';
  }

  if (block.startsWith('## 4. Cookie Policy Traceability')) {
    return 'cookies';
  }

  return null;
}

function parseTraceTable(block: string): TraceRow[] {
  const lines = block.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.startsWith('|Policy File|'));

  if (headerIndex < 0) {
    return [];
  }

  const headers = splitTableRow(lines[headerIndex]);
  const rows: TraceRow[] = [];

  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const line = lines[index]?.trim();

    if (!line || !line.startsWith('|')) {
      break;
    }

    const values = splitTableRow(line);

    if (values.length !== headers.length) {
      continue;
    }

    const row = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex]]));

    rows.push({
      policyFile: stripCodeCell(row['Policy File'] ?? ''),
      section: stripCodeCell(row['Section'] ?? ''),
      policySentence: row['Policy Sentence'] ?? '',
      canonicalClaim: row['Canonical Claim'] ?? '',
      claimClass: stripCodeCell(row['Claim Class'] ?? ''),
      systemMapping: row['System Mapping'] ?? '',
      status: stripCodeCell(row['Status'] ?? '') as PolicyTraceStatus,
      notes: row['Notes'] ?? '',
    });
  }

  return rows;
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function stripCodeCell(value: string): string {
  const match = value.match(/^`([^`]+)`$/);
  return match ? match[1] : value;
}

function buildPolicyRegistry(
  drafts: Record<PolicySurfaceKey, DraftMeta>,
  traceability: Record<PolicySurfaceKey, TraceRow[]>,
): PolicySurfaceRegistry {
  return {
    privacy: buildPolicySurface(drafts.privacy, traceability.privacy),
    terms: buildPolicySurface(drafts.terms, traceability.terms),
    cookies: buildPolicySurface(drafts.cookies, traceability.cookies),
  };
}

function buildPolicySurface(draft: DraftMeta, rows: TraceRow[]): PolicySurfaceDefinition {
  const claims = rows.map((row, index) => buildClaim(draft.key, index, row));
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

function buildClaim(key: PolicySurfaceKey, index: number, row: TraceRow): PolicyClaim {
  const traces = parseSystemMappings(row.systemMapping);
  const hasInternalTransportNote = row.notes.toLowerCase().includes('internal ssr transport only');
  const specialNotes = hasInternalTransportNote
    ? ['internal SSR transport only', 'not third-party disclosure']
    : row.notes
      ? [row.notes]
      : [];
  const lifecycle = buildClaimLifecycle(row);

  return {
    id: `${key}-${index + 1}`,
    policyFile: row.policyFile,
    section: row.section,
    policySentence: row.policySentence,
    canonicalClaim: row.canonicalClaim,
    claimClass: row.claimClass,
    systemMapping: row.systemMapping,
    status: row.status,
    notes: row.notes,
    specialNotes,
    hasInternalTransportNote,
    lifecycle,
    traces,
  };
}

function buildClaimLifecycle(row: TraceRow): PolicyClaimLifecycle {
  const lifecycle = resolvePolicyClaimLifecycle(row);
  validatePolicyClaimLifecycle(row, lifecycle);
  return lifecycle;
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

function parseSystemMappings(rawMapping: string): PolicyTraceMapping[] {
  const segments = [...rawMapping.matchAll(/`([^`]+)`/g)].map((match) => match[1]);

  return segments.map((segment) => {
    const mappingMatch = segment.match(/^(.+?):(\d[\d,-]*)$/);

    if (!mappingMatch) {
      return {
        source: segment,
        path: segment,
        lines: '',
      };
    }

    return {
      source: segment,
      path: mappingMatch[1],
      lines: mappingMatch[2],
    };
  });
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

function buildOutputFile(data: PolicySurfaceRegistry): string {
  const serialized = JSON.stringify(data, null, 2);

  return `import type { PolicySurfaceRegistry } from './policy-surface.types';

export const POLICY_SURFACE_DATA = ${serialized} satisfies PolicySurfaceRegistry;
`;
}
