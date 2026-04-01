# Regression Lock System

## Purpose

Phase 7 freezes known-good pipeline behavior and fails on any unapproved drift.

This is a regression boundary, not a new reasoning layer.

## Locked Scope

The current regression lock covers:

- admission states
- rejection routing
- vocabulary classification
- Phase 5 output-state mapping

## Snapshot Fixture

Locked pipeline snapshots live at:

- [phase-7-regression-lock-snapshots.json](/home/serhat/code/chatpdm/tests/runtime/fixtures/phase-7-regression-lock-snapshots.json)

Each snapshot stores the exact full `0 -> 5` pipeline result for a known input.

## Verification

The lock verifier re-runs the live pipeline and deep-compares it to the stored snapshot:

- [verify-regression-lock-system.js](/home/serhat/code/chatpdm/backend/scripts/verify-regression-lock-system.js)

The verifier prints `PASS` or `FAIL` per locked test and fails the run on any deviation.

## Rule

No change is allowed unless explicitly approved.
