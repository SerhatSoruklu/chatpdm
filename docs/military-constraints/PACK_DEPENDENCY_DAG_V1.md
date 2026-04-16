# PACK_DEPENDENCY_DAG_V1

## 1. Purpose

This document defines the canonical dependency DAG and pack registry plan for controlled multi-pack growth in the military-constraints subsystem.

It is human-auditable, explicit, acyclic, and deterministic.

It does not define runtime execution logic.

## 2. Scope

This specification covers the current admitted baseline packs, the admitted foundation wave, the admitted overlay wave, and the near-term roadmap needed to drive the next implementation waves.

It does not expand the roadmap into a flat 50-pack registry.

It does not treat umbrella labels as executable packs.

## 3. Status and Kind Rules

Status values:

- `baseline` means the pack is part of the currently frozen admitted surface.
- `admitted` means the pack is admitted but not part of the frozen baseline surface.
- `planned` means the pack is not yet admitted and remains a roadmap item.

Kind values:

- `foundation` means the pack provides reusable cross-domain primitives or shared legal/authority structure.
- `domain` means the pack defines a bounded executable operating context.
- `overlay` means the pack refines, restricts, or specializes a foundation or domain pack.
- `umbrella-label` means the entry is a family label only and MUST NOT be treated as an executable pack.

Dependency rules:

- Every executable pack MUST list explicit upstream dependencies.
- The DAG MUST remain acyclic.
- Umbrella labels MUST NOT be admitted as executable packs.
- Dependencies MUST point only backward in the registry order.
- Overlay packs MUST declare explicit overlay metadata in the registry:
  - `overlayFamily`
  - `overlayBoundary`
  - `overlayScope`

## 4. Current Admitted Surface

These packs are already admitted in the repository and form the current admitted surface.

