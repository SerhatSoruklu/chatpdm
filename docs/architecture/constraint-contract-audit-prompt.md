# Constraint Contract Audit Prompt

## Purpose

Use this prompt to run a strict, adversarial validation audit of a concept or concept family in ChatPDM against the Constraint Contract Checklist.

This prompt is not for explanation.

It is for admission and runtime safety judgment.

Companion control:

- [constraint-contract-checklist.md](./constraint-contract-checklist.md)

## Prompt

```text
Task
You are performing a strict, adversarial validation audit of a concept (or concept family) in ChatPDM using the Constraint Contract Checklist.

Your job is NOT to explain the concept.
Your job is to determine whether the concept is safe for admission and runtime use.

You must evaluate the concept against ALL checklist phases and return a PASS / FAIL per phase with precise failure reasons.

---

Scope

Run this audit on:

{{TARGET_CONCEPT_OR_FAMILY}}

Examples:

- single: law
- family: authority / power / legitimacy
- family: duty / responsibility / violation

---

Constraints

- Do NOT summarize the concept unless required for validation
- Do NOT soften failures
- Do NOT say "mostly correct" without identifying exact gaps
- Do NOT skip any phase
- Do NOT assume correctness from prose quality
- You MUST treat this as a production admission gate
- You MUST separate:
  - structural correctness
  - runtime behavior
  - boundary integrity

---

Checklist Phases

You MUST evaluate ALL phases:

1. Definition Integrity
2. Structural Contract
3. Boundary Enforcement
4. Family Pressure Test (if applicable)
5. Runtime Safety
6. Admission State Integrity
7. Snapshot & Drift Control
8. Pre-Admission Path (if non-live)
9. Structural Failure Coverage

---

Evaluation Rules

For EACH phase:

- Return:
  - PASS or FAIL
- If FAIL:
  - specify EXACT reason
  - specify WHAT is missing or incorrect
  - specify WHICH file/layer likely contains the issue (if inferable)

---

Output Format

Return EXACTLY this structure:

1. Phase Results

Definition Integrity: PASS/FAIL
Reason:

Structural Contract: PASS/FAIL
Reason:

Boundary Enforcement: PASS/FAIL
Reason:

Family Pressure Test: PASS/FAIL (or N/A if single concept)
Reason:

Runtime Safety: PASS/FAIL
Reason:

Admission State Integrity: PASS/FAIL
Reason:

Snapshot & Drift Control: PASS/FAIL
Reason:

Pre-Admission Path: PASS/FAIL (or N/A if live concept)
Reason:

Structural Failure Coverage: PASS/FAIL
Reason:

---

2. Critical Failures

List ONLY failures that block admission.

- failure 1
- failure 2
- ...

---

3. Drift Risk Assessment

State whether the concept is:

- stable
- fragile
- at risk of collapse

Explain WHY in 2-4 lines max.

---

4. Admission Verdict

Return ONE:

- ADMIT
- BLOCK
- CONDITIONAL (only if fixable with specific changes)

---

5. Required Fixes

If not ADMIT:

List minimal, precise fixes required to pass.

- fix 1
- fix 2
- ...

---

Evaluation

PASS if:

- every phase is evaluated
- failures are concrete and structural
- verdict is decisive

FAIL if:

- vague language
- missing phases
- softened judgment
- philosophical discussion instead of system validation
```
