# Phase 1 Closeout — Deterministic Contract Lock

## Scope

Phase 1 (Deterministic Contract Lock, 50% → 60%) focused on locking the public resolver contract and removing implicit behavior from the public contract path.

It covered the current resolver contract, route-level enforcement, frontend contract consumption, regression locking, and fail-fast validation.

It was explicitly out of scope to redesign:

- Phase 2 registry authority
- concept semantics
- broad telemetry systems
- product feature expansion
- domain widening

## Starting Problem

Before Phase 1, resolver output still carried implicit state in several places.

- public responses did not consistently expose `finalState`
- `reason` / `failedLayer` were not normalized as contract fields
- frontend pages reconstructed meaning locally in a few paths
- response shaping was spread across multiple layers
- route-level confidence was incomplete for the public contract

## What Changed in Phase 1

- Response normalization was centralized in the public resolver normalizer.
- `finalState` became explicit on every public resolver response.
- `reason` and `failedLayer` were normalized and tied to the response type contract.
- `traceId` and `timestamp` were added and required at the public boundary.
- `deterministicKey`, `registryVersion`, and `policyVersion` were added and validated.
- Route-level resolver tests were added for the public contract and failure envelope.
- Schema and failure-path tests were added for malformed contract behavior.
- The runtime page moved to contract-first rendering.
- The landing page moved to contract-first rendering.
- A shared `finalState` render law was introduced for frontend consumption.
- Frontend tests were added for `finalState`-driven rendering.
- A regression lock was added for the major public resolver cases.
- Fail-fast contract enforcement was added before public response serialization.
- Stale regression-lock artifacts were removed.
- A concise internal public contract doc was added.

## What Was Enforced

| Outcome | Where enforced | Where verified |
| --- | --- | --- |
| Strict output schema | `backend/src/lib/product-response-validator.js` | `backend/src/routes/api/v1/__tests__/concepts.route.test.js`, `backend/scripts/verify-resolver.js`, `backend/scripts/verify-public-resolver-regression.js` |
| `finalState` always present | `backend/src/modules/concepts/public-response-normalizer.js` | `backend/src/routes/api/v1/__tests__/concepts.route.test.js`, `backend/scripts/verify-resolver.js`, `backend/scripts/verify-public-resolver-regression.js` |
| `reason` / `failedLayer` normalized | `backend/src/modules/concepts/public-response-normalizer.js`, `backend/src/lib/product-response-validator.js` | `backend/src/routes/api/v1/__tests__/concepts.route.test.js`, `backend/scripts/verify-public-resolver-regression.js`, `docs/architecture/public-resolver-contract.md` |
| Deterministic contract fields present | `backend/src/modules/concepts/public-response-normalizer.js`, `backend/src/modules/concepts/resolver.js`, `backend/src/lib/product-response-validator.js` | `backend/scripts/verify-resolver.js` |
| Malformed contract fails before serialization | `backend/src/modules/concepts/public-response-normalizer.js`, `backend/src/modules/concepts/resolver.js`, `backend/src/routes/api/v1/concepts.route.js` | `backend/src/routes/api/v1/__tests__/concepts.route.test.js`, `backend/scripts/verify-resolver.js` |
| Route boundary directly tested | `backend/src/routes/api/v1/__tests__/concepts.route.test.js` | `backend/src/routes/api/v1/__tests__/concepts.route.test.js` |
| Frontend consumes backend truth only | `frontend/src/app/core/concepts/resolver-rendering.ts`, `frontend/src/app/pages/runtime-page/runtime-page.component.ts`, `frontend/src/app/pages/landing/landing-page.component.ts` | `frontend/src/app/pages/runtime-page/runtime-page.component.spec.ts`, `frontend/src/app/pages/landing/landing-page.component.spec.ts`, Day 21 verification note |
| Major public cases regression-locked | `backend/scripts/verify-public-resolver-regression.js`, `tests/runtime/fixtures/phase-7-public-resolver-locks.json` | `backend/scripts/verify-public-resolver-regression.js` |
| Internal contract doc committed | `docs/architecture/public-resolver-contract.md` | `docs/architecture/phase-1-completion-report.md`, this closeout |

## Public Contract Summary

The frozen Phase 1 public resolver contract is summarized below. Canonical details live in [../../architecture/public-resolver-contract.md](../../architecture/public-resolver-contract.md).

| Contract aspect | Frozen Phase 1 summary |
| --- | --- |
| Required top-level fields | `query`, `normalizedQuery`, `type`, `finalState`, `reason`, `failedLayer`, `queryType`, `contractVersion`, `normalizerVersion`, `matcherVersion`, `conceptSetVersion`, `deterministicKey`, `registryVersion`, `policyVersion`, `traceId`, `timestamp` |
| Required-but-nullable behavior | `reason` and `failedLayer` are required keys. They are `null` for valid responses and fixed refusal values for refusal responses. |
| `finalState` meanings | Phase 1 public resolver responses emit `valid` for `concept_match` / `comparison` and `refused` for the refusal types covered by the contract. |
| Refusal semantics | Refusal responses use fixed reason and failed-layer pairs by type. The canonical mapping is documented in the architecture contract. |
| Deterministic contract fields | `deterministicKey` is derived from `normalizedQuery` + `registryVersion` + `policyVersion`; `registryVersion` and `policyVersion` are fixed exact versions; `traceId` and `timestamp` are explicit required metadata. |

## Backend / Frontend / Assurance Alignment

Phase 1 closed the gap between backend truth, frontend rendering, and confidence tooling.

- The backend now emits an explicit public contract instead of relying on inferred output state.
- The route serializes validated output only; malformed public responses fail before serialization.
- Runtime and landing render from the shared contract-driven `finalState` law instead of reconstructing meaning locally.
- Tests and regression checks now lock the public contract boundary and the frontend consumption law.
- The docs now describe the enforced contract instead of the earlier implicit behavior.

## Remaining Known Weaknesses

- The malformed-JSON route coverage still prints a body-parser `SyntaxError` stack trace while failing closed. It is noisy, but it is not a contract failure.
- Several adjacent Phase 1 assurance scripts overlap in purpose. They remain secondary checks rather than the primary public-contract lock.
- `ambiguous_match` remains outside the first golden regression set because candidate ordering and noise were intentionally deferred in the baseline lock.

## What Phase 2 Now Depends On

Phase 2 should assume the following are already fixed and frozen:

- the public resolver contract baseline
- the frontend contract-consumption law
- the route, regression, and fail-fast assurance surface
- the internal public contract doc
- the removal of the stale legacy regression-lock artifact pair

Phase 2 should not silently change the Phase 1 public contract or the frozen regression baseline.

## Frozen Baseline Statement

Phase 1 is complete. This file records the frozen baseline at the end of Phase 1.

Further work should treat the public resolver contract as locked unless a future phase explicitly changes it through controlled contract evolution.

## Suggested Footer

```text
Phase 1 mission:
Turn current resolver behavior into a locked public contract so backend truth, frontend rendering, and tests all agree without inference.

Phase 1 north-star outcome:
No ambiguity in outputs.
No silent differences between layers.
Client consumes truth, not inference.
```
