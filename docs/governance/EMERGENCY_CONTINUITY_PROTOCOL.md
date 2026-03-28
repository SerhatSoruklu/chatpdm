# ChatPDM Emergency Continuity Protocol

Status: Draft continuity and emergency preservation doctrine.
Position in governance spine: `06`.
Parent documents:

- [GOVERNANCE_CONSTITUTION.md](./GOVERNANCE_CONSTITUTION.md)
- [CHANGE_AUTHORITY_MATRIX.md](./CHANGE_AUTHORITY_MATRIX.md)
- [CONCEPT_LIFECYCLE.md](./CONCEPT_LIFECYCLE.md)
Related documents:
- [TRUTH_EXCEPTION_REGISTER.md](./TRUTH_EXCEPTION_REGISTER.md)
- [GOVERNANCE_EVENT_LOG_SPEC.md](./GOVERNANCE_EVENT_LOG_SPEC.md)
Governing question:
- what preservation-only action is lawful when ordinary stewardship or safe execution fails?
This protocol owns emergency preservation sequence and temporary authority limits.
It does not define constitutional truth law, exception validity, or event schema.

## 1. Purpose

This protocol exists so the truth system does not stall or drift when the Founding Canonical Steward is unavailable.
It is the continuity law for preservation-only action.
It allows the system to freeze, rollback, restore, and contain.
It does not allow emergency expansion of doctrine.

## 2. Core Principle

Emergency actors receive preservation authority.
Emergency actors do not receive expansion authority.
They may defend the existing truth boundary.
They may not redraw it.

## 3. Activation Conditions

Emergency continuity activates when any of the following is true:

- the Founding Canonical Steward is unreachable for 30 days
- the steward is unreachable during a severity-one truth incident
- a live refusal bug creates material honesty risk
- a source compromise creates active provenance risk
- a published version creates immediate scope or routing harm
- a deployment incident risks serving known-false or stale truth surfaces

## 4. Activation Rule

Activation must be explicit.
Silence does not activate continuity automatically unless the 30-day threshold is crossed.
When activation occurs, a continuity event record must be written immediately.
That record must name the trigger, date, versions, acting body, and `incidentId`.
`incidentId` uses the canonical pattern `EI-YYYY-NNNNNN`.

## 5. Continuity Bodies

The default temporary body is the Constitutional Continuity Council.
The council consists of:

- Release Manager
- Runtime Contract Reviewer
- the most relevant reviewer discipline for the incident
The reviewer discipline may be:
- Source Integrity Reviewer
- Contrast Reviewer
- Policy Surface Reviewer
- Frontend Trust Reviewer

## 6. Acting Deputy Rule

The council may appoint a temporary Acting Constitutional Deputy.
Appointment requires unanimous recorded vote.
The deputy exists only for the active continuity period.
The deputy does not become a permanent steward.
The deputy’s scope is limited to the active incident domain.

## 7. Quorum Rule

No emergency action is valid without quorum.
Quorum means:

- all three council positions are filled
- or two positions are filled and the third is documented as unavailable
If quorum cannot be formed, the system defaults to freeze.
Freeze outranks improvised action.

## 8. Preservation Powers

Emergency continuity may:

- freeze promotion
- halt rollout
- restore the last-known-safe version
- execute rollback
- revoke compromised source anchors
- disable unsafe derived surfaces
- activate degraded mode
- block unsafe public copy from publication

## 9. Forbidden Powers

Emergency continuity may not:

- admit new concepts
- widen scope
- weaken refusal law
- rewrite source priority doctrine
- amend the constitution
- create new permanent reviewer roles
- create new trust-surface doctrine
- redefine what counts as canonical truth

## 10. Freeze-First Rule

If the acting body is uncertain whether preservation or expansion is occurring, the required action is freeze.
Freeze is the lawful default under ambiguity.
Freeze preserves truth.
Uncertain rollout does not.

## 11. Last-Known-Safe Rule

Every emergency restore must target a last-known-safe version boundary.
That boundary must be named explicitly.
The target may include:

- concept version
- concept set version
- contract version
- matcher version
- normalizer version
- overlay manifest version
No restore may target “whatever worked before” without version naming.

