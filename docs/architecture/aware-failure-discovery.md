# Aware Failure Discovery

**Type:** Internal Process  
**Scope:** System Development Only  
**Visibility:** Not user-facing

## Document Role

- Role: internal process/context note.
- Scope: observable failure discovery during normal interaction.
- Does not govern: runtime law, roadmap sequencing, or evidence truth.
- Related docs: [document-authority-index.md](../meta/document-authority-index.md), [failure-modes.md](./failure-modes.md), [concept-review-checklist.md](./concept-review-checklist.md).
- Precedence: process framing only; control docs override this file.

---

## Definition

Aware Failure Discovery is the identification of observable system inconsistencies during normal interaction without deliberate or structured testing.

## Purpose

To capture real-world failure signals as they naturally occur, ensuring that failure modes originate from observable behavior rather than hypothetical scenarios.

## Characteristics

- Occurs during normal system use
- Not triggered by intentional testing
- Driven by user or developer awareness
- Produces raw, unstructured failure observations

## Output

```text
Candidate Issue (Unverified)
```

A candidate issue is an unvalidated observation that may indicate a system failure.

## Process Flow

```text
Normal Interaction
-> Inconsistency Observed
-> Aware Failure Discovery
-> Candidate Issue
-> Integrity Check
-> Classification (REFINE / REJECT / LOCK)
```

## Rules

1. Discovery must originate from natural interaction, not forced testing.
2. All outputs are unverified until checked.
3. No candidate issue is promoted without integrity validation.
4. Discovery does not define; it only surfaces.

## Boundaries

Not this if:

- The issue is produced through deliberate testing
- The observation is hypothetical or imagined
- The behavior cannot be tied to an actual interaction
- The observation cannot be described in a concrete, observable form

## Relationship to System

Aware Failure Discovery feeds into:

- [failure-modes.md](./failure-modes.md)
- [concept-review-checklist.md](./concept-review-checklist.md)

It does not:

- create concepts
- define failure modes
- enforce system behavior

## Principle

Discovery is natural.  
Validation is deterministic.

## One Instruction

Do not expand this file unnecessarily.

> Keep it stable, minimal, and boring.
