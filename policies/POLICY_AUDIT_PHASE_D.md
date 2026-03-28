# POLICY_AUDIT_PHASE_D.md

Phase D traceability pass for current Phase C policy drafts.

Inputs:

- `policies/privacy.md`
- `policies/terms.md`
- `policies/cookies.md`
- `policies/POLICY_AUDIT_PHASE_B.md`

## 1. Phase D Notes

- Phase D is the authoritative rendered-policy trace layer.
- This file traces current Phase C claim sentences only.
- Scope bullets are excluded as non-claim text.
- SSR annotation fragments are excluded as non-claim text.
- Excluded SSR annotation fragments:
  - `internal SSR proxy transport only`
  - `not third-party disclosure`
- Each traced sentence maps to one Phase B canonical claim.
- Each traced sentence maps to one concrete implementation element.
- Internal SSR forwarding remains product-internal transport only.
- Non-claim text is excluded by rule, not by omission.

## 2. Privacy Policy Traceability

|Policy File|Section|Policy Sentence|Canonical Claim|Claim Class|System Mapping|Status|Notes|
|---|---|---|---|---|---|---|---|
|`privacy.md`|`Data Storage — Feedback event fields I`|The platform stores `sessionId` in feedback event documents.|The platform stores `sessionId` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js:7-11`; `backend/src/modules/feedback/store.js:5-20`|`mapped`||
|`privacy.md`|`Data Storage — Feedback event fields I`|The platform stores `rawQuery` in feedback event documents.|The platform stores `rawQuery` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js:12-16`; `backend/src/modules/feedback/store.js:5-20`|`mapped`||
|`privacy.md`|`Data Storage — Feedback event fields I`|The platform stores `normalizedQuery` in feedback event documents.|The platform stores `normalizedQuery` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js:17-21`; `backend/src/modules/feedback/store.js:5-20`|`mapped`||
|`privacy.md`|`Data Storage — Feedback event fields I`|The platform stores `responseType` in feedback event documents.|The platform stores `responseType` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js:22-26`; `backend/src/modules/feedback/store.js:5-20`|`mapped`||
|`privacy.md`|`Data Storage — Feedback event fields I`|The platform stores `feedbackType` in feedback event documents.|The platform stores `feedbackType` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js:27-31`; `backend/src/modules/feedback/store.js:5-20`|`mapped`||
|`privacy.md`|`Data Storage — Feedback event fields II`|The platform stores `resolvedConceptId` in feedback event documents when provided.|The platform stores `resolvedConceptId` in feedback event documents when provided.|`stores`|`backend/src/modules/feedback/feedback-event.model.js:32-36`; `backend/src/modules/feedback/store.js:5-20`|`mapped`||
|`privacy.md`|`Data Storage — Feedback event fields II`|The platform stores `candidateConceptIds` in feedback event documents when provided.|The platform stores `candidateConceptIds` in feedback event documents when provided.|`stores`|`backend/src/modules/feedback/feedback-event.model.js:37-40`; `backend/src/modules/feedback/store.js:5-20`|`mapped`||
|`privacy.md`|`Data Storage — Feedback event fields II`|The platform stores `suggestionConceptIds` in feedback event documents when provided.|The platform stores `suggestionConceptIds` in feedback event documents when provided.|`stores`|`backend/src/modules/feedback/feedback-event.model.js:41-44`; `backend/src/modules/feedback/store.js:5-20`|`mapped`||
|`privacy.md`|`Data Storage — Feedback event fields II`|The platform stores `contractVersion` in feedback event documents.|The platform stores `contractVersion` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js:45-49`; `backend/src/modules/feedback/store.js:5-20`|`mapped`||
|`privacy.md`|`Data Storage — Feedback event fields II`|The platform stores `normalizerVersion` in feedback event documents.|The platform stores `normalizerVersion` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js:50-54`; `backend/src/modules/feedback/store.js:5-20`|`mapped`||
|`privacy.md`|`Data Storage — Feedback event fields III`|The platform stores `matcherVersion` in feedback event documents.|The platform stores `matcherVersion` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js:55-59`; `backend/src/modules/feedback/store.js:5-20`|`mapped`||
|`privacy.md`|`Data Storage — Feedback event fields III`|The platform stores `conceptSetVersion` in feedback event documents.|The platform stores `conceptSetVersion` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js:60-64`; `backend/src/modules/feedback/store.js:5-20`|`mapped`||
|`privacy.md`|`Data Storage — Feedback event fields III`|The platform stores `createdAt` in feedback event documents.|The platform stores `createdAt` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js:65-69`; `backend/src/modules/feedback/service.js:136-142`|`mapped`||
|`privacy.md`|`Data Storage — Browser local storage`|The platform stores a feedback session identifier in browser local storage under `chatpdm-beta-session-id`.|The platform stores a feedback session identifier in browser local storage under `chatpdm-beta-session-id`.|`stores`|`frontend/src/app/core/feedback/feedback-session.service.ts:4,16-18,23-33`|`mapped`|Browser-side storage.|
|`privacy.md`|`Data Handling — Internal proxy transport`|The platform shares incoming `x-forwarded-for` headers with the API proxy target through the SSR layer.|The platform shares incoming `x-forwarded-for` headers with the API proxy target through the SSR layer.|`shares`|`frontend/src/server.ts:123-145`|`mapped`|internal SSR transport only|
|`privacy.md`|`Behavior Controls — Backend request controls`|The platform enforces Helmet security middleware on backend requests.|The platform enforces Helmet security middleware on backend requests.|`enforces`|`backend/src/app.js:17-20`|`mapped`||
|`privacy.md`|`Behavior Controls — Backend request controls`|The platform enforces CORS on backend requests.|The platform enforces CORS on backend requests.|`enforces`|`backend/src/app.js:26-27`|`mapped`||
|`privacy.md`|`Behavior Controls — Backend request controls`|The platform enforces backend JSON body size limits of `64kb`.|The platform enforces backend JSON body size limits of `64kb`.|`enforces`|`backend/src/app.js:26-27`|`mapped`||
|`privacy.md`|`Behavior Controls — Backend request controls`|The platform enforces SSR `/api/*` JSON body size limits of `32kb`.|The platform enforces SSR `/api/*` JSON body size limits of `32kb`.|`enforces`|`frontend/src/server.ts:43-45`|`mapped`||
|`privacy.md`|`Behavior Controls — CORS settings`|The platform enforces CORS credentials.|The platform enforces CORS credentials.|`enforces`|`backend/src/security/cors.js:6-27`|`mapped`||
|`privacy.md`|`Behavior Controls — CORS settings`|The platform enforces CORS methods `GET`, `POST`, and `OPTIONS`.|The platform enforces CORS methods `GET`, `POST`, and `OPTIONS`.|`enforces`|`backend/src/security/cors.js:22-26`|`mapped`||
|`privacy.md`|`Behavior Controls — CORS settings`|The platform enforces CORS headers `Content-Type` and `Accept`.|The platform enforces CORS headers `Content-Type` and `Accept`.|`enforces`|`backend/src/security/cors.js:22-26`|`mapped`||
|`privacy.md`|`Behavior Controls — CORS settings`|The platform enforces CORS `maxAge` of `86400`.|The platform enforces CORS `maxAge` of `86400`.|`enforces`|`backend/src/security/cors.js:22-26`|`mapped`||
|`privacy.md`|`Boundaries — Invalid request refusal`|The platform refuses concept resolution requests when query parameter `q` is missing.|The platform refuses concept resolution requests when query parameter `q` is missing.|`refuses`|`backend/src/routes/api/v1/concepts.route.js:16-27`|`mapped`|Shared validation branch.|
|`privacy.md`|`Boundaries — Invalid request refusal`|The platform refuses concept resolution requests when query parameter `q` is empty.|The platform refuses concept resolution requests when query parameter `q` is empty.|`refuses`|`backend/src/routes/api/v1/concepts.route.js:16-27`|`mapped`|Shared validation branch.|
|`privacy.md`|`Boundaries — Invalid request refusal`|The platform refuses concept resolution requests when query parameter `q` is not a string.|The platform refuses concept resolution requests when query parameter `q` is not a string.|`refuses`|`backend/src/routes/api/v1/concepts.route.js:16-27`|`mapped`|Shared validation branch.|
|`privacy.md`|`Boundaries — Invalid request refusal`|The platform refuses invalid feedback submissions with HTTP `400`.|The platform refuses invalid feedback submissions with HTTP `400`.|`refuses`|`backend/src/routes/api/v1/feedback.route.js:16-28`|`mapped`||
|`privacy.md`|`Boundaries — Invalid request refusal`|The platform refuses invalid feedback submissions with error code `invalid_feedback`.|The platform refuses invalid feedback submissions with error code `invalid_feedback`.|`refuses`|`backend/src/routes/api/v1/feedback.route.js:21-27`|`mapped`||
|`privacy.md`|`Boundaries — Unsupported query refusal`|The platform refuses unsupported complex queries.|The platform refuses unsupported complex queries.|`refuses`|`backend/src/modules/concepts/query-shape-classifier.js:191-195`|`mapped`||
|`privacy.md`|`Boundaries — Unsupported query refusal`|The platform refuses relation queries.|The platform refuses relation queries.|`refuses`|`backend/src/modules/concepts/query-shape-classifier.js:173-179`|`mapped`||
|`privacy.md`|`Boundaries — Unsupported query refusal`|The platform refuses role or actor queries.|The platform refuses role or actor queries.|`refuses`|`backend/src/modules/concepts/query-shape-classifier.js:182-188`|`mapped`||
|`privacy.md`|`Boundaries — Unsupported query refusal`|The platform refuses canonical lookup requests when no authored concept ID is provided.|The platform refuses canonical lookup requests when no authored concept ID is provided.|`refuses`|`backend/src/modules/concepts/query-shape-classifier.js:198-204`|`mapped`||
|`privacy.md`|`Boundaries — Unsupported query refusal`|The platform refuses canonical lookup requests when no authored concept exists for the requested ID.|The platform refuses canonical lookup requests when no authored concept exists for the requested ID.|`refuses`|`backend/src/modules/concepts/query-shape-classifier.js:206-210`|`mapped`||
|`privacy.md`|`Boundaries — Scope and comparison refusal`|The platform refuses comparison queries outside the allowlisted comparison set.|The platform refuses comparison queries outside the allowlisted comparison set.|`refuses`|`backend/src/modules/concepts/comparison-resolver.js:20-22,46-55`; `backend/src/modules/concepts/resolver.js:109-130`|`mapped`||
|`privacy.md`|`Conditions — Scope-triggered controls`|The platform enforces governance-domain scope handling for governance-scoped concepts with non-governance signals.|The platform enforces governance-domain scope handling for governance-scoped concepts with non-governance signals.|`enforces`|`backend/src/modules/concepts/governance-scope-enforcer.js:108-133`|`mapped`||
|`privacy.md`|`Conditions — Scope-triggered controls`|The platform enforces product-response validation before resolver output returns.|The platform enforces product-response validation before resolver output returns.|`enforces`|`backend/src/modules/concepts/resolver.js:18,106,179`|`mapped`||
|`privacy.md`|`Conditions — Scope-triggered controls`|The platform refuses non-governance usage of governance-scoped concepts by returning `no_exact_match`.|The platform refuses non-governance usage of governance-scoped concepts by returning `no_exact_match`.|`refuses`|`backend/src/modules/concepts/resolver.js:87-107`; `backend/src/modules/concepts/governance-scope-enforcer.js:44-45,108-133`|`mapped`||

