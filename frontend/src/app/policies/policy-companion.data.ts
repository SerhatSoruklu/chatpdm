import { POLICY_SURFACE_DATA } from './policy-surface.data';
import type { PolicyClaimLifecycleClass, PolicySurfaceDefinition } from './policy-surface.types';
import type { PolicyCompanionRegistry } from './policy-companion.types';

function countClaimsByLifecycleClass(
  surface: PolicySurfaceDefinition,
  lifecycleClass: PolicyClaimLifecycleClass,
): number {
  return surface.claims.filter((claim) => claim.lifecycle.lifecycleClass === lifecycleClass).length;
}

const privacySurface = POLICY_SURFACE_DATA.privacy;
const shortLivedClaimCount = countClaimsByLifecycleClass(privacySurface, 'short_lived');
const sessionBoundClaimCount = countClaimsByLifecycleClass(privacySurface, 'session_bound');
const transportOnlyClaimCount = countClaimsByLifecycleClass(privacySurface, 'transport_only');
const activeLifecycleClassCount = new Set(
  privacySurface.claims
    .map((claim) => claim.lifecycle.lifecycleClass)
    .filter((lifecycleClass) => lifecycleClass !== 'not_applicable'),
).size;

export const POLICY_COMPANION_DATA = {
  'data-retention': {
    key: 'data-retention',
    route: '/inspect/data-retention',
    publicRoute: '/data-retention',
    publicLabel: 'Data Retention / Data Usage',
    title: 'Data Retention / Data Usage',
    subtitle: 'Inspectable lifecycle and storage behavior',
    intro:
      'Current implementation-backed view over feedback event persistence, session-bound browser continuity, SSR transport-only data flow, and managed-access verification expiry.',
    stateNote:
      'This surface separates persisted records, session-bound browser data, and transport-only flow. It is meant to stay narrower than generic retention promises and closer to actual runtime mechanics.',
    traceabilityLabel: 'RUNTIME SNAPSHOT — LIFECYCLE, STORAGE, AND EXPIRY',
    scopeBullets: [
      'feedback event persistence',
      'session-bound browser continuity',
      'transport-only SSR flow',
      'managed-access verification expiry',
    ],
    stats: [
      {
        label: 'Active lifecycle bands',
        value: String(activeLifecycleClassCount),
        detail: `${shortLivedClaimCount} short-lived mappings, ${sessionBoundClaimCount} session-bound mapping, ${transportOnlyClaimCount} transport-only mapping`,
      },
      {
        label: 'Feedback expiry window',
        value: '30 days',
        detail: 'expiresAt is derived from the lifecycle contract and enforced through the feedback_event_expiry TTL index',
      },
      {
        label: 'Stronger-proof expiry',
        value: '60 min',
        detail: 'DNS TXT and website-file verification challenges expire after one hour',
      },
    ],
    sections: [
      {
        kind: 'cards',
        title: 'Lifecycle bands in the current system',
        intro:
          'The page below groups real behavior into lifecycle bands instead of flattening everything into one retention promise.',
        columns: 2,
        cards: [
          {
            eyebrow: 'Short-lived persistence',
            title: 'Feedback event records',
            detail:
              `The current privacy inspect mapping shows ${shortLivedClaimCount} short-lived claims tied to feedback event storage. Those records receive createdAt and expiresAt values, and expired documents are removed through a Mongo TTL index.`,
            bullets: [
              'rawQuery and normalizedQuery are minimized to sha256 before persistence',
              'sessionId remains available for export-by-session and delete-by-session controls',
              'runtime storage remains narrower than a permanent user history claim',
            ],
            tone: 'blue',
          },
          {
            eyebrow: 'Session-bound continuity',
            title: 'Browser-held session state',
            detail:
              `The current inspect mapping includes ${sessionBoundClaimCount} session-bound browser continuity claim. It stays tied to browser storage and should not be written as a durable profile layer.`,
            bullets: [
              'session-bound state can disappear when browser storage is cleared',
              'session continuity and persisted feedback records are separate concerns',
            ],
            tone: 'green',
          },
          {
            eyebrow: 'Transport only',
            title: 'SSR request and response flow',
            detail:
              `The current inspect mapping includes ${transportOnlyClaimCount} transport-only claim covering SSR-mediated cookie or header movement. Transport-only flow helps a request complete, but it is not the same thing as persisted storage.`,
            bullets: [
              'request transport and persisted records must stay separate in policy writing',
              'cookie inspect remains the stronger route for the full browser and SSR cookie map',
            ],
            tone: 'slate',
          },
          {
            eyebrow: 'Expiring verification state',
            title: 'Managed-access proof challenges',
            detail:
              'DNS TXT and website-file proof challenges are issued with explicit expiresAt timestamps. Once that window closes, the request does not continue through the old challenge path.',
            bullets: [
              'challengeExpiryMinutes is currently set to 60',
              'expired stronger-proof challenges move to verification_expired',
              'continuation requires a fresh managed-access request',
            ],
            tone: 'amber',
          },
        ],
      },
      {
        kind: 'timeline',
        title: 'Retention and expiry path',
        intro:
          'This is the narrow path currently visible in the repo. It is a runtime path, not a generic policy template.',
        steps: [
          {
            label: '1',
            title: 'Feedback submission is minimized before persistence',
            detail:
              'Feedback inputs that should not remain in raw form are converted to sha256-tagged values before the event can be stored.',
            outcome: 'Persistence starts from minimized fields, not raw query text.',
            tone: 'blue',
          },
          {
            label: '2',
            title: 'A concrete expiry timestamp is attached',
            detail:
              'The runtime derives expiresAt from the lifecycle contract and stores it alongside createdAt on the feedback event document.',
            outcome: 'The stored document carries its own deletion boundary.',
            tone: 'green',
          },
          {
            label: '3',
            title: 'Mongo TTL handles document expiry',
            detail:
              'The feedback_event_expiry index removes documents after their expiresAt time rather than relying only on a narrative promise.',
            outcome: 'Short-lived feedback storage is tied to an implemented deletion trigger.',
            tone: 'amber',
          },
          {
            label: '4',
            title: 'Managed-access stronger-proof challenges expire separately',
            detail:
              'Managed-access verification keeps its own one-hour challenge window. After expiry, the challenge path is closed and a new request is required.',
            outcome: 'Retention writing must distinguish persisted feedback records from expiring verification proofs.',
            tone: 'slate',
          },
        ],
      },
      {
        kind: 'lanes',
        title: 'Controls and current writing boundaries',
        intro:
          'These are the concrete controls or limits that policy text can safely lean on today.',
        lanes: [
          {
            label: 'Operator-visible controls',
            title: 'Feedback export and delete stay session-bound',
            detail:
              'The feedback route exposes export_by_session and delete_by_session controls rather than a broad user-account data console.',
            bullets: [
              'export operates through the sessionId route control',
              'delete operates through the same sessionId boundary',
              'wording should stay aligned with session-scoped controls that actually exist',
            ],
            tone: 'blue',
          },
          {
            label: 'Implementation boundary',
            title: 'Storage form and retention are different claims',
            detail:
              'Some fields are stored in plaintext, others in sha256 form, and some request data is only transported. Policy text should not collapse those into one storage sentence.',
            bullets: [
              'minimized fields remain implementation-backed',
              'transport-only flow does not automatically imply persistence',
            ],
            tone: 'green',
          },
          {
            label: 'Non-claim guardrail',
            title: 'Do not promise more precision than the runtime exposes',
            detail:
              'Where the repo shows a mechanism, use it. Where the repo only shows a narrower boundary, keep the policy wording equally narrow.',
            bullets: [
              'avoid broad deletion promises outside the explicit triggers above',
              'avoid treating managed-access proof expiry as a permanent retention policy for every request artifact',
            ],
            tone: 'amber',
          },
        ],
      },
      {
        kind: 'traces',
        title: 'Trace anchors',
        intro:
          'These trace anchors are the current implementation sources this inspect surface is built from.',
        traces: [
          {
            label: 'Feedback lifecycle contract',
            path: 'backend/src/modules/feedback/lifecycle-contract.js',
            lines: '12-117',
            reason:
              'Derives the feedback TTL window, validates lifecycle metadata, and computes expiresAt from createdAt.',
          },
          {
            label: 'Feedback event model',
            path: 'backend/src/modules/feedback/feedback-event.model.js',
            lines: '6-95',
            reason:
              'Defines minimized query validators, the expiresAt field, and the feedback_event_expiry TTL index.',
          },
          {
            label: 'Feedback controls route',
            path: 'backend/src/routes/api/v1/feedback.route.js',
            lines: '12-93',
            reason:
              'Exposes submit, export_by_session, and delete_by_session controls for feedback events.',
          },
          {
            label: 'Challenge generator',
            path: 'backend/src/modules/managed-access/challenge-generator.service.js',
            lines: '6-41',
            reason:
              'Builds expiring DNS TXT and website-file verification challenges with explicit expiresAt timestamps.',
          },
          {
            label: 'Managed-access verification config',
            path: 'backend/src/modules/managed-access/config/managed-access-verification.config.js',
            lines: '3-9',
            reason:
              'Pins challengeExpiryMinutes to 60 and defines the DNS and website-file challenge shape.',
          },
          {
            label: 'Managed-access challenge expiry',
            path: 'backend/src/modules/managed-access/managed-access.service.js',
            lines: '543-563',
            reason:
              'Expires stronger-proof challenges and requires a fresh request after the expiry boundary is crossed.',
          },
        ],
      },
    ],
  },
  'acceptable-use': {
    key: 'acceptable-use',
    route: '/inspect/acceptable-use',
    publicRoute: '/acceptable-use',
    publicLabel: 'Acceptable Use Policy',
    title: 'Acceptable Use Policy',
    subtitle: 'Inspectable rule boundaries and review gates',
    intro:
      'Current implementation-backed view over verification input validity, exact proof matching, expiry failure paths, and the operator review gate used by managed access.',
    stateNote:
      'This surface maps rules the runtime actually applies. It does not claim a broad automated abuse program, sanctions engine, or discretionary moderation layer that the current system does not implement.',
    traceabilityLabel: 'RUNTIME SNAPSHOT — RULE BOUNDARIES AND REVIEW FLOW',
    scopeBullets: [
      'verification input validity',
      'exact proof matching',
      'expiry and retry boundaries',
      'operator review gate',
    ],
    stats: [
      {
        label: 'Verification methods',
        value: '3',
        detail: 'work_email, dns_txt, and website_file are the only managed-access verification methods currently modeled',
      },
      {
        label: 'Boundary posture',
        value: 'fail closed',
        detail: 'invalid token, wrong method, mismatch, or expiry do not advance the request to trusted state',
      },
      {
        label: 'Success endpoint',
        value: 'under trust review',
        detail: 'successful verification stops at the review gate rather than granting final approval',
      },
    ],
    sections: [
      {
        kind: 'cards',
        title: 'Implemented rule boundaries',
        intro:
          'These are the current boundaries the runtime actually enforces during managed-access verification.',
        columns: 2,
        cards: [
          {
            eyebrow: 'Token validity',
            title: 'Invalid or reused email verification links are rejected',
            detail:
              'Email verification only succeeds when the token exists, the request is still in pending_email_verification, and the token has not expired.',
            bullets: [
              'unknown or reused links return invalid_verification_token',
              'expired links transition the request to verification_expired',
            ],
            tone: 'amber',
          },
          {
            eyebrow: 'Method integrity',
            title: 'Verification method mismatch is rejected',
            detail:
              'A request created for dns_txt cannot be verified through the website_file path, and vice versa. The runtime looks up the request and checks the expected method explicitly.',
            bullets: [
              'missing requests return managed_access_request_not_found',
              'wrong-method attempts return managed_access_request_method_mismatch',
            ],
            tone: 'blue',
          },
          {
            eyebrow: 'Exact proof requirement',
            title: 'DNS and website proofs must match exactly',
            detail:
              'The stronger-proof paths do not guess around missing or near-match evidence. DNS TXT values and hosted file content must equal the expected verification payload.',
            bullets: [
              'DNS mismatch stays in a checked or failed verification state',
              'website file content mismatch does not promote trust state',
            ],
            tone: 'green',
          },
          {
            eyebrow: 'Expiry boundary',
            title: 'Expired stronger-proof challenges cannot be revived',
            detail:
              'Once the challengeExpiresAt window has passed, the current stronger-proof path stops and the runtime requires a fresh managed-access request.',
            bullets: [
              'the current challenge window is 60 minutes',
              'expiry changes the request status to verification_expired',
            ],
            tone: 'slate',
          },
        ],
      },
      {
        kind: 'timeline',
        title: 'Verification and review flow',
        intro:
          'This is the current rule path visible in the service layer. It is a bounded workflow, not a generic moderation program.',
        steps: [
          {
            label: '1',
            title: 'A request is created under one declared verification method',
            detail:
              'Managed access only starts from one of the modeled methods: work email, DNS TXT, or website file.',
            outcome: 'The request begins inside a named verification path.',
            tone: 'blue',
          },
          {
            label: '2',
            title: 'The runtime checks exact token or exact proof material',
            detail:
              'Email tokens, DNS TXT records, and website-file content are matched against specific expected values. The runtime does not soft-normalize them into success.',
            outcome: 'Only exact proof advances the request.',
            tone: 'green',
          },
          {
            label: '3',
            title: 'Mismatch or expiry fails the current path closed',
            detail:
              'Wrong method, missing request, invalid token, unavailable proof, mismatch, or expiry leave the request outside a verified state.',
            outcome: 'Failure does not silently upgrade trust.',
            tone: 'amber',
          },
          {
            label: '4',
            title: 'Successful proof still stops at under_trust_review',
            detail:
              'Work email verification and stronger organization proof both move the request to under_trust_review. That is a review gate, not final institutional activation.',
            outcome: 'Success enters review rather than automatic approval.',
            tone: 'slate',
          },
        ],
      },
      {
        kind: 'lanes',
        title: 'Current non-claims',
        intro:
          'These are the things the page should not imply just because a narrower rule path already exists.',
        lanes: [
          {
            label: 'No overclaim',
            title: 'This is not an automated abuse sanctions system',
            detail:
              'The current runtime has explicit verification and refusal boundaries, but it does not expose a broad ban, strike, or abuse scoring pipeline.',
            bullets: [
              'avoid writing AUP language that implies a hidden enforcement engine',
              'keep the page centered on the implemented request and verification boundaries',
            ],
            tone: 'amber',
          },
          {
            label: 'No overclaim',
            title: 'Verification success is not final admission',
            detail:
              'The strongest positive transition the service currently exposes is under_trust_review. Policy wording should not imply immediate institutional approval beyond that review gate.',
            bullets: [
              'the review step remains operator-mediated',
              'the route does not publish a final deployment or entitlement grant',
            ],
            tone: 'slate',
          },
          {
            label: 'No overclaim',
            title: 'The runtime does not recover by fuzzy matching',
            detail:
              'Proof verification depends on exact token, exact DNS value, and exact hosted file content. The acceptable-use surface should stay aligned with that refusal-first posture.',
            bullets: [
              'near matches do not count as verification success',
              'current enforcement is narrow, explicit, and method-bound',
            ],
            tone: 'green',
          },
        ],
      },
      {
        kind: 'traces',
        title: 'Trace anchors',
        intro:
          'These trace anchors are the current implementation sources this inspect surface is built from.',
        traces: [
          {
            label: 'Managed-access constants',
            path: 'backend/src/modules/managed-access/constants.js',
            lines: '3-61',
            reason:
              'Declares the allowed verification methods, request statuses, verification states, and evidence event types.',
          },
          {
            label: 'Email verification gate',
            path: 'backend/src/modules/managed-access/managed-access.service.js',
            lines: '343-399',
            reason:
              'Rejects invalid or reused tokens, handles expiry, and moves successful work-email verification to under_trust_review.',
          },
          {
            label: 'DNS verification gate',
            path: 'backend/src/modules/managed-access/managed-access.service.js',
            lines: '402-458',
            reason:
              'Checks for the exact DNS TXT value and only upgrades the request on an exact match.',
          },
          {
            label: 'Website-file verification gate',
            path: 'backend/src/modules/managed-access/managed-access.service.js',
            lines: '461-517',
            reason:
              'Requires the hosted file to match the expected verification payload exactly before verification succeeds.',
          },
          {
            label: 'Request lookup and method matching',
            path: 'backend/src/modules/managed-access/managed-access.service.js',
            lines: '520-540',
            reason:
              'Rejects missing requests and verification method mismatches before stronger-proof checks continue.',
          },
          {
            label: 'Challenge expiry boundary',
            path: 'backend/src/modules/managed-access/managed-access.service.js',
            lines: '543-605',
            reason:
              'Expires stale stronger-proof challenges, records failure state, and moves exact success only to under_trust_review.',
          },
        ],
      },
    ],
  },
} satisfies PolicyCompanionRegistry;
