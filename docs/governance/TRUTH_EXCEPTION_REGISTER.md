# ChatPDM Truth Exception Register

Status: Draft constitutional exception doctrine and register specification.
Position in governance spine: `05`.
Parent documents:

- [GOVERNANCE_CONSTITUTION.md](./GOVERNANCE_CONSTITUTION.md)
- [CHANGE_AUTHORITY_MATRIX.md](./CHANGE_AUTHORITY_MATRIX.md)
- [CONCEPT_LIFECYCLE.md](./CONCEPT_LIFECYCLE.md)
Related documents:
- [EMERGENCY_CONTINUITY_PROTOCOL.md](./EMERGENCY_CONTINUITY_PROTOCOL.md)
- [GOVERNANCE_EVENT_LOG_SPEC.md](./GOVERNANCE_EVENT_LOG_SPEC.md)
Governing question:
- what counts as a governance exception, and how must exception debt be recorded, bounded, and closed?
This register owns exception doctrine and exception debt visibility.
It does not replace the canonical event log.

## 1. Purpose

This register exists to make governance exceptions visible.
It is the anti-silent-discretion document.
It prevents judgment calls from becoming invisible doctrine.
It converts pressure-driven deviations into expiring, reviewable governance debt.

## 2. Core Rule

No exception is valid unless it is written to the exception register.
No exception record may remain undocumented while action proceeds.
If an action cannot survive visibility, it is not an admissible exception.

## 3. What Counts As An Exception

An exception exists when the normal required governance path is not followed in full.
Examples include:

- emergency freeze activation
- temporary reviewer-block override request
- short-lived source substitution
- compressed review window
- fast-track institutional rollback request
- temporary evidence deferral
- last-known-safe restore before full review

## 4. What Does Not Count As An Exception

The following are not exceptions:

- ordinary Class C review
- ordinary operational execution under Class D
- standard rollback under fully available authority
- ordinary reviewer disagreement resolved inside the normal path
- corrections that still follow full evidence and approval law
Ordinary governance events are not automatically exceptions.
An event becomes an exception only when the normal required path was bypassed or shortened.

## 5. Exception Principles

Exceptions are visible.
Exceptions are temporary.
Exceptions expire.
Exceptions do not silently amend doctrine.
Exceptions do not become precedent by repetition.
Exceptions increase review burden after the urgent action ends.

## 6. Non-Bypass Rule

An exception may bypass a normal path only for preservation.
An exception may not be used for expansion.
Preservation includes:

- freezing unsafe action
- restoring a known safe version
- revoking compromised source anchors
- preventing misleading public truth surfaces
Expansion includes:
- admitting new concepts
- widening scope
- weakening refusal law
- adding new source tiers
- creating new constitutional authority
Expansion by exception is prohibited.

## 7. Required Register Fields

Every register entry must include:

- `entryId`
- `entryAction`
- `entryTimestamp`
- `exceptionId`
- `date`
- `requestedBy`
- `approvingAuthority`
- `affectedClass`
- `normalRequiredPath`
- `exceptionTaken`
- `reason`
- `expiry`
- `rollbackPlan`
- `postExceptionReviewRequired`
- `linkedVersions`
- `linkedEventIds`

## 7A. Field Meaning: entryId

`entryId` is the stable identifier for one append-only register line.
It must be unique even when multiple entries refer to the same `exceptionId`.
It uses the canonical pattern `TEE-YYYY-NNNNNN`.

## 7B. Field Meaning: entryAction

`entryAction` states what this append-only line does.
Allowed values are:

- `OPENED`
- `AMENDED`
- `CLOSED`
- `EXPIRED`
- `SUPERSEDED`
- `REMANDED`

Later register lines may reuse the same `exceptionId`, but they must carry a new `entryId` and the correct `entryAction`.

## 7C. Field Meaning: entryTimestamp

`entryTimestamp` is the time this specific register line was appended.
It orders later amendments, closure, expiry, or remand records without mutating earlier lines.
It must be machine-readable and must not be backdated.

## 8. Field Meaning: exceptionId

`exceptionId` is the stable identifier for the exception record.
It must be unique.
It should be human-readable.
It uses the canonical pattern `TE-YYYY-NNNNNN`.
It may not be reused.

## 9. Field Meaning: date

`date` is the original exception opening time.
It must include timezone or UTC normalization.
It marks the start of the exception validity window.
Later appended lines for the same `exceptionId` keep the original `date` and use `entryTimestamp` for amendment or closure time.
Backdating is prohibited.

## 10. Field Meaning: requestedBy

`requestedBy` names the actor who asked for the exception.
This may be:

- Founding Canonical Steward
- Core Maintainer
- Source Integrity Reviewer
- Contrast Reviewer
- Runtime Contract Reviewer
- Policy Surface Reviewer
- Frontend Trust Reviewer
- Release Manager
- Institutional Deployment Operator
Anonymous requests are not valid.

## 11. Field Meaning: approvingAuthority

`approvingAuthority` names who approved the exception.
This may be a steward.
This may be the emergency continuity council.
This may be a temporary acting deputy under continuity law.
The authority path must be lawful at the time of approval.

## 12. Field Meaning: affectedClass

`affectedClass` records the governance class that would have applied absent exception.
It must use `A`, `B`, `C`, or `D`.
If multiple classes are affected, the stricter class must be named.
Unclear classification must be logged as disputed, not left blank.

## 13. Field Meaning: normalRequiredPath

`normalRequiredPath` states the full ordinary process that would have applied.
This must include:

- normal class
- normal reviewers
- normal approver
- normal evidence bundle
- normal publication or rollback path
The purpose is comparison.
The register shows what was skipped.

## 14. Field Meaning: exceptionTaken

`exceptionTaken` names the exact deviation.
Examples:

- review window shortened from 14 days to 48 hours
- last-known-safe restore executed before full source review
- reviewer block escalated to emergency challenge
- public trust surface frozen before full policy review
This field must be precise.
Vague entries are not valid.

## 15. Field Meaning: reason

`reason` explains why the exception was necessary.
Allowed reason families include:

- emergency preservation
- active user-harm prevention
- source compromise
- rollback urgency
- steward unavailability
- statutory deadline with preserved doctrine
Forbidden reason families include:
- speed alone
- partner impatience
- optics alone
- convenience alone
- “felt right”

## 16. Field Meaning: expiry

`expiry` is the last valid moment of the exception.
No exception is indefinite.
If the exception must continue, a new record is required.
Open-ended exception authority is prohibited.

## 17. Field Meaning: rollbackPlan

`rollbackPlan` defines how the system returns to the normal path if the exception proves unsafe.
It must identify:

- rollback trigger
- safe prior state
- responsible actor
- version target
- downstream regeneration effect

## 18. Field Meaning: postExceptionReviewRequired

`postExceptionReviewRequired` must answer yes or no.
If yes, it must name:

- the review type
- review owner
- due date
For most truth-adjacent exceptions, the answer is yes.

## 19. Field Meaning: linkedVersions

`linkedVersions` ties the exception to:

- concept version
- concept set version
- contract version
- matcher version
- normalizer version
- overlay manifest or store version if relevant
At least one version locator must be present and non-null.
An exception without linked version scope is weak audit evidence.

## 19A. Field Meaning: linkedEventIds

`linkedEventIds` lists the governance event ids that record the same deviation in the canonical event log.
Every exception must link to at least one `eventId`.
Emergency exceptions must also name the related `incidentId`.
If the exception arises from a constitutional challenge, the related `challengeId` must also be named.

## 20. Register Storage Rule

The canonical register path is `data/governance/truth-exception-register.ndjson`.
The canonical register-line schema path is `data/governance/truth-exception-register.schema.json`.
It may be mirrored in issue threads or PRs.
Those mirrors do not replace the canonical register.
Each non-empty line in `data/governance/truth-exception-register.ndjson` is one JSON object conforming to `data/governance/truth-exception-register.schema.json`.
Register entries must be append-only.
Deletion is prohibited.
Amendment, expiry, closure, remand, or supersession must be recorded as later entries.
Those later entries should point back to the prior line through `supersedesEntryId`.
The current state of an exception is the latest lawful appended entry for that `exceptionId`.

## 21. Visibility Rule

Every exception must be discoverable by:

- internal maintainers
- reviewers
- future governance auditors
- institutional partners where relevant
Exceptions may be access-controlled.
They may not be hidden from lawful governance review.

## 22. Expiry Rule

An expired exception does not remain valid through silence.
When expiry is reached:

- the exception ends
- the normal path resumes
- or a new exception must be requested
No automatic renewal exists.

## 23. Exception Classes

`Preservation exceptions`:

- freeze
- rollback
- restore
- source revocation
`Process exceptions`:
- shortened review window
- temporary missing evidence with mandatory follow-up
- emergency approver substitution
`Compatibility exceptions`:
- temporary local deployment pin
- temporary wrapper behavior during incident containment
`Invalid exceptions`:
- doctrine rewrite
- hidden scope widening
- permanent source substitution without versioning

## 24. Reviewer Block Overrides

