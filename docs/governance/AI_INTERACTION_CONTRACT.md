# AI Interaction Contract

This contract operationalizes [LLGS_AI_BOUNDARY_PROTOCOL.md](./LLGS_AI_BOUNDARY_PROTOCOL.md).

It defines the allowed interaction surface between AI systems and the ChatPDM deterministic LLGS.

## Purpose

The purpose of this contract is to keep AI interaction bounded, inspectable, and non-authoritative.

It specifies what AI may receive, what AI may return, how AI output must be labeled, and how AI output is prevented from contaminating canonical system layers.

## Scope

This contract applies to any future AI or LLM integration that interacts with ChatPDM through:

- explanation surfaces
- translation surfaces
- assistive user interaction
- non-binding suggestion flows

For presentation rules on AI advisory content, see [AI_OUTPUT_SURFACE_SPEC.md](./AI_OUTPUT_SURFACE_SPEC.md).
For operational failure patterns and detection, see [AI_MISUSE_SCENARIOS.md](./AI_MISUSE_SCENARIOS.md).
For the automated enforcement layer now defending a subset of these rules, see [AI_AUTOMATED_INTEGRITY_CHECKS.md](./AI_AUTOMATED_INTEGRITY_CHECKS.md).

This contract does not authorize AI use in canonical resolution, validation, concept definition, relation definition, or enforcement logic.

## Input Contract

### Allowed Inputs

AI may receive only bounded, non-authoritative inputs such as:

- user query text
- already-resolved canonical concept outputs
- already-approved public concept text
- public documentation or user-facing product copy
- explicit UI context needed for explanation or translation
- deterministic metadata that is already safe to expose

### Forbidden Inputs

AI must not receive inputs that would let it act as a hidden authority layer, including:

- internal validator state used for canonical decision-making
- unresolved canonical states that require deterministic system judgment
- hidden system data or non-public governance artifacts
- private enforcement logic intended only for the deterministic runtime
- mutable concept, relation, or validator artifacts for direct AI editing
- any input framed as permission to settle canonical meaning

## Output Contract

### Allowed Outputs

AI outputs are limited to bounded assistive forms such as:

- explanation
- summary
- translation
- clarification phrasing
- non-binding suggestion

### Forbidden Outputs

AI must not produce outputs that function as canonical system authority, including:

- canonical definitions
- canonical relation claims
- rule creation
- validation outcomes
- enforcement outcomes
- canonical resolution decisions
- promotion, approval, or review decisions

## Output Classification and Labeling

All AI output must be explicitly treated as:

- `advisory`
- `non-canonical`
- `untrusted`

AI output must never appear as if it were:

- canonical
- validator-approved
- system-decided
- structurally binding

No implicit authority is allowed.

## Interaction Boundaries

### Where AI May Appear

AI may appear only in bounded assistive surfaces such as:

- explanation panels
- translation panels
- user-assistance layers
- suggestion or drafting workflows that remain outside canonical authority

### Where AI Must Never Appear

AI must never appear inside:

- the canonical resolution pipeline
- the validation engine
- the concept registry
- the relation registry
- schema enforcement
- law enforcement classification
- deterministic runtime authority decisions

## No Writeback Rule

AI output must not directly modify:

- concepts
- relations
- rules
- validators
- enforcement artifacts

Any AI-originated proposal must go through deterministic review paths before it can affect shared system truth.

## Conflict Handling

If AI output conflicts with canonical meaning:

- reject it, or
- flag it for review

The system must never:

- reconcile conflict automatically
- blend AI output into canonical meaning
- let AI output weaken a deterministic decision

Canonical meaning always wins.

## Enforcement Expectations

System design must preserve this contract by ensuring that:

- AI remains outside canonical authority paths
- AI outputs stay explicitly labeled and non-authoritative
- AI-originated suggestions cannot bypass deterministic review
- canonical runtime behavior continues to depend only on LLGS artifacts
- future AI integrations are introduced only behind bounded guards or adapters

This document defines an interaction contract.
It does not by itself create those guards.

## Final Rule

If an AI interaction surface makes advisory output easier but weakens deterministic separation, the interaction surface must be rejected.
