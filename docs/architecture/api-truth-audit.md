# API Truth Audit

Audit scope: public `/api` surface only. Implementation truth is authoritative. This pass compares route files, validators, and tests against the current `/api` docs page and records only concrete mismatches.

## Summary

| Surface | Status | Short read |
| --- | --- | --- |
| Runtime | MISMATCH | The docs cover the Concepts and Feedback operations, but they omit the Concepts discovery root route. |
| Feedback | CLEAN | The documented feedback operations and request rules match the service contract. |
| Risk Mapping Governance | MISMATCH | The docs omit implemented root/governance/diff routes and understate the request contract. |
| ZeroGlare Evidence Engine | MISMATCH | The docs cover only the ZEE scaffold and omit the live `zeroglare` analysis surface plus the ZEE discovery root. |
| Military Constraints Compiler | CLEAN | The documented routes, field rules, and refusal boundaries match the current route implementation. |
| `/api` overview / summary counts | CLEAN | The overview is explicitly scoped to the runtime section only, and the counts match that scoped slice. |

## Runtime

| Field | Docs truth | Implementation truth |
| --- | --- | --- |
| Surface name | Runtime / endpoint contract slice on the `/api` page | Concepts route namespace under `backend/src/routes/api/v1/concepts.route.js` |
| Documented endpoints | `GET /api/v1/concepts/resolve`, `POST /api/v1/concepts/resolve`, `GET /api/v1/concepts/:conceptId` | `GET /api/v1/concepts`, `GET /api/v1/concepts/resolve`, `POST /api/v1/concepts/resolve`, `GET /api/v1/concepts/:conceptId` |
| Documented field rules | Query `q`, request body `input`, and route param `conceptId` are documented | Same rules are implemented, plus the discovery route has no input contract |
| Documented refusal boundaries | Invalid query, invalid concept id, and concept not found are documented | Same behavior is implemented |
| Status | MISMATCH | The Concepts discovery route exists but is not listed on the `/api` page. |

### Runtime mismatch

