# Lock 1 - Canonical Anchor

## Purpose

Prevent slow semantic drift across `standard`, `simplified`, and `formal`.

Register work should be allowed to change prose shape, not concept meaning.

## Rule

Every public concept packet should preserve a canonical anchor that is treated as the non-casual meaning baseline.

The canonical anchor should make explicit:

- invariant meaning
- exclusion boundary
- adjacent-concept distinctions

## What It Protects

This lock prevents:

- subtle boundary drift over time
- register edits that quietly change what a concept includes
- collapse into adjacent concepts such as `power` or `legitimacy`

## Minimum Shape

The anchor can remain lightweight, but it must be inspectable.

Example:

```json
{
  "canonical": {
    "invariant": "Authority is recognized standing to direct within a governance order.",
    "excludes": [
      "capacity to produce effects",
      "validity of standing"
    ],
    "adjacent": {
      "power": "produces effects",
      "legitimacy": "validates standing"
    }
  }
}
```

## Enforcement

The validator should check that authored registers still preserve:

- the same core concept
- the same exclusions
- the same adjacent-concept boundaries

This is not an AI meaning check. It is a bounded integrity check against declared invariants.

## Merge Standard

A register change should not merge if it weakens or contradicts the canonical anchor.