## 12. Trigger Family: Steward Absence

If the steward is unavailable for 30 days:

- continuity activates
- all Class A and B merges freeze
- pending promotions stop
- emergency preservation powers become available
- no new truth-layer admissions may proceed

## 13. Trigger Family: Refusal Bug

If refusal behavior becomes unsafe:

- freeze relevant rollout
- restore last-known-safe refusal behavior if possible
- issue temporary public containment wording if needed
- log the exception and event
Refusal honesty outranks convenience.

## 14. Trigger Family: Source Compromise

If a source anchor is compromised:

- suspend affected source display if needed
- freeze related promotion
- restore last-known-safe source mapping if possible
- open follow-up source review
No emergency source action may quietly become new doctrine.

## 15. Trigger Family: Scope Leak

If a concept begins acting beyond its lawful scope:

- freeze affected deployment path
- restore safe scope boundary
- reopen scope review
- log versions and affected surfaces

## 16. Trigger Family: Routing Harm

If routing begins selecting unsafe canonical targets:

- freeze promotion
- restore known safe matcher or normalizer version
- open runtime validation incident
- keep action bounded to preservation

## 17. Trigger Family: Trust-Surface Misstatement

If public wording materially misstates truth law:

- freeze publication of the affected surface
- restore prior lawful wording
- or disable the affected surface temporarily
Public trust wording may be removed for safety.
It may not be replaced with unreviewed new doctrine.

## 18. Trigger Family: Derived-Surface Integrity Failure

If overlays or derived surfaces imply multiple truths or stale authority:

- disable the affected derived surface
- restore standard canonical rendering if possible
- reopen downstream integrity review
- keep the canonical truth object fixed

## 19. Trigger Family: Institutional Deployment Conflict

If a downstream institutional deployment faces immediate incompatibility:

- allow version pinning
- allow local rollout halt
- allow wrapper freeze
- do not allow upstream truth rewrite
The upstream truth core remains sovereign.

## 20. Evidence Requirement

Emergency action still requires evidence.
Minimum emergency evidence may include:

- failing verification output
- reviewer incident note
- source challenge note
- deployment trace
- public misstatement screenshot
- routing regression evidence
Emergency evidence may be smaller than ordinary review evidence.
It may not be absent.

## 21. Logging Requirement

Every emergency action must create:

- a governance event in `data/governance/governance-event-log.ndjson`
- an exception register entry in `data/governance/truth-exception-register.ndjson`
- an incident record in `data/governance/emergency-incidents.ndjson`
The records must cross-link through `incidentId`, `eventId`, and `exceptionId`.
No verbal-only emergency action is lawful.

## 21A. Incident Record Shape

The canonical emergency-incident schema path is `data/governance/emergency-incidents.schema.json`.
Each non-empty line in `data/governance/emergency-incidents.ndjson` is one JSON object conforming to that schema.
Every incident line must carry:

- `entryId`
- `entryAction`
- `entryTimestamp`
- stable `incidentId`
- `date`
- `severity`
- `trigger`
- `actingBody`
- `scope`
- `actionsTaken`
- `expiry`
- `linkedEventIds`
- `linkedExceptionIds`
- `ratificationStatus`

`entryTimestamp` is the append time for that incident line.
`date` remains the original incident activation time across later appended lines.
`expiry` remains the boundary for temporary emergency authority.

Later ratification, expiry, closure, or supersession records append a new line for the same `incidentId`.
Those later lines should point back to the prior entry through `supersedesEntryId`.
They do not mutate the original activation line.

## 22. Ratification Requirement

Emergency action is temporary until ratified, reverted, or superseded.
Once the steward returns, or continuity review completes, each emergency action must be:

- ratified
- reverted
- replaced by ordinary governance action
- or formally expired

## 23. Expiry Rule

Emergency authority expires automatically 14 days after the steward returns.
If the steward does not return, temporary authority expires 30 days after activation unless renewed through recorded constitutional review.
No emergency authority becomes permanent through time alone.

## 24. Renewal Rule

Renewal is not implicit.
Renewal requires:

- a new continuity record
- a new reason statement
- a new expiry
- confirmation that preservation rather than expansion remains the motive

