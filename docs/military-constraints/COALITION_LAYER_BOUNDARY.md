# Coalition Layer Boundary

## Purpose

This document records the boundary between the shared coalition interoperability layer and the national pack families that depend on it.

## Coalition Packs

- `NATO_INTEROP_BASE_V1` is the coalition baseline.
- `ALLIED_AUTHORITY_MERGE_V1` is a coalition authority refinement.
- `NATO_ROE_COMPAT_V1` is a coalition ROE compatibility refinement.

## Boundary Rules

- NATO is not a country pack family.
- Coalition packs MUST remain separate from national packs.
- National packs MAY depend on the coalition layer explicitly.
- Coalition packs MUST NOT depend on national authority assumptions unless the dependency is declared and source-backed.
- `US_COALITION_INTEROP_V1` remains a national adapter and MUST NOT be treated as the coalition root.

## Current Dependency Shape

- `NATO_INTEROP_BASE_V1` depends on `INTL_LOAC_BASE_V1`.
- `ALLIED_AUTHORITY_MERGE_V1` depends on `NATO_INTEROP_BASE_V1`.
- `NATO_ROE_COMPAT_V1` depends on `NATO_INTEROP_BASE_V1`.
- `US_COALITION_INTEROP_V1` depends on `NATO_INTEROP_BASE_V1`.

## Non-Goals

- No national jurisdiction is created for NATO.
- No coalition pack replaces a national pack.
- No overlay is promoted into a national base by implication.
