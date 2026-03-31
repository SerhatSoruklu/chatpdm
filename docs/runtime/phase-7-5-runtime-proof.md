# Phase 7.5 Runtime Proof

## Purpose

Phase 7.5 proves that the minimal ChatPDM runtime behaves correctly under controlled exact-match, noise-input, canonical_id, rejection-registry, and suggestion scenarios.

This phase does not broaden product scope. It tests whether the existing deterministic architecture still behaves honestly under pressure.

## Controlled Additions

Phase 7.5 introduces authored runtime-control cases through:

- `data/concepts/resolve-rules.json`
- `data/concepts/rejections/`

The focused control cases are:

- rejection-registry cases: `obligation`, `enforcement`
- one suggestion case: `civic duty`

These do not expand the main concept set. They exist only to exercise already-documented runtime branches through explicit authored data.

Because the authored suggestion mapping and rejection registry are part of the published runtime surface, this phase uses:

- `conceptSetVersion`: `20260327.4`

## Proven Case Groups

The runtime proof covers:

- exact match for the five seed concepts
- empty-string rejection at the API boundary
- noise input handling that normalizes to `__empty__`
- canonical_id success and failure
- rejection-registry coverage for exact, normalized, and canonical-id queries
- one authored suggestion case
- repeated execution stability
- schema validation for all product responses

## Proof Table

| Input | Expected normalizedQuery | Expected type | Expected target |
| --- | --- | --- | --- |
| `authority` | `authority` | `concept_match` | `authority` |
| `power` | `power` | `concept_match` | `power` |
| `legitimacy` | `legitimacy` | `concept_match` | `legitimacy` |
| `responsibility` | `responsibility` | `concept_match` | `responsibility` |
| `duty` | `duty` | `concept_match` | `duty` |
| `` | n/a | API invalid input | rejected before product response generation |
| `   ` | `__empty__` | `no_exact_match` | `[]` |
| `???` | `__empty__` | `no_exact_match` | `[]` |
| `what is ???` | `__empty__` | `no_exact_match` | `[]` |
| `concept:authority` | `conceptauthority` | `concept_match` | `authority` |
| `concept:missing-id` | `conceptmissing-id` | `no_exact_match` | `[]` |
| `obligation` | `obligation` | `rejected_concept` | `obligation` |
| `enforcement` | `enforcement` | `rejected_concept` | `enforcement` |
| `ENFORCEMENT` | `enforcement` | `rejected_concept` | `enforcement` |
| `concept:obligation` | `conceptobligation` | `rejected_concept` | `obligation` |
| `civic duty` | `civic duty` | `no_exact_match` | suggestion: `duty` |
| `unknown term` | `unknown term` | `no_exact_match` | `[]` |

## Verification Rule

Every proof case must:

- resolve through the current runtime
- validate against the existing response schema
- produce the same product response on repeated execution under the same versions

If any proof case fails, Phase 7.5 is not complete.
