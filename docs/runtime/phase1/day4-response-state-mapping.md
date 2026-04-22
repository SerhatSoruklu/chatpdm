# Phase 1 — Day 4

Response-State Mapping
Date: 2026-04-22
Time: [leave as placeholder if unknown]
Commit/Branch: [leave as placeholder if unknown]

---

## Scope

Map each public resolver response type to the locked Phase 1 `finalState` model and define when `reason` and `failedLayer` are required.

HTTP error envelopes are out of scope.

---

## Inputs

- docs/runtime/phase1/day1-inventory.md
- docs/runtime/phase1/day3-contract-spec.md
- docs/runtime/phase1/day4-finalstate-vocabulary.md

---

## 1. Global Rules

### Valid responses

- `finalState` must be `valid`.
- `reason` must be present and may be `null`.
- `failedLayer` must be present and may be `null`.
- `reason` and `failedLayer` must not be omitted.
- `validationState` must be explicit and must not be inferred from nested payloads.

### Refused responses

- `finalState` must be `refused`.
- `reason` must be present and must not be `null`.
- `failedLayer` must be present and must not be `null`.
- `validationState` must be explicit and must not be inferred from nested payloads.
- Refusal meaning must remain backend-owned.

---

## 2. Response-State Mapping Table

| response type | finalState | reason non-null required? | failedLayer non-null required? | notes |
| --- | --- | --- | --- | --- |
| `concept_match` | `valid` | no | no | Affirmative public concept response. |
| `comparison` | `valid` | no | no | Affirmative comparison response. |
| `rejected_concept` | `refused` | yes | yes | Explicit structural rejection. |
| `VOCABULARY_DETECTED` | `refused` | yes | yes | Vocabulary boundary refusal. |
| `no_exact_match` | `refused` | yes | yes | No exact public concept match. |
| `invalid_query` | `refused` | yes | yes | Query is not valid for public resolution. |
| `unsupported_query_type` | `refused` | yes | yes | Query shape is recognized but unsupported. |
| `ambiguous_match` | `refused` | yes | yes | Evidence gap at runtime, but contract-intent refusal in Phase 1. |

---

## 3. Evidence-Gap Note for `ambiguous_match`

- `ambiguous_match` remains an evidence gap in live runtime capture.
- The live route did not expose the branch in current authored tests.
- The contract mapping still assigns `refused` so the target contract remains complete even though runtime evidence is incomplete.

---

## 4. Day 3 Wording Updates Required to Keep the Contract Aligned

- `docs/runtime/phase1/day3-contract-spec.md` should be read as using `valid` wherever the positive response state is described.
- `resolved` is no longer the locked Phase 1 vocabulary; `valid` is the locked Phase 1 vocabulary.
- The Day 3 field rules already align with the locked state model if `valid` is read as the affirmative contract state.
- No further Day 3 structural changes are required for the mapping table itself.

---

## 5. Final Recommendation for Phase 1

- Use a binary state model: `valid` / `refused`.
- Keep `reason` and `failedLayer` explicit on every public response.
- Keep `ambiguous_match` as a contract-mapped refusal even though live evidence is incomplete.
- Do not introduce additional Phase 1 states.

---

## Day 4 Status

- [x] Response-state mapping defined
- [x] Global rules stated
- [x] Evidence-gap note included
- [x] Day 3 compatibility note included
- [x] Phase 1 recommendation recorded

Completion note:

- Every public resolver response maps to exactly one Phase 1 `finalState`
- `valid` and `refused` are the only Phase 1 states
- `reason` and `failedLayer` are always present and only non-null on `refused` responses
