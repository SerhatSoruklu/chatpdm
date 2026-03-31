# ChatPDM Response Schema Validation

## Purpose

This document explains how `response-schema.json` should be used in ChatPDM v1.

The contract document defines meaning. The examples make that meaning concrete. The schema makes the structure machine-enforceable.

The schema exists to stop shape drift during runtime implementation and later contract evolution.

## What the Schema Enforces

The schema enforces the structural boundary of ChatPDM v1 product responses:

- only five product response types are valid:
  - `concept_match`
  - `rejected_concept`
  - `no_exact_match`
  - `ambiguous_match`
  - `comparison`
- every product response must include the required top-level version fields
- every product response must include `queryType` and `interpretation`
- nested object shapes must match the contract exactly
- closed enums must use valid documented values
- undocumented fields are rejected
- cross-type leakage is rejected
  - `answer` is valid only on `concept_match`
  - `rejection` is valid only on `rejected_concept`
  - `suggestions` are valid only on `no_exact_match`
  - `candidates` are valid only on `ambiguous_match`
- `conceptVersion` is integer only
- `contexts` must use structured objects
- source objects, related concept objects, suggestion objects, and candidate objects must match their documented shapes

The schema also locks the current fixed v1 non-match and ambiguity messages as literal values. That was chosen because the contract already defines those strings as canonical v1 text. This is a contract-level decision and not a localization strategy. Localization must be handled outside the canonical product response contract.

## What the Schema Does Not Enforce

The schema does not enforce semantic truth. It only enforces structural validity.

It cannot enforce:

- that `query` is actually preserved exactly as received
- that `normalizedQuery` was produced by the declared `normalizerVersion`
- that `queryType` was produced by the declared `matcherVersion`
- that `interpretation` is a truthful bounded interpretation of the query shape
- that `fullDefinition` is truly plain text in editorial practice
- that `conceptId` exists in a real published concept store
- that `conceptSetVersion` points to a real immutable snapshot
- that `relatedConcepts` were authored rather than inferred
- that arrays are ordered deterministically across time
- that version bumps happened when they should have happened

Those guarantees require runtime discipline, version policy, editorial discipline, and golden tests.

## Determinism Limits of Schema Validation

A response can be schema-valid and still violate ChatPDM determinism.

Schema validation proves:

- the response has the right shape
- the fields are present
- the nested objects and enums are correct

Schema validation does not prove:

- that the normalizer is deterministic
- that the matcher is deterministic
- that the concept snapshot is immutable
- that array ordering remained version-stable
- that the same normalized query still yields the same canonical payload under fixed versions

In ChatPDM, validity and determinism are related but different:

- schema validity = correct shape
- deterministic correctness = correct shape plus reproducible meaning under fixed versions

## Golden Tests and Determinism

Schema validation and golden fixtures solve different problems.

- schema validates structure
- golden fixtures validate approved output stability over time

Both are required.
Neither alone is sufficient.

A payload can be schema-valid and still represent an unintended regression if:

- ordering changed
- wording changed
- candidate selection changed
- versions were not bumped correctly

Golden fixtures exist to catch those changes as contract regressions instead of letting them drift in silently.

## Validation Workflow Recommendation

Use the response contract foundation in this order:

1. `response-contract.md` defines product meaning
2. `examples/*.json` make the contract concrete
3. `response-schema.json` enforces the allowed structure
4. golden fixtures lock approved outputs
5. golden tests enforce deterministic behavior over time

Recommended workflow during development:

- update the contract first when meaning changes
- update examples next so humans can inspect the change
- update the schema to enforce the new structure
- validate every example against the schema
- add or update golden tests before runtime behavior changes are accepted

## Example Usage in Development

The example payloads under `docs/product/examples/` are explanatory examples.

Use them to:

- validate the schema itself
- review whether proposed changes remain readable and realistic
- catch accidental field drift during contract edits
- keep the contract readable for humans

The approved output commitments live under `tests/golden/fixtures/`.

Use golden fixtures to:

- lock approved outputs for named scenarios
- review whether output changes are intentional
- catch regressions in wording, ordering, or product outcome shape over time

The examples are not runtime mocks for a chatbot.
The golden fixtures are not optional samples. They are the approved outputs used for deterministic regression discipline.

## Non-Goals

This phase does not provide:

- runtime validation middleware
- Express route handlers
- API error envelopes
- OpenAPI documents
- frontend rendering logic
- deterministic golden test implementation

This schema foundation is only the structural enforcement layer for ChatPDM v1 product responses.
