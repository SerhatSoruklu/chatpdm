# Signal Placement Laws

This document defines how and where signals are allowed to exist in the system.

Signals exist to reduce uncertainty, not to increase visibility volume.

---

## Core Law

Signals must be placed at uncertainty boundaries.

A signal is valid only if it resolves a point where the system could otherwise be incorrect without detection.

---

## Definition: Uncertainty Boundary

An uncertainty boundary is any point where:

- system state changes
- truth is derived or recomputed
- external input is accepted
- verification occurs
- a decision is finalized

---

## Allowed Signal Layers

### 1. Truth Signals

Truth signals prove internal correctness.

Examples:

- replay verification result
- canonicalization output
- chain integrity status

---

### 2. Detection Signals

Detection signals expose failure when it occurs.

Examples:

- verification failure
- checkpoint invalid
- bundle mismatch

---

### 3. Operator Signals

Operator signals provide clear, human-readable system state.

Examples:

- `verification: valid`
- `chain intact through sequence X`
- `checkpoint verified`

---

## Rejection Rule

A signal must not be added if:

- it does not resolve a specific uncertainty
- it duplicates an existing signal
- it exists only for reassurance
- its absence would not create blindness

---

## Non-Goals

- Signals are not for debugging convenience
- Signals are not for visual richness
- Signals are not for redundancy without purpose

---

## Invariant

If a failure can occur silently, a signal must exist.

If a failure is already observable, no additional signal is required.

---

## Summary

Signals are placed where the system could otherwise lie by omission.

All other signals are noise.

---

## Implementation Discipline

If you feel the urge to add a signal, check this document before writing code.

A signal must justify its existence against these laws before it is introduced.
