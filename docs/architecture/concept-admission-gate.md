# Concept Admission Gate

## Purpose

Phase 2 decides whether a normalized query belongs to the ontology.

This phase is boundary-only. It does not interpret, infer, or repair meaning.

## Inputs

- `normalizedQuery`
- optional Phase 1 vocabulary recognition result

## Output

The admission gate returns exactly one authored boundary state:

```json
{
  "admission_state": "LIVE"
}
```

Allowed values:

- `LIVE`
- `VISIBLE_ONLY`
- `REJECTED`
- `NOT_A_CONCEPT`

## Decision Order

1. exact live concept match -> `LIVE`
2. exact visible-only concept match -> `VISIBLE_ONLY`
3. exact rejection-registry match -> `REJECTED`
4. recognized legal vocabulary -> `NOT_A_CONCEPT`
5. everything else -> `NOT_A_CONCEPT`

## Governance Scope Rule

The gate stays closed to pre-governance interaction constructs.

That means:

- `commitment` -> `NOT_A_CONCEPT`
- `promise` -> `NOT_A_CONCEPT`
- `undertaking` -> `NOT_A_CONCEPT`
- unanchored `breach` -> `NOT_A_CONCEPT`

These terms may still be recognized by Phase 1 vocabulary, but they do not enter ontology admission unless explicitly anchored to governance structure such as `law` or `duty`.

## Hard Constraints

The admission gate must not:

- guess a nearest concept
- fuzzy-match a live concept
- soften a rejected concept
- upgrade vocabulary into ontology
- create fallback interpretation

## Boundary Rule

Admission defines ontology boundaries.

Nothing crosses into the ontology without exact authored approval.
