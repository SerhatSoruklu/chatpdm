# Constraint Contract Drift Template

## Purpose

Use this template to run drift detection and regression analysis on a ChatPDM concept or concept family against previously approved snapshots and constraint contracts.

This template is not for re-validation.

It is for consistency-over-time auditing against the approved baseline.

Companion controls:

- [constraint-contract-checklist.md](./constraint-contract-checklist.md)
- [constraint-contract-audit-template.md](./constraint-contract-audit-template.md)
- [constraint-contract-repair-template.md](./constraint-contract-repair-template.md)

## Template

```text
Task
You are performing drift detection and regression analysis on ChatPDM concepts using previously approved snapshots and constraint contracts.

Your goal is to detect:

- semantic drift
- boundary erosion
- overlap reintroduction
- runtime misalignment
- silent contract degradation

This is NOT a validation pass.
This is a consistency-over-time audit.

---

Input

You are given:

1. Target concept or family:
   {{TARGET_CONCEPT_OR_FAMILY}}

2. Current state:

- concept definitions
- constraint contracts
- runtime behavior
- comparison logic (if applicable)

3. Baseline state (snapshot authority):

- frozen relationship snapshots
- previously approved contract structure
- prior audit results (if available)

---

Constraints

- Do NOT re-evaluate from scratch
- Do NOT redefine concepts
- Do NOT suggest improvements unless drift is detected
- You MUST compare current vs baseline
- You MUST treat snapshot as authority over meaning relationships
- You MUST assume drift can be subtle

---

Drift Detection Layers

You MUST check all:

1. Definition Drift

- has meaning shifted?
- has wording introduced ambiguity?
- has scope expanded or compressed?

2. Boundary Drift

- are exclusions still enforced?
- are concepts still non-overlapping?
- has any concept started absorbing another?

3. Relation Drift

- are relationships identical to snapshot?
- has directionality changed?
- has any relation become symmetric when it should not?

4. Runtime Drift

- does resolver behavior still match contract?
- are outcomes still deterministic?
- has any fallback logic appeared?

5. Admission Drift

- are live / visible_only / rejected states unchanged?
- is any non-live concept leaking into runtime?

6. Failure Handling Drift

- are structural failures still handled consistently?
- are any failure types missing or downgraded?

---

Output Format

Return EXACTLY this structure:

---

1. Drift Summary

Return ONE:

- NO_DRIFT
- MINOR_DRIFT
- STRUCTURAL_DRIFT
- CRITICAL_DRIFT

---

2. Drift Findings

List each detected drift:

- [TYPE: definition/boundary/relation/runtime/admission/failure]
  description of drift
  where it appears (file/layer if inferable)
  why it matters

---

3. Snapshot Consistency

Return:

- CONSISTENT
- PARTIAL
- BROKEN

Explain in max 3 lines.

---

4. Risk Assessment

Return ONE:

- stable
- fragile
- degrading
- at risk of collapse

Explain briefly.

---

5. Required Actions

If NO_DRIFT:

- return: none

If drift exists:

- list minimal corrective actions

- action 1

- action 2

- ...

---

6. Enforcement Priority

Rank urgency:

- LOW
- MEDIUM
- HIGH
- CRITICAL

---

Evaluation

PASS if:

- compares against baseline, not theory
- identifies subtle drift
- avoids unnecessary changes when stable

FAIL if:

- redefines concepts
- ignores snapshot authority
- stays vague or overly general
- suggests improvements without detecting drift
```