| packId | kind | status | depends_on | notes |
| --- | --- | --- | --- | --- |
| `INTL_LOAC_BASE_V1` | `foundation` | `admitted` | `[]` | Shared international legal-floor baseline. |
| `INTL_PROTECTED_PERSON_BASE_V1` | `foundation` | `admitted` | `[INTL_LOAC_BASE_V1]` | Shared international protected-person baseline. |
| `INTL_PROTECTED_SITE_BASE_V1` | `foundation` | `admitted` | `[INTL_LOAC_BASE_V1]` | Shared international protected-site baseline. |
| `UK_NATIONAL_BASE_V1` | `foundation` | `admitted` | `[INTL_LOAC_BASE_V1]` | UK national baseline above the shared international layer. |
| `UK_ROE_BASE_V1` | `foundation` | `admitted` | `[UK_NATIONAL_BASE_V1]` | UK national ROE baseline. |
| `UK_COMMAND_AUTHORITY_V1` | `foundation` | `admitted` | `[UK_ROE_BASE_V1]` | UK command-authority baseline. |
| `UK_DELEGATION_CHAIN_V1` | `foundation` | `admitted` | `[UK_COMMAND_AUTHORITY_V1]` | UK delegation-chain baseline. |
| `US_CORE_V1` | `foundation` | `baseline` | `[]` | Implemented today as `mil-us-core-reference`. |
| `US_PROTECTED_PERSON_STATE_V1` | `foundation` | `baseline` | `[INTL_PROTECTED_PERSON_BASE_V1]` | Implemented today as `mil-us-protected-person-state-core-v0.1.0`. |
| `US_MARITIME_VBSS_V1` | `domain` | `baseline` | `[]` | Implemented today as `mil-us-maritime-vbss-core-v0.1.0`. |
| `US_MEDICAL_PROTECTION_V1` | `overlay` | `baseline` | `[INTL_PROTECTED_SITE_BASE_V1, US_PROTECTED_PERSON_STATE_V1]` | Implemented today as `mil-us-medical-protection-core-v0.1.0`. |
| `US_CIVILIAN_SCHOOL_PROTECTION_V1` | `overlay` | `baseline` | `[INTL_PROTECTED_SITE_BASE_V1, US_PROTECTED_PERSON_STATE_V1]` | Implemented today as `mil-us-civilian-school-protection-core-v0.1.0`. |
| `US_RULES_OF_ENGAGEMENT_BASE_V1` | `foundation` | `admitted` | `[US_CORE_V1]` | Admitted foundation wave; implemented today as `US_RULES_OF_ENGAGEMENT_BASE_V1`. |
| `US_LOAC_COMPLIANCE_V1` | `foundation` | `admitted` | `[US_RULES_OF_ENGAGEMENT_BASE_V1, INTL_LOAC_BASE_V1]` | Admitted foundation wave; implemented today as `US_LOAC_COMPLIANCE_V1`. |
| `US_COMMAND_AUTHORITY_V1` | `foundation` | `admitted` | `[US_CORE_V1, US_PROTECTED_PERSON_STATE_V1]` | Admitted foundation wave; core authority model. |
| `US_DELEGATION_CHAIN_V1` | `foundation` | `admitted` | `[US_COMMAND_AUTHORITY_V1]` | Admitted foundation wave; reusable delegation semantics. |
| `US_PROTECTED_SITE_V1` | `foundation` | `admitted` | `[US_LOAC_COMPLIANCE_V1, US_PROTECTED_PERSON_STATE_V1, INTL_PROTECTED_SITE_BASE_V1]` | Admitted foundation wave; shared protected-location baseline. |
| `NATO_INTEROP_BASE_V1` | `foundation` | `admitted` | `[INTL_LOAC_BASE_V1]` | Coalition interoperability foundation baseline. |
| `ALLIED_AUTHORITY_MERGE_V1` | `overlay` | `admitted` | `[NATO_INTEROP_BASE_V1]` | Coalition authority-merge refinement. |
| `NATO_ROE_COMPAT_V1` | `overlay` | `admitted` | `[NATO_INTEROP_BASE_V1]` | Coalition ROE-compatibility refinement. |
| `US_COALITION_INTEROP_V1` | `foundation` | `admitted` | `[NATO_INTEROP_BASE_V1]` | Admitted national adapter; coalition compatibility baseline layered over NATO. |
| `US_AIRSPACE_CONTROL_V1` | `domain` | `admitted` | `[US_RULES_OF_ENGAGEMENT_BASE_V1, US_LOAC_COMPLIANCE_V1, US_COMMAND_AUTHORITY_V1, US_DELEGATION_CHAIN_V1, US_PROTECTED_SITE_V1]` | Pack 6. First executable air-domain pack. |
| `US_GROUND_MANEUVER_V1` | `domain` | `admitted` | `[US_LOAC_COMPLIANCE_V1, US_COMMAND_AUTHORITY_V1, US_DELEGATION_CHAIN_V1]` | First executable ground-domain pack. |
| `US_CHECKPOINT_ADMISSIBILITY_V1` | `domain` | `admitted` | `[US_LOAC_COMPLIANCE_V1, US_COMMAND_AUTHORITY_V1]` | Bounded checkpoint domain. |
| `US_SEARCH_AND_SEIZURE_V1` | `domain` | `admitted` | `[US_LOAC_COMPLIANCE_V1, US_COMMAND_AUTHORITY_V1]` | Bounded search/seizure domain. |
| `US_DETENTION_HANDLING_V1` | `domain` | `admitted` | `[US_LOAC_COMPLIANCE_V1, US_PROTECTED_PERSON_STATE_V1]` | Bounded detention/custody domain. |
| `US_NO_FLY_ZONE_V1` | `overlay` | `admitted` | `[US_AIRSPACE_CONTROL_V1]` | Airspace restriction overlay. |
| `US_TARGET_APPROVAL_V1` | `overlay` | `admitted` | `[US_AIRSPACE_CONTROL_V1, US_LOAC_COMPLIANCE_V1]` | Operational approval gate. |
| `US_COLLATERAL_DAMAGE_ASSESSMENT_V1` | `overlay` | `admitted` | `[US_LOAC_COMPLIANCE_V1, US_PROTECTED_SITE_V1]` | Civilian-harm refinement. |
| `US_HOSPITAL_PROTECTION_V1` | `overlay` | `admitted` | `[US_PROTECTED_SITE_V1, US_MEDICAL_PROTECTION_V1]` | Hospital-specific overlay. |
| `US_SCHOOL_ZONE_RESTRICTION_V1` | `overlay` | `admitted` | `[US_PROTECTED_SITE_V1, US_CIVILIAN_SCHOOL_PROTECTION_V1]` | School-zone restriction overlay. |
| `US_RELIGIOUS_SITE_PROTECTION_V1` | `overlay` | `admitted` | `[US_PROTECTED_SITE_V1]` | Religious-site overlay. |
| `US_CULTURAL_PROPERTY_PROTECTION_V1` | `overlay` | `admitted` | `[US_PROTECTED_SITE_V1]` | Cultural-property overlay. |
| `US_AID_DELIVERY_SECURITY_V1` | `overlay` | `admitted` | `[US_LOAC_COMPLIANCE_V1, US_PROTECTED_SITE_V1]` | Aid-delivery security overlay; scope-adjusted to the admitted legal/protection layer. |
| `US_EVACUATION_ROUTE_V1` | `overlay` | `admitted` | `[US_LOAC_COMPLIANCE_V1, US_PROTECTED_SITE_V1]` | Evacuation-route overlay; scope-adjusted to the admitted legal/protection layer. |
| `US_NIGHT_OPERATION_V1` | `overlay` | `admitted` | `[US_LOAC_COMPLIANCE_V1]` | Temporal-condition overlay. |
| `US_WEATHER_LIMITATION_V1` | `overlay` | `admitted` | `[US_AIRSPACE_CONTROL_V1, US_GROUND_MANEUVER_V1, US_MARITIME_VBSS_V1]` | Environmental limitation overlay. |
| `US_SIGNAL_INTERFERENCE_V1` | `overlay` | `admitted` | `[US_LOAC_COMPLIANCE_V1, US_COMMAND_AUTHORITY_V1]` | Technical-effects overlay; scope-adjusted to admitted authority/legal primitives. |
| `US_ISR_RETENTION_V1` | `overlay` | `admitted` | `[US_COALITION_INTEROP_V1, US_COMMAND_AUTHORITY_V1]` | ISR retention/governance overlay; scope-adjusted to the admitted coalition/authority layer. |
| `US_WEAPON_STATUS_V1` | `overlay` | `admitted` | `[US_LOAC_COMPLIANCE_V1, US_COMMAND_AUTHORITY_V1]` | Equipment/weapon-state overlay. |
| `US_ALLIED_ROE_MERGE_V1` | `overlay` | `admitted` | `[US_COALITION_INTEROP_V1]` | Coalition merge overlay. |
| `UK_AIRSPACE_CONTROL_V1` | `domain` | `admitted` | `[UK_ROE_BASE_V1, UK_COMMAND_AUTHORITY_V1, UK_DELEGATION_CHAIN_V1]` | First executable UK air-domain pack. |
| `UK_GROUND_MANEUVER_V1` | `domain` | `admitted` | `[UK_ROE_BASE_V1, UK_COMMAND_AUTHORITY_V1, UK_DELEGATION_CHAIN_V1]` | First executable UK ground-domain pack. |
| `CA_NATIONAL_BASE_V1` | `foundation` | `admitted` | `[INTL_LOAC_BASE_V1]` | Canada national baseline above the shared international layer. |
| `CA_ROE_BASE_V1` | `foundation` | `admitted` | `[CA_NATIONAL_BASE_V1]` | Canada national ROE baseline. |
| `CA_COMMAND_AUTHORITY_V1` | `foundation` | `admitted` | `[CA_ROE_BASE_V1]` | Canada command-authority baseline. |
| `CA_DELEGATION_CHAIN_V1` | `foundation` | `admitted` | `[CA_COMMAND_AUTHORITY_V1]` | Canada delegation-chain baseline. |
| `CA_AIRSPACE_CONTROL_V1` | `domain` | `admitted` | `[CA_ROE_BASE_V1, CA_COMMAND_AUTHORITY_V1, CA_DELEGATION_CHAIN_V1]` | First executable Canada air-domain pack. |
| `AU_NATIONAL_BASE_V1` | `foundation` | `admitted` | `[INTL_LOAC_BASE_V1]` | Australia national baseline above the shared international layer. |
| `AU_ROE_BASE_V1` | `foundation` | `admitted` | `[AU_NATIONAL_BASE_V1]` | Australia national ROE baseline. |
| `AU_COMMAND_AUTHORITY_V1` | `foundation` | `admitted` | `[AU_ROE_BASE_V1]` | Australia command-authority baseline. |
| `AU_DELEGATION_CHAIN_V1` | `foundation` | `admitted` | `[AU_COMMAND_AUTHORITY_V1]` | Australia delegation-chain baseline. |
| `AU_AIRSPACE_CONTROL_V1` | `domain` | `admitted` | `[AU_ROE_BASE_V1, AU_COMMAND_AUTHORITY_V1, AU_DELEGATION_CHAIN_V1]` | First executable Australia air-domain pack. |
| `NL_NATIONAL_BASE_V1` | `foundation` | `admitted` | `[INTL_LOAC_BASE_V1]` | Netherlands national baseline above the shared international layer. |
| `NL_ROE_BASE_V1` | `foundation` | `admitted` | `[NL_NATIONAL_BASE_V1]` | Netherlands national ROE baseline. |
| `NL_COMMAND_AUTHORITY_V1` | `foundation` | `admitted` | `[NL_ROE_BASE_V1]` | Netherlands command-authority baseline. |
| `NL_DELEGATION_CHAIN_V1` | `foundation` | `admitted` | `[NL_COMMAND_AUTHORITY_V1]` | Netherlands delegation-chain baseline. |
| `NL_AIRSPACE_CONTROL_V1` | `domain` | `admitted` | `[NL_ROE_BASE_V1, NL_COMMAND_AUTHORITY_V1, NL_DELEGATION_CHAIN_V1]` | First executable Netherlands air-domain pack. |
| `TR_NATIONAL_BASE_V1` | `foundation` | `admitted` | `[INTL_LOAC_BASE_V1]` | Turkey national baseline above the shared international layer. |
| `TR_ROE_BASE_V1` | `foundation` | `admitted` | `[TR_NATIONAL_BASE_V1]` | Turkey national ROE baseline. |
| `TR_COMMAND_AUTHORITY_V1` | `foundation` | `admitted` | `[TR_ROE_BASE_V1]` | Turkey command-authority baseline. |
| `TR_DELEGATION_CHAIN_V1` | `foundation` | `admitted` | `[TR_COMMAND_AUTHORITY_V1]` | Turkey delegation-chain baseline. |
| `TR_AIRSPACE_CONTROL_V1` | `domain` | `admitted` | `[TR_ROE_BASE_V1, TR_COMMAND_AUTHORITY_V1, TR_DELEGATION_CHAIN_V1]` | First executable Turkey air-domain pack. |

