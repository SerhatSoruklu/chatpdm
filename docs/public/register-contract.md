# Register Contract

This document defines the deterministic authoring contract for the public reading registers used on the runtime concept card.

The contract applies only to prose rendering fields. It does not change:

- canonical concept identity
- canonical concept boundaries
- source anchors
- contexts
- related concepts
- integrity references
- resolver behavior

The governing rule is:

- one canonical concept meaning
- three bounded prose registers of that same meaning

No register may be produced by prefixing, synonym swapping, or mechanical transformation of another register.

## Shared Invariants

All three registers must preserve the same concept meaning.

They must agree on:

- concept boundary
- exclusion boundary
- adjacent-concept distinctions
- governance scope where applicable

They may differ only in:

- sentence length
- vocabulary level
- abstraction level
- explanatory scaffolding
- institutional tone

They must not differ in:

- what the concept is
- what the concept is not
- what concept it contrasts with
- which domain boundary controls the definition

## Register Rules

### Standard

Purpose:

- default authored public explanation
- balanced between accessibility and precision

Sentence length band:

- 12 to 22 words

Vocabulary level:

- educated general reader

Abstraction level:

- medium

Allowed phrasing:

- direct declarative prose
- one contrast when needed
- necessary domain terms when they are doing real definitional work

Forbidden phrasing:

- register labels inside prose
- academic padding
- legalistic stacking
- instructional scaffolding such as "in simple terms"

Examples:

- generally avoid
- use only when omission would make the concept boundary unclear

### Simplified

Purpose:

- lower-friction reading of the same concept
- reduce cognitive load without reducing conceptual truth

Sentence length band:

- 8 to 16 words

Vocabulary level:

- everyday language

Abstraction level:

- low to medium

Allowed phrasing:

- short sentences
- explicit subjects and verbs
- one clarifying scaffold when needed
- plain-language unpacking of a technical term

Forbidden phrasing:

- register labels inside prose
- untouched canonical jargon when a plain equivalent exists
- nested clauses
- compressed abstract noun chains
- fake simplification through prefixing

Examples:

- allowed sparingly if they reduce reading friction
- examples must clarify, not broaden scope

### Formal

Purpose:

- institutionally precise rendering of the same concept
- higher precision without doctrinal drift

Sentence length band:

- 18 to 30 words

Vocabulary level:

- technical and bounded

Abstraction level:

- high but disciplined

Allowed phrasing:

- scope clauses
- exclusion clauses
- constitutive phrasing such as "is defined as" or "requires that"
- explicit adjacent-concept boundaries

Forbidden phrasing:

- register labels inside prose
- casual phrasing
- teaching scaffolds
- conversational reassurance
- fake formalization through prefixing

Examples:

- avoid by default
- prefer definitional structure over example-driven explanation

## Zone Rules

### `shortDefinition`

Function:

- one-sentence boundary statement

Requirements:

- state what the concept is
- avoid narrative explanation
- avoid examples
- remain independently readable

By register:

- `standard`: balanced one-sentence definition
- `simplified`: one short sentence or two short linked sentences if needed for clarity
- `formal`: one tightly bounded sentence with scope and exclusion precision

### `coreMeaning`

Function:

- compressed explanation of how the concept operates

Requirements:

- clarify the concept's active logic
- distinguish it from at least one nearby collapse risk when needed
- add understanding beyond `shortDefinition`

By register:

- `standard`: explanatory but controlled
- `simplified`: break dense logic into smaller units
- `formal`: state constitutive logic and exclusion boundary explicitly

### `fullDefinition`

Function:

- full authored explanation of the concept boundary

Requirements:

- preserve the same meaning as the other registers
- make adjacent-concept distinctions explicit
- remain plain text only

By register:

- `standard`: readable explanatory prose
- `simplified`: lower-friction sequence with less nesting and less abstraction
- `formal`: highest precision and strongest boundary language

## Authored Packet Requirements

Each published concept packet must include:

- `shortDefinition`
- `coreMeaning`
- `fullDefinition`
- `registers.standard.shortDefinition`
- `registers.standard.coreMeaning`
- `registers.standard.fullDefinition`
- `registers.simplified.shortDefinition`
- `registers.simplified.coreMeaning`
- `registers.simplified.fullDefinition`
- `registers.formal.shortDefinition`
- `registers.formal.coreMeaning`
- `registers.formal.fullDefinition`

The top-level canonical prose fields remain the canonical baseline.

`registers.standard.*` must match the top-level canonical prose exactly.

`registers.simplified.*` and `registers.formal.*` must be independently authored fields.

## Acceptance Criteria

Phase A and B are complete only if:

- the register contract exists in the repository
- every concept packet carries an authored `registers` object
- `registers.standard.*` matches the top-level canonical prose fields
- prefix-derived register generation is removed from the runtime path
- the runtime response exposes authored register fields directly
- source anchors, contexts, and integrity references remain unchanged
- no layout, styling, or UI structure changes are required to consume the new register data

The following are explicitly out of scope for this phase:

- divergence validation
- UI gating by validation result
- pilot rewrite of differentiated prose
- broad register expansion beyond the migrated model
