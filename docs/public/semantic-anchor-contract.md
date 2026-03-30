# Semantic Anchor Contract

This document defines the static semantic anchor profile layer for ChatPDM concept validation.

Semantic anchor profiles exist to make invariant concept meaning inspectable without depending on any single register surface.

They do not replace canonical packets.
They do not replace authored registers.
They define the concept-preservation checks that later semantic validation can use.

## Purpose

A semantic anchor profile defines:

- what meaning signals must remain present across registers
- what adjacent-concept boundaries must remain visible
- what kinds of reduction or substitution count as semantic drift

This layer is:

- static
- deterministic
- concept-scoped
- inspectable in plain JSON

## Profile Location

Profiles live at:

- `data/concept-semantic-profiles/<concept>.json`

Each profile is loaded by exact concept name.

No fallback lookup, inference, or register-derived profile generation is allowed.

## Profile Shape

Each semantic profile uses this explicit shape:

```json
{
  "concept": "authority",
  "requiredAnchors": {
    "shortDefinition": [
      {
        "id": "directive-right",
        "matchAny": ["right to direct", "right to decide"]
      }
    ]
  },
  "requiredBoundaries": {
    "fullDefinition": [
      {
        "id": "boundary-power",
        "matchAny": ["distinct from power", "not power"]
      }
    ]
  },
  "forbiddenDrift": {
    "allZones": [
      {
        "id": "mere-ability",
        "matchAny": ["mere ability", "mere capacity"]
      }
    ]
  },
  "optionalWarnings": {
    "allZones": [
      {
        "id": "recognized-standing-signal",
        "matchAny": ["recognized standing"]
      }
    ]
  }
}
```

Each anchor group must contain:

- `id`
- `matchAny`

`matchAny` is a deterministic lexical list. It is not fuzzy matching.

## Anchors

`requiredAnchors` preserve the concept's core semantic content.

Anchors answer:

- what must still be present for this to count as the same concept

Anchors are not general keywords.
They are concept-preserving signals.

For example, for `authority`, a directive-right anchor preserves the idea that authority concerns a right to direct or decide, rather than mere force or outcome production.

## Boundaries

`requiredBoundaries` preserve separation from adjacent concepts.

Boundaries answer:

- what nearby concept this must not collapse into
- which contrast must remain explicit

Anchors and boundaries are not the same thing:

- anchors preserve what the concept is
- boundaries preserve what the concept is not, relative to nearby concepts

For example, `authority` needs explicit separation from:

- `power`
- `legitimacy`

because the concept loses its shape if those boundaries disappear.

## Forbidden Drift

`forbiddenDrift` lists reduction patterns that should count as meaning drift when they replace the concept's actual boundary.

These are not style violations.
They are semantic reduction risks.

Examples:

- reducing `authority` to mere ability
- reducing `authority` to influence only
- reducing `authority` to social approval

Forbidden drift groups should be:

- concept-specific
- concrete
- bounded

They should not become a bag of vague synonyms.

## Optional Warnings

`optionalWarnings` identifies supporting signals that are useful for review but should not define meaning by themselves.

These exist to help future semantic validation report weak preservation without automatically treating it as semantic failure.

They are advisory signals, not core invariants.

## Register Relation

Semantic anchor profiles are independent of:

- `standard`
- `simplified`
- `formal`

Those registers are prose representations.
The semantic profile is the preservation surface that later validation will compare them against.

That means:

- anchors must not be derived from `standard` wording
- boundaries must not depend on a single register's phrasing
- semantic preservation must remain concept-first, not prose-first

## Current Phase Boundary

This phase only introduces:

- the explicit profile schema
- deterministic loading
- seeded authority profile
- documentation

This phase does not yet introduce:

- semantic pass/fail validation
- runtime gating
- UI changes
- probabilistic similarity checks