## 4.1 Overlay Family Map

The admitted overlay surface is rationalized by family and boundary rather than by country duplication.

| overlayFamily | overlayBoundary | overlayScope | Representative packs | Boundary rule |
| --- | --- | --- | --- | --- |
| `protection` | `person_site_bridge` | `jurisdictional` | `US_MEDICAL_PROTECTION_V1` | Bridges person-state and site baselines without collapsing them. |
| `protection` | `site` | `jurisdictional` | `US_HOSPITAL_PROTECTION_V1`, `US_SCHOOL_ZONE_RESTRICTION_V1`, `US_RELIGIOUS_SITE_PROTECTION_V1`, `US_CULTURAL_PROPERTY_PROTECTION_V1` | Site-only protection overlays stay distinct from person-state overlays. |
| `targeting_refinement` | `airspace` | `jurisdictional` | `US_NO_FLY_ZONE_V1` | Refines airspace control rather than replacing it. |
| `targeting_refinement` | `authority` | `jurisdictional` | `US_TARGET_APPROVAL_V1` | Adds an explicit approval gate and does not widen authority by implication. |
| `targeting_refinement` | `civilian_harm` | `jurisdictional` | `US_COLLATERAL_DAMAGE_ASSESSMENT_V1` | Civilian-harm refinement stays attached to legal-floor and protected-site dependencies. |
| `retention` | `surveillance_retention` | `jurisdictional` | `US_ISR_RETENTION_V1` | Retention/governance overlay remains separate from the surveillance domain that will consume it later. |
| `operational_condition` | `mission_route` | `jurisdictional` | `US_AID_DELIVERY_SECURITY_V1`, `US_EVACUATION_ROUTE_V1` | Mission-route refinements stay bounded to declared humanitarian/security path constraints. |
| `operational_condition` | `environment` | `jurisdictional` | `US_NIGHT_OPERATION_V1`, `US_WEATHER_LIMITATION_V1`, `US_SIGNAL_INTERFERENCE_V1` | Environmental overlays remain condition refinements, not domains. |
| `operational_condition` | `equipment_state` | `jurisdictional` | `US_WEAPON_STATUS_V1` | Equipment-state overlays remain separate from legal-floor authority rules. |
| `coalition_merge` | `coalition` | `coalition` | `ALLIED_AUTHORITY_MERGE_V1`, `NATO_ROE_COMPAT_V1` | Coalition merge overlays never replace national or INTL baselines. |
| `coalition_merge` | `coalition` | `jurisdictional` | `US_ALLIED_ROE_MERGE_V1` | National adapter over the coalition baseline, not a coalition root. |

