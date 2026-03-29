# Anti-Drift Prompt Template

This document defines the canonical anti-drift prompt template for ChatPDM work.

Use it when a task needs bounded implementation discipline rather than open-ended problem expansion.

The template exists to reduce:

- local-task drift
- helpful-expansion drift
- parallel-truth drift

It is a workflow artifact, not a runtime law.

It operationalizes doctrine that already exists across:

- [../INTERGRITY_RUNTIME_LAWS.md](../INTERGRITY_RUNTIME_LAWS.md)
- [../TRUST_INTEGRITY_STACK.md](../TRUST_INTEGRITY_STACK.md)
- [architecture-philosophy.md](./architecture-philosophy.md)
- [signal-placement-laws.md](./signal-placement-laws.md)
- [policy-writing-tone-guide.md](./policy-writing-tone-guide.md)

## When To Use This Template

Use this template when a task:

- has a phase boundary that must not be crossed
- depends on explicit system invariants
- risks introducing new fields, routes, abstractions, or truth surfaces by convenience
- touches policy, trust, inspect, evidence, or scope-sensitive implementation
- could drift through “helpful” adjacent improvements

Use the full template for architecture work, bounded implementation work, and truth-sensitive documentation work.

Use the fast version for smaller tasks where the phase boundary is simple but still important.

## Canonical Template

```md
Task:
<one precise thing>

Current Phase:
<e.g. Phase E1.a6 - proof packaging only>

Allowed Scope:
- <explicit list of what is allowed>

Forbidden Scope:
- do not implement anything from next phases
- do not add new fields, routes, or abstractions not explicitly required
- do not refactor unrelated code
- do not “improve” adjacent systems
- do not infer missing features

System Invariants (must remain true):
- <replay is authoritative>
- <append-only evidence>
- <no mutation of existing contracts>
- <UI must not imply data the system does not know>
- <policies must remain traceable + runtime-true>

Source of Truth:
- <list exact files or modules>

Change Rules:
- minimal diff only
- no new concepts unless explicitly required
- replace, do not duplicate (especially in docs)
- do not create parallel versions of truth

Uncertainty Rule:
If you are unsure about any part:
- do not guess
- explicitly state the uncertainty
- do not extend the system to fill the gap

Drift Guard:
Before finishing, explicitly confirm:
1. what you changed
2. what you intentionally did NOT change
3. why this does NOT cross the phase boundary
```

## Fast Version

```md
Phase:
<X>

Scope:
Only implement <Y>

Do NOT:
- add fields
- add routes
- refactor
- extend beyond scope

Rules:
- minimal diff only
- replace, do not duplicate
- respect existing contracts

If unsure:
- do not guess
- state the uncertainty
- do not fill the gap by extending the system

Confirm:
- what changed
- what did not change
- why no phase boundary was crossed
```

## Usage Note

This template should be applied before implementation begins, not after drift appears.

Its purpose is to force explicit scope framing before code, docs, or policy text expand under momentum.

If the task cannot be written cleanly in this template, the task is probably not yet bounded enough to implement safely.
