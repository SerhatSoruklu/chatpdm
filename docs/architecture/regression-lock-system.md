# Regression Lock System

## Purpose

Phase 7 freezes known-good pipeline behavior and fails on any unapproved drift.

This is a regression boundary, not a new reasoning layer.

## Locked Scope

The current regression lock covers two distinct surfaces:

- internal `0 -> 5` proof-pipeline behavior
- public resolver/API behavior

The public resolver/API contract is authoritative for user-visible behavior.

The standalone proof pipeline remains important, but it is an internal proof surface. It must not silently stand in for the public contract when the two differ.

### Internal proof lock

The proof lock covers:

- admission states
- rejection routing
- vocabulary classification
- Phase 5 output-state mapping

Snapshot fixture:

Locked pipeline snapshots live at:

- [phase-7-regression-lock-snapshots.json](/home/serhat/code/chatpdm/tests/runtime/fixtures/phase-7-regression-lock-snapshots.json)

Each snapshot stores the exact full `0 -> 5` pipeline result for a known input.

Verification:

The lock verifier re-runs the live pipeline and deep-compares it to the stored snapshot:

- [verify-regression-lock-system.js](/home/serhat/code/chatpdm/backend/scripts/verify-regression-lock-system.js)

### Public resolver/API lock

The public-contract lock covers:

- final public response type
- query classification
- governed rejection routing
- visible-only refusal behavior
- unsupported-query behavior
- punctuation-safe resolver routing for exact single-token lookups

Locked resolver contract fixtures live at:

- [phase-7-public-resolver-locks.json](/home/serhat/code/chatpdm/tests/runtime/fixtures/phase-7-public-resolver-locks.json)

Verification:

- [verify-public-resolver-regression.js](/home/serhat/code/chatpdm/backend/scripts/verify-public-resolver-regression.js)

This verifier calls the actual public resolver path and deep-compares a locked public-contract extract for each input.

## Rule

No change is allowed unless explicitly approved.
