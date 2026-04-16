# ChatPDM v1 Response Contract

## Overview

ChatPDM v1 is a deterministic concept resolution system.

It resolves authored canonical concepts into fixed, structured outputs. It does not generate answers in the core path, does not improvise fallback prose, and does not behave like a chatbot.

This document defines the only allowed product response shapes for ChatPDM v1. Its purpose is to prevent drift between frontend, backend, runtime validation, and concept authoring.

This is a product response contract, not an API failure contract. Internal failures, malformed requests, dependency outages, and transport concerns are handled separately and are outside the scope of this document.

Current runtime declarations for this contract:

- `contractVersion = "v1.4"`
- `matcherVersion = "2026-03-27.v3"`
- `normalizerVersion = "2026-03-27.v1"`

## Determinism Contract

ChatPDM v1 guarantees the following:

- Given the same raw `query` and the same `normalizerVersion`, the system must produce the same `normalizedQuery`.
- Given the same raw `query`, `normalizedQuery`, `matcherVersion`, `conceptSetVersion`, and `contractVersion`, ChatPDM must return the same product outcome, the same `queryType`, the same `interpretation`, and the same canonical answer payload where applicable.
- Transport or debug metadata such as `servedAt`, `requestId`, logs, tracing fields, or headers are excluded from canonical equality.

This is a versioned systems guarantee. It is not branding language.

The guarantee only holds when the declared versions are identical. If normalization logic, matcher logic, concept snapshot, or contract semantics change, the relevant version must also change.

Deterministic equality also includes deterministic array ordering. Ordered arrays such as `contexts`, `sources`, `relatedConcepts`, `suggestions`, `candidates`, and `interpretation.concepts` must remain version-stable under the declared versions.

## Top-Level Response Shape

Every product response in ChatPDM v1 must include the same shared top-level contract fields:

- `type`
- `query`
- `normalizedQuery`
- `contractVersion`
- `normalizerVersion`
- `matcherVersion`
- `conceptSetVersion`
- `queryType`
- `interpretation`

Shared top-level skeleton:

```json
{
  "type": "concept_match",
  "query": "what is authority",
  "normalizedQuery": "authority",
  "contractVersion": "v1.4",
  "normalizerVersion": "2026-03-27.v1",
  "matcherVersion": "2026-03-27.v3",
  "conceptSetVersion": "20260327.4",
  "queryType": "exact_concept_query",
  "interpretation": null
}
```

### Field meanings

- `type`: product outcome type. Only the documented values are allowed.
- `query`: original user input as received by the product surface. It must be preserved exactly as received and must not be cleaned, trimmed, or rewritten in the response body.
- `normalizedQuery`: deterministic normalized form of `query` under the declared `normalizerVersion`.
- `contractVersion`: version of this response contract and its field semantics.
- `normalizerVersion`: version of the logic that produced `normalizedQuery`.
- `matcherVersion`: version of the logic that resolved the normalized query into a product outcome.
- `conceptSetVersion`: immutable published snapshot of canonical concepts, aliases, related-concept relations, and source metadata used by the runtime.
- `queryType`: deterministic query-shape classification for the current resolver pass.
- `interpretation`: structured, bounded interpretation metadata for the classified query shape. This is not reasoning output. It may be `null` when no interpretation block is needed.
- `resolution`: typed resolution metadata for response types that include a `resolution` object.
- `mode`: fixed top-level mode field used by the `comparison` response shape.

### Shared `queryType` vocabulary

ChatPDM v1 product responses allow only:

- `exact_concept_query`
- `canonical_id_query`
- `ambiguity_query`
- `comparison_query`
- `relation_query`
- `role_or_actor_query`
- `unsupported_complex_query`
- `invalid_query`

### Shared `interpretation` boundary

`interpretation` exists to describe the detected query shape without pretending the runtime has answered beyond authored scope.

Rules:

- `interpretation` must never contain generated explanation beyond the closed meaning of the detected query shape.
- `interpretation` must not invent new canonical concepts.
- `interpretation` must not infer a `baseConcept` for unmatched input unless that base concept is already explicit in the supported query shape itself.
- `interpretation` must not frame unmatched input as a subtype, broader topic, or narrowed form of a canonical concept through heuristic analysis.
- `interpretation` must not simulate comparison, relation analysis, or actor resolution.
- `interpretation` may be `null` only when the query already resolves directly to one canonical concept without extra shape explanation.
- Any arrays inside `interpretation` must be deterministic and version-stable.

## Shared `resolution.method` vocabulary

`resolution.method` must use a closed, versioned vocabulary. ChatPDM v1 allows only:

- `exact_alias`
- `normalized_alias`
- `canonical_id`
- `no_exact_match`
- `out_of_scope`
- `invalid_query`
- `unsupported_query_type`
- `ambiguous_alias`
- `ambiguous_normalized_alias`
- `author_defined_disambiguation`

