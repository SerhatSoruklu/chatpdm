# Concepts Module

Deterministic concept storage and resolution logic lives here.

Structured concept schema foundations also live here when they need to be shared
by loaders and validators without requiring immediate runtime enforcement.

Current shared V3 foundation:

- `concept-structure-schema.js`
  - runtime-safe constants for structured concept fields
  - JSDoc interface definitions for future validator/loader integration
  - duty, responsibility, authority, power, and legitimacy schema example exports
  - migration-safe helpers for optional `structureV3` envelopes
- `concept-relation-schema.js`
  - runtime-safe constants for concept relation types
  - allowed direction map for the governance core cluster
  - JSDoc interface definitions for future inter-concept law validation
  - exported relation example objects for internal fixtures and validator adoption
- `concept-relation-loader.js`
  - loads authored relation packets from `data/concepts/relations/`
  - prefers authored relation packets and only uses seed fallback in compatible mode
  - supports `REQUIRE_AUTHORED_RELATIONS=true` for strict authored-only validation
- `concept-validation-state-loader.js`
  - reads `artifacts/register-validation-report.json`
  - exposes runtime-safe governance state flags without recomputing validator law
  - drives runtime `governanceState` payloads for concept-match answers
- `pipeline-runner.js`
  - composes the deterministic LLGS pipeline result
  - attaches non-enumerable `runtime_telemetry` and `zeroglare_diagnostics` inspection surfaces without widening the enumerable response contract

Duty rollout hardening is locked by:

- `backend/scripts/verify-duty-v3.js`
- `tests/validator/fixtures/duty.complete-v3.json`
- `tests/validator/fixtures/duty.partial-v3.json`
- `tests/validator/fixtures/duty.legacy-text-only.json`

Responsibility rollout hardening is locked by:

- `backend/scripts/verify-responsibility-v3.js`
- `tests/validator/fixtures/responsibility.complete-v3.json`
- `tests/validator/fixtures/responsibility.partial-v3.json`
- `tests/validator/fixtures/responsibility.legacy-text-only.json`

Authority rollout hardening is locked by:

- `backend/scripts/verify-authority-v3.js`
- `tests/validator/fixtures/authority.complete-v3.json`
- `tests/validator/fixtures/authority.partial-v3.json`
- `tests/validator/fixtures/authority.legacy-text-only.json`

Power rollout hardening is locked by:

- `backend/scripts/verify-power-v3.js`
- `tests/validator/fixtures/power.complete-v3.json`
- `tests/validator/fixtures/power.partial-v3.json`
- `tests/validator/fixtures/power.legacy-text-only.json`

Legitimacy rollout hardening is locked by:

- `backend/scripts/verify-legitimacy-v3.js`
- `tests/validator/fixtures/legitimacy.complete-v3.json`
- `tests/validator/fixtures/legitimacy.partial-v3.json`
- `tests/validator/fixtures/legitimacy.legacy-text-only.json`

Relation hardening and live enforcement rollout is locked by:

- `backend/scripts/verify-relation-hardening.js`
- `backend/scripts/verify-runtime-validation-state.js`
