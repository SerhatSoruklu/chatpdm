# Audit System

This document defines the deterministic audit trail for ChatPDM concept governance.

The audit system exists so concept history answers four questions directly:

- what changed
- why it changed
- who approved it
- what validator state existed at the time

## Purpose

Concept governance should be inspectable after the fact.

The audit log therefore records immutable change records rather than relying on branch history alone.

## Audit Record Structure

Each audit event is stored as a standalone JSON record.

Required structure:

```json
{
  "concept": "authority",
  "version": 1,
  "changeType": "canonical-change",
  "summary": "Initial published baseline recorded for audit continuity.",
  "validatorSnapshot": {
    "v1": "pass",
    "v2": "pass",
    "v3": "pass"
  },
  "approvedBy": "bootstrap-seed",
  "approvedAt": "2026-03-30T00:00:00Z",
  "stateTransitions": [
    "approved->published"
  ]
}
```

## Validator Snapshot Meanings

The `validatorSnapshot` block records the decision-time state of the validator stages:

- `v1`: structure, divergence, and contract baseline
- `v2`: profile hardening
- `v3`: semantic invariance

Allowed snapshot values:

- `pass`
- `fail`
- `skip`
- `not-run`

`skip` is valid when a concept does not yet have semantic profile coverage.

## Storage Rules

Audit records are stored in:

- `data/concept-audit-log/`

Storage rules:

- each record is immutable once written
- new events append new files rather than rewriting old files
- file names encode concept, timestamp, version, change type, and transition slug
- audit history is read by ordering records on `approvedAt`

## Query Surfaces

The governance audit module exposes deterministic query functions:

- `getConceptHistory(concept)`
- `getLatestPublished(concept)`
- `getAuditTrail(concept)`

These functions read from the audit log only.
They do not infer history from git.

## Usage

The audit system is intended for:

- promotion review
- governance reporting
- approval tracing
- validator-state inspection
- publication history lookup

It does not replace:

- the validator
- concept version archives
- pull request review

It complements them by preserving decision-time records.
