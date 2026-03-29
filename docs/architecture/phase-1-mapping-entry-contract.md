# Phase 1 Mapping Entry Contract

Every extracted claim must pass through this exact shape.

No shortcuts.

## Entry Shape

This is a machine-usable entry template, not a schema.

Allowed values and constraints are defined below.

```json
{
  "source": "",
  "source_type": "",
  "full_text_status": "",
  "reliability_tier": "",

  "chunk_id": "",
  "page": null,

  "normalized_claim": "",

  "maps_to_primary": "",
  "maps_to_secondary": null,

  "evidence_type": "",
  "confidence": 0.0,

  "conflict_status": "",
  "conflict_note": "",

  "admission_decision": "",
  "admission_reason": ""
}
```

## Field Rules

### `normalized_claim`

Rules:

- one idea only
- no quotes
- no interpretation layers
- must be testable as a rule, concept, failure mode, or refusal condition

Bad:

- `Popper suggests falsifiability is important for science`

Good:

- `A claim must be structured so it can be falsified.`

If a claim cannot be reduced to a clean system-usable form, it must not be accepted.

### `maps_to_primary`

Allowed values:

- `rule`
- `failure_mode`
- `concept`
- `refusal_condition`

Hard rule:

- every claim must map to exactly one primary home

### `maps_to_secondary`

Optional.

Allowed values:

- `rule`
- `failure_mode`
- `concept`
- `refusal_condition`

Rules:

- leave `null` if unsure
- do not over-map
- secondary reference must not compete with the primary home
- secondary mapping must come from the same closed ontology set as primary

### `page`

Allowed values:

- positive integer when known
- `null` when unknown

Hard rule:

- do not use string page values

### `evidence_type`

Allowed values:

- `explicit`
- `inferred`

Rules:

- Phase 1 must bias toward `explicit`
- inferred claims must carry lower confidence

### `confidence`

Strict scale:

- `0.9` = clear, direct, unambiguous
- `0.7` = strong but slightly interpretive
- `0.5` = weak or inferred
- below `0.5` = should not be accepted

Hard rule:

- no inferred claim may carry high confidence

### `conflict_status`

Allowed values:

- `none`
- `detected`
- `unresolved`
- `resolved`

Hard rule:

- unresolved conflict blocks admission

### `conflict_note`

Rules:

- must be empty when `conflict_status` is `none`
- must be non-empty when `conflict_status` is `detected`, `unresolved`, or `resolved`
- must stay mechanical

### `admission_decision`

Allowed values:

- `accepted`
- `rejected`
- `deferred`

Admission rules:

- accept if the claim is clear, maps cleanly, has no unresolved conflict, and has high confidence
- reject if the claim is vague, duplicative, not actionable, or purely descriptive
- defer if the claim needs conflict resolution, depends on other claims, or has unclear mapping

### `admission_reason`

Rules:

- no fluff
- mechanical only

Examples:

- `clear rule, explicit, no conflict`
- `duplicate of rule: falsifiability`
- `conflicts with rule: deterministic resolution`
- `too vague to operationalize`

## Admission Sequence

Use this order only:

1. normalize claim
2. assign primary mapping
3. assign secondary mapping if justified
4. determine evidence type
5. assign confidence
6. perform conflict check
7. set admission decision
8. record admission reason

Hard rule:

- admission fields must not be finalized before conflict review is complete

## Anti-Drift Rules

Do not break these:

1. No mapping without normalization.
2. No admission without conflict check.
3. No inferred claim with high confidence.
4. No `interesting idea` bucket.
5. Duplicate claims do not enter doctrine as separate entries.
6. Ontology defines placement, not truth.
7. A clean ontology fit is necessary but not sufficient for admission.
8. Admission fields must not be finalized before conflict review is complete.

If it does not map, discard it.

If a claim restates an already accepted claim, reject it or link it as supporting evidence rather than admitting a new doctrine entry.

## Phase 1 Ontology

Allowed set:

- `rule`
- `failure_mode`
- `concept`
- `refusal_condition`

Forbidden in Phase 1:

- `principle`
- `guideline`
- `pattern`
- `heuristic`
- `strategy`

Ontology constraints:

1. No new category creation in Phase 1.
2. If a claim does not fit, reject or defer it.
3. Categories are fixed before extraction, not shaped by extraction.
4. Ontology defines placement, not truth.
5. A clean ontology fit is necessary but not sufficient for admission.

## Locked Definitions

### `rule`

Definition:

A normative constraint that defines what must or must not happen for the system to remain valid.

Properties:

- must be enforceable
- must be testable
- must be universal, not context-specific
- must reduce ambiguity

Not a rule if:

- descriptive
- philosophical only
- contextual
- optional

### `failure_mode`

Definition:

A specific way the system becomes invalid, unreliable, or corrupted when rules are violated or pressure is insufficient.

Properties:

- must describe breakdown
- must be observable or inferable
- must connect to one or more rules

Not a failure mode if:

- it is only a rule restated
- it is vague
- it has no mechanism

### `concept`

Definition:

A foundational idea or invariant that explains why rules exist but does not enforce behavior directly.

Properties:

- not enforceable
- provides reasoning context
- stable across domains
- supports multiple rules

Not a concept if:

- actionable
- tells the system what to do
- disguised rule

### `refusal_condition`

Definition:

A hard rejection trigger that prevents invalid input from entering the system.

Properties:

- must be binary
- must be enforceable at input stage
- must protect system integrity

Not a refusal condition if:

- advisory
- soft
- interpretive

## Separation Rules

### Rule vs Refusal Condition

- rule defines system behavior
- refusal condition blocks input

### Rule vs Concept

- rule is enforceable
- concept is explanatory

### Failure Mode vs Rule

- failure mode describes breakdown
- rule prevents breakdown

## Decision Tree

When extracting a claim:

1. Is it enforceable?
   - if no, it is a `concept`
   - if yes, continue
2. Does it block input?
   - if yes, it is a `refusal_condition`
   - if no, continue
3. Does it describe breakdown?
   - if yes, it is a `failure_mode`
   - if no, it is a `rule`

## Anchors

- `Extraction collects. Admission decides.`
- `If a claim cannot be placed cleanly, it does not belong.`
- `Mapping is not admission.`
- `Alignment is not acceptance.`
- `Unresolved conflict blocks doctrine.`
