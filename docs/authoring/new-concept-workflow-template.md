# New Concept Workflow Template

## Purpose

Use this workflow when proposing a new ChatPDM concept.

It exists to prevent weak, overlapping, or poorly grounded concepts from
entering the authored or runtime surface.

This is a two-phase workflow:

- `Phase 1` determines whether the concept is admissible at all
- `Phase 2` implements the concept only after explicit approval

Do not use a one-shot authoring prompt for a brand-new concept unless the
concept is extremely small, tightly bounded, and already stable against the
current graph.

## Decision Semantics

- `REJECT`
  - the concept should not proceed
- `HOLD_AS_DRAFT`
  - the concept may exist privately but is not publishable
- `SAFE_TO_PUBLISH`
  - the concept is admissible for Phase 2
- `BLOCKED`
  - Phase 2 implementation halted despite prior approval because validation
    failed before writing

## When To Use This Workflow

Use this workflow when:

- adding a brand-new concept
- introducing a nearby concept that may pressure existing boundaries
- testing graph stability with a bounded candidate concept

Do not skip `Phase 1` if the concept can affect:

- `canonical.invariant`
- `canonical.excludes`
- `canonical.adjacent`
- relation packets
- published runtime scope

## Minimum Inputs Before Phase 1

Before starting `Phase 1`, provide at minimum:

- `conceptId`
- `title`
- `domain`
- `requested status`
- `reason for adding`
- primary sources
- `canonical.invariant`
- at least 3 excludes
- at least 2 to 4 adjacent boundaries

If invariant, excludes, adjacent boundaries, or source grounding cannot be
stated clearly and stably, do not proceed.

## Phase 1 Prompt Template

Paste the following prompt into Codex after filling the placeholders:

```text
Task
Perform a Phase 1 concept admission review for a new ChatPDM concept candidate.
Do not publish, implement, or modify runtime files yet.

Decision semantics
- REJECT = concept should not proceed
- HOLD_AS_DRAFT = concept may exist privately but is not publishable
- SAFE_TO_PUBLISH = concept is admissible for Phase 2

Candidate
- conceptId: [objection]
- title: [Objection]
- domain: [governance-structures | core-abstractions | relational-structures]
- requested status: [draft_only | publish_now]
- reason for adding: [one sentence]

Required grounding
Use the current ChatPDM concept packet standard and reference-standard packets.
Follow:
- data/concepts/README.md
- data/concepts/templates/concept-template.md
- docs/local-change-cascade-rule.md

Primary source grounding
- primary sources: [source ids / works]
- secondary sources if needed: [source ids / works]
- sourcePriority order: [ordered list]

Candidate meaning inputs
- invariant: [one-sentence invariant meaning]
- excludes:
  - [x]
  - [y]
  - [z]
- adjacent boundaries:
  - [conceptA]: [boundary]
  - [conceptB]: [boundary]
  - [conceptC]: [boundary]

Authoring requirement
Draft all three registers independently:
- standard
- simplified
- formal

For each register provide:
- shortDefinition
- coreMeaning
- fullDefinition

Also provide:
- contexts
- related concepts
- aliases
- normalizedAliases
- reviewMetadata draft

Mandatory review checks
1. Invariant check
- is the invariant structurally clear, bounded, and non-circular
- if weak or unstable, mark the check as failed and return REJECT

2. Excludes check
- do excludes prevent collapse into nearby concepts
- if excludes are weak, overlapping, or incomplete, mark the check as failed and return REJECT

3. Adjacent boundary check
- test boundaries against existing nearby concepts
- if boundaries are vague, overlapping, or unstable, mark the check as failed and return REJECT

4. Conflict detection
- identify any direct semantic conflict with existing concepts
- identify any boundary overlap violation
- if any conflict exists, mark the check as failed and return REJECT

5. Cascade check
- list which existing concepts would need revision
- count real revisions only
- report cascade count using docs/local-change-cascade-rule.md

6. Runtime safety check
- if requested status is draft_only, confirm the concept must not:
  - appear in resolver outputs
  - appear in public runtime scope
  - affect existing concept behavior

7. Source grounding check
- determine whether primary sources are sufficient, relevant, and concept-defining
- if grounding is weak, derivative-only, or not concept-defining, mark the check as failed and return REJECT

8. Graph fit check
- determine whether the concept fills a real missing semantic role in the current graph
- if it is redundant, derivative, or merely a rewording of existing concepts, return REJECT

Decision rules
You must return exactly one of:
- REJECT
- HOLD_AS_DRAFT
- SAFE_TO_PUBLISH

Hard stop rule
If invariant, excludes, adjacent boundaries, conflict review, source grounding, or graph fit are weak or unstable:
- return REJECT
- do not recommend Phase 2
- do not soften or “massage” the concept into publishable form

No invented meaning rule
Do not invent missing boundaries, excludes, contexts, aliases, or source grounding.
If they are missing, unstable, or unsupported, return REJECT.

Output
Return these sections exactly:

1. Admission Decision
- REJECT | HOLD_AS_DRAFT | SAFE_TO_PUBLISH

2. Reason
- short explanation

3. Draft Concept Packet
- full draft packet content

4. Boundary Review
- invariant assessment
- excludes assessment
- adjacent boundary assessment

5. Conflict Review
- direct semantic conflicts
- boundary overlap violations

6. Cascade Review
- concepts needing revision
- concepts not needing revision
- cascade count

7. Source Grounding Review
- primary source sufficiency
- source relevance
- whether the grounding is concept-defining

8. Runtime Safety
- whether draft_only is safe
- whether publish_now is safe

9. Phase 2 Readiness
- YES or NO
- if NO, say exactly why

Critical instruction
If you cannot state the invariant, excludes, adjacent boundaries, source grounding, and graph fit clearly and stably:
- REJECT the concept
- stop
```

