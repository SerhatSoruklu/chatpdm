# Protocol-Grade Deterministic Constraint System

## Definition

A protocol-grade system is one where every decision is governed by explicit, versioned, auditable contracts, and where identical inputs always produce identical outputs with no hidden interpretation layer.

In ChatPDM terms, this means the military-constraints core evaluates admissibility under validated bundles, staged gates, typed refusal paths, and trace-only output.

The system does not "decide" in a human sense.
It evaluates admissibility against closed constraints.

---

## Core Properties

### 1. Determinism

Same:

- bundle
- facts
- precedence

Must always yield:

- identical decision
- identical reasonCode
- identical trace

No randomness.
No time-dependent behavior.
No implicit state.

---

### 2. Contract-Bound Execution

All behavior is defined by:

- schema-validated rule structures
- closed predicate language
- explicit authority graph
- versioned bundle artifacts

No runtime interpretation of prose.
No implicit rule construction.
No hidden fallback semantics.

---

### 3. Refusal-First Semantics

Default outcome:

`REFUSED`

If required facts are missing:

`REFUSED_INCOMPLETE`

`ALLOWED` is only reachable if:

- all required facts exist
- all constraints pass
- no higher-priority rule blocks execution

---

### 4. Closed World Assumption

The system only knows what is explicitly provided:

- no inference from missing data
- no assumption of intent
- no expansion beyond declared facts

Unknown means refusal, not approximation.

---

### 5. No Hidden Execution Layer

The system contains:

- no scripting
- no user-defined operators
- no plugin logic
- no dynamic rule injection

All behavior is statically defined and validated before runtime.
There is no runtime expansion path.

---

### 6. Explicit Authority Resolution

Authority is not inferred.

It is defined by:

- ordered authority levels
- explicit delegation edges

If authority cannot be resolved:

`REFUSED`

---

### 7. Canonical Bundle Integrity

Each bundle is:

- versioned and immutable
- canonically serialized
- cryptographically hashed

Derived fields are excluded from hashing.

If integrity cannot be proven:

`REFUSED`

---

### 8. Stage-Ordered Evaluation

Rules are evaluated in a fixed order.

For the military-constraints kernel, the concrete order is:

1. bundle integrity
2. contract validation
3. required fact completeness
4. legal floor
5. authority and caveats
6. policy overlay

Evaluation stops at the first failure.

---

### 9. Traceability

Every decision must include:

- rule trace
- authority trace
- failing rule IDs
- missing fact IDs
- bundle version and hash

No decision exists without a trace.

---

### 10. No Semantic Drift

The system does not:

- reinterpret rules
- merge sources implicitly
- adapt meaning over time

Changes require:

- new bundle version
- new hash
- new validation

---

## What This System Is Not

This system is not:

- a reasoning engine
- a strategy system
- a policy advisor
- a probabilistic model
- a natural language interpreter

It does not generate meaning.
It enforces constraints.

---

## Comparison

### Typical Systems

- allow partial matches
- tolerate missing data
- infer intent
- rely on runtime interpretation

### Protocol-Grade System

- rejects missing data
- rejects ambiguity
- rejects unresolved authority
- executes only validated contracts

---

## Failure Philosophy

The system must fail safely instead of drifting silently.

That means:

- refusal over approximation
- explicit error over silent fallback
- validation over assumption

---

## Acceptance Criteria

A system qualifies as protocol-grade only if:

- no decision is produced without full contract validation
- identical inputs always produce identical outputs
- all rules are schema-valid and semantically validated
- all authority references resolve explicitly
- all conflicts are detected before runtime
- no runtime behavior depends on prose or interpretation

---

## Summary

Protocol-grade is not about strength or performance.

It is about:

- explicitness
- determinism
- auditability
- refusal over ambiguity

The system does not try to be intelligent.
It tries to be correct.
