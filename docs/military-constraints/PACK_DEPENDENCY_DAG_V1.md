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

## 4. Current Admitted Surface

These packs are already admitted in the repository and form the current admitted surface.

| packId | kind | status | depends_on | notes |
| --- | --- | --- | --- | --- |
| `US_CORE_V1` | `foundation` | `baseline` | `[]` | Implemented today as `mil-us-core-reference`. |
| `US_PROTECTED_PERSON_STATE_V1` | `foundation` | `baseline` | `[]` | Implemented today as `mil-us-protected-person-state-core-v0.1.0`. |
| `US_MARITIME_VBSS_V1` | `domain` | `baseline` | `[]` | Implemented today as `mil-us-maritime-vbss-core-v0.1.0`. |
| `US_MEDICAL_PROTECTION_V1` | `overlay` | `baseline` | `[]` | Implemented today as `mil-us-medical-protection-core-v0.1.0`. |
| `US_CIVILIAN_SCHOOL_PROTECTION_V1` | `overlay` | `baseline` | `[]` | Implemented today as `mil-us-civilian-school-protection-core-v0.1.0`. |
| `US_RULES_OF_ENGAGEMENT_BASE_V1` | `foundation` | `admitted` | `[US_CORE_V1]` | Admitted foundation wave; implemented today as `US_RULES_OF_ENGAGEMENT_BASE_V1`. |
| `US_LOAC_COMPLIANCE_V1` | `foundation` | `admitted` | `[US_RULES_OF_ENGAGEMENT_BASE_V1]` | Admitted foundation wave; implemented today as `US_LOAC_COMPLIANCE_V1`. |
| `US_COMMAND_AUTHORITY_V1` | `foundation` | `admitted` | `[US_CORE_V1, US_PROTECTED_PERSON_STATE_V1]` | Admitted foundation wave; core authority model. |
| `US_DELEGATION_CHAIN_V1` | `foundation` | `admitted` | `[US_COMMAND_AUTHORITY_V1]` | Admitted foundation wave; reusable delegation semantics. |
| `US_PROTECTED_SITE_V1` | `foundation` | `admitted` | `[US_LOAC_COMPLIANCE_V1, US_PROTECTED_PERSON_STATE_V1]` | Admitted foundation wave; shared protected-location baseline. |
| `US_COALITION_INTEROP_V1` | `foundation` | `admitted` | `[US_RULES_OF_ENGAGEMENT_BASE_V1]` | Admitted foundation wave; coalition compatibility baseline. |
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

- Existing baseline packs remain frozen and admitted.

### Wave 1

- `US_RULES_OF_ENGAGEMENT_BASE_V1`
- `US_LOAC_COMPLIANCE_V1`

### Wave 2

- `US_COMMAND_AUTHORITY_V1`
- `US_DELEGATION_CHAIN_V1`
- `US_PROTECTED_SITE_V1`
- `US_COALITION_INTEROP_V1`

### Wave 3

- `US_AIRSPACE_CONTROL_V1`
- `US_GROUND_MANEUVER_V1`
- `US_MARITIME_VBSS_V1` remains an existing baseline domain pack already admitted.
- `US_CHECKPOINT_ADMISSIBILITY_V1`
- `US_SEARCH_AND_SEIZURE_V1`
- `US_DETENTION_HANDLING_V1`
- `US_SURVEILLANCE_ADMISSIBILITY_V1`
- `US_DRONE_OPERATION_V1`
- `US_HUMANITARIAN_OPERATION_V1`
- `US_RESCUE_MISSION_V1`
- `US_HOSTAGE_RESPONSE_V1`
- `US_RAPID_RESPONSE_V1`
- `US_ELECTRONIC_WARFARE_V1`
- `US_CYBER_OPERATIONS_V1`

### Wave 4

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

Remaining overlay packs in this wave stay planned:

- `US_NO_STRIKE_LIST_V1`

### Wave 5

- `US_AIR_V1` remains an umbrella label only and MUST NOT be admitted as an executable pack.

## 8. Boundary Notes

- `US_MEDICAL_PROTECTION_V1` and `US_CIVILIAN_SCHOOL_PROTECTION_V1` are existing baseline overlays and are not rebuilt in this wave.
- `US_HOSPITAL_PROTECTION_V1` is attached to `US_MEDICAL_PROTECTION_V1` and `US_PROTECTED_SITE_V1` so site-specific protection does not absorb person-state semantics.
- `US_SCHOOL_ZONE_RESTRICTION_V1` is attached to `US_CIVILIAN_SCHOOL_PROTECTION_V1` and `US_PROTECTED_SITE_V1` for the same reason.
- `US_AID_DELIVERY_SECURITY_V1` and `US_EVACUATION_ROUTE_V1` are scope-adjusted to the admitted legal/protection layer because `US_HUMANITARIAN_OPERATION_V1` remains planned.
- `US_SIGNAL_INTERFERENCE_V1` is scope-adjusted to admitted authority/legal primitives because the EW and cyber domain packs remain planned.
- `US_ISR_RETENTION_V1` is scope-adjusted to the admitted coalition/authority layer because `US_SURVEILLANCE_ADMISSIBILITY_V1` remains planned.
- `US_WEATHER_LIMITATION_V1` and `US_NIGHT_OPERATION_V1` remain overlay refinements rather than domains.
- `US_ALLIED_ROE_MERGE_V1` is admitted as a LAND-slice overlay; a broader multi-domain merge pack remains planned.

## 7. Non-Goals

This document is not:

- a runtime dependency resolver
- a 50-pack flat registry
- an umbrella-pack admission policy
- a semantics redesign
- a speculative future-scope expansion

Any change to the DAG MUST remain explicit, acyclic, and human-auditable.
