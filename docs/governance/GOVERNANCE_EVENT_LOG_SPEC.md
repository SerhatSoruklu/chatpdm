# ChatPDM Governance Event Log Spec

Status: Draft append-only event schema for governance replay and audit.
Position in governance spine: `07`.
Parent documents:

- [GOVERNANCE_CONSTITUTION.md](./GOVERNANCE_CONSTITUTION.md)
- [CHANGE_AUTHORITY_MATRIX.md](./CHANGE_AUTHORITY_MATRIX.md)
- [CONCEPT_LIFECYCLE.md](./CONCEPT_LIFECYCLE.md)
Related documents:
- [TRUTH_EXCEPTION_REGISTER.md](./TRUTH_EXCEPTION_REGISTER.md)
- [EMERGENCY_CONTINUITY_PROTOCOL.md](./EMERGENCY_CONTINUITY_PROTOCOL.md)
Governing question:
- what is the canonical append-only event record for replayable ChatPDM governance history?
This file owns event schema, append-only log ownership, and event cross-reference rules.
It does not replace exception doctrine, lifecycle law, or emergency procedure.

## 1. Purpose

This file defines the minimum event shape for reconstructible governance history.
It exists so governance decisions are not trapped in prose alone.
It makes lifecycle, exceptions, continuity, and classification replayable.

## 2. Core Rule

Every Class A decision must emit an event.
Every Class B promotion, rollback, freeze, deprecation, or exception must emit an event.
If an action changes authority, state, class, or public truth surface, the action needs an event.

## 3. Append-Only Rule

The governance event log is append-only.
Old events are never deleted.
Corrections happen through later events.
Replacement does not erase history.

## 4. Canonical Location Rule

The canonical governance-record root is `data/governance/`.
The canonical event-log path is `data/governance/governance-event-log.ndjson`.
The canonical event-line schema path is `data/governance/governance-event-log.schema.json`.
Related canonical record paths are:

- `data/governance/truth-exception-register.ndjson`
- `data/governance/emergency-incidents.ndjson`
Their companion line-schema paths are:
- `data/governance/truth-exception-register.schema.json`
- `data/governance/emergency-incidents.schema.json`

Mirrors may exist in:

- PR descriptions
- release notes
- issue threads
- governance markdown
Mirrors do not replace the canonical log.
This file owns the event-log path and schema.
It does not replace the exception register or the emergency incident record.

## 4A. Identifier Family Rule

Canonical governance identifiers use stable prefix families:

- `eventId`: `GE-YYYY-NNNNNN`
- `exceptionId`: `TE-YYYY-NNNNNN`
- `incidentId`: `EI-YYYY-NNNNNN`
- `challengeId`: `GC-YYYY-NNNNNN`

`challengeId` is a stable cross-reference handle when a Constitutional Challenge RFC, issue, or review thread exists.
This phase does not create a separate challenge-record file.
The canonical challenge linkage lives inside the event, exception, and incident records that cite it.

## 4B. NDJSON Line Rule

`data/governance/governance-event-log.ndjson` is newline-delimited JSON.
Each non-empty line is one immutable governance event object.
Every non-empty line must conform to `data/governance/governance-event-log.schema.json`.
Blank lines, wrapped arrays, and mutable “current state” event objects are not canonical.

## 5. Event Families

Required core families:

- `PROMOTION_APPROVED`
- `CLASS_ESCALATED`
- `REVIEW_BLOCKED`
- `EXCEPTION_GRANTED`
- `ROLLBACK_EXECUTED`
- `FREEZE_ACTIVATED`
- `DEPRECATION_STARTED`
- `EMERGENCY_OVERRIDE_EXPIRED`
Useful extended families:
- `CLASSIFICATION_DISPUTE_OPENED`
- `CLASSIFICATION_DISPUTE_RESOLVED`
- `SOURCE_REOPEN_TRIGGERED`
- `GRAPH_REVALIDATION_TRIGGERED`
- `PROMOTION_EXPIRED`
- `REVIEW_WINDOW_RENEWED`
- `RETURN_RATIFICATION_COMPLETED`

## 6. Minimum Global Fields

Every event must include:

- `eventId`
- `eventType`
- `objectId`
- `objectType`
- `class`
- `timestamp`
- `reason`
- `approvers`
- `blockingReviewers`
- `linkedPr`
Events touching versioned truth objects must also include:
- `fromVersion`
- `toVersion`
- `linkedConceptSetVersion`

## 7. Field Meaning: eventId

