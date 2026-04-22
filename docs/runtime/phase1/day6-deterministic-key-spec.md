# Phase 1 - Day 6

Deterministic Key Spec
Date: 2026-04-22
Time: 2026-04-22 16:07 BST
Commit/Branch: main @ 0c7f5df0cf37a7adf3704052e4e9743a70e58181

---

## Scope

Define the Phase 1 deterministic key strategy for public resolver responses only.

HTTP error envelopes are out of scope.

---

## Inputs

- docs/runtime/phase1/day3-contract-spec.md
- docs/runtime/phase1/day4-finalstate-vocabulary.md
- docs/runtime/phase1/day4-response-state-mapping.md
- docs/runtime/phase1/day5-refusal-contract.md

---

## 1. Deterministic Contract Fields

### Public fields

- `deterministicKey`
- `registryVersion`
- `policyVersion`

For Phase 1, `policyVersion` is satisfied by the existing resolver contract/version source because no separate policy-version source exists yet. This is a bounded substitution, not a claim that contract version and policy version are semantically identical.

### Internal derivation input

- `inputHash`

`inputHash` is part of the deterministic derivation strategy, not the public response shape.

---

## 2. deterministicKey Form for Phase 1

- `deterministicKey` is a string-only public field.
- `deterministicKey` must not be a nested object in Phase 1.
- `deterministicKey` must remain opaque at the public contract boundary.
- `deterministicKey` must be stable for the same normalized input and the same version inputs.

Phase 1 form:

- `deterministicKey: string`

---

## 3. Deterministic Key vs Trace ID

- `deterministicKey` is a reproducible contract key for the same normalized input and the same version inputs.
- `traceId` is a trace anchor for debugging and support.
- `traceId` may vary between requests.
- `deterministicKey` must not vary between equivalent requests unless one of its approved inputs changes.

---

## 4. deterministicKey Input Set

The Phase 1 deterministic key must be derived from:

- `inputHash`
- `registryVersion`
- `policyVersion`

No other inputs belong in the Phase 1 deterministic key strategy.

---

## 5. inputHash Definition

- `inputHash` is derived from the normalized resolver input used for contract evaluation.
- `inputHash` must not be derived from raw user input.
- `inputHash` must reflect the contract-relevant resolver input after normalization.
- `inputHash` must exclude presentation noise such as spacing or casing differences that are already normalized by the resolver.

Phase 1 inputHash scope:

- normalized query text used by the resolver route
- contract-evaluation input after resolver normalization

Phase 1 inputHash exclusions:

- raw unnormalized user input
- frontend display formatting
- branch-specific UI reconstruction

---

## 6. Inclusion / Exclusion Rationale

### Included

- `deterministicKey` is included because the public contract needs an auditable stable anchor for a contract-equivalent public response.
- `registryVersion` is included because the meaning of the response depends on the active registry version.
- `policyVersion` is included because the meaning of the response depends on the active resolver policy version. In Phase 1, the existing resolver contract/version source satisfies this field as a bounded substitution.
- `inputHash` is included as the minimal internal input anchor for determinism.

### Excluded

- A nested deterministic object is excluded because Phase 1 should stay string-only and minimal.
- Raw user input is excluded because it introduces presentation noise that does not belong in a contract key.
- Additional derivation inputs are excluded because they widen the key surface beyond what Phase 1 needs.
- Public exposure of `inputHash` is excluded because the key itself is the public trace anchor, not the derivation input.

---

## 7. Phase 1 Invariants for deterministicKey

- The same normalized resolver input with the same `registryVersion` and `policyVersion` must produce the same `deterministicKey`.
- Any change to `inputHash`, `registryVersion`, or `policyVersion` must change the resulting `deterministicKey`.
- `deterministicKey` must not depend on frontend reconstruction.
- `deterministicKey` must not depend on raw input formatting.
- `deterministicKey` must be suitable for logging, audit comparison, and response traceability.
- `deterministicKey` must remain compatible with the Day 3 public contract field list.

---

## 8. Out-of-Scope Items for Later Phases

- Exact hash algorithm selection.
- Nested deterministic metadata object.
- Public exposure of `inputHash`.
- Cross-request correlation layers beyond the Phase 1 deterministic key.
- Cache key design beyond the Phase 1 public contract.
- Any additional derivation inputs not listed in this spec.
- Any UI-facing interpretation of the deterministic key.

---

## 9. Non-Inputs

The Phase 1 deterministic key must not be derived from:

- `finalState`
- `reason`
- `failedLayer`
- `details`
- branch-specific payload fields
- user-facing message text

---

## 10. Deterministic Combination Rule

- The deterministic key must be derived from a canonical ordered combination of `inputHash`, `registryVersion`, and `policyVersion`.
- Input order must be fixed and stable.
- Equivalent inputs must not produce different keys because of ordering differences.

---

## Day 6 Status

- [x] Deterministic contract fields identified
- [x] deterministicKey form locked as string-only
- [x] input set bounded to approved Phase 1 inputs
- [x] inputHash definition scoped to normalized resolver input
- [x] Out-of-scope items listed

Completion note:

- Phase 1 deterministicKey is a string-only public field
- Phase 1 deterministicKey derivation uses `inputHash`, `registryVersion`, and `policyVersion`
