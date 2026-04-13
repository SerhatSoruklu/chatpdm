# Phase 6 Execution Card Projection

Phase 6 is the first downstream human-readable layer after the deterministic military-constraints core.

Its job is not to decide anything.
Its job is to present an already validated runtime result as a stable execution card.

The execution card is a projection, not a source of authority.

## Purpose

Phase 6 converts an already admitted bundle and an already computed runtime decision into a compact operational card for human review.

The projection must preserve the underlying machine result exactly.

It must not:

- add new meaning
- reinterpret refusal reasons
- infer missing facts
- normalize uncertainty into success
- create new policy logic

## Phase 6 Scope

Phase 6 accepts:

- a validated bundle
- a runtime decision object
- rule trace output
- authority trace output
- missing fact IDs, if any
- failing rule IDs, if any

Phase 6 emits:

- one execution card
- one deterministic card hash, if the project later chooses to hash the projection
- no new authoritative state

## Deliverables

The minimal Phase 6 delivery set should be:

1. `execution-card.schema.json`
2. `project-execution-card.js`
3. `execution-card.test.js`
4. `execution-card-projection-contract.md`

Optional later additions:

- card rendering adapter for a UI or export surface
- card archive writer
- card comparison helper for regression checks

## Execution Card Schema

The execution card should remain narrow and fully derived from validated runtime output.

Suggested fields:

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
- `generatedAt` only if the implementation later needs an explicit projection timestamp, but default behavior should avoid it

Recommended fields to keep stable:

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

Recommended fields to avoid in the core projection:

- freeform explanation text
- user advice
- tactical recommendations
- hidden inference metadata
- dynamic annotations that depend on runtime environment

## Projection Contract

The projection contract is simple:

`validated bundle + runtime decision -> execution card`

That means:

- same bundle plus same runtime decision must yield the same card
- card fields must be derived only from the runtime output and bundle metadata
- the projection must not reach back into source text or clause text to invent explanation
- the projection must not change the underlying decision

If the runtime result is `REFUSED`, the card must preserve that refusal.
If the runtime result is `REFUSED_INCOMPLETE`, the card must preserve that incompleteness.
If the runtime result is `ALLOWED`, the card must preserve that allow state without embellishment.

## Safe Mapping

| Runtime output | Execution card behavior |
| --- | --- |
| `ALLOWED` | Show the allowed state and preserve the bundle identity and traces |
| `REFUSED` | Show the refusal state, reason code, failing stage, and failing rule IDs |
| `REFUSED_INCOMPLETE` | Show the incomplete state, missing fact IDs, and the refusal trace |

## What Phase 6 Must Not Become

Phase 6 must not turn into:

- a new decision engine
- a policy explanation generator
- a natural-language interpreter
- a tactic recommender
- a fallback path for incomplete runtime data

If any of those appear, the projection layer has drifted out of scope.

## Validation Rules

Phase 6 is only acceptable if:

- identical runtime output produces identical execution cards
- card output is stable under repeated projection
- card output contains no hidden authority or decision logic
- card output does not alter bundle or runtime semantics
- refusal and incompleteness remain explicit

## Exit Condition

Phase 6 is complete when the system can derive a human-readable execution card from a validated runtime result without introducing new meaning or changing the decision.

At that point:

- the core kernel remains the source of authority
- the execution card remains a projection
- human readability is downstream only