No admitted overlay pack is currently promoted as a global executable overlay.
Global reuse is expressed through the family map and explicit dependencies, not through per-country duplication.

## 5. Planned Dependency DAG

The following packs define the remaining near-term roadmap.

| packId | kind | status | depends_on | notes |
| --- | --- | --- | --- | --- |
| `US_SURVEILLANCE_ADMISSIBILITY_V1` | `domain` | `planned` | `[US_LOAC_COMPLIANCE_V1, US_COMMAND_AUTHORITY_V1]` | Bounded surveillance domain. |
| `US_DRONE_OPERATION_V1` | `domain` | `planned` | `[US_AIRSPACE_CONTROL_V1, US_SURVEILLANCE_ADMISSIBILITY_V1]` | Platform-specific air/surveillance domain. |
| `US_HUMANITARIAN_OPERATION_V1` | `domain` | `planned` | `[US_LOAC_COMPLIANCE_V1, US_PROTECTED_SITE_V1]` | Humanitarian mission domain. |
| `US_RESCUE_MISSION_V1` | `domain` | `planned` | `[US_HUMANITARIAN_OPERATION_V1, US_COMMAND_AUTHORITY_V1]` | Rescue operation domain. |
| `US_HOSTAGE_RESPONSE_V1` | `domain` | `planned` | `[US_DETENTION_HANDLING_V1, US_COMMAND_AUTHORITY_V1]` | Hostage-response domain. |
| `US_RAPID_RESPONSE_V1` | `domain` | `planned` | `[US_GROUND_MANEUVER_V1, US_AIRSPACE_CONTROL_V1, US_MARITIME_VBSS_V1]` | Broad rapid-response domain. |
| `US_ELECTRONIC_WARFARE_V1` | `domain` | `planned` | `[US_LOAC_COMPLIANCE_V1, US_COMMAND_AUTHORITY_V1]` | EW domain. |
| `US_CYBER_OPERATIONS_V1` | `domain` | `planned` | `[US_LOAC_COMPLIANCE_V1, US_COMMAND_AUTHORITY_V1]` | Cyber domain. |
| `US_NO_STRIKE_LIST_V1` | `overlay` | `planned` | `[US_LOAC_COMPLIANCE_V1, US_PROTECTED_SITE_V1]` | Restrictive targeting overlay. |
| `US_AIR_V1` | `umbrella-label` | `planned` | `[US_AIRSPACE_CONTROL_V1]` | Family label only; never executable. |

