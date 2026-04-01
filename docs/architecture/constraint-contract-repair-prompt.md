# Constraint Contract Repair Prompt

## Purpose

Use this prompt to run a targeted structural repair of a concept or concept family in ChatPDM after a Constraint Contract audit has identified specific failures.

This prompt is not for rewriting.

It is for surgical correction of failing structural layers only.

Companion controls:

- [constraint-contract-checklist.md](./constraint-contract-checklist.md)
- [constraint-contract-audit-prompt.md](./constraint-contract-audit-prompt.md)

## Prompt

```text
Task
You are performing a targeted structural repair of a ChatPDM concept (or concept family) based on a prior Constraint Contract audit.

Your goal is to fix ONLY the failing parts without introducing drift, overlap, or new ambiguity.

This is NOT a rewrite.
This is a surgical correction pass.

---

Input

You are given:

1. Target concept or family:
   {{TARGET_CONCEPT_OR_FAMILY}}

2. Audit results from Prompt 3:
   {{PASTE_FULL_AUDIT_OUTPUT}}

---

Constraints

- Do NOT rewrite working sections
- Do NOT expand scope
- Do NOT introduce new concepts
- Do NOT weaken constraints
- Do NOT generalize language
- Do NOT fix by adding vague explanations

You MUST:

- preserve all PASS phases
- fix ONLY FAIL phases
- maintain deterministic boundaries
- maintain non-overlapping definitions
- maintain runtime safety guarantees

---

Repair Rules

For EACH failure:

1. Identify exact layer:

   - definition
   - contract
   - boundary
   - runtime
   - admission state
   - snapshot
   - failure handling

2. Apply minimal structural fix:

   - tighten wording
   - add missing constraint
   - remove overlap
   - enforce invariant
   - clarify relation boundary

3. Ensure:

   - no new ambiguity introduced
   - no concept expansion occurs
   - no hidden synonym substitution

---

Required Fix Types

You may ONLY use these operations:

- DEFINE (add missing definition element)
- CONSTRAIN (add or tighten rule)
- SEPARATE (remove overlap between concepts)
- RESTRICT (block invalid relation or usage)
- ALIGN (match runtime behavior to contract)
- COMPLETE (fill missing structural requirement)

---

Output Format

Return EXACTLY this structure:

---

1. Fix Summary

List all fixes applied:

- [TYPE] short description
- [TYPE] short description
- ...

---

2. Updated Sections ONLY

Return ONLY the modified parts.

Format:

[SECTION: name]

OLD: <original content>

NEW: <corrected content>

---

3. Invariant Check

Confirm ALL:

- no overlap introduced
- no meaning drift
- no new ambiguity
- no concept expansion
- deterministic boundaries preserved

Return:

PASS / FAIL

If FAIL:
state exact issue

---

4. Regression Risk

State if the fix introduces risk to:

- family relationships
- runtime behavior
- snapshot stability

Return:

- none
- low
- medium
- high

Explain in max 3 lines.

---

5. Re-Admission Verdict

After fixes, return ONE:

- ADMIT
- CONDITIONAL
- BLOCK

---

Evaluation

PASS if:

- fixes are minimal and precise
- no unrelated changes made
- system integrity preserved

FAIL if:

- large rewrites appear
- new ambiguity introduced
- boundaries weakened
- fixes are vague or descriptive instead of structural
```
