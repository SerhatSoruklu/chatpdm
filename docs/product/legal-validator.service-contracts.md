# Legal Validator Service Contracts

## Purpose

This document defines the v1 service contracts for the Legal Argument Validator before any service logic is implemented.

It exists to prevent:

- service-boundary blur
- inconsistent failure ownership
- hidden persistence side effects
- non-deterministic orchestration

These contracts apply only to the validation path.

They do not define:

- governance editing flows
- UI behavior
- full business logic

## Shared Contract

All services in this document use the same contract shape:

- continue outcome:
  - the service returns normalized data for the next service
  - execution proceeds
- terminal outcome:
  - the service returns a terminal `result`
  - the service emits exactly one primary failure code
  - upstream services do not continue
  - `trace.service` still runs if the minimum `ValidationRun` prerequisites are available

Allowed terminal results in this path are:

- `invalid`
- `unresolved`

Only `validation-kernel.service` may produce terminal `valid`.

## doctrine-loader.service

### Purpose

Load the requested doctrine artifact, verify runtime eligibility, and produce the doctrine baseline required by all downstream services.

### Inputs

- `doctrineArtifactId` or equivalent artifact selector
- optional expected `doctrineHash`
- validation request context containing:
  - `matterId`
  - requested package context
  - resolver version

### Outputs

- continue outcome:
  - `doctrineArtifact`
  - `doctrineHash`
  - `packageId`
  - `version`
  - `manifest`
  - `interpretationRegime`
  - `runtimeEligible = true`
- terminal outcome:
  - `result`
  - `failureCode`
  - `reason`
  - any partial doctrine identity that can still be traced safely

### Allowed Failure Codes

- `DOCTRINE_NOT_RECOGNIZED`
- `INTERPRETATION_RULE_UNSPECIFIED`
- `DOCTRINE_HASH_MISMATCH`

### Persistence Side Effects

- none in the validation path

The service may read:

- `DoctrineArtifact`

The service may not write:

- `DoctrineArtifact`
- `ValidationRun`
- `Mapping`
- `OverrideRecord`

### Stop Conditions

- stop on any terminal outcome
- stop if governance status is not runtime-eligible
- stop if the doctrine artifact does not provide the interpretation regime required for downstream interpretation

## authority-registry.service

### Purpose

Resolve and validate authority candidates against doctrine scope, source class, institution, jurisdiction, and time boundaries.

### Inputs

- normalized request from `doctrine-loader.service`
- source-backed authority references, if any
- matter scope:
  - jurisdiction
  - practice area
  - evaluation date or period

### Outputs

- continue outcome:
  - `authorityCandidates`
  - `recognizedAuthorityIds`
  - scope-checked authority metadata
- terminal outcome:
  - `result`
  - `failureCode`
  - `reason`
  - any traced source reference that caused the stop

### Allowed Failure Codes

- `NO_SOURCE_AUTHORITY`
- `AUTHORITY_NOT_IDENTIFIABLE`
- `UNRECOGNIZED_SOURCE_INSTITUTION`
- `AUTHORITY_SCOPE_VIOLATION`

### Persistence Side Effects

- none in the validation path

The service may read:

- `AuthorityNode`
- `DoctrineArtifact`

The service may not write:

- `AuthorityNode`
- `ValidationRun`
- `Mapping`

### Stop Conditions

- stop on any terminal outcome
- stop when no source-identifiable authority remains available for the claim path under the active doctrine

## admissibility.service

### Purpose

Apply the admissibility gate to `ArgumentUnit` input before any deterministic mapping or validation path is allowed to proceed.

### Inputs

- `matterId`
- one or more `ArgumentUnit` records
- optional source-segment references

### Outputs

- continue outcome:
  - `eligibleArgumentUnits`
  - `blockedArgumentUnits`
  - admissibility summary
- terminal outcome:
  - `result`
  - `failureCode`
  - `reason`
  - the blocking `argumentUnitId` values

### Allowed Failure Codes

- `FACT_INPUT_NOT_ADMISSIBLE`
- `PENDING_REVIEW_BLOCK`

### Persistence Side Effects

- none in the validation path

The service may read:

- `ArgumentUnit`

The service may not write:

- `ArgumentUnit`
- `Mapping`
- `ValidationRun`

### Stop Conditions

- stop when any unit required for the requested validation path is `pending_review`
- stop when any required input remains blocked or evaluative rather than admissible structured input

## resolver.service

### Purpose

Produce deterministic concept and authority mappings from admissible argument units using only doctrine-authored rules and governed synonym paths.

### Inputs

- normalized request from `doctrine-loader.service`
- authority results from `authority-registry.service`
- admissibility-approved `ArgumentUnit` records
- doctrine mapping rules

