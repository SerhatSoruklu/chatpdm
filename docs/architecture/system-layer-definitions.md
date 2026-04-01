# ChatPDM System Layer Definitions

ChatPDM is organized into strict layers. Each layer has a defined role and must not leak into others.

---

## 1. Governance Structure Layer (Core)

Purpose:
Defines stable, non-overlapping primitives that model governance reality.

Allowed:

- law
- authority
- power
- duty
- responsibility
- legitimacy

Properties:

- deterministic
- non-circular
- non-overlapping
- no execution logic
- no context-specific naming

Forbidden:

- execution/process concepts (for example `enforcement`)
- compressed or composite concepts (for example `liability`, `obligation`)
- communication-layer terms (for example `claim`)
- derived concepts that can be fully computed from admitted primitives (for example `violation`)

Rule:
If a concept can be expressed as a combination of existing primitives, it must not exist in this layer.

---

## 2. Rejection Layer (Structural Refusal)

Purpose:
Explicitly records concepts that were evaluated and rejected.

Examples:

- obligation
- enforcement
- claim
- liability
- jurisdiction

Properties:

- first-class system state
- not treated as missing or unknown
- returned via governed refusal

Behavior:

- queries resolve to "Structurally rejected"
- no fallback explanation
- no partial mapping

Rule:
Rejected concepts must never leak into runtime or influence resolution.

---

## 3. Projection Layer (Human Language Interface)

Purpose:
Maps human language to system primitives without changing system truth.

Examples:

- "liable" -> responsibility + duty-failure context
- "jurisdiction" -> authority + law constraints
- "claim" -> input/assertion layer

Properties:

- flexible
- non-authoritative
- may be ambiguous
- not part of core reasoning

Rule:
Projection must not introduce new primitives or override core structure.

---

## 4. Resolution Layer (Deterministic Engine)

Purpose:
Processes queries and returns structured outcomes.

Outputs:

- resolved concept
- governed refusal (rejected)
- unsupported query

Properties:

- deterministic
- bounded by admitted concepts
- refusal-first when mismatch occurs

Rule:
If a query cannot be mapped cleanly to a core concept, it must refuse.

---

## 5. Runtime Boundary Layer (Scope Enforcement)

Purpose:
Controls where the system is allowed to operate.

Examples:

- domain limits
- concept availability
- scope enforcement rules

Properties:

- operates outside concept meaning
- enforces boundaries, not definitions

Rule:
Scope is not a concept. It is a control mechanism.

### Governance Boundary Rule

ChatPDM models governance-bound structures only.

Pre-governance interaction constructs stay outside the ontology unless they are explicitly anchored to governance structure, especially `law` or `duty`.

Examples:

- `commitment`
- `promise`
- `undertaking`
- unanchored `breach`

Boundary effect:

- recognized vocabulary does not imply ontology admission
- unanchored interaction terms must refuse as out-of-scope rather than pressure primitive expansion
- only governance-anchored formulations may continue into deterministic derived or refusal handling

---

## Derived Concept Rule

A concept that can be fully computed from other primitives must not exist as a primitive.

It must instead:

- be classified as derived
- remain excluded from runtime matching
- stay inspectable only through visible-only or detail-backed surfaces

Canonical example:

- `violation` is derived from duty evaluation and therefore remains visible-only rather than live

---

## System Integrity Rules

1. No cross-layer leakage
   - governance concepts must not include execution or communication logic

2. No silent expansion
   - new concepts require explicit admission

3. No ambiguity tolerance
   - ambiguity must result in refusal, not approximation

4. Rejection is a valid outcome
   - rejection is not failure, it is structural correctness

5. Structure over language
   - human terms do not define system truth
