# Phase 1 — Day 4

FinalState Vocabulary Lock
Date: 2026-04-22
Time: [leave as placeholder if unknown]
Commit/Branch: [leave as placeholder if unknown]

---

## Scope

Lock the Phase 1 `finalState` vocabulary for public resolver responses only.

HTTP error envelopes are out of scope.

---

## Inputs

- docs/runtime/phase1/day1-inventory.md
- docs/runtime/phase1/day2-field-matrix.md
- docs/runtime/phase1/day2-gap-analysis.md
- docs/runtime/phase1/day3-contract-spec.md

---

## 1. Chosen FinalState Vocabulary for Phase 1

- `valid`
- `refused`

This is the complete Phase 1 `finalState` vocabulary.

---

## 2. Rationale for Included States

### `valid`

- Included because Phase 1 has two public response branches that are affirmative and contract-admitted: `concept_match` and `comparison`.
- Included because Day 2 evidence shows the current contract surface needs one explicit state for outputs that pass the public contract boundary without refusal semantics.
- Included because it is tighter than `resolved` for contract-lock purposes and aligns with contract validation language already present in the Phase 1 draft.

### `refused`

- Included because Day 1 and Day 2 evidence show multiple public response types are non-admitted or refusal-like: `rejected_concept`, `VOCABULARY_DETECTED`, `no_exact_match`, `invalid_query`, `unsupported_query_type`, and the evidenced-but-not-runtime-captured `ambiguous_match`.
- Included because refusal behavior is already a first-class public outcome in the current resolver surface and must be explicit in the contract model.
- Included because it cleanly separates affirmative public outputs from rejected or unavailable ones.

---

## 3. Rationale for Excluded States

### `partial`

- Excluded because Day 1 and Day 2 did not establish a stable public branch that consistently behaves as a partial public response.
- Excluded because the current public surface already has explicit refusal and affirmative outputs; introducing `partial` would add a third state without runtime-backed necessity.
- Excluded because it would invite semantic drift before enforcement exists.

### `degraded`

- Excluded because Day 1 and Day 2 did not show a stable public branch that needs a degraded contract state.
- Excluded because degraded behavior is currently handled through branch-specific payload differences and frontend reconstruction, not through a first-class public state.
- Excluded because adding it now would invent semantics beyond the current public behavior evidence.

---

## 4. Mapping Table

| response type | finalState |
| --- | --- |
| `concept_match` | `valid` |
| `comparison` | `valid` |
| `rejected_concept` | `refused` |
| `VOCABULARY_DETECTED` | `refused` |
| `no_exact_match` | `refused` |
| `invalid_query` | `refused` |
| `unsupported_query_type` | `refused` |
| `ambiguous_match` | `refused` |

---

## 5. Compatibility Note with Day 3 Contract Wording

- Day 3 used `resolved` / `refused` as draft wording for the same binary distinction.
- Day 4 locks the Phase 1 contract vocabulary as `valid` / `refused`.
- Wherever Day 3 said `resolved`, read that as the pre-lock label for `valid`.
- The structural contract rules from Day 3 remain in place; only the positive-state label changes.

---

## 6. Final Recommendation for Phase 1 State Model

- Use a binary public state model: `valid` / `refused`.
- Do not introduce `partial` or `degraded` in Phase 1.
- Treat every public resolver response as one of these two states.
- Keep runtime evidence gaps separate from contract intent for `ambiguous_match`.

---

## Day 4 Status

- [x] FinalState vocabulary chosen
- [x] Included states justified
- [x] Excluded states justified
- [x] Day 3 compatibility note added
- [x] Phase 1 state model recommendation recorded

Completion note:

- Phase 1 finalState vocabulary is locked as `valid` / `refused`
- `partial` and `degraded` are excluded from Phase 1
