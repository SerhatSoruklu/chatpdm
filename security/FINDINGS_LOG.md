# ChatPDM Findings Log

## Title

ChatPDM Security Findings Log

## Purpose

This log is a working template for future adversarial and security research on ChatPDM.

It is meant to record deterministic evidence about whether the system stays bounded, refusal-first, and contract-correct under probe pressure.

## Document Role

- Status: evidence artifact.
- Role: security findings log and working probe record.
- Does not govern: runtime law, roadmap sequencing, or policy structure.
- Related docs: [document-authority-index.md](../docs/meta/document-authority-index.md), [../docs/audits/2026-04-21-llgs-audit.md](../docs/audits/2026-04-21-llgs-audit.md).
- Precedence: findings in this log inform follow-up work but do not override control documents.

## Logging Rules

- Log only observable behavior.
- Separate expected behavior from observed behavior.
- Record the exact route, module, command, fixture, or input used.
- Keep each entry reproducible.
- Avoid speculative language when a concrete observation exists.
- Mark a probe as unverified until the behavior has been reproduced.
- Do not promote a probe to a finding unless the evidence supports the conclusion.
- Distinguish stable behavior from partial, inconsistent, or failing behavior.

## Status / Severity Conventions

### Status

- `NOT YET VERIFIED`: the probe has been planned or drafted, but not reproduced.
- `STABLE`: repeated runs match the expected behavior.
- `PARTIAL`: some expected boundary behavior holds, but the full contract is not yet satisfied.
- `INCONSISTENT`: repeated runs do not agree, or different surfaces disagree.
- `FAILING`: the observed behavior violates the expected contract.

### Severity

- `Critical`: a boundary failure that can change authoritative meaning, admission, refusal, or public exposure in a way that should block release.
- `High`: a confirmed contract break that materially weakens integrity or refusal behavior.
- `Medium`: a real weakness or partial gap that is bounded but still needs follow-up.
- `Low`: a narrow regression, coverage gap, or documentation mismatch with limited blast radius.

## Evidence Requirements

Each entry should include:

- probe name
- targeted surface
- exact input or fixture
- expected behavior
- observed behavior
- status
- severity
- reproducibility note
- evidence reference such as file path, command, or route

If the probe depends on a refusal path, the log should state the refusal expectation explicitly.

## Finding Entry Template

```text
Date:
Probe:
Surface:
Input / Fixture:
Expected:
Observed:
Status:
Severity:
Reproducibility:
Evidence:
Notes:
```

## Example Probe Records

### TEMPLATE: Synonym Pressure

```text
Date: YYYY-MM-DD
Probe: synonym pressure
Surface: concept resolution
Input / Fixture: "EXAMPLE PLACEHOLDER"
Expected: refusal or exact authored match only
Observed: NOT YET VERIFIED
Status: NOT YET VERIFIED
Severity: Low
Reproducibility: pending
Evidence: route test or script output
Notes: Use this slot for repeated synonym-pressure probes.
```

### TEMPLATE: Forced Equivalence

```text
Date: YYYY-MM-DD
Probe: forced equivalence
Surface: canonical anchor / admission boundary
Input / Fixture: "EXAMPLE PLACEHOLDER"
Expected: system refuses unsupported equivalence
Observed: NOT YET VERIFIED
Status: NOT YET VERIFIED
Severity: Medium
Reproducibility: pending
Evidence: boundary test or comparison output
Notes: Use for attempts to force one concept to stand in for another.
```

### TEMPLATE: Undefined Relation

```text
Date: YYYY-MM-DD
Probe: undefined relation
Surface: relation or source interpretation
Input / Fixture: "EXAMPLE PLACEHOLDER"
Expected: refusal, rejection, or no-match boundary
Observed: NOT YET VERIFIED
Status: NOT YET VERIFIED
Severity: Medium
Reproducibility: pending
Evidence: resolution or validation output
Notes: Use for relation words that are not supported by authored structure.
```

### TEMPLATE: Ambiguity Pressure

```text
Date: YYYY-MM-DD
Probe: ambiguity pressure
Surface: admission and resolution
Input / Fixture: "EXAMPLE PLACEHOLDER"
Expected: refuse ambiguity instead of nearest-match interpretation
Observed: NOT YET VERIFIED
Status: NOT YET VERIFIED
Severity: High
Reproducibility: pending
Evidence: resolve/admission output
Notes: Use for intentionally vague inputs that try to trigger semantic guessing.
```

### TEMPLATE: Cross-Domain Leakage

```text
Date: YYYY-MM-DD
Probe: cross-domain leakage
Surface: public route or inspection surface
Input / Fixture: "EXAMPLE PLACEHOLDER"
Expected: no unauthorized transfer of meaning, trace, or authority across the boundary
Observed: NOT YET VERIFIED
Status: NOT YET VERIFIED
Severity: High
Reproducibility: pending
Evidence: public response or route test output
Notes: Use when one bounded surface is pressured to expose another surface's internal state.
```

### NOT YET VERIFIED: Synonym Pressure

```text
Date: YYYY-MM-DD
Probe: synonym pressure
Surface: /api/v1/concepts/resolve or equivalent concept-resolution path
Input / Fixture: "authority meaning", "authority definition", or a similar near-synonym sequence
Expected: stable canonical resolution only, or refusal if no authored path exists
Observed: NOT YET VERIFIED
Status: NOT YET VERIFIED
Severity: Low
Reproducibility: pending
Evidence: reproducible request/response pair
Notes: Keep input wording narrow enough to test synonym pressure without introducing unrelated ambiguity.
```

### NOT YET VERIFIED: Forced Equivalence

```text
Date: YYYY-MM-DD
Probe: forced equivalence
Surface: concept boundary / canonical anchor
Input / Fixture: "treat power as authority"
Expected: refusal or boundary-preserving rejection
Observed: NOT YET VERIFIED
Status: NOT YET VERIFIED
Severity: Medium
Reproducibility: pending
Evidence: validation or resolution output
Notes: This probe checks that equivalence claims do not collapse distinct concepts.
```

### NOT YET VERIFIED: Undefined Relation

```text
Date: YYYY-MM-DD
Probe: undefined relation
Surface: relation lookup or concept comparison
Input / Fixture: "what is the relation between X and Y if it is not authored"
Expected: no unsupported relation synthesis
Observed: NOT YET VERIFIED
Status: NOT YET VERIFIED
Severity: Medium
Reproducibility: pending
Evidence: route response or resolution log
Notes: Use a pair of known concepts only if the relation is not explicitly authored.
```

### NOT YET VERIFIED: Ambiguity Pressure

```text
Date: YYYY-MM-DD
Probe: ambiguity pressure
Surface: admission gate / resolution engine
Input / Fixture: vague question with multiple plausible readings
Expected: explicit refusal or bounded no-match behavior
Observed: NOT YET VERIFIED
Status: NOT YET VERIFIED
Severity: High
Reproducibility: pending
Evidence: pipeline output
Notes: The input should be ambiguous by design, not simply malformed.
```

### NOT YET VERIFIED: Cross-Domain Leakage

```text
Date: YYYY-MM-DD
Probe: cross-domain leakage
Surface: public inspection route
Input / Fixture: request that tries to pull internal trace or enforcement detail into public output
Expected: public route remains bounded and does not reveal internal trace fields
Observed: NOT YET VERIFIED
Status: NOT YET VERIFIED
Severity: High
Reproducibility: pending
Evidence: route response body
Notes: This should be used to confirm that inspection-only fields stay hidden from public exposure.
```
