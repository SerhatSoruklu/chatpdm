# ChatPDM v1 Response Contract

## Overview

ChatPDM v1 is a deterministic concept resolution system.

It resolves authored canonical concepts into fixed, structured outputs. It does not generate answers in the core path, does not improvise fallback prose, and does not behave like a chatbot.

This document defines the only allowed product response shapes for ChatPDM v1. Its purpose is to prevent drift between frontend, backend, runtime validation, and concept authoring.

This is a product response contract, not an API failure contract. Internal failures, malformed requests, dependency outages, and transport concerns are handled separately and are outside the scope of this document.

## Determinism Contract

ChatPDM v1 guarantees the following:

- Given the same raw `query` and the same `normalizerVersion`, the system must produce the same `normalizedQuery`.
- Given the same raw `query`, `normalizedQuery`, `matcherVersion`, `conceptSetVersion`, and `contractVersion`, ChatPDM must return the same product outcome, the same `queryType`, the same `interpretation`, and the same canonical answer payload where applicable.
- Transport or debug metadata such as `servedAt`, `requestId`, logs, tracing fields, or headers are excluded from canonical equality.

This is a versioned systems guarantee. It is not branding language.

The guarantee only holds when the declared versions are identical. If normalization logic, matcher logic, concept snapshot, or contract semantics change, the relevant version must also change.

Deterministic equality also includes deterministic array ordering. Ordered arrays such as `contexts`, `sources`, `relatedConcepts`, `suggestions`, `candidates`, and `interpretation.concepts` must remain version-stable under the declared versions.

## Top-Level Response Shape

Every product response in ChatPDM v1 must include the same top-level contract fields:

- `type`
- `query`
- `normalizedQuery`
- `contractVersion`
- `normalizerVersion`
- `matcherVersion`
- `conceptSetVersion`
- `queryType`
- `interpretation`
- `resolution`

Shared top-level skeleton:

```json
{
  "type": "concept_match",
  "query": "what is authority",
  "normalizedQuery": "authority",
  "contractVersion": "v1.1",
  "normalizerVersion": "2026-03-27.v1",
  "matcherVersion": "2026-03-27.v2",
  "conceptSetVersion": "20260327.2",
  "queryType": "exact_concept_query",
  "interpretation": null,
  "resolution": {}
}
```

### Field meanings

- `type`: product outcome type. Only the three documented values are allowed.
- `query`: original user input as received by the product surface. It must be preserved exactly as received and must not be cleaned, trimmed, or rewritten in the response body.
- `normalizedQuery`: deterministic normalized form of `query` under the declared `normalizerVersion`.
- `contractVersion`: version of this response contract and its field semantics.
- `normalizerVersion`: version of the logic that produced `normalizedQuery`.
- `matcherVersion`: version of the logic that resolved the normalized query into a product outcome.
- `conceptSetVersion`: immutable published snapshot of canonical concepts, aliases, related-concept relations, and source metadata used by the runtime.
- `queryType`: deterministic query-shape classification for the current resolver pass.
- `interpretation`: structured, bounded interpretation metadata for the classified query shape. This is not reasoning output. It may be `null` when no interpretation block is needed.
- `resolution`: typed resolution metadata specific to the response type.

### Shared `queryType` vocabulary

ChatPDM v1 product responses allow only:

- `exact_concept_query`
- `canonical_id_query`
- `ambiguity_query`
- `broader_topic_query`
- `subtype_query`
- `comparison_query`
- `relation_query`
- `role_or_actor_query`
- `unsupported_complex_query`

The classifier also uses `invalid_input` internally for rejected non-product requests, but that value does not appear in a product response because invalid requests are handled outside this contract.

### Shared `interpretation` boundary

`interpretation` exists to describe the detected query shape without pretending the runtime has answered beyond authored scope.

Rules:

- `interpretation` must never contain generated explanation beyond the closed meaning of the detected query shape.
- `interpretation` must not invent new canonical concepts.
- `interpretation` must not simulate comparison, relation analysis, or actor resolution.
- `interpretation` may be `null` only when the query already resolves directly to one canonical concept without extra shape explanation.
- Any arrays inside `interpretation` must be deterministic and version-stable.