- Endpoint or section: `GET /api/v1/concepts`
- Exact problem: the discovery route is implemented in [concepts.route.js](/home/serhat/code/chatpdm/backend/src/routes/api/v1/concepts.route.js) but the `/api` page only lists the resolve and detail operations in [terms-page.view-model.ts](/home/serhat/code/chatpdm/frontend/src/app/pages/terms-page/terms-page.view-model.ts).
- Why it matters: the public API reference omits the canonical Concepts index route, so users cannot see the full discoverability surface.
- Evidence file(s): [concepts.route.js](/home/serhat/code/chatpdm/backend/src/routes/api/v1/concepts.route.js#L33-L39), [terms-page.view-model.ts](/home/serhat/code/chatpdm/frontend/src/app/pages/terms-page/terms-page.view-model.ts#L246-L313)
- Minimal fix recommendation: add the Concepts root discovery route to the Runtime endpoint table and document its response shape.
- Fix location: docs only

## Feedback

| Field | Docs truth | Implementation truth |
| --- | --- | --- |
| Surface name | Feedback operations are included in the Runtime endpoint contract slice | Feedback route namespace under `backend/src/routes/api/v1/feedback.route.js` |
| Documented endpoints | `GET /api/v1/feedback`, `POST /api/v1/feedback`, `GET /api/v1/feedback/session/:sessionId/export`, `DELETE /api/v1/feedback/session/:sessionId` | Same four endpoints |
| Documented field rules | `sessionId`, `rawQuery`, `normalizedQuery`, `responseType`, `feedbackType`, `resolvedConceptId`, `candidateConceptIds`, `suggestionConceptIds`, `contractVersion`, `normalizerVersion`, `matcherVersion`, `conceptSetVersion` are documented | Same required and conditional fields are enforced, including response-type coupling and cardinality checks |
| Documented refusal boundaries | Invalid feedback payload and invalid feedback session control are documented | Same `400` refusal behavior is implemented |
| Status | CLEAN | The docs page matches the feedback service contract. |

## Risk Mapping Governance

| Field | Docs truth | Implementation truth |
| --- | --- | --- |
| Surface name | Risk Mapping Governance API | Risk mapping route namespace under `backend/src/routes/api/v1/risk-mapping.route.js` |
| Documented endpoints | `GET /api/v1/risk-mapping/explain`, `GET /api/v1/risk-mapping/resolve`, `GET /api/v1/risk-mapping/audit`, and the four registry routes | `GET /api/v1/risk-mapping`, `GET /api/v1/risk-mapping/explain`, `GET /api/v1/risk-mapping/resolve`, `GET /api/v1/risk-mapping/audit`, `GET /api/v1/risk-mapping/governance`, `GET /api/v1/risk-mapping/diff`, and the four registry routes |
| Documented field rules | The docs page only shows `entity` in the Risk Mapping field table | Resolve/explain/audit accept `entity`, `timeHorizon`, `scenarioType`, `domain`, `scope`, and `evidenceSetVersion`; registry routes require `domain` |
| Documented refusal boundaries | No dedicated refusal boundary table is shown for this surface | Invalid query shapes refuse with `invalid_risk_map_query`; missing domain refuses on registry routes; missing diff artifacts return `risk_map_diff_unavailable` |
| Status | MISMATCH | The docs understate both the route set and the request/refusal contract. |

### Risk Mapping mismatch

- Endpoint or section: Risk Mapping Governance API
- Exact problem: the docs omit `GET /api/v1/risk-mapping/`, `GET /api/v1/risk-mapping/governance`, and `GET /api/v1/risk-mapping/diff`, and they only document `entity` even though the request contract accepts and validates the full query set.
- Why it matters: the public reference does not reflect the actual surface area or the real validation contract, so the user-visible contract is incomplete.
- Evidence file(s): [terms-page.view-model.ts](/home/serhat/code/chatpdm/frontend/src/app/pages/terms-page/terms-page.view-model.ts#L79-L90), [terms-page.view-model.ts](/home/serhat/code/chatpdm/frontend/src/app/pages/terms-page/terms-page.view-model.ts#L246-L313), [risk-mapping.route.js](/home/serhat/code/chatpdm/backend/src/routes/api/v1/risk-mapping.route.js#L147-L203)
- Minimal fix recommendation: add the missing route rows, expand the field table to the full query contract, and document the refusal cases already enforced by the router.
- Fix location: docs only

## ZeroGlare Evidence Engine

| Field | Docs truth | Implementation truth |
| --- | --- | --- |
| Surface name | ZeroGlare Evidence Engine API | Two public route namespaces: `zeroglare` and `zee` |
| Documented endpoints | `GET /api/v1/zee/contract`, `GET /api/v1/zee/explain`, `GET /api/v1/zee/audit` | `GET /api/v1/zee`, `GET /api/v1/zee/contract`, `GET /api/v1/zee/explain`, `GET /api/v1/zee/audit`, `GET /api/v1/zeroglare`, `GET /api/v1/zeroglare/analyze`, `POST /api/v1/zeroglare/analyze` |
| Documented field rules | None | `zeroglare` analysis accepts `q` or `body.input` and rejects missing or oversized input |
| Documented refusal boundaries | None explicit | `invalid_zeroglare_input` and `INPUT_TOO_LARGE` are enforced |
| Status | MISMATCH | The docs cover only the static ZEE scaffold and omit the live ZeroGlare analysis surface and the ZEE discovery route. |

### ZeroGlare mismatch

- Endpoint or section: ZeroGlare Evidence Engine API
- Exact problem: the docs section only lists the static ZEE contract/explain/audit routes, while the implementation also exposes `backend/src/routes/api/v1/zeroglare.route.js` and the ZEE discovery route `GET /api/v1/zee`.
- Why it matters: users reading the `/api` page cannot see the actual public ZeroGlare analysis surface or its refusal boundaries, so the documentation underreports the live contract.
- Evidence file(s): [terms-page.view-model.ts](/home/serhat/code/chatpdm/frontend/src/app/pages/terms-page/terms-page.view-model.ts#L110-L120), [terms-page.view-model.ts](/home/serhat/code/chatpdm/frontend/src/app/pages/terms-page/terms-page.view-model.ts#L405-L430), [zeroglare.route.js](/home/serhat/code/chatpdm/backend/src/routes/api/v1/zeroglare.route.js#L56-L79), [zee.route.js](/home/serhat/code/chatpdm/backend/src/routes/api/v1/zee.route.js#L36-L88), [index.js](/home/serhat/code/chatpdm/backend/src/routes/api/v1/index.js#L24-L32)
- Minimal fix recommendation: split the docs into the actual `zeroglare` analysis surface and the static `zee` scaffold, and document the root discovery routes for both.
- Fix location: docs only

## Military Constraints Compiler

| Field | Docs truth | Implementation truth |
| --- | --- | --- |
| Surface name | Military Constraints Compiler API | Military constraints route namespace under `backend/src/routes/api/v1/military-constraints.route.js` |
| Documented endpoints | `GET /api/v1/military-constraints`, `GET /api/v1/military-constraints/packs`, `GET /api/v1/military-constraints/packs/:packId`, `POST /api/v1/military-constraints/evaluate` | Same four endpoints |
| Documented field rules | `packId` and `facts` are documented for evaluation | Same rules are enforced, including pack ID pattern validation, plain-object fact requirements, and schema validation |
| Documented refusal boundaries | Missing `packId` or `facts`, unknown `packId`, malformed facts, invalid enum values, and unsupported request shape are documented | Same refusal behavior is implemented |
| Status | CLEAN | The docs match the current route implementation and refusal-first behavior. |

## `/api` overview / summary counts

| Field | Docs truth | Implementation truth |
| --- | --- | --- |
| Scope | The hero summary explicitly says the counts are scoped to the runtime section only | The view model uses the same runtime slice counts from `termsTruth` |
| Counts shown | 7 public endpoints, 22 field rules, 1 platform rule, 1 runtime boundary, 8 refusal boundaries | Same counts are derived from the typed terms truth rows |
| Status | CLEAN | The summary is accurate for the scoped runtime slice and does not claim a full-page total. |

## Clean patterns worth preserving

- The Military Constraints section is honest about its implemented route set and refusal-first behavior.
- The Feedback surface matches the service contract, including the input-field coupling and refusal cases.
- The overview counts are scoped instead of pretending to be a whole-page inventory.

## Real drift findings

1. Runtime: missing Concepts discovery route documentation.
2. Risk Mapping Governance: missing root/governance/diff routes and under-documented query/refusal contract.
3. ZeroGlare Evidence Engine: docs cover only the scaffolded ZEE subset and omit the live `zeroglare` analysis surface.

## Fix priority

1. Risk Mapping Governance, because it has the largest route and contract gap.
2. ZeroGlare Evidence Engine, because the docs currently hide an entire public analysis surface.
3. Runtime, because the Concepts discovery route is missing from the public reference.

## Overall statement

The `/api` page is partially aligned with implementation truth. Feedback, Military Constraints, and the runtime-only summary counts are aligned. Runtime, Risk Mapping Governance, and ZeroGlare Evidence Engine still have concrete docs gaps that should be fixed in documentation only. No implementation semantics need to change for this audit result.

## Resolution

The `/api` surface has since been updated to match the implementation truth identified in this audit:

- `GET /api/v1/concepts` is now documented in the runtime section.
- Risk Mapping Governance now documents the root, governance, diff, explain, resolve, and registry routes plus the full accepted query contract and refusal boundaries.
- ZeroGlare Evidence Engine now documents the `GET /api/v1/zee` discovery route and the `zeroglare` analysis surface with its request fields and refusal boundaries.
