# Phase 1 - Day 7

Week 1 Baseline Lock
Date: 2026-04-22
Time: 2026-04-22 16:07 BST
Commit/Branch: main @ 0c7f5df0cf37a7adf3704052e4e9743a70e58181

---

## Scope

Lock the Week 1 Phase 1 evidence and contract baseline.

HTTP error envelopes are out of scope.

---

## Inputs

- docs/runtime/phase1/day1-inventory.md
- docs/runtime/phase1/day2-field-matrix.md
- docs/runtime/phase1/day2-gap-analysis.md
- docs/runtime/phase1/day3-contract-spec.md
- docs/runtime/phase1/day4-finalstate-vocabulary.md
- docs/runtime/phase1/day4-response-state-mapping.md
- docs/runtime/phase1/day5-refusal-contract.md
- docs/runtime/phase1/day5-refusal-mismatches.md
- docs/runtime/phase1/day6-deterministic-key-spec.md
- docs/runtime/phase1/day6-deterministic-key-implementation-path.md

---

## 1. Week 1 Baseline Lock

The following artifacts are the Week 1 baseline:

- Day 1 public resolver inventory
- Day 2 field matrix
- Day 2 gap analysis
- Day 3 target public resolver contract
- Day 4 finalState vocabulary lock
- Day 4 response-state mapping
- Day 5 refusal contract
- Day 5 refusal mismatches
- Day 6 deterministic key spec
- Day 6 deterministic key implementation path

Week 1 locked outputs:

- public response inventory
- current field variability evidence
- target contract surface
- binary finalState model
- refusal contract shape
- deterministic key strategy

---

## 2. Unresolved Contradictions Summary

### 1. True Contradictions

- No material Week 1 contradictions remain between the design docs after the Day 3, Day 4, Day 5, and Day 6 alignment.
- There is no remaining conflict between the locked `valid` / `refused` state model and the refusal contract, deterministic key spec, or baseline inventory.

### 2. Wording Drift

- Day 4 still mentions `resolved` only as historical context for the pre-lock label that became `valid`.
- Day 6 treats `policyVersion` as a bounded Phase 1 substitution using the existing resolver contract/version source; that is deliberate wording, not a competing model.
- Day 6 separates `deterministicKey` from `traceId`; that distinction is now explicit and stable.
- The duplicate Day 5 section naming was cleaned up, so no lingering naming drift remains there.

### 3. Evidence Gaps

- `ambiguous_match` remains an evidence gap in live runtime capture.
- The current live route still does not expose `ambiguous_match` on the authored input path.
- The code-mapped `ambiguous_match` branch is contract-mapped but still runtime-unproven on the live route.

### 4. Acceptable Temporary Substitutions

- `policyVersion` is satisfied in Phase 1 by the existing resolver contract/version source because no separate policy-version source exists yet.
- That substitution is bounded and documented; it is acceptable for the Week 1 baseline lock.
- `resolved` survives only as historical wording in Day 4 compatibility notes and is acceptable because Day 3 and Day 4 now both use `valid` / `refused` as the active model.

### 5. Must-Resolve Before Week 2 Implementation

- The target top-level refusal fields must be implemented in the runtime response shape.
- The target top-level deterministic fields must be implemented in the runtime response shape.
- The refusal contract must be expressed directly in public responses rather than reconstructed by the frontend.
- The binary `valid` / `refused` state model must remain the only Week 1 contract state model.
- The Week 2 implementation pass must not reintroduce alternate public state vocabulary or branch-shaped refusal meaning.

### 6. Safe to Carry Forward As-Is

- Day 1 inventory
- Day 2 matrix and gap analysis
- Day 3 contract spec
- Day 4 finalState model and response-state mapping
- Day 5 refusal contract and mismatch documentation
- Day 6 deterministic key contract and minimal implementation path
- Day 7 baseline closure note

---

## 3. No Phase 2 Leakage

Week 1 does not introduce:

- registry authority redesign
- Phase 2 admission logic
- Phase 3 invariance work
- telemetry-driven governance feedback
- frontend redesign beyond contract consumption analysis
- branch-specific semantic expansion beyond the locked contract docs
- validator-version expansion
- exposure-version expansion

---

## 4. Week 1 Closure

- Week 1 is now closed as a documentation baseline.
- Week 2 work should consume the locked contract docs, not reopen Week 1 state-model decisions.
- Remaining work is implementation and enforcement, not more Week 1 discovery.

---

## Day 7 Status

- [x] Week 1 baseline artifacts locked
- [x] Remaining contradictions summarized
- [x] Wording drift separated from real contradictions
- [x] Phase 2 leakage excluded
- [x] Week 1 closure recorded

Completion note:

- Week 1 Phase 1 baseline is locked
- The only remaining open live-evidence gap is `ambiguous_match`
- Week 1 is locked with wording fixes already applied to remove stale `resolved` language and clarify deterministic key semantics