## 6. Admission Order

The implementation waves MUST follow this order:

### Wave 0

- `INTL_LOAC_BASE_V1`
- `INTL_PROTECTED_PERSON_BASE_V1`
- `INTL_PROTECTED_SITE_BASE_V1`

### Wave 1

- `UK_NATIONAL_BASE_V1`
- `UK_ROE_BASE_V1`
- `UK_COMMAND_AUTHORITY_V1`
- `UK_DELEGATION_CHAIN_V1`

### Wave 2

- `US_CORE_V1`
- `US_PROTECTED_PERSON_STATE_V1`
- `US_MARITIME_VBSS_V1`
- `US_MEDICAL_PROTECTION_V1`
- `US_CIVILIAN_SCHOOL_PROTECTION_V1`

### Wave 3

- `US_RULES_OF_ENGAGEMENT_BASE_V1`
- `US_LOAC_COMPLIANCE_V1`
- `US_COMMAND_AUTHORITY_V1`
- `US_DELEGATION_CHAIN_V1`
- `US_PROTECTED_SITE_V1`

### Coalition Wave

- `NATO_INTEROP_BASE_V1`
- `ALLIED_AUTHORITY_MERGE_V1`
- `NATO_ROE_COMPAT_V1`
- `US_COALITION_INTEROP_V1`