### Outputs

- continue outcome:
  - normalized single-mapping success result:
    - `argumentUnitId`
    - `matterId`
    - `documentId`
    - `doctrineArtifactId`
    - `doctrineHash`
    - `mappingId`
    - `mappingStatus`
    - `matchBasis`
    - `mappingType`
    - `conceptId`
    - `authorityId`
    - `resolverRuleId`
    - `mappingWritten = true`
- terminal outcome:
  - `result`
  - `failureCode`
  - `reason`
  - partial mapping context that remains trace-safe:
    - `argumentUnitId`
    - `matterId`
    - `documentId`
    - `doctrineArtifactId`
    - `doctrineHash`
    - `mappingWritten = false`

### Allowed Failure Codes

- `RULE_NOT_DEFINED`
- `RULE_NOT_AUTHORED`
- `PRECEDENT_NOT_STRUCTURED`
- `ANALOGY_RULE_NOT_ENCODED`
- `CATEGORY_BOUNDARY_NOT_AUTHORED`
- `AMBIGUOUS_CONCEPT_MAPPING`
- `ATTRIBUTION_OVERREACH`
- `INTERPRETATION_OVERRIDE_ATTEMPT`
- `NON_DETERMINISTIC_SUCCESS_PATH`

### Persistence Side Effects

- may create or update `Mapping`

The service may read:

- `ArgumentUnit`
- `DoctrineArtifact`
- `AuthorityNode`
- `OverrideRecord` metadata only when a manual override path is explicitly requested

The service may write:

- `Mapping`

The service may not write:

- `ValidationRun`
- `DoctrineArtifact`
- `AuthorityNode`
- `ArgumentUnit`

### Stop Conditions

- stop on any terminal outcome
- stop when deterministic mapping cannot be completed under the authored doctrine
- stop when a requested success path would violate schema-level deterministic invariants

## validation-kernel.service

### Purpose

Apply structural, concept, authority, and completeness validation over resolver output and classify the final legal-validator result.

### Inputs

- normalized request from `doctrine-loader.service`
- authority summary from `authority-registry.service`
- admissibility summary from `admissibility.service`
- persisted or in-memory `Mapping` results from `resolver.service`

### Outputs

- continue outcome:
  - final `result`
  - `failureCodes`
  - `validationRuleIds`
  - kernel decision summary

There is no downstream continue service after classification except `trace.service`.

### Allowed Failure Codes

- `SOURCE_OVERRIDE_ATTEMPT`
- `INSUFFICIENT_DOCTRINE`
- `VALIDITY_EFFICACY_CONFUSION`
- `FACTUAL_LINKAGE_MISSING`
- `UNAUTHORIZED_DECISION_PATH`

### Persistence Side Effects

- none in the validation path

The service may read:

- `Mapping`
- `ArgumentUnit`
- `DoctrineArtifact`
- `AuthorityNode`

The service may not write:

- `ValidationRun`
- `Mapping`
- `DoctrineArtifact`
- `AuthorityNode`
- `ArgumentUnit`

### Stop Conditions

- classification is terminal for the domain path
- stop immediately when a kernel-owned `invalid` or `unresolved` condition is reached
- do not continue to any additional reasoning service after kernel classification

## trace.service

### Purpose

Assemble the deterministic trace, verify replay-critical invariants, and persist the final `ValidationRun`.

### Inputs

- terminal output from the previous domain service
- request envelope containing:
  - `matterId`
  - `resolverVersion`
  - `inputHash`
- doctrine identity:
  - `doctrineArtifactId`
  - `doctrineHash`
- trace contributions from upstream services:
  - `sourceAnchors`
  - `mappingRuleIds`
  - `validationRuleIds`
  - `interpretationUsed`
  - `interpretationRegimeId`
  - `manualOverrideUsed`
  - `overrideIds`
  - loaded manifest references

### Outputs

- final persisted `ValidationRun`
- replay/trace verification outcome

### Allowed Failure Codes

- `DOCTRINE_ARTIFACT_UNAVAILABLE`
- `REPLAY_ARTIFACT_MISMATCH`
- `TRACE_INCOMPLETE`

### Persistence Side Effects

- may create `ValidationRun`

The service may read:

- `DoctrineArtifact`
- `Mapping`
- `OverrideRecord`
- any upstream terminal context needed for trace assembly

The service may write:

- `ValidationRun`

The service may not write:

- `DoctrineArtifact`
- `AuthorityNode`
- `ArgumentUnit`
- `Mapping`
- `OverrideRecord`

### Stop Conditions

- trace finalization is always terminal
- stop and persist `invalid` if replay or trace integrity fails after a run has otherwise classified
- do not resume domain evaluation after trace finalization
