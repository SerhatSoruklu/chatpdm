# Data Retention / Data Usage

Implementation-backed view over lifecycle, storage, and expiry behavior.

## Scope — Confirmed retention evidence

- feedback persistence lifecycle and expiry
- browser session continuity for feedback controls
- request-bound SSR transport evidence
- session-bound export and delete controls

## Runtime Snapshot

- The platform derives `expiresAt` before feedback event persistence.
- The platform stores `expiresAt` in feedback event documents.
- The platform exposes feedback export and delete controls by `sessionId`.

## Lifecycle Bands — Short-lived persistence

- The platform stores `rawQuery` in feedback event documents as a `sha256` digest.
- The platform stores `normalizedQuery` in feedback event documents as a `sha256` digest.
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

## Controls

- The platform allows feedback export by `sessionId`.
- The platform allows feedback deletion by `sessionId`.

## Implementation Boundaries

This file keeps feedback persistence, browser storage continuity, and request-bound SSR transport separate.

Storage form claims and expiry claims are not interchangeable in this surface.

## Non-claim Guardrail

This file reports current retention declarations and lifecycle evidence only.

No broader retention mechanism is claimed without trace anchors in this repo.

## Trace Anchors

- `backend/src/modules/feedback/lifecycle-contract.js:12-177`
- `backend/src/modules/feedback/feedback-event.model.js:6-95`
- `backend/src/modules/feedback/service.js:149-234`
- `backend/src/routes/api/v1/feedback.route.js:12-95`
- `frontend/src/app/core/feedback/feedback-session.service.ts:4-48`
- `frontend/src/server.ts:123-145`
