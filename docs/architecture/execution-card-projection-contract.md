# Execution Card Projection Contract

Phase 6 is a projection layer only.
It does not decide admissibility.
It does not read source prose.
It does not invent explanation.

## Contract

`validated bundle metadata + runtime decision + authority trace + rule trace -> execution card`

The projection must be deterministic.
The same validated bundle and the same runtime result must always produce the same execution card.

## Stable Fields

The core execution card is narrow and derived.

Required fields:

- `cardId`
- `packId`
- `bundleId`
- `bundleVersion`
- `bundleHash`
- `jurisdiction`
- `decision`
- `reasonCode`
- `failedStage`
- `failingRuleIds`
- `missingFactIds`
- `authorityTrace`
- `ruleTrace`

## What The Projection May Use

- validated bundle metadata
- runtime decision output
- authority trace
- rule trace

## What The Projection Must Not Use

- reviewed clause text
- raw source text
- compiler notes
- freeform explanation text
- recommendations
- tactical guidance
- severity interpretation
- hidden inference metadata

## Semantic Rules

- `ALLOWED` stays `ALLOWED`
- `REFUSED` stays `REFUSED`
- `REFUSED_INCOMPLETE` stays `REFUSED_INCOMPLETE`
- refusal reasons must be preserved exactly
- incompleteness must remain explicit
- no projection field may soften or reinterpret the runtime decision

## Determinism Rule

Identical runtime output must produce identical cards.
Repeated projection must be stable.
Projection order or human-readable phrasing must not affect the result.

## Non-Goals

- no UI rendering
- no advisor behavior
- no explanation engine
- no retry or fallback logic
- no semantic expansion

## Exit Condition

Phase 6 is complete when the system can render an auditable execution card from an already validated runtime result without changing the decision or widening the kernel.
