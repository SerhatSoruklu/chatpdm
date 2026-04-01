# Legal Vocabulary Recognition Layer

## Purpose

Phase 1 recognizes legal-domain vocabulary without promoting recognized terms into ontology.

This layer exists between normalized language intake and concept admission. It is recognition-only.

## Core Rule

Recognized is not admitted.

The layer may say:

- `recognized = true`
- `type = "vocab"`
- `classification = derived | procedural | carrier | rejected_candidate | unknown_structure`

It must never:

- resolve a term as a concept
- map a term to a primitive
- infer hidden meaning
- upgrade vocabulary into ontology

## Input Contract

Input is `normalizedQuery`, not raw user text.

The recognizer rejects unnormalized input. Phase 0 must run first.

## Output Contract

The recognition layer returns one of two shapes:

```json
{
  "recognized": true,
  "type": "vocab",
  "classification": "procedural"
}
```

```json
{
  "recognized": false,
  "type": "unknown"
}
```

## Classification Meanings

- `derived`: recognized legal term whose role is expressible through existing core primitives or their authored non-primitive surfaces
- `procedural`: recognized legal process, evidence, adjudication, or remedy term
- `carrier`: recognized office, institution, party, status, property, or other legal carrier noun
- `rejected_candidate`: term already known as structurally rejected or only acceptable as non-concept shorthand
- `unknown_structure`: recognized legal vocabulary whose structure remains too broad, meta, or unstable for concept treatment

## Runtime Boundary

Recognition remains boundary-only.

That means:

- explicit rejected concepts still belong to the rejection registry and keep rejection precedence
- live and visible-only concepts still follow the admission-state path
- exact recognized vocabulary lookups may emit `VOCABULARY_DETECTED`
- unsupported query shapes involving recognized vocabulary may still emit other refusal outputs such as `unsupported_query_type`

See [vocabulary-boundary-contract.md](/home/serhat/code/chatpdm/docs/architecture/vocabulary-boundary-contract.md) for the enforced runtime boundary rules.

## Dataset

The current dataset lives at:

- [legal-vocabulary-dataset.txt](/home/serhat/code/chatpdm/data/legal-vocabulary/legal-vocabulary-dataset.txt)

It is grouped by authored headers and parsed into deterministic recognition classes.

Recognition stays surface-bounded:

- authored underscore forms are recognized in both underscore and space-separated form
- live concepts are excluded from the vocabulary registry
- visible-only concepts are excluded from the vocabulary registry
- explicit rejected concepts may still be recognized as `rejected_candidate`

## Governance-Boundary Handling

Some recognized terms remain outside the governance kernel even though they are valid legal vocabulary.

Examples:

- `commitment`
- `promise`
- `undertaking`
- unanchored `breach`

These terms are:

- recognized as vocabulary
- kept at `NOT_A_CONCEPT` in admission
- refused as out-of-scope in runtime unless explicitly anchored to `law` or `duty`
