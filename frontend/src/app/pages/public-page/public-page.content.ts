import type { PublicPageContent, PublicPageKey } from './public-page.types';
import {
  SITE_HELLO_EMAIL,
  SITE_INFO_EMAIL,
  SITE_LEGAL_EMAIL,
  SITE_POLICY_EMAIL,
  SITE_SECURITY_EMAIL,
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
    title: 'Direct inboxes for product, policy, and support.',
    intro:
      'Use the inbox that best matches the request. The contact surface stays simple on purpose: direct email routes, clear scope, and no form layer.',
    sections: [
      {
        title: 'How to use this page',
        paragraphs: [
          'Choose the address that best matches the subject. This keeps product, support, policy, legal, and security traffic easier to route without adding a heavier intake system.',
          'The listed inboxes currently feed the same managed contact workflow at contact@chatpdm.com.',
        ],
      },
      {
        title: 'Inbox scope',
        bullets: [
          'use product and information inboxes for general contact and external inquiries',
          'use support for runtime, route, and product-use questions',
          'use policy and legal for governance, privacy, retention, and terms matters',
          'use security only for vulnerability or security reporting',
        ],
      },
      {
        title: 'Contact inboxes',
        contacts: [
          {
            label: 'Hello',
            email: SITE_HELLO_EMAIL,
            note: 'General introductions, first contact, and broad product outreach.',
          },
          {
            label: 'Info',
            email: SITE_INFO_EMAIL,
            note: 'Research, documentation, media, and general public inquiries.',
          },
          {
            label: 'Legal',
            email: SITE_LEGAL_EMAIL,
            note: 'Legal notices, contractual matters, and formal legal communication.',
          },
          {
            label: 'Policy',
            email: SITE_POLICY_EMAIL,
            note: 'Privacy, data retention, cookies, and acceptable-use policy questions.',
          },
          {
            label: 'Security',
            email: SITE_SECURITY_EMAIL,
            note: 'Security reporting, vulnerability disclosure, and responsible disclosure contact.',
          },
          {
            label: 'Support',
            email: SITE_SUPPORT_EMAIL,
            note: 'Runtime questions, route help, and product-use support.',
          },
        ],
      },
      {
        title: 'Current boundary',
        bullets: [
          'no contact form is used on this route',
          'this page does not publish support-time guarantees',
          'the contact surface remains email-first and low-friction',
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
  'scope-model': {
    eyebrow: 'Scope model',
    title: 'Public scope and admission order.',
    intro:
      'This surface defines what the current system is allowed to contain, what is live now, what remains reviewed or blocked, and how expansion is ordered.',
    sections: [
      {
        title: 'Public scope boundary',
        paragraphs: [
          'The public system stays narrower than the wider concept map by design. Runtime admission is earned, not implied.',
        ],
        bullets: [
          'live concepts are admitted to the public runtime',
          'visible-only concepts may remain inspectable without being live',
          'rejected concepts remain visible only as structural refusal',
          'unsupported inputs stay outside the runtime instead of being guessed into scope',
        ],
      },
      {
        title: 'Current live runtime',
        paragraphs: [
          'These concepts are currently admitted and queryable in the public runtime.',
        ],
        bullets: [
          'authority',
          'power',
          'legitimacy',
          'law',
          'duty',
          'violation',
          'responsibility',
        ],
      },
      {
        title: 'Current visible-only public scope',
        paragraphs: [
          'These concepts are inspectable on the public surface but are not admitted to runtime resolution.',
        ],
        bullets: [
          'agreement',
          'commitment',
          'breach',
        ],
      },
      {
        title: 'Current rejected public scope',
        paragraphs: [
          'These concepts remain visible only as explicit structural refusal surfaces.',
        ],
        bullets: [
          'obligation',
          'enforcement',
        ],
      },
      {
        title: 'Lifecycle and admission order',
        paragraphs: [
          'Not every known concept shares the same runtime status. Visible-only detail, review metadata, rejection state, and runtime admission remain separate, and progression remains ordered rather than assumed.',
        ],
        bullets: [
          'visible-only public scope is a separate admission path from live runtime',
          'review metadata is not the same as runtime admission',
          'proposal is not the same as public scope',
          'law: review-backed and admitted to the public runtime',
          'violation: review-backed and admitted to the public runtime',
        ],
      },
      {
        title: 'Staged capability order',
        paragraphs: [
          'Expansion follows controlled order rather than coverage pressure. Capability order exists to protect runtime integrity before new surface area is exposed.',
        ],
        bullets: [
          'scope is tightened before capability is broadened',
          'runtime exposure follows structural validation, not demand for coverage',
          'new surfaces are allowed only after earlier boundaries hold',
        ],
      },
      {
        title: 'Why the system stays narrow',
        paragraphs: [
          'Reliability comes before coverage. Refusal protects the runtime by keeping unsupported structure outside the trusted public surface.',
        ],
        bullets: [
          'reliability before coverage',
          'structure before expansion',
          'refusal protects the runtime',
        ],
      },
      {
        title: 'Scope versus architecture',
        paragraphs: [
          'This page defines what the system permits and how it expands. It does not define how reasoning systems are structured internally.',
          'Architectural reasoning models are described separately in /reasoning-structure.',
        ],
      },
      {
        title: 'Closing',
        paragraphs: [
          'The system expands only when structure holds.',
        ],
      },
    ],
  },
  docs: {
    eyebrow: 'Docs',
    title: 'Documentation index.',
    intro:
      'Use this surface to inspect the public system in detail. It maps the current runtime, structure, contracts, and longer-form references without repeating the scope model.',
    sections: [
      {
        title: 'Runtime surfaces',
        links: [
          {
            label: 'Runtime',
            route: '/runtime',
            note: 'Query the live deterministic runtime and inspect current result behavior.',
          },
          {
            label: 'Live concepts',
            route: '/live-concepts',
            note: 'Read the concepts currently admitted to the public runtime.',
          },
          {
            label: 'Controlled comparisons',
            route: '/controlled-comparisons',
            note: 'Inspect the comparison pairs the runtime currently allows.',
          },
          {
            label: 'Runtime refusal behavior',
            route: '/runtime',
            fragment: 'runtime-refusal',
            note: 'Inspect refusal as a structured runtime outcome rather than an error state.',
          },
        ],
      },
      {
        title: 'System structure',
        links: [
          {
            label: 'About',
            route: '/about',
            note: 'Read the deterministic posture and authored-scope identity of the product.',
          },
          {
            label: 'How it works',
            route: '/how-it-works',
            note: 'Inspect the validation path from input to bounded output.',
          },
          {
            label: 'Reasoning structure',
            route: '/reasoning-structure',
            note: 'See how deterministic authority stays primary over any future advisory reasoning.',
          },
          {
            label: 'Vision',
            route: '/vision',
            note: 'Read the longer-term infrastructure direction without changing current runtime truth.',
          },
          {
            label: 'Scope model',
            route: '/scope-model',
            note: 'Inspect public boundary law, admission order, and current scope status.',
          },
        ],
      },
      {
        title: 'Contracts and reference',
        links: [
          {
            label: 'Resolution contract',
            route: '/resolution-contract',
            note: 'Inspect the stable semantic result states returned by the runtime and how review-state metadata stays separate from admission.',
          },
          {
            label: 'Version policy',
            route: '/version-policy',
            note: 'Inspect the version ownership and change law that determine when runtime output identity is allowed to change.',
          },
          {
            label: 'API',
            route: '/api',
            note: 'Inspect the HTTP transport contract, endpoint surface, and request or validation rules.',
          },
          {
            label: 'Developer guidance',
            route: '/developers',
            note: 'Developer-facing route for integration guidance and system reference surfaces.',
          },
          {
            label: 'Source model',
            route: '/source-model',
            note: 'Inspect how source material is admitted, constrained, and kept separate from runtime canon.',
          },
        ],
      },
      {
        title: 'Longer-form guidance',
        links: [
          {
            label: 'Developers',
            route: '/developers',
            note: 'Developer-oriented product, boundary, and integration guidance.',
          },
          {
            label: 'Handbooks',
            route: '/handbooks',
            note: 'Operational guides for authoring, review, and disciplined change inside the system.',
          },
        ],
      },
      {
        title: 'Policy and trust surfaces',
        links: [
          {
            label: 'FAQ',
            route: '/faq',
            note: 'Clarify scope, refusal behavior, and trust boundaries in plain language.',
          },
          {
            label: 'What ChatPDM is',
            route: '/what-is-chatpdm',
            note: 'Read the category definition and disambiguation from Product Data Management.',
          },
        ],
      },
      {
        title: 'Closing',
        paragraphs: [
          'Start with the surface you need. Each page exposes a different part of the system.',
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
  'source-model': {
    eyebrow: 'Source model',
    title: 'Source governance for authored meaning.',
    intro:
      'This page defines how source material is admitted, constrained, and used in ChatPDM.',
    sections: [
      {
        title: 'Core principle',
        paragraphs: [
          'Sources do not become concepts automatically.',
          'They are admitted only as structured input to authoring, review, and boundary testing.',
          'Source material is evidence. Concept packets are the result.',
        ],
      },
      {
        title: 'Current source stance',
        bullets: [
          'Published concepts use constrained, approved source grounding',
          'Source priority is controlled and enforced',
          'Published concept packets carry one primary grounding source and one dictionary boundary source',
          'Review and rejection evidence remain separate from concept-packet grounding',
          'Runtime serves authored concept packets, not raw source text',
        ],
      },
      {
        title: 'Source classes',
        bullets: [
          'Primary grounding source: used to define and constrain concept structure',
          'Dictionary boundary source: used to stabilize definition boundaries',
          'Review evidence: supports lifecycle validation and review state',
          'Rejection evidence: supports structural rejection decisions',
          'Internal authored source note: supports authoring but is not runtime canon',
        ],
      },
      {
        title: 'What sources may do',
        bullets: [
          'ground a concept boundary',
          'support a distinction between concepts',
          'support collapse testing',
          'support review or rejection evidence',
        ],
      },
      {
        title: 'What sources may not do',
        bullets: [
          'auto-create a concept',
          'bypass review or admission',
          'define runtime canon directly',
          'override deterministic system behavior',
          'force runtime inclusion',
        ],
      },
      {
        title: 'Conflict handling',
        paragraphs: [
          'Conflicting source pressure must be resolved during authoring and review.',
          'The runtime does not merge contradictory source claims into a single vague meaning.',
        ],
      },
      {
        title: 'Closing',
        paragraphs: [
          'Sources may inform the system. They do not bypass it.',
        ],
      },
    ],
  },
  handbooks: {
    eyebrow: 'Handbooks',
    title: 'Guides for working with the system without breaking its structure.',
    intro:
      'Handbooks define how to work with ChatPDM safely. They are operational guides, not system explanations or policy surfaces.',
    sections: [
      {
        title: 'Core principle',
        paragraphs: [
          'The system is deterministic and bounded.',
          'All contributions must preserve structure, separation, and refusal behavior.',
        ],
      },
      {
        title: 'Handbook categories',
        links: [
          {
            label: 'Concept authoring',
            route: '/handbooks/concept-authoring',
            note: 'Define concepts without collapse and enforce structural boundaries.',
          },
          {
            label: 'Review and admission',
            route: '/handbooks/review-admission',
            note: 'Move work toward publication only after boundary, fit, and non-collapse checks hold.',
          },
          {
            label: 'Source usage',
            route: '/handbooks/source-usage',
            note: 'Use source material as evidence without letting it bypass authored discipline.',
          },
          {
            label: 'Rejection handling',
            route: '/handbooks/rejection-handling',
            note: 'Reject concepts and structures cleanly when they weaken clarity or stability.',
          },
          {
            label: 'Comparison authoring',
            route: '/handbooks/comparison-authoring',
            note: 'Define allowed comparisons without weakening distinction or runtime trust.',
          },
          {
            label: 'Runtime discipline',
            route: '/handbooks/runtime-discipline',
            note: 'Preserve refusal behavior, scope boundaries, and canonical runtime meaning during change.',
          },
        ],
      },
      {
        title: 'What handbooks are not',
        bullets: [
          'not system explanations',
          'not runtime output',
          'not policy definitions',
          'not concept content',
        ],
      },
      {
        title: 'Closing',
        paragraphs: [
          'These guides exist to preserve system integrity during change.',
        ],
      },
    ],
  },
  'handbooks-concept-authoring': {
    eyebrow: 'Handbooks',
    title: 'Concept authoring',
    intro:
      'Define concepts without collapse.',
    sections: [
      {
        title: 'Core rule',
        bullets: [
          'a concept must remain distinct under pressure',
          'a concept that collapses into a nearby concept is not ready',
          'runtime compensation is not a substitute for weak authoring',
        ],
      },
      {
        title: 'Required components',
        bullets: [
          'shortDefinition',
          'coreMeaning',
          'fullDefinition',
          'boundary statements through excludes and adjacent boundaries',
        ],
      },
      {
        title: 'Must define',
        bullets: [
          'what the concept is',
          'what the concept is not',
          'which adjacent concepts must remain separate',
        ],
      },
      {
        title: 'Collapse checks',
        bullets: [
          'does it reduce to another concept under pressure',
          'does it duplicate an existing concept structurally',
          'can the same shortDefinition or mechanism survive a title swap',
        ],
      },
      {
        title: 'Failure conditions',
        bullets: [
          'vague definition',
          'synonym collapse',
          'boundary overlap',
          'unsupported or decorative source grounding',
        ],
      },
      {
        title: 'Output rule',
        bullets: [
          'concept packets are the only runtime truth',
          'draft authoring notes do not define runtime meaning',
        ],
      },
    ],
  },
  'handbooks-review-admission': {
    eyebrow: 'Handbooks',
    title: 'Review and admission',
    intro:
      'Concepts must pass structure before becoming live.',
    sections: [
      {
        title: 'Lifecycle states',
        bullets: [
          'blocked',
          'phase1_passed',
          'phase2_stable',
          'pending_overlap_scan',
          'overlap_scan_passed',
          'overlap_scan_failed_conflict',
          'overlap_scan_failed_duplicate',
          'overlap_scan_failed_compression',
          'overlap_scan_boundary_required',
          'runtime',
        ],
      },
      {
        title: 'Phase 1 requirements',
        bullets: [
          'boundary clarity',
          'non-collapse against nearby concepts',
          'pressure-term grounding where structural wording depends on it',
        ],
      },
      {
        title: 'Phase 2 requirements',
        bullets: [
          'stable definitions',
          'consistent structure across authored registers',
          'validated relationships and adjacent boundaries',
        ],
      },
      {
        title: 'Admission rule',
        bullets: [
          'only structurally stable concepts enter runtime',
          'overlap scan must pass before a concept can move into the live set',
          'review state does not imply runtime admission by itself',
        ],
      },
      {
        title: 'Rejection rule',
        bullets: [
          'unresolved ambiguity blocks admission',
          'unresolved collapse risk blocks admission',
          'overlap conflicts, duplicates, and compression now block admission',
          'weak source grounding blocks admission',
        ],
      },
      {
        title: 'Output rule',
        bullets: [
          'runtime reflects admitted concepts only',
          'reviewed or blocked concepts remain outside the live runtime unless admitted',
        ],
      },
    ],
  },
  'handbooks-source-usage': {
    eyebrow: 'Handbooks',
    title: 'Source usage',
    intro:
      'Use sources without allowing them to control the system.',
    sections: [
      {
        title: 'Core rule',
        bullets: [
          'sources inform authoring, not runtime directly',
          'source material is evidence, not runtime canon',
        ],
      },
      {
        title: 'Allowed uses',
        bullets: [
          'ground boundaries',
          'support distinctions between concepts',
          'support collapse testing',
        ],
      },
      {
        title: 'Not allowed',
        bullets: [
          'define canon directly',
          'bypass review',
          'force inclusion',
          'override deterministic runtime behavior',
        ],
      },
      {
        title: 'Source hierarchy',
        bullets: [
          'primary grounding source',
          'dictionary boundary source',
          'review and rejection evidence',
        ],
      },
      {
        title: 'Workflow',
        bullets: [
          'source',
          'source note',
          'concept authoring',
          'concept packet',
          'runtime',
        ],
      },
      {
        title: 'Output rule',
        bullets: [
          'runtime serves authored packets, not raw source material',
          'source notes and raw excerpts do not define public output directly',
        ],
      },
      {
        title: 'Current status',
        paragraphs: [
          'This handbook defines operating rules only. It does not expose internal source files or raw evidence directly.',
        ],
      },
    ],
  },
  'handbooks-rejection-handling': {
    eyebrow: 'Handbooks',
    title: 'Rejection handling',
    intro:
      'This handbook route will hold the operational guide for rejecting concepts or structures cleanly when they weaken the system.',
    sections: [
      {
        title: 'Current scope',
        bullets: [
          'document structural failure clearly',
          'preserve rejection as a valid outcome',
          'avoid weakening boundaries to avoid rejection',
        ],
      },
      {
        title: 'Current status',
        paragraphs: [
          'This is a handbook stub. Full operational guide content has not been published yet.',
        ],
      },
    ],
  },
  'handbooks-comparison-authoring': {
    eyebrow: 'Handbooks',
    title: 'Comparison authoring',
    intro:
      'This handbook route will hold the operational guide for defining allowed comparisons without weakening distinction or trust.',
    sections: [
      {
        title: 'Current scope',
        bullets: [
          'allow only structurally meaningful comparisons',
          'protect pairwise distinction under stress',
          'block weak or decorative comparison pairs',
        ],
      },
      {
        title: 'Current status',
        paragraphs: [
          'This is a handbook stub. Full operational guide content has not been published yet.',
        ],
      },
    ],
  },
  'handbooks-runtime-discipline': {
    eyebrow: 'Handbooks',
    title: 'Runtime discipline',
    intro:
      'This handbook route will hold the operational guide for preserving refusal behavior, scope boundaries, and canonical runtime meaning during change.',
    sections: [
      {
        title: 'Current scope',
        bullets: [
          'preserve refusal as part of correctness',
          'avoid leaking non-canonical meaning into runtime',
          'respect current public scope and admission boundaries',
        ],
      },
      {
        title: 'Current status',
        paragraphs: [
          'This is a handbook stub. Full operational guide content has not been published yet.',
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
