# Concept Lifecycle

This document defines the static lifecycle model for ChatPDM concept packets.

The lifecycle model exists so concept change can be represented as explicit state, version, and succession rather than as silent mutation of canonical truth.

This phase defines structure and documentation only.
It does not yet enforce approvals, review gates, or automatic transitions.

## Purpose

The concept lifecycle layer makes three things explicit:

- what state a concept packet is currently in
- how one version relates to the previous version
- where published truth sits inside a broader version history

This keeps concept change inspectable and deterministic.

## Required Lifecycle Fields

Published concept packets should carry:

```json
{
  "concept": "authority",
  "version": 1,
  "state": "published",
  "previousVersion": null,
  "createdAt": "2026-03-30T00:00:00Z",
  "updatedAt": "2026-03-30T00:00:00Z"
}
```

Field meanings:

- `concept`: stable concept name for lifecycle tracking
- `version`: explicit packet version number
- `state`: lifecycle state of this packet
- `previousVersion`: immediately preceding version number, or `null` for the first packet
- `createdAt`: ISO 8601 UTC creation timestamp for this packet version
- `updatedAt`: ISO 8601 UTC timestamp for the latest edit to this packet version

`conceptId` remains the runtime identifier used by the current resolver.
`concept` exists to keep lifecycle state explicit without altering current runtime addressing.

## Lifecycle States

Allowed lifecycle states:

- `draft`
- `proposed`
- `under_review`
- `approved`
- `rejected`
- `published`
- `superseded`

### State purpose

`draft`

- early authored packet
- not yet presented as candidate truth

`proposed`

- ready for structured review
- candidate for movement into review

`under_review`

- actively being examined for semantic, structural, and source integrity

`approved`

- accepted for publication
- not yet the live published packet

`rejected`

- examined and declined
- retained for traceability, not runtime publication

`published`

- active current truth packet for the live runtime

`superseded`

- historical published packet replaced by a later published version

## Intended Transition Flow

Allowed transitions in this phase:

- `draft -> proposed`
- `proposed -> under_review`
- `under_review -> approved`
- `under_review -> rejected`
- `approved -> published`
- `published -> superseded`

This phase documents the allowed flow but does not yet enforce it in tooling.

## Version Storage

Concept versions should be stored explicitly.

Current convention:

- active packet: `data/concepts/<concept>.json`
- archived snapshot: `data/concept-versions/<concept>/v<version>.json`

Rules:

- do not overwrite archived version snapshots
- when a new published packet is created, the earlier published packet should remain available as a versioned archive
- version numbers must increase monotonically by integer step
- `previousVersion` should point to the version directly before the current packet

## Current Phase Boundary

This phase does not yet add:

- transition enforcement
- approval workflow logic
- runtime branching by lifecycle state
- automatic promotion or rejection behavior

It establishes the lifecycle foundation only.
