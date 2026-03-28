# POLICY_AUDIT_PHASE_A_RESULTS.md

Phase A execution results for the current ChatPDM policy drafts.

This file applies the Phase A audit framework to:

- `policies/privacy.md`
- `policies/terms.md`
- `policies/cookies.md`

## 1. Audit Notes

- Scope bullets in the current policy files are structural fragments, not claim sentences.
- The tables below cover auditable claim sentences only.
- All current auditable claim sentences map to concrete implementation elements.
- Duplicate claim candidates exist between `privacy.md` and `cookies.md` for SSR cookie forwarding.
- Internal SSR proxy forwarding is classified as `shares` or `does_not_share` only within the product boundary.

## 2. Privacy Policy Audit

|Policy File|Section|Claim Text|Claim Class|System Mapping|Status|Notes|
|---|---|---|---|---|---|---|
|`privacy.md`|`Stores — Feedback and browser storage`|The platform stores `sessionId` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js::sessionId`; `backend/src/modules/feedback/store.js::insertFeedbackEvent`|`mapped`||
|`privacy.md`|`Stores — Feedback and browser storage`|The platform stores `rawQuery` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js::rawQuery`; `backend/src/modules/feedback/store.js::insertFeedbackEvent`|`mapped`||
|`privacy.md`|`Stores — Feedback and browser storage`|The platform stores `normalizedQuery` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js::normalizedQuery`; `backend/src/modules/feedback/store.js::insertFeedbackEvent`|`mapped`||
|`privacy.md`|`Stores — Feedback and browser storage`|The platform stores `responseType` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js::responseType`; `backend/src/modules/feedback/store.js::insertFeedbackEvent`|`mapped`||
|`privacy.md`|`Stores — Feedback and browser storage`|The platform stores `feedbackType` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js::feedbackType`; `backend/src/modules/feedback/store.js::insertFeedbackEvent`|`mapped`||
|`privacy.md`|`Stores — Feedback and browser storage`|The platform stores `resolvedConceptId` in feedback event documents when provided.|`stores`|`backend/src/modules/feedback/feedback-event.model.js::resolvedConceptId`; `backend/src/modules/feedback/store.js::insertFeedbackEvent`|`mapped`||
|`privacy.md`|`Stores — Feedback and browser storage`|The platform stores `candidateConceptIds` in feedback event documents when provided.|`stores`|`backend/src/modules/feedback/feedback-event.model.js::candidateConceptIds`; `backend/src/modules/feedback/store.js::insertFeedbackEvent`|`mapped`||
|`privacy.md`|`Stores — Feedback and browser storage`|The platform stores `suggestionConceptIds` in feedback event documents when provided.|`stores`|`backend/src/modules/feedback/feedback-event.model.js::suggestionConceptIds`; `backend/src/modules/feedback/store.js::insertFeedbackEvent`|`mapped`||
|`privacy.md`|`Stores — Feedback and browser storage`|The platform stores `contractVersion` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js::contractVersion`; `backend/src/modules/feedback/store.js::insertFeedbackEvent`|`mapped`||
|`privacy.md`|`Stores — Feedback and browser storage`|The platform stores `normalizerVersion` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js::normalizerVersion`; `backend/src/modules/feedback/store.js::insertFeedbackEvent`|`mapped`||
|`privacy.md`|`Stores — Feedback and browser storage`|The platform stores `matcherVersion` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js::matcherVersion`; `backend/src/modules/feedback/store.js::insertFeedbackEvent`|`mapped`||
|`privacy.md`|`Stores — Feedback and browser storage`|The platform stores `conceptSetVersion` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js::conceptSetVersion`; `backend/src/modules/feedback/store.js::insertFeedbackEvent`|`mapped`||
|`privacy.md`|`Stores — Feedback and browser storage`|The platform stores `createdAt` in feedback event documents.|`stores`|`backend/src/modules/feedback/feedback-event.model.js::createdAt`; `backend/src/modules/feedback/service.js::recordFeedback`|`mapped`||
|`privacy.md`|`Stores — Feedback and browser storage`|The browser stores a feedback session identifier in local storage under `chatpdm-beta-session-id`.|`stores`|`frontend/src/app/core/feedback/feedback-session.service.ts::SESSION_STORAGE_KEY`; `localStorage.setItem`|`mapped`||
|`privacy.md`|`Shares — SSR proxy forwarding`|The platform shares incoming `cookie` headers with the API proxy target through the SSR layer.|`shares`|`frontend/src/server.ts::buildProxyHeaders`; `if (cookie) headers.set('cookie', cookie)`|`mapped`|Duplicate candidate with `cookies.md`|
|`privacy.md`|`Shares — SSR proxy forwarding`|The platform shares incoming `x-forwarded-for` headers with the API proxy target through the SSR layer.|`shares`|`frontend/src/server.ts::buildProxyHeaders`; `if (xForwardedFor) headers.set('x-forwarded-for', xForwardedFor)`|`mapped`|Internal proxy forwarding only|
|`privacy.md`|`Shares — SSR proxy forwarding`|The platform shares upstream `set-cookie` headers with the client response through the SSR layer.|`shares`|`frontend/src/server.ts::copyProxyHeaders`; `target.setHeader('set-cookie', setCookies)`|`mapped`|Duplicate candidate with `cookies.md`|
|`privacy.md`|`Enforces — Request and runtime controls`|The platform enforces Helmet security middleware on backend requests.|`enforces`|`backend/src/app.js::app.use(helmet(...))`|`mapped`||
|`privacy.md`|`Enforces — Request and runtime controls`|The platform enforces CORS on backend requests.|`enforces`|`backend/src/app.js::app.use(cors(createCorsOptions(...)))`|`mapped`||
|`privacy.md`|`Enforces — Request and runtime controls`|The platform enforces CORS credentials.|`enforces`|`backend/src/security/cors.js::credentials: true`|`mapped`||
|`privacy.md`|`Enforces — Request and runtime controls`|The platform enforces CORS methods `GET`, `POST`, and `OPTIONS`.|`enforces`|`backend/src/security/cors.js::methods`|`mapped`||
|`privacy.md`|`Enforces — Request and runtime controls`|The platform enforces CORS headers `Content-Type` and `Accept`.|`enforces`|`backend/src/security/cors.js::allowedHeaders`|`mapped`||
|`privacy.md`|`Enforces — Request and runtime controls`|The platform enforces CORS `maxAge` of `86400`.|`enforces`|`backend/src/security/cors.js::maxAge`|`mapped`||
|`privacy.md`|`Enforces — Request and runtime controls`|The platform enforces backend JSON body size limits of `64kb`.|`enforces`|`backend/src/app.js::express.json({ limit: '64kb' })`|`mapped`||
|`privacy.md`|`Enforces — Request and runtime controls`|The platform enforces SSR `/api/*` JSON body size limits of `32kb`.|`enforces`|`frontend/src/server.ts::app.all('/api/{*splat}', express.json({ limit: '32kb' }), ...)`|`mapped`||
|`privacy.md`|`Enforces — Request and runtime controls`|The platform enforces governance-domain scope handling for governance-scoped concepts with non-governance signals.|`enforces`|`backend/src/modules/concepts/governance-scope-enforcer.js::detectGovernanceScopeEnforcement`|`mapped`||
|`privacy.md`|`Enforces — Request and runtime controls`|The platform enforces product-response validation before resolver output returns.|`enforces`|`backend/src/modules/concepts/resolver.js::assertValidProductResponse`|`mapped`||
|`privacy.md`|`Refuses — Runtime boundaries`|The platform refuses concept resolution requests when query parameter `q` is missing.|`refuses`|`backend/src/routes/api/v1/concepts.route.js::typeof rawQuery !== 'string' \|\| rawQuery.length === 0`|`mapped`|Shared validation branch|
|`privacy.md`|`Refuses — Runtime boundaries`|The platform refuses concept resolution requests when query parameter `q` is empty.|`refuses`|`backend/src/routes/api/v1/concepts.route.js::typeof rawQuery !== 'string' \|\| rawQuery.length === 0`|`mapped`|Shared validation branch|
|`privacy.md`|`Refuses — Runtime boundaries`|The platform refuses concept resolution requests when query parameter `q` is not a string.|`refuses`|`backend/src/routes/api/v1/concepts.route.js::typeof rawQuery !== 'string' \|\| rawQuery.length === 0`|`mapped`|Shared validation branch|
|`privacy.md`|`Refuses — Runtime boundaries`|The platform refuses invalid feedback submissions with HTTP `400`.|`refuses`|`backend/src/routes/api/v1/feedback.route.js::res.status(400)`|`mapped`||
|`privacy.md`|`Refuses — Runtime boundaries`|The platform refuses invalid feedback submissions with `invalid_feedback`.|`refuses`|`backend/src/routes/api/v1/feedback.route.js::code: 'invalid_feedback'`|`mapped`||
|`privacy.md`|`Refuses — Runtime boundaries`|The platform refuses unsupported complex queries.|`refuses`|`backend/src/modules/concepts/query-shape-classifier.js::interpretationType: 'unsupported_complex'`|`mapped`||
|`privacy.md`|`Refuses — Runtime boundaries`|The platform refuses relation queries.|`refuses`|`backend/src/modules/concepts/query-shape-classifier.js::interpretationType: 'relation_not_supported'`|`mapped`||
|`privacy.md`|`Refuses — Runtime boundaries`|The platform refuses role or actor queries.|`refuses`|`backend/src/modules/concepts/query-shape-classifier.js::interpretationType: 'role_or_actor_not_supported'`|`mapped`||
|`privacy.md`|`Refuses — Runtime boundaries`|The platform refuses canonical lookup requests when no authored concept ID is provided.|`refuses`|`backend/src/modules/concepts/query-shape-classifier.js::interpretationType: 'canonical_lookup_not_found'`; empty target path|`mapped`||
|`privacy.md`|`Refuses — Runtime boundaries`|The platform refuses canonical lookup requests when no authored concept exists for the requested ID.|`refuses`|`backend/src/modules/concepts/query-shape-classifier.js::interpretationType: 'canonical_lookup_not_found'`; named target path|`mapped`||
|`privacy.md`|`Refuses — Runtime boundaries`|The platform refuses non-governance usage of governance-scoped concepts with `no_exact_match`.|`refuses`|`backend/src/modules/concepts/resolver.js::type: 'no_exact_match'`; `backend/src/modules/concepts/governance-scope-enforcer.js::OUT_OF_SCOPE_MESSAGE`|`mapped`||
|`privacy.md`|`Refuses — Runtime boundaries`|The platform refuses comparison queries outside the allowlisted comparison set.|`refuses`|`backend/src/modules/concepts/comparison-resolver.js::isAllowedComparisonPair`; `backend/src/modules/concepts/resolver.js` no comparison fallback|`mapped`||

## 3. Terms of Service Audit

|Policy File|Section|Claim Text|Claim Class|System Mapping|Status|Notes|
|---|---|---|---|---|---|---|
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows concept resolution through `GET /api/v1/concepts/resolve?q=...`.|`allows`|`backend/src/routes/api/v1/concepts.route.js::router.get('/resolve')`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback submission through `POST /api/v1/feedback`.|`allows`|`backend/src/routes/api/v1/feedback.route.js::router.post('/')`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback field `sessionId`.|`allows`|`backend/src/modules/feedback/service.js::allowedKeys`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback field `rawQuery`.|`allows`|`backend/src/modules/feedback/service.js::allowedKeys`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback field `normalizedQuery`.|`allows`|`backend/src/modules/feedback/service.js::allowedKeys`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback field `responseType`.|`allows`|`backend/src/modules/feedback/service.js::allowedKeys`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback field `feedbackType`.|`allows`|`backend/src/modules/feedback/service.js::allowedKeys`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback field `resolvedConceptId`.|`allows`|`backend/src/modules/feedback/service.js::allowedKeys`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback field `candidateConceptIds`.|`allows`|`backend/src/modules/feedback/service.js::allowedKeys`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback field `suggestionConceptIds`.|`allows`|`backend/src/modules/feedback/service.js::allowedKeys`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback field `contractVersion`.|`allows`|`backend/src/modules/feedback/service.js::allowedKeys`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback field `normalizerVersion`.|`allows`|`backend/src/modules/feedback/service.js::allowedKeys`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback field `matcherVersion`.|`allows`|`backend/src/modules/feedback/service.js::allowedKeys`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback field `conceptSetVersion`.|`allows`|`backend/src/modules/feedback/service.js::allowedKeys`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback response type `concept_match`.|`allows`|`backend/src/modules/feedback/constants.js::RESPONSE_TYPES`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback response type `ambiguous_match`.|`allows`|`backend/src/modules/feedback/constants.js::RESPONSE_TYPES`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback response type `no_exact_match`.|`allows`|`backend/src/modules/feedback/constants.js::RESPONSE_TYPES`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback option `clear` for `concept_match`.|`allows`|`backend/src/modules/feedback/constants.js::FEEDBACK_OPTIONS_BY_RESPONSE_TYPE.concept_match`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback option `unclear` for `concept_match`.|`allows`|`backend/src/modules/feedback/constants.js::FEEDBACK_OPTIONS_BY_RESPONSE_TYPE.concept_match`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback option `wrong_concept` for `concept_match`.|`allows`|`backend/src/modules/feedback/constants.js::FEEDBACK_OPTIONS_BY_RESPONSE_TYPE.concept_match`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback option `found_right_one` for `ambiguous_match`.|`allows`|`backend/src/modules/feedback/constants.js::FEEDBACK_OPTIONS_BY_RESPONSE_TYPE.ambiguous_match`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback option `still_not_right` for `ambiguous_match`.|`allows`|`backend/src/modules/feedback/constants.js::FEEDBACK_OPTIONS_BY_RESPONSE_TYPE.ambiguous_match`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback option `expected` for `no_exact_match`.|`allows`|`backend/src/modules/feedback/constants.js::FEEDBACK_OPTIONS_BY_RESPONSE_TYPE.no_exact_match`|`mapped`||
|`terms.md`|`Allowed Operations — Runtime access`|The platform allows feedback option `should_exist` for `no_exact_match`.|`allows`|`backend/src/modules/feedback/constants.js::FEEDBACK_OPTIONS_BY_RESPONSE_TYPE.no_exact_match`|`mapped`||
|`terms.md`|`Disallowed Operations — Runtime boundaries`|The platform does not allow CORS requests from origins outside the normalized allowed origin set.|`does_not_allow`|`backend/src/security/cors.js::createCorsOptions`; `callback(null, false)`|`mapped`||
|`terms.md`|`Disallowed Operations — Runtime boundaries`|The platform does not allow feedback payload keys outside the approved field set.|`does_not_allow`|`backend/src/modules/feedback/service.js::allowedKeys`; `Unsupported feedback field`|`mapped`||
|`terms.md`|`Disallowed Operations — Runtime boundaries`|The platform does not allow unsupported `responseType` values.|`does_not_allow`|`backend/src/modules/feedback/service.js::RESPONSE_TYPES.includes`; `Unsupported responseType`|`mapped`||
|`terms.md`|`Disallowed Operations — Runtime boundaries`|The platform does not allow invalid `feedbackType` and `responseType` combinations.|`does_not_allow`|`backend/src/modules/feedback/service.js::allowedFeedbackOptions.includes`|`mapped`||
|`terms.md`|`Disallowed Operations — Runtime boundaries`|The platform does not allow candidate concept IDs on `concept_match` feedback.|`does_not_allow`|`backend/src/modules/feedback/service.js::responseType === 'concept_match'`|`mapped`||
|`terms.md`|`Disallowed Operations — Runtime boundaries`|The platform does not allow suggestion concept IDs on `concept_match` feedback.|`does_not_allow`|`backend/src/modules/feedback/service.js::responseType === 'concept_match'`|`mapped`||
|`terms.md`|`Disallowed Operations — Runtime boundaries`|The platform does not allow `ambiguous_match` feedback with fewer than two candidate concept IDs.|`does_not_allow`|`backend/src/modules/feedback/service.js::responseType === 'ambiguous_match'`; `candidateConceptIds.length < 2`|`mapped`||
|`terms.md`|`Disallowed Operations — Runtime boundaries`|The platform does not allow suggestion concept IDs on `ambiguous_match` feedback.|`does_not_allow`|`backend/src/modules/feedback/service.js::responseType === 'ambiguous_match'`; `suggestionConceptIds.length > 0`|`mapped`||
|`terms.md`|`Disallowed Operations — Runtime boundaries`|The platform does not allow candidate concept IDs on `no_exact_match` feedback.|`does_not_allow`|`backend/src/modules/feedback/service.js::responseType === 'no_exact_match'`; `candidateConceptIds.length > 0`|`mapped`||
|`terms.md`|`Disallowed Operations — Runtime boundaries`|The platform does not allow comparison output for non-allowlisted concept pairs.|`does_not_allow`|`backend/src/modules/concepts/comparison-resolver.js::isAllowedComparisonPair`; `resolveComparisonQuery`|`mapped`||

## 4. Cookie Policy Audit

|Policy File|Section|Claim Text|Claim Class|System Mapping|Status|Notes|
|---|---|---|---|---|---|---|
|`cookies.md`|`Cookie Handling — SSR forwarding`|The platform allows SSR forwarding of incoming cookie headers to the API proxy target.|`shares`|`frontend/src/server.ts::buildProxyHeaders`; `if (cookie) headers.set('cookie', cookie)`|`mapped`|Duplicate candidate with `privacy.md`|
|`cookies.md`|`Cookie Handling — SSR forwarding`|The platform allows SSR forwarding of upstream set-cookie headers to the client response when present.|`shares`|`frontend/src/server.ts::copyProxyHeaders`; `target.setHeader('set-cookie', setCookies)`|`mapped`|Duplicate candidate with `privacy.md`|
|`cookies.md`|`Boundaries — Conditional forwarding`|The platform does not allow SSR forwarding of cookie headers when the incoming request omits them.|`does_not_share`|`frontend/src/server.ts::buildProxyHeaders`; cookie header set only inside `if (cookie)`|`mapped`|Duplicate candidate with `privacy.md`|
|`cookies.md`|`Boundaries — Conditional forwarding`|The platform does not allow SSR forwarding of upstream set-cookie headers when upstream responses omit them.|`does_not_share`|`frontend/src/server.ts::copyProxyHeaders`; set-cookie forwarded only when `setCookies.length > 0`|`mapped`|Duplicate candidate with `privacy.md`|

## 5. Phase A Summary

- Audited claim sentences: `77`
- `mapped`: `77`
- `unmapped`: `0`
- `unclear`: `0`
- `conflicts_with_system`: `0`

## 6. Phase A Readiness Notes

- Current claim sentences are ready for Phase B normalization and de-duplication.
- Privacy and cookie forwarding claims should be consolidated in Phase B.
- Internal SSR forwarding should remain explicitly marked as non-third-party sharing.
- Scope bullets should be normalized in Phase B if full line-level auditability is required.