`eventId` is the stable unique event identifier.
It must not be reused.
It should be sortable or time-traceable.
It uses the canonical pattern `GE-YYYY-NNNNNN`.

## 8. Field Meaning: eventType

`eventType` identifies the event family.
It must use the canonical vocabulary defined here.
Custom ad hoc types are not permitted without governance update.

## 9. Field Meaning: objectId

`objectId` is the primary affected object.
Examples:

- `authority`
- `resolve-rules`
- `response-contract`
- `reading-lens-gate`
- `deploy-workflow`
If more than one object is affected, the primary object still must be named.
Secondary objects may be listed separately.

## 10. Field Meaning: objectType

`objectType` defines the object category.
The current bounded vocabulary is:

- `concept`
- `resolve-rule`
- `contract`
- `schema`
- `trust-surface`
- `governance-doc`
- `workflow`
- `continuity-authority`
- `source-anchor`
- `source-registry`
Ad hoc object-type labels are not canonical in the current phase.

## 11. Field Meaning: class

`class` is the governance class active at decision time.
It must use `A`, `B`, `C`, or `D`.
If a dispute caused escalation, the final enforced class is recorded here.
The related dispute event may record prior tentative classes.

## 12. Field Meaning: timestamp

`timestamp` is the effective decision or action time for the immutable event object.
It must be in a reproducible machine-readable format.
UTC is preferred.
Backdating is prohibited.
This event stream does not use a separate `entryTimestamp`.

## 13. Field Meaning: reason

`reason` must explain why the event occurred.
Examples:

- concept approved after review completion
- rollback executed after routing defect
- freeze activated during steward absence
- class escalated due to trust-surface semantics
Vague reasons are not acceptable.

## 14. Field Meaning: approvers

`approvers` lists the actors who lawfully authorized the event.
It may be empty for some automatically generated trace events.
It may not be empty for `PROMOTION_APPROVED`, `CLASS_ESCALATED`, `EXCEPTION_GRANTED`, `ROLLBACK_EXECUTED`, `FREEZE_ACTIVATED`, `DEPRECATION_STARTED`, or `EMERGENCY_OVERRIDE_EXPIRED`.

## 15. Field Meaning: blockingReviewers

`blockingReviewers` lists reviewers who were actively blocking at the time of event.
This field may be empty.
It is especially important for:

- `REVIEW_BLOCKED`
- `EXCEPTION_GRANTED`
- `CLASSIFICATION_DISPUTE_RESOLVED`
For `REVIEW_BLOCKED`, at least one blocking reviewer must be named.

## 16. Field Meaning: linkedPr

`linkedPr` ties the event to a pull request or issue when available.
It may be null for manual emergency actions executed outside GitHub.
If null, another traceable incident or record id must be provided.

## 17. Version Fields

`fromVersion` is the pre-event version.
`toVersion` is the post-event version.
Events that do not change a version may use null values.
`linkedConceptSetVersion` is required whenever `fromVersion` or `toVersion` is non-null.
It may be omitted for non-versioned events.

## 18. Optional Extended Fields

Useful optional fields include:

- `secondaryObjects`
- `linkedExceptionId`
- `linkedLifecycleState`
- `linkedIncidentId`
- `linkedChallengeId`
- `expiry`
- `notes`
Optional fields may extend traceability.
They do not replace required fields.

## 18A. Cross-Reference Rule

`eventId` is the canonical cross-reference handle for replayable governance history.

Cross-reference rules:

- if an event records an exception, it must name `linkedExceptionId`
- if an event records an emergency action, it must name `linkedIncidentId`
- if an event records a lifecycle transition, it must name `linkedLifecycleState`
- if an event records a constitutional challenge outcome, it must name `linkedChallengeId`

No other governance record may rely on a PR link, issue link, or prose note as a substitute for `eventId`.
`linkedChallengeId` is an optional cross-reference token, not a separate event-log file.

## 18B. Record Relationship Rule

Lifecycle state transitions are canonical only when their required events exist in the event log.
Exceptions remain governed by [TRUTH_EXCEPTION_REGISTER.md](./TRUTH_EXCEPTION_REGISTER.md), but every valid exception must point to one or more `eventId` values here.
Emergency incidents remain governed by [EMERGENCY_CONTINUITY_PROTOCOL.md](./EMERGENCY_CONTINUITY_PROTOCOL.md), but every emergency incident must point to the events recorded here.

The ownership split is:

- this file owns replayable action history
- the exception register owns deviation debt
- the continuity protocol owns incident procedure

## 19. Event Validity Rule

