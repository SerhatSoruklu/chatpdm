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
    ],
  },
  privacy: {
    eyebrow: 'Privacy Policy',
    title: 'Human-readable version in preparation.',
    intro:
      'A simpler public privacy page is being prepared for this route. The current inspectable privacy surface remains available in the meantime.',
    sections: [
      {
        title: 'Policy status',
        paragraphs: [
          'This top-level route is reserved for the human-readable privacy page. Until that version is ready, use the inspectable page for the current system-backed view of privacy behavior.',
        ],
      },
    ],
    action: {
      label: 'View current inspectable privacy page',
      route: '/inspect/privacy',
    },
  },
  'data-retention': {
    eyebrow: 'Data Retention / Data Usage',
    title: 'Current lifecycle, storage, and expiry behavior.',
    intro:
      'This page stays limited to current implementation-backed retention declarations for feedback persistence, browser session continuity, and request-bound SSR transport.',
    sections: [
      {
        title: 'Current scope',
        bullets: [
          'feedback event persistence with derived expiresAt and TTL deletion',
          'browser local storage used for feedback session continuity',
          'request-bound SSR header transport shown separately from persisted storage',
        ],
      },
      {
        title: 'Current controls',
        bullets: [
          'feedback export by sessionId',
          'feedback deletion by sessionId',
          'inspect route for current trace anchors and lifecycle evidence',
        ],
      },
    ],
    action: {
      label: 'View current inspectable data-retention page',
      route: '/inspect/data-retention',
    },
  },
  'acceptable-use': {
    eyebrow: 'Acceptable Use',
    title: 'Current runtime use boundaries.',
    intro:
      'This page stays limited to current implementation-backed runtime scope, refusal behavior, and feedback-surface constraints in ChatPDM.',
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
      },
    ],
    action: {
      label: 'View current inspectable acceptable-use page',
      route: '/inspect/acceptable-use',
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