## Phase 2 Prompt Template

Use `Phase 2` only after a `SAFE_TO_PUBLISH` result or an explicit approval to
implement a `draft_only` concept privately.

```text
Task
Execute Phase 2 implementation for an approved ChatPDM concept.

Decision semantics
- BLOCKED = implementation halted despite prior approval because validation failed before writing

Approved concept
- conceptId: [objection]
- title: [Objection]
- domain: [...]
- approved status: [draft_only | publish_now]

Approved meaning inputs
- invariant: [...]
- excludes:
  - [...]
  - [...]
  - [...]
- adjacent boundaries:
  - [conceptA]: [...]
  - [conceptB]: [...]
  - [conceptC]: [...]

Approved authored content
- standard register:
  - shortDefinition: [...]
  - coreMeaning: [...]
  - fullDefinition: [...]
- simplified register:
  - shortDefinition: [...]
  - coreMeaning: [...]
  - fullDefinition: [...]
- formal register:
  - shortDefinition: [...]
  - coreMeaning: [...]
  - fullDefinition: [...]

Approved supporting fields
- contexts: [...]
- sources: [...]
- sourcePriority: [...]
- relatedConcepts: [...]
- aliases: [...]
- normalizedAliases: [...]
- reviewMetadata: [...]

Implementation requirements
Update all necessary files consistently.

If approved status is publish_now, include at minimum:
- data/concepts/[conceptId].json
- data/concept-versions/[conceptId]/v1.json
- standards/golden-concepts/[conceptId].json

If needed, also update:
- relation packets
- validator fixtures
- runtime reports
- docs/maps if durable truth changed

Mandatory pre-implementation validation
Before writing files, re-check:
1. invariant consistency
2. excludes do not overlap with the concept meaning
3. adjacent boundaries remain preserved
4. no direct conflict with existing nearby concepts
5. no unintended collapse into existing concepts
6. approved source grounding still supports the implemented packet

If any of these fail:
- STOP
- do not implement
- return BLOCKED with exact reason

Runtime safety rule
If approved status is draft_only:
- do NOT add the concept to resolver outputs
- do NOT add it to public runtime scope
- do NOT let it affect existing concept behavior

Violation = critical error

Semantic diff report is required
After implementation, report:
- what meaning was introduced
- what boundaries were introduced or changed
- what relationships were introduced or changed
- whether any existing concept required revision

Validation
Run the smallest relevant validations only.
Report exactly what was run and why.

Output
Return these sections exactly:

1. Pre-Implementation Validation
- PASS or BLOCKED
- exact reasons

2. Files Changed
- exact file list

3. Semantic Diff Report
- meaning introduced
- boundaries introduced or changed
- relationships introduced or changed
- existing concepts revised or not revised

4. Runtime Safety
- confirm draft_only isolation or publish_now behavior

5. Validation Run
- commands run
- result

6. Residual Risk
- any unresolved boundary or graph risk
```

## Operational Rule

If a concept cannot survive `Phase 1`, do not use `Phase 2` to rescue it.

Concept quality must be decided before implementation, not improvised during it.

Implementation is not a discovery phase. Discovery must end before `Phase 2`
begins.
