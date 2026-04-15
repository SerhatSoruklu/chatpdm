# INTL Shared Layer Boundary

## Purpose

This note records the boundary between the shared international baseline layer and the US-specific military-constraints surface.

## Shared Layer

The INTL layer contains only shared legal and protection baselines:

- `INTL_LOAC_BASE_V1`
- `INTL_PROTECTED_PERSON_BASE_V1`
- `INTL_PROTECTED_SITE_BASE_V1`

These packs are admitted, source-backed, hash-stable, and lifecycle-validated.

## US-Specific Layer

The existing US surface remains intact and continues to own:

- national authority
- national ROE structure
- national command assumptions
- US-specific operational overlays and domains

The UK national foundation layer is documented separately in `UK_INTL_BOUNDARY.md` and also depends on the shared INTL baseline.

## Boundary Rules

- INTL packs MUST NOT encode US authority hierarchy.
- INTL packs MUST NOT encode US ROE policy assumptions.
- US packs MUST NOT be silently widened into generic international policy.
- Any later dependence from US packs to INTL packs MUST remain explicit and registry-backed.

## Current Truth

The shared INTL layer is additive.

The existing US admitted surface remains usable as-is.

This note does not authorize jurisdiction expansion or pack redesign beyond the current prompt.