An event is valid only if:

- required fields are present
- class is lawful
- event type is canonical
- timestamp is parseable
- object id is traceable
- related versions make sense
- required cross-links are present when the event family requires them
Invalid events should fail validation.

## 20. Event Ordering Rule

Events must preserve causal order.
If event `B` depends on event `A`, event `A` must already exist or be committed with it in the same append batch.
Out-of-order event streams weaken replayability.

## 21. Promotion Event Family

`PROMOTION_APPROVED` records movement into a publishable or published state.
Required extras:

- `linkedLifecycleState`
- `fromVersion`
- `toVersion`
- `linkedConceptSetVersion`
- `approvers`
- `linkedEvidenceBundle`

## 22. Escalation Event Family

`CLASS_ESCALATED` records upward routing from a lower class to a stricter class.
Required extras:

- `proposedClass`
- `finalClass`
- `trigger`
- `disputePresent`
This event closes “silent downgrade” risk by making upward changes visible.

## 23. Review Block Event Family

`REVIEW_BLOCKED` records a binding reviewer stop.
Required extras:

- `blockingReviewerRole`
- `blockReason`
- `requiredRemedy`
- `affectedPath`
This event should exist even if the block is later resolved quickly.

## 24. Exception Event Family

`EXCEPTION_GRANTED` records any lawful exception.
Required extras:

- `linkedExceptionId`
- `expiry`
- `normalRequiredPath`
- `exceptionTaken`
`linkedIncidentId` is also required when the exception was opened under emergency continuity.
This event does not replace the exception register.
It complements it.

## 25. Rollback Event Family

`ROLLBACK_EXECUTED` records restoration to a known safe prior state.
Required extras:

- `fromVersion`
- `toVersion`
- `rollbackReason`
- `linkedSafeBoundary`
- `approvers`
Rollback without event is not auditable.

## 26. Freeze Event Family

`FREEZE_ACTIVATED` records a temporary halt.
Required extras:

- `freezeScope`
- `freezeReason`
- `expiry`
- `actingAuthority`
- `linkedIncidentId` when continuity law activated the freeze
- `linkedExceptionId` if applicable

## 27. Deprecation Event Family

`DEPRECATION_STARTED` records the formal start of deprecation.
Required extras:

- `deprecationReason`
- `replacementObjectId`
- `effectiveBoundary`

## 28. Emergency Expiry Event Family

`EMERGENCY_OVERRIDE_EXPIRED` records the end of temporary emergency authority or action.
Required extras:

- `linkedIncidentId`
- `expiredAuthority`
- `followUpState`
- `ratifiedOrReverted`

## 29. Additional Useful Event Families

`CLASSIFICATION_DISPUTE_OPENED`
`CLASSIFICATION_DISPUTE_RESOLVED`
`SOURCE_REOPEN_TRIGGERED`
`GRAPH_REVALIDATION_TRIGGERED`
`PROMOTION_EXPIRED`
`REVIEW_WINDOW_RENEWED`
`RETURN_RATIFICATION_COMPLETED`
These are not all mandatory on day one.
They should remain reserved and documented.

## 30. JSON Envelope

Minimum event envelope:

```json
{
  "eventId": "",
  "eventType": "",
  "objectId": "",
  "objectType": "",
  "class": "",
  "timestamp": "",
  "reason": "",
  "approvers": [],
  "blockingReviewers": [],
  "linkedPr": "",
  "fromVersion": null,
  "toVersion": null,
  "linkedConceptSetVersion": null
}
```

The envelope may be extended.
The base keys should remain stable.
Every non-empty event line must satisfy `data/governance/governance-event-log.schema.json`, including any event-family extras and linkage fields.

## 31. Naming Rules

Event types use uppercase snake case.
Object ids should match canonical repo or runtime names where possible.
Reviewer roles should use the role names from the governance suite.
Version values should match runtime declarations.

## 32. Validation Rules

Validation should reject:

- missing eventType
- missing objectId
- invalid class
- malformed timestamps
- promotion event with no approver
- exception event with no linked exception id
- rollback event with no target version
- freeze event with no expiry

## 33. Replay Rules

An auditor should be able to replay:

- what changed
- when it changed
- who approved it
- who blocked it
- whether an exception was used
- what version moved
- what follow-up is still open
If the event stream cannot answer these, the log is insufficient.

## 34. Retention Rule

Events are retained permanently for governance purposes.
Archival storage may move medium.
It may not break replay.
Retention does not permit silent deletion.

## 35. Human-Readable Mirror Rule

