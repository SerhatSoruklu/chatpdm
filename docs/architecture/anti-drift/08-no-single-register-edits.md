# Lock 8 - No Single-Register Edits

## Purpose

Prevent isolated edits from breaking register separation or meaning alignment.

Editing only one register is often the fastest way to create collapse or drift.

## Rule

Do not edit a single register in isolation unless the change is purely mechanical and proven meaning-neutral.

Default review posture:

- edit all 3 registers together
- or edit none

## What It Protects

This lock prevents:

- `simplified` drifting away from `standard`
- `formal` becoming stale while `standard` evolves
- one-sided corrections that break register balance

## Safe Exceptions

An isolated edit may be acceptable when:

- it is fixing a validator failure in that register
- it is removing a formatting or lint issue
- it does not alter meaning or contract behavior

Even then, the validator and same-concept diff lens should still be reviewed.

## Merge Standard

If one register changes, reviewers should confirm whether the other two still remain:

- meaning-equivalent
- visibly distinct
- contract-compliant
