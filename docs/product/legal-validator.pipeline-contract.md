# Legal Validator Pipeline Contract

## Purpose

This document defines the deterministic execution order, persistence rights, hard-stop rules, and `ValidationRun` prerequisites for the Legal Argument Validator v1 kernel path.

It exists to prevent:

- orchestration drift
- duplicate writes
- undocumented terminal behavior
- service-boundary confusion

## Pre-Validation Input Preparation

Deterministic source-document intake, segmentation, and source-anchor generation happen before the validation path begins.

This pre-validation preparation may produce:

- `SourceDocument`
- `SourceSegment`
- generated `sourceAnchors`
- deterministic `ArgumentUnit` records extracted from the segmented source document
- `ArgumentUnit.sourceSegmentIds`

It is input preparation, not part of the locked validation service order below.

## Validation Path Order

The v1 service execution order is fixed as:

1. `admissibility.service`
2. `doctrine-loader.service`
3. `authority-registry.service`
4. `resolver.service`
5. `validation-kernel.service`
6. `trace.service`

This order is part of the contract.

No service may be skipped or reordered without updating this document first.

## Execution Rules

### Rule 1. Admissibility gates the rest of the path

- no argument unit may enter deterministic mapping or kernel validation before `admissibility.service` returns a continue outcome
- `pending_review` and `blocked` input are terminal for the domain path

### Rule 2. Doctrine must be loaded before authority or mapping

- no authority lookup or mapping may occur before `doctrine-loader.service` returns a runtime-eligible doctrine artifact

### Rule 3. Authority resolution precedes mapping

- `resolver.service` may not invent authority identity, source class, or scope decisions that belong to `authority-registry.service`

### Rule 4. Mapping precedes kernel classification

- `validation-kernel.service` consumes authored mappings and may not create substitute mappings itself

### Rule 5. Trace finalization is always last

- `trace.service` is the only service that may create `ValidationRun`
- once `trace.service` begins finalization, no upstream service may resume domain evaluation
- in this wave, `trace.service` may run after a valid kernel continue outcome or after a terminal resolver/kernel stop when trace and replay prerequisites are satisfied

## Persistence Rights

### doctrine-loader.service

May read:

- `DoctrineArtifact`

May write:

- nothing in the validation path

### authority-registry.service

May read:

- `AuthorityNode`
- `DoctrineArtifact`

May write:

- nothing in the validation path

### admissibility.service

May read:

- `ArgumentUnit`

May write:

- nothing in the validation path

### resolver.service

May read:

- `ArgumentUnit`
- `AuthorityNode`
- `DoctrineArtifact`
- `OverrideRecord` metadata if a manual override path is explicitly requested

May write:

- `Mapping`

May not write:

- `ValidationRun`
- `DoctrineArtifact`
- `AuthorityNode`
- `ArgumentUnit`

### validation-kernel.service

May read:

- `Mapping`
- `ArgumentUnit`
- `AuthorityNode`
- `DoctrineArtifact`

May write:

- nothing in the validation path

### trace.service

May read:

- `DoctrineArtifact`
- `Mapping`
- `OverrideRecord`
- normalized upstream traceable context from the reached path

May write:

- `ValidationRun`

May not write:

- `Mapping`
- `DoctrineArtifact`
- `AuthorityNode`
- `ArgumentUnit`
- `OverrideRecord`

## Hard-Stop Rules

### On `invalid`

- the domain path stops immediately at the service that owns the failure
- no downstream domain evaluation may continue after an `invalid` result
- `trace.service` may still finalize and persist the stopped run if trace and replay requirements are satisfied

### On `unresolved`

- the domain path stops immediately at the service that owns the unresolved condition
- unresolved does not permit fallback interpretation, alternate mapping, or retry inside the same run
- `trace.service` may still finalize and persist the stopped run if trace and replay requirements are satisfied

### On `valid`

- only `validation-kernel.service` may classify `valid`
- `trace.service` must still finalize and persist the run

## ValidationRun Prerequisites

`trace.service` may create `ValidationRun` only when all of the following are available for the reached path:

- `matterId`
- `doctrineArtifactId`
- `doctrineHash`
- `resolverVersion`
- `inputHash`
- final `result`
- `failureCodes` matching the upstream stopping stage
- trace payload containing:
  - `sourceAnchors`
  - `loadedManifest`
  - `interpretationUsed`
  - `manualOverrideUsed`

Conditional requirements:

- if resolver wrote `Mapping`, trace must carry resolver-derived `mappingRuleIds`
- if `validation-kernel.service` participated, trace must carry kernel-derived `validationRuleIds`
- if `interpretationUsed = true`, `trace.interpretationRegimeId` is required
- if `manualOverrideUsed = true`, `trace.overrideIds` is required
- trace must not be structurally empty for the reached path

## ValidationRun Creation Rule

If the prerequisites above are not available:

- `trace.service` must not fabricate them
- the pipeline must surface the appropriate trace or replay failure

## Fresh Validation vs Replay

Current runtime proof in this wave covers:

- retained-artifact availability checks
- doctrine-hash integrity checks
- deterministic forward-path behavior from generated source anchors
- replay re-execution against preserved upstream state for retained runs
- explicit refusal when preserved replay state diverges or cannot be reconstructed

### Fresh validation

- the doctrine artifact must already be resolved by `doctrine-loader.service`
- `trace.service` uses that resolved identity to persist the run

### Replay

- replay re-executes from the preserved `ValidationRun`, retained doctrine artifact, stored source anchors, and replay context
- replay must load the exact retained doctrine artifact referenced by the original run
- replay must compare the re-executed result against the recorded run and refuse on mismatch
- if the preserved upstream state cannot be reconstructed, replay must fail explicitly rather than guessing
- if that artifact cannot be retrieved, `trace.service` owns the terminal failure under `DOCTRINE_ARTIFACT_UNAVAILABLE`

## Non-Resumable Rule

Once any service emits a terminal result for the domain path:

- no later domain evaluation service may execute
- no earlier service may be re-entered within the same run
- `trace.service` may only finalize the already-classified run; it may not alter the domain result
- any retry requires a new validation request and a new `ValidationRun`
