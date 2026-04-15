# Constraint Contract Checklist

## Purpose

This checklist defines the minimum structural requirements for a concept to be:

- authored
- validated
- admitted into the live kernel

It enforces:

- deterministic boundaries
- zero overlap drift
- runtime safety
- family consistency

A concept that fails any hard check must not be admitted.

Companion prompt:

- [constraint-contract-audit-prompt.md](./constraint-contract-audit-prompt.md)

## Phase 1. Definition Integrity

### Required

- [ ] Short definition exists and is one sentence and non-circular
- [ ] Core meaning exists and states a clear functional role
- [ ] Full definition exists and gives a structural explanation
- [ ] Definitions are non-overlapping with all live concepts
- [ ] Definitions do not rely on synonyms as explanation

### Fail if

- [ ] Uses another concept as definition, such as `duty is responsibility`
- [ ] Blends multiple concepts into one
- [ ] Changes meaning across registers

## Phase 2. Structural Contract

### Required

- [ ] Admission constraints are defined
- [ ] Exclusion constraints are defined
- [ ] Relation constraints are defined
- [ ] Resolution constraints are defined
- [ ] Invariants are explicitly listed

### Must Answer

- [ ] What makes this concept valid?
- [ ] What makes this concept invalid?
- [ ] What can it not be confused with?
- [ ] What relations are allowed?
- [ ] What relations are forbidden?

### Fail if

- [ ] Any constraint is missing
- [ ] Constraints are vague or descriptive only
- [ ] No hard boundaries exist

## Phase 3. Boundary Enforcement

### Required

- [ ] Pairwise exclusion tests are written against all live concepts
- [ ] Overlap admission gate passes
- [ ] No semantic collision appears in comparator output
- [ ] Concept cannot absorb another concept

### Must Prove

- [ ] `concept != every other live concept`

### Fail if

- [ ] Any overlap is unresolved
- [ ] Any relation collapses into equivalence
- [ ] Concept expands to explain everything

## Phase 4. Family Pressure Test

### Required

- [ ] Concept is placed in the correct family, if applicable
- [ ] Concept is tested against sibling concepts under pressure scenarios
- [ ] Temporal order, if any, is defined and stable
- [ ] Functional roles do not collapse under composition

### Families

- `authority / power / legitimacy`
- `duty / responsibility / violation`

### Must Prove

- [ ] Survives interaction with related concepts

### Fail if

- [ ] Roles blur under interaction
- [ ] Sequence becomes ambiguous
- [ ] Concepts become interchangeable

## Phase 5. Runtime Safety

### Required

- [ ] Resolver can classify the concept deterministically
- [ ] Produces exactly one outcome
- [ ] No ambiguous match behavior
- [ ] No fallback guessing

### Outcome set

- `allowed`
- `invalid`
- `conflict`
- `refused`

### Must Prove

- [ ] `same input -> same output`

### Fail if

- [ ] Multiple outcomes are possible
- [ ] Interpretation is required at runtime
- [ ] Result depends on hidden context

## Phase 6. Admission State Integrity

### Required

- [ ] Concept is correctly classified as `live`, `visible_only`, or `rejected`
- [ ] Non-live concepts are refused correctly
- [ ] No leakage into runtime matching exists

### Fail if

- [ ] `visible_only` resolves as live
- [ ] `rejected` concepts produce answers
- [ ] Admission state is ignored

## Phase 7. Snapshot and Drift Control

### Required

- [ ] Relationship snapshot is created
- [ ] Snapshot is approved and frozen
- [ ] Regression tests exist
- [ ] Overlap gate re-check passes

### Must Prove

- [ ] Future changes cannot silently alter meaning

### Fail if

- [ ] Snapshot is missing
- [ ] Snapshot is not enforced
- [ ] Regression coverage is not present

## Phase 8. Pre-Admission Path

### Required

- [ ] Contract is fully authored
- [ ] Synthetic profile is generated
- [ ] Overlap report is generated
- [ ] Family test is completed
- [ ] Promotion criteria are defined

### Applies to

- `obligation`
- `enforcement`
- future concepts

### Fail if

- [ ] Concept is promoted without passing the full pipeline

## Phase 9. Structural Failure Coverage

### Required

Concept must explicitly define handling for:

- `invariant_breach`
- `ontological_impossibility`
- `contract_incomplete`
- `unsupported_relation`
- `non_live_concept`

### Fail if

- [ ] Failure states are implicit
- [ ] Failure handling is inconsistent

## Phase 10. Final Admission Gate

### Must pass all

- [ ] Definition Integrity
- [ ] Structural Contract
- [ ] Boundary Enforcement
- [ ] Family Pressure Test
- [ ] Runtime Safety
- [ ] Admission State Integrity
- [ ] Snapshot and Drift Control

### Final rule

If any layer fails, the concept is not admitted.

## Core Enforcement Laws

- Constraints are not a feature. Constraints are the system.
- Refusal is part of correctness.
- No concept is allowed to absorb the system.
- Ambiguity must be rejected, not resolved.
- Family pressure is the approval boundary.
- Snapshots are the authority on stability.

## Markdown Authoring

Contract markdown files MUST keep blank lines around headings and tables so markdownlint rules such as `MD022` and `MD058` do not recur.

When authoring a new contract document:

- add one blank line after each heading
- add one blank line before and after each table
- keep tables and headings visually separated from surrounding paragraphs
- keep contract prose in block form, not run together with headings
