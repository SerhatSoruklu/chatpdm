# V1 Concept List and Scope Lock

## 1. Purpose

ChatPDM v1 is a bounded deterministic system.

It prioritizes precision over coverage. Concepts are curated, not discovered. Scope is intentionally limited to protect system integrity.

A smaller, precise system is more valuable than a broad, inconsistent one.

This document defines what exists in v1. It does not define how concepts are written and it does not define how queries are matched. It defines the allowed concept boundary.

## 2. Inclusion Criteria

A concept is allowed in v1 only if all of the following are true:

- it represents a structural mechanism or abstraction
- it has clear boundaries and is not vague
- it can be defined without narrative, examples, or biography
- it is not replaceable by an existing concept
- it introduces unique explanatory power to the system

The following are rejected:

- synonyms of existing concepts
- emotionally-defined concepts
- culturally dependent meanings
- concepts that collapse into each other when defined strictly
- concepts included only because they are common search terms

## 3. V1 Domains

ChatPDM v1 uses a maximum of three domains:

- `core-abstractions`
- `relational-structures`
- `governance-structures`

Domain rules:

- domains are classification only
- each concept is assigned one primary domain only
- domains must not overlap as taxonomy buckets
- cross-domain relations may exist later, but domain assignment remains singular
- domains do not expand concept scope by themselves

Important lock:

- `authority`, `power`, and `legitimacy` remain classified under `relational-structures` for taxonomy
- their canonical definitions are governance-scoped in ChatPDM v1
- they must not be treated as universal definitions across all domains

## 4. V1 Concept Inventory

ChatPDM v1 is locked to 23 concepts.

This inventory is the current system boundary. It must not exceed 25 concepts in v1.

| conceptId | Title | Domain | Why this concept exists in v1 |
| --- | --- | --- | --- |
| `meaning` | Meaning | `core-abstractions` | Anchors what a term is allowed to signify inside the system. |
| `truth` | Truth | `core-abstractions` | Separates valid truth-claims from assertion alone. |
| `identity` | Identity | `core-abstractions` | Handles sameness, difference, and persistence across reference. |
| `freedom` | Freedom | `core-abstractions` | Covers constraint and permissible action without collapsing into rights or power. |
| `equality` | Equality | `core-abstractions` | Captures sameness of status, treatment, or standing across units. |
| `responsibility` | Responsibility | `core-abstractions` | Links action, role, or decision to answerability for outcomes. |
| `authority` | Authority | `relational-structures` | Governance-scoped concept that distinguishes who may direct from mere force or validity. |
| `power` | Power | `relational-structures` | Governance-scoped concept that captures operative capacity in relation to governance structure without requiring legitimacy. |
| `legitimacy` | Legitimacy | `relational-structures` | Governance-scoped concept that separates accepted validity from raw force, office, or possession. |
| `consent` | Consent | `relational-structures` | Marks authorized acceptance rather than imposed compliance. |
| `trust` | Trust | `relational-structures` | Captures reliance under uncertainty without reducing it to authority or law. |
| `recognition` | Recognition | `relational-structures` | Handles acknowledged standing or status within a relation. |
| `conflict` | Conflict | `relational-structures` | Captures incompatible positions without forcing premature resolution. |
| `law` | Law | `governance-structures` | Defines formal rule structures backed by institutional force. |
| `justice` | Justice | `governance-structures` | Covers standards for right arrangement, allocation, and judgment. |
| `rights` | Rights | `governance-structures` | Defines protected claims or entitlements held within a system. |
| `duty` | Duty | `governance-structures` | Captures required conduct owed under a rule, office, or role. |
| `institution` | Institution | `governance-structures` | Covers durable organized structures that stabilize rules and roles. |
| `governance` | Governance | `governance-structures` | Captures how collective direction, coordination, and decision flow are organized. |
| `accountability` | Accountability | `governance-structures` | Links power and office back to review, justification, and consequence. |
| `hierarchy` | Hierarchy | `governance-structures` | Captures ranked ordering of roles, power, or authority positions. |
| `sovereignty` | Sovereignty | `governance-structures` | Defines the final locus of governing authority within a system. |
| `order` | Order | `governance-structures` | Captures stable arrangement and rule coherence at system level. |

## 5. Justification Rule

Every concept included in v1 must carry a one-line structural justification.

That justification must:

- explain the gap the concept fills in the system
- distinguish it from nearby concepts
- remain structural, not descriptive
- avoid examples, stories, and rhetorical framing

If a concept cannot justify its existence in one structural line, it does not belong in v1.

## 6. Explicit Out-of-Scope

The following are out of scope for ChatPDM v1:

- people
- events
- biographies
- general knowledge queries
- storytelling prompts
- poetry
- creative writing
- open-ended philosophical questions without a defined concept
- `who is` queries
- `what happened` queries

The following must also remain out of scope:

- thinker-based entries such as Ataturk, Mevlana, Rawls, Marx, or Plato
- religious or historical person profiles
- event timelines
- narrative explanation requests that do not resolve to a defined concept

Out-of-scope queries must not be forced into concepts.

## 7. Domain Expansion Policy

Domains with all of the following properties are not allowed in early system phases:

- high ambiguity
- high overlap
- high real-world consequence

The medical and psychiatric domain is excluded from the core system.

If such a domain is opened in the future:

- it must be isolated as a bounded domain
- it must not affect core concepts

## 8. Medical Domain Rules (Future, Not Now)

If a medical or psychiatric domain is ever opened later, the allowed query surface must remain narrow.

Allowed:

- definition queries
- distinction queries

Refused:

- diagnosis
- treatment recommendations
- symptom to condition inference

Invariant:

- diagnosis is defined by symptom pattern, not medication

## 9. Anti-Bloat Rules

The v1 concept set is protected by the following rules:

- no concept is added for completeness
- no concept is added because users ask for it often
- no concept is added unless it increases system explanatory power
- no concept is added if an existing concept already covers the same structural role
- removing a concept is allowed if strict overlap is discovered
- broadening aliases is allowed only if concept boundaries remain unchanged

Expansion pressure is not a justification.

## 10. Concept Addition Policy

Adding a concept to v1 requires all of the following:

- `conceptSetVersion` bump
- passing the concept-writing standard
- full structure present for the concept, including definitions, contexts, sources, and related concepts
- non-overlap check against every existing v1 concept
- one-line structural justification
- explicit domain assignment

No concept is admitted through query pressure alone.

## 11. Determinism Enforcement

The matcher resolves only within the published v1 concept set.

Rules:

- no external fallback
- no semantic guessing
- no runtime expansion
- no hidden concept discovery
- no off-scope rescue logic

If a query does not resolve within the v1 concept set, the correct product outcome is `no_exact_match`.

## 12. Relationship to System

Phase separation is strict:

- Phase 2 defines how concepts are written
- Phase 3 defines how queries resolve
- Phase 4 defines what exists

This phase defines the system boundary.

It does not authorize new concepts, new query behaviors, or broader coverage. It constrains them.

## 13. Non-Goals

ChatPDM v1 does not aim to:

- answer everything
- behave like a chatbot
- maximize recall
- interpret vague queries
- approximate nearby meaning when a concept does not exist
- absorb off-scope queries into the nearest available concept

ChatPDM v1 aims to:

- return correct deterministic answers within the defined concept set
- return `no_exact_match` when no authored path exists
