# POLICY_AUDIT_PHASE_A.md

Manual policy-to-system audit layer for ChatPDM.

This document defines Phase A only.

Phase A is a manual audit process.

Phase A does not:

- implement validators
- implement automation
- rewrite policy content broadly
- infer system mappings without evidence

## 1. Purpose

Phase A exists to map every policy sentence to a real platform behavior, boundary, or absence of behavior.

Policy text is treated as declared platform contract.

If a policy sentence cannot be mapped to real behavior, it is not safe.

## 2. Audit Scope

Phase A applies to:

- `policies/privacy.md`
- `policies/terms.md`
- `policies/cookies.md`

## 3. Approved Claim Classes

Use only these claim classes:

- `stores`
- `does_not_store`
- `allows`
- `does_not_allow`
- `enforces`
- `refuses`
- `retains`
- `does_not_retain`
- `shares`
- `does_not_share`

If a sentence does not fit one of these classes, rewrite it or remove it later.

## 4. Canonical Audit Table

Use this exact table format:

| Policy File | Section | Claim Text | Claim Class | System Mapping | Status | Notes |
|-------------|---------|------------|-------------|----------------|--------|-------|

## 5. Column Meaning

### 5.1 Policy File

Use one of:

- `privacy.md`
- `terms.md`
- `cookies.md`

### 5.2 Section

Use the exact section title or card title where the sentence appears.

### 5.3 Claim Text

Use the exact sentence from the policy.

If one sentence contains multiple ideas, split it before audit entry.

### 5.4 Claim Class

Use one approved claim class only.

### 5.5 System Mapping

Map the claim to a real platform behavior, boundary, configuration, route, integration, or absence of behavior.

Do not invent mappings.

### 5.6 Status

Use only:

- `mapped`
- `unmapped`
- `unclear`
- `conflicts_with_system`

### 5.7 Notes

Keep notes short.

Use notes for:

- evidence hints
- ambiguity explanation
- conflict explanation

### 5.8 Mapping Granularity Rule

System Mapping must reference a concrete implementation element where possible, such as:

- database collection or field
- backend route or middleware
- authentication or authorization logic
- third-party integration
- runtime classification or refusal logic
- logging or analytics configuration

Do not use abstract mappings such as `system behavior` without specifying the component.

## 6. Phase A Audit Rules

### 6.1 Sentence Coverage Rule

Every policy sentence must appear in the audit table.

### 6.2 Sentence Split Rule

If a sentence contains more than one idea, split it before auditing.

One audit row must represent one bounded claim.

### 6.3 Mapping Rule

Every sentence must map to:

- a real platform behavior
- a real platform boundary
- a real absence of behavior

If none of these exist, the claim is not safe.

### 6.4 Classification Rule

If a sentence cannot be classified with an approved claim class, clarify it before later phases.

### 6.5 Status Rule

Only `mapped` claims are safe.

Use `unmapped` when no real system mapping exists.

Use `unclear` when the sentence is too ambiguous to classify or map safely.

Use `conflicts_with_system` when the policy sentence appears false relative to real implementation.

### 6.6 Negative Coverage Rule

Where a section describes a behavior, the audit must also check for the corresponding non-behavior.

Example:

- if a claim states what the platform stores
- the audit should verify whether a corresponding `does_not_store` claim is required for clarity

Missing negative coverage should be marked as `unclear`.

### 6.7 Duplicate Claim Rule

If multiple policy sentences express the same claim:

- they must be identified during audit
- duplicates must be consolidated in later phases

Duplicate claims increase drift risk and must not persist.

### 6.8 Audit Row Expiry Rule

If a policy sentence changes, the prior audit row expires.

Phase A rows are valid only for the exact rendered sentence they audit.

### 6.9 Structural Text Exclusion Rule

Scope bullets, section titles, and annotation fragments are excluded from claim rows unless explicitly promoted to claims.

Structural text may be noted during audit, but it must not be classified as behavior by default.

### 6.10 Rendered Text Rule

Phase A audits current rendered policy text, not prior canonical text.

If rendered policy text and earlier canonical wording differ, the rendered sentence governs the current Phase A row.

## 7. Phase A Outcomes

Interpret statuses like this:

- `mapped` = safe for now
- `unmapped` = rewrite or remove later
- `unclear` = clarify before Phase B
- `conflicts_with_system` = policy bug

Claims marked `conflicts_with_system` must be treated as implementation-policy mismatch, not drafting preference.

## 8. Evidence Discipline

Phase A does not guess.

Do not:

- assume a behavior exists
- invent a system mapping
- mark a claim safe without evidence

If evidence is missing, use:

- `unmapped`
- `unclear`

## 9. Phase Boundary

Phase A is limited to:

- claim extraction
- claim classification
- system mapping
- truth status assignment

Phase A does not include:

- wording polish
- typography review
- legal completeness review
- automation
- validator design

## 10. Working Rule

The following wording is canonical and must not be changed:

> Policy is not decorative prose.
>
> Policy is declared system contract.

This means:

- unmapped claims are unsafe
- unclear claims are incomplete
- conflicting claims are policy bugs

Use this document as the canonical manual audit structure until a later phase explicitly replaces it.
