# Multi-Pack Truth Audit

## Purpose

This audit records the current truth surface for the military-constraints subsystem after the admitted multi-pack expansion.

It compares implementation truth, API truth, frontend truth, and documentation truth.

## Current Implementation Truth

- Registry-backed packs are explicit in `backend/src/modules/military-constraints/pack-registry.json`.
- The current registry contains:
  - `5` baseline entries
  - `26` admitted executable entries
  - `10` planned entries
  - `1` umbrella-label entry
- The manifest-backed public catalog exposes `31` packs.
- `US_AIRSPACE_CONTROL_V1` is Pack 6.
- `US_AIR_V1` is an umbrella label only and is not executable.

## API Truth

- `GET /api/v1/military-constraints` exposes:
  - `packCount`
  - `registryPackCount`
  - `baselinePackCount`
  - `admittedPackCount`
  - `plannedPackCount`
  - `umbrellaLabelCount`
- `GET /api/v1/military-constraints/packs` exposes registry metadata for each listed pack:
  - `kind`
  - `status`
  - `dependsOn`
  - `registryOrder`
  - `registryPresent`
- `GET /api/v1/military-constraints/packs/:packId` exposes the same registry metadata on the detail surface.
- `POST /api/v1/military-constraints/evaluate` remains structured-facts only and returns:
  - `ALLOWED`
  - `REFUSED`
  - `REFUSED_INCOMPLETE`

## Frontend Truth

- The Military Constraints Compiler page no longer claims that Pack 1 through 5 are the complete surface.
- The page now states that the surfaced catalog distinguishes:
  - frozen baseline packs
  - admitted foundation/domain/overlay waves
  - planned roadmap entries
- The page does not imply executable support for planned packs or umbrella labels.

## Documentation Truth

- `docs/military-constraints/PACK_SPEC_V1.md` formalizes the pack contract.
- `docs/military-constraints/PACK_DEPENDENCY_DAG_V1.md` records the admitted surface, planned roadmap, and boundary notes.
- `docs/architecture/military-constraints-compiler-api.md` reflects the registry-backed counts and metadata fields.
- `docs/military-constraints/MULTI_PACK_REGISTRY_MIGRATION.md` records the registry-aware discovery and release behavior.

## Residual Boundaries

- Planned packs remain registry-only until they have manifests and pass admission.
- Umbrella labels remain non-executable.
- The public API does not expose reviewed clauses.
- The public API does not expose compiler notes.
- The public API does not add `/schema` or `/examples` routes.

## Verification

- Backend validation and regression tests must remain green after any registry or surface update.
- Frontend copy must stay aligned with the admitted registry state.
- Documentation updates must preserve the distinction between admitted, planned, and umbrella entries.
