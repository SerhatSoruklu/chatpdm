# Core Primitive Collapse Audit

## Purpose

Phase 10 attempts to collapse each live primitive into the remaining live core:

- `law`
- `authority`
- `power`
- `duty`
- `responsibility`
- `legitimacy`

The audit fails if any live primitive loses its irreducible role.

## Method

For each primitive, the audit checks:

- a unique authored role marker
- authored anti-collapse boundaries
- a pressure scenario showing the primitive survives removal pressure

## Fixture and Scripts

Fixture:

- [phase-10-core-primitive-collapse-audit.json](/home/serhat/code/chatpdm/tests/runtime/fixtures/phase-10-core-primitive-collapse-audit.json)

Runner:

- [run-core-primitive-collapse-audit.js](/home/serhat/code/chatpdm/backend/scripts/run-core-primitive-collapse-audit.js)

Verifier:

- [verify-core-primitive-collapse-audit.js](/home/serhat/code/chatpdm/backend/scripts/verify-core-primitive-collapse-audit.js)

## Failure Rule

If any primitive becomes reducible under the audit, the verifier returns `SYSTEM FAIL`.
