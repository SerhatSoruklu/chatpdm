# LLGS AI Boundary Protocol

## Purpose

This protocol defines the boundary between the ChatPDM Language-Level Governance System (LLGS) and any future probabilistic AI system such as an LLM.

ChatPDM may later use AI for explanation, translation, or user interaction.

ChatPDM must remain deterministic whether AI is present or absent.

For the allowed interaction surface, see [AI_INTERACTION_CONTRACT.md](./AI_INTERACTION_CONTRACT.md).
For UI presentation boundaries, see [AI_OUTPUT_SURFACE_SPEC.md](./AI_OUTPUT_SURFACE_SPEC.md).
For the automated enforcement layer now defending a subset of this boundary, see [AI_AUTOMATED_INTEGRITY_CHECKS.md](./AI_AUTOMATED_INTEGRITY_CHECKS.md).

## Core Invariant

LLGS systems define canonical meaning.
AI systems may generate interpretations or assistance.

AI must never define, modify, or override canonical meaning.

## Authority Separation

The canonical LLGS layer retains authority over:

- concept definitions
- relation packets
- schema constraints
- validator rules
- enforcement logic
- runtime governance state

Any AI layer is limited to:

- explanation
- translation
- user interaction
- non-binding suggestion

The allowed direction is:

`LLGS -> AI`

The disallowed direction is:

`AI -> LLGS authority`

## AI Restrictions

AI systems must not:

- create or modify concept packets
- create or modify relation packets
- alter schema definitions
- alter validator rules
- alter enforcement settings
- inject new canonical rules
- auto-accept their own output into canonical structures

All AI output must be treated as untrusted input until a human and the deterministic validation pipeline approve it.

## Determinism Firewall

Canonical LLGS resolution must not depend on:

- probabilistic model output
- non-repeatable reasoning
- external model state
- AI availability

If an AI provider is unavailable, canonical meaning resolution must continue to function correctly through the deterministic system alone.

## AI as Interface, Not Authority

AI may explain what the system already defines.

AI may not decide what a concept means in ChatPDM.

AI may summarize, restate, or assist with navigation only after canonical meaning has already been fixed by the deterministic system.

## Conflict Handling

If AI output conflicts with canonical meaning, the system must reject it or flag it for review.

The system must never:

- reconcile AI output with canonical meaning automatically
- blend probabilistic output into canonical artifacts
- treat partial agreement as authority

When conflict exists, canonical LLGS meaning wins without negotiation.

## Enforcement Expectations

Any future AI integration must be introduced behind explicit guards or adapters that preserve this boundary.

At minimum, future integrations must ensure:

- AI outputs remain non-authoritative
- AI outputs cannot write directly to canonical meaning artifacts
- AI-originated proposals cannot bypass validator review
- runtime meaning resolution remains sourced from LLGS artifacts, not model judgment
- any AI-facing assistive behavior is auditable and bounded

Violations of this protocol must be treated as system-integrity defects, not as product enhancements.

## Final Rule

If an AI integration increases convenience but weakens deterministic authority separation, it must be rejected.