Each response type may use only the subset documented in its own section.

## Admission Boundary Invariant

The resolver matches `LIVE_CONCEPT_IDS` only.

Visible-only concepts may be publicly listed and inspectable through concept detail, but they are never resolver-admitted or comparison-admitted unless they are explicitly promoted into `LIVE_CONCEPT_IDS`.

## Canonical Payload Boundary

For `concept_match`, the `answer` object is the canonical payload.

This means:

- canonical equality for `concept_match` is evaluated on the product outcome plus the `answer` payload under the declared versions
- `query` and `normalizedQuery` are request identity fields, not canonical meaning content
- `queryType` and `interpretation` are query-shape metadata, not canonical meaning content
- `resolution` is resolution metadata, not canonical meaning content
- transport or debug metadata remains outside canonical equality

This boundary exists so ChatPDM can keep meaning, request echo, query-shape classification, and runtime resolution concerns separate.

## Governance Scope Policy Hook

Some canonical concepts in ChatPDM v1 are domain-scoped rather than universal.

In the current seed set, `authority`, `power`, and `legitimacy` are governance-scoped canonical concepts.

This means:

- they must not be presented as domain-neutral or universally exhaustive across all human uses of those words
- documentation and UI/API surfaces must preserve their governance-domain scope
- future comparison and relation outputs must preserve that same scope
- clearly non-governance uses may return `no_exact_match` with `resolution.method = "out_of_scope"`

This contract currently governs response shape, not full domain-policy enforcement. The governing scope policy lives in the authored concept packets and supporting product documentation.

## Response Types

ChatPDM v1 currently allows these four product response types:

- `concept_match`
- `comparison`
- `no_exact_match`
- `ambiguous_match`

No other product outcome types are valid in this phase.

### 1. concept_match

#### Purpose (concept_match)

Return one resolved authored canonical concept.

This is the only response type that returns authoritative canonical meaning.

#### Required fields (concept_match)

Top-level:

- `type`: `"concept_match"`
- `query`
- `normalizedQuery`
- `contractVersion`
- `normalizerVersion`
- `matcherVersion`
- `conceptSetVersion`
- `queryType`
- `interpretation`
- `resolution`
- `answer`

Allowed `queryType` values:

- `exact_concept_query`
- `canonical_id_query`

`interpretation`:

- must be a deterministic interpretation object with:
  - `interpretationType = "explicitly_rejected_concept"`
  - `targetConceptId`
  - `concepts`
  - `message`

`resolution` object:

- `method`: closed enum
  - `exact_alias`
  - `normalized_alias`
  - `canonical_id`
- `conceptId`: stable canonical concept identifier
- `conceptVersion`: integer, immutable published version of the resolved concept within the declared `conceptSetVersion`

`answer` object:

- `itemType`: `"core_concept"`
- `title`: canonical concept title
- `shortDefinition`: short editorially constrained definition
- `coreMeaning`: compressed semantic center of the concept
- `fullDefinition`: fuller canonical explanation in plain text only
- `governanceState`: validator-derived governance and law-enforcement state for the resolved concept at response time
- `registers`: authored public reading registers bound to the same canonical concept
- `contexts`: array of authored context objects
- `sources`: array of minimal source objects
- `relatedConcepts`: array of curated related concept objects

The `answer` object is the canonical payload boundary. Only fields inside `answer` are part of the canonical meaning surface.

`answer.governanceState` is validator-derived contract metadata. It must be copied from validator output exactly as served and must not be recomputed, rewritten, or decorated in the runtime surface.

`answer.governanceState` object fields:

- `source`
- `available`
- `validationState`
- `v3Status`
- `relationStatus`
- `lawStatus`
- `enforcementStatus`
- `systemValidationState`
- `isBlocked`
- `isStructurallyIncomplete`
- `isFullyValidated`
- `isActionable`
- `trace`

`answer.registers` object fields:

- `readOnly`
- `canonicalBinding`
- `validation`
- `standard` (always present)
- `simplified` when exposed by `availableModes`
- `formal` when exposed by `availableModes`

`answer.registers.canonicalBinding` object fields:

- `conceptId`
- `conceptVersion`
- `canonicalHash`

Each exposed register object contains:

- `shortDefinition`
- `coreMeaning`
- `fullDefinition`

`answer.registers.validation` object fields:

- `availableModes`
- `modes`

Each validation mode object contains:

- `status`
- `reasons`

`answer.registers.standard` must always be present and must preserve the same prose as the top-level canonical fields.

`answer.registers.simplified` and `answer.registers.formal` are separately authored renderings of the same concept meaning. They are present only when their mode name appears in `answer.registers.validation.availableModes`. They must not be produced through runtime rewriting or prefix-derived overlays.

