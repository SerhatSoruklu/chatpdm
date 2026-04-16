# Overlay Layer Boundary

## Purpose

This note records how the admitted overlay surface is grouped across international, national, and coalition layers.

It does not add new executable packs.

## Current Overlay Families

| overlayFamily | overlayBoundary | overlayScope | Representative packs | Boundary rule |
| --- | --- | --- | --- | --- |
| `protection` | `person_site_bridge` | `jurisdictional` | `US_MEDICAL_PROTECTION_V1` | Bridges person-state and site baselines without collapsing them. |
| `protection` | `site` | `jurisdictional` | `US_HOSPITAL_PROTECTION_V1`, `US_SCHOOL_ZONE_RESTRICTION_V1`, `US_RELIGIOUS_SITE_PROTECTION_V1`, `US_CULTURAL_PROPERTY_PROTECTION_V1` | Site-only protection overlays remain distinct from person-state overlays. |
| `targeting_refinement` | `airspace` | `jurisdictional` | `US_NO_FLY_ZONE_V1` | Refines airspace control rather than replacing it. |
| `targeting_refinement` | `authority` | `jurisdictional` | `US_TARGET_APPROVAL_V1` | Adds an explicit approval gate without widening authority by implication. |
| `targeting_refinement` | `civilian_harm` | `jurisdictional` | `US_COLLATERAL_DAMAGE_ASSESSMENT_V1` | Civilian-harm refinement remains attached to legal-floor and protected-site dependencies. |
| `retention` | `surveillance_retention` | `jurisdictional` | `US_ISR_RETENTION_V1` | Retention/governance overlay remains separate from downstream surveillance domains. |
| `operational_condition` | `mission_route` | `jurisdictional` | `US_AID_DELIVERY_SECURITY_V1`, `US_EVACUATION_ROUTE_V1` | Mission-route refinements stay bounded to declared humanitarian/security path constraints. |
| `operational_condition` | `environment` | `jurisdictional` | `US_NIGHT_OPERATION_V1`, `US_WEATHER_LIMITATION_V1`, `US_SIGNAL_INTERFERENCE_V1` | Environmental overlays remain condition refinements, not domains. |
| `operational_condition` | `equipment_state` | `jurisdictional` | `US_WEAPON_STATUS_V1` | Equipment-state overlays remain separate from legal-floor authority rules. |
| `coalition_merge` | `coalition` | `coalition` | `ALLIED_AUTHORITY_MERGE_V1`, `NATO_ROE_COMPAT_V1` | Coalition merge overlays never replace national or INTL baselines. |
| `coalition_merge` | `coalition` | `jurisdictional` | `US_ALLIED_ROE_MERGE_V1` | National adapter over the coalition baseline, not a coalition root. |

## Boundary Rules

- No admitted overlay pack is currently promoted as a global executable overlay.
- Cross-jurisdiction reuse is expressed through the family map and explicit dependencies, not through per-country duplication.
- Site-specific and person-specific protections MUST remain separated by declared boundaries.
- Coalition merge overlays MUST remain separate from national authority and INTL baseline packs.
- Overlay packs MUST keep their declared `overlayFamily`, `overlayBoundary`, and `overlayScope` metadata truthful in the registry and API surface.
