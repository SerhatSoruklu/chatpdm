# Review Law

This document defines the deterministic review law for concept changes in ChatPDM.

The goal is to classify concept updates by what changed, not by reviewer mood or intuition.

## Purpose

Concept changes are not all equal.

Some edits only restate register prose.
Some edits alter semantic profile definitions.
Some edits change canonical meaning boundaries.
Some edits modify structural fields that affect lifecycle, metadata, or packet shape.

The review law makes those categories explicit so governance severity can be derived mechanically.

## Change Categories

The classifier uses four change types:

- `register-change`
- `semantic-profile-change`
- `canonical-change`
- `structural-change`

### `register-change`

This category applies when authored register prose changes in:

- `registers.standard`
- `registers.simplified`
- `registers.formal`

This includes changes to:

- `shortDefinition`
- `coreMeaning`
- `fullDefinition`

Risk level:

- `low`

Review meaning:

- review for clarity, contract compliance, and register separation
- review does not assume canonical meaning moved unless another change type is also present

### `semantic-profile-change`

This category applies when the semantic anchor profile changes in:

- `data/concept-semantic-profiles/<concept>.json`

This includes changes to:

- required anchors
- required boundaries
- forbidden drift groups
- warning-only anchor groups

Risk level:

- `medium`

Review meaning:

- review for semantic invariance coverage
- review must confirm the profile still matches canonical meaning boundaries

### `canonical-change`

This category applies when the explicit canonical anchor block changes in the concept packet:

- `canonical.invariant`
- `canonical.excludes`
- `canonical.adjacent`

Risk level:

- `high`

Review meaning:

- review must treat this as a meaning-boundary change
- this is the most serious category because it affects the concept anchor itself

### `structural-change`

This category applies when non-register, non-canonical fields in the concept packet change.

Typical examples:

- lifecycle metadata such as `version`, `state`, or timestamps
- concept metadata such as `scope`, `contexts`, `sources`, `relatedConcepts`, or `comparison`
- packet shape changes that are not canonical-anchor changes

Risk level:

- `medium`

Review meaning:

- review must confirm the packet structure still matches documented shape
- review should verify that the change is not hiding a semantic move inside metadata

## Deterministic Risk Mapping

Risk is derived from change type, not reviewer preference.

- `register-change` -> `low`
- `semantic-profile-change` -> `medium`
- `structural-change` -> `medium`
- `canonical-change` -> `high`

If a change includes more than one category, the highest-severity category becomes the primary `changeType`.

Priority order:

1. `canonical-change`
2. `semantic-profile-change`
3. `structural-change`
4. `register-change`

## Diff Output Contract

The concept diff classifier returns a machine-readable object:

```json
{
  "concept": "authority",
  "fromVersion": 1,
  "toVersion": 2,
  "changeType": "canonical-change",
  "changeTypes": [
    "canonical-change",
    "register-change"
  ],
  "changedAreas": [
    "canonical.invariant",
    "registers.standard.shortDefinition"
  ],
  "riskLevel": "high"
}
```

Additional grouped fields may be present to support reporting, but the primary review law depends on:

- `changeType`
- `changedAreas`
- `riskLevel`

## Phase Boundary

This phase adds deterministic classification only.

It does not yet add:

- approval workflow automation
- reviewer assignment
- publication blocking based on review class
- automatic concept promotion or rejection

Those belong to later governance phases.
