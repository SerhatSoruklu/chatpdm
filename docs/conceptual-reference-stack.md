# Conceptual Reference Stack (v1.1)

## Purpose

ChatPDM has a reference stack of canonical books and PDFs under [chatpdm-reference](/home/serhat/code/chatpdm/chatpdm-reference).

This stack exists to support:

- disciplined concept authoring
- semantic boundary clarity and contrast
- long-term consistency and rigor in canonical concept definitions
- maintaining a neutral, non-biased stance across concept packets

Important:

The reference stack is a guidance tool. It is not an implementation mandate, and it does not authorize runtime or architecture changes by itself.

## Source Inventory and Priority

The reference stack currently contains `14` canonical source folders in the active v1.1 hierarchy.

Primary canonical grounding for v1:

- `rawls`
- `nozick`
- `plato`
- `sandel`
- `soames`
- `carnap`
- `keet`

Secondary or optional perspectives:

- `ataturk`
- `mevlana`
- `quran`
- `marx`
- `allemang-hendler-gandon`
- `priest`
- `cambridge`

Usage note:

Always apply this hierarchy when selecting sources for concept packets. Primary sources are authoritative for canonical definitions. Secondary sources may provide context, bounded comparison, or alternate philosophical framing, but they must not control the canonical definition layer.

## Phase-Based Influence

References have phase-specific roles.

Architecture and contract phases:

- references may clarify semantic distinctions
- they do not justify architecture rewrites or runtime changes

Concept authoring and validation phases:

- references actively support boundary-setting
- references support source-bounded canonical definitions
- references support pairwise contrast and refinement discipline

Runtime and pressure-testing phases:

- references guide analysis of failures, weaknesses, and semantic drift
- they do not authorize hidden inference layers or composition engines

Future expansion phases:

- references may support provenance notes, deeper review, or optional perspective layers
- phase approval is still required before any new runtime or structural capability is implemented

## Authoring Guidance

Use references to:

- sharpen a concept and its boundary
- maintain structural separation from nearby concepts
- ensure consistent source selection in concept packets
- prevent semantic drift across concepts
- keep canonical definitions comparable, neutral, and inspectable

References complement these existing controls:

- [concept-writing-standard.md](/home/serhat/code/chatpdm/docs/architecture/concept-writing-standard.md)
- [concept-review-checklist.md](/home/serhat/code/chatpdm/docs/architecture/concept-review-checklist.md)
- [constraint-contract-checklist.md](/home/serhat/code/chatpdm/docs/architecture/constraint-contract-checklist.md)
- [v1-concept-scope.md](/home/serhat/code/chatpdm/docs/architecture/v1-concept-scope.md)
- [zeroglare-signal-discipline-layer.md](/home/serhat/code/chatpdm/docs/architecture/zeroglare-signal-discipline-layer.md)

They do not replace those controls.

## Local Structured Extracts

Structured full-text extracts used for local reading and source review live under
[chatpdm-sources_json](/home/serhat/code/chatpdm/chatpdm-sources_json).

Their usability is governed by
[source-classification-registry.json](/home/serhat/code/chatpdm/chatpdm-sources_json/source-classification-registry.json),
not by file presence alone.

Current law-side structured extracts now include:

- `the-concept-of-law.json`
- `an-introduction-to-legal-reasoning.json`

Rule:

These extracts are available for bounded source review, but they do not become
primary canonical grounding unless the reference hierarchy is explicitly updated.

Some local structured extracts may also exist for private reading and
comparison work. Those local-only files are not part of the committed
reference surface unless they are explicitly promoted into the repo.

## Explicit Non-Authorization

The reference stack does not authorize:

- ontology engineering such as `OWL` or `RDF`
- graph-database migration
- inference engines
- semantic search expansion
- architecture rewrites
- broad concept expansion beyond the active scope lock
- treating any single source as self-executing canonical truth

Rule:

The phased roadmap remains the controlling structure. References may inform a phase. They do not replace phase controls.

## Codex and Future Session Guardrails

When using the stack in future Codex sessions:

- strengthen authoring discipline and semantic clarity first
- keep implementation tied to the active phase
- do not add runtime capabilities solely because a reference suggests a richer theory
- if a reference exposes a concept weakness, fix it through authoring or validation before architecture
- document possible future capabilities as deferred unless the active phase explicitly allows implementation

Practical maxim:

Use references to deepen rigor, never to expand scope prematurely.

## Recommended Folder Mapping

```text
chatpdm-reference/
├─ rawls/
├─ nozick/
├─ plato/
├─ sandel/
├─ soames/
├─ carnap/
├─ keet/
├─ ataturk/
├─ mevlana/
├─ quran/
├─ marx/
├─ allemang-hendler-gandon/
├─ priest/
└─ cambridge/
```

Note:

Maintain this source mapping for explicit provenance and reproducible concept grounding. `cambridge` is the intended canonical folder name for this stack.

## Key Improvements Over v1

- added the newly active source folders and clarified their priority
- strengthened phase-based usage rules
- made non-authorization rules explicit
- tightened guardrails for future Codex sessions
- aligned the recommended folder mapping with the intended source hierarchy

The purpose of these changes is simple:

reduce scope creep and prevent premature ontology assumptions.
