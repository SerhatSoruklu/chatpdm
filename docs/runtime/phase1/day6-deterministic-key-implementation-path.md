# Phase 1 — Day 6

Deterministic Key Implementation Path
Date: 2026-04-22
Time: [leave as placeholder if unknown]
Commit/Branch: [leave as placeholder if unknown]

---

## Scope

Describe the minimal implementation path for Phase 1 deterministic key generation.

HTTP error envelopes are out of scope.

---

## Inputs

- docs/runtime/phase1/day3-contract-spec.md
- docs/runtime/phase1/day4-finalstate-vocabulary.md
- docs/runtime/phase1/day4-response-state-mapping.md
- docs/runtime/phase1/day5-refusal-contract.md
- docs/runtime/phase1/day6-deterministic-key-spec.md

---

## 1. Minimal Implementation Path

### Where `inputHash` should come from

- `inputHash` should come from the normalized resolver input used for contract evaluation.
- In the current resolver shape, that means the normalized query text after resolver normalization in `backend/src/modules/concepts/resolver.js`.
- `inputHash` should be derived once from the normalized input before branch-specific payload assembly.
- `inputHash` should not be derived from any branch-specific top-level payload field.

### Where `registryVersion` should come from

- `registryVersion` should come from the current concept-set version source already used by the resolver.
- In the current code shape, that is the same version source currently exposed as `conceptSetVersion` in `backend/src/modules/concepts/resolver.js` and validated in `backend/src/lib/product-response-validator.js`.
- For Phase 1, no new registry subsystem is needed.

### Where `policyVersion` should come from

- `policyVersion` should come from the current resolver contract/version source already available in the resolver.
- In the current code shape, the minimal source is the existing `CONTRACT_VERSION` constant in `backend/src/modules/concepts/constants.js`.
- For Phase 1, this is a bounded substitution because no separate policy-version source exists yet.
- For Phase 1, do not introduce a new policy-version subsystem.

### Where `deterministicKey` should be assembled

- `deterministicKey` should be assembled in the resolver layer, not in the frontend.
- In the current code shape, the minimal assembly point is `backend/src/modules/concepts/resolver.js`, at the point where the base response is created and before branch-specific response objects are returned.
- The assembled key should then be attached to the public response object so every branch inherits the same deterministic trace anchor.

### Deterministic key vs trace ID

- `deterministicKey` is the reproducible contract key for equivalent requests.
- `traceId` is the support/debug trace anchor and may vary between requests.
- The implementation path must not merge those roles.

---

## 2. Minimal Generation Sequence

1. Normalize the incoming query using the resolver’s existing normalization path.
2. Derive `inputHash` from the normalized resolver input used for contract evaluation.
3. Read `registryVersion` from the current concept-set version source.
4. Read `policyVersion` from the current resolver contract/version source.
5. Assemble `deterministicKey` from `inputHash`, `registryVersion`, and `policyVersion` in a fixed canonical order.
6. Attach `deterministicKey` to the public response object before branch-specific return paths complete.

---

## 3. What Not to Include in Phase 1

- `validatorVersion`
- `exposureVersion`
- telemetry inputs
- nested `deterministicKey` objects
- branch-specific payload hashing
- raw unnormalized user input
- frontend reconstruction state
- extra correlation layers

Phase 1 should keep the deterministic strategy strictly bounded to the approved public contract inputs.

---

## 4. Risks of Overbuilding at This Stage

- Adding more version fields increases drift without improving Phase 1 contract lock.
- Introducing nested objects makes the public key harder to audit and compare.
- Hashing branch-specific payloads would make the key less stable across contract-preserving changes.
- Using raw user input would make the key sensitive to presentation noise that the resolver already normalizes away.
- Moving key assembly outside the resolver layer would shift contract truth into the client or an auxiliary layer.
- Expanding the key surface now would push Phase 1 into later-phase architecture before the minimal deterministic contract is locked.

---

## 5. Implementation Summary

- `inputHash` comes from normalized resolver input.
- `registryVersion` comes from the current concept-set version source.
- `policyVersion` comes from the current resolver contract/version source.
- `deterministicKey` is assembled in the resolver layer and attached to the public response before return.
- Phase 1 keeps `deterministicKey` string-only and opaque.

---

## Day 6 Status

- [x] Minimal implementation path defined
- [x] Input sources identified
- [x] Generation sequence stated
- [x] Out-of-scope items listed
- [x] Overbuilding risks recorded

Completion note:

- Phase 1 deterministicKey remains string-only
- Phase 1 deterministicKey assembly belongs in the resolver layer