Only registers listed in `answer.registers.validation.availableModes` may be exposed in the UI or serialized on the runtime surface. If validation collapses to `standard` only, the public surface must render `standard` only and omit the other register fields.

`answer.contexts` object fields:

- `label`
- `appliesTo`

`answer.sources` object fields:

- `id`
- `label`
- `type`
- `usedFor`

Allowed `answer.sources.type` values:

- `dictionary`
- `book`
- `paper`
- `law`
- `article`
- `internal`

`answer.relatedConcepts` object fields:

- `conceptId`
- `title`
- `relationType`

Allowed `relationType` values:

- `see_also`
- `prerequisite`
- `extension`
- `contrast`

### 2. comparison

#### Purpose (comparison)

Return a deterministic authored comparison for an allowlisted pair of canonical concepts.

This is a bounded comparison surface. It is not freeform comparative reasoning and it must not synthesize new meaning beyond authored axes.

#### Required fields (comparison)

Top-level:

- `type`: `"comparison"`
- `mode`: `"comparison"`
- `query`
- `normalizedQuery`
- `contractVersion`
- `normalizerVersion`
- `matcherVersion`
- `conceptSetVersion`
- `queryType`
- `interpretation`
- `comparison`

Allowed `queryType` values:

- `comparison_query`

`interpretation`:

- must be `null`

`comparison` object:

- `conceptA`: first concept in the normalized authored pair
- `conceptB`: second concept in the normalized authored pair
- `axes`: deterministic ordered comparison axes

`comparison.axes` object fields:

- `axis`
- `A`
- `B`

For statement-only axes:

- `axis`
- `statement`

The `comparison` object is the canonical payload boundary for this response type.

### 3. rejected_concept

#### Purpose (rejected_concept)

Return an explicit refusal when the normalized query targets a concept recorded in the permanent rejection registry.

This type exists to make structural rejections first-class in the product contract. It must not be collapsed into generic `no_exact_match`.

#### Required fields (rejected_concept)

Top-level:

- `type`: `"rejected_concept"`
- `query`
- `normalizedQuery`
- `contractVersion`
- `normalizerVersion`
- `matcherVersion`
- `conceptSetVersion`
- `queryType`
- `interpretation`
- `resolution`
- `message`
- `rejection`

Allowed `queryType` values:

- `exact_concept_query`
- `canonical_id_query`

`interpretation`:

- must be `null`

`resolution` object:

- `method`: `"rejection_registry"`
- `conceptId`

`message`:

- fixed canonical text for v1: `"This concept is structurally rejected under the current system state."`

`rejection` object fields:

- `status`: `"REJECTED"`
- `decisionType`: `"STRUCTURAL_REJECTION"`
- `finality`

### 4. no_exact_match

#### Purpose (no_exact_match)

Return an honest non-match when no canonical concept exists for the normalized query.

This type exists to preserve product honesty. It must not be turned into a best-effort answer surface.

#### Required fields (no_exact_match)

Top-level:

- `type`: `"no_exact_match"`
- `query`
- `normalizedQuery`
- `contractVersion`
- `normalizerVersion`
- `matcherVersion`
- `conceptSetVersion`
- `queryType`
- `interpretation`
- `resolution`
- `message`
- `suggestions`

Allowed `queryType` values:

- `exact_concept_query`
- `canonical_id_query`
- `ambiguity_query`
- `comparison_query`
- `relation_query`
- `role_or_actor_query`
- `unsupported_complex_query`

`interpretation`:

- must be a structured object
- must describe the detected query shape only

`resolution` object:

- `method`: closed enum
  - `"no_exact_match"`
  - `"out_of_scope"`

`message`:

- fixed canonical text for v1: `"No exact canonical concept match was found for this query."`

`suggestions` array object fields:

- `conceptId`
- `title`
- `reason`

Allowed `reason` values:

- `similar_term`
- `broader_topic`
- `related_concept`

`broader_topic` suggestions are non-semantic guidance only.

They must:

- come from authored mappings only
- remain suggestion metadata rather than interpretation framing
- not create a `baseConcept` or subtype reading for the unmatched query
- not influence resolver concept selection

Interpretation patterns allowed in this response type include:

- validator-law blocked canonical concept
- canonical lookup failure
- visible-only public concept not admitted to live runtime
  Derived concepts that are fully computable from admitted primitives must use this visible-only refusal surface rather than live concept matching. `violation` is the canonical v1 example.
- governance-scope out-of-scope refusal
- governance-scope clarification
- unsupported comparison
- unsupported inter-concept relation
- unsupported actor or holder query
- unsupported complex query shape

### 5. ambiguous_match

#### Purpose (ambiguous_match)

Return a disambiguation surface when multiple nearby canonical concepts are plausible and the user must choose explicitly.

