# ChatPDM Initial Concept and Source Model

This document defines the initial data structure before deeper product features are built.

## Purpose

ChatPDM answers should come from a structured meaning layer, not runtime generation.

The runtime will eventually resolve:

`query -> normalized query -> matched concept -> structured answer`

This document covers the content model only.

## Core Entities

### Concept

A concept is the canonical answerable node.

Required fields:

- `slug`
- `title`
- `status`
- `version`
- `domain`
- `aliases`
- `definition.short`
- `definition.full`
- `coreMeaning`
- `sourceReferences`
- `meta`

Optional fields:

- `contexts`
- `relatedConcepts`
- `perspectives`

### Alias

Aliases map user phrasing to a concept.

Examples:

- `authority`
- `what is authority`
- `authority meaning`
- `define authority`

Each alias should be:

- short
- normalization-friendly
- tied to exactly one canonical concept in the first version

### Source Reference

Source references record provenance, not copied source payloads.

Fields:

- `id`
- `label`
- `type`
- `location`
- `usedFor`
- `notes`

Examples:

- dictionary reference
- book reference
- API-backed reference note

### Perspective

Perspectives are optional secondary layers.

They do not replace canonical meaning.

Fields:

- `source`
- `summary`
- `status`
- `notes`

Examples:

- Plato
- Rawls
- Nozick
- Marx

### Metadata

Status and version metadata must exist from the beginning.

Fields:

- `status`
- `version`
- `createdAt`
- `updatedAt`
- `reviewState`

## Canonical Shape

```json
{
  "slug": "authority",
  "title": "Authority",
  "status": "draft",
  "version": 1,
  "domain": "language-concepts",
  "aliases": [
    "authority",
    "what is authority",
    "authority meaning",
    "define authority"
  ],
  "definition": {
    "short": "The recognized right to direct, decide, or govern within a defined structure.",
    "full": "Authority refers to a recognized and accepted right to make decisions, set direction, or govern within a social, legal, institutional, or relational context."
  },
  "coreMeaning": "Legitimate decision-making power within a recognized context.",
  "contexts": [
    "social",
    "institutional",
    "legal",
    "political"
  ],
  "relatedConcepts": [
    "power",
    "legitimacy",
    "responsibility"
  ],
  "sourceReferences": [
    {
      "id": "source-oxford-languages",
      "label": "Oxford Languages",
      "type": "dictionary",
      "location": "licensed-or-editorial-reference",
      "usedFor": "definition grounding",
      "notes": "Reference input only. Runtime copy should use internal wording."
    }
  ],
  "perspectives": [
    {
      "source": "Rawls",
      "summary": "Authority should remain publicly justifiable through fairness.",
      "status": "optional",
      "notes": "Secondary layer only."
    }
  ],
  "meta": {
    "createdAt": "2026-03-27T00:00:00.000Z",
    "updatedAt": "2026-03-27T00:00:00.000Z",
    "reviewState": "editorial-draft"
  }
}
```

## Rules

- Canonical meaning must stay neutral.
- Perspectives must stay secondary.
- Source references describe provenance, not raw copied content.
- One concept should map to one canonical output in the first version.
- Versioning is required from the start so silent drift does not creep in.

## Deferred

Not implemented yet:

- full matching logic
- persistence format decisions
- authoring workflow
- ambiguity handling rules
- runtime rendering contracts
