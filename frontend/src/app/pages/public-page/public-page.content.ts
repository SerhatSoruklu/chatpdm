import type { PublicPageContent, PublicPageKey } from './public-page.types';
import {
  SITE_HELLO_EMAIL,
  SITE_INFO_EMAIL,
  SITE_POLICY_EMAIL,
  SITE_SUPPORT_EMAIL,
} from '../../core/layout/site-navigation.data';

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
    title: 'A bounded answer model with visible constraints.',
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
      {
        title: 'Current inboxes',
        contacts: [
          {
            label: 'Hello',
            email: SITE_HELLO_EMAIL,
            note: 'General product introductions and first-contact outreach.',
          },
          {
            label: 'Info',
            email: SITE_INFO_EMAIL,
            note: 'Research, documentation, and general public inquiries.',
          },
          {
            label: 'Support',
            email: SITE_SUPPORT_EMAIL,
            note: 'Runtime questions, product support expectations, and route help.',
          },
        ],
      },
    ],
  },
  privacy: {
    eyebrow: 'Privacy Policy',
    title: 'Current privacy posture for the public beta.',
    intro:
      'ChatPDM keeps this page limited to the current public-beta privacy posture: what the platform stores, what stays request-bound, and where the inspectable runtime-backed detail lives.',
    sections: [
      {
        title: 'Current scope',
        paragraphs: [
          'The current runtime stores feedback and system-trace fields needed for bounded product behavior, while keeping some transport paths request-bound rather than persisted.',
          'This page is the human-readable entry point. The inspect surface remains the evidence-backed technical view of the same policy area.',
        ],
        bullets: [
          'feedback events are persisted with declared lifecycle controls',
          'browser session continuity is handled separately from backend persistence',
          'request-bound SSR transport is described separately from stored data',
        ],
        contacts: [
          {
            label: 'Policy',
            email: SITE_POLICY_EMAIL,
            note: 'Privacy, data-retention, cookie, and acceptable-use policy questions.',
          },
        ],
      },
      {
        title: 'How to use this page',
        bullets: [
          'use this route for the current plain-language privacy summary',
          'use the inspect route when you need file-backed implementation evidence',
          'treat the inspect route as traceability detail, not the primary human entry point',
        ],
      },
    ],
    action: {
      label: 'Open privacy inspect surface',
      route: '/inspect/privacy',
    },
  },
  'data-retention': {
    eyebrow: 'Data Retention / Data Usage',
    title: 'Current lifecycle, storage, and expiry behavior.',
    intro:
      'This page summarizes the current lifecycle rules around persistence, expiry, export, deletion, and request-bound transport in the public beta.',
    sections: [
      {
        title: 'Current scope',
        bullets: [
          'feedback event persistence with derived expiresAt and TTL deletion',
          'browser local storage used for feedback session continuity',
          'request-bound internal SSR header transport shown separately from persisted storage',
        ],
      },
      {
        title: 'Current controls',
        bullets: [
          'feedback export by sessionId',
          'feedback deletion by sessionId',
          'inspect route for current lifecycle evidence and traceable implementation detail',
        ],
        contacts: [
          {
            label: 'Policy',
            email: SITE_POLICY_EMAIL,
            note: 'Data-retention and policy-surface questions for the current public beta.',
          },
        ],
      },
      {
        title: 'Reading guide',
        paragraphs: [
          'This route is the plain-language summary of current lifecycle behavior. The inspect surface should be used when you need exact evidence mappings, implementation anchors, or current claim-by-claim traceability.',
        ],
      },
    ],
    action: {
      label: 'Open data-retention inspect surface',
      route: '/inspect/data-retention',
    },
  },
  'acceptable-use': {
    eyebrow: 'Acceptable Use',
    title: 'Current runtime use boundaries.',
    intro:
      'This page summarizes what the current public beta supports, what it refuses, and where the runtime draws hard boundary lines instead of guessing.',
    sections: [
      {
        title: 'Current supported use',
        bullets: [
          'public concept resolution through the resolver route',
          'comparison output only for authored allowlisted pairs',
          'feedback submission plus session-bound export and delete controls',
        ],
      },
      {
        title: 'Current refusal path',
        bullets: [
          'unsupported complex, relation, role, and invalid canonical lookup forms are refused',
          'non-allowlisted comparison pairs return no_exact_match instead of synthetic comparison output',
          'invalid feedback payloads and invalid session controls are rejected through current route validation',
        ],
        contacts: [
          {
            label: 'Policy',
            email: SITE_POLICY_EMAIL,
            note: 'Acceptable-use, runtime boundary, and policy interpretation questions.',
          },
        ],
      },
      {
        title: 'Reading guide',
        paragraphs: [
          'Use this route for the human-readable boundary summary. Use the inspect surface when you need claim-level evidence for runtime scope, refusal behavior, or feedback constraints.',
        ],
      },
    ],
    action: {
      label: 'Open acceptable-use inspect surface',
      route: '/inspect/acceptable-use',
    },
  },
  terms: {
    eyebrow: 'Terms of Service',
    title: 'Current public terms for the ChatPDM beta.',
    intro:
      'ChatPDM keeps this route as the human-readable terms summary. The implementation-heavy contract tables live under API, and claim-by-claim evidence lives under the inspect surface.',
    sections: [
      {
        title: 'Current scope',
        paragraphs: [
          'The current beta exposes a bounded resolver surface, a constrained feedback workflow, and explicit refusal paths when requests fall outside the authored or approved contract.',
          'These terms describe the active runtime boundary in public language rather than reproducing the raw contract tables line by line.',
        ],
        bullets: [
          'deterministic concept resolution only within the authored runtime',
          'feedback submission, export, and delete controls within the approved surface',
          'refusal instead of silent expansion when requests fall outside supported structure',
        ],
      },
      {
        title: 'Where implementation detail lives',
        bullets: [
          'use API for endpoint contracts, accepted fields, typed values, and refusal boundaries',
          'use the inspect terms route for claim-level evidence and implementation mappings',
          'use acceptable use for the plain-language summary of runtime boundary behavior',
        ],
      },
      {
        title: 'Policy questions',
        contacts: [
          {
            label: 'Policy',
            email: SITE_POLICY_EMAIL,
            note: 'Terms, acceptable-use, and public policy-surface questions.',
          },
        ],
      },
    ],
    action: {
      label: 'Open API reference',
      route: '/api',
    },
  },
  cookies: {
    eyebrow: 'Cookie Policy',
    title: 'Current cookie posture for the ChatPDM beta.',
    intro:
      'ChatPDM keeps this route as the plain-language cookie summary. The detailed request and response transport evidence stays on the inspect surface rather than the public entry page.',
    sections: [
      {
        title: 'Current scope',
        paragraphs: [
          'The current beta does not present a broad browser-cookie feature surface. Cookie handling is narrow and tied to essential internal SSR transport within the product boundary.',
        ],
        bullets: [
          'incoming cookie headers are handled only where the current SSR transport path requires them',
          'upstream set-cookie headers are returned only through the same bounded SSR path',
          'this policy is about current runtime behavior, not a broad advertising or tracking cookie layer',
        ],
      },
      {
        title: 'Where detail lives',
        bullets: [
          'use the inspect cookies route for request and response transport evidence',
          'treat the inspect route as the technical proof surface',
          'use privacy and data retention for the broader storage and lifecycle context',
        ],
      },
      {
        title: 'Policy questions',
        contacts: [
          {
            label: 'Policy',
            email: SITE_POLICY_EMAIL,
            note: 'Cookie, privacy, and data-handling questions for the current public beta.',
          },
        ],
      },
    ],
    action: {
      label: 'Open cookie inspect surface',
      route: '/inspect/cookies',
    },
  },
  docs: {
    eyebrow: 'Docs',
    title: 'Product and architecture documentation index.',
    intro:
      'The public docs surface explains product boundaries, runtime contracts, and the locked roadmap layers that govern later implementation without turning the site into a content farm.',
    sections: [
      {
        title: 'Locked roadmap',
        paragraphs: [
          'The Legal Argument Validator Roadmap is now locked as a named product roadmap. The sequence is fixed so later implementation work cannot silently rename or reorder the phase structure. Detailed phase controls, entry gates, and implementation artifacts are maintained separately from the public roadmap to preserve naming stability and avoid roadmap drift.',
        ],
      },
      {
        title: 'Legal Argument Validator roadmap',
        bullets: [
          'Pre-A: Scope Lock and Product Law',
          'A: Matter and Document Intake',
          'B: Segmentation and Source Anchors',
          'C: Argument Extraction and Admissibility Gate',
          'D: Concept Registry and Doctrine Loader',
          'E: Authority Registry and Citation Scope Law',
          'F: Mapping Engine and Synonym Governance',
          'G: Validation Kernel',
          'H: Failure Codes, Trace, and Replay Artifact Support',
          'I: Analyst Workbench UI',
          'J: Report and Export Layer',
          'K: Governance and Promotion Controls',
          'L: Hardening, Audit, and Tenancy',
        ],
      },
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
