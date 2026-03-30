# Legal Argument Validator Laws

## Purpose

These laws define the non-negotiable operating boundary for the Legal Argument Validator workstream.

They govern product scope before implementation convenience.

Violation of these laws means the system has drifted outside the intended product.

## 1. Boundary Law

The system is a bounded legal reasoning workbench.

It is not:

- a court AI
- a judge replacement
- a case outcome predictor
- a witness credibility assessor
- a freeform legal chat system

Its role is to:

- take structured legal arguments
- normalize them into defined units
- map them to controlled doctrine
- validate consistency, support, scope, and completeness
- return tightly bounded validation outcomes

## 2. Decision Contract Law

The only allowed top-level results are:

- `valid`
- `invalid`
- `unresolved`

The system must not emit:

- likely correct
- mostly valid
- probably persuasive
- likely winner
- likely loser

`unresolved` is a required safety outcome when deterministic validation is not possible under the loaded doctrine and retained artifacts.

## 3. Refusal-First Law

If exact deterministic mapping or validation is not possible, the system must refuse success and return `unresolved` or an explicit failure path.

Near misses, broad plausibility, and soft resemblance are not valid success grounds.

## 4. No-Fuzz Law

No probabilistic confidence may justify successful mapping or successful validation.

Success requires an exact deterministic basis.

Ambiguity must remain ambiguity.
Unresolved must remain unresolved.

## 5. Core Identity Law

Packages may extend application behavior, but they may not silently redefine protected core concept identity.

This law must be enforced in:

- doctrine loader
- resolver
- validation rules
- authoring tools
- promotion workflow
- regression suites

## 6. Admissibility Law

Blocked or pending-review extraction outputs may not silently enter successful deterministic mapping or validation.

If review or admissibility is incomplete, the result must stay blocked or unresolved.

## 7. Replay Law

Replay requires:

- the same input
- the same doctrine artifact
- the same resolver version

Hash-only identity is insufficient.

Replay claims are valid only when the referenced doctrine artifact is immutably retained and retrievable.

## 8. Trace Law

Every successful, invalid, unresolved, or manually overridden outcome must be explainable through trace.

Trace must preserve:

- source anchor lineage
- mapping basis
- validation rule path
- doctrine artifact identity
- override visibility where applicable

## 9. Authority Scope Law

Authority must be validated against:

- jurisdiction
- effective period
- doctrine package scope
- supported authority class

Out-of-scope, superseded, or unsupported authority must not validate as current support unless a doctrine package explicitly allows a historical analysis mode.

## 10. Governance Law

Doctrine, synonym, protected concept, and authority-scope changes require review, regression checks, and promotion controls.

They must not enter runtime as convenience edits.

## 11. Override Visibility Law

Manual overrides are allowed only as explicit, traceable, reviewable exceptions.

They must never masquerade as automatic exact matches or automatic admissible success.

## 12. Drift-Kill Law

Any change that could silently alter:

- concept identity
- authority scope
- replay behavior
- success classification
- override visibility

must be blocked, surfaced, or regression-tested before promotion.
