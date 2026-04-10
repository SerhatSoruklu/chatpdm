import type {
  PolicyClaim,
  PolicySurfaceDefinition,
  PolicySurfaceKey,
  PolicySurfaceRegistry,
} from '../../policies/policy-surface.types';

export interface InspectIntegritySnapshot {
  label: string;
  value: string;
  detail: string;
}

export interface InspectIntegrityEvidenceLink {
  label: string;
  route: string;
  claimId: string;
}

export interface InspectIntegrityGuarantee {
  title: string;
  summary: string;
  detail: string;
  evidenceLinks: readonly InspectIntegrityEvidenceLink[];
}

export interface InspectSurfaceLink {
  title: string;
  subtitle: string;
  route: string;
  detail: string;
  mappedClaims: number;
  totalClaims: number;
  refusalBoundaryCount: number;
  integrityStatus: string;
  integrityDetail: string;
}

export interface InspectIndexPageViewModel {
  title: string;
  intro: string;
  traceabilityLabel: string;
  quote: string;
  snapshotCards: readonly InspectIntegritySnapshot[];
  guarantees: readonly InspectIntegrityGuarantee[];
  surfaces: readonly InspectSurfaceLink[];
}

interface GuaranteeDefinition {
  title: string;
  summary: string;
  detail: string;
  evidence: readonly { surfaceKey: PolicySurfaceKey; claimId: string; label: string }[];
}

const SURFACE_ORDER: readonly PolicySurfaceKey[] = [
  'privacy',
  'data-retention',
  'acceptable-use',
  'cookies',
  'terms',
] as const;

const SURFACE_META: Record<
  PolicySurfaceKey,
  { title: string; subtitle: string; route: string; detail: string }
> = {
  privacy: {
    title: 'Privacy Policy Inspect',
    subtitle: 'storage, lifecycle, and feedback-event evidence',
    route: '/inspect/privacy',
    detail: 'Current inspectable privacy behavior surface with traceability and lifecycle evidence.',
  },
  'data-retention': {
    title: 'Data Retention / Data Usage Inspect',
    subtitle: 'lifecycle, storage, expiry, and session-bound control evidence',
    route: '/inspect/data-retention',
    detail:
      'Current inspectable data-retention surface for feedback persistence, browser session continuity, and request-bound internal SSR transport.',
  },
  'acceptable-use': {
    title: 'Acceptable Use Inspect',
    subtitle: 'runtime scope, refusal, and feedback boundary evidence',
    route: '/inspect/acceptable-use',
    detail:
      'Current inspectable acceptable-use surface for runtime scope, refused query forms, and feedback-surface constraints.',
  },
  cookies: {
    title: 'Cookie Policy Inspect',
    subtitle: 'browser and SSR cookie transport evidence',
    route: '/inspect/cookies',
    detail: 'Current inspectable cookie surface for SSR transport and browser-facing cookie behavior.',
  },
  terms: {
    title: 'Terms of Service Inspect',
    subtitle: 'runtime and support operations, field rules, and refusal boundaries',
    route: '/inspect/terms',
    detail:
      'Current inspectable terms surface for runtime and support operations, field rules, and refusal boundaries.',
  },
};

const GUARANTEE_DEFINITIONS: readonly GuaranteeDefinition[] = [
  {
    title: 'Public runtime access stays bounded',
    summary:
      'The live public contract exposes the current resolver and feedback submission endpoints as explicit runtime surfaces, while concept detail, feedback index, and feedback control routes remain separate public support surfaces.',
    detail: 'Endpoint access is represented as claim objects and mapped back to route handlers.',
    evidence: [
      { surfaceKey: 'terms', claimId: 'terms-1', label: 'concept resolution endpoint' },
      { surfaceKey: 'terms', claimId: 'terms-2', label: 'feedback submission endpoint' },
    ],
  },
  {
    title: 'Unsupported input is refused, not guessed through',
    summary:
      'Query misuse and invalid feedback payloads remain bounded by refusal and field-validation claims rather than soft interpretation.',
    detail: 'Refusal behavior is part of the public integrity surface, not hidden operational detail.',
    evidence: [
      { surfaceKey: 'acceptable-use', claimId: 'acceptable-use-6', label: 'missing query refusal' },
      { surfaceKey: 'terms', claimId: 'terms-26', label: 'payload boundary refusal' },
    ],
  },
  {
    title: 'Feedback lifecycle remains explicit',
    summary:
      'Expiry, TTL deletion, and session-bound export/delete controls are surfaced as implementation-backed lifecycle guarantees.',
    detail:
      'These controls remain traceable to concrete feedback lifecycle and route contracts, not policy-only prose.',
    evidence: [
      { surfaceKey: 'data-retention', claimId: 'data-retention-1', label: 'expiresAt derivation' },
      { surfaceKey: 'data-retention', claimId: 'data-retention-6', label: 'ttl deletion' },
      { surfaceKey: 'data-retention', claimId: 'data-retention-12', label: 'session export' },
      { surfaceKey: 'data-retention', claimId: 'data-retention-13', label: 'session delete' },
    ],
  },
  {
    title: 'Transport stays internal to the product boundary',
    summary:
      'Cookie and forwarding behavior remains modeled as internal SSR transport instead of external disclosure.',
    detail:
      'The claim registry keeps these behaviors evidence-backed and explicitly bounded to request or response transport.',
    evidence: [
      { surfaceKey: 'cookies', claimId: 'cookies-1', label: 'cookie request transport' },
      { surfaceKey: 'cookies', claimId: 'cookies-2', label: 'set-cookie response transport' },
      { surfaceKey: 'privacy', claimId: 'privacy-15', label: 'x-forwarded-for SSR transport' },
    ],
  },
] as const;

