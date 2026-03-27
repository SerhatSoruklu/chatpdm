# ChatPDM Version Bump Policy

## Purpose

This document defines how ChatPDM v1 handles version discipline for deterministic product responses.

The goal is simple:

- prevent silent drift
- preserve reproducibility
- make regressions visible
- force intentional change management

## Determinism Guarantee

ChatPDM v1 guarantees the following:

- given the same raw `query` and the same `normalizerVersion`, the system must produce the same `normalizedQuery`
- given the same `normalizedQuery`, `matcherVersion`, `conceptSetVersion`, and `contractVersion`, the system must produce the same product outcome and the same canonical answer payload

Golden fixtures exist to lock approved outputs against that guarantee.

Array order is part of the contract. Reordering any of the following without a version bump and fixture update is a regression:

- `answer.contexts`
- `answer.sources`
- `answer.relatedConcepts`
- `suggestions`
- `candidates`

## Version Fields

ChatPDM v1 uses four version fields:

- `contractVersion`
- `normalizerVersion`
- `matcherVersion`
- `conceptSetVersion`

Each field has a separate responsibility. They must not be treated as interchangeable.

## When To Bump Each Version

### contractVersion

Bump `contractVersion` when any response shape or response-field semantics change.

Examples:

- a field is added
- a field is removed
- an enum value changes
- a field meaning changes
- a required field becomes optional or vice versa

### normalizerVersion

Bump `normalizerVersion` when any change can affect `normalizedQuery`.

Examples:

- tokenization changes
- punctuation handling changes
- whitespace normalization changes
- casing behavior changes
- unicode handling changes
- stop-word behavior changes

### matcherVersion

Bump `matcherVersion` when any change can affect product outcome or candidate selection.

Examples:

- matching rules change
- resolution ordering changes
- disambiguation policy changes
- suggestion generation rules change
- candidate ordering logic changes

### conceptSetVersion

Bump `conceptSetVersion` when any published concept content changes.

Examples:

- concept definitions change
- aliases change
- contexts change
- sources change
- related concepts change
- canonical wording changes

## Required Workflow For Any Change

Every relevant change must update the full enforcement chain:

- contract docs if meaning changes
- schema if structure changes
- examples if representation changes
- golden fixtures if approved outputs change

The correct order is:

`contract -> examples -> schema -> fixtures -> validation`

If an output changes and fixtures are not updated, the change is incomplete.

## Approval Discipline

Any version bump requires explicit documented reasoning.

There are no silent changes.
There are no "small tweak" exceptions.
There are no undocumented reorderings.

If a change affects deterministic behavior, it must be named, versioned, reviewed, and committed with the updated fixtures.

## Consequences Of Skipping Version Discipline

If version discipline is ignored, ChatPDM loses:

- determinism
- reproducibility
- auditability
- historical consistency

It also makes regressions harder to detect because changes appear as accidental drift instead of intentional updates.

## Example Scenarios

- normalization tweak -> bump `normalizerVersion`
- wording change to a published definition -> bump `conceptSetVersion`
- change to candidate selection logic -> bump `matcherVersion`
- response field change -> bump `contractVersion`
- reorder `relatedConcepts` in an approved response -> bump the relevant version and update fixtures

## Golden Fixture Rule

Fixtures under `tests/golden/fixtures/` are the approved outputs.

There is no secondary snapshot layer.
There is no optional equality comparison.

If the approved output changes, the fixture must change with the correct version bump and documented reason.
