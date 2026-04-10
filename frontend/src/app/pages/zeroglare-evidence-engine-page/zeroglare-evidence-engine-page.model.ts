import {
  ZEE_PAGE_BOUNDARY_LINE,
  ZEE_INFOGRAPHIC_EXPAND_LABEL,
  ZEE_ROUTE_PATH,
  ZEE_PAGE_SUBTITLE,
  ZEE_PAGE_TITLE,
} from './zeroglare-evidence-engine-page.constants';

export interface ZeeSurfaceCard {
  title: string;
  copy: string;
}

export interface ZeeSectionAnchor {
  label: string;
  route: string;
  fragment: string;
}

export interface ZeePipelineStep extends ZeeSurfaceCard {
  step: string;
}

export interface ZeeRelatedSurface {
  label: string;
  route: string;
  note: string;
}

export interface ZeePageContent {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    lead: string;
    boundaryLine: string;
    anchors: readonly ZeeSectionAnchor[];
    cards: readonly ZeeSurfaceCard[];
  };
  whatItIs: {
    label: string;
    title: string;
    intro: string;
    cards: readonly ZeeSurfaceCard[];
  };
  whatItIsNot: {
    label: string;
    title: string;
    intro: string;
    cards: readonly ZeeSurfaceCard[];
  };
  coreContract: {
    label: string;
    title: string;
    intro: string;
    cards: readonly ZeeSurfaceCard[];
  };
  pipeline: {
    label: string;
    title: string;
    intro: string;
    imageNote: string;
    expandLabel: string;
    caption: string;
    steps: readonly ZeePipelineStep[];
  };
  example: {
    label: string;
    title: string;
    intro: string;
    cards: readonly ZeeSurfaceCard[];
    note: string;
  };
  boundaryFraming: {
    label: string;
    title: string;
    intro: string;
    closing: string;
    relatedSurfaces: readonly ZeeRelatedSurface[];
  };
}