#### Required fields (ambiguous_match)

Top-level:

- `type`: `"ambiguous_match"`
- `query`
- `normalizedQuery`
- `contractVersion`
- `normalizerVersion`
- `matcherVersion`
- `conceptSetVersion`
- `queryType`
- `interpretation`
- `resolution`
- `message`
- `candidates`

Allowed `queryType` values:

- `ambiguity_query`

`interpretation`:

- must be a structured object
- must identify the ambiguous candidate set without resolving it

`resolution` object:

- `method`: closed enum
  - `ambiguous_alias`
  - `ambiguous_normalized_alias`
  - `author_defined_disambiguation`

`message`:

- fixed canonical text for v1: `"Multiple canonical concepts match this query. Choose one to continue."`

`candidates` array object fields:

- `conceptId`
- `title`
- `shortDefinition`
- `basis`

Allowed `basis` values:

- `shared_alias`
- `normalized_overlap`
- `author_defined_disambiguation`

## Frontend Rendering Rules

The frontend must follow these rules exactly:

1. Branch strictly on `type`.
2. Do not render undocumented fields.
3. Do not merge blocks or invent missing meaning.
4. Do not reorder the canonical `concept_match` answer blocks.
5. Treat all canonical text fields as plain text in v1.
6. Render `comparison` as a structured authored comparison, never as generated prose.
7. Render `ambiguous_match` as explicit user choice, never as an already-resolved answer.
8. Render `rejected_concept` as an explicit permanent refusal, never as a generic non-match.
9. Render `no_exact_match` honestly even when `suggestions` is empty.
10. Do not re-sort `contexts`, `sources`, `relatedConcepts`, `suggestions`, `candidates`, `comparison.axes`, or `interpretation.concepts` in the UI.
11. Present `interpretation` as bounded system guidance, not as a generated answer.
12. Cache product responses using at least:

    - `normalizedQuery`
    - `contractVersion`
    - `normalizerVersion`
    - `matcherVersion`
    - `conceptSetVersion`

The frontend must not treat the response as chatbot output. It is a structured resolution surface with deterministic query-shape metadata.

## Backend Validation Rules

The backend must enforce these rules:

- strict JSON Schema validation is required
- `additionalProperties: false` is expected on every defined object
- all declared version fields are mandatory
- `query` must be preserved exactly as received
- `normalizedQuery` must be reproducible under the declared `normalizerVersion`
- `queryType` must be reproducible under the declared `matcherVersion`
- `interpretation` must remain deterministic under the declared `matcherVersion`
- matcher behavior must be deterministic under the declared `matcherVersion`
- `conceptSetVersion` must refer to an immutable published snapshot, not an informal label
- `concept_match` must only return published canonical concepts
- `rejected_concept` must only return concepts recorded in the rejection registry
- `comparison` must only return authored allowlisted comparison pairs
- `no_exact_match` suggestions must be deterministic and must reference published canonical concepts only
- `ambiguous_match` candidate ordering must be deterministic
- `comparison` axis ordering must be deterministic
- all ordered arrays must remain deterministic and version-stable

Schema validation, versioning discipline, and golden tests are not optional if ChatPDM wants to claim deterministic behavior.

## Non-Goals

ChatPDM v1 product responses do not include:

- generation
- conversation memory
- personalization
- perspectives
- opinions
- hidden reasoning
- best-effort fallback prose
- confidence or probability theater
- rich formatting assumptions inside canonical text fields
- relation evaluation
- actor or instance resolution

## Implementation Summary

ChatPDM v1 currently defines four product response types:

- one resolved concept
- one deterministic authored comparison
- one honest non-match
- one explicit disambiguation state

Phase 10 adds deterministic query-shape classification on top of those outcomes.
Phase 11 adds deterministic comparison output for authored allowlisted pairs.

This means ChatPDM can now say:

- what kind of query the user asked
- whether that query points toward a subtype, comparison, relation, or actor-oriented request
- where the authored runtime stops

It still does not claim to reason compositionally or answer beyond authored scope.

That separation keeps the contract inspectable and stops the runtime from drifting into chatbot behavior.

## Decisions Locked in Phase 10

The following contract decisions are locked for Phase 10:

- `queryType` is a required top-level field on every product response
- `interpretation` is a required top-level field on every product response
- `interpretation` is structured guidance, not reasoning output
- `invalid_query` is a first-class product refusal type
- `concept_match` keeps `interpretation: null`
- `rejected_concept` must keep `interpretation.interpretationType = "explicitly_rejected_concept"`
- `no_exact_match`, `invalid_query`, `unsupported_query_type`, and `ambiguous_match` must keep deterministic interpretation objects
- query-shape classification must not invent new canonical concepts
- allowlisted comparison queries may return deterministic comparison output
- relation and actor queries remain refusal-first in the current runtime
