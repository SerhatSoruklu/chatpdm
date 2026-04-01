# Resolution Engine

## Purpose

Phase 4 produces deterministic outcomes from authored admission state.

It resolves or refuses. It does not interpret.

## Inputs

- `admission_state`
- `normalized_query`

## Output Types

The resolution engine returns exactly one wrapper shape:

```json
{
  "type": "LIVE_RESOLUTION",
  "payload": {}
}
```

Allowed `type` values:

- `LIVE_RESOLUTION`
- `VISIBLE_INSPECTION`
- `STRUCTURAL_REJECTION`
- `VOCAB_CLASSIFICATION`
- `NO_MATCH`

## Resolution Rules

- `LIVE` -> canonical concept resolution
- `VISIBLE_ONLY` -> inspectable concept detail only
- `REJECTED` -> governed structural refusal
- `NOT_A_CONCEPT` + recognized legal vocabulary -> vocabulary classification only
- `NOT_A_CONCEPT` + recognized pre-governance interaction construct without `law` or `duty` anchor -> refused no-match boundary output
- `NOT_A_CONCEPT` + governance-anchored interaction construct without an approved governance path -> refused no-match boundary output
- `NOT_A_CONCEPT` + unrecognized term -> no-match

Examples of refused pre-governance interaction constructs:

- `commitment`
- `promise`
- `undertaking`
- unanchored `breach`

## Hard Constraints

The resolution engine must not:

- blend concepts
- partially resolve a non-concept
- map vocabulary to primitives
- soften rejected concepts
- create fallback interpretation

## Consistency Rule

The engine validates that the supplied `admission_state` still matches the normalized query under the exact admission gate.

If they do not match, the engine fails instead of guessing.
