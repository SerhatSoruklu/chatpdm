# Inspectable Item Semantic Contract

## Status

Phase A lock.

This document freezes the semantic contract for inspectable items in ChatPDM before any UI implementation.

It governs:

- item types
- allowed labels
- forbidden labels
- fallback behavior
- anti-drift rules

It does not change:

- runtime ontology
- concept definitions
- resolver behavior
- admission rules

## Item Types

Every inspectable item must resolve to exactly one of these types:

- `core_concept`
- `registry_term`

These types are exhaustive.
No other inspectable item type is allowed.

## Core Concept Contract

`core_concept` items are runtime-admitted and definition-led.

### Canonical Fields

- `shortDefinition`
- `coreMeaning`
- `fullDefinition`

These field keys are exact strings.

### Canonical Display Labels

- `Short definition`
- `Core meaning`
- `Full definition`

These labels are exact strings.

### Forbidden Labels

- `Meaning in law`
- `Registry interpretation`
- `Why registry-only`
- `Boundary note`
- `Short meaning`
- `Definition`
- any other semantic label not listed above

### Core Rules

- `shortDefinition` is the shortest authoritative statement of the concept.
- `coreMeaning` is a constrained explanation of the same definition.
- `fullDefinition` is the extended authoritative explanation of the same definition.
- The three fields must remain mutually consistent.
- The three fields must preserve the same concept identity and boundary.
- Missing any required field is a contract failure.
- No fallback prose may substitute for a missing core concept field.

## Registry Term Contract

`registry_term` items are recognized legal vocabulary and are not admitted to runtime ontology.

### Canonical Fields

- `meaningInLaw`
- `registryInterpretation`
- `whyRegistryOnly`

These field keys are exact strings.

### Canonical Display Labels

- `Meaning in law`
- `Registry interpretation`
- `Why registry-only`

These labels are exact strings.

### Forbidden Labels

- `Short definition`
- `Core meaning`
- `Full definition`
- `Boundary note`
- `Short meaning`
- `Definition`
- any other semantic label not listed above

### Registry Rules

- `meaningInLaw` states the ordinary legal usage of the term.
- `registryInterpretation` states structural classification only.
- `whyRegistryOnly` states the non-admission reason only.
- The three fields must not compete with one another.
- The three fields must not imply runtime admission.
- Supporting classification metadata may exist, but it does not create a third item type.

## Fallback Behavior

### Core Concepts

- No fallback prose is allowed.
- Missing required fields are data integrity errors.
- A core concept must never borrow registry-term fallback text.

### Registry Terms

If `meaningInLaw` is missing:

- exact fallback: `No term-specific meaning in law has been authored yet.`

If `registryInterpretation` is missing:

- use the fixed classification-level explanation for the item's existing classification bucket.

If `whyRegistryOnly` is missing:

- use the fixed status-level boundary explanation for the item's existing source status.

The classification buckets are existing registry metadata only.
They are not item types.

The fixed bucket explanations are:

| Classification bucket | `registryInterpretation` fallback | `whyRegistryOnly` fallback |
| --- | --- | --- |
| `unknown_structure` | Recognized legal vocabulary, but its structure is not yet resolved into a stable runtime-safe concept pattern. | This term remains registry-only because its structure is unresolved and it is not admitted to runtime ontology. |
| `derived` | Recognized legal vocabulary interpreted as dependent on underlying concepts rather than as a primary concept. | This term remains registry-only because it is structurally dependent rather than runtime-admitted as a primary concept. |
| `procedural` | Recognized legal vocabulary interpreted as part of legal process, sequence, filing, adjudication, or operational procedure. | This term remains registry-only because its role is procedural rather than runtime-admitted as a primary concept. |
| `carrier` | Recognized legal vocabulary interpreted as context-bearing rather than standalone conceptual structure. | This term remains registry-only because it carries meaning through context or relation rather than as a runtime-admitted standalone concept. |
| `rejected_candidate` | Recognized legal vocabulary that was considered for admission but rejected for structure, scope, clarity, or runtime-safety reasons. | This term remains registry-only because it was evaluated and rejected from runtime admission. |

The source statuses are existing registry metadata only.
They are not item types.

The fixed status explanations are:

| Source status | `whyRegistryOnly` fallback |
| --- | --- |
| `packet_backed` | This term is visible through an authored concept packet, but it remains outside runtime ontology on the registry surface. |
| `registry_only` | This term is visible in the registry only and is not backed by a published concept packet. |

## Legacy Compatibility Map

The following fields remain in the registry payload for compatibility or search behavior only.
They do not add new semantic layers.

| Field | Classification | Replacement field(s) | UI-visible | Removal intent | Note |
| --- | --- | --- | --- | --- | --- |
| `shortMeaning` | `keep` | none | yes | keep | Compact registry-card summary retained for list presentation and search. |
| `definition` | `remove_later` | `meaningInLaw`, `registryInterpretation`, `whyRegistryOnly` | no | remove_later | Legacy compatibility/search text only. The canonical disclosure fields now carry the semantic contract. |
| `boundaryNote` | `alias` | `whyRegistryOnly` | yes | remove_later | Legacy boundary-note surface. The visible boundary note row is now sourced from `whyRegistryOnly`; this field remains for compatibility/search. |

Supporting metadata remains unchanged and is not part of the semantic contract:

- `example`
- `nearMiss`
- `nonGoal`
- `relatedTerms`

## Anti-Drift Rules

- Definition is authoritative and invariant.
- Meaning is a constrained explanation of the same definition, not a competing truth.
- Registry interpretation is structural only.
- Why registry-only is boundary only.
- No label from one item type may appear on the other item type.
- No missing field may be filled by inference, synonym substitution, family text, or nearby registry text.
- No multiple interpretations may be exposed for the same field.
- No extra semantic headings may be introduced without revising this contract.
- No generative prose may be added outside the approved fallback strings.
- Any wording change to an allowed label or fallback string is a contract change.

## Examples

These examples are illustrative only.
They are not additional semantic categories.

### Core Concept Example

```json
{
  "itemType": "core_concept",
  "slug": "authority",
  "shortDefinition": "Recognized standing to direct, decide, or govern within a governance order.",
  "coreMeaning": "Who may direct within a governance order, not what can be made to happen or what counts as valid.",
  "fullDefinition": "Authority refers to recognized standing to make decisions, set direction, or govern within a governance order. It does not mean mere force, influence, or accepted validity."
}
```

### Registry Term Example

```json
{
  "itemType": "registry_term",
  "term": "ab initio",
  "classification": "unknown_structure",
  "family": "Meta / Stress / Edge Terms",
  "meaningInLaw": "From the beginning; in law, treated as starting at the outset.",
  "registryInterpretation": "Recognized legal vocabulary with fixed Latin usage, but not normalized here into a single runtime-safe structural concept.",
  "whyRegistryOnly": "This term remains registry-only because its legal usage is inspectable but it is not admitted to runtime ontology."
}
```

## Freeze Rule

If a future implementation needs a new semantic label, new fallback sentence, or new interpretation layer, this document must be updated first.

Do not improvise semantic labels in UI code.
Do not infer new meanings at render time.