Markdown summaries may mirror events.
Release notes may mirror events.
Issue threads may mirror events.
None of those mirrors are the authoritative event object.
The canonical event object stays primary.

## 36. Signing And Provenance Future Rule

The event log may later become cryptographically signed.
This spec does not require signatures immediately.
It does require structure that can later support signatures.
The event format must remain stable enough for future proofing.

## 37. Example Event 01

```json
{
  "eventId": "GE-2026-000001",
  "eventType": "PROMOTION_APPROVED",
  "objectId": "authority",
  "objectType": "concept",
  "class": "B",
  "timestamp": "2026-03-28T12:00:00Z",
  "reason": "concept review completed and version approved",
  "approvers": ["Founding Canonical Steward"],
  "blockingReviewers": [],
  "linkedPr": "PR-241",
  "fromVersion": 2,
  "toVersion": 3,
  "linkedConceptSetVersion": "1.3.0",
  "linkedLifecycleState": "published",
  "linkedEvidenceBundle": "docs/evidence/promotion-authority-v3.md"
}
```

## 38. Example Event 02

```json
{
  "eventId": "GE-2026-000002",
  "eventType": "CLASS_ESCALATED",
  "objectId": "seo.legal",
  "objectType": "trust-surface",
  "class": "B",
  "timestamp": "2026-03-30T10:30:00Z",
  "reason": "metadata changed public trust interpretation",
  "approvers": ["Founding Canonical Steward"],
  "blockingReviewers": ["Policy Surface Reviewer"],
  "linkedPr": "PR-244",
  "fromVersion": null,
  "toVersion": null,
  "linkedConceptSetVersion": null,
  "proposedClass": "C",
  "finalClass": "B",
  "trigger": "metadata changed public trust interpretation",
  "disputePresent": true
}
```

## 39. Example Event 03

```json
{
  "eventId": "GE-2026-000003",
  "eventType": "REVIEW_BLOCKED",
  "objectId": "authority",
  "objectType": "concept",
  "class": "B",
  "timestamp": "2026-04-01T09:15:00Z",
  "reason": "contrast collapse with legitimacy remains unresolved",
  "approvers": [],
  "blockingReviewers": ["Contrast Reviewer"],
  "linkedPr": "PR-247",
  "fromVersion": 3,
  "toVersion": 3,
  "linkedConceptSetVersion": "1.3.0",
  "blockingReviewerRole": "Contrast Reviewer",
  "blockReason": "contrast collapse with legitimacy remains unresolved",
  "requiredRemedy": "reopen comparison and repair contrast boundary",
  "affectedPath": "data/concepts/authority.json"
}
```

## 40. Example Event 04

```json
{
  "eventId": "GE-2026-000004",
  "eventType": "EXCEPTION_GRANTED",
  "objectId": "authority",
  "objectType": "concept",
  "class": "B",
  "timestamp": "2026-04-02T08:45:00Z",
  "reason": "temporary last-known-safe restore under incident containment",
  "approvers": ["Constitutional Continuity Council"],
  "blockingReviewers": [],
  "linkedPr": null,
  "fromVersion": 3,
  "toVersion": 2,
  "linkedConceptSetVersion": "1.2.0",
  "linkedExceptionId": "TE-2026-000001",
  "linkedIncidentId": "EI-2026-000001",
  "expiry": "2026-04-04T12:00:00Z",
  "normalRequiredPath": "ordinary rollback with full reviewer path",
  "exceptionTaken": "last-known-safe restore executed before full contrast re-review"
}
```

## 41. Example Event 05

```json
{
  "eventId": "GE-2026-000005",
  "eventType": "ROLLBACK_EXECUTED",
  "objectId": "resolve-rules",
  "objectType": "resolve-rule",
  "class": "B",
  "timestamp": "2026-04-02T09:10:00Z",
  "reason": "unsafe ambiguity routing detected after deploy",
  "approvers": ["Constitutional Continuity Council"],
  "blockingReviewers": [],
  "linkedPr": null,
  "fromVersion": "2026.04.02-1",
  "toVersion": "2026.03.28-4",
  "linkedConceptSetVersion": "1.2.0",
  "linkedIncidentId": "EI-2026-000001",
  "rollbackReason": "unsafe ambiguity routing detected after deploy",
  "linkedSafeBoundary": "resolve-rules@2026.03.28-4"
}
```

## 42. Example Event 06