## 25. Incident Severity Tiers

Severity `S1`:

- active truth integrity failure
- source compromise
- refusal harm
- dangerous routing drift
Severity `S2`:
- urgent but contained deployment or trust-surface risk
Severity `S3`:
- operational concern that may wait for ordinary governance
Only `S1` and some `S2` incidents justify continuity action.

## 26. Communication Rule

Emergency continuity does not require public theatrics.
It does require internal clarity.
Every emergency action should state:

- what happened
- what was frozen or restored
- what versions are affected
- what review remains open

## 27. Freeze Procedure

Step 1:

- declare freeze reason
Step 2:
- identify affected versions and surfaces
Step 3:
- halt promotion or rollout
Step 4:
- write event and exception records
Step 5:
- schedule follow-up review

## 28. Rollback Procedure

Step 1:

- identify the unsafe publication boundary
Step 2:
- select last-known-safe target
Step 3:
- execute restore or rollback
Step 4:
- verify restored state
Step 5:
- log and schedule ratification

## 29. Source Revocation Procedure

Step 1:

- identify affected source anchor or mapping
Step 2:
- determine whether suppression or restore is safer
Step 3:
- freeze related promotion
Step 4:
- log evidence
Step 5:
- reopen source review

## 30. Refusal Bug Hotfix Procedure

Step 1:

- verify the defect
Step 2:
- determine safe prior refusal behavior
Step 3:
- restore or patch narrowly
Step 4:
- verify no scope expansion occurred
Step 5:
- log the action and post-review requirement

## 31. Derived-Surface Disable Procedure

Step 1:

- identify affected derived surface
Step 2:
- confirm canonical surface can remain available
Step 3:
- disable derived surface or route to canonical fallback
Step 4:
- log versions and restore path
Step 5:
- reopen downstream review

## 32. Deployment Halt Procedure

Step 1:

- identify release boundary
Step 2:
- stop rollout
Step 3:
- preserve logs and hashes
Step 4:
- state re-entry conditions
Step 5:
- keep halt visible until resolution

## 33. Temporary Acting Deputy Limits

The deputy may sign:

- freeze orders
- restore approvals
- rollback execution approvals
- incident review scheduling
The deputy may not sign:
- new concept admission
- doctrine rewrite
- permanent source-law change
- amendment approval

## 34. Return Of Steward Procedure

When the steward returns:

- continuity body briefs the steward
- all active emergency records are reviewed
- each action is ratified, reverted, or superseded
- expired emergency powers close
Return does not erase the log.

## 35. Dispute Rule

If the continuity body disputes the correct preservation action:

- freeze remains active
- stricter path governs
- challenge procedure may open
Emergency disagreement never authorizes expansion.

## 36. Relationship To Constitution

This protocol does not replace constitutional law.
It operationalizes the continuity sections.
Where there is conflict, the constitution controls.
Where the constitution is silent on emergency sequence, this protocol supplies sequence detail.

## 37. Relationship To Lifecycle

Emergency action may interrupt lifecycle progress.
It may move a concept or release into:

- freeze
- rollback
- last-known-safe restore
It may not move a concept directly into publication without ordinary lifecycle law.

## 38. Relationship To Matrix

The matrix still governs class and role ownership.
This protocol only defines what happens when ordinary approver availability or safe execution fails.
Emergency routing does not erase class.

## 39. Relationship To Exception Register

Every emergency action is also an exception.
The exception register carries the deviation record.
This protocol carries the operating law.
Both are required.
This protocol does not define exception validity or expiry doctrine.
It requires emergency actions to appear in the register.

## 40. Relationship To Event Log

Every emergency action must emit an event.
Minimum event families include:

- `FREEZE_ACTIVATED`
- `ROLLBACK_EXECUTED`
- `EXCEPTION_GRANTED`
- `EMERGENCY_OVERRIDE_EXPIRED`
The event log carries replayable action history.
This protocol does not define the event schema.

## 41. Scenario Playbooks

Scenario `01`
Incident:

