# Policy Layer Audit

Audit scope:

- policy source text in `policies/*.md`
- generated policy surface content
- backend and frontend implementation that those policies claim to describe
- contract truth where the policy surface is derived from validated claim data

Truth model:

- implementation truth: code and runtime behavior
- documentation truth: generated and public-facing policy surface
- policy truth: the policy markdown source files
- contract truth: the claim-backed policy surface generated from those sources

Implementation truth is authoritative.

## Audit Table

| Policy Section | Claim | Implementation Reality | Status | Fix |
| --- | --- | --- | --- | --- |
| Privacy Policy | Feedback event data is described as stored directly in event documents. | Feedback persistence stores minimized `rawQuery` and `normalizedQuery` values in `sha256:<digest>` form, then validates the minimized form at the schema boundary. | MISMATCH | Rewrite storage language to say the platform stores minimized digests, not raw values. Keep privacy scoped to storage, transport, and request controls. |
| Data Retention / Data Usage | Retention is described as short-lived persistence with TTL expiry and session-bound control flows. | The implementation derives `expiresAt` before insert, stores it, expires via TTL, minimizes query fields to `sha256:<digest>`, and hashes session IDs for export/delete audit actions. | DOCS_ONLY | Tighten the wording to the exact hash form and add the hashed audit trail note. |
| Acceptable Use | Runtime use is described around concept resolution, comparison output, and feedback controls. | The implementation also exposes concept discovery and concept detail routes, plus POST-based concept resolution. | DOCS_ONLY | Add the discovery, detail, and POST resolve endpoints to the allowed-use surface. |
| Cookie Policy | Cookie handling is described as internal proxy transport only. | The implementation forwards incoming `cookie` headers to the API proxy target and upstream `set-cookie` headers back to the client only when present. | CLEAN | None. |
| Terms of Service | The runtime contract is described around concept resolution, feedback fields, response types, and comparison output. | The implementation also exposes concept discovery and concept detail routes, session export/delete routes, and a stricter feedback contract with unknown-key rejection and conditional field rules. | DOCS_ONLY | Add the missing public endpoints and the exact feedback/session control contract. |

## Per-Policy Breakdown

### Privacy Policy

Current issues:

- `rawQuery` and `normalizedQuery` were described as stored values without the minimization step.
- runtime refusal language lived in the privacy file even though it belongs in runtime-use policy.

Exact mismatch:

- the persistence path writes `rawQuery` and `normalizedQuery` only after minimization to `sha256:<digest>`.
- the privacy file mixed data handling with refusal behavior that the implementation does not treat as privacy-specific.

Rewritten sections:

- `## Feedback event storage`
- `## Browser session storage`
- `## Internal proxy transport`
- `## Request controls`

### Data Retention / Data Usage

Current issues:

- the storage form was accurate in direction but not exact enough about the `sha256:<digest>` form.
- the audit trail for session export/delete actions was not called out.

Exact mismatch:

- the lifecycle contract requires hashed minimization before persistence and TTL-based expiry through `expiresAt`.
- export/delete actions write hashed session audit records, not plain session IDs.

Rewritten sections:

- `## Runtime Snapshot`
- `## Lifecycle Bands — Short-lived persistence`
- `## Lifecycle Bands — Session-bound continuity`
- `## Lifecycle Bands — Transport-only flow`
- `## Retention Path`

### Acceptable Use

Current issues:

- public concept discovery and concept detail access were omitted.
- POST-based concept resolution was omitted.

Exact mismatch:

- the implementation exposes `GET /api/v1/concepts`, `GET /api/v1/concepts/resolve`, `POST /api/v1/concepts/resolve`, and `GET /api/v1/concepts/:conceptId`.

Rewritten sections:

- `## Runtime Scope`
- `## Unsupported or Refused Use`
- `## Feedback Surface Boundaries`

### Cookie Policy

Current issues:

- none requiring a rewrite.

Exact mismatch:

- none; the current policy matches the SSR proxy forwarding behavior.

Rewritten sections:

- kept as-is, with only the policy body normalized for clarity.

### Terms of Service

Current issues:

- concept discovery and concept detail access were omitted.
- session export/delete routes were omitted.
- the feedback contract was under-specified around unknown-key refusal and conditional fields.

Exact mismatch:

- the implementation enforces allowed keys, response-type-specific field rules, and session-bound controls in addition to the public concept routes.

Rewritten sections:

- `## Data and Behavior — Endpoint access`
- `## Data and Behavior — Feedback fields I`
- `## Data and Behavior — Feedback fields II`
- `## Data and Behavior — Feedback fields III`
- `## Data and Behavior — Feedback response types`
- `## Boundaries — Origin and payload constraints`
- `## Boundaries — Concept match constraints`
- `## Boundaries — Ambiguous match constraints`
- `## Boundaries — No exact match constraints`
- `## Boundaries — Comparison constraints`

## Risk Flags

- Legal overclaim risk:
  - describing `rawQuery` and `normalizedQuery` as stored plaintext would overstate retention and conflict with the minimization path.
- Under-disclosure risk:
  - omitting concept discovery/detail or session export/delete routes makes the public contract look narrower than it is.
- Ambiguity risk:
  - mixing privacy storage language with runtime refusal language weakens the policy boundary and makes the policy harder to audit.
- Liability / misunderstanding risk:
  - failing to name unknown-key rejection and conditional feedback fields can make the feedback contract look more permissive than the backend actually is.

## Outcome

- The rewritten policy set now tracks the implementation truth more closely.
- No backend logic changed.
- The policy surface was regenerated so the visible contract reflects the updated scope bullets.
