# Phase 6 Pairwise Stress Testing

## Purpose

Pairwise stress testing exists to detect conceptual collapse before runtime implementation begins.

ChatPDM depends on structurally distinct concepts. If nearby concepts can be swapped, merged, or confused without loss, the authored system is not ready.

Collapse risk matters because ChatPDM does not rely on generative recovery. If concepts overlap weakly, runtime matching will inherit that weakness directly.

## Required Critical Pairs

The following pairs are mandatory in Phase 6:

- `authority` vs `power`
- `authority` vs `legitimacy`
- `responsibility` vs `duty`
- `power` vs `legitimacy`

These pairs must be tested even if the individual concepts pass standalone review.

## Required Tests

### 1. Collapse Test

Question:

- Can one concept be substituted for the other without materially changing the authored meaning?

Failure looks like:

- both concepts can share the same `shortDefinition`
- both concepts rely on the same core mechanism
- one concept absorbs the explanatory role of the other

If failure occurs:

- tighten boundaries in `shortDefinition`
- strengthen mechanism separation in `coreMeaning`
- narrow or revise contexts and relations

### 2. Swap Test

Question:

- If the titles are swapped, do the rest of the authored fields still mostly read as valid?

Failure looks like:

- most of the concept packet survives a title swap
- the distinction depends on labels rather than structure
- the relation graph still works after the swap

If failure occurs:

- rewrite the concept-specific constraints
- remove generic wording
- revise fields that remain valid under both labels

### 3. Boundary Test

Question:

- What does Concept A exclude that Concept B allows, and what does Concept B exclude that Concept A allows?

Failure looks like:

- no clear exclusion line exists
- the difference is only rhetorical or stylistic
- boundaries depend on examples rather than structure

If failure occurs:

- sharpen exclusion language in `fullDefinition`
- revise contexts to reflect distinct constraints
- reject one concept if strict separation cannot be maintained

### 4. Mechanism Test

Question:

- What internal mechanism makes each concept function as itself rather than as the nearby concept?

Failure looks like:

- both concepts are explained through the same mechanism
- one concept depends on the other without clear independence
- `coreMeaning` fields describe effects rather than governing logic

If failure occurs:

- rewrite `coreMeaning`
- revise `fullDefinition` to expose structural logic
- re-check whether both concepts belong in the same seed batch

## Required Review Discipline

For each critical pair:

- run all four tests
- record failures explicitly
- record which concept changed, if any
- re-run the pair after revision

No pair is considered stable until it passes all required tests.

## Decision Rule

If a critical pair still collapses after revision, Phase 6 is not complete.

The correct response is not runtime compensation. The correct response is further revision, narrowing, or rejection at the concept level.
