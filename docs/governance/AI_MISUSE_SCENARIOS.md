# AI Misuse Scenarios

This document defines realistic failure modes that can corrupt the system if AI is introduced without strict controls.

Its purpose is detection, not speculation.

## Purpose

The purpose of this document is to identify how AI usage can operationally damage a deterministic LLGS and how those failures should be detected early.

## Scope

This document applies to any future AI or LLM integration associated with:

- explanation
- translation
- user assistance
- suggestion workflows
- drafting workflows

## Scenario 1. Silent Writeback

### What Happens

AI output is written directly into:

- concept definitions
- concept text
- relation packets
- other canonical artifacts

### Why It Is Dangerous

Deterministic meaning is replaced by probabilistic output.

### Detection

- diff canonical files for AI-originated phrasing drift
- flag writes originating from AI service or adapter layers
- require audit visibility for all writes to canonical artifacts

## Scenario 2. "Looks Correct" Acceptance

### What Happens

AI output sounds correct and is accepted without deterministic validation.

### Why It Is Dangerous

Fluent output is mistaken for validated truth.

### Detection

- require validator pass for all canonical changes
- flag any canonical change without validation trace
- block merge of AI-originated proposals without deterministic review evidence

## Scenario 3. UI Blending

### What Happens

AI advisory text is visually merged into canonical output.

### Why It Is Dangerous

Users cannot distinguish system truth from suggestion.

### Detection

- scan UI rendering paths for mixed AI and canonical blocks
- require visible AI labeling on every advisory surface
- use snapshot or UI verification to check separation rules

## Scenario 4. Authority Leakage

### What Happens

AI begins ranking, validating, deciding, or settling outcomes that belong to deterministic system layers.

### Why It Is Dangerous

AI becomes an authority layer instead of an assistive layer.

### Detection

- block AI calls inside validators
- block AI calls inside the canonical resolution engine
- block AI calls inside enforcement logic
- review new AI integration points for authority overlap

## Scenario 5. Hidden Dependency

### What Happens

The system quietly depends on AI availability to function.

### Why It Is Dangerous

The system stops being deterministic and stable under outage or provider change.

### Detection

- simulate AI outage in integration review
- confirm canonical concept resolution still works without AI
- flag hard runtime dependencies on AI responses

## Scenario 6. Prompt Drift Injection

### What Happens

Prompt changes start to inject reinterpretation, bias, or meaning drift without touching canonical artifacts.

### Why It Is Dangerous

System behavior changes without governed canonical change.

### Detection

- version prompts used in governed AI surfaces
- diff prompt changes explicitly
- treat prompts as reviewed artifacts when they influence user-facing AI assistance

## Scenario 7. Overreach Expansion

### What Happens

AI use expands from assistance into definition, validation, or edge-case decision-making.

### Why It Is Dangerous

Scope creep becomes authority creep.

### Detection

- track AI integration surface area
- alert on new AI entry points
- require explicit approval before AI is used in a new subsystem

## Response Rule

If any misuse scenario is detected:

- reject the change, or
- flag it for corrective review before release

The system must not normalize or silently absorb these failures.

## Enforcement Expectations

- AI-related design review should check this document before release
- Active AI guardrails should continue converting these scenarios into explicit checks where practical
- Violations must be treated as system-integrity issues

## Cross-Reference

For authority separation, see [LLGS_AI_BOUNDARY_PROTOCOL.md](./LLGS_AI_BOUNDARY_PROTOCOL.md).

For allowed interaction surfaces, see [AI_INTERACTION_CONTRACT.md](./AI_INTERACTION_CONTRACT.md).

For UI presentation boundaries, see [AI_OUTPUT_SURFACE_SPEC.md](./AI_OUTPUT_SURFACE_SPEC.md).

For the automated enforcement layer currently checking a subset of these scenarios, see [AI_AUTOMATED_INTEGRITY_CHECKS.md](./AI_AUTOMATED_INTEGRITY_CHECKS.md).
