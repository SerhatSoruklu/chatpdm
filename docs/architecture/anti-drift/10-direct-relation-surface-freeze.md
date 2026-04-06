# Lock 10 - Direct Relation Surface Freeze

## Freeze Statement

The direct relation surface is frozen at the Phase 12.8A through 12.8C boundary.

It currently supports only:

- the admitted `relation between <two live concepts>` query shape
- authored direct relation reads for exposed relation types
- deterministic direct-relation entry ordering
- the frozen `relation_read` success and `no_exact_match` refusal shapes

It does not support:

- traversal, chaining, or indirect discovery
- explanation or generated prose
- more than two concepts
- additional direct relation types
- relation composition or broader relation answering
- partial relation payloads outside the frozen refusal shape

Drift means any change to:

- the admitted query shape
- the supported or exposed direct relation types
- the normalized relation entry order
- the required field set or refusal shape
- the contract, schema, examples, golden fixtures, or verifiers that freeze this surface

Future expansion is allowed only through a separate phase document with matching contract, schema, examples, golden fixtures, and verifier updates.

Expose authored structure or refuse.

