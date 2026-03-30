# Acceptable Use

Implementation-backed view over allowed runtime use, refusal boundaries, and feedback-surface constraints.

## Scope — Confirmed acceptable-use evidence

- public concept resolution access
- comparison output limited to authored allowlisted pairs
- refusal of unsupported query forms and out-of-scope usage
- feedback submission and session-bound feedback controls

## Runtime Scope

- The platform allows concept resolution through `GET /api/v1/concepts/resolve?q=...`.
- The platform allows comparison output only for authored allowlisted concept pairs with authored comparison axes.
- The platform allows feedback submission through `POST /api/v1/feedback`.
- The platform allows feedback export by `sessionId`.
- The platform allows feedback deletion by `sessionId`.

## Unsupported or Refused Use

- The platform refuses concept resolution requests when query parameter `q` is missing.
- The platform refuses concept resolution requests when query parameter `q` is empty.
- The platform refuses concept resolution requests when query parameter `q` is not a string.
- The platform refuses unsupported complex queries.
- The platform refuses relation queries.
- The platform refuses role or actor queries.
- The platform refuses canonical lookup requests when no authored concept ID is provided.
- The platform refuses canonical lookup requests when no authored concept exists for the requested ID.
- The platform refuses comparison output for non-allowlisted concept pairs by returning `no_exact_match`.
- The platform refuses non-governance usage of governance-scoped concepts by returning `no_exact_match`.

## Feedback Surface Boundaries

- The platform exposes feedback operations `submit`, `export_by_session`, and `delete_by_session`.
- The platform allows only `concept_match`, `ambiguous_match`, and `no_exact_match` as feedback `responseType` values.
- The platform allows feedback options only from the response-type-specific allowlist.
- The platform refuses feedback payload keys outside the approved field set.
- The platform refuses invalid `feedbackType` and `responseType` combinations.
- The platform refuses candidate or suggestion concept IDs on `concept_match` feedback.
- The platform refuses `ambiguous_match` feedback with fewer than two candidate concept IDs.
- The platform refuses suggestion concept IDs on `ambiguous_match` feedback.
- The platform refuses candidate concept IDs on `no_exact_match` feedback.
- The platform refuses invalid feedback submissions with HTTP `400`.
- The platform refuses invalid feedback submissions with error code `invalid_feedback`.
- The platform refuses invalid feedback session control requests with error code `invalid_feedback_session_control`.
- The platform refuses session control requests when `sessionId` is not a non-empty string.

## Boundary Model

This file keeps supported runtime actions, refused runtime actions, and unsupported compositions separate.

Comparison output, feedback controls, and refusal outputs are reported as current product behavior, not as broad conduct enforcement.

## Implementation Guardrails

This file reports current runtime-use boundaries only.

No broad moderation, trust-and-safety, or platform-wide policing claim is made without direct trace anchors in this repo.

## Trace Anchors

- `backend/src/routes/api/v1/concepts.route.js:8-41`
- `backend/src/modules/concepts/query-shape-classifier.js:165-210,279-365`
- `backend/src/modules/concepts/comparison-resolver.js:3-55`
- `backend/src/modules/concepts/resolver.js:87-133`
- `backend/src/modules/concepts/governance-scope-enforcer.js:3-136`
- `backend/src/modules/feedback/constants.js:3-8`
- `backend/src/modules/feedback/service.js:41-146,170-227`
- `backend/src/routes/api/v1/feedback.route.js:12-93`
