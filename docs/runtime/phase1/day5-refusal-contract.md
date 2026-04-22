# Phase 1 — Day 5

Refusal Contract
Date: 2026-04-22
Time: 2026-04-22 16:07 BST
Commit/Branch: main @ 0c7f5df0cf37a7adf3704052e4e9743a70e58181

---

## Scope

Define the Phase 1 refusal contract for public resolver responses only.

HTTP error envelopes are out of scope.

---

## Inputs

- docs/runtime/phase1/day1-inventory.md
- docs/runtime/phase1/day2-field-matrix.md
- docs/runtime/phase1/day2-gap-analysis.md
- docs/runtime/phase1/day3-contract-spec.md
- docs/runtime/phase1/day4-finalstate-vocabulary.md
- docs/runtime/phase1/day4-response-state-mapping.md

---

## 1. Refusal Contract Definition

- A refusal response is any public resolver response with `finalState: refused`.
- A refusal response must expose its refusal meaning directly at the public contract boundary.
- A refusal response must not depend on frontend reconstruction to explain why it was refused.
- A refusal response must include the top-level contract fields defined in Day 3 and the refusal semantics locked in Day 4.

Refusal responses remain within the Phase 1 binary state model:

- `valid`
- `refused`

---

## 2. reason Rules

- `reason` is mandatory on every refusal response.
- `reason` must not be `null` on a refusal response.
- `reason` must explain the refusal in backend-owned terms.
- `reason` must not be omitted from the refusal payload.
- `reason` must not be reconstructed by the frontend from `message`, `interpretation`, `details`, or detail lookups.
- `reason` must stay stable enough for audit and support use.

---

## 3. failedLayer Enum and Meanings

The `failedLayer` vocabulary is closed for Phase 1.

### `intake`

- The response was refused at the input acceptance layer.
- The query did not satisfy basic public intake requirements.

### `structure`

- The response was refused because the query shape or public response structure is not supported.
- The request is recognizable but not accepted in its current structural form.

### `semantic`

- The response was refused because the query could not be admitted on public meaning grounds.
- The input is interpretable but not contract-admissible as a public result.

### `profile`

- The response was refused because the public profile or visibility form of the concept does not admit a live public response.
- The concept is known, but not admitted in the current public profile.

### `registry`

- The response was refused by the public concept registry.
- The concept or response path is blocked by registry-level refusal policy.

### `policy`

- The response was refused by resolver policy.
- The refusal is driven by explicit public policy rather than by input shape alone.

### `validation`

- The response was refused because the output did not satisfy public validation requirements.
- The refusal is tied to contract validation rather than concept semantics.

### `exposure`

- The response was refused because the concept or result is not exposed in the public live surface.
- The data may exist, but it is not publicly exposed for live resolution.

---

## 4. Details Minimum Shape

Refusal responses must include a non-null `details` object.

The minimum refusal `details` shape is:

```json
{
  "interpretationType": "string | null",
  "targetConceptId": "string | null",
  "concepts": "string[] | null",
  "resolutionMethod": "string | null",
  "message": "string | null"
}
```

Rules for the minimum shape:

- All five keys must exist.
- None of the five keys may be omitted.
- The values may be `null` only when the branch does not have a meaningful value for that key.
- Additional refusal-specific fields may exist inside `details`.
- Additional fields must not replace the minimum anchor keys.
- The top-level refusal meaning must not be pushed into `details`.

---

## 5. Refusal Invariants

- `finalState` must be `refused`.
- `reason` must be present and non-null.
- `failedLayer` must be present and non-null.
- `details` must be present and non-null.
- The refusal must be understandable from the public response itself.
- The frontend must not need to infer the refusal state from fallback behavior.
- Branch-specific payload may vary, but the refusal contract itself must stay stable.
- `valid` remains the only non-refusal state in Phase 1.

---

## 6. Examples of Contract Application

### `rejected_concept`

- `finalState: refused`
- `reason`: required and non-null
- `failedLayer`: typically `registry`
- `details.interpretationType`: refusal-specific value
- `details.targetConceptId`: required when a concept anchor exists
- `details.concepts`: may be populated when the refusal references multiple concepts
- `details.resolutionMethod`: registry or rejection method value
- `details.message`: required as the refusal explanation anchor

### `VOCABULARY_DETECTED`

- `finalState: refused`
- `reason`: required and non-null
- `failedLayer`: typically `exposure`
- `details.interpretationType`: vocabulary boundary marker
- `details.targetConceptId`: may be `null`
- `details.concepts`: may be `null` or populated
- `details.resolutionMethod`: vocabulary boundary method
- `details.message`: required as the refusal explanation anchor

### `no_exact_match`

- `finalState: refused`
- `reason`: required and non-null
- `failedLayer`: typically `semantic`
- `details.interpretationType`: no-match marker
- `details.targetConceptId`: may be `null`
- `details.concepts`: may be `null`
- `details.resolutionMethod`: no-match method
- `details.message`: required as the refusal explanation anchor

### `invalid_query`

- `finalState: refused`
- `reason`: required and non-null
- `failedLayer`: typically `intake`
- `details.interpretationType`: invalid-query marker
- `details.targetConceptId`: may be `null`
- `details.concepts`: may be `null`
- `details.resolutionMethod`: invalid-query method
- `details.message`: required as the refusal explanation anchor

### `unsupported_query_type`

- `finalState: refused`
- `reason`: required and non-null
- `failedLayer`: typically `structure`
- `details.interpretationType`: unsupported-query marker
- `details.targetConceptId`: may be `null`
- `details.concepts`: may be populated when the query references recognizable concepts
- `details.resolutionMethod`: unsupported-query method
- `details.message`: required as the refusal explanation anchor

### `ambiguous_match`

- `finalState: refused`
- `reason`: required and non-null
- `failedLayer`: typically `semantic`
- `details.interpretationType`: ambiguous-match marker
- `details.targetConceptId`: may be `null`
- `details.concepts`: may be populated to show competing candidates
- `details.resolutionMethod`: ambiguity method
- `details.message`: required as the refusal explanation anchor

---

## 7. Refusal Contract Summary

- Refusal is a first-class public contract state.
- `reason` and `failedLayer` are mandatory on refusal responses.
- `details` must carry the minimum refusal anchors and may carry richer branch-specific payload.
- The refusal contract is explicit enough to be understood without frontend reconstruction.