export const ZEE_PAGE_CONTENT: ZeePageContent = {
  hero: {
    eyebrow: 'System surface',
    title: ZEE_PAGE_TITLE,
    subtitle: ZEE_PAGE_SUBTITLE,
    lead:
      'ZEE is a standalone public surface for inspecting evidence. It does not participate in ChatPDM runtime resolution, admission, or registry behavior.',
    boundaryLine: ZEE_PAGE_BOUNDARY_LINE,
    anchors: [
      { label: 'What it is', route: ZEE_ROUTE_PATH, fragment: 'pdm-zee-what-it-is' },
      { label: 'What it is not', route: ZEE_ROUTE_PATH, fragment: 'pdm-zee-what-it-is-not' },
      { label: 'Core contract', route: ZEE_ROUTE_PATH, fragment: 'pdm-zee-core-contract' },
      { label: 'Pipeline', route: ZEE_ROUTE_PATH, fragment: 'pdm-zee-pipeline' },
      { label: 'Example case', route: ZEE_ROUTE_PATH, fragment: 'pdm-zee-example-case' },
      { label: 'Boundary framing', route: ZEE_ROUTE_PATH, fragment: 'pdm-zee-boundary-framing' },
    ],
    cards: [
      {
        title: 'Standalone surface',
        copy: 'ZEE has its own route, its own public page, and its own bounded wording.',
      },
      {
        title: 'Deterministic mode',
        copy: 'Evidence is read through explicit phases, not freeform interpretation.',
      },
      {
        title: 'Non-authoritative',
        copy: 'Outputs stay outside ChatPDM runtime as observations, not inputs.',
      },
    ],
  },
  whatItIs: {
    label: 'What it is',
    title: 'A deterministic evidence surface with a public contract.',
    intro:
      'ZEE isolates evidence, measures stable signals, applies a declared cross-kind support rule, and returns bounded output.',
    cards: [
      {
        title: 'Evidence support',
        copy: 'It turns visible cues into bounded support statements about what the frame can support.',
      },
      {
        title: 'Inspectable contract',
        copy: 'It makes the rules, limits, replay manifest, schema versions, and explicit outcome categories visible on the page.',
      },
      {
        title: 'Separated surface',
        copy: 'It lives beside ChatPDM, but it does not join resolver, registry, or admission paths.',
      },
    ],
  },
  whatItIsNot: {
    label: 'What it is not',
    title: 'A truth engine, a hidden classifier, or an identity inference layer.',
    intro:
      'The surface must stay narrow. It can describe evidence support, but it cannot become a hidden authority.',
    cards: [
      {
        title: 'Not a truth engine',
        copy: 'It does not decide what is true; it only states what the evidence can support.',
      },
      {
        title: 'Not hidden classification',
        copy: 'It does not convert hidden classification into unsupported claims about people, objects, or intent.',
      },
      {
        title: 'Not identity inference',
        copy: 'It does not fill in missing identity details when the frame is incomplete.',
      },
      {
        title: 'Not a runtime input source',
        copy: 'Its outputs are non-authoritative and cannot be consumed by any other system surface.',
      },
    ],
  },
  coreContract: {
    label: 'Core contract',
    title: 'ZEE stays bounded, inspectable, and non-authoritative.',
    intro:
      'These are the contract rules that keep the public surface honest while preserving the ChatPDM runtime boundary.',
    cards: [
      {
        title: 'Frame isolation',
        copy: 'Separate the observation window from unsupported context before interpretation proceeds.',
      },
      {
        title: 'Non-consumption invariant',
        copy: 'ZEE outputs are non-authoritative and cannot be consumed as inputs by any other system surface.',
      },
      {
        title: 'Inference gate',
        copy: 'Allow only cross-kind measured signals that satisfy the declared support rule.',
      },
      {
        title: 'Outcome taxonomy',
        copy: 'STABLE, MEASURED, DISCARDED, SUPPORTED, REFUSED, UNSUPPORTED, and UNKNOWN are explicit phase-local outcomes.',
      },
      {
        title: 'Replay manifest',
        copy: 'Replay and inspector outputs carry explicit artifact, schema, taxonomy, support-rule, and policy versions.',
      },
    ],
  },
  pipeline: {
    label: 'Six-phase pipeline',
    title: 'Read the infographic left to right: isolate, extract, stabilize, measure, gate, and bound.',
    intro:
      'The diagram is the visual anchor. The section below gives each phase a bounded reading so the flow stays explicit.',
    imageNote: 'The infographic is the visual anchor for the six-phase pipeline.',
    expandLabel: ZEE_INFOGRAPHIC_EXPAND_LABEL,
    caption:
      'Each phase narrows the evidence surface. Nothing in the flow is allowed to become hidden authority.',
    steps: [
      {
        step: '1',
        title: 'Frame Isolation',
        copy: 'Separate the evidence frame from unrelated context so later steps work on a stable input.',
      },
      {
        step: '2',
        title: 'Signal Extraction',
        copy: 'Extract visible cues such as edges, text fragments, geometry, color patches, and repeated structures.',
      },
      {
        step: '3',
        title: 'Signal Stability',
        copy: 'Check whether the extracted cues persist across the frame instead of collapsing into glare or noise.',
      },
      {
        step: '4',
        title: 'Measurement Layer',
        copy: 'Measure the strength, placement, and repetition of stable signals without turning them into conclusions.',
      },
      {
        step: '5',
        title: 'Inference Gate',
        copy: 'Allow only cross-kind measured signals that satisfy the declared support rule.',
      },
      {
        step: '6',
        title: 'Bounded Output',
        copy: 'Return compact support statements, explicit unknowns, and phase-local refusal notes where evidence is insufficient.',
      },
    ],
  },
  example: {
    label: 'Example case',
    title: 'A partially obscured label can be described without becoming identity inference.',
    intro:
      'The example stays visual and bounded. It shows how ZEE can report evidence support without guessing beyond what is visible.',
    cards: [
      {
        title: 'Input',
        copy: 'A photographed equipment label is partly obscured by glare. The logo is visible, two digits are clear, and one character is unreadable.',
      },
      {
        title: 'Supported evidence',
        copy: 'Visible logo, partial serial line, and a clearly unreadable character are all part of the observed frame.',
      },
      {
        title: 'Bounded output',
        copy: 'Supported: a label is present and partially legible. Unsupported: identity, ownership, authenticity, or intent.',
      },
    ],
    note:
      'ZEE reports evidence support only. It does not fill the unreadable character with a guess, and it does not infer who or what the item is.',
  },
  boundaryFraming: {
    label: 'Final boundary framing',
    title: 'ZEE adds capability, not authority.',
    intro:
      'The surface is published so people can inspect the contract. It is not promoted into the ChatPDM runtime contract.',
    closing:
      'ZEE outputs are non-authoritative, non-operational outside the page scaffold, and never inputs to runtime systems. The replay manifest, support policy, and outcome taxonomy remain explicit.',
    relatedSurfaces: [
      {
        label: 'ZeroGlare',
        route: '/zeroglare',
        note: 'Existing signal-discipline surface.',
      },
      {
        label: 'Risk Mapping Governance',
        route: '/risk-mapping-governance',
        note: 'Separate transparency and trust surface.',
      },
      {
        label: 'How it works',
        route: '/how-it-works',
        note: 'Current deterministic runtime model.',
      },
    ],
  },
};