Reviewer blocks are not casually overridden.
A block override request itself is an exception event.
It must identify:

- blocking reviewer
- block reason
- evidence considered
- why preservation requires action before normal resolution
- expiry
Reviewer block overrides do not become precedent.

## 25. Institutional Pressure Rule

Institutional urgency does not itself justify an exception.
If an institution requests:

- faster review
- local rollback
- local pinning
- temporary source freeze
the request must still be entered as an exception if the normal path is bypassed.
Institutional pressure never erases the record.

## 26. Steward Constraint Rule

The Founding Canonical Steward may request an exception.
The Founding Canonical Steward may not keep an exception off-register.
The Founding Canonical Steward may not declare a silent exception by private interpretation.
The Founding Canonical Steward may not convert recurring exceptions into doctrine without constitutional amendment.

## 27. Emergency Continuity Rule

When steward absence triggers continuity law, every continuity action is also an exception.
Continuity does not bypass the exception register.
Continuity increases the need for visible records.
Emergency actors inherit preservation power only.
They do not inherit silent doctrine-making power.

## 28. Lifecycle Coupling Rule

If an exception touches:

- concept promotion
- deprecation
- rollback
- source change
- graph reopening
- trust-surface update
then the linked lifecycle state must be named.
No lifecycle-affecting exception may remain unlinked to state.

## 29. Event Log Coupling Rule

Every exception must emit a governance event.
Minimum event family:

- `EXCEPTION_GRANTED`
Additional families may apply:
- `FREEZE_ACTIVATED`
- `ROLLBACK_EXECUTED`
- `CLASS_ESCALATED`
- `REVIEW_BLOCKED`
The exception register and event log must cross-reference each other.
The exception register owns the deviation record.
The event log owns the replayable action record.

## 30. Evidence Rule

Every exception must carry enough evidence to survive later audit.
Minimum evidence may include:

- incident note
- reviewer objection
- deployment failure trace
- source compromise note
- legal deadline note
- trust-surface risk note
No evidence means no valid exception.

## 31. Post-Exception Review Rule

Every exception must close with one of:

- ratified and completed
- reverted
- superseded by later lawful action
- expired without action
- remanded to constitutional challenge
An exception without closure is governance debt left open.
Expiry without closure is not sufficient.
The closing record must still be written.

## 32. Exception Register Template

Template fields:

- `entryId`
- `entryAction`
- `entryTimestamp`
- `exceptionId`
- `date`
- `requestedBy`
- `approvingAuthority`
- `affectedClass`
- `normalRequiredPath`
- `exceptionTaken`
- `reason`
- `expiry`
- `rollbackPlan`
- `postExceptionReviewRequired`
- `postExceptionReviewType` when post-review is required
- `postExceptionReviewOwner` when post-review is required
- `postExceptionReviewDue` when post-review is required
- `linkedVersions`
- `linkedLifecycleState`
- `linkedEventIds`
- `linkedIncidentId` when emergency continuity applies
- `linkedChallengeId` when constitutional challenge applies
- `supersedesEntryId` when this line amends, closes, expires, remands, or supersedes an earlier line

## 33. Short Validation Checklist

Before accepting an exception, ask:

- is this preservation rather than expansion
- is the normal path explicitly named
- is the exception precise
- is expiry defined
- is rollback defined
- is post-review defined
- are versions linked
- are linked event ids present
- is the record visible
If any answer is no, reject or rewrite the exception request.

## 34. Invalid Register Patterns

Invalid pattern:

- “temporary workaround”
Why invalid:
- too vague
Invalid pattern:
- “approved verbally”
Why invalid:
- not reconstructible
Invalid pattern:
- “until further notice”
Why invalid:
- no expiry
Invalid pattern:
- “same as last time”
Why invalid:
- no independent record

## 35. Worked Exception Families

Family `01`
Name:

