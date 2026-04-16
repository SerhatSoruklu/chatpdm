# Multi-Pack Truth Audit

## Purpose

This audit records the current truth surface for the military-constraints subsystem after the admitted multi-pack expansion.

It compares implementation truth, API truth, frontend truth, and documentation truth.

## Current Implementation Truth

- Registry-backed packs are explicit in `backend/src/modules/military-constraints/pack-registry.json`.
- The current registry contains:
  - `5` baseline entries
  - `58` admitted executable entries
  - `10` planned entries, including `1` umbrella-label entry
- The registry-backed API surface exposes `73` registry entries, including `1` umbrella-label entry.
- The manifest-backed public catalog exposes `63` packs.
- The registry-backed surface includes the shared INTL legal/protection baseline packs and the UK, CA, AU, NL, and TR national foundation waves as admitted entries.
- The US family now declares explicit INTL ancestry for the LOAC, protected-person, protected-site, medical, and school-protection layers.
- The UK, CA, AU, NL, and TR families now declare explicit INTL ancestry for their national, ROE, command-authority, and delegation-chain foundation layers.
- The coalition layer is now surfaced explicitly via `NATO_INTEROP_BASE_V1`, `ALLIED_AUTHORITY_MERGE_V1`, and `NATO_ROE_COMPAT_V1`.
- `US_COALITION_INTEROP_V1` remains a national adapter layered over the coalition baseline.
- Overlay packs now surface explicit family metadata in the registry and API:
  - `protection` overlays split cleanly into `person_site_bridge` and `site` boundaries.
  - `targeting_refinement` overlays cover airspace, authority, and civilian-harm refinements.
  - `retention` overlays remain separate from downstream surveillance domains.
  - `operational_condition` overlays cover mission-route, environmental, and equipment-state refinements.
  - `coalition_merge` overlays remain coalition-specific or national-adapter refinements.
- The UK domain wave now admits `UK_AIRSPACE_CONTROL_V1` and `UK_GROUND_MANEUVER_V1` as executable domain packs.
- The CA domain wave now admits `CA_NATIONAL_BASE_V1`, `CA_ROE_BASE_V1`, `CA_COMMAND_AUTHORITY_V1`, `CA_DELEGATION_CHAIN_V1`, and `CA_AIRSPACE_CONTROL_V1` as executable/admitted packs.
- The AU domain wave now admits `AU_NATIONAL_BASE_V1`, `AU_ROE_BASE_V1`, `AU_COMMAND_AUTHORITY_V1`, `AU_DELEGATION_CHAIN_V1`, and `AU_AIRSPACE_CONTROL_V1` as executable/admitted packs.
- The NL national wave now admits `NL_NATIONAL_BASE_V1`, `NL_ROE_BASE_V1`, `NL_COMMAND_AUTHORITY_V1`, `NL_DELEGATION_CHAIN_V1`, and `NL_AIRSPACE_CONTROL_V1` as executable/admitted packs.
- The TR national wave now admits `TR_NATIONAL_BASE_V1`, `TR_ROE_BASE_V1`, `TR_COMMAND_AUTHORITY_V1`, `TR_DELEGATION_CHAIN_V1`, and `TR_AIRSPACE_CONTROL_V1` as executable/admitted packs.
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
  - `overlayFamily`
  - `overlayBoundary`
  - `overlayScope`
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
  - shared INTL packs
  - national families
  - coalition packs
  - overlay families
  - planned roadmap entries
  - umbrella labels
- The page does not imply executable support for planned packs or umbrella labels.
- The page is static and read-only; it reflects the curated admitted surface rather than discovering live registry data at runtime.

## Documentation Truth

- `docs/military-constraints/PACK_SPEC_V1.md` formalizes the pack contract.
- `docs/military-constraints/PACK_DEPENDENCY_DAG_V1.md` records the admitted surface, planned roadmap, and boundary notes.
- `docs/military-constraints/OVERLAY_LAYER_BOUNDARY.md` records the overlay family and boundary strategy.
- `docs/architecture/military-constraints-compiler-api.md` reflects the registry-backed counts and metadata fields.
- `docs/military-constraints/MULTI_PACK_REGISTRY_MIGRATION.md` records the registry-aware discovery and release behavior.

## Final Cross-Surface Comparison

| Surface | Current truth | Notes |
| --- | --- | --- |
| Implementation state | The admitted subsystem includes INTL, US, UK, NATO / coalition, CA, AU, NL, TR, and explicit overlay-family metadata. | The runtime remains deterministic, refusal-first, and closed-world. |
| Registry state | `pack-registry.json` is the source of truth for `kind`, `status`, `dependsOn`, and overlay boundary metadata. | Planned entries remain non-executable; umbrella labels remain non-executable. |
| API surfaced state | The `/military-constraints` API exposes registry counts and pack metadata, including `overlayFamily`, `overlayBoundary`, and `overlayScope`. | The API does not expose reviewed clauses or compiler notes. |
| Frontend surfaced state | The Military Constraints Compiler page shows shared INTL, national, coalition, overlay, planned, and umbrella categories explicitly. | The page is static; it must be updated when surfaced truth changes. |
| Documentation claims | `PACK_SPEC_V1`, `PACK_DEPENDENCY_DAG_V1`, `OVERLAY_LAYER_BOUNDARY`, `INTL_SHARED_LAYER_BOUNDARY`, `COALITION_LAYER_BOUNDARY`, and the compiler API doc all reflect the admitted multi-jurisdiction surface. | Historical v1 lock docs are now explicitly marked as historical context. |

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