## 3. Terms of Service Traceability

|Policy File|Section|Policy Sentence|Canonical Claim|Claim Class|System Mapping|Status|Notes|
|---|---|---|---|---|---|---|---|
|`terms.md`|`Data and Behavior — Endpoint access`|The platform allows concept resolution through `GET /api/v1/concepts/resolve?q=...`.|The platform allows concept resolution through `GET /api/v1/concepts/resolve?q=...`.|`allows`|`backend/src/routes/api/v1/concepts.route.js:16-31`|`mapped`||
|`terms.md`|`Data and Behavior — Endpoint access`|The platform allows feedback submission through `POST /api/v1/feedback`.|The platform allows feedback submission through `POST /api/v1/feedback`.|`allows`|`backend/src/routes/api/v1/feedback.route.js:16-19`|`mapped`||
|`terms.md`|`Data and Behavior — Feedback fields I`|The platform allows feedback field `sessionId`.|The platform allows feedback field `sessionId`.|`allows`|`backend/src/modules/feedback/service.js:33-46`|`mapped`||
|`terms.md`|`Data and Behavior — Feedback fields I`|The platform allows feedback field `rawQuery`.|The platform allows feedback field `rawQuery`.|`allows`|`backend/src/modules/feedback/service.js:33-46`|`mapped`||
|`terms.md`|`Data and Behavior — Feedback fields I`|The platform allows feedback field `normalizedQuery`.|The platform allows feedback field `normalizedQuery`.|`allows`|`backend/src/modules/feedback/service.js:33-46`|`mapped`||
|`terms.md`|`Data and Behavior — Feedback fields I`|The platform allows feedback field `responseType`.|The platform allows feedback field `responseType`.|`allows`|`backend/src/modules/feedback/service.js:33-46`|`mapped`||
|`terms.md`|`Data and Behavior — Feedback fields I`|The platform allows feedback field `feedbackType`.|The platform allows feedback field `feedbackType`.|`allows`|`backend/src/modules/feedback/service.js:33-46`|`mapped`||
|`terms.md`|`Data and Behavior — Feedback fields II`|The platform allows feedback field `resolvedConceptId`.|The platform allows feedback field `resolvedConceptId`.|`allows`|`backend/src/modules/feedback/service.js:33-46`|`mapped`||
|`terms.md`|`Data and Behavior — Feedback fields II`|The platform allows feedback field `candidateConceptIds`.|The platform allows feedback field `candidateConceptIds`.|`allows`|`backend/src/modules/feedback/service.js:33-46`|`mapped`||
|`terms.md`|`Data and Behavior — Feedback fields II`|The platform allows feedback field `suggestionConceptIds`.|The platform allows feedback field `suggestionConceptIds`.|`allows`|`backend/src/modules/feedback/service.js:33-46`|`mapped`||
|`terms.md`|`Data and Behavior — Feedback fields II`|The platform allows feedback field `contractVersion`.|The platform allows feedback field `contractVersion`.|`allows`|`backend/src/modules/feedback/service.js:33-46`|`mapped`||
|`terms.md`|`Data and Behavior — Feedback fields II`|The platform allows feedback field `normalizerVersion`.|The platform allows feedback field `normalizerVersion`.|`allows`|`backend/src/modules/feedback/service.js:33-46`|`mapped`||
|`terms.md`|`Data and Behavior — Feedback fields III`|The platform allows feedback field `matcherVersion`.|The platform allows feedback field `matcherVersion`.|`allows`|`backend/src/modules/feedback/service.js:33-46`|`mapped`||
|`terms.md`|`Data and Behavior — Feedback fields III`|The platform allows feedback field `conceptSetVersion`.|The platform allows feedback field `conceptSetVersion`.|`allows`|`backend/src/modules/feedback/service.js:33-46`|`mapped`||
|`terms.md`|`Data and Behavior — Feedback response types`|The platform allows feedback response type `concept_match`.|The platform allows feedback response type `concept_match`.|`allows`|`backend/src/modules/feedback/constants.js:3`; `backend/src/modules/feedback/service.js:67-69`|`mapped`||
|`terms.md`|`Data and Behavior — Feedback response types`|The platform allows feedback response type `ambiguous_match`.|The platform allows feedback response type `ambiguous_match`.|`allows`|`backend/src/modules/feedback/constants.js:3`; `backend/src/modules/feedback/service.js:67-69`|`mapped`||
|`terms.md`|`Data and Behavior — Feedback response types`|The platform allows feedback response type `no_exact_match`.|The platform allows feedback response type `no_exact_match`.|`allows`|`backend/src/modules/feedback/constants.js:3`; `backend/src/modules/feedback/service.js:67-69`|`mapped`||
|`terms.md`|`Data and Behavior — Concept match options`|The platform allows feedback option `clear` for `concept_match`.|The platform allows feedback option `clear` for `concept_match`.|`allows`|`backend/src/modules/feedback/constants.js:5-8`|`mapped`||
|`terms.md`|`Data and Behavior — Concept match options`|The platform allows feedback option `unclear` for `concept_match`.|The platform allows feedback option `unclear` for `concept_match`.|`allows`|`backend/src/modules/feedback/constants.js:5-8`|`mapped`||
|`terms.md`|`Data and Behavior — Concept match options`|The platform allows feedback option `wrong_concept` for `concept_match`.|The platform allows feedback option `wrong_concept` for `concept_match`.|`allows`|`backend/src/modules/feedback/constants.js:5-8`|`mapped`||
|`terms.md`|`Data and Behavior — Ambiguous match options`|The platform allows feedback option `found_right_one` for `ambiguous_match`.|The platform allows feedback option `found_right_one` for `ambiguous_match`.|`allows`|`backend/src/modules/feedback/constants.js:5-8`|`mapped`||
|`terms.md`|`Data and Behavior — Ambiguous match options`|The platform allows feedback option `still_not_right` for `ambiguous_match`.|The platform allows feedback option `still_not_right` for `ambiguous_match`.|`allows`|`backend/src/modules/feedback/constants.js:5-8`|`mapped`||
|`terms.md`|`Data and Behavior — No exact match options`|The platform allows feedback option `expected` for `no_exact_match`.|The platform allows feedback option `expected` for `no_exact_match`.|`allows`|`backend/src/modules/feedback/constants.js:5-8`|`mapped`||
|`terms.md`|`Data and Behavior — No exact match options`|The platform allows feedback option `should_exist` for `no_exact_match`.|The platform allows feedback option `should_exist` for `no_exact_match`.|`allows`|`backend/src/modules/feedback/constants.js:5-8`|`mapped`||
|`terms.md`|`Boundaries — Origin and payload constraints`|The platform does not allow CORS requests from origins outside the normalized allowed origin set.|The platform does not allow CORS requests from origins outside the normalized allowed origin set.|`does_not_allow`|`backend/src/security/cors.js:7-20`|`mapped`||
|`terms.md`|`Boundaries — Origin and payload constraints`|The platform does not allow feedback payload keys outside the approved field set.|The platform does not allow feedback payload keys outside the approved field set.|`does_not_allow`|`backend/src/modules/feedback/service.js:33-52`|`mapped`||
|`terms.md`|`Boundaries — Origin and payload constraints`|The platform does not allow unsupported `responseType` values.|The platform does not allow unsupported `responseType` values.|`does_not_allow`|`backend/src/modules/feedback/service.js:67-69`|`mapped`||
|`terms.md`|`Boundaries — Origin and payload constraints`|The platform does not allow invalid `feedbackType` and `responseType` combinations.|The platform does not allow invalid `feedbackType` and `responseType` combinations.|`does_not_allow`|`backend/src/modules/feedback/service.js:71-77`|`mapped`||
|`terms.md`|`Boundaries — Concept match constraints`|The platform does not allow candidate concept IDs on `concept_match` feedback.|The platform does not allow candidate concept IDs on `concept_match` feedback.|`does_not_allow`|`backend/src/modules/feedback/service.js:92-97`|`mapped`||
|`terms.md`|`Boundaries — Concept match constraints`|The platform does not allow suggestion concept IDs on `concept_match` feedback.|The platform does not allow suggestion concept IDs on `concept_match` feedback.|`does_not_allow`|`backend/src/modules/feedback/service.js:92-97`|`mapped`||
|`terms.md`|`Boundaries — Ambiguous match constraints`|The platform does not allow `ambiguous_match` feedback with fewer than two candidate concept IDs.|The platform does not allow `ambiguous_match` feedback with fewer than two candidate concept IDs.|`does_not_allow`|`backend/src/modules/feedback/service.js:100-105`|`mapped`||
|`terms.md`|`Boundaries — Ambiguous match constraints`|The platform does not allow suggestion concept IDs on `ambiguous_match` feedback.|The platform does not allow suggestion concept IDs on `ambiguous_match` feedback.|`does_not_allow`|`backend/src/modules/feedback/service.js:107-109`|`mapped`||
|`terms.md`|`Boundaries — No exact match constraints`|The platform does not allow candidate concept IDs on `no_exact_match` feedback.|The platform does not allow candidate concept IDs on `no_exact_match` feedback.|`does_not_allow`|`backend/src/modules/feedback/service.js:112-115`|`mapped`||
|`terms.md`|`Boundaries — Comparison constraints`|The platform does not allow comparison output for non-allowlisted concept pairs.|The platform does not allow comparison output for non-allowlisted concept pairs.|`does_not_allow`|`backend/src/modules/concepts/comparison-resolver.js:20-22,46-55`|`mapped`||

