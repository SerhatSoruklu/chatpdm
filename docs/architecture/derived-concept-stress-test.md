# Derived Concept Stress Test

## Purpose

Phase 8 stress-tests candidate derived concepts against the locked six-primitive core:

- `law`
- `authority`
- `power`
- `duty`
- `responsibility`
- `legitimacy`

The question is whether a supposed derived concept remains reducible or instead forces primitive promotion.

## Current Focus

The current fixture tests:

- `violation`
- `breach`
- `liability`
- `harm`
- `causation`

## Method

For each concept, the harness:

- records the authored reduction path
- checks whether the reduction uses only the six live primitives
- runs authored scenario checks against that reduction
- distinguishes:
  - `DERIVED`
  - `OUT_OF_SCOPE_DEPENDENCY`
  - `REAL_CORE_GAP`

## Fixtures and Scripts

Fixture:

- [phase-8-derived-concept-stress.json](/home/serhat/code/chatpdm/tests/runtime/fixtures/phase-8-derived-concept-stress.json)

Runner:

- [run-derived-concept-stress-test.js](/home/serhat/code/chatpdm/backend/scripts/run-derived-concept-stress-test.js)

Verifier:

- [verify-derived-concept-stress-test.js](/home/serhat/code/chatpdm/backend/scripts/verify-derived-concept-stress-test.js)

## Failure Rule

If a tested concept depends only on pre-governance interaction constructs outside the governance kernel, the verifier records `OUT_OF_SCOPE_DEPENDENCY` and does not treat that as a core break.

Only `REAL_CORE_GAP` returns `SYSTEM BREAKS`.
