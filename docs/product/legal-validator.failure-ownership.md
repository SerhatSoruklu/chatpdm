# Legal Validator Failure Ownership

## Purpose

This document assigns each current failure code to exactly one primary owning service.

Secondary downstream propagation is allowed only when:

- the primary failure has already been emitted upstream
- a downstream service must preserve that code in trace or final result
- no downstream service reclassifies the code as if it owned it

## Ownership Rules

- every failure code has exactly one primary owner
- downstream services may propagate but may not originate another service's code
- if a new code cannot be assigned cleanly to one owner, implementation must stop until ownership is resolved

## Primary Ownership Map

| Failure code | Primary owner | Secondary propagation allowed | Notes |
| --- | --- | --- | --- |
| `DOCTRINE_NOT_RECOGNIZED` | `doctrine-loader.service` | `trace.service` | doctrine admission failure |
| `DOCTRINE_HASH_MISMATCH` | `doctrine-loader.service` | `trace.service` | requested doctrine identity and expected hash do not resolve to the same artifact |
| `INTERPRETATION_RULE_UNSPECIFIED` | `doctrine-loader.service` | `resolver.service`, `trace.service` | missing declared regime is a doctrine-load defect, not a resolver invention |
| `UNGOVERNED_DOCTRINE_CHANGE` | `doctrine-governance.service` | `trace.service` | governance-only origin outside the runtime validation path |
| `INTERPRETATION_REGIME_CHANGE_UNGOVERNED` | `doctrine-governance.service` | `trace.service` | governance-only origin outside the runtime validation path |
| `NO_SOURCE_AUTHORITY` | `authority-registry.service` | `validation-kernel.service`, `trace.service` | source-identification failure |
| `AUTHORITY_NOT_IDENTIFIABLE` | `authority-registry.service` | `trace.service` | implied source cannot be pinned down |
| `UNRECOGNIZED_SOURCE_INSTITUTION` | `authority-registry.service` | `validation-kernel.service`, `trace.service` | institution/source-class failure |
| `AUTHORITY_SCOPE_VIOLATION` | `authority-registry.service` | `validation-kernel.service`, `trace.service` | scope failure may be carried into final classification but not re-owned |
| `FACT_INPUT_NOT_ADMISSIBLE` | `admissibility.service` | `trace.service` | blocked before mapping because the input cannot enter deterministic admissibility |
| `PENDING_REVIEW_BLOCK` | `admissibility.service` | `trace.service` | blocked before mapping |
| `RULE_NOT_AUTHORED` | `resolver.service` | `trace.service` | doctrine has no authored rule path |
| `ANALOGY_RULE_NOT_ENCODED` | `resolver.service` | `trace.service` | analogy bridge missing |
| `CATEGORY_BOUNDARY_NOT_AUTHORED` | `resolver.service` | `trace.service` | concept boundary stretch attempt |
| `AMBIGUOUS_CONCEPT_MAPPING` | `resolver.service` | `validation-kernel.service`, `trace.service` | ambiguity originates in mapping even if final result is unresolved |
| `ATTRIBUTION_OVERREACH` | `resolver.service` | `validation-kernel.service`, `trace.service` | meaning expansion beyond allowed attribution |
| `INTERPRETATION_OVERRIDE_ATTEMPT` | `resolver.service` | `validation-kernel.service`, `trace.service` | undeclared method switching or reopening of fixed path |
| `NON_DETERMINISTIC_SUCCESS_PATH` | `resolver.service` | `trace.service` | success-path determinism failure belongs at mapping stage |
| `SOURCE_OVERRIDE_ATTEMPT` | `validation-kernel.service` | `trace.service` | substantive override of identified authority |
| `INSUFFICIENT_DOCTRINE` | `validation-kernel.service` | `trace.service` | doctrine insufficiency after doctrine load and mapping are otherwise legitimate |
| `VALIDITY_EFFICACY_CONFUSION` | `validation-kernel.service` | `trace.service` | argumentative misuse of efficacy against validity |
| `FACTUAL_LINKAGE_MISSING` | `validation-kernel.service` | `trace.service` | completeness failure in the validated argument path |
| `UNAUTHORIZED_DECISION_PATH` | `validation-kernel.service` | `trace.service` | adjudication-path breach |
| `DOCTRINE_ARTIFACT_UNAVAILABLE` | `trace.service` | none | replay/trace-only origin |
| `REPLAY_ARTIFACT_MISMATCH` | `trace.service` | none | replay/trace-only origin |
| `TRACE_INCOMPLETE` | `trace.service` | none | replay/trace-only origin |

## Ambiguous Ownership Requiring Resolution Before Implementation

### `INSUFFICIENT_DOCTRINE`

Current risk:

- it can be misused by `resolver.service` for interpretation failures that actually belong to declared-regime or mapping ambiguity defects

Required resolution:

- `resolver.service` must not emit `INSUFFICIENT_DOCTRINE`
- use:
  - `INTERPRETATION_RULE_UNSPECIFIED`
  - `ANALOGY_RULE_NOT_ENCODED`
  - `AMBIGUOUS_CONCEPT_MAPPING`
  - `ATTRIBUTION_OVERREACH`
- reserve `INSUFFICIENT_DOCTRINE` for `validation-kernel.service` when the doctrine is validly loaded but still cannot complete the required legal validation

### `AUTHORITY_SCOPE_VIOLATION`

Current risk:

- both `authority-registry.service` and `validation-kernel.service` could detect scope defects

Required resolution:

- `authority-registry.service` is the only originator
- `validation-kernel.service` may propagate the code if the violation is discovered only after authority material is assembled, but it must still treat authority registry as the primary owner

### `FACTUAL_LINKAGE_MISSING`

Current risk:

- some missing-support cases look like admissibility defects while others are completeness defects

Required resolution:

- `admissibility.service` owns only:
  - `FACT_INPUT_NOT_ADMISSIBLE`
  - `PENDING_REVIEW_BLOCK`
- `validation-kernel.service` owns `FACTUAL_LINKAGE_MISSING` once the inputs have already crossed the admissibility gate

### Manual override approval ownership

Current risk:

- `overrideId` is now explicit in `Mapping`, but `override.service` is not yet part of the contracted v1 runtime services

Required resolution:

- before service implementation begins, decide whether:
  - override approval is checked inside `resolver.service`, or
  - a dedicated `override.service` is added to the validation path

Until that is resolved:

- no service may treat `matchBasis = manual_override` as success without an approved linked `OverrideRecord`

### `DOCTRINE_ARTIFACT_UNAVAILABLE`

Current risk:

- fresh validation and replay have different data availability conditions

Required resolution:

- treat `DOCTRINE_ARTIFACT_UNAVAILABLE` as a replay/trace-origin code only
- a fresh validation request that cannot load doctrine at all should fail under `DOCTRINE_NOT_RECOGNIZED` or another doctrine-loader-owned code, not under replay failure ownership

### Governance-only doctrine change codes

Current risk:

- runtime services can overclaim governance causality when they only observe identity or hash mismatch

Required resolution:

- `doctrine-loader.service` must not emit:
  - `UNGOVERNED_DOCTRINE_CHANGE`
  - `INTERPRETATION_REGIME_CHANGE_UNGOVERNED`
- reserve those codes for governance or promotion flows
- use `DOCTRINE_HASH_MISMATCH` when the runtime loader can prove only identity/hash inconsistency