- reviewer block override request
Normal path:
- reviewer block remains until corrected
Exception use:
- emergency preservation only
Risk:
- creates theater if overused
Family `02`
Name:
- emergency freeze
Normal path:
- no freeze in ordinary review
Exception use:
- stop unsafe rollout
Risk:
- misuse as private veto
Family `03`
Name:
- last-known-safe restore
Normal path:
- ordinary rollback path
Exception use:
- urgent preservation when outage or truth breach exists
Risk:
- restoring stale truth without review
Family `04`
Name:
- temporary source anchor suspension
Normal path:
- ordinary revision or deprecation
Exception use:
- source compromise or revocation emergency
Risk:
- provenance confusion
Family `05`
Name:
- shortened review window
Normal path:
- full review window
Exception use:
- bounded emergency only
Risk:
- rushed approval drift
Family `06`
Name:
- missing evidence deferral
Normal path:
- full evidence before approval
Exception use:
- emergency containment with mandatory follow-up
Risk:
- exception becomes hidden ordinary path
Family `07`
Name:
- temporary local deployment pin
Normal path:
- ordinary upstream adoption review
Exception use:
- statutory or operational incompatibility
Risk:
- hidden fork drift
Family `08`
Name:
- temporary refusal hotfix
Normal path:
- ordinary lifecycle and release path
Exception use:
- unsafe runtime refusal defect
Risk:
- doctrine drift by hotfix
Family `09`
Name:
- temporary rollback without full reviewer sequence
Normal path:
- full rollback sequence
Exception use:
- immediate preservation under continuity law
Risk:
- insufficient evidence trace
Family `10`
Name:
- temporary class-freeze escalation
Normal path:
- ordinary classification path
Exception use:
- dispute under active incident
Risk:
- class law confusion
Family `11`
Name:
- local wrapper escalation under institutional deployment
Normal path:
- ordinary deployment workflow
Exception use:
- preserve law without rewriting upstream truth
Risk:
- wrapper becomes hidden doctrine
Family `12`
Name:
- temporary public trust-surface freeze
Normal path:
- ordinary UI update path
Exception use:
- prevent misstatement while review completes
Risk:
- stale public messaging
Family `13`
Name:
- continuity acting approver substitution
Normal path:
- steward approval path
Exception use:
- steward unavailable
Risk:
- temporary power drift
Family `14`
Name:
- source rank display suppression
Normal path:
- ordinary UI rendering
Exception use:
- provenance label risk under live incident
Risk:
- inspectability reduction
Family `15`
Name:
- temporary disable of reading-lens surface
Normal path:
- ordinary product rendering
Exception use:
- derived-surface integrity incident
Risk:
- user trust confusion
Family `16`
Name:
- policy-surface emergency correction
Normal path:
- ordinary policy review
Exception use:
- prevent materially false public claim
Risk:
- bypass of review discipline
Family `17`
Name:
- deploy freeze under truth uncertainty
Normal path:
- ordinary deploy progression
Exception use:
- unresolved truth-impact dispute
Risk:
- operational backlog
Family `18`
Name:
- temporary block on source-registry promotion
Normal path:
- ordinary source review
Exception use:
- urgent external challenge
Risk:
- authoring stall
Family `19`
Name:
- emergency ambiguity warning copy
Normal path:
- reviewed public wording
Exception use:
- active misinterpretation incident
Risk:
- trust wording drift
Family `20`
Name:
- temporary match suppression
Normal path:
- normal resolver behavior
Exception use:
- unsafe routing discovered live
Risk:
- unexpected refusal spike

## 36. Example Record 01

`entryId`:

- TEE-2026-000001
`entryAction`:
- OPENED
`entryTimestamp`:
- 2026-03-28T12:00:00Z
`exceptionId`:
- TE-2026-000001
`date`:
- 2026-03-28T12:00:00Z
`requestedBy`:
- Runtime Contract Reviewer
`approvingAuthority`:
- Constitutional Continuity Council
`affectedClass`:
- B
`normalRequiredPath`:
- ordinary rollback with full reviewer path
`exceptionTaken`:
- last-known-safe restore executed before full contrast re-review
`reason`:
- live routing defect causing incorrect concept selection
`expiry`:
- 2026-04-04T12:00:00Z
`rollbackPlan`:
- revert restore if corrected build passes full review
`postExceptionReviewRequired`:
- yes
`postExceptionReviewType`:
- post-rollback contrast review
`postExceptionReviewOwner`:
- Contrast Reviewer
`postExceptionReviewDue`:
- 2026-04-05T12:00:00Z
`linkedVersions`:
- conceptSetVersion 1.2.0 -> 1.1.9
`linkedEventIds`:
- GE-2026-000004
- GE-2026-000005
`linkedIncidentId`:
- EI-2026-000001

## 37. Example Record 02

`entryId`:

