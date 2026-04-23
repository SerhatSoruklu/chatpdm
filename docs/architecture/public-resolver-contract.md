# Public Resolver Contract

## Purpose

This document records the enforced public resolver contract as it exists now.
It mirrors implemented behavior only.

## Contract Boundary

The public resolver response is built in `buildPublicResolverResponse(...)`, finalized in `finalizeResolvedResponse(...)`, validated by `assertValidProductResponse(...)`, and serialized by the `/resolve` route only after validation passes.

## Required Envelope Fields

| Field | Rule |
| --- | --- |
| `query` | Required string. |
| `normalizedQuery` | Required string. |
| `type` | Required response type. |
| `finalState` | Required contract state. |
| `reason` | Required key. `null` for valid responses; fixed refusal reason for refusal responses. |
| `failedLayer` | Required key. `null` for valid responses; fixed refusal layer for refusal responses. |
| `queryType` | Required query classification. |
| `contractVersion` | Required exact version. |
| `normalizerVersion` | Required exact version. |
| `matcherVersion` | Required exact version. |
| `conceptSetVersion` | Required exact version. |
| `deterministicKey` | Required deterministic hash. |
| `registryVersion` | Required exact version. |
| `policyVersion` | Required exact version. |
| `traceId` | Required non-empty string. |
| `timestamp` | Required ISO-8601 timestamp string. |

## Final State Meanings

| `finalState` | Meaning | Current types |
| --- | --- | --- |
| `valid` | Authored result is returned. | `concept_match`, `comparison` |
| `refused` | No authored result is returned; the response is refusal-only. | `rejected_concept`, `VOCABULARY_DETECTED`, `no_exact_match`, `invalid_query`, `unsupported_query_type`, `ambiguous_match` |

## Required Response Shapes

| `type` | `finalState` | `reason` | `failedLayer` | Required shape notes |
| --- | --- | --- | --- | --- |
| `concept_match` | `valid` | `null` | `null` | `interpretation` must be `null`; `answer` and `resolution` are required. |
| `comparison` | `valid` | `null` | `null` | `mode` must be `comparison`; `interpretation` must be `null`; `comparison` is required. |
| `rejected_concept` | `refused` | `registry_rejection` | `registry` | `interpretation`, `resolution`, `message`, and `rejection` are required. |
| `VOCABULARY_DETECTED` | `refused` | `exposure_boundary` | `exposure` | `interpretation` must be `null`; `resolution`, `message`, and `vocabulary` are required. |
| `no_exact_match` | `refused` | `semantic_no_exact_match` | `semantic` | `interpretation`, `resolution`, `message`, and `suggestions` are required. |
| `invalid_query` | `refused` | `intake_invalid_query` | `intake` | `interpretation`, `resolution`, and `message` are required. |
| `unsupported_query_type` | `refused` | `structure_unsupported_query_type` | `structure` | `interpretation`, `resolution`, and `message` are required. |
| `ambiguous_match` | `refused` | `semantic_ambiguous_match` | `semantic` | `interpretation`, `resolution`, `message`, and `candidates` are required. |

The validator also fixes the allowed `queryType` values and contract message for each row above.

## Deterministic Contract Fields

| Field | Enforced rule |
| --- | --- |
| `deterministicKey` | Derived from `normalizedQuery`, `registryVersion`, and `policyVersion`. |
| `registryVersion` | Must equal `CONCEPT_SET_VERSION`. |
| `policyVersion` | Must equal `CONTRACT_VERSION`. |
| `traceId` | Must be provided explicitly by the resolver context. |
| `timestamp` | Must be provided explicitly by the resolver context. |

## Fail-Fast Rule

- `buildPublicResolverResponse(...)` rejects missing or malformed required transport metadata.
- `finalizeResolvedResponse(...)` validates the built response before the route can serialize it.
- Malformed public responses do not reach `res.json(...)`.

## Frozen Baseline

Phase 1 is frozen. The closeout record is [phase-1-completion-report.md](/home/serhat/code/chatpdm/docs/architecture/phase-1-completion-report.md).

## Non-Goals

- Phase 2 registry-authority semantics
- frontend rendering rules
- legacy full-pipeline regression snapshots
- speculative future contract fields
- historical implementation notes

## Source of Truth

- [`backend/src/modules/concepts/public-response-normalizer.js`](/home/serhat/code/chatpdm/backend/src/modules/concepts/public-response-normalizer.js)
- [`backend/src/lib/product-response-validator.js`](/home/serhat/code/chatpdm/backend/src/lib/product-response-validator.js)
- [`backend/src/modules/concepts/resolver.js`](/home/serhat/code/chatpdm/backend/src/modules/concepts/resolver.js)
- [`backend/src/routes/api/v1/concepts.route.js`](/home/serhat/code/chatpdm/backend/src/routes/api/v1/concepts.route.js)
- [`backend/src/routes/api/v1/__tests__/concepts.route.test.js`](/home/serhat/code/chatpdm/backend/src/routes/api/v1/__tests__/concepts.route.test.js)
- [`backend/scripts/verify-resolver.js`](/home/serhat/code/chatpdm/backend/scripts/verify-resolver.js)
- [`backend/scripts/verify-public-resolver-regression.js`](/home/serhat/code/chatpdm/backend/scripts/verify-public-resolver-regression.js)
