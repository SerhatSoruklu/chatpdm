# Multi-Pack Registry Migration Note

## Purpose

This note records the shared-system shift from manifest-only discovery to registry-aware multi-pack orchestration.

## Current Behavior

- Manifest discovery remains the source of truth for concrete pack admission.
- `pack-registry.json` provides the canonical dependency and ordering plan when present.
- Discovery and release order now follow the registry when the registry exists.
- Temporary roots without a registry keep the existing fallback behavior.
- Planned packs remain registry-only until a manifest exists.
- Umbrella labels are metadata only and are not executable packs.
- Current baseline entries map through `manifestPackId` so the legacy admitted packs can stay stable while the canonical v1 registry names are introduced.

## Operational Rules

- Every executable pack in the registry MUST appear after its dependencies.
- The registry MUST remain acyclic.
- A discovered manifest-backed pack MUST be declared in the registry when the registry is present.
- A discovered manifest-backed pack MUST NOT be released if its registry entry is marked `planned`.

## Locations

- Registry file: `backend/src/modules/military-constraints/pack-registry.json`
- Human-readable dependency plan: `docs/military-constraints/PACK_DEPENDENCY_DAG_V1.md`
