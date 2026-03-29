import type { PublicPageContent, PublicPageKey } from './public-page.types';

const PUBLIC_PAGE_CONTENT: Record<PublicPageKey, PublicPageContent> = {
  about: {
    eyebrow: 'About',
    title: 'Deterministic meaning under authored scope.',
    intro:
      'ChatPDM is built for cases where wording, source grounding, and output stability matter more than open-ended fluency.',
    sections: [
      {
        title: 'What the product does',
        paragraphs: [
          'ChatPDM resolves authored concepts into bounded outputs with explicit runtime rules. It is designed to stay inspectable instead of sounding broader than it is.',
        ],
      },
      {
        title: 'What the product refuses',
        bullets: [
          'No chatbot-style improvisation beyond the authored concept set',
          'No hidden inference layer that silently expands meaning',
          'No vague answer surface that hides ambiguity behind fluent wording',
        ],
      },
    ],
  },
  'how-it-works': {
    eyebrow: 'How it works',
    title: 'A predefined deterministic meaning system with visible constraints.',
    intro:
      'ChatPDM classifies query shape, resolves only authored concepts, and returns explicit ambiguity or refusal when the runtime should not pretend to know more.',
    sections: [
      {
        title: 'Runtime path',
        paragraphs: [
          '“This system only answers when it can map input to a defined concept. Otherwise it refuses”',
        ],
        bullets: [
          'normalize the incoming query',
          'match against the authored concept boundary',
          'return a deterministic response contract',
        ],
      },
      {
        title: 'Why it matters',
        paragraphs: [
          'The system is optimized for wording-sensitive concept work. Stability, inspectability, and refusal matter more here than broad generative range.',
        ],
      },
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Questions about scope, behavior, and direction.',
    intro:
      'These answers define what the public beta is trying to do now, and what it intentionally does not claim yet.',
    sections: [
      {
        title: 'Frequently asked questions',
        questions: [
          {
            question: 'Is ChatPDM a chatbot?',
            answer:
              'No. It is a deterministic meaning system with a bounded concept set and explicit refusal behavior outside that boundary.',
          },
          {
            question: 'Why is the live runtime smaller than the planned scope?',
            answer:
              'The public surface expands deliberately. ChatPDM keeps the live concept set narrower than the longer v1 scope until the structure proves itself.',
          },
          {
            question: 'Does the product try to answer everything?',
            answer:
              'No. It should classify the request honestly and refuse unsupported compositions instead of masking gaps with fluent output.',
          },
        ],
      },
    ],
  },
  contact: {
    eyebrow: 'Contact',
    title: 'Public contact workflow for the beta stage.',
    intro:
      'ChatPDM is still publishing its stable public contact surface. This page marks the route that will hold product, research, and integration contact details.',
    sections: [
      {
        title: 'Current status',
        paragraphs: [
          'The direct contact workflow is still being formalized. Until that is published, ChatPDM remains a narrow public beta with a limited communication surface.',
        ],
      },
      {
        title: 'What this route will carry',
        bullets: [
          'product and research contact details',
          'integration or implementation inquiries',
          'clear boundary notes for support expectations',
        ],
      },
    ],
  },
  privacy: {
    eyebrow: 'Privacy Policy',
    title: 'Bounded data handling for the current ChatPDM runtime.',
    intro:
      'This page explains how the current ChatPDM runtime handles feedback-linked records, browser session continuity, internal request transport, and refusal boundaries. It is a readable summary of current implementation behavior, not a broader claim than the system proves.',
    sections: [
      {
        title: 'Scope',
        paragraphs: [
          'This policy covers the current public ChatPDM runtime, including concept resolution requests, feedback submissions, browser-held feedback session continuity, and the SSR-to-API request path used by the web surface.',
          'It does not try to describe future features, undeployed operator tooling, or a generic AI training system. ChatPDM is a bounded deterministic runtime, and this page stays within that boundary.',
        ],
      },
      {
        title: 'Data categories',
        paragraphs: [
          'The current implementation-backed privacy surface is centered on a narrow set of records. When feedback is submitted, the platform stores a feedback event document that includes a session identifier, response metadata, version metadata, and minimized query fields. Raw and normalized query values are converted to `sha256:`-prefixed hashes before those feedback records are stored.',
          'The browser also stores a feedback session identifier in local storage under `chatpdm-beta-session-id` so session-bound feedback controls can continue across page loads. Separate from persistence, the SSR layer may forward request headers such as `cookie` and `x-forwarded-for` to the API path so a request can complete correctly.',
        ],
        bullets: [
          'feedback event records',
          'browser-held feedback session state',
          'internal transport headers used by the SSR proxy path',
          'request and refusal metadata tied to the deterministic runtime contract',
        ],
      },
      {
        title: 'Why the system uses this data',
        paragraphs: [
          'Feedback event records exist so the runtime can audit how a bounded response was received and so session-scoped export or deletion controls can operate on those records. Version metadata such as contract, normalizer, matcher, and concept-set versions exists to keep runtime behavior inspectable rather than implicit.',
          'Browser-held session state exists to preserve a narrow feedback control path. Internal SSR proxy headers exist to move a request through the ChatPDM web-to-API boundary. Refusal behavior exists so unsupported or malformed inputs do not widen the system into guesswork.',
        ],
      },
      {
        title: 'How data flows',
        paragraphs: [
          'A concept resolution request enters the web or API boundary, is validated, and is routed against the authored concept set. The resolver returns a deterministic response or an explicit refusal. The current implementation-backed privacy surface does not describe a permanent user query-history system for ordinary concept lookups.',
          'When feedback is submitted, the runtime minimizes the relevant query fields, attaches createdAt and expiresAt timestamps, and stores the feedback event record. If the request passes through the SSR `/api/*` path, the SSR layer may forward request headers to the backend and may copy upstream `set-cookie` headers back to the client response.',
        ],
      },
      {
        title: 'Sharing boundaries',
        paragraphs: [
          'The current mapped sharing path in this repo is internal forwarding inside the ChatPDM request chain. The inspect-backed privacy surface currently maps SSR proxy forwarding between the ChatPDM web layer and API layer, including request headers needed for the request path to complete.',
          'This public page does not describe an advertising, broker, or third-party marketing sharing model. The stronger current claim is narrower: internal transport exists where the runtime needs it, and the inspect route remains the evidence surface for the exact mapped behavior.',
        ],
      },
      {
        title: 'Retention and deletion',
        paragraphs: [
          'Feedback event records are short-lived. The lifecycle contract derives an `expiresAt` boundary from the record `createdAt` timestamp, and the current implementation uses a Mongo TTL index to remove expired feedback records after the current 30-day window.',
          'Browser-held session continuity is separate from persisted feedback events. Local storage can remain until browser storage is cleared, while feedback event records remain subject to their own expiry path. More detailed lifecycle language belongs on the Data Retention / Data Usage page.',
        ],
        bullets: [
          'feedback event records can be exported by sessionId',
          'feedback event records can be deleted by sessionId',
          'TTL expiry is the current deletion trigger for short-lived feedback storage',
        ],
      },
      {
        title: 'Security and request controls',
        paragraphs: [
          'The current runtime enforces request controls including Helmet middleware, CORS settings, and explicit JSON body size limits on both the backend and SSR `/api/*` path. These are concrete request-handling controls, not a promise of universal security.',
          'The system also refuses invalid or unsupported input instead of widening silently. Missing or invalid `q` values, invalid feedback submissions, unsupported complex queries, relation queries, role or actor queries, unsupported canonical lookups, and out-of-scope governance usage are all explicitly refused in the current runtime.',
        ],
      },
      {
        title: 'Rights and contact',
        paragraphs: [
          'Current self-service controls are narrow and session-bound. The feedback surface exposes export-by-session and delete-by-session controls rather than a broad account-based privacy console.',
          'For privacy questions about the current beta runtime, contact `hello@chatpdm.com`. If this page and the inspect route ever diverge, the inspect route is the stronger source for implementation-backed detail and this page should be corrected.',
        ],
      },
    ],
    action: {
      label: 'Open privacy inspect surface',
      route: '/inspect/privacy',
    },
  },
  terms: {
    eyebrow: 'Terms of Service',
    title: 'Human-readable terms surface in preparation.',
    intro:
      'This route will hold the readable terms surface for current runtime and operator boundaries. The inspect route remains the mapped evidence surface until the final text is written.',
    sections: [
      {
        title: 'Current route purpose',
        paragraphs: [
          'This page is reserved for the public-facing terms surface. It should describe service boundaries, allowed use, and refusal mechanics without pretending legal or enforcement depth that does not exist yet.',
        ],
      },
      {
        title: 'Planned sections',
        bullets: [
          'service scope and product boundary',
          'submission, misuse, and refusal boundaries',
          'managed-access and verification limits where operator workflow matters',
        ],
      },
      {
        title: 'Inspect relationship',
        paragraphs: [
          'The inspect route remains the more granular source for current mapped endpoint rules, refusal boundaries, and platform constraints.',
        ],
      },
    ],
    action: {
      label: 'Open terms inspect surface',
      route: '/inspect/terms',
    },
  },
  'acceptable-use': {
    eyebrow: 'Acceptable Use Policy',
    title: 'Human-readable acceptable use page in preparation.',
    intro:
      'This route will hold the readable acceptable use surface for misuse boundaries, fraudulent submissions, and bounded use of ChatPDM. The inspect route now maps the current implementation-backed rule boundaries underneath it.',
    sections: [
      {
        title: 'Current route purpose',
        paragraphs: [
          'This page is reserved for the public rule surface. It should define prohibited behavior clearly, but only to the depth that the product and operator workflow can actually support.',
        ],
      },
      {
        title: 'Planned sections',
        bullets: [
          'misuse and abuse boundaries',
          'fraudulent verification and institutional submission limits',
          'operator review boundaries where enforcement is not fully automated',
        ],
      },
      {
        title: 'Inspect relationship',
        paragraphs: [
          'The inspect companion route now maps the current verification gates, failure paths, and review boundary. The public rule surface should translate that mechanism without outrunning it.',
        ],
      },
    ],
    action: {
      label: 'Open acceptable use inspect surface',
      route: '/inspect/acceptable-use',
    },
  },
  'data-retention': {
    eyebrow: 'Data Retention / Data Usage',
    title: 'Human-readable retention surface in preparation.',
    intro:
      'This route will hold the readable explanation of what ChatPDM stores, how bounded records persist, and where current lifecycle claims remain implementation-backed only. The inspect route now maps those mechanics directly.',
    sections: [
      {
        title: 'Current route purpose',
        paragraphs: [
          'This page is reserved for the public retention and data-usage surface. It should explain lifecycle and storage boundaries honestly, without inventing precision that the system does not enforce.',
        ],
      },
      {
        title: 'Planned sections',
        bullets: [
          'which records are short-lived, request-bound, session-bound, or persistent',
          'what deletion trigger or lifecycle boundary applies',
          'where inspect-backed storage and retention traces provide the stronger current source',
        ],
      },
      {
        title: 'Inspect relationship',
        paragraphs: [
          'The inspect companion route now maps lifecycle bands, expiry paths, and storage boundaries directly from the current system. The public page should translate that detail without weakening it.',
        ],
      },
    ],
    action: {
      label: 'Open data retention inspect surface',
      route: '/inspect/data-retention',
    },
  },
  docs: {
    eyebrow: 'Docs',
    title: 'Product and architecture documentation index.',
    intro:
      'The public docs surface will explain product boundaries, runtime contracts, and implementation architecture without turning the site into a content farm.',
    sections: [
      {
        title: 'Planned surfaces',
        bullets: [
          'getting started and product boundary docs',
          'runtime and contract documentation',
          'architecture and authoring references',
        ],
      },
    ],
  },
  developers: {
    eyebrow: 'Developers',
    title: 'Developer-facing product and integration guidance.',
    intro:
      'This route is reserved for technical integration, system boundaries, and implementation guidance aimed at developers working with ChatPDM.',
    sections: [
      {
        title: 'Planned emphasis',
        bullets: [
          'runtime boundaries and response contracts',
          'integration notes for deterministic querying',
          'architecture guidance for the public product surface',
        ],
      },
    ],
  },
  handbooks: {
    eyebrow: 'Handbooks',
    title: 'Longform operational and authoring guidance.',
    intro:
      'Handbooks will hold longer-form material that needs more structure than short product docs but should still live in the public ChatPDM system.',
    sections: [
      {
        title: 'Expected use',
        bullets: [
          'authoring guidance for concept work',
          'system discipline and boundary notes',
          'longform operational references',
        ],
      },
    ],
  },
  api: {
    eyebrow: 'API',
    title: 'Reference index for the ChatPDM API surface.',
    intro:
      'This route marks the public API reference surface for resolver behavior, endpoint expectations, and response-contract guidance.',
    sections: [
      {
        title: 'Current API posture',
        paragraphs: [
          'The live runtime already exposes deterministic resolver and health endpoints. This page will become the public reference index for that API surface.',
        ],
      },
    ],
  },
  'not-found': {
    eyebrow: 'Not found',
    title: 'The requested page is outside the published surface.',
    intro:
      'ChatPDM could not match this URL to a published public route. Use the primary navigation to return to the live product surface.',
    sections: [
      {
        title: 'Published routes',
        bullets: [
          'use Home for the live query surface',
          'use Docs, Developers, or API for structured product routes',
          'use the footer for legal and secondary navigation',
        ],
      },
    ],
  },
};

export function getPublicPageContent(pageKey: PublicPageKey): PublicPageContent {
  return PUBLIC_PAGE_CONTENT[pageKey];
}
