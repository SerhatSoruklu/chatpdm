# Vocabulary Boundary Contract

## Status

All recognized legal vocabulary terms remain outside the ontology.

Recognition alone cannot produce:

- `LIVE`
- `VISIBLE_ONLY`

The current loaded registry contains `3,585` recognized terms across:

- `unknown_structure`
- `derived`
- `procedural`
- `carrier`
- `rejected_candidate`

The count may change as the authored registry changes.
The boundary rules do not.

## Core Rule

Recognized legal vocabulary terms:

- do not enter the ontology
- do not become live concepts
- do not become visible-only concepts
- do not produce concept-match outputs
- do not participate in deterministic system reasoning as vocabulary terms

They are boundary-only elements.

## Admission Contract

At the admission layer, recognized vocabulary has only two allowed outcomes:

- default: `NOT_A_CONCEPT`
- exact rejection-registry precedence: `REJECTED`

That means:

- recognized vocabulary must never be upgraded to `LIVE`
- recognized vocabulary must never be upgraded to `VISIBLE_ONLY`
- exact rejected concepts still retain `REJECTED` precedence when they are also recognized vocabulary

## Resolver Contract

Resolver behavior depends on query shape and rejection precedence:

- exact recognized vocabulary lookups outside the rejection registry may return `VOCABULARY_DETECTED`
- exact rejected concepts that are also recognized vocabulary return `rejected_concept`
- unsupported query shapes involving recognized vocabulary may still return other refusal outputs such as `unsupported_query_type`

What the resolver must never do:

- return `concept_match` because a vocabulary term was recognized
- map vocabulary into live concept outputs implicitly
- use vocabulary recognition as synonym substitution
- admit vocabulary into concept comparisons

Recognition does not imply admission.
Recognition does not imply resolver participation.

## Prohibited Behavior

The following are forbidden:

- automatic promotion of vocabulary to concept
- implicit mapping such as `obligation -> duty`
- synonym substitution inside the resolver
- use of vocabulary as concept-comparison input
- rendering vocabulary as concept cards or concept pages
- attaching core-concept explanatory payloads to vocabulary terms
- exposing vocabulary as resolver-admitted entities

Registry-term boundary entries may expose bounded semantic fields for inspection:

- `itemType: registry_term`
- `meaningInLaw`
- `registryInterpretation`
- `whyRegistryOnly`

These fields are explanatory, not admitting, and they do not convert a registry term into a core concept.

## UI Contract

Vocabulary terms must:

- be displayed as boundary-only plain text
- not link to concept pages because they are vocabulary terms
- not be styled as live or visible-only concepts
- not include core-concept definitions on the vocabulary boundary surface
- keep registry-term semantic fields bounded to inspection text

Mandatory warning:

> Not a core concept. Not used for system reasoning.

## Admission Exception Rule

A vocabulary term may become a concept only if:

1. it is explicitly authored as a concept packet
2. it passes full governance validation
3. it is manually admitted into the ontology
4. it receives its own canonical concept identity

No vocabulary term may bypass this path.

## Separation Guarantee

| Layer | Role | Resolver Access |
| --- | --- | --- |
| Live Concepts | Admitted ontology | Yes |
| Visible-Only Concepts | Defined, not resolvable | No |
| Rejected Concepts | Explicitly excluded | No |
| Vocabulary | Recognized boundary terms | No concept access |

Vocabulary is not part of the ontology.

## Enforcement

This contract is enforced by:

- the recognition registry loader
- the concept admission gate
- the resolver refusal path
- the vocabulary boundary UI constraints
- [verify-vocabulary-boundary-contract.js](/home/serhat/code/chatpdm/backend/scripts/verify-vocabulary-boundary-contract.js)

Any violation is a boundary breach.
