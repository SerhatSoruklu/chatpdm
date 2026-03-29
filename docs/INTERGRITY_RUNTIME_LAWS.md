# Integrity Runtime Laws

This document defines the non-negotiable runtime laws governing deterministic truth, refusal behavior, contract shape, and integrity recording.

These laws are binding.
Violation of any law invalidates integrity.

---

## 1. Canonical Truth Object

The hashed truth object must contain only canonical truth-bearing fields.

Dynamic or environment-derived fields are strictly forbidden.

The canonical truth object must produce identical hashes for identical authored truth behavior.

---

## 2. Refusal Boundary

Near-miss or non-authored input must fail closed.

No fuzzy matching, normalization, or best-guess logic is permitted.

Refusal is a valid deterministic outcome when authored.

---

## 3. Contract Shape Integrity

Integrity evaluation includes both semantic behavior and contract shape.

Missing fields, extra fields, type drift, or unversioned changes invalidate integrity.

---

## 4. Atomic Integrity Recording

Integrity results may be recorded only after a complete, successful run.

Partial or interrupted runs must not produce canonical ledger entries.

---

## 5. Deterministic Genesis

The integrity chain must begin from a deterministic, explicitly defined genesis state.

previousHash must be null for the genesis entry.

The genesis entry must not depend on runtime environment or incidental state.