# Regression Lock System

## Purpose

Phase 7 freezes known-good pipeline behavior and fails on any unapproved drift.

This is a regression boundary, not a new reasoning layer.

## Locked Scope

The current regression lock covers the public resolver/API contract.

The public resolver/API contract is authoritative for user-visible behavior and is the regression surface that Phase 1 now protects.

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

The older full-pipeline snapshot regression lock has been retired and is no longer part of the Phase 1 assurance surface.

## Phase 1 Frozen Baseline

Phase 1 is frozen. The closeout record is [phase-1-completion-report.md](/home/serhat/code/chatpdm/docs/architecture/phase-1-completion-report.md).

## Rule

No change is allowed unless explicitly approved.
