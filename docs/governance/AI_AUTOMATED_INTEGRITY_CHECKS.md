# AI Automated Integrity Checks

This document defines the automated enforcement layer for the AI governance stack in ChatPDM.

Selected checks are active today. Broader coverage remains incremental.

## Purpose

The purpose of this document is to define what AI-related governance rules are checked automatically, where those checks run, and how failures are classified.

## Scope

This document applies to AI-related enforcement for:

- AI integration paths
- AI-facing UI surfaces
- AI-originated proposal flows
- canonical protection boundaries
- deterministic runtime authority paths

Current implementation includes:

- repo scanner checks for high-risk AI leakage patterns
- CI blocking on blocker-severity scan findings
- runtime guards that reject AI provenance markers in canonical artifacts and deterministic resolver output
- a machine-readable violation corpus and replay step that verify known AI misuse cases still trigger detection over time

This document also defines the next enforcement layers that remain to be added.

## Enforcement Layers

### CI Rules

CI rules are pipeline checks that evaluate whether a change may be merged safely.

They are used for:

- merge blocking where risk is high
- mandatory review where risk is material
- visible warnings where risk is present but not yet blocking

Current active CI behavior:

- blocker-severity AI scan findings fail the policy-governance workflow
- non-blocker findings remain visible warnings
- replayed AI violation fixtures fail the workflow if a known violation stops being detected

### Repo Scanners

Repo scanners are static checks over source, configuration, prompts, and documentation.

They are used for:

- detecting forbidden AI usage patterns
- detecting missing governance references
- detecting suspicious naming or integration drift

Current active scanner coverage includes:

- AI usage in restricted deterministic paths
- suspicious AI helper names
- direct AI write attempts into canonical store targets
- missing advisory labels on AI-related UI surfaces
- AI-related or prompt-related changes without governance references
- optional manual capture of detected violations into machine-readable replay fixtures

### Runtime Guards

Runtime guards are last-line protections that prevent prohibited AI behavior if earlier controls fail.

They are used for:

- rejecting prohibited write attempts
- refusing prohibited execution paths
- failing closed when advisory output attempts to enter deterministic authority paths

Current active runtime guards:

- reject AI provenance markers in authored concept packets, relation packets, and resolve rules
- reject AI provenance markers in governance workflow mutation inputs
- fail closed if advisory content enters deterministic resolver responses

### Violation Replay

Stored AI governance violations are replayed from `governance/violations/`.

They are used for:

- regression protection against known misuse patterns
- machine-readable audit of what the system must continue to detect
- CI verification that previously blocked or flagged AI violations still produce the expected outcome

## Example Checks per Layer

### CI Rules

Examples:

- block AI usage inside canonical resolution paths
- block AI usage inside validators or enforcement logic
- require visible advisory labeling for AI UI surfaces
- require governance-document references when AI-related files change

### Repo Scanners

Examples:

- detect AI service calls in concept, validator, or resolver paths
- detect forbidden imports in canonical modules
- detect missing advisory labels in AI-rendering components
- detect prompt changes without governance review references
- detect suspicious strings such as `generateDefinition`, `autoDefine`, or `resolveWithAI`

### Runtime Guards

Examples:

- reject AI-originated write attempts to canonical stores
- reject AI-originated validator mutations
- reject unresolved AI content being marked canonical
- fail closed if advisory output enters deterministic execution paths

## Severity Model

### Blocker

- merge must fail, or
- runtime must refuse execution

Used for direct threats to canonical authority or deterministic behavior.

### High

- alert is required
- manual review is required before release

Used for serious boundary violations that may not yet justify automatic refusal.

### Medium

- warning is emitted
- audit trail is expected

Used for meaningful governance drift that should stay visible.

### Low

- informational only

Used for early signal, discovery, or non-authoritative hygiene checks.

## Auditability Requirements

Every automated integrity check should report:

- what was checked
- where it failed
- why it failed
- which rule it violated

Check output must be specific enough to support correction and review.

## Enforcement Expectations

- These checks should be introduced incrementally
- The highest-risk checks should be promoted first
- Remaining warning-only checks should be promoted to blockers or fail-closed runtime guards only when the signal is strong enough
- Failure output should remain concrete and reviewable

This document defines enforcement categories, current active coverage, and remaining expectations.

## Cross-Reference

For authority separation, see [LLGS_AI_BOUNDARY_PROTOCOL.md](./LLGS_AI_BOUNDARY_PROTOCOL.md).

For allowed interaction surfaces, see [AI_INTERACTION_CONTRACT.md](./AI_INTERACTION_CONTRACT.md).

For UI presentation boundaries, see [AI_OUTPUT_SURFACE_SPEC.md](./AI_OUTPUT_SURFACE_SPEC.md).

For realistic failure patterns that these checks target, see [AI_MISUSE_SCENARIOS.md](./AI_MISUSE_SCENARIOS.md).
