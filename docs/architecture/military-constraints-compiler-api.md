# Military Constraints Compiler API

The Military Constraints Compiler exposes a bounded, structured public API for discovery and evaluation. It does not accept freeform text, and it does not infer missing scope.

## Decision Contract

The runtime decision contract is closed:

- `ALLOWED`
- `REFUSED`
- `REFUSED_INCOMPLETE`

The API returns the bounded public projection of the underlying military-constraints evaluator. It does not expose internal trace fields on the public route, and it does not reinterpret refusal into advice or explanation.

## Endpoints

### `GET /api/v1/military-constraints`

Returns the public surface summary.

Example response:

```json
{
  "resource": "military-constraints",
  "status": "active",
  "availableOperations": ["packs", "evaluate"],
  "packCount": 63,
  "registryPackCount": 73,
  "baselinePackCount": 5,
  "admittedPackCount": 58,
  "plannedPackCount": 10,
  "umbrellaLabelCount": 1
}
```

### `GET /api/v1/military-constraints/packs`

Returns the current manifest-backed admitted pack catalog.

Example response:

```json
{
  "resource": "military-constraints",
  "status": "active",
  "packs": [
    {
      "packId": "INTL_LOAC_BASE_V1",
      "bundleId": "intl-loac-base-bundle",
      "bundleVersion": "0.1.0",
      "jurisdiction": "INTL",
      "authorityGraphId": "AUTH-GRAPH-INTL-001",
      "reviewedClauseSetIds": [
        "intl-loac-base-core"
      ],
      "kind": "foundation",
      "status": "admitted",
      "dependsOn": [
        "INTL_LOAC_BASE_V1"
      ],
      "registryOrder": 0,
      "registryPresent": true
    }
  ]
}
```

The order is deterministic and currently follows the pack catalog order used by the backend.
The current catalog includes the frozen baseline packs, the admitted INTL shared baseline, the admitted UK, CA, AU, NL, and TR national foundation waves, the admitted coalition layer, and the admitted foundation, domain, and overlay waves.
The root surface also reports registry-backed counts for baseline, admitted, planned, and umbrella-label entries.
Each listed pack exposes registry metadata fields for `kind`, `status`, `dependsOn`, `registryOrder`, and `registryPresent`.
Overlay packs also expose `overlayFamily`, `overlayBoundary`, and `overlayScope` so the public surface can distinguish protection, targeting, retention, operational-condition, and coalition-merge overlays.
The surfaced registry now makes INTL ancestry explicit for the protected-person, protected-site, UK/CA/AU/NL/TR national baselines, coalition baseline, and related US protection layers.

### `GET /api/v1/military-constraints/packs/:packId`

Returns one pack’s validated metadata.

`packId` must match a known admitted pack identifier, for example:

- `INTL_LOAC_BASE_V1`
- `INTL_PROTECTED_PERSON_BASE_V1`
- `INTL_PROTECTED_SITE_BASE_V1`
- `UK_NATIONAL_BASE_V1`
- `UK_ROE_BASE_V1`
- `UK_COMMAND_AUTHORITY_V1`
- `UK_DELEGATION_CHAIN_V1`
- `UK_AIRSPACE_CONTROL_V1`
- `UK_GROUND_MANEUVER_V1`
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
- `NL_NATIONAL_BASE_V1`
- `NL_ROE_BASE_V1`
- `NL_COMMAND_AUTHORITY_V1`
- `NL_DELEGATION_CHAIN_V1`
- `NL_AIRSPACE_CONTROL_V1`
- `TR_NATIONAL_BASE_V1`
- `TR_ROE_BASE_V1`
- `TR_COMMAND_AUTHORITY_V1`
- `TR_DELEGATION_CHAIN_V1`
- `TR_AIRSPACE_CONTROL_V1`
- `mil-us-core-reference`
- `mil-us-protected-person-state-core-v0.1.0`
- `mil-us-maritime-vbss-core-v0.1.0`
- `mil-us-medical-protection-core-v0.1.0`
- `mil-us-civilian-school-protection-core-v0.1.0`
- `US_RULES_OF_ENGAGEMENT_BASE_V1`
- `US_LOAC_COMPLIANCE_V1`
- `US_COMMAND_AUTHORITY_V1`
- `US_DELEGATION_CHAIN_V1`
- `US_PROTECTED_SITE_V1`
- `NATO_INTEROP_BASE_V1`
- `ALLIED_AUTHORITY_MERGE_V1`
- `NATO_ROE_COMPAT_V1`
- `US_COALITION_INTEROP_V1`
- `US_AIRSPACE_CONTROL_V1`
- `US_GROUND_MANEUVER_V1`
- `US_CHECKPOINT_ADMISSIBILITY_V1`
- `US_SEARCH_AND_SEIZURE_V1`
- `US_DETENTION_HANDLING_V1`
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