- steward absent, no active truth incident
Action:
- freeze Class A and B merges
Limit:
- no emergency expansion power
Scenario `02`
Incident:
- steward absent, live refusal bug
Action:
- activate continuity and patch narrow refusal path
Limit:
- no new concept admission
Scenario `03`
Incident:
- source provenance challenge with public misstatement
Action:
- suppress source anchor and reopen source review
Limit:
- no substitute source doctrine by emergency fiat
Scenario `04`
Incident:
- routing regression after release
Action:
- restore last-known-safe matcher behavior
Limit:
- no hidden doctrine rewrite
Scenario `05`
Incident:
- stale derived lens surface implies active truth
Action:
- disable derived surface and show canonical fallback
Limit:
- no new overlay semantics
Scenario `06`
Incident:
- trust wording implies alternate answer behavior
Action:
- freeze wording and restore prior lawful copy
Limit:
- no new copy invented during incident
Scenario `07`
Incident:
- institutional deployment cannot adopt current version
Action:
- allow local version pin
Limit:
- no upstream truth rewrite
Scenario `08`
Incident:
- concept scope leak discovered in live traffic
Action:
- restore prior scope handling and reopen review
Limit:
- no new scope doctrine under continuity
Scenario `09`
Incident:
- conflict inside continuity council
Action:
- hold freeze and escalate challenge
Limit:
- no split-brain rollout
Scenario `10`
Incident:
- legal evidence page overstates current state
Action:
- freeze page or restore prior version
Limit:
- no marketing rewrite under emergency
Scenario `11`
Incident:
- policy validation output marked closed incorrectly
Action:
- halt publication and restore prior validated state
Limit:
- no quiet status redefinition
Scenario `12`
Incident:
- concept deprecation was published to wrong surface
Action:
- rollback display and reopen review
Limit:
- no undocumented archive move
Scenario `13`
Incident:
- source registry file compromised
Action:
- freeze source-tier changes and restore prior safe registry
Limit:
- no new source tiers added
Scenario `14`
Incident:
- emergency actor unavailable mid-incident
Action:
- maintain freeze until quorum restored
Limit:
- no solo emergency doctrine action
Scenario `15`
Incident:
- user-facing ambiguity wording becomes misleading
Action:
- revert to prior lawful ambiguity copy
Limit:
- no new explanatory doctrine
Scenario `16`
Incident:
- rollback target uncertain
Action:
- freeze and gather evidence
Limit:
- no speculative restore target
Scenario `17`
Incident:
- continuity body wants a faster but broader “fix”
Action:
- reject broadened path
Limit:
- preservation authority only
Scenario `18`
Incident:
- concept packet admitted but reviewer evidence later challenged
Action:
- freeze promotion lineage and open rollback review
Limit:
- no retroactive evidence invention
Scenario `19`
Incident:
- route move breaks evidence discoverability
Action:
- restore prior route or freeze affected surface
Limit:
- no silent path drift
Scenario `20`
Incident:
- class dispute during active S1 incident
Action:
- apply stricter class and maintain freeze
Limit:
- no expedient downgrade

## 42. Review Checklist

Before approving emergency action, ask:

- is the steward unavailable or the incident severity sufficient
- is the action preservation-only
- is there a safe prior state
- is expiry defined
- is logging ready
- is ratification path defined
- is scope or refusal law unchanged

## 43. Invalid Continuity Patterns

Invalid:

- emergency used to widen scope
Invalid:
- emergency used to add a new concept
Invalid:
- emergency used to suppress all reviewer visibility
Invalid:
- emergency authority with no expiry
Invalid:
- restore with no version target
Invalid:
- continuity body acting without quorum where freeze was available

## 44. Metrics

Useful metrics include:

- emergency activations per year
- freezes versus restores
- average emergency duration
- actions ratified versus reverted
- actions by trigger family
Repeated activation signals governance or engineering weakness.

## 45. Future Hardening

This protocol may later gain:

- signed emergency records
- automated freeze enforcement
- machine-checked expiry
- verified last-known-safe snapshots
Those are future control surfaces.
The doctrine already applies now.

## 46. Closing Statement

Emergency continuity exists to keep truth safe during absence or incident.
It is not a hidden second constitution.
It is a narrow preservation instrument.
When used correctly, it prevents founder absence from becoming truth collapse.
