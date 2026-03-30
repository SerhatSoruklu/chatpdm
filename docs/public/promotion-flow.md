# Promotion Flow

This document defines the deterministic approval and promotion flow for ChatPDM concepts.

The purpose of the flow is to prevent a concept packet from becoming canonical truth through direct editing alone.

Concept publication must be an explicit promotion event.

## Required Lifecycle Flow

Concept changes must move through this sequence:

- `draft -> proposed`
- `proposed -> under_review`
- `under_review -> approved`
- `under_review -> rejected`
- `approved -> published`
- `published -> superseded`

The workflow does not allow state skipping.

Examples:

- a `draft` packet cannot move directly to `approved`
- an `under_review` packet cannot move directly to `published`
- a `published` packet cannot be edited into `approved`; it must be superseded by a newer version

## Workflow Functions

The governance workflow exposes five deterministic functions:

- `proposeChange(concept)`
- `markUnderReview(concept)`
- `approveChange(concept)`
- `rejectChange(concept)`
- `publishConcept(concept)`

These functions enforce allowed state transitions and validator requirements.

## Approval Law

A concept cannot be approved unless:

- it is currently in `under_review`
- the validator passes cleanly
- semantic invariance passes
- a semantic profile exists for that concept

In practice, approval requires successful V1, V2, and V3 validation.

Approval is therefore not only a state change.
It is a state change gated by content truth checks.

## Promotion Law

A concept cannot be published unless:

- it is currently in `approved`
- the validator still passes cleanly at promotion time
- semantic invariance still passes at promotion time

Publishing returns a promotion result with:

- the new `published` concept packet
- the previous `published` concept packet rewritten as `superseded`

The workflow therefore treats publication as promotion across versions, not as casual mutation of the active truth packet.

## Version Rules

Promotion must preserve deterministic version order.

If a previous published version exists:

- the new version must equal `previous.version + 1`
- the new packet must set `previousVersion` to the previous published version

If no previous published version exists:

- the first published version must be `1`
- `previousVersion` must be `null`

## Phase Boundary

This phase adds workflow functions and enforcement logic only.

It does not yet add:

- multi-actor role separation
- review assignment
- approval signatures
- repository mutation automation
- automatic publication from pull requests

Those belong to later governance phases.
