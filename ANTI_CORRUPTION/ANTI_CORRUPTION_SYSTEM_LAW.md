# SYSTEM LAW — ANTI-CORRUPTION CONTRACT

## Purpose

This system exists to preserve truth integrity under all conditions.

All components — schema, validators, relations, and runtime — must align.
No layer is allowed to contradict another.

Truth must not drift.
Truth must not be misrepresented.
Truth must not be simulated.

---

## Integrity Kernel

The system is governed by a non-bypassable invariant layer:

- schema constraints
- relation law
- boundary law
- validator enforcement

This layer is absolute.

No developer, runtime process, or interface may override it.

If a state violates the kernel:

→ it must be rejected from existence

---

## Core Principle

A state is valid only if it is:

- structurally complete
- semantically correct
- relationally consistent
- validator-approved

Anything else is not truth.

---

## System Invariants

### 1. No Silent Meaning Change

- Meaning cannot change without:
  - explicit modification
  - version acknowledgement
  - validator re-approval

- Rewording must not:
  - soften boundaries
  - introduce ambiguity
  - collapse concepts

---

### 2. Schema Integrity is Mandatory

- All V3 concepts must satisfy required slots
- Missing required structure = invalid concept

- Recommended slots may warn but must not alter correctness classification

- Text alone is not sufficient for truth
- Structure defines validity

---

### 3. Relation Law is Binding

- Concepts must be valid individually and in relation

- Authored relation packets are the primary source of truth
- Fallback relations are:
  - temporary
  - explicit
  - traceable

- No implicit or inferred relations are allowed

- Invalid relations produce:
  - enforcementStatus = blocked
  - systemValidationState = law_blocked

---

### 4. Boundary Separation Must Hold

The following must never collapse:

- Duty ↔ Responsibility
- Authority ↔ Power
- Authority ↔ Legitimacy
- Power ↔ Legitimacy

If collapse is detected:

- validator must flag deterministically
- system must not treat collapsed concepts as valid

---

### 5. Validator Authority is Final

- The validator defines:
  - validity
  - invalidity
  - structural completeness
  - relational correctness

- No layer may override validator output:
  - not UI
  - not runtime
  - not developer intent

---

### 6. Runtime Must Obey Validation

- Runtime must consume:
  - enforcementStatus
  - systemValidationState
  - v3Status

- If a concept is:
  - law_blocked → must not be usable or actionable
  - structurally_incomplete → must be explicitly marked degraded

- Runtime must not:
  - present invalid states as valid
  - suppress validator outcomes

---

### 7. No Synthetic Truth

- Fallback mechanisms must be:
  - explicit
  - traceable
  - reported

- Fallback must never:
  - silently replace authored truth
  - be presented as canonical truth

- In strict mode:
  - fallback is disallowed

---

### 8. No Silent Degradation

- Missing structure, relations, or enforcement must not degrade silently

- Any degradation must:
  - produce warnings or failures
  - be visible in validation output
  - be traceable

---

### 9. No AI-Derived Truth Injection

- AI-generated content may be:
  - proposed
  - drafted

- It must never:
  - bypass schema validation
  - bypass relation law
  - be accepted without validator approval

---

### 10. Fail Safe Over Flexibility

When uncertainty exists:

- reject
- warn
- require explicit definition

Never:

- guess
- auto-correct meaning
- silently adapt

---

### 11. Enforcement Over Appearance

The system must prioritize:

- correctness over usability
- enforcement over convenience
- integrity over completeness

If a state is invalid:

- it must not appear valid
- even if this reduces usability

---

## Trace Requirement

Every decision must be reconstructable.

The system must provide:

- validation trace
- relation validation trace
- enforcement decision trace

If a decision cannot be traced:

→ it is not valid

---

## Change Classification

All changes must be classified as:

- structural (schema or relations)
- semantic (meaning)
- textual (expression only)

Semantic changes require:

- explicit justification
- validator re-approval
- version acknowledgement

---

## Enforcement Model

The system enforces truth through:

- schema validation (V3)
- relation law validation
- boundary enforcement
- enforcementStatus propagation

Invalid states must result in:

- validation failure
- or enforcementStatus = blocked

No invalid state may pass silently.

---

## System Identity

This system is not:

- a content system
- a generative system
- a flexible interpretation layer

This system is:

- a constrained truth engine
- a deterministic validation system
- a law-governed architecture

---

## Final Rule

If a change improves usability but weakens truth integrity:

Reject it.
