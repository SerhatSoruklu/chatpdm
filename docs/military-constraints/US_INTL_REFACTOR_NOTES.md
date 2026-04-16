# US_INTL_REFACTOR_NOTES

## Purpose

This note records what remained US-specific after extracting the shared INTL baseline layer.

## US-Specific Remains

- US command authority remains US-specific.
- US ROE structure remains US-specific.
- US delegation-chain behavior remains US-specific.
- US coalition interoperability remains US-specific.
- US domain and overlay packs continue to own US mission scope, admission behavior, and US-specific fact requirements.

## Shared INTL Boundary

- `INTL_LOAC_BASE_V1` provides the shared legal-floor baseline.
- `INTL_PROTECTED_PERSON_BASE_V1` provides the shared protected-person baseline.
- `INTL_PROTECTED_SITE_BASE_V1` provides the shared protected-site baseline.
- US packs that rely on those baselines MUST declare the dependency explicitly.

## Non-Goals

- No runtime bundle-composition redesign.
- No evaluator behavior change in this refactor step.
- UK expansion is documented separately in `UK_INTL_BOUNDARY.md`.
