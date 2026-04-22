# Phase 1 — Day 3

Target Public Resolver Contract
Date: 2026-04-22
Time: 2026-04-22 16:07 BST
Commit/Branch: main @ 0c7f5df0cf37a7adf3704052e4e9743a70e58181

---

## Scope

Define the target public contract for resolver product responses only.

HTTP error envelopes are out of scope.

---

## Inputs

- docs/runtime/phase1/day1-inventory.md
- docs/runtime/phase1/day2-field-matrix.md
- docs/runtime/phase1/day2-gap-analysis.md

---

## 1. Top-Level Fields

| field | purpose | required / nullable / conditional | allowed value shape | notes |
| --- | --- | --- | --- | --- |
| `type` | Public response discriminator. | required | String enum: `concept_match`, `comparison`, `rejected_concept`, `VOCABULARY_DETECTED`, `no_exact_match`, `invalid_query`, `unsupported_query_type`, `ambiguous_match`. | Only top-level branch selector. `ambiguous_match` stays in the target surface even though it is still an evidence gap in runtime capture. |
| `finalState` | Explicit lifecycle outcome. | required | String enum: `valid`, `refused`. | This removes the Day 2 need to infer lifecycle from `type` or frontend state. |
| `reason` | Backend-owned explanation for the response. | required | String or `null`. | Always present. Required on refusal responses. May be `null` on valid responses. It must not be reconstructed by the frontend. |
| `failedLayer` | Explicit refusal stage or contract layer. | required | String or `null`. | Always present. Required on refusal responses. May be `null` on valid responses. The label is backend-owned. |
| `details` | Type-specific public payload. | required | Object. | Branch payload container. It must be present on every public response and must carry branch-specific meaning. |
| `traceId` | Correlation and support trace. | required | String. | Must be backend-authored and directly exposed. |
| `deterministicKey` | Stable response key for the current query + contract state. | required | String. | Must be reproducible for the same request and contract version. |
| `registryVersion` | Version of the active public concept registry. | required | String. | Current runtime evidence exposes `conceptSetVersion`; the contract target names that dependency explicitly as `registryVersion`. |
| `policyVersion` | Version of the resolver policy that produced the response. | required | String. | Versioning must be explicit at the public boundary. |
| `validationState` | Explicit validation outcome for the public response. | required | String enum: `fully_validated`, `blocked`, `not_applicable`. | This field is required even when the current runtime only proves nested validation state in `concept_match`. |
| `timestamp` | Response emission time. | required | ISO-8601 timestamp string. | Must be backend-authored. |

---

## 2. Contract Rules

### 2.1 Required fields on every public resolver response

- `type`
- `finalState`
- `reason`
- `failedLayer`
- `details`
- `traceId`
- `deterministicKey`
- `registryVersion`
- `policyVersion`
- `validationState`
- `timestamp`

### 2.2 Nullable fields on every public resolver response

- None are globally nullable.
- `reason` and `failedLayer` are always part of the top-level contract.
- `reason` and `failedLayer` may be `null` only when `finalState` is `valid`.
- `reason` and `failedLayer` must never be omitted from the response object.

### 2.3 Conditional fields and exact conditions

- `reason` is mandatory when `finalState` is `refused`.
- `failedLayer` is mandatory when `finalState` is `refused`.
- `details` is mandatory on every response and must be a non-null object.
- `validationState` is mandatory on every response and must not be inferred from nested detail payloads.
- `type` is always required and selects the public branch.

### 2.4 Allowed finalState vocabulary for Phase 1

- `valid`
- `refused`

### 2.5 Allowed validationState vocabulary for Phase 1

- `fully_validated`
- `blocked`
- `not_applicable`

### 2.6 When reason is mandatory

- `reason` is mandatory when the response is refused.
- `reason` may be null only when the response is valid.
- The frontend must not synthesize the primary refusal explanation from `message`, `interpretation`, or detail lookups.

### 2.7 When failedLayer is mandatory

- `failedLayer` is mandatory when the response is refused.
- `failedLayer` may be null only when the response is valid.
- The refusal layer must be exposed directly rather than inferred from nested refusal copy.

### 2.8 When details must exist

- `details` must exist on every public resolver response.
- `details` must never be null.
- `details` is the only place where branch-specific payload structure belongs.

### 2.9 Which current fields should remain branch-specific

- `interpretation`
- `message`
- `resolution`
- `answer`
- `comparison`
- `rejection`
- `vocabulary`
- `suggestions`
- `candidates`
- `mode`

### 2.10 Mapping table

| response type | finalState | validationState | reason required? | failedLayer required? |
| --- | --- | --- | --- | --- |
| `concept_match` | `valid` | `fully_validated` | no | no |
| `comparison` | `valid` | `fully_validated` | no | no |
| `rejected_concept` | `refused` | `blocked` | yes | yes |
| `VOCABULARY_DETECTED` | `refused` | `blocked` | yes | yes |
| `no_exact_match` | `refused` | `not_applicable` | yes | yes |
| `invalid_query` | `refused` | `not_applicable` | yes | yes |
| `unsupported_query_type` | `refused` | `not_applicable` | yes | yes |
| `ambiguous_match` | `refused` | `not_applicable` | yes | yes |

---

## 3. Contract Principles

- No implicit states.
- No frontend reconstruction of public response meaning.
- Explicit refusal signals must be present in the backend response.
- The public response must be traceable without merging multiple client-side signals.
- The top-level contract must be stable across public product response types.
- Branch-specific meaning belongs in the backend contract, not in UI synthesis.
- A response that cannot state its lifecycle, refusal stage, or validation outcome explicitly is not contract-complete.

---

## 4. Response Semantics Mapping

### Valid responses

- `concept_match` must carry `finalState: valid`.
- `comparison` must carry `finalState: valid`.
- `reason` may be null for valid responses.
- `failedLayer` may be null for valid responses.

### Refusal responses

- `rejected_concept` must carry `finalState: refused`.
- `VOCABULARY_DETECTED` must carry `finalState: refused`.
- `no_exact_match` must carry `finalState: refused`.
- `invalid_query` must carry `finalState: refused`.
- `unsupported_query_type` must carry `finalState: refused`.
- `ambiguous_match` is assigned `finalState: refused` and `validationState: not_applicable` in the target contract.
- The branch remains an evidence gap in live runtime capture, but not in contract intent.
- `reason` must be present on refusal responses.
- `failedLayer` must be present on refusal responses.

### Validation semantics

- `validationState` must be explicit on every public response.
- The target contract does not allow validation meaning to be inferred from nested payloads alone.
- The current nested `governanceState.validationState` observed in `concept_match` is evidence of the need for a top-level contract field, not a replacement for one.

### Trace semantics

- `traceId` must be present on every public response.
- `deterministicKey` must be present on every public response.
- `timestamp` must be present on every public response.
- Public responses must remain self-contained even when the frontend performs follow-up lookups.

---

## 5. Out-of-Scope Items for Phase 1

- HTTP error envelopes.
- Internal pipeline engine types.
- Concept detail route output.
- Frontend reconstruction state.
- UI-only labels and helper copy.
- Nested telemetry that does not participate in the public resolver contract.
- Any new top-level field outside the candidate set unless later justified by contract evidence.
- Any probabilistic or inferred meaning layer.

---

## Day 3 Status

- [x] Target public contract defined
- [x] Required fields and nullability rules defined
- [x] Response semantics mapped
- [x] Phase 1 enforcement target established

Completion note:

- `reason` and `failedLayer` are always present at the top level
- `ambiguous_match` is explicitly assigned `finalState: refused` and `validationState: not_applicable` in the target contract
