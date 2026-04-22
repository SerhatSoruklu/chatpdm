# Phase 1 — Day 5

Refusal Mismatches
Date: 2026-04-22
Time: [leave as placeholder if unknown]
Commit/Branch: [leave as placeholder if unknown]

---

## Scope

Compare the current refusal branches against the Phase 1 refusal contract and record mismatches only.

HTTP error envelopes are out of scope.

---

## Inputs

- docs/runtime/phase1/day1-inventory.md
- docs/runtime/phase1/day2-field-matrix.md
- docs/runtime/phase1/day2-gap-analysis.md
- docs/runtime/phase1/day3-contract-spec.md
- docs/runtime/phase1/day4-response-state-mapping.md
- docs/runtime/phase1/day5-refusal-contract.md

---

## 1. Shared Refusal Mismatches

- None of the current refusal branches expose the Day 5 top-level refusal contract shape.
- `reason` is missing from every current refusal branch except that the backend sometimes repeats refusal copy in `message`.
- `failedLayer` is missing from every current refusal branch.
- `details` is missing from every current refusal branch; current refusal meaning is spread across top-level branch-specific fields instead.
- `traceId` is missing from every current refusal branch.
- `deterministicKey` is missing from every current refusal branch.
- `registryVersion` is missing from every current refusal branch.
- `policyVersion` is missing from every current refusal branch.
- `validationState` is missing from every current refusal branch as a top-level field.
- `timestamp` is missing from every current refusal branch.
- The current refusal surface relies on frontend reconstruction or branch-specific top-level fields to explain refusal meaning instead of a single stable refusal container.

---

## 2. Branch-Specific Mismatches

### `rejected_concept`

Current observed shape:

- top-level `query`, `normalizedQuery`, version fields, `queryType`
- `interpretation` object with `interpretationType: explicitly_rejected_concept`, `targetConceptId`, `concepts`, `message`
- `type: rejected_concept`
- `resolution.method: rejection_registry`
- top-level `message`
- `rejection` object with `status`, `decisionType`, `finality`

Target refusal contract shape:

- `finalState: refused`
- top-level `reason`
- top-level `failedLayer`
- top-level `details`
- top-level trace/version fields

Mismatches:

- `reason` missing
- `failedLayer` missing
- `details` missing
- top-level trace/version fields missing
- refusal meaning is split across `interpretation`, `resolution`, `message`, and `rejection`
- current refusal meaning is still partly inferred from `interpretation.interpretationType` and `rejection` payload values

Current inferred or frontend-compensated meaning:

- frontend can anchor the refusal to the rejected concept through `interpretation.targetConceptId`
- frontend can render refusal text from `message` and the rejection registry state
- backend currently exposes the refusal as a branched payload rather than a single refusal contract object

### `VOCABULARY_DETECTED`

Current observed shape:

- top-level `query`, `normalizedQuery`, version fields, `queryType`
- `finalState: refused`
- `interpretation: null`
- `type: VOCABULARY_DETECTED`
- `resolution.method: vocabulary_guard`
- top-level `message`
- top-level `vocabulary` object

Target refusal contract shape:

- `finalState: refused`
- top-level `reason`
- top-level `failedLayer`
- top-level `details`
- top-level trace/version fields

Mismatches:

- `reason` missing
- `failedLayer` missing
- `details` missing
- top-level trace/version fields missing
- `finalState` exists, but only this branch currently has it
- the refusal is encoded through `vocabulary` and `message` rather than a refusal container

Current inferred or frontend-compensated meaning:

- frontend can treat the branch as a vocabulary boundary refusal because `type` and `vocabulary` are explicit
- frontend does not need to infer the refusal branch, but it still has no top-level refusal contract fields to read

### `no_exact_match`

Current observed shape:

- top-level `query`, `normalizedQuery`, version fields, `queryType`
- `interpretation` object, often with `interpretationType: visible_only_public_concept`
- `type: no_exact_match`
- `resolution.method: out_of_scope` or `no_exact_match`
- top-level `message`
- `suggestions` array

Target refusal contract shape:

- `finalState: refused`
- top-level `reason`
- top-level `failedLayer`
- top-level `details`
- top-level trace/version fields

Mismatches:

- `reason` missing
- `failedLayer` missing
- `details` missing
- top-level trace/version fields missing
- refusal meaning is split across `interpretation`, `resolution`, `message`, and `suggestions`
- visible-only behavior is currently expressed as an interpretation detail, not a refusal-state field

Current inferred or frontend-compensated meaning:

- frontend can reconstruct visible-only vs no-match meaning from `interpretation.interpretationType`
- frontend can use `targetConceptId`, `concepts`, and `suggestions` to decide whether the response is a no-match or a visibility boundary
- the current branch keeps the refusal explanation in multiple places instead of one refusal contract object

### `invalid_query`

Current observed shape:

- top-level `query`, `normalizedQuery`, version fields, `queryType: invalid_query`
- `interpretation` object with `interpretationType: invalid_query`
- `type: invalid_query`
- `resolution.method: invalid_query`
- top-level `message`

Target refusal contract shape:

- `finalState: refused`
- top-level `reason`
- top-level `failedLayer`
- top-level `details`
- top-level trace/version fields

Mismatches:

- `reason` missing
- `failedLayer` missing
- `details` missing
- top-level trace/version fields missing
- the refusal is expressed as invalid query classification rather than a refusal contract envelope

Current inferred or frontend-compensated meaning:

- frontend can treat the branch as invalid input from `queryType` and `interpretation.interpretationType`
- frontend can display the existing `message` as the explanation string
- refusal is still not owned by a single refusal payload shape

### `unsupported_query_type`

Current observed shape:

- top-level `query`, `normalizedQuery`, version fields, `queryType: unsupported_complex_query`
- `interpretation` object with `interpretationType: unsupported_complex`
- `type: unsupported_query_type`
- `resolution.method: unsupported_query_type`
- top-level `message`

Target refusal contract shape:

- `finalState: refused`
- top-level `reason`
- top-level `failedLayer`
- top-level `details`
- top-level trace/version fields

Mismatches:

- `reason` missing
- `failedLayer` missing
- `details` missing
- top-level trace/version fields missing
- refusal meaning is expressed through `queryType`, `interpretation`, and `resolution` instead of a refusal envelope

Current inferred or frontend-compensated meaning:

- frontend can infer unsupported structure from `queryType` and the `interpretation.interpretationType`
- frontend can use `message` as the user-facing explanation
- current surface still does not expose the refusal as a single contract object

### `ambiguous_match`

Current observed shape:

- not captured live on the current route
- code and types indicate the shape would include `query`, `normalizedQuery`, version fields, `queryType`, `interpretation`, `resolution`, `message`, and `candidates`

Target refusal contract shape:

- `finalState: refused`
- top-level `reason`
- top-level `failedLayer`
- top-level `details`
- top-level trace/version fields

Mismatches:

- live runtime evidence is missing
- `reason` would be missing in the current shape implied by code and types
- `failedLayer` would be missing in the current shape implied by code and types
- `details` would be missing in the current shape implied by code and types
- top-level trace/version fields would be missing in the current shape implied by code and types

Current inferred or frontend-compensated meaning:

- if reachable, the frontend would likely use `candidates` and the ambiguous resolution method to show a disambiguation UI
- on the current live route, the branch is hidden behind vocabulary boundary precedence, so the UI never reaches it

---

## 3. Cross-Branch Refusal Findings

- The current refusal branches do not expose a unified top-level refusal envelope.
- The current refusal branches do not expose the Day 5 refusal metadata as top-level fields.
- The current refusal branches rely on branch-specific payload fields instead of a single refusal details object.
- The current refusal branches are not self-describing without reading `type`, `interpretation`, `resolution`, and other branch-specific fields together.
- The current refusal branches require frontend fallback logic to reconstruct part of the refusal meaning.

---

## 4. Highest-Risk Refusal Inconsistencies

- `reason` is absent from all current refusal branches as a first-class top-level field.
- `failedLayer` is absent from all current refusal branches.
- `details` is absent from all current refusal branches.
- `finalState` is present only on `VOCABULARY_DETECTED`, not on the other refusal branches.
- `ambiguous_match` is an evidence gap, so the contract cannot yet be validated against live runtime behavior.
- `no_exact_match` and `unsupported_query_type` still encode refusal meaning through shared top-level fields rather than through a refusal container.

---

## 5. Week 2 Must-Fix Mismatches

- Add top-level `reason` to every refusal response.
- Add top-level `failedLayer` to every refusal response.
- Add top-level `details` to every refusal response.
- Move refusal semantics out of branch-specific top-level fields and into the refusal contract shape.
- Preserve `ambiguous_match` as a contract-mapped refusal even though live runtime capture is incomplete.

---

## 6. Day 5 Summary

- Current refusal branches do not match the target refusal contract shape.
- The largest gap is the absence of the Day 5 top-level refusal contract fields.
- The current refusal surface is still branch-shaped, not refusal-contract-shaped.
