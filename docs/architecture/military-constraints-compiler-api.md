# Military Constraints Compiler API

The Military Constraints Compiler exposes a bounded, structured public API for discovery and evaluation. It does not accept freeform text, and it does not infer missing scope.

## Decision Contract

The runtime decision contract is closed:

- `ALLOWED`
- `REFUSED`
- `REFUSED_INCOMPLETE`

The API returns the runtime decision exactly as produced by the underlying military-constraints evaluator. It does not reinterpret refusal into advice or explanation.

## Endpoints

### `GET /api/v1/military-constraints`

Returns the public surface summary.

Example response:

```json
{
  "resource": "military-constraints",
  "status": "active",
  "availableOperations": ["packs", "evaluate"],
  "packCount": 5
}
```

### `GET /api/v1/military-constraints/packs`

Returns the locked v1 pack catalog.

Example response:

```json
{
  "resource": "military-constraints",
  "status": "active",
  "packs": [
    {
      "packId": "mil-us-civilian-school-protection-core-v0.1.0",
      "bundleId": "mil-us-civilian-school-protection-core-bundle",
      "bundleVersion": "0.1.0",
      "jurisdiction": "US",
      "authorityGraphId": "AUTH-GRAPH-US-001",
      "reviewedClauseSetIds": [
        "legal-floor-civilian-school-core",
        "authority-civilian-school-core",
        "policy-overlay-civilian-school-core"
      ]
    }
  ]
}
```

The order is deterministic and currently follows the pack catalog order used by the backend.

### `GET /api/v1/military-constraints/packs/:packId`

Returns one pack’s validated metadata.

`packId` must match a known locked-v1 pack identifier, for example:

- `mil-us-core-reference`
- `mil-us-maritime-vbss-core-v0.1.0`
- `mil-us-medical-protection-core-v0.1.0`
- `mil-us-civilian-school-protection-core-v0.1.0`
- `mil-us-protected-person-state-core-v0.1.0`

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
    "sourceRegistryVersion": "1.0.0",
    "regressionSuiteVersion": "1.0.0"
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
- The API does not accept prose input.
- The API does not widen kernel semantics.
- The API does not couple to ZeroGlare or Risk Mapping Governance.
