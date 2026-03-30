# Policy Claim Registry

## Purpose

The policy claim registry is the canonical structured source for inspectable policy claims.

It exists to keep policy truth in explicit claim objects instead of reconstructing claims from
markdown trace tables.

## What The Registry Stores

Each registry claim must declare:

- a stable claim ID
- a claim version
- a publication state
- a policy file boundary
- a section label
- the rendered policy sentence
- the canonical claim wording
- the claim class
- the validator status
- implementation evidence links
- lifecycle data

## Source-Of-Truth Rule

The registry is the primary claim source for:

- inspect surfaces
- policy truth reporting
- policy CI validation

Markdown policy pages may still provide page metadata such as titles and scope bullets, but they do
not define the live claim set.

`POLICY_AUDIT_PHASE_D.md` remains a trace document, not the current claim registry.

## Versioning

Every claim carries an explicit integer `version` and a deterministic `state`.

Current supported states are:

- `draft`
- `published`
- `superseded`

Only `published` claims are emitted into the live inspect surface.

## Evidence Links

Evidence links must be stored as structured objects with:

- `source`
- `path`
- `lines`

This keeps evidence inspectable by UI, reporting, and CI without reparsing prose.

## Quality Rules

Registry claims must stay:

- deterministic
- explicit
- implementation-backed
- globally unique by claim ID
- scoped to the owning policy surface

The registry must never rely on markdown table parsing to rebuild claim truth.
