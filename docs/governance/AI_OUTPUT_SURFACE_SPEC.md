# AI Output Surface Spec

This spec defines how AI-generated advisory content must appear in the UI so it cannot be confused with canonical LLGS output.

## Purpose

The purpose of this spec is to preserve visible separation between canonical system output and AI-generated advisory content.

It defines presentation rules only.

It does not authorize AI interaction, change canonical meaning, or redefine the AI governance boundary.

## Core Principle

Canonical LLGS output must remain visually and structurally distinct from AI output at all times.

Users must be able to identify AI content immediately without inference.

## Visual Separation Rules

### Background

- AI output must use a distinct background from canonical output
- AI output must not reuse the canonical content background without an additional separating treatment

### Borders

- AI output must use a visible border or equivalent edge treatment
- AI output must not appear border-identical to canonical system output

### Spacing

- AI output must be separated from canonical output with clear spacing
- AI output must not be visually attached to canonical content as if it were part of the same block

## Labeling Requirements

- Every AI output surface must show the visible label: `AI (Advisory, Non-Canonical)`
- The label must be present in the rendered UI, not only in metadata or developer tools
- Hidden indicators, hover-only disclosure, or icon-only disclosure are not sufficient

## Structural Rules

- AI content must not be mixed into the same content block as canonical output
- AI output must appear below or beside canonical output
- Canonical output must remain the primary content block when both are present
- AI output must not replace canonical output in concept resolution views

## Typography Rules

- AI output may use subtle typographic distinction from canonical output
- Typographic treatment must not make AI content more dominant than canonical content
- AI output must not use stronger hierarchy cues than canonical headings or canonical definitions

## Forbidden UI Patterns

- no blending of AI and canonical text in one block
- no system-style visuals that make AI appear canonical
- no authority signals implying validator approval or canonical status
- no unlabeled AI summaries placed where canonical definitions normally appear
- no presentation pattern that causes AI output to read as a resolved concept answer

## Interaction Constraints

- AI output must be non-editable in the canonical surface
- AI output must not be stored as system truth
- If copy actions are provided, copied AI content should preserve or prepend advisory labeling where product behavior allows it

## Enforcement Expectations

- UI implementation must reflect the governance boundary already defined in the AI governance documents
- Violations of this spec must be treated as system-integrity issues
- Any future AI UI surface should be reviewed against this spec before release

## Cross-Reference

For authority separation, see [LLGS_AI_BOUNDARY_PROTOCOL.md](./LLGS_AI_BOUNDARY_PROTOCOL.md).

For allowed AI inputs and outputs, see [AI_INTERACTION_CONTRACT.md](./AI_INTERACTION_CONTRACT.md).

For operational misuse and detection patterns, see [AI_MISUSE_SCENARIOS.md](./AI_MISUSE_SCENARIOS.md).
