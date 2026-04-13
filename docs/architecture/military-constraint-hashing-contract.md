# Military Constraint Bundle Hashing Contract

This contract defines the canonical hashing rules for the Military Constraints Compiler bundle.

The hash is a bundle-integrity artifact, not a normal runtime rule.
It is validated before any rule evaluation.

## Required behavior

- hash only compiled bundle artifacts
- exclude derived fields from the hash
- refuse if the stored hash does not match the canonical serialization
- treat bundle versions as immutable
- never edit a released bundle in place

## Canonical serialization rules

1. Serialize JSON as UTF-8.
2. Remove derived fields before serialization.
3. Sort object keys lexicographically at every object depth.
4. Preserve declared array order when the schema defines order.
5. Do not sort arrays that are semantically ordered, such as:
   - `precedencePolicy.stageOrder`
   - `authorityGraph.levels`
   - `rules`
   - `sourceRegistrySnapshot`
   - `delegationEdges`
6. Do not allow unordered collections to depend on storage order.
7. Produce the minified JSON string without comments or whitespace padding.
8. Hash the UTF-8 byte sequence with SHA-256.

## Derived fields excluded from hashing

The following fields are integrity outputs and must not be part of the hash input:

- `bundleHash`
- `compiledAt`
- any future validation report fields
- any cache, projection, or human-readability fields added later

If a new derived field is added, it must be explicitly excluded before hashing.

## Deterministic ordering requirements

The following collections must be authored in canonical order before hashing:

- `rules` sorted by `ruleId`, then `version`
- `authorityGraph.levels` sorted from highest rank to lowest rank
- `authorityGraph.delegationEdges` sorted by `edgeId`
- `sourceRegistrySnapshot` sorted by `sourceId`
- `precedencePolicy.stageOrder` fixed to the declared stage order

If the authoring pipeline cannot guarantee canonical order, the bundle is invalid.

## Versioning rule

Bundle versioning is immutable.

Allowed behavior:

- publish a new bundle version
- publish a new hash with the new bundle version
- retire a bundle by status change only if the repository policy allows it

Forbidden behavior:

- editing a released bundle in place
- reusing a bundle version for changed contents
- changing the hash without changing the bundle payload

## Integrity check order

1. parse JSON
2. validate schema
3. canonicalize payload
4. remove derived fields
5. compute SHA-256 hash
6. compare with stored `bundleHash`

Any mismatch is a hard refusal.

