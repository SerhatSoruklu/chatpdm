# Terms of Service — Runtime Operations

## Scope — Runtime operation boundaries

- concept resolution access
- feedback submission access
- feedback input schema
- response type limits
- comparison output limits

## Data and Behavior — Endpoint access

- The platform allows concept resolution through `GET /api/v1/concepts/resolve?q=...`.
- The platform allows feedback submission through `POST /api/v1/feedback`.

## Data and Behavior — Feedback fields I

- The platform allows feedback field `sessionId`.
- The platform allows feedback field `rawQuery`.
- The platform allows feedback field `normalizedQuery`.
- The platform allows feedback field `responseType`.
- The platform allows feedback field `feedbackType`.

## Data and Behavior — Feedback fields II

- The platform allows feedback field `resolvedConceptId`.
- The platform allows feedback field `candidateConceptIds`.
- The platform allows feedback field `suggestionConceptIds`.
- The platform allows feedback field `contractVersion`.
- The platform allows feedback field `normalizerVersion`.

## Data and Behavior — Feedback fields III

- The platform allows feedback field `matcherVersion`.
- The platform allows feedback field `conceptSetVersion`.

## Data and Behavior — Feedback response types

- The platform allows feedback response type `concept_match`.
- The platform allows feedback response type `ambiguous_match`.
- The platform allows feedback response type `no_exact_match`.

## Data and Behavior — Concept match options

- The platform allows feedback option `clear` for `concept_match`.
- The platform allows feedback option `unclear` for `concept_match`.
- The platform allows feedback option `wrong_concept` for `concept_match`.

## Data and Behavior — Ambiguous match options

- The platform allows feedback option `found_right_one` for `ambiguous_match`.
- The platform allows feedback option `still_not_right` for `ambiguous_match`.

## Data and Behavior — No exact match options

- The platform allows feedback option `expected` for `no_exact_match`.
- The platform allows feedback option `should_exist` for `no_exact_match`.

## Boundaries — Origin and payload constraints

- The platform does not allow CORS requests from origins outside the normalized allowed origin set.
- The platform does not allow feedback payload keys outside the approved field set.
- The platform does not allow unsupported `responseType` values.
- The platform does not allow invalid `feedbackType` and `responseType` combinations.

## Boundaries — Concept match constraints

- The platform does not allow candidate concept IDs on `concept_match` feedback.
- The platform does not allow suggestion concept IDs on `concept_match` feedback.

## Boundaries — Ambiguous match constraints

- The platform does not allow `ambiguous_match` feedback with fewer than two candidate concept IDs.
- The platform does not allow suggestion concept IDs on `ambiguous_match` feedback.

## Boundaries — No exact match constraints

- The platform does not allow candidate concept IDs on `no_exact_match` feedback.

## Boundaries — Comparison constraints

- The platform does not allow comparison output for non-allowlisted concept pairs.