### Wave 4

- `US_AIRSPACE_CONTROL_V1`
- `US_GROUND_MANEUVER_V1`
- `US_CHECKPOINT_ADMISSIBILITY_V1`
- `US_SEARCH_AND_SEIZURE_V1`
- `US_DETENTION_HANDLING_V1`

### Wave 5

Admitted overlay wave:

- `US_NO_FLY_ZONE_V1`
- `US_TARGET_APPROVAL_V1`
- `US_COLLATERAL_DAMAGE_ASSESSMENT_V1`
- `US_HOSPITAL_PROTECTION_V1`
- `US_SCHOOL_ZONE_RESTRICTION_V1`
- `US_RELIGIOUS_SITE_PROTECTION_V1`
- `US_CULTURAL_PROPERTY_PROTECTION_V1`
- `US_AID_DELIVERY_SECURITY_V1`
- `US_EVACUATION_ROUTE_V1`
- `US_NIGHT_OPERATION_V1`
- `US_WEATHER_LIMITATION_V1`
- `US_SIGNAL_INTERFERENCE_V1`
- `US_ISR_RETENTION_V1`
- `US_WEAPON_STATUS_V1`
- `US_ALLIED_ROE_MERGE_V1`

### Wave 6

Admitted UK domain wave:

- `UK_AIRSPACE_CONTROL_V1`
- `UK_GROUND_MANEUVER_V1`

### Wave 7

Admitted Canada/Australia national and first domain proof wave:

- `CA_NATIONAL_BASE_V1`
- `CA_ROE_BASE_V1`
- `CA_COMMAND_AUTHORITY_V1`
- `CA_DELEGATION_CHAIN_V1`
- `CA_AIRSPACE_CONTROL_V1`
- `AU_NATIONAL_BASE_V1`
- `AU_ROE_BASE_V1`
- `AU_COMMAND_AUTHORITY_V1`
- `AU_DELEGATION_CHAIN_V1`
- `AU_AIRSPACE_CONTROL_V1`

### Wave 8

Admitted Netherlands national and first domain proof wave:

- `NL_NATIONAL_BASE_V1`
- `NL_ROE_BASE_V1`
- `NL_COMMAND_AUTHORITY_V1`
- `NL_DELEGATION_CHAIN_V1`
- `NL_AIRSPACE_CONTROL_V1`

### Wave 9

Admitted Turkey national and first domain proof wave:

- `TR_NATIONAL_BASE_V1`
- `TR_ROE_BASE_V1`
- `TR_COMMAND_AUTHORITY_V1`
- `TR_DELEGATION_CHAIN_V1`
- `TR_AIRSPACE_CONTROL_V1`

Remaining overlay and umbrella packs stay planned:

- `US_SURVEILLANCE_ADMISSIBILITY_V1`
- `US_DRONE_OPERATION_V1`
- `US_HUMANITARIAN_OPERATION_V1`
- `US_RESCUE_MISSION_V1`
- `US_HOSTAGE_RESPONSE_V1`
- `US_RAPID_RESPONSE_V1`
- `US_ELECTRONIC_WARFARE_V1`
- `US_CYBER_OPERATIONS_V1`
- `US_NO_STRIKE_LIST_V1`
- `US_AIR_V1`

## 8. Boundary Notes

