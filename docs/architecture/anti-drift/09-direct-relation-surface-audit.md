# Lock 9 - Direct Relation Surface Audit

## Purpose

Inventory the direct relation surface after Phases 12.8A through 12.8C and keep the repo honest about where authority lives.

This is an audit artifact, not a capability document. It maps what is enforced, what is documented, what is example-backed, and what is verifier-backed.

## Surface Inventory

| Surface | Location | Status | Notes |
| --- | --- | --- | --- |
| Admission point | `backend/src/modules/concepts/query-shape-classifier.js`, `backend/src/modules/concepts/resolver.js` | authoritative, enforced, verifier-backed | Admits only the narrow `relation_query` shape for `relation between <live concept> and <live concept>` and rejects traversal, chaining, inference, explanation, discovery, and more-than-two-concept wording. |
| Resolver path | `backend/src/modules/concepts/resolver.js` | authoritative, enforced | `resolveDirectRelationReadResponse()` returns either `relation_read` or an honest refusal. There is no partial relation answer path. |
| Exposure authority | `backend/src/modules/concepts/direct-relation-read-types.js` | authoritative, enforced, verifier-backed | `DIRECT_RELATION_READ_EXPOSED_TYPES` is the single public exposure allowlist for the direct relation surface. |
| Ordering normalization | `backend/src/modules/concepts/direct-relation-read-order.js`, `backend/src/modules/concepts/resolver.js` | authoritative, enforced, verifier-backed | Relation entries are normalized by canonical direct-relation type priority and stable authored-field tie-breakers while preserving authored subject/target direction. |
| Field contract authority | `docs/product/response-contract.md`, `docs/product/response-schema.json`, `backend/src/modules/concepts/concept-relation-loader.js` | authoritative, enforced, documented, verifier-backed | The public contract freezes success and refusal fields for `relation_read`. Direct relation entries require `schemaVersion`, `subject`, `type`, `target`, `basis`, `conditions`, `effect`, and `status`; `conditions.when`, `conditions.unless`, and `status.note` are required in the current phase. |
| Refusal shape authority | `docs/product/response-contract.md`, `docs/product/response-schema.json`, `backend/src/modules/concepts/resolver.js` | authoritative, enforced, documented, example-backed, verifier-backed | Relation-read failures reuse the standard `no_exact_match` refusal shape with `relation_not_supported` interpretation. No partial `relation_read` payload is emitted on refusal. |
| Docs | `docs/product/response-contract.md`, `docs/product/schema-validation.md` | documented, authoritative | The contract doc defines the phase law and the allowed direct relation surface. The schema-validation doc explains how the schema and golden discipline support the contract. |
| Schema | `docs/product/response-schema.json` | authoritative, enforced | The runtime validator reads this schema directly. It locks the `relation_read` shape, direct relation entry fields, and refusal response shape. |
| Examples | `docs/product/examples/relation_read.json`, `docs/product/examples/relation_read_refusal.json` | example-backed, verifier-backed | Canonical success and refusal examples for the direct relation surface. |
| Golden fixtures | `tests/golden/fixtures/relation_read_authority_power.json`, `tests/golden/fixtures/relation_read_duty_power_refusal.json` | example-backed, verifier-backed | Approved output commitments for the canonical direct relation success and refusal cases. |
| Verifiers | `backend/scripts/verify-direct-relation-types.js`, `backend/tests/concepts-direct-relation-read.test.js`, `backend/scripts/verify-relation-hardening.js` | verifier-backed, enforced | Checks admission, exposure, ordering, field guarantees, refusal shape, examples, schema alignment, and canonical golden snapshots. |

## Direct Relation Guarantees

The surface is locally coherent around these guarantees:

- one admitted direct relation query shape
- one direct read path over authored relation data
- one public exposure allowlist
- one deterministic ordering rule
- one frozen field contract
- one refusal shape for unsupported direct relation cases
- one canonical success snapshot
- one canonical refusal snapshot

## Remaining Adjacent Inconsistencies

No direct-relation-surface inconsistencies were found in the audited surfaces.

One unrelated repo-wide issue remains outside this surface: the broader `tests/golden/golden_test_runner.py` still reports failures on older non-relation concept fixtures. That is not part of the direct relation surface and was not changed here.

## Coherence Verdict

The direct relation surface is locally coherent:

- admission, exposure, ordering, contract, schema, examples, fixtures, and verifiers all agree on the same bounded surface
- refusals are explicit and structurally stable
- no relation traversal, chaining, explanation, or discovery behavior is present
- the surface is frozen enough to audit without pretending it is broader than it is