- TEE-2026-000002
`entryAction`:
- OPENED
`entryTimestamp`:
- 2026-04-02T09:30:00Z
`exceptionId`:
- TE-2026-000002
`date`:
- 2026-04-02T09:30:00Z
`requestedBy`:
- Policy Surface Reviewer
`approvingAuthority`:
- Founding Canonical Steward
`affectedClass`:
- B
`normalRequiredPath`:
- full trust-surface wording review
`exceptionTaken`:
- temporary freeze on inspect wording publication
`reason`:
- evidence text overstated current compliance state
`expiry`:
- 2026-04-09T09:30:00Z
`rollbackPlan`:
- restore prior wording if corrected text not approved
`postExceptionReviewRequired`:
- yes
`postExceptionReviewType`:
- trust-surface wording review
`postExceptionReviewOwner`:
- Policy Surface Reviewer
`postExceptionReviewDue`:
- 2026-04-09T09:30:00Z
`linkedVersions`:
- public trust surface rev 4
`linkedEventIds`:
- GE-2026-000011

## 38. Example Record 03

`entryId`:

- TEE-2026-000003
`entryAction`:
- OPENED
`entryTimestamp`:
- 2026-04-10T08:15:00Z
`exceptionId`:
- TE-2026-000003
`date`:
- 2026-04-10T08:15:00Z
`requestedBy`:
- Institutional Deployment Operator
`approvingAuthority`:
- Founding Canonical Steward
`affectedClass`:
- D
`normalRequiredPath`:
- ordinary deployment adoption
`exceptionTaken`:
- temporary local version pin retained after upstream release
`reason`:
- statutory dependency not yet remapped locally
`expiry`:
- 2026-05-10T08:15:00Z
`rollbackPlan`:
- adopt upstream version after local mapping review completes
`postExceptionReviewRequired`:
- yes
`postExceptionReviewType`:
- deployment compatibility review
`postExceptionReviewOwner`:
- Release Manager
`postExceptionReviewDue`:
- 2026-05-10T08:15:00Z
`linkedVersions`:
- conceptSetVersion pinned at 1.2.0
`linkedEventIds`:
- GE-2026-000012

## 39. Example Record 04

`entryId`:

- TEE-2026-000004
`entryAction`:
- OPENED
`entryTimestamp`:
- 2026-04-12T17:00:00Z
`exceptionId`:
- TE-2026-000004
`date`:
- 2026-04-12T17:00:00Z
`requestedBy`:
- Source Integrity Reviewer
`approvingAuthority`:
- Founding Canonical Steward
`affectedClass`:
- B
`normalRequiredPath`:
- ordinary concept revision with full source review
`exceptionTaken`:
- temporary source-anchor suppression pending provenance correction
`reason`:
- primary source citation discovered to be malformed in public rendering
`expiry`:
- 2026-04-19T17:00:00Z
`rollbackPlan`:
- restore source anchor after corrected source record passes review
`postExceptionReviewRequired`:
- yes
`postExceptionReviewType`:
- source integrity review
`postExceptionReviewOwner`:
- Source Integrity Reviewer
`postExceptionReviewDue`:
- 2026-04-19T17:00:00Z
`linkedVersions`:
- authority v1.3
`linkedEventIds`:
- GE-2026-000013

## 40. Example Record 05

`entryId`:

- TEE-2026-000005
`entryAction`:
- OPENED
`entryTimestamp`:
- 2026-04-15T06:45:00Z
`exceptionId`:
- TE-2026-000005
`date`:
- 2026-04-15T06:45:00Z
`requestedBy`:
- Release Manager
`approvingAuthority`:
- Constitutional Continuity Council
`affectedClass`:
- A
`normalRequiredPath`:
- steward-led emergency freeze review
`exceptionTaken`:
- immediate release freeze during steward unavailability
`reason`:
- active truth-surface integrity incident
`expiry`:
- 2026-04-22T06:45:00Z
`rollbackPlan`:
- keep freeze until steward returns or challenge resolves
`postExceptionReviewRequired`:
- yes
`postExceptionReviewType`:
- continuity ratification review
`postExceptionReviewOwner`:
- Founding Canonical Steward
`postExceptionReviewDue`:
- 2026-04-22T06:45:00Z
`linkedVersions`:
- release train 2026.04.15
`linkedEventIds`:
- GE-2026-000006
- GE-2026-000008
`linkedIncidentId`:
- EI-2026-000001

## 41. Metrics And Oversight

The register should support metrics such as:

- exceptions per quarter
- exceptions by class
- exceptions by approving authority
- exceptions by reason family
- expired exceptions not yet closed
- recurring exception patterns
High exception frequency is a governance smell.
Repeated exception type indicates doctrine or process weakness.

## 42. Sunset Rule

This register is not optional at scale.
If the governance suite matures into signed logs or database-backed control records, this register may move medium.
Its doctrine does not disappear.
Visible, expiring exception debt remains mandatory.

## 43. Closing Statement

The exception register protects the system from hidden bending.
It does not outlaw judgment.
It outlaws invisible judgment.
That is the point.
