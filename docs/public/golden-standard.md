# Golden Standard

This document defines the locked golden concept set for multi-register authoring in ChatPDM.

The golden set exists to preserve reference quality, not to create ceremonial process.

## Golden Concepts

The current golden set is:

- `authority`
- `power`
- `legitimacy`
- `duty`
- `responsibility`

These packets are the reference standard for:

- register separation
- tone discipline
- sentence profile by register
- conceptual boundary clarity

## What Qualifies As Golden Quality

A golden concept should satisfy all of the following:

- `standard` is balanced, readable, and moderately abstract
- `simplified` is visibly easier and lower-friction than `standard`
- `formal` is visibly more bounded and definition-like than `standard`
- all three registers preserve the same concept meaning
- adjacent-concept boundaries remain explicit
- validator checks pass without failure

Golden quality is not only correctness. It is correctness plus stable register contrast.

## Alignment Rule For Other Concepts

New public concepts should be reviewed against the golden set.

The question is not only "does this pass the validator."

The further question is:

- does this concept read like it belongs next to the golden set

That means new concepts should align with the golden set on:

- register contrast
- reading effort gradient
- conceptual tightness
- plain-language discipline in `simplified`
- boundary precision in `formal`

## Read-Only Policy

Golden concepts are read-only by default.

They should not be edited casually.

If a golden concept must change, the change should be explicitly marked with:

- `golden-update`

The tag makes it clear that the reference surface itself is moving, not just an ordinary concept packet.

## Snapshot Policy

The frozen golden snapshots live in:

- `standards/golden-concepts/`

Those snapshots should match the published concept packets exactly.

If a golden concept changes intentionally, its snapshot should be updated in the same change set.

## Warning-Only Check

The register validation workflow may warn when:

- a golden concept no longer matches its stored snapshot
- a non-golden concept deviates substantially from the golden profile ranges

These warnings are for early drift visibility.

They are not a replacement for review.
