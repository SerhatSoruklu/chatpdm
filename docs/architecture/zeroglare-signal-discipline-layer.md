# Zeroglare Signal-Discipline Layer

## Purpose

Zeroglare is ChatPDM's internal signal-discipline layer.

It reduces rhetorical noise, isolates semantic signal, and prevents ambiguity from spreading into deterministic resolution.

## Pipeline Position

Zeroglare sits immediately after input and before tokenize, parse, classify, validate, and resolve-or-refuse.

Pipeline order:

1. input
2. Zeroglare
3. tokenize
4. parse
5. classify
6. validate / enforce
7. resolve or refuse

Zeroglare does not replace later phases.

It keeps them from receiving avoidable signal noise.

## Responsibilities

Zeroglare is limited to signal hygiene:

- rhetorical-noise detection
- ambiguity surfacing
- scope pressure detection
- unsupported semantic bridge detection
- cosmetic certainty suppression
- signal isolation before resolution

## Live Diagnostics

The live diagnostics route is:

- `/api/v1/zeroglare`
- `/api/v1/zeroglare/analyze`

Current diagnostic labels:

- `rhetorical_noise`
- `ambiguity_surface`
- `unsupported_semantic_bridge`
- `scope_pressure`

These labels are diagnostic classifications only.

They do not add a new resolution state and they do not replace the deterministic resolver contract.

## Hard Constraints

Zeroglare must not:

- become a separate resolver
- become a truth engine
- become a reasoning engine
- replace governance or validation
- infer probabilistic outcomes
- rewrite public resolution states

## Visibility Rule

Public documentation may name Zeroglare directly.

The live resolver remains bounded, refusal-safe, and unchanged in contract shape.