If the pack ID is malformed or unknown, the route fails closed.

Example response:

```json
{
  "resource": "military-constraints",
  "status": "active",
  "pack": {
    "packId": "mil-us-medical-protection-core-v0.1.0",
    "bundleId": "mil-us-medical-protection-core-bundle",
    "bundleVersion": "0.1.0",
    "jurisdiction": "US",
    "authorityGraphId": "AUTH-GRAPH-US-001",
    "reviewedClauseSetIds": [
      "legal-floor-medical-core",
      "authority-medical-core",
      "policy-overlay-medical-core"
    ],
    "kind": "overlay",
    "status": "baseline",
    "dependsOn": [
      "INTL_PROTECTED_SITE_BASE_V1",
      "US_PROTECTED_PERSON_STATE_V1"
    ],
    "overlayFamily": "protection",
    "overlayBoundary": "person_site_bridge",
    "overlayScope": "jurisdictional",
    "registryOrder": 10,
    "registryPresent": true,
    "sourceRegistryVersion": "1.0.0",
    "regressionSuiteVersion": "0.1.0"
  }
}
```

### `POST /api/v1/military-constraints/evaluate`

Evaluates one structured fact packet against one referenced pack.

Request shape:

```json
{
  "packId": "mil-us-medical-protection-core-v0.1.0",
  "facts": {
    "bundleId": "mil-us-medical-protection-core-bundle",
    "bundleVersion": "0.1.0",
    "bundleHash": "sha256:4cb4b20c01d9316f8c864abfff1ce8ed7c0166d9ed2501d53c243c546b029d33",
    "actor": {
      "id": "MED-TEAM-01",
      "role": "SECURITY_LEAD",
      "authorityLevelId": "BATTALION"
    },
    "action": {
      "kind": "ENGAGE",
      "forceLevel": "NON_LETHAL",
      "method": "ACCESS_CONTROL",
      "domain": "LAND"
    },
    "target": {
      "id": "HOSPITAL-01",
      "objectType": "HOSPITAL",
      "protectedClass": "MEDICAL",
      "lossOfProtectionStatus": "CONFIRMED_TRUE",
      "militaryObjectiveStatus": "CONFIRMED_FALSE",
      "horsDeCombatStatus": false
    },
    "context": {
      "zone": "HOSPITAL-SECURITY-ZONE",
      "missionType": "ARMED_CONFLICT",
      "operationPhase": "ACCESS_CONTROL",
      "operationalSlice": "MEDICAL_PROTECTION",
      "coalitionMode": "NATIONAL",
      "timeWindowStart": "2026-04-13T18:00:00.000Z",
      "timeWindowEnd": "2026-04-13T19:00:00.000Z"
    },
    "threat": {
      "hostileAct": false,
      "hostileIntent": false,
      "imminence": "NONE",
      "necessity": "UNRESOLVED"
    },
    "civilianRisk": {
      "civilianPresence": true,
      "civilianObjectPresence": true,
      "estimatedIncidentalHarm": "HIGH",
      "feasiblePrecautionsTaken": false,
      "expectedMilitaryAdvantage": "LOW",
      "estimatedIncidentalHarmScore": 85,
      "expectedMilitaryAdvantageScore": 15
    },
    "authority": {
      "reservedToHigherCommand": false,
      "nationalCaveat": false,
      "delegatedToUnit": true,
      "designatedRoeActive": true,
      "designatedActionAuthorized": true
    }
  }
}
```

The request body must contain only `packId` and `facts`.

Example response:

```json
{
  "decision": "ALLOWED",
  "reasonCode": null,
  "failedStage": null,
  "failingRuleIds": [],
  "missingFactIds": [],
  "bundleVersion": "0.1.0",
  "bundleHash": "sha256:4cb4b20c01d9316f8c864abfff1ce8ed7c0166d9ed2501d53c243c546b029d33"
}
```

## Validation Rules

- Missing `packId` rejects.
- Missing `facts` rejects.
- Unknown top-level fields reject.
- Invalid fact structure rejects.
- Invalid enum values reject through the fact schema.
- No fallback defaults are applied.

## Boundary Notes

- The API does not expose reviewed clauses.
- The API does not expose compiler notes.
- The public API does not expose source refs, provenance metadata, authority trace, or rule trace.
- The API does not accept prose input.
- The API does not widen kernel semantics.
- The API does not couple to ZeroGlare or Risk Mapping Governance.
