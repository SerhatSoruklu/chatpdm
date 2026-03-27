# Phase 6: Concept Authoring & Validation

## 1. Goal

Phase 6 exists to prove that ChatPDM can hold real concepts without structural collapse before runtime implementation begins.

This phase converts the existing architecture into authored concept artifacts. It does not broaden scope, add runtime behavior, or relax the deterministic boundary.

Phase 6 is successful only if authored concepts remain:

- structurally distinct
- consistent in voice and depth
- comparable to each other
- stable enough for later runtime resolution

## 2. Seed Concept Set

The initial Phase 6 batch is locked to exactly five concepts:

- `authority`
- `power`
- `legitimacy`
- `responsibility`
- `duty`

This set is chosen because it creates a strong structural test for the system.

Reasons:

- high explanatory value inside the v1 concept inventory
- high overlap risk between nearby concepts
- strong pressure on field separation, boundary clarity, and relation quality
- useful coverage across both relational and governance-adjacent concepts

This seed set is not chosen for popularity. It is chosen for stress value.

## 3. Authoring Packet

Each concept must be authored as a complete packet.

The minimum packet includes:

- `conceptId`
- `title`
- `shortDefinition`
- `coreMeaning`
- `fullDefinition`
- `contexts`
- `sources`
- `relatedConcepts`
- `aliases`
- `normalizedAliases`
- optional internal author notes

### Canonical authored fields

These fields are part of the authoritative concept source and are intended to inform later runtime output or runtime resolution:

- `conceptId`
- `title`
- `shortDefinition`
- `coreMeaning`
- `fullDefinition`
- `contexts`
- `sources`
- `relatedConcepts`
- `aliases`
- `normalizedAliases`

### Authoring-only fields

These fields are allowed during Phase 6 but are not part of the runtime product payload:

- internal author notes
- revision notes
- review outcomes
- unresolved overlap flags

### Scope metadata

Domain assignment is fixed by the v1 concept scope lock and must remain attached to the concept source artifact even though meaning authoring begins with the packet above.

The domain is not discovered during Phase 6. It is inherited from the published scope boundary.

## 4. Authoring Order

Concepts must be authored in this order:

1. `title`
2. `shortDefinition`
3. `coreMeaning`
4. `fullDefinition`
5. `contexts`
6. `sources`
7. `relatedConcepts`
8. `aliases`
9. `normalizedAliases`

Meaning must come before retrieval.

This ordering exists to prevent retrieval logic from shaping meaning prematurely. A concept must be structurally valid before alias coverage is expanded around it.

Implications:

- aliases must not be used to compensate for weak meaning
- normalized aliases must not be used to rescue concept ambiguity
- relation authoring must occur after the concept can stand alone

## 5. Validation Gates

Phase 6 uses four validation gates.

### Gate 1: Writing Standard

Checks:

- field separation
- tone control
- structural precision
- rule compliance for each field

Failure means:

- the concept is not ready for review
- the author must revise the concept against the writing standard before any comparative testing

### Gate 2: Review Checklist

Checks:

- pass or fail review across the published checklist
- minimality
- cross-concept consistency
- structural quality of sources, contexts, and relations

Failure means:

- the concept cannot enter the seed set unchanged
- all failed sections must be revised explicitly

### Gate 3: Overlap Stress Test

Checks:

- whether nearby concepts collapse into each other
- whether fields remain distinguishable under comparison
- whether one concept can absorb another without loss

Failure means:

- the concept pair is not stable enough for runtime use
- at least one concept must be revised, narrowed, or rejected

### Gate 4: System Fit

Checks:

- whether the concept increases explanatory power
- whether it connects coherently to the concept set
- whether it still belongs in the current v1 boundary

Failure means:

- the concept may be structurally valid in isolation but not justified in the system
- the concept should be revised or removed from the seed batch

## 6. Stop Condition

Phase 6 is complete only when all of the following are true:

- all 5 seed concepts are fully authored
- all 5 pass the review checklist
- critical concept pairs do not collapse under stress testing
- relatedConcepts are coherent across the batch
- aliases are clean, bounded, and non-rescuing
- the concept set feels like one system authored it

If any one of these conditions fails, Phase 6 remains open.

## 7. Output Artifacts

Phase 6 must produce the following outputs:

- 5 concept source files
- review notes for each concept
- pairwise stress-test notes for the required concept pairs
- revision notes where applicable

These artifacts are required because concept quality must be inspectable after authorship, not inferred later from runtime behavior.

## 8. What Comes After

Only after Phase 6 passes should Phase 7 begin.

Phase 7 is the minimal runtime resolver.

That phase must consume a stable authored concept set. It must not be used to compensate for incomplete concept writing, unresolved overlap, or weak alias discipline.
