# Concept Authoring Template

## Scope Metadata

- `conceptId`:
- `title`:
- `domain`:

## Canonical Fields

### `shortDefinition`

### `coreMeaning`

### `fullDefinition`

### `registers.standard`

- `shortDefinition`:
- `coreMeaning`:
- `fullDefinition`:

### `registers.simplified`

- `shortDefinition`:
- `coreMeaning`:
- `fullDefinition`:

### `registers.formal`

- `shortDefinition`:
- `coreMeaning`:
- `fullDefinition`:

### `contexts`

- `label`:
  `explanation`:

### `sources`

- `id`:
  `label`:
  `type`:
  `usedFor`:

### `relatedConcepts`

- `conceptId`:
  `relationType`:

### `reviewMetadata`

- `what_it_is`:
- `what_it_is_not`:
- `must_not_collapse_into`:
- `related_concepts`:
- `contrast_prompts`:

### `aliases`

-

### `normalizedAliases`

-

## Authoring Notes

- `registers.standard.*` must exactly match the top-level canonical prose fields.
- `registers.simplified.*` and `registers.formal.*` must be independently authored, not mechanically derived.
- Use the published packets for `authority`, `power`, `legitimacy`, `duty`, and `responsibility` as the current reference standard for divergence quality.
- Run `npm run validate:register-divergence` before treating a new packet as publishable.
-
