# RMG Post-MVP Freeze

## System Identity

RMG is a deterministic, bounded governance layer.
It does not predict.
It does not generate narratives.
It does not infer beyond authored support.

## Locked Capabilities

The following capabilities are frozen unless a new phase explicitly reopens them:

- direct-path-only (threat -> node)
- no multi-hop paths
- no cross-scope propagation
- evidence-required support
- unsupported bridges must be explicit
- assumptions, unknowns, and falsifiers must be emitted when applicable
- bounded confidence is class-based only: LOW / MEDIUM / HIGH

## Locked Output Contract

The frozen resolve output contract is:

- `supportedNodes: string[]`
- `supportedThreatVectors: string[]`
- `supportedCausalPaths: string[]`
- `unsupportedBridges: string[]`
- `assumptions: string[]`
- `unknowns: string[]`
- `falsifiers: string[]`
- `boundedConfidenceClass: enum`
- `diagnostics: bounded object`

No new fields are allowed without a new phase.

## Change Policy

Any of the following requires a new phase:

- multi-hop reasoning
- confidence model change
- output contract expansion
- registry schema changes
- new reasoning types
