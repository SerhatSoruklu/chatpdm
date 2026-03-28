# Privacy Policy — Data Handling

## Scope — Confirmed data handling

- feedback event storage
- browser session storage
- internal proxy header transport
- request controls
- runtime refusal boundaries

## Data Storage — Feedback event fields I

- The platform stores `sessionId` in feedback event documents.
- The platform stores `rawQuery` in feedback event documents.
- The platform stores `normalizedQuery` in feedback event documents.
- The platform stores `responseType` in feedback event documents.
- The platform stores `feedbackType` in feedback event documents.

## Data Storage — Feedback event fields II

- The platform stores `resolvedConceptId` in feedback event documents when provided.
- The platform stores `candidateConceptIds` in feedback event documents when provided.
- The platform stores `suggestionConceptIds` in feedback event documents when provided.
- The platform stores `contractVersion` in feedback event documents.
- The platform stores `normalizerVersion` in feedback event documents.

## Data Storage — Feedback event fields III

- The platform stores `matcherVersion` in feedback event documents.
- The platform stores `conceptSetVersion` in feedback event documents.
- The platform stores `createdAt` in feedback event documents.

## Data Storage — Browser local storage

- The platform stores a feedback session identifier in browser local storage under `chatpdm-beta-session-id`.

## Data Handling — Internal proxy transport

- The platform shares incoming `x-forwarded-for` headers with the API proxy target through the SSR layer.
- internal SSR proxy transport only
- not third-party disclosure

## Behavior Controls — Backend request controls

- The platform enforces Helmet security middleware on backend requests.
- The platform enforces CORS on backend requests.
- The platform enforces backend JSON body size limits of `64kb`.
- The platform enforces SSR `/api/*` JSON body size limits of `32kb`.

## Behavior Controls — CORS settings

- The platform enforces CORS credentials.
- The platform enforces CORS methods `GET`, `POST`, and `OPTIONS`.
- The platform enforces CORS headers `Content-Type` and `Accept`.
- The platform enforces CORS `maxAge` of `86400`.

## Boundaries — Invalid request refusal

- The platform refuses concept resolution requests when query parameter `q` is missing.
- The platform refuses concept resolution requests when query parameter `q` is empty.
- The platform refuses concept resolution requests when query parameter `q` is not a string.
- The platform refuses invalid feedback submissions with HTTP `400`.
- The platform refuses invalid feedback submissions with error code `invalid_feedback`.

## Boundaries — Unsupported query refusal

- The platform refuses unsupported complex queries.
- The platform refuses relation queries.
- The platform refuses role or actor queries.
- The platform refuses canonical lookup requests when no authored concept ID is provided.
- The platform refuses canonical lookup requests when no authored concept exists for the requested ID.

## Boundaries — Scope and comparison refusal

- The platform refuses comparison queries outside the allowlisted comparison set.

## Conditions — Scope-triggered controls

- The platform enforces governance-domain scope handling for governance-scoped concepts with non-governance signals.
- The platform enforces product-response validation before resolver output returns.
- The platform refuses non-governance usage of governance-scoped concepts by returning `no_exact_match`.
