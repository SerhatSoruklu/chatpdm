# ChatPDM Mental Model

## Overview

This document defines the current architectural mental model of ChatPDM.

It is not descriptive prose.  
It is a structural lens used to:

- reason about system behavior
- detect imbalance or drift
- guide future architectural decisions
- evaluate new features and concepts

## Document Role

- Role: architectural mental-model note.
- Scope: structural lens for reasoning about system behavior.
- Does not govern: runtime law, roadmap sequencing, or evidence artifacts.
- Related docs: [document-authority-index.md](../meta/document-authority-index.md), [../../SOVEREIGN_CORE_ARCHITECTURE.md](../../SOVEREIGN_CORE_ARCHITECTURE.md), [../../KERNEL_INTEGRITY.md](../../KERNEL_INTEGRITY.md).
- Precedence: mental model only; control docs override this file.

---

## Core Distribution

The system is currently understood as:

Hierarchy / Constraints=35%  
Safety / Hardening=25%  
Structure/Loader=20%  
Runtime Behavior=12%  
Context=8%  

---

## Layer Definitions

### 1. Hierarchy / Constraints (35%)

Defines what is structurally possible and enforces the ordering of truth and authority within the system.

Includes:

- concept contracts
- structural profiles
- admission state (live / visible_only / rejected)
- invariant enforcement
- relation constraints

Role:

- ontology and authority core
- prevents drift and overlap
- defines system truth boundaries

---

### 2. Safety / Hardening (25%)

Prevents structural collapse and invalid states.

Includes:

- overlap admission gate
- frozen relationship snapshots
- refusal-first enforcement
- drift detection
- regression checks

Role:

- system protection layer
- ensures concepts survive pressure
- blocks invalid or unsafe configurations

---

### 3. Structure / Loader (20%)

Controls system boot and admission.

Includes:

- concept-loader
- contract validation
- admission firewall
- snapshot enforcement at load-time

Role:

- gatekeeper of the live system
- ensures only valid, approved structures enter runtime

Note:
This layer is currently highly coupled and carries multiple responsibilities.

---

### 4. Runtime Behavior (12%)

Executes deterministic resolution.

Includes:

- resolver
- response-type mapping
- runtime state assignment
- single-outcome enforcement

Role:

- produces final system outputs
- enforces deterministic behavior

Constraint:

- same input -> same output
- no blended results
- no fallback guessing

---

### 5. Context (8%)

Routes and shapes query handling without altering truth.

Includes:

- query-shape classification
- governance scope enforcement
- comparison allowlisting
- admission-state checks

Role:

- selects relevant constraints
- determines response path
- controls access, not meaning

Note:
This layer is intentionally thin and must never override or reinterpret constraints.

---

## System Flow

Concept Packets + Contracts + Snapshots
↓
Structure / Loader (validation + admission)
↓
Live Concept Set
↓
Context Layer (query classification + scope)
↓
Runtime Behavior (resolver)
↓
Single Deterministic Output

---

## Core Principles

- Constraints are not a feature. Constraints are the system.
- No layer may bypass a higher-order constraint or safety mechanism.
- No single concept is allowed to absorb the system.
- Systems collapse when a single layer or concept absorbs responsibilities beyond its boundary.
- Ambiguity spreads across the system; explicitness isolates it.
- Real systems get simpler as you understand them.
- Refusal is part of correctness, not failure.
- Context does not change truth; it selects relevance.

---

## Interpretation Rules

- The percentages represent **current structural dominance**, not permanent truth.
- This model must be **re-audited as the system evolves**.
- If one layer grows disproportionately, it must be investigated.

---

## Known Pressure Points

- Context layer is thinner than intended
- Runtime uses response-type abstraction more than contract execution
- Loader carries multiple responsibilities (coupling risk)
- Comparison logic not fully derived from contracts/snapshots
- Pre-admission pipeline not fully executable yet

---

## Usage

Use this model to:

- evaluate new features
- audit architectural changes
- detect concept drift
- guide constraint design
- validate system balance

Do NOT use this model as ideology.  
Use it as a diagnostic tool.

---

## Summary

ChatPDM is:

- constraint-led
- hardening-heavy
- loader-centered
- runtime-bounded
- context-light