- `US_MEDICAL_PROTECTION_V1` and `US_CIVILIAN_SCHOOL_PROTECTION_V1` are existing baseline overlays and are not rebuilt in this wave.
- `INTL_LOAC_BASE_V1`, `INTL_PROTECTED_PERSON_BASE_V1`, and `INTL_PROTECTED_SITE_BASE_V1` are the shared international baselines used by both the UK and US national layers.
- `US_PROTECTED_PERSON_STATE_V1`, `US_LOAC_COMPLIANCE_V1`, `US_PROTECTED_SITE_V1`, `US_MEDICAL_PROTECTION_V1`, and `US_CIVILIAN_SCHOOL_PROTECTION_V1` now declare explicit INTL ancestry so the shared baseline remains visible in the US surface.
- `UK_NATIONAL_BASE_V1`, `UK_ROE_BASE_V1`, `UK_COMMAND_AUTHORITY_V1`, and `UK_DELEGATION_CHAIN_V1` declare explicit INTL ancestry so the shared baseline remains visible in the UK surface.
- `US_HOSPITAL_PROTECTION_V1` is attached to `US_MEDICAL_PROTECTION_V1` and `US_PROTECTED_SITE_V1` so site-specific protection does not absorb person-state semantics.
- `US_SCHOOL_ZONE_RESTRICTION_V1` is attached to `US_CIVILIAN_SCHOOL_PROTECTION_V1` and `US_PROTECTED_SITE_V1` for the same reason.
- `US_AID_DELIVERY_SECURITY_V1` and `US_EVACUATION_ROUTE_V1` are scope-adjusted to the admitted legal/protection layer because `US_HUMANITARIAN_OPERATION_V1` remains planned.
- `US_SIGNAL_INTERFERENCE_V1` is scope-adjusted to admitted authority/legal primitives because the EW and cyber domain packs remain planned.
- `US_ISR_RETENTION_V1` is scope-adjusted to the admitted coalition/authority layer because `US_SURVEILLANCE_ADMISSIBILITY_V1` remains planned.
- `US_WEATHER_LIMITATION_V1` and `US_NIGHT_OPERATION_V1` remain overlay refinements rather than domains.
- `US_ALLIED_ROE_MERGE_V1` is admitted as a LAND-slice overlay; a broader multi-domain merge pack remains planned.
- `NATO_INTEROP_BASE_V1` is the coalition-layer foundation.
- `ALLIED_AUTHORITY_MERGE_V1` and `NATO_ROE_COMPAT_V1` are coalition overlays that refine the coalition layer without replacing national layers.
- `US_COALITION_INTEROP_V1` remains a national adapter and now depends on the coalition layer instead of acting as the coalition root.
- `CA_NATIONAL_BASE_V1`, `CA_ROE_BASE_V1`, `CA_COMMAND_AUTHORITY_V1`, and `CA_DELEGATION_CHAIN_V1` declare explicit INTL ancestry so the shared baseline remains visible in the Canada surface.
- `AU_NATIONAL_BASE_V1`, `AU_ROE_BASE_V1`, `AU_COMMAND_AUTHORITY_V1`, and `AU_DELEGATION_CHAIN_V1` declare explicit INTL ancestry so the shared baseline remains visible in the Australia surface.
- `CA_AIRSPACE_CONTROL_V1` and `AU_AIRSPACE_CONTROL_V1` are the first executable air-domain packs for their national families and remain bounded to the admitted national foundation layer.
- `NL_NATIONAL_BASE_V1`, `NL_ROE_BASE_V1`, `NL_COMMAND_AUTHORITY_V1`, and `NL_DELEGATION_CHAIN_V1` declare explicit INTL ancestry so the shared baseline remains visible in the Netherlands surface.
- `NL_AIRSPACE_CONTROL_V1` is the first executable air-domain pack for the Netherlands and remains bounded to the admitted national foundation layer.
- `TR_NATIONAL_BASE_V1`, `TR_ROE_BASE_V1`, `TR_COMMAND_AUTHORITY_V1`, and `TR_DELEGATION_CHAIN_V1` declare explicit INTL ancestry so the shared baseline remains visible in the Turkey surface.
- `TR_AIRSPACE_CONTROL_V1` is the first executable air-domain pack for Turkey and remains bounded to the admitted national foundation layer.
- `UK_INTL_BOUNDARY.md` records the UK-specific shared-baseline boundary separately from the US notes.

## 7. Non-Goals

This document is not:

- a runtime dependency resolver
- a 50-pack flat registry
- an umbrella-pack admission policy
- a semantics redesign
- a speculative future-scope expansion

Any change to the DAG MUST remain explicit, acyclic, and human-auditable.

## 8. Shared International Boundary

The admitted INTL baseline packs are the shared international legal and protection layer for future harmonization work.

They MUST remain free of US-specific authority assumptions, US-specific ROE structure, and US-specific command modeling.

The existing US surface remains admitted and usable as-is. This document records the shared INTL baseline explicitly so later phases can choose where to depend on it without ambiguity.
