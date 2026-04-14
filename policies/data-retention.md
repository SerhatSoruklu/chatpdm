# Data Retention / Data Usage

Implementation-backed view over lifecycle, storage minimization, expiry, and session-bound controls.

## Scope — Confirmed retention evidence

- feedback persistence lifecycle and expiry
- browser session continuity for feedback controls
- request-bound internal SSR transport evidence
- session-bound export/delete controls
- hashed audit records for feedback session actions

## Runtime Snapshot

- The platform derives `expiresAt` before feedback event persistence.
- The platform stores `expiresAt` in feedback event documents.
- The platform exposes feedback export and delete controls by `sessionId`.
- The platform records hashed audit trails for session export and delete actions.

## Lifecycle Bands — Short-lived persistence

- The platform minimizes `rawQuery` to `sha256:<digest>` before persistence.
- The platform minimizes `normalizedQuery` to `sha256:<digest>` before persistence.
- The platform deletes feedback event documents through a TTL index on `expiresAt`.

## Lifecycle Bands — Session-bound continuity

- The platform stores a feedback session identifier in browser local storage under `chatpdm-beta-session-id`.

## Lifecycle Bands — Transport-only flow

- The platform shares incoming `x-forwarded-for` headers with the API proxy target through the SSR layer.
- internal SSR transport only
- not third-party disclosure

## Retention Path

- The platform minimizes `rawQuery` before persistence.
- The platform minimizes `normalizedQuery` before persistence.
- The platform derives `expiresAt` from `createdAt` using the live feedback lifecycle contract before persistence.
- The platform allows feedback export by `sessionId`.
- The platform allows feedback deletion by `sessionId`.

## Implementation Boundaries

Storage form and expiry form are separate in this surface.

This file reports current retention declarations and lifecycle evidence only.

No broader retention mechanism is claimed without trace anchors in this repo.

## Trace Anchors

- `backend/src/modules/feedback/lifecycle-contract.js:12-177`
- `backend/src/modules/feedback/feedback-event.model.js:6-95`
- `backend/src/modules/feedback/service.js:149-234`
- `backend/src/routes/api/v1/feedback.route.js:12-95`
- `frontend/src/app/core/feedback/feedback-session.service.ts:4-48`
- `frontend/src/server.ts:123-145`