```json
{
  "eventId": "GE-2026-000006",
  "eventType": "FREEZE_ACTIVATED",
  "objectId": "deploy-workflow",
  "objectType": "workflow",
  "class": "B",
  "timestamp": "2026-04-03T07:00:00Z",
  "reason": "steward unavailable during severity-one trust incident",
  "approvers": ["Constitutional Continuity Council"],
  "blockingReviewers": [],
  "linkedPr": null,
  "fromVersion": null,
  "toVersion": null,
  "linkedConceptSetVersion": null,
  "linkedExceptionId": "TE-2026-000002",
  "linkedIncidentId": "EI-2026-000001",
  "freezeScope": "Class A and B merges plus active rollout",
  "freezeReason": "steward unavailable during severity-one trust incident",
  "expiry": "2026-04-17T07:00:00Z",
  "actingAuthority": "Constitutional Continuity Council"
}
```

## 43. Example Event 07

```json
{
  "eventId": "GE-2026-000007",
  "eventType": "DEPRECATION_STARTED",
  "objectId": "consent",
  "objectType": "concept",
  "class": "B",
  "timestamp": "2026-04-05T14:20:00Z",
  "reason": "replacement by stronger canonical organization",
  "approvers": ["Founding Canonical Steward"],
  "blockingReviewers": [],
  "linkedPr": "PR-252",
  "fromVersion": 1,
  "toVersion": 1,
  "linkedConceptSetVersion": "1.4.0",
  "deprecationReason": "replacement by stronger canonical organization",
  "replacementObjectId": "consent-boundary",
  "effectiveBoundary": "next canonical concept-set release"
}
```

## 44. Example Event 08

```json
{
  "eventId": "GE-2026-000008",
  "eventType": "EMERGENCY_OVERRIDE_EXPIRED",
  "objectId": "continuity-council",
  "objectType": "continuity-authority",
  "class": "A",
  "timestamp": "2026-04-14T18:00:00Z",
  "reason": "steward returned and ratification review completed",
  "approvers": ["Founding Canonical Steward"],
  "blockingReviewers": [],
  "linkedPr": null,
  "fromVersion": null,
  "toVersion": null,
  "linkedConceptSetVersion": null,
  "linkedIncidentId": "EI-2026-000001",
  "expiredAuthority": "Constitutional Continuity Council",
  "followUpState": "ordinary stewardship restored",
  "ratifiedOrReverted": "ratified"
}
```

## 45. Example Event 09

```json
{
  "eventId": "GE-2026-000009",
  "eventType": "GRAPH_REVALIDATION_TRIGGERED",
  "objectId": "legitimacy",
  "objectType": "concept",
  "class": "B",
  "timestamp": "2026-04-15T11:05:00Z",
  "reason": "neighbor relation change requires renewed contrast review",
  "approvers": ["Contrast Reviewer"],
  "blockingReviewers": [],
  "linkedPr": "PR-255",
  "fromVersion": 2,
  "toVersion": 2,
  "linkedConceptSetVersion": "1.4.0"
}
```

## 46. Example Event 10

```json
{
  "eventId": "GE-2026-000010",
  "eventType": "CLASSIFICATION_DISPUTE_RESOLVED",
  "objectId": "reading-lens-ui",
  "objectType": "trust-surface",
  "class": "B",
  "timestamp": "2026-04-16T16:40:00Z",
  "reason": "simulator wording determined to affect truth interpretation",
  "approvers": ["Founding Canonical Steward"],
  "blockingReviewers": ["Frontend Trust Reviewer"],
  "linkedPr": "PR-258",
  "fromVersion": null,
  "toVersion": null,
  "linkedConceptSetVersion": null,
  "linkedChallengeId": "GC-2026-000001"
}
```

## 47. Batch Integrity Rule

If multiple events are emitted in one batch:

- their order must be deterministic
- cross-references must resolve
- all ids must be unique
- no dependent event may precede its parent event

## 48. Validation Checklist

Before accepting an event, verify:

- type is canonical
- object is traceable
- class is lawful
- timestamp is valid
- approver path is lawful
- event family required fields are present
- linked versions make sense
- linked exception, incident, lifecycle-state, or challenge ids resolve if present

## 49. Implementation Guidance

The log may begin as:

- newline-delimited JSON
- append-only JSON objects
- append-only markdown with machine-readable front matter
It should evolve toward stronger provenance over time.
The doctrine does not wait for the tooling.
Structured event history is already mandatory even before signatures arrive.

## 50. Closing Statement

The governance suite cannot rely on memory.
It cannot rely on chat logs.
It cannot rely on good intentions.
It needs reconstructible events.
That is what this spec provides.
