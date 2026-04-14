# Privacy Policy — Data Handling

## Scope — Confirmed data handling

- feedback event storage
- browser session storage
- internal proxy header transport
- request controls

## Feedback event storage

- The platform stores `sessionId` in feedback event documents.
- The platform stores `rawQuery` in feedback event documents only after minimizing it to `sha256:<digest>`.
- The platform stores `normalizedQuery` in feedback event documents only after minimizing it to `sha256:<digest>`.
- The platform stores `responseType` in feedback event documents.
- The platform stores `feedbackType` in feedback event documents.
- The platform stores `resolvedConceptId` in feedback event documents when provided.
- The platform stores `candidateConceptIds` in feedback event documents when provided.
- The platform stores `suggestionConceptIds` in feedback event documents when provided.
- The platform stores `contractVersion` in feedback event documents.
- The platform stores `normalizerVersion` in feedback event documents.
- The platform stores `matcherVersion` in feedback event documents.
- The platform stores `conceptSetVersion` in feedback event documents.
- The platform stores `createdAt` in feedback event documents.
- The platform stores `expiresAt` in feedback event documents.

## Browser session storage

- The platform stores a feedback session identifier in browser local storage under `chatpdm-beta-session-id`.

## Internal proxy transport

- The platform shares incoming `x-forwarded-for` headers with the API proxy target through the SSR layer.
- internal SSR transport only
- not third-party disclosure

## Request controls

- The platform enforces Helmet security middleware on backend requests.
- The platform enforces CORS on backend requests.
- The platform enforces backend JSON body size limits of `64kb`.
- The platform enforces SSR `/api/*` JSON body size limits of `32kb`.

## Boundary note

- This policy covers storage, minimization, browser session continuity, and internal transport.
- Runtime refusal behavior is documented in Acceptable Use and Terms of Service.
