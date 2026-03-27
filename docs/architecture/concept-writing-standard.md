# Concept Writing Standard v1.0

## 1. Purpose

ChatPDM concepts are authored semantic artifacts.

They are not prose exercises, educational explainers, or conversational responses.

Strict concept writing rules are required because inconsistent authoring would break three system properties at once:

- determinism across authored outputs
- comparability across nearby concepts
- interface consistency across rendered answer blocks

If one concept is written in a neutral structural voice, another in a teaching voice, and another in vague summary language, the system stops behaving like one authored model. It becomes a collection of unrelated texts.

The credibility of ChatPDM does not come from model intelligence. It comes from authored consistency under constraint.

This standard exists to reduce semantic drift across concepts.

## 2. Concept Structure Overview

Each concept is composed of required fields with non-overlapping roles.

### `conceptId` Rules

Purpose:

- stable internal identifier for the canonical concept
- durable reference key for authoring, review, matching, and relations

Not for:

- display rhetoric
- alias experimentation
- descriptive wording

### `title` Rules

Purpose:

- canonical display label for the concept
- stable human-readable name for the authored node

Not for:

- alternative naming
- multi-part headings
- explanatory phrasing

### `shortDefinition` Rules

Purpose:

- first canonical definition statement
- minimum atomic description of what the concept is

Not for:

- examples
- teaching
- narrative expansion
- secondary nuance already handled by later fields

### `coreMeaning` Rules

Purpose:

- structural logic that makes the concept function internally
- clarification of the defining mechanism not already explicit in the short definition

Not for:

- repeating the short definition in different words
- domain-specific application
- examples or illustrations

### `fullDefinition` Rules

Purpose:

- controlled expansion that reduces ambiguity
- boundary clarification, internal structure, and system role

Not for:

- storytelling
- metaphor
- conversational explanation
- filler added for completeness

### `contexts` Rules

Purpose:

- authored domain-level distinctions showing how the concept operates under different constraints
- explicit separation of meaning surfaces that should not be collapsed

Not for:

- examples list
- duplicate restatements of the full definition
- weak subheadings with no structural distinction

### `sources` Rules

Purpose:

- record intellectual grounding and provenance
- show why the concept is justified, not merely asserted

Not for:

- decorative authority signaling
- bibliography padding
- copied source payloads

### `relatedConcepts` Rules

Purpose:

- encode structural relations between concepts
- make dependency, contrast, or extension explicit

Not for:

- vague “see also” dumping
- decorative linking
- implied similarity without a precise relation

Fields are functionally distinct. If two fields do the same job, the concept is not ready.

## 3. Field-Level Writing Rules

### `conceptId`

Rules:

- must be stable once published
- must be singular and canonical
- must not depend on sentence wording
- must not encode explanation or context

### `title`

Rules:

- must be concise and stable
- must name the concept directly
- must avoid qualifiers unless the qualifier is structurally necessary
- must remain usable across all contexts without rewriting

### `shortDefinition`

Rules:

- exactly one sentence
- one atomic relation only
- defines, not describes
- no examples
- no hedging language
- no hidden multi-clause logic
- should follow the form: `[Concept] is [classification + defining constraint]`

Constraints:

- no rhetorical framing
- no motivational language
- no domain-specific application
- no phrases that imply approximation

### `coreMeaning`

Rules:

- one or two sentences maximum
- introduces structural logic not already visible in `shortDefinition`
- explains what makes the concept function internally
- must not restate the definition
- must not introduce examples
- must not introduce domain applications

Constraints:

- should clarify mechanism, constraint, or governing distinction
- should remain abstract enough to apply across contexts
- should not widen the concept beyond the short definition

### `fullDefinition`

Rules:

- two to four short paragraphs
- controlled, non-narrative expansion
- must reduce ambiguity, not merely add words
- should follow this internal structure where possible:
  1. boundary clarification
  2. internal composition or constraints
  3. system role

Constraints:

- no storytelling
- no metaphors
- no “imagine” framing
- no beginner-teaching voice
- no rhetorical transitions used only to sound smooth

### `contexts`

Rules:

- each context must have a domain label and a short explanation
- each context must represent a distinct domain in which the concept operates under different constraints
- contexts must add new meaning, not duplicate the full definition
- contexts must be rejected if they can be merged without loss

Constraints:

- contexts must not overlap heavily
- context labels must be stable and comparable across concepts where relevant
- context explanations must remain short, structural, and non-narrative

### `sources`

Rules:

- every source must provide real intellectual grounding
- every source must have a clear relevance to the concept
- the grounding role of the source must be explainable
- sources must be selected for justification, not decoration

Constraints:

- no decorative source padding
- no vague “trusted source” wording
- no copied source passages as authored concept content
- no source entry without an explicit purpose in the concept

### `relatedConcepts`

Rules:

- every relation must be structural, not decorative
- every relation must be directional
- every relation must be typed
- allowed relation logic in v1 includes:
  - dependency
  - contrast
  - extension

Constraints:

- relation choice must be explainable in one precise sentence
- related concepts must not be added for navigational convenience alone
- relation typing must stay consistent across the concept set

## 4. Tone and Language Rules

Allowed tone:

- neutral
- precise
- structural
- controlled

Not allowed:

- conversational tone
- rhetorical questions
- personal pronouns where avoidable
- motivational language
- storytelling
- AI-assistant filler language
- teaching-voice phrases such as:
  - `basically`
  - `in simple terms`
  - `think of it as`
  - `you can imagine`

The system should feel like a reference engine, not a tutor or chatbot.

## 5. Determinism and Consistency Rules

Cross-concept consistency rules are mandatory:

- similar concepts must be written at similar structural depth
- nearby concepts must remain distinguishable
- no concept may contradict another published concept
- no field may depend on hidden assumptions that are undefined elsewhere
- circular definitions must be avoided unless explicitly handled and justified

The standard is valid only if it reduces semantic drift across concepts.

A concept that reads well but collapses into another concept, duplicates another field, or shifts tone away from the system voice is not valid under this standard.

## 6. Rejection Rules

A concept draft must be rejected when any of the following is true:

- `shortDefinition` is ambiguous or allows multiple readings
- `shortDefinition` contains more than one logical relation
- `coreMeaning` repeats `shortDefinition`
- `coreMeaning` introduces examples or domain drift
- `fullDefinition` is narrative, vague, or padded
- `fullDefinition` increases length without reducing ambiguity
- contexts overlap materially
- contexts restate the full definition rather than distinguishing constraints
- sources are decorative or weakly justified
- related concepts are unclear, decorative, or structurally weak
- tone violates neutrality or control
- the concept cannot be cleanly separated from an existing concept

Rejection is part of the system.

The standard is not defined by what it allows. It is defined by what it can reject consistently.

## 7. Versioning Note

Changes to concept writing rules may require `conceptSetVersion` review.

If the standard changes materially, previously authored concepts may require migration or re-review so the published concept set remains internally consistent.

Changing this standard is a system-level event. It is not a stylistic preference.