## 4. Cookie Policy Traceability

|Policy File|Section|Policy Sentence|Canonical Claim|Claim Class|System Mapping|Status|Notes|
|---|---|---|---|---|---|---|---|
|`cookies.md`|`Data Handling — Internal proxy forwarding`|The platform shares incoming `cookie` headers with the API proxy target through the SSR layer.|The platform shares incoming `cookie` headers with the API proxy target through the SSR layer.|`shares`|`frontend/src/server.ts:123-135`|`mapped`|internal SSR transport only|
|`cookies.md`|`Data Handling — Internal proxy forwarding`|The platform shares upstream `set-cookie` headers with the client response through the SSR layer.|The platform shares upstream `set-cookie` headers with the client response through the SSR layer.|`shares`|`frontend/src/server.ts:103-120`|`mapped`|internal SSR transport only|
|`cookies.md`|`Boundaries — Conditional forwarding`|The platform does not allow SSR forwarding of cookie headers when the incoming request omits them.|The platform does not allow SSR forwarding of cookie headers when the incoming request omits them.|`does_not_share`|`frontend/src/server.ts:123-135`|`mapped`|internal SSR transport only|
|`cookies.md`|`Boundaries — Conditional forwarding`|The platform does not allow SSR forwarding of upstream set-cookie headers when upstream responses omit them.|The platform does not allow SSR forwarding of upstream set-cookie headers when upstream responses omit them.|`does_not_share`|`frontend/src/server.ts:114-119`|`mapped`|internal SSR transport only|

## 5. Phase D Summary

- claim sentences traced: `75`
- `mapped`: `75`
- `unmapped`: `0`
- `unclear`: `0`
- `conflicts_with_system`: `0`
- excluded non-claim scope bullets: `13`
- excluded non-claim SSR annotation fragments: `4`
- Phase B canonical claim total referenced: `75`