## Shared `resolution.method` vocabulary

`resolution.method` must use a closed, versioned vocabulary. ChatPDM v1 allows only:

- `exact_alias`
- `normalized_alias`
- `canonical_id`
- `no_exact_match`
- `ambiguous_alias`
- `ambiguous_normalized_alias`
- `author_defined_disambiguation`

Each response type may use only the subset documented in its own section.

## Canonical Payload Boundary

For `concept_match`, the `answer` object is the canonical payload.

This means:

- canonical equality for `concept_match` is evaluated on the product outcome plus the `answer` payload under the declared versions
- `query` and `normalizedQuery` are request identity fields, not canonical meaning content
- `queryType` and `interpretation` are query-shape metadata, not canonical meaning content
- `resolution` is resolution metadata, not canonical meaning content
- transport or debug metadata remains outside canonical equality

This boundary exists so ChatPDM can keep meaning, request echo, query-shape classification, and runtime resolution concerns separate.

## Response Types

Only these three product response types are allowed in ChatPDM v1:

- `concept_match`
- `no_exact_match`
- `ambiguous_match`

No other product outcome types are valid in this phase.

### 1. concept_match

**Purpose**

Return one resolved authored canonical concept.

This is the only response type that returns authoritative canonical meaning.

**Required fields**

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

- must be `null`

`resolution` object:

- `method`: closed enum
  - `exact_alias`
  - `normalized_alias`
  - `canonical_id`
- `conceptId`: stable canonical concept identifier
- `conceptVersion`: integer, immutable published version of the resolved concept within the declared `conceptSetVersion`

`answer` object:

- `title`: canonical concept title
- `shortDefinition`: short editorially constrained definition
- `coreMeaning`: compressed semantic center of the concept
- `fullDefinition`: fuller canonical explanation in plain text only
- `contexts`: array of authored context objects
- `sources`: array of minimal source objects
- `relatedConcepts`: array of curated related concept objects

The `answer` object is the canonical payload boundary. Only fields inside `answer` are part of the canonical meaning surface.

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

### 2. no_exact_match

**Purpose**

Return an honest non-match when no canonical concept exists for the normalized query.

This type exists to preserve product honesty. It must not be turned into a best-effort answer surface.

**Required fields**

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

- `canonical_id_query`
- `broader_topic_query`
- `subtype_query`
- `comparison_query`
- `relation_query`
- `role_or_actor_query`
- `unsupported_complex_query`

`interpretation`:

- must be a structured object
- must describe the detected query shape only

`resolution` object:

- `method`: `"no_exact_match"`

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

Interpretation patterns allowed in this response type include:

- canonical lookup failure
- broader-topic hint
- narrower subtype hint
- unsupported comparison
- unsupported inter-concept relation
- unsupported actor or holder query
- unsupported complex query shape

### 3. ambiguous_match

**Purpose**

Return a disambiguation surface when multiple nearby canonical concepts are plausible and the user must choose explicitly.

**Required fields**

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
6. Render `ambiguous_match` as explicit user choice, never as an already-resolved answer.
7. Render `no_exact_match` honestly even when `suggestions` is empty.
8. Do not re-sort `contexts`, `sources`, `relatedConcepts`, `suggestions`, `candidates`, or `interpretation.concepts` in the UI.
9. Present `interpretation` as bounded system guidance, not as a generated answer.
10. Cache product responses using at least:
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
- `no_exact_match` suggestions must be deterministic and must reference published canonical concepts only
- `ambiguous_match` candidate ordering must be deterministic
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
- comparison synthesis
- relation evaluation
- actor or instance resolution

## Implementation Summary

ChatPDM v1 defines exactly three product response types because the product only needs three canonical product outcomes in this phase:

- one resolved concept
- one honest non-match
- one explicit disambiguation state

Phase 10 adds deterministic query-shape classification on top of those outcomes.

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
- `invalid_input` remains outside the product response contract
- `concept_match` keeps `interpretation: null`
- `no_exact_match` and `ambiguous_match` must keep deterministic interpretation objects
- query-shape classification must not invent new canonical concepts
- comparison, relation, and actor queries remain refusal-first in the current runtime
