# Canonical Anchor Contract

This document defines the static canonical anchor layer for public ChatPDM concept packets.

The canonical anchor exists to make meaning explicit before any register-level prose is read.

It does not replace authored registers. It anchors them.

## Purpose

The canonical anchor defines:

- what the concept is
- what the concept excludes
- how it stands in boundary relation to adjacent concepts

This layer is static, inspectable, and deterministic.

## Required Shape

Every published concept packet should carry:

```json
{
  "canonical": {
    "invariant": "string",
    "excludes": ["string"],
    "adjacent": {
      "conceptName": "boundary statement"
    }
  }
}
```

## Field Rules

### `canonical.invariant`

This is the shortest inspectable statement of the concept's invariant meaning.

It should:

- state what the concept is
- remain neutral across registers
- avoid register-specific scaffolding

It should not:

- introduce examples
- broaden scope
- collapse into adjacent concepts

### `canonical.excludes`

This lists what the concept definition must not be mistaken for.

Use exclusions to make non-equivalence explicit.

Exclusions should be:

- conceptually relevant
- boundary-protective
- phrased as non-membership, not loose commentary

### `canonical.adjacent`

This names nearby concepts and states the boundary against each one.

Its purpose is not to restate the full comparison block. Its purpose is to preserve local semantic separation.

Adjacent statements should answer:

- how this concept differs from the named adjacent concept
- what the adjacent concept handles instead

## Register Relation

`standard`, `simplified`, and `formal` are all representations of the canonical anchor.

They may vary in:

- sentence length
- vocabulary level
- abstraction level
- explanatory scaffolding
- institutional tone

They must not vary in:

- invariant meaning
- exclusion boundary
- adjacent-concept separation

## Phase 1 Validation Posture

Canonical anchor validation is warning-only for now.

The current non-blocking checks ensure:

- `canonical` exists
- `canonical.invariant` is non-empty
- `canonical.excludes` is an array of non-empty strings
- `canonical.adjacent` is an object whose entries are non-empty strings

This keeps the anchor visible and inspectable without changing runtime behavior in the initial phase.
