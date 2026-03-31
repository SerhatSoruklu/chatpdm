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
  'what-is-chatpdm': {
    eyebrow: 'Definition',
    title: 'ChatPDM is a deterministic reasoning system.',
    intro:
      'It resolves authored concepts into bounded outputs. It is not Product Data Management software, and it is not a CAD or engineering workflow tool.',
    sections: [
      {
        title: 'What ChatPDM is',
        paragraphs: [
          'ChatPDM is a deterministic concept-resolution system. It works with authored concept structures, explicit refusal, and source-backed output instead of open-ended answer generation.',
          'The system is designed for cases where meaning must stay stable enough to inspect, compare, and reuse without silent drift.',
        ],
      },
      {
        title: 'What ChatPDM is not',
        bullets: [
          'not Product Data Management software',
          'not a CAD, BOM, or engineering workflow tool',
          'not a chatbot or general-purpose text generator',
          'not a knowledge base that tries to answer everything',
        ],
      },
      {
        title: 'Why the distinction matters',
        paragraphs: [
          'The term “PDM” is often read as Product Data Management. ChatPDM uses the name differently. It refers to a deterministic reasoning system with bounded concept resolution, not engineering document control.',
          'That distinction matters because the public product surface, runtime behavior, and API contract belong to a different category entirely.',
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
      'This system does not attempt to answer everything. It defines what it can do, and refuses what it cannot.',
    sections: [
      {
        title: 'System',
        questions: [
          {
            question: 'Is ChatPDM a chatbot?',
            answer:
              'No. It does not generate answers. ChatPDM resolves concepts within a bounded system and refuses when the structure does not support the request.',
          },
          {
            question: 'How is this different from AI systems?',
            answer:
              'Most AI systems generate likely answers. ChatPDM validates whether a concept can exist within a defined structure. The goal is not fluency. The goal is correctness under constraint.',
          },
          {
            question: 'Does ChatPDM use probabilistic reasoning?',
            answer:
              'No. It does not generate outputs based on likelihood or pattern matching. All results are derived from defined concepts and explicit system rules.',
          },
          {
            question: 'Is ChatPDM related to Product Data Management (PDM)?',
            answer:
              'No. ChatPDM is a deterministic reasoning system. It is not Product Data Management software, and it is not a CAD or engineering workflow tool.',
          },
          {
            question: 'Why does the system refuse so often?',
            answer:
              'Refusal is part of the system. If a concept is out of scope, incomplete, or collapses into another concept, it is rejected instead of being dressed up as an answer.',
          },
        ],
      },
      {
        title: 'Scope',
        questions: [
          {
            question: 'Why is the live runtime smaller than the planned scope?',
            answer:
              'The public surface expands deliberately. ChatPDM keeps the live concept set narrower than the longer v1 scope until the structure proves itself.',
          },
          {
            question: 'Why start with governance concepts?',
            answer:
              'Governance concepts carry high ambiguity and high impact. Terms such as authority, power, legitimacy, duty, and law are widely used but often structurally unclear. Stabilizing them creates a serious base for later expansion.',
          },
          {
            question: 'Will the system expand beyond governance?',
            answer:
              'Yes, but only after stability is proven. Expansion is staged. New domains are introduced only when existing ones remain structurally reliable under use.',
          },
        ],
      },
      {
        title: 'Boundaries',
        questions: [
          {
            question: 'Does ChatPDM decide what is true?',
            answer:
              'No. It does not determine truth. It evaluates whether a concept is structurally valid within the system. Truth claims remain outside the current runtime scope.',
          },
          {
            question: 'What happens if the system is wrong?',
            answer:
              'The system is designed to be inspectable and correctable. Concepts are reviewed, tested, and updated through controlled processes. Errors are treated as structural problems, not ignored outputs.',
          },
          {
            question: 'Is this trying to control meaning?',
            answer:
              'No. The goal is not control, but clarity. ChatPDM does not dictate how people must use language. It provides a system where meaning is explicitly defined and testable.',
          },
          {
            question: 'Why not just use a dictionary?',
            answer:
              'Dictionaries describe usage. ChatPDM enforces structure. It is designed to keep concepts distinct, bounded, and stable across use and interpretation.',
          },
          {
            question: 'Does the product try to answer everything?',
            answer:
              'No. It should classify the request honestly and refuse unsupported compositions instead of masking gaps with fluent output.',
          },
          {
            question: 'Why should I trust the system’s outputs?',
            answer:
              'Outputs are constrained by defined concepts and visible rules. The system does not infer or guess. Every result is either resolved within the current structure or explicitly refused. This makes its behavior inspectable, consistent, and bounded.',
          },
        ],
      },
    ],
    action: {
      label: 'Open what ChatPDM is',
      route: '/what-is-chatpdm',
    },
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
    title: 'Product and architecture documentation.',
    intro:
      'This surface defines system boundaries, runtime behavior, and the structures that govern how ChatPDM operates.',
    sections: [
      {
        title: 'System roadmap',
        paragraphs: [
          'The Legal Argument Validator roadmap defines how the system evolves.',
          'The sequence is fixed. Phases are not reordered or renamed after definition. This prevents drift and preserves system integrity over time.',
          'Detailed implementation controls, validation gates, and internal artifacts are maintained separately from this public surface.',
        ],
      },
      {
        title: 'What this roadmap represents',
        paragraphs: [
          'This is not a feature list.',
          'It defines the order in which system capabilities are allowed to exist. Each phase depends on structural correctness in earlier phases.',
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
          'H: Failure Codes, Trace, and Replay',
          'I: Analyst Workbench',
          'J: Report and Export Layer',
          'K: Governance and Promotion Controls',
          'L: Hardening, Audit, and Tenancy',
        ],
      },
      {
        title: 'Planned surfaces',
        paragraphs: [
          'The system expands only when structure holds.',
        ],
        bullets: [
          'getting started and product boundaries',
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
