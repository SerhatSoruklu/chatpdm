# Language Contract

ChatPDM is a deterministic language system.

Canonical meaning is authored, validated, and enforced through structured system artifacts rather than through probabilistic language generation.

## Canonical Source Rule

Canonical meaning in ChatPDM comes from:

- concept packets
- relation packets
- schema constraints
- validator outcomes
- deterministic runtime governance state

Language may vary by register or presentation surface, but canonical meaning must remain fixed.

## Document Role

- Role: controlling meaning and language contract.
- Scope: canonical meaning sources and the advisory-layer boundary.
- Governs: what counts as canonical meaning and how AI or advisory layers may participate.
- Does not govern: kernel containment, policy-page structure, or roadmap sequencing.
- Related docs: [docs/governance/LLGS_AI_BOUNDARY_PROTOCOL.md](./docs/governance/LLGS_AI_BOUNDARY_PROTOCOL.md), [docs/governance/AI_INTERACTION_CONTRACT.md](./docs/governance/AI_INTERACTION_CONTRACT.md), [document-authority-index.md](./docs/meta/document-authority-index.md).
- Precedence: this file governs canonical meaning language; advisory layers remain subordinate.

## AI Advisory Layer

If AI is present, it exists only as an advisory layer.

AI may assist with:

- explanation
- translation
- user interaction
- non-binding suggestion

AI must not define, modify, approve, or override canonical meaning.

For the deterministic boundary, see [LLGS AI Boundary Protocol](./docs/governance/LLGS_AI_BOUNDARY_PROTOCOL.md).

For the allowed interaction surface, see [AI Interaction Contract](./docs/governance/AI_INTERACTION_CONTRACT.md).