export function buildInspectIndexPageViewModel(
  surfaces: PolicySurfaceRegistry,
): InspectIndexPageViewModel {
  const orderedSurfaces = SURFACE_ORDER.map((key) => surfaces[key]);
  const allClaims = orderedSurfaces.flatMap((surface) => surface.claims);
  const mappedClaims = allClaims.filter((claim) => claim.status === 'mapped').length;
  const unresolvedClaims = allClaims.length - mappedClaims;
  const totalRefusalBoundaries = orderedSurfaces.reduce(
    (sum, surface) => sum + countSurfaceRefusalBoundaries(surface),
    0,
  );
  const integrityStatus =
    unresolvedClaims === 0
      ? 'registry-backed and fully mapped'
      : `${unresolvedClaims} trace gap${unresolvedClaims === 1 ? '' : 's'} detected`;

  return {
    title: 'Public system integrity surface.',
    intro:
      'This route turns the policy registry into a composable public trust layer: mapped claims, refusal boundaries, and implementation-backed guarantees gathered across the live policy surfaces.',
    traceabilityLabel: 'PUBLIC INTEGRITY SURFACE — REGISTRY BACKED',
    quote: '“Inspect this, not trust us.”',
    snapshotCards: [
      {
        label: 'Mapped claims',
        value: String(mappedClaims),
        detail: `${mappedClaims} of ${allClaims.length} published claims currently map to implementation evidence.`,
      },
      {
        label: 'Refusal boundaries',
        value: String(totalRefusalBoundaries),
        detail: 'Cross-policy refusal and boundary claims aggregated from current published claim objects.',
      },
      {
        label: 'Integrity status',
        value: integrityStatus,
        detail: unresolvedClaims === 0 ? 'No unmapped or conflicting published claims are present.' : 'Published claims include unresolved trace status and require review.',
      },
      {
        label: 'Guarantees',
        value: String(GUARANTEE_DEFINITIONS.length),
        detail: 'Implementation-backed guarantee bundles linking directly to live claim objects.',
      },
    ],
    guarantees: GUARANTEE_DEFINITIONS.map((guarantee) => buildGuarantee(guarantee, surfaces)),
    surfaces: orderedSurfaces.map((surface) => buildSurfaceCard(surface)),
  };
}

function buildGuarantee(
  guarantee: GuaranteeDefinition,
  surfaces: PolicySurfaceRegistry,
): InspectIntegrityGuarantee {
  return {
    title: guarantee.title,
    summary: guarantee.summary,
    detail: guarantee.detail,
    evidenceLinks: guarantee.evidence.map((item) => {
      assertClaimExists(surfaces[item.surfaceKey].claims, item.claimId);

      return {
        label: item.label,
        route: SURFACE_META[item.surfaceKey].route,
        claimId: item.claimId,
      };
    }),
  };
}

function buildSurfaceCard(
  surface: PolicySurfaceDefinition,
): InspectSurfaceLink {
  const meta = SURFACE_META[surface.key];
  const claims = surface.claims;
  const mappedClaims = claims.filter((claim) => claim.status === 'mapped').length;
  const totalClaims = claims.length;
  const refusalBoundaryCount = countSurfaceRefusalBoundaries(surface);
  const integrityStatus = mappedClaims === totalClaims ? 'fully mapped' : 'trace gaps';
  const integrityDetail =
    mappedClaims === totalClaims
      ? `${mappedClaims} published claims currently map to implementation evidence.`
      : `${mappedClaims} of ${totalClaims} published claims currently map to implementation evidence.`;

  return {
    ...meta,
    mappedClaims,
    totalClaims,
    refusalBoundaryCount,
    integrityStatus,
    integrityDetail,
  };
}

function countSurfaceRefusalBoundaries(
  surface: PolicySurfaceDefinition,
): number {
  if (surface.termsTruth) {
    return surface.termsTruth.runtimeBoundaries.length + surface.termsTruth.refusalBoundaries.length;
  }

  return surface.claims.filter((claim) =>
    claim.claimClass === 'refuses'
    || claim.claimClass === 'does_not_allow'
    || claim.claimClass === 'does_not_share').length;
}

function assertClaimExists(claims: readonly PolicyClaim[], claimId: string): void {
  if (!claims.some((claim) => claim.id === claimId)) {
    throw new Error(`Inspect integrity guarantee references a missing claim: ${claimId}`);
  }
}
